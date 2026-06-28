import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';
import configuration from './config/configuration';
import { PrismaModule } from './database/prisma.module';
import { TenantModule } from './common/tenant.module';
import { AuditModule } from './common/audit.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { FormsModule } from './modules/forms/forms.module';
import { SyncModule } from './modules/sync/sync.module';
import { WorkflowsModule } from './modules/workflows/workflows.module';
import { SlaModule } from './modules/sla/sla.module';
import { MaterialsModule } from './modules/materials/materials.module';
import { FinancialModule } from './modules/financial/financial.module';
import { LaboratoryModule } from './modules/laboratory/laboratory.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { SearchModule } from './modules/search/search.module';
import { ReportsModule } from './modules/reports/reports.module';
import { AuditLogModule } from './modules/audit-log/audit-log.module';
import { SystemModule } from './modules/system/system.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    TenantModule,
    AuditModule,
    AuthModule,
    UsersModule,
    OrganizationsModule,
    ProjectsModule,
    FormsModule,
    SyncModule,
    WorkflowsModule,
    SlaModule,
    MaterialsModule,
    FinancialModule,
    LaboratoryModule,
    AnalyticsModule,
    SearchModule,
    ReportsModule,
    AuditLogModule,
    SystemModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
