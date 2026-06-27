import { Module } from '@nestjs/common';
import { WorkflowController } from './workflow.controller';
import { WorkflowService } from './workflow.service';
import { WorkflowPolicyService } from './workflow-policy.service';
import { MaterialsModule } from '../materials/materials.module';

@Module({
  imports: [MaterialsModule],
  controllers: [WorkflowController],
  providers: [WorkflowService, WorkflowPolicyService],
  exports: [WorkflowService, WorkflowPolicyService],
})
export class WorkflowsModule {}
