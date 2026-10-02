import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
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

  // Swagger UI ở /docs — chỉ bật ngoài production để không lộ danh sách route
  // (kể cả route nội bộ) cho người ngoài dò trên domain Render thật.
  // Repo tách riêng ARMobile cần biết chính xác shape API mà không phải đọc
  // source backend, nên đây là nguồn tài liệu chung giữa web/backend/mobile.
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('AR API')
      .setDescription('API cho web designer tool và mobile scan app')
      .setVersion('1.0.0')
      .addBearerAuth() // access token dùng Authorization: Bearer <token>, xem jwt.strategy.ts
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document);
  }

  await app.listen(process.env.PORT || 3000);
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();