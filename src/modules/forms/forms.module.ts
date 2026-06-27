import { Module } from '@nestjs/common';
import { FormsController } from './forms.controller';
import { FormTemplatesService } from './form-templates.service';
import { FormInstancesService } from './form-instances.service';

@Module({
  controllers: [FormsController],
  providers: [FormTemplatesService, FormInstancesService],
  exports: [FormTemplatesService, FormInstancesService],
})
export class FormsModule {}
