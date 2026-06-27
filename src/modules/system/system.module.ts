import { Module } from '@nestjs/common';
import { SystemService } from './system.service';
import { SystemController } from './system.controller';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [AuditLogModule, UsersModule],
  controllers: [SystemController],
  providers: [SystemService],
})
export class SystemModule {}
