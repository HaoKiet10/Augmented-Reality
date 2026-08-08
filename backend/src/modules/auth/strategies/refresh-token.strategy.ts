import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { JwtPayload } from './jwt.strategy';

export const REFRESH_COOKIE_NAME = 'refresh_token';

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
    constructor(private configService: ConfigService) {
        super({
            jwtFromRequest: (req: Request) => req?.cookies?.[REFRESH_COOKIE_NAME] ?? null,
            ignoreExpiration: false,
            secretOrKey: configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
            passReqToCallback: true,
        });
    }

    async validate(req: Request, payload: JwtPayload) {
        const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];

        if (!refreshToken) {
            throw new UnauthorizedException('Refresh token not found');
        }

        if (payload.type !== 'refresh') {
            throw new UnauthorizedException('Invalid token type');
        }

        return { ...payload, refreshToken };
    }
}