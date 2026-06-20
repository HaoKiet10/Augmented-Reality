import { Body, Controller, Post, UseGuards, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { JwtRefreshAuthGuard } from './guards/jwt-refresh-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) { }
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('signup')
  async signup(@Body() signupDto: SignupDto) {
    return this.authService.signup(signupDto);
  }

  @UseGuards(JwtRefreshAuthGuard)
  @Post('refresh')
  async refresh(@Req() req: any) {
    const userId = req.user.sub;
    const email = req.user.email;
    const role = req.user.role;
    return this.authService.refreshTokens(userId, email, role);
  }

  @Post('logout')
  async logout() {
    return this.authService.logout();
  }

  @Post('forgot-password')
  async forgotPassword() {
    return this.authService.forgotPassword();
  }
}