import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { StorageService } from '../storage/storage.service';
import { ALLOWED_AVATAR_TYPES, validateUploadedFile } from '../project/asset-validation';

@Injectable()
export class UserService {
    constructor(
        private readonly PrismaService: PrismaService,
        private readonly storageService: StorageService,
    ) {}

    async findById(id: string) {
        return this.PrismaService.user.findUnique({
            where: { id },
        });
    }

    async create(data: { email: string; password?: string; name?: string; googleId?: string; avatarUrl?: string }) {
        // password optional: tài khoản tạo từ Google OAuth không có password.
        const hashedPassword = data.password ? await bcrypt.hash(data.password, 10) : undefined;
        return this.PrismaService.user.create({
            data: {
                ...data,
                password: hashedPassword,
            },
        });
    }

    async update(id: string, data: { email?: string; password?: string; name?: string; avatarUrl?: string }) {
        const updateData = { ...data };
        if (updateData.password) {
            updateData.password = await bcrypt.hash(updateData.password, 10);
        }
        return this.PrismaService.user.update({
            where: { id },
            data: updateData,
        });
    }

    async delete(id: string) {
        return this.PrismaService.user.delete({
            where: { id },
        });
    }

    async validate(email: string, password: string) {
        const user = await this.PrismaService.user.findUnique({
            where: { email },
        });
        // user.password null nghĩa là tài khoản chỉ đăng ký qua Google — không có
        // mật khẩu nào để so khớp, phải từ chối thay vì để bcrypt.compare crash.
        if (user && user.password) {
            const isMatch = await bcrypt.compare(password, user.password);
            if (isMatch) {
                return user;
            }
        }        
        return null;
    }

    async findByEmail(email: string) {
        return this.PrismaService.user.findUnique({
            where: { email },
        });
    }

    async findByGoogleId(googleId: string) {
        return this.PrismaService.user.findUnique({
            where: { googleId },
        });
    }

    /**
     * Đăng nhập/đăng ký qua Google: nếu đã từng login Google trước đó (googleId khớp)
     * thì dùng lại user đó. Nếu chưa, nhưng email đã tồn tại (user từng đăng ký bằng
     * email+password), thì LINK googleId vào tài khoản sẵn có thay vì tạo trùng —
     * đây là hành vi chuẩn (Google đã xác thực quyền sở hữu email đó cho ta rồi).
     * Nếu email cũng chưa từng tồn tại, tạo user mới, không có password.
     */
    async findOrCreateByGoogle(profile: { googleId: string; email: string; name?: string; avatarUrl?: string }) {
        const byGoogleId = await this.findByGoogleId(profile.googleId);
        if (byGoogleId) {
            return byGoogleId;
        }

        const byEmail = await this.findByEmail(profile.email);
        if (byEmail) {
            return this.PrismaService.user.update({
                where: { id: byEmail.id },
                data: { googleId: profile.googleId },
            });
        }

        return this.PrismaService.user.create({
            data: {
                email: profile.email,
                googleId: profile.googleId,
                name: profile.name,
                avatarUrl: profile.avatarUrl,
            },
        });
    }

    /** Đổi mật khẩu cho chính chủ tài khoản — bắt buộc xác nhận currentPassword
     * trước khi cho đổi, để một access token bị lộ (XSS, để quên máy...) không
     * đủ để chiếm tài khoản chỉ bằng cách gọi thẳng route đổi mật khẩu. */
    async changePassword(id: string, currentPassword: string, newPassword: string) {
        const user = await this.findById(id);
        if (!user) {
            throw new NotFoundException('User not found');
        }
        if (!user.password) {
            // Tài khoản chỉ có Google, chưa từng đặt password nào để "xác nhận".
            throw new UnauthorizedException('This account signed up with Google and has no password set');
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            throw new UnauthorizedException('Current password is incorrect');
        }

        await this.update(id, { password: newPassword });
        return { message: 'Password updated successfully' };
    }

    /** Đặt mật khẩu lần đầu cho tài khoản Google-only. Chỉ cho phép khi CHƯA có
     * password — tài khoản đã có password phải đi qua changePassword (bắt buộc
     * xác nhận mật khẩu cũ), nếu không route này thành đường vòng bỏ qua bước đó. */
    async setPassword(id: string, newPassword: string) {
        const user = await this.findById(id);
        if (!user) {
            throw new NotFoundException('User not found');
        }
        if (user.password) {
            throw new BadRequestException('This account already has a password. Use change password instead.');
        }

        await this.update(id, { password: newPassword });
        return { message: 'Password set successfully' };
    }

    /** Đổi ảnh đại diện: validate nội dung file thật (không tin mimetype client gửi),
     * upload, lưu URL mới rồi mới dọn file cũ — nếu upload lỗi thì avatar cũ vẫn nguyên. */
    async updateAvatar(id: string, file: Express.Multer.File) {
        validateUploadedFile(file, ALLOWED_AVATAR_TYPES);
        const user = await this.findById(id);
        if (!user) {
            throw new NotFoundException('User not found');
        }

        const avatarUrl = await this.storageService.uploadAvatar(id, file);
        const updated = await this.PrismaService.user.update({ where: { id }, data: { avatarUrl } });
        await this.cleanupOldAvatar(user.avatarUrl);
        return updated;
    }

    /** Bỏ ảnh đại diện (về initials). Ảnh Google chỉ bị bỏ link, không đụng storage. */
    async removeAvatar(id: string) {
        const user = await this.findById(id);
        if (!user) {
            throw new NotFoundException('User not found');
        }

        const updated = await this.PrismaService.user.update({ where: { id }, data: { avatarUrl: null } });
        await this.cleanupOldAvatar(user.avatarUrl);
        return updated;
    }

    private async cleanupOldAvatar(oldUrl: string | null) {
        const key = this.storageService.avatarKeyFromUrl(oldUrl);
        if (key) {
            await this.storageService.deleteAvatar(key);
        }
    }

    /** Bỏ field password (hash) trước khi trả user object ra response — không bao giờ
     * để password (dù đã hash) lọt ra ngoài API response hay bị lưu ở localStorage phía client. */
    sanitize<T extends { password?: string | null }>(user: T): Omit<T, 'password'> {
        const { password, ...rest } = user;
        return rest;
    }
}