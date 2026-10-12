import { plainToInstance, Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsString,
  Matches,
  Max,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';

export enum NodeEnvironment {
  Development = 'development',
  Test = 'test',
  Production = 'production',
}

export enum LogLevel {
  Fatal = 'fatal',
  Error = 'error',
  Warn = 'warn',
  Info = 'info',
  Debug = 'debug',
  Trace = 'trace',
  Silent = 'silent',
}

export class EnvironmentVariables {
  @IsEnum(NodeEnvironment)
  NODE_ENV: NodeEnvironment = NodeEnvironment.Development;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65_535)
  API_PORT = 3001;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Matches(/^postgres(?:ql)?:\/\//, {
    message: 'DATABASE_URL must be a PostgreSQL connection URL',
  })
  DATABASE_URL!: string;

  @IsString()
  @Matches(/^https:\/\//, {
    message: 'SUPABASE_JWT_ISSUER must use HTTPS',
  })
  SUPABASE_JWT_ISSUER!: string;

  @IsString()
  SUPABASE_JWT_AUDIENCE = 'authenticated';

  @IsString()
  @Matches(/^https:\/\//, {
    message: 'SUPABASE_URL must use HTTPS',
  })
  SUPABASE_URL!: string;

  @IsString()
  @MinLength(20)
  SUPABASE_SERVICE_ROLE_KEY!: string;

  @IsString()
  @Matches(/^[a-z0-9][a-z0-9-]{1,78}[a-z0-9]$/)
  SUPABASE_STORAGE_BUCKET = 'documents';

  @IsEnum(LogLevel)
  LOG_LEVEL: LogLevel = LogLevel.Info;
}

export function validateEnvironment(
  rawConfig: Record<string, unknown>,
): EnvironmentVariables {
  const environment = plainToInstance(
    EnvironmentVariables,
    {
      NODE_ENV: rawConfig.NODE_ENV ?? NodeEnvironment.Development,
      API_PORT: rawConfig.API_PORT ?? 3001,
      DATABASE_URL: rawConfig.DATABASE_URL,
      SUPABASE_JWT_ISSUER: rawConfig.SUPABASE_JWT_ISSUER,
      SUPABASE_JWT_AUDIENCE: rawConfig.SUPABASE_JWT_AUDIENCE ?? 'authenticated',
      SUPABASE_URL: rawConfig.SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: rawConfig.SUPABASE_SERVICE_ROLE_KEY,
      SUPABASE_STORAGE_BUCKET: rawConfig.SUPABASE_STORAGE_BUCKET ?? 'documents',
      LOG_LEVEL: rawConfig.LOG_LEVEL ?? LogLevel.Info,
    },
    { enableImplicitConversion: true },
  );

  const errors = validateSync(environment, {
    skipMissingProperties: false,
    stopAtFirstError: false,
  });

  if (errors.length > 0) {
    const details = errors
      .flatMap((error) => Object.values(error.constraints ?? {}))
      .join('; ');

    throw new Error(`Invalid environment configuration: ${details}`);
  }

  return environment;
}
