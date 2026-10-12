import { randomUUID } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { Params } from 'nestjs-pino';
import { EnvironmentVariables, LogLevel } from './environment.js';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function createLoggerConfig(
  configService: ConfigService<EnvironmentVariables, true>,
): Params {
  return {
    pinoHttp: {
      level: configService.get('LOG_LEVEL', LogLevel.Info),
      genReqId: (request, response) => {
        const providedId = request.headers['x-correlation-id'];
        const candidate = Array.isArray(providedId)
          ? providedId[0]
          : providedId;
        const correlationId =
          typeof candidate === 'string' && UUID_PATTERN.test(candidate)
            ? candidate
            : randomUUID();

        response.setHeader('x-correlation-id', correlationId);
        return correlationId;
      },
      customAttributeKeys: {
        reqId: 'correlationId',
      },
      redact: {
        paths: [
          'req.headers.authorization',
          'req.headers.cookie',
          'res.headers.set-cookie',
          '*.password',
          '*.token',
          '*.secret',
        ],
        censor: '[REDACTED]',
      },
    },
  };
}
