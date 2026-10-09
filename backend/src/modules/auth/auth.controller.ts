import { Body, Controller, Post, UseGuards, Req, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtRefreshAuthGuard } from './guards/jwt-refresh-auth.guard';
import { REFRESH_COOKIE_NAME } from './strategies/refresh-token.strategy';

const REFRESH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

// 5 lần / phút / IP — chặt hơn nhiều so với default (20/phút) của toàn app,
// vì đây là các route brute-force được: đoán mật khẩu (login), dò email đã
// đăng ký (signup/forgot-password), hoặc đoán reset token (reset-password).
const AUTH_THROTTLE = { default: { limit: 5, ttl: 60_000 } };

function refreshCookieOptions() {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    // Cross-site (frontend/backend on different domains) needs SameSite=None + Secure.
    // Local http dev can't use Secure cookies, so fall back to Lax there.
    sameSite: (isProd ? 'none' : 'lax') as 'none' | 'lax',
    path: '/auth',
    maxAge: REFRESH_COOKIE_MAX_AGE_MS,
  };
}

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) { }

  @Throttle(AUTH_THROTTLE)
  @Post('login')
  async login(@Body() loginDto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { refreshToken, ...result } = await this.authService.login(loginDto);
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions());
    return result;
  }

  @Throttle(AUTH_THROTTLE)
  @Post('signup')
  async signup(@Body() signupDto: SignupDto, @Res({ passthrough: true }) res: Response) {
    const { refreshToken, ...result } = await this.authService.signup(signupDto);
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions());
    return result;
  }

  @UseGuards(JwtRefreshAuthGuard)
  @Post('refresh')
  async refresh(@Req() req: any, @Res({ passthrough: true }) res: Response) {
    const { sub, email, role, refreshToken } = req.user;
    const { refreshToken: newRefreshToken, ...result } = await this.authService.refreshTokens(
      sub,
      email,
      role,
      refreshToken,
    );
    res.cookie(REFRESH_COOKIE_NAME, newRefreshToken, refreshCookieOptions());
    return result;
  }

  @Post('logout')
  async logout(@Req() req: any, @Res({ passthrough: true }) res: Response) {
    const presentedRefreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
    res.clearCookie(REFRESH_COOKIE_NAME, { path: '/auth' });
    return this.authService.logout(presentedRefreshToken);
  }

  @Throttle(AUTH_THROTTLE)
  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Throttle(AUTH_THROTTLE)
  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }
}