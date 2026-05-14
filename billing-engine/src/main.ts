import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  // Global validation pipe — transforms + validates all DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,          // strip unknown fields
      forbidNonWhitelisted: true,
      transform: true,          // auto-convert types
      transformOptions: { enableImplicitConversion: true },
    }),
  )

  // Swagger / OpenAPI docs
  const config = new DocumentBuilder()
    .setTitle('RIHLA Billing Engine')
    .setDescription('ERP-grade billing, invoicing, and financial management for S\'TOURS DMC')
    .setVersion('1.0')
    .addBearerAuth()
    .build()

  const document = SwaggerModule.createDocument(app, config)
  SwaggerModule.setup('api/docs', app, document)

  const port = process.env.PORT ?? 3100
  await app.listen(port)
  console.log(`Billing engine running on http://localhost:${port}`)
  console.log(`Swagger docs: http://localhost:${port}/api/docs`)
}

bootstrap()
