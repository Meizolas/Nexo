import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module.js';
import { configureApplication } from './bootstrap.js';
import { EnvironmentVariables } from './config/environment.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  configureApplication(app);

  const config = app.get(ConfigService<EnvironmentVariables, true>);
  const port = config.get('API_PORT', 3001);

  await app.listen(port, '0.0.0.0');
  app.get(Logger).log(`API listening on port ${port}`);
}
await bootstrap();
