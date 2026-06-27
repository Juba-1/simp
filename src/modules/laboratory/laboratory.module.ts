import { Module } from '@nestjs/common';
import { LaboratoryController } from './laboratory.controller';
import { LaboratoryService } from './laboratory.service';
import { BarcodeService } from './barcode.service';

@Module({
  controllers: [LaboratoryController],
  providers: [LaboratoryService, BarcodeService],
  exports: [LaboratoryService],
})
export class LaboratoryModule {}
