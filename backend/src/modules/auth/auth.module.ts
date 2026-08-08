import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserModule } from '../user/user.module';
import { PrismaModule } from '../prisma/prisma.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RefreshTokenStrategy } from './strategies/refresh-token.strategy';
import { JwtRefreshAuthGuard } from './guards/jwt-refresh-auth.guard';

@Module({
    controllers: [AuthController],
    providers: [AuthService, JwtStrategy, RefreshTokenStrategy, JwtRefreshAuthGuard],
    exports: [AuthService],
    imports: [UserModule, PrismaModule, JwtModule.registerAsync({
        useFactory: (config: ConfigService) => ({
            secret: config.getOrThrow<string>('JWT_SECRET'),
            signOptions: {
                expiresIn: '1d',
            },
        }),
        inject: [ConfigService],
    })],
})

export class AuthModule { }