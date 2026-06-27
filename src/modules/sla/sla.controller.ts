import { Controller, Get, Param, Post, ParseUUIDPipe, Query } from '@nestjs/common';
import { SlaService } from './sla.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { TenantScopeService } from '../../common/services/tenant-scope.service';

@Controller('sla')
export class SlaController {
  constructor(
    private readonly slaService: SlaService,
    private readonly tenantScope: TenantScopeService,
  ) {}

  @Get('escalations/project/:projectId')
  async getEscalations(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query('includeAcknowledged') includeAcknowledged?: string,
  ) {
    await this.tenantScope.assertProjectAccess(user, projectId);
    return this.slaService.getProjectEscalations(
      projectId,
      includeAcknowledged === 'true',
    );
  }

  @Post('escalations/:id/acknowledge')
  acknowledge(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.slaService.acknowledgeEscalation(id, user.id);
  }

  /** Manual trigger for ops / testing */
  @Post('scan')
  triggerScan() {
    return this.slaService.scanAndEscalate();
  }
}
