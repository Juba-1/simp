import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { SyncService } from './sync.service';
import { SyncBatchDto, SyncPullQueryDto } from './dto/sync.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequestMeta } from '../../common/decorators/request-meta.decorator';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';

@Controller('sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  /**
   * Push offline actions batch — LWW conflict resolution with universal audit.
   */
  @Post()
  pushBatch(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SyncBatchDto,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string },
  ) {
    return this.syncService.processBatch(user, dto, meta);
  }

  /**
   * Pull server changes since cursor for offline hydration.
   */
  @Get('pull')
  pullChanges(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: SyncPullQueryDto,
  ) {
    return this.syncService.pullChanges(user, query.since);
  }
}
