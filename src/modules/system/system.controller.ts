import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  UseGuards,
  Query,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import { SystemService } from './system.service';
import {
  CreatePlatformOrganizationDto,
  UpdatePlatformOrganizationDto,
} from './dto/system.dto';
import { SuperAdminGuard } from '../../common/guards/super-admin.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { AuditLogQueryService } from '../audit-log/audit-log-query.service';
import { AuditLogQueryDto } from '../audit-log/dto/audit-log.dto';
import { UsersService } from '../users/users.service';
import { ResetPasswordDto } from '../users/dto/user.dto';

@Controller('system')
@UseGuards(SuperAdminGuard)
export class SystemController {
  constructor(
    private readonly systemService: SystemService,
    private readonly auditLogQuery: AuditLogQueryService,
    private readonly usersService: UsersService,
  ) {}

  @Get('organizations')
  listOrganizations() {
    return this.systemService.listOrganizations();
  }

  @Post('organizations')
  createOrganization(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePlatformOrganizationDto,
  ) {
    return this.systemService.createOrganization(user, dto);
  }

  @Patch('organizations/:id')
  updateOrganization(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePlatformOrganizationDto,
  ) {
    return this.systemService.updateOrganization(id, dto);
  }

  @Patch('organizations/:id/suspend')
  suspendOrganization(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.systemService.suspendOrganization(user, id);
  }

  @Delete('organizations/:id')
  deleteOrganization(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.systemService.deleteOrganization(user, id);
  }

  @Get('audit/logs')
  queryGlobalAuditLogs(@Query() query: AuditLogQueryDto) {
    return this.auditLogQuery.queryGlobalLogs(query);
  }

  @Patch('users/:id/password')
  resetAnyUserPassword(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResetPasswordDto,
  ) {
    return this.usersService.resetAnyUserPassword(actor, id, dto);
  }
}
