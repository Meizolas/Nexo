import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { validateEnvironment } from './config/environment.js';
import { createLoggerConfig } from './config/logger.config.js';
import { DatabaseModule } from './database/database.module.js';
import { StorageModule } from './integrations/storage/storage.module.js';
import { AuditModule } from './modules/audit/audit.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard.js';
import { MfaGuard } from './modules/auth/guards/mfa.guard.js';
import { OrganizationContextGuard } from './modules/auth/guards/organization-context.guard.js';
import { PermissionsGuard } from './modules/auth/guards/permissions.guard.js';
import { HealthModule } from './modules/health/health.module.js';
import { DocumentsModule } from './modules/documents/documents.module.js';
import { OrganizationsModule } from './modules/organizations/organizations.module.js';
import { NotificationsModule } from './modules/notifications/notifications.module.js';
import { PartiesModule } from './modules/parties/parties.module.js';
import { LegalCasesModule } from './modules/legal-cases/legal-cases.module.js';
import { CaseMovementsModule } from './modules/case-movements/case-movements.module.js';
import { LegalDeadlinesModule } from './modules/legal-deadlines/legal-deadlines.module.js';
import { HearingsModule } from './modules/hearings/hearings.module.js';
import { LegalDocumentsModule } from './modules/legal-documents/legal-documents.module.js';
import { LegalPortalModule } from './modules/legal-portal/legal-portal.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      cache: true,
      envFilePath: ['../../.env', '.env'],
      isGlobal: true,
      validate: validateEnvironment,
    }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: createLoggerConfig,
    }),
    DatabaseModule,
    StorageModule,
    AuthModule,
    AuditModule,
    HealthModule,
    OrganizationsModule,
    PartiesModule,
    DocumentsModule,
    NotificationsModule,
    LegalCasesModule,
    CaseMovementsModule,
    LegalDeadlinesModule,
    HearingsModule,
    LegalDocumentsModule,
    LegalPortalModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: OrganizationContextGuard },
    { provide: APP_GUARD, useClass: MfaGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}
