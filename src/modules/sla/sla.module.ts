import { Module } from '@nestjs/common';
import { SlaService } from './sla.service';
import { SlaController } from './sla.controller';
import { WorkflowsModule } from '../workflows/workflows.module';

@Module({
  imports: [WorkflowsModule],
  controllers: [SlaController],
  providers: [SlaService],
  exports: [SlaService],
})
export class SlaModule {}
