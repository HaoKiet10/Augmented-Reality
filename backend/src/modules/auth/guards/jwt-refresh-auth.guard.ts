import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { firstValueFrom, isObservable } from 'rxjs';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtRefreshAuthGuard extends AuthGuard('jwt-refresh') {
    constructor(private readonly prisma: PrismaService) {
        super();
    }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const result = super.canActivate(context);

        const can = isObservable(result)
            ? await firstValueFrom(result)
            : await result;

        if (can) {
            const request = context.switchToHttp().getRequest();

            // Older/atypical tokens may lack a role claim — look up the real role
            // from the DB rather than guessing one, and fail closed if the user
            // behind the token no longer exists.
            if (request.user && !request.user.role) {
                const user = await this.prisma.user.findUnique({
                    where: { id: request.user.sub },
                    select: { role: true },
                });

                if (!user) {
                    throw new UnauthorizedException('User not found');
                }

                request.user.role = user.role;
            }
        }
        return can;
    }
}