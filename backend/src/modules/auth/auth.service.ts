import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private jwtService: JwtService,
  ) { }

  async login(loginDto: LoginDto) {
    const user = await this.userService.validate(
      loginDto.email,
      loginDto.password,
    );
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const payload = { sub: user.id, email: user.email, role: user.role };
    const token = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });
    return { message: 'Login successful', user, token, refreshToken };
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
    const payload = { sub: user.id, email: user.email, role: user.role };
    const token = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });
    return { message: 'Signup successful', user, token, refreshToken };
  }

  async logout() {
    return { message: 'Logout successful' };
  }

  async forgotPassword() {
    // Implement forgot password logic here
  }
}

