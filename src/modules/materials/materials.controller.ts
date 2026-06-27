import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { MaterialReconciliationService } from './material-reconciliation.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { TenantScopeService } from '../../common/services/tenant-scope.service';

@Controller('materials')
export class MaterialsController {
  constructor(
    private readonly materials: MaterialReconciliationService,
    private readonly tenantScope: TenantScopeService,
  ) {}

  @Get('inventory/project/:projectId')
  async getProjectInventory(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    await this.tenantScope.assertProjectAccess(user, projectId);
    return this.materials.getProjectInventory(projectId);
  }

  @Get('inventory/mir/:mirFormInstanceId')
  async getMirInventory(
    @CurrentUser() user: AuthenticatedUser,
    @Param('mirFormInstanceId', ParseUUIDPipe) mirFormInstanceId: string,
  ) {
    const inventory = await this.materials.getInventoryByMir(mirFormInstanceId);
    await this.tenantScope.assertProjectAccess(user, inventory.projectId);
    return inventory;
  }

  @Get('inventory/:inventoryId')
  async getInventoryById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('inventoryId', ParseUUIDPipe) inventoryId: string,
  ) {
    const inventory = await this.materials.getInventoryById(inventoryId);
    await this.tenantScope.assertProjectAccess(user, inventory.projectId);
    return inventory;
  }

  @Get('red-alerts/project/:projectId')
  async getRedAlerts(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    await this.tenantScope.assertProjectAccess(user, projectId);
    return this.materials.getRedAlertForms(projectId);
  }
}
