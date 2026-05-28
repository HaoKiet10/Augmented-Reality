import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
    canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
        return super.canActivate(context);
    }

    handleRequest<TUser = any>(err: Error, user: TUser, info: Error): TUser {
        if (err || !user) {
            if (info instanceof TokenExpiredError) {
                throw new UnauthorizedException('Token expired. Please log in again.');
            }
            if (info instanceof JsonWebTokenError) {
                throw new UnauthorizedException('Invalid token. Please log in again.');
            }
            throw new UnauthorizedException(err?.message ?? 'Unauthorized');
        }
        return user;
    }
}