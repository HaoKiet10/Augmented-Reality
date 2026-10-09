import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { PrismaModule } from './modules/prisma/prisma.module';
import { ProjectModule } from './modules/project/project.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // Giới hạn mặc định cho MỌI route: 20 request / phút / IP. Route auth
    // (login, signup, forgot/reset-password) siết chặt hơn qua @Throttle
    // riêng trong AuthController, vì đó là nơi brute-force thật sự nguy hiểm.
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 20 }],
    }),
    AuthModule,
    UserModule,
    PrismaModule,
    ProjectModule,
  ],
  controllers: [ 
    AppController
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
