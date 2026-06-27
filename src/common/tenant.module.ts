import { Global, Module } from '@nestjs/common';
import { TenantScopeService } from './services/tenant-scope.service';
import { TimeIntegrityService } from './services/time-integrity.service';

@Global()
@Module({
  providers: [TenantScopeService, TimeIntegrityService],
  exports: [TenantScopeService, TimeIntegrityService],
})
export class TenantModule {}
