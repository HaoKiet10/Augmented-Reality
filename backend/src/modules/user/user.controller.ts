import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

// Mọi route ở đây thao tác trên chính người đang đăng nhập (req.user.id từ JWT),
// không nhận id qua param — tránh việc 1 designer sửa/đổi mật khẩu tài khoản khác
// chỉ bằng cách đổi id trên URL.
@Controller('users/me')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  // Không trả hash password lẫn googleId ra ngoài; chỉ báo có/không để UI biết
  // hiển thị form đổi mật khẩu (tài khoản Google-only chưa có password).
  private toProfile(user: NonNullable<Awaited<ReturnType<UserService['findById']>>>) {
    const { password, googleId, ...rest } = user;
    return { ...rest, hasPassword: !!password, hasGoogle: !!googleId };
  }

  @Get()
  async getProfile(@Req() req: any) {
    const user = await this.userService.findById(req.user.id);
    return this.toProfile(user!);
  }

  @Patch()
  async updateProfile(@Body() dto: UpdateProfileDto, @Req() req: any) {
    const user = await this.userService.update(req.user.id, { name: dto.name });
    return this.toProfile(user);
  }

  @Patch('password')
  async changePassword(@Body() dto: ChangePasswordDto, @Req() req: any) {
    return this.userService.changePassword(req.user.id, dto.currentPassword, dto.newPassword);
  }
}
