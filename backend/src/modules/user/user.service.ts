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

    async create(data: { email: string; password: string; name?: string }) {
        const hashedPassword = await bcrypt.hash(data.password, 10);
        return this.PrismaService.user.create({
            data: {
                ...data,
                password: hashedPassword,
            },
        });
    }

    async update(id: string, data: { email?: string; password?: string; name?: string }) {
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
        if (user) {
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

    /** Đổi mật khẩu cho chính chủ tài khoản — bắt buộc xác nhận currentPassword
     * trước khi cho đổi, để một access token bị lộ (XSS, để quên máy...) không
     * đủ để chiếm tài khoản chỉ bằng cách gọi thẳng route đổi mật khẩu. */
    async changePassword(id: string, currentPassword: string, newPassword: string) {
        const user = await this.findById(id);
        if (!user) {
            throw new NotFoundException('User not found');
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
    sanitize<T extends { password?: string }>(user: T): Omit<T, 'password'> {
        const { password, ...rest } = user;
        return rest;
    }
}