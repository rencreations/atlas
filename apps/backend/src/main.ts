import './instrument'; // Sentry init, must be imported first (no-op without SENTRY_DSN).
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import compression from 'compression';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { REDIS_PUB, REDIS_SUB } from './infra/redis/redis.module';
import { RedisIoAdapter } from './modules/chat/gateway/redis-io.adapter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug'],
    bufferLogs: true,
  });

  const config = app.get(ConfigService);
  const port = config.get<number>('app.port', 3000);
  const prefix = config.get<string>('app.globalPrefix', 'api/v1');
  const corsOrigins = config.get<string[]>('app.corsOrigins', []);

  app.setGlobalPrefix(prefix);
  // No URI versioning layer: the `api/v1` global prefix already carries
  // the API version. (Enabling VersioningType.URI here used to stack a
  // second /v1 segment, every route actually lived at /api/v1/v1/*,
  // contradicting the docs, healthchecks, and the frontend base URL.)

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.use(compression());

  app.enableCors({
    origin: corsOrigins.length > 0 ? corsOrigins : true,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  // Wire the socket.io Redis adapter for the chat gateway. When
  // REDIS_URL is empty both clients resolve to null and the adapter
  // falls back to the in-process IoAdapter, the gateway still works
  // for a single instance.
  const pub = app.get(REDIS_PUB, { strict: false });
  const sub = app.get(REDIS_SUB, { strict: false });
  app.useWebSocketAdapter(new RedisIoAdapter(app, pub, sub));

  // Always on, in every environment: this is public API reference
  // documentation, not an internal debug tool, and none of its own
  // routes bypass the auth guards the underlying endpoints already
  // enforce - "Try it out" in the UI still needs a real session token.
  const swagger = new DocumentBuilder()
    .setTitle('Atlas API')
    .setDescription(
      [
        'REST API for Atlas, a self-hosted project-collaboration platform',
        '(projects, chat, voice, and project-management tooling).',
        '',
        '**Authentication**: send `Authorization: Bearer <sessionId>` on every',
        'request, where `sessionId` is the opaque session id returned by any',
        'of the `/auth/login/*` endpoints (password, passphrase, magic link,',
        'phone OTP, or an OAuth/OIDC/SAML callback) - it is a random session',
        'identifier, not a JWT. Click "Authorize" below and paste it in.',
        '',
        'Godmode (`/godmode/*`) is a separate control plane with its own',
        '`X-Godmode-Token` header, issued by `POST /godmode/unlock`; it is not',
        'covered by the Bearer scheme above.',
      ].join('\n'),
    )
    .setVersion('1.0.0')
    .addBearerAuth({
      type: 'http',
      scheme: 'bearer',
      description: 'Opaque session id from /auth/login/* (not a JWT).',
    })
    .addApiKey(
      {
        type: 'apiKey',
        in: 'header',
        name: 'X-Godmode-Token',
        description:
          'Opaque token issued by POST /godmode/unlock (instance passphrase + optional 2FA).',
      },
      'godmode-token',
    )
    .addTag('health', 'Liveness/readiness probe, unauthenticated')
    .build();
  const doc = SwaggerModule.createDocument(app, swagger);
  SwaggerModule.setup(`${prefix}/docs`, app, doc, {
    swaggerOptions: { persistAuthorization: true },
    customSiteTitle: 'Atlas API docs',
  });

  app.enableShutdownHooks();

  await app.listen(port, '0.0.0.0');
  // eslint-disable-next-line no-console
  console.log(`[atlas-backend] listening on :${port} (prefix /${prefix})`);
}

bootstrap();
