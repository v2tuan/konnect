import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('Konnect Admin Backend')
    .setDescription('The Konnect Admin Backend API description')
    .setVersion('1.0')
    .build();

  // Mở CORS cho tất cả nguồn (không khuyến khích cho production)
  app.enableCors({
    origin: 'http://localhost:3000', // domain frontend
    credentials: true, // cho phép gửi cookie/session
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Kích hoạt global validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Loại bỏ các thuộc tính không có trong DTO
      forbidNonWhitelisted: true, // Ném lỗi nếu có thuộc tính không hợp lệ
      transform: true, // Tự động chuyển đổi payload thành các kiểu dữ liệu trong DTO
    }),
  );

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);
  await app.listen(process.env.PORT ?? 8080);
}
bootstrap();
