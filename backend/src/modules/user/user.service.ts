import { Injectable } from '@nestjs/common';
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
}