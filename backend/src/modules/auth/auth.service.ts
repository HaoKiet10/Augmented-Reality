import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../user/user.service';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) { }

  private signTokens(userId: string, email: string, role?: string) {
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
    const { token, refreshToken } = this.signTokens(user.id, user.email, user.role);
    return { message: 'Login successful', user: this.userService.sanitize(user), token, refreshToken };
  }

  async signup(signupDto: SignupDto) {
    const existingUser = await this.userService.findByEmail(signupDto.email);
    if (existingUser) {
      throw new UnauthorizedException('Email already in use');
    }

    const user = await this.userService.create({
      email: signupDto.email,
      password: signupDto.password,
      name: signupDto.name,
    });
    const { token, refreshToken } = this.signTokens(user.id, user.email, user.role);
    return { message: 'Signup successful', user: this.userService.sanitize(user), token, refreshToken };
  }

  async logout() {
    return { message: 'Logout successful' };
  }

  async refreshTokens(userId: string, email: string, role: string) {
    return this.signTokens(userId, email, role);
  }

  async forgotPassword() {
    // Implement forgot password logic here
  }
}