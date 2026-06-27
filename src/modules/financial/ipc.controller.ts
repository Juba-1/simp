import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import { IpcService } from './ipc.service';
import {
  CreateIpcDraftDto,
  CreateIpcWithWirsDto,
  IpcDecisionDto,
} from './dto/ipc.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequestMeta } from '../../common/decorators/request-meta.decorator';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';

@Controller('ipc')
export class IpcController {
  constructor(private readonly ipcService: IpcService) {}

  @Get('eligible-wirs/project/:projectId')
  getEligibleWirs(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    return this.ipcService.getEligibleWirs(user, projectId);
  }

  @Post('draft')
  generateDraft(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateIpcDraftDto,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string },
  ) {
    return this.ipcService.generateDraft(user, dto, meta);
  }

  @Post()
  createWithWirs(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateIpcWithWirsDto,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string },
  ) {
    return this.ipcService.createWithSelectedWirs(user, dto, meta);
  }

  @Get('project/:projectId')
  listByProject(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    return this.ipcService.findByProject(user, projectId);
  }

  @Get(':id')
  getOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.ipcService.findOne(user, id);
  }

  @Post(':id/submit')
  submitForReview(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: IpcDecisionDto,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string },
  ) {
    return this.ipcService.submitForConsultantReview(user, id, dto, meta);
  }

  @Post(':id/approve-consultant')
  approveConsultant(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: IpcDecisionDto,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string },
  ) {
    return this.ipcService.approveConsultant(user, id, dto, meta);
  }

  @Post(':id/reject-consultant')
  rejectConsultant(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: IpcDecisionDto,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string },
  ) {
    return this.ipcService.rejectConsultant(user, id, dto, meta);
  }

  @Post(':id/approve-client')
  approveClient(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: IpcDecisionDto,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string },
  ) {
    return this.ipcService.approveClient(user, id, dto, meta);
  }

  @Post(':id/reject-client')
  rejectClient(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: IpcDecisionDto,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string },
  ) {
    return this.ipcService.rejectClient(user, id, dto, meta);
  }
}
