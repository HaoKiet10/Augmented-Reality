import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());

  // CORS_ORIGIN: danh sách domain frontend được phép, phân tách bằng dấu phẩy.
  // Set trên Render (backend) trỏ tới domain Vercel/Netlify của frontend.
  const configuredOrigins = (process.env.CORS_ORIGIN ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  const defaultOrigins = [
    'http://localhost:5173', // Vite dev server
    'https://augmented-reality-frontend.vercel.app',
  ];

  const allowedOrigins = configuredOrigins.length > 0 ? configuredOrigins : defaultOrigins;

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

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