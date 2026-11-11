import { BadRequestException, Body, Controller, Delete, Get, Patch, Post, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ALLOWED_AVATAR_TYPES } from '../project/asset-validation';
import { SetPasswordDto } from './dto/set-password.dto';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

const MAX_AVATAR_BYTES = 5 * 1024 * 1024; // khớp giới hạn 5 MB đặt trên bucket avatars

// Lọc sớm ở tầng multer theo extension + mimetype (rẻ, chặn trước khi đọc hết file);
// UserService.updateAvatar vẫn kiểm tra magic bytes thật vì 2 thứ này client tự khai.
function avatarFileFilter(_req: any, file: Express.Multer.File, cb: (error: Error | null, accept: boolean) => void) {
  const ext = file.originalname.slice(file.originalname.lastIndexOf('.')).toLowerCase();
  const rule = ALLOWED_AVATAR_TYPES[ext];
  if (!rule || !rule.mimetypes.includes(file.mimetype)) {
    cb(new BadRequestException('Avatar must be a PNG, JPEG or WebP image'), false);
    return;
  }
  cb(null, true);
}

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

  @Post('avatar')
  @UseInterceptors(FileInterceptor('file', { fileFilter: avatarFileFilter, limits: { fileSize: MAX_AVATAR_BYTES } }))
  async uploadAvatar(@UploadedFile() file: Express.Multer.File, @Req() req: any) {
    const user = await this.userService.updateAvatar(req.user.id, file);
    return this.toProfile(user);
  }

  @Delete('avatar')
  async removeAvatar(@Req() req: any) {
    const user = await this.userService.removeAvatar(req.user.id);
    return this.toProfile(user);
  }

  // Đặt mật khẩu lần đầu (tài khoản Google-only). Service từ chối nếu đã có password.
  @Post('password')
  async setPassword(@Body() dto: SetPasswordDto, @Req() req: any) {
    return this.userService.setPassword(req.user.id, dto.newPassword);
  }

  @Patch('password')
  async changePassword(@Body() dto: ChangePasswordDto, @Req() req: any) {
    return this.userService.changePassword(req.user.id, dto.currentPassword, dto.newPassword);
  }
}
