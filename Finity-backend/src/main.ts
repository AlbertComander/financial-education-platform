import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import { BigIntInterceptor } from './common/interceptors/bigint.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173',
    credentials: true,
  });

  app.use(cookieParser());

  app.useGlobalInterceptors(new BigIntInterceptor());

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
