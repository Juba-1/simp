import { Module } from '@nestjs/common';
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';
import { FormsModule } from '../forms/forms.module';

@Module({
  imports: [FormsModule],
  controllers: [SyncController],
  providers: [SyncService],
})
export class SyncModule {}
