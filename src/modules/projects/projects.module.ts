import { Module } from '@nestjs/common';
import { FormsModule } from '../forms/forms.module';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';

@Module({
  imports: [FormsModule],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
