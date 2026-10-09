import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
    constructor(
        private readonly PrismaService: PrismaService,
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

    /** Bỏ field password (hash) trước khi trả user object ra response — không bao giờ
     * để password (dù đã hash) lọt ra ngoài API response hay bị lưu ở localStorage phía client. */
    sanitize<T extends { password?: string | null }>(user: T): Omit<T, 'password'> {
        const { password, ...rest } = user;
        return rest;
    }
}