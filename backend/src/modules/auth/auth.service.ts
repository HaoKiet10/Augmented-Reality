import { BadRequestException, ConflictException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'crypto';
import { UserService } from '../user/user.service';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { JwtService } from '@nestjs/jwt';

const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly userService: UserService,
    private readonly prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) { }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /** Signs a new access/refresh pair and persists the refresh token's hash for rotation/revocation. */
  private async issueTokens(userId: string, email: string, role?: string) {
    const basePayload = { sub: userId, email, role };

    const token = this.jwtService.sign(
      { ...basePayload, type: 'access' },
      { expiresIn: '1d' },
    );
    const refreshToken = this.jwtService.sign(
      { ...basePayload, type: 'refresh' },
      {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: '7d',
      },
    );

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: this.hashToken(refreshToken),
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      },
    });

    return { token, refreshToken };
  }

  async login(loginDto: LoginDto) {
    const user = await this.userService.validate(
      loginDto.email,
      loginDto.password,
    );
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const { token, refreshToken } = await this.issueTokens(user.id, user.email, user.role);
    return { message: 'Login successful', user: this.userService.sanitize(user), token, refreshToken };
  }

  async signup(signupDto: SignupDto) {
    const existingUser = await this.userService.findByEmail(signupDto.email);
    if (existingUser) {
      throw new ConflictException('Email already in use');
    }

    const user = await this.userService.create({
      email: signupDto.email,
      password: signupDto.password,
      name: signupDto.name,
    });
    const { token, refreshToken } = await this.issueTokens(user.id, user.email, user.role);
    return { message: 'Signup successful', user: this.userService.sanitize(user), token, refreshToken };
  }

  /**
   * Rotates a refresh token: the presented token must exist, belong to the caller,
   * and be un-revoked/un-expired. It is revoked immediately (single use) and a fresh
   * pair is issued. If a token is presented that was already revoked (i.e. reused),
   * every active refresh token for that user is revoked — treating it as compromise.
   */
  async refreshTokens(userId: string, email: string, role: string, presentedRefreshToken: string) {
    const presentedHash = this.hashToken(presentedRefreshToken);
    const stored = await this.prisma.refreshToken.findUnique({ where: { tokenHash: presentedHash } });

    if (!stored || stored.userId !== userId) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (stored.revoked || stored.expiresAt < new Date()) {
      await this.prisma.refreshToken.updateMany({
        where: { userId, revoked: false },
        data: { revoked: true },
      });
      throw new UnauthorizedException('Refresh token no longer valid');
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revoked: true },
    });

    return this.issueTokens(userId, email, role);
  }

  /** Revokes the presented refresh token, if any. Safe to call with an absent/invalid token. */
  async logout(presentedRefreshToken?: string) {
    if (presentedRefreshToken) {
      await this.prisma.refreshToken.updateMany({
        where: { tokenHash: this.hashToken(presentedRefreshToken) },
        data: { revoked: true },
      });
    }
    return { message: 'Logout successful' };
  }

  async forgotPassword(email: string) {
    const user = await this.userService.findByEmail(email);

    // Luôn trả về cùng 1 message dù email có tồn tại hay không — tránh lộ
    // thông tin "email này có đăng ký hay không" (user enumeration) cho ai
    // đó dò danh sách email qua route public này.
    const genericResult = {
      message: 'If an account with that email exists, a reset link has been sent.',
    };

    if (!user) {
      return genericResult;
    }

    const rawToken = randomBytes(32).toString('hex');

    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: this.hashToken(rawToken),
        expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
      },
    });

    // TODO: chưa nối provider gửi email (Resend/SendGrid/SES...) — chưa có
    // biến môi trường nào cho SMTP/API key trong .env.example. Tạm thời log
    // ra để dev/test local vẫn lấy được link. PHẢI thay bằng gửi email thật
    // trước khi cho end-user dùng thật, vì hiện tại ai đọc được log server
    // (Render dashboard) cũng lấy được token đặt lại mật khẩu của bất kỳ ai.
    const resetUrl = `${this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:5173'}/reset-password?token=${rawToken}`;
    this.logger.warn(`[DEV ONLY] Password reset link for ${user.email}: ${resetUrl}`);

    return genericResult;
  }

  async resetPassword(rawToken: string, newPassword: string) {
    const tokenHash = this.hashToken(rawToken);
    const stored = await this.prisma.passwordResetToken.findUnique({ where: { tokenHash } });

    if (!stored || stored.usedAt || stored.expiresAt < new Date()) {
      throw new BadRequestException('Reset link is invalid or has expired');
    }

    await this.prisma.$transaction([
      this.prisma.passwordResetToken.update({
        where: { id: stored.id },
        data: { usedAt: new Date() },
      }),
      // Đổi mật khẩu xong thì coi mọi phiên đăng nhập cũ là không còn tin cậy
      // (giống hệt logic reuse-detection ở refreshTokens) — buộc đăng nhập lại
      // ở mọi thiết bị bằng mật khẩu mới.
      this.prisma.refreshToken.updateMany({
        where: { userId: stored.userId, revoked: false },
        data: { revoked: true },
      }),
    ]);

    await this.userService.update(stored.userId, { password: newPassword });

    return { message: 'Password has been reset. Please log in again.' };
  }
}