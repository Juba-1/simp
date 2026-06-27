import { Module } from '@nestjs/common';
import { MaterialsController } from './materials.controller';
import { MaterialReconciliationService } from './material-reconciliation.service';

@Module({
  controllers: [MaterialsController],
  providers: [MaterialReconciliationService],
  exports: [MaterialReconciliationService],
})
export class MaterialsModule {}
