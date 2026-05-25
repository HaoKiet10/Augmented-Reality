// refresh-token.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { JwtPayload } from './jwt.strategy';

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
    constructor(private configService: ConfigService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
            passReqToCallback: true,
        });
    }

    async validate(req: Request, payload: JwtPayload) {
        const refreshToken = req.headers.authorization?.split(' ')[1];

        if (!refreshToken) {
            throw new UnauthorizedException('Refresh token not found');
        }

        return { ...payload, refreshToken };
    }
}