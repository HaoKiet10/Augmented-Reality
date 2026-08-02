import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // tự động BỎ mọi field không khai báo trong DTO
      forbidNonWhitelisted: true, // và từ chối luôn request (400) nếu có field lạ
      transform: true, // tự convert kiểu dữ liệu (VD: query string -> number) theo DTO
    }),
  );
  await app.listen(process.env.PORT || 3000);
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
