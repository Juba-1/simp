import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { configureApp } from './config/app-bootstrap';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const nodeEnv = configService.get<string>('app.nodeEnv') ?? 'development';
  const isDev = nodeEnv !== 'production';
  const configuredOrigins =
    configService.get<string[]>('app.corsOrigins') ?? [];

  // CORS must be registered before global guards/pipes so OPTIONS preflight succeeds.
  app.enableCors({
    origin: isDev
      ? true
      : configuredOrigins.length > 0
        ? configuredOrigins
        : true,
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'Accept-Language',
      'X-Requested-With',
    ],
    exposedHeaders: ['Content-Disposition'],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  configureApp(app);

  const port = configService.get<number>('app.port') ?? 3000;

  await app.listen(port, '0.0.0.0');
  console.log(`SIMP Platform API running on http://localhost:${port}/api/v1`);
  if (isDev) {
    console.log(
      `CORS: allowing all origins in development (frontend: http://localhost:3001)`,
    );
  }
}

bootstrap();
