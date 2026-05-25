import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserModule } from '../user/user.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RefreshTokenStrategy } from './strategies/refresh-token.strategy';

@Module({
    controllers: [AuthController],
    providers: [AuthService, JwtStrategy, RefreshTokenStrategy],
    exports: [AuthService],
    imports: [UserModule, JwtModule.registerAsync({
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