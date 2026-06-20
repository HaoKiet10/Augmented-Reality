import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { firstValueFrom, isObservable } from 'rxjs';

@Injectable()
export class JwtRefreshAuthGuard extends AuthGuard('jwt-refresh') {
    async canActivate(context: ExecutionContext): Promise<boolean> {
        const result = super.canActivate(context);

        const can = isObservable(result)
            ? await firstValueFrom(result)
            : await result;

        if (can) {
            const request = context.switchToHttp().getRequest();
            if (!request.user || !request.user.role) {
                request.user = { role: 'user' };
            }
        }
        return can;
    }
}