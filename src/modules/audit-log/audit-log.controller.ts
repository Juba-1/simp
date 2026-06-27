import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { AuditLogQueryService } from './audit-log-query.service';
import { AuditLogQueryDto } from './dto/audit-log.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';

@Controller('audit')
export class AuditLogController {
  constructor(private readonly auditLogQuery: AuditLogQueryService) {}

  @Get('logs')
  queryLogs(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: AuditLogQueryDto,
  ) {
    return this.auditLogQuery.queryLogs(user, query);
  }

  @Get('forms/:formInstanceId/history')
  getFormHistory(
    @CurrentUser() user: AuthenticatedUser,
    @Param('formInstanceId', ParseUUIDPipe) formInstanceId: string,
  ) {
    return this.auditLogQuery.getFormInstanceHistory(user, formInstanceId);
  }
}
