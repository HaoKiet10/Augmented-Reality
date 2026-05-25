import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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
        return this.PrismaService.user.create({ data });
    }

    async update(id: string, data: { email?: string; password?: string; name?: string }) {
        return this.PrismaService.user.update({
            where: { id },
            data,
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
        if (user && user.password === password) {
            return user;
        }        
        return null;
    }

    async findByEmail(email: string) {
        return this.PrismaService.user.findUnique({
            where: { email },
        });
    }
}