import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  ParseUUIDPipe,
} from '@nestjs/common';
import { WorkflowService } from './workflow.service';
import { ApprovalDecisionDto, SubmitWorkflowDto } from './dto/workflow.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequestMeta } from '../../common/decorators/request-meta.decorator';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';

@Controller('workflows')
export class WorkflowController {
  constructor(private readonly workflowService: WorkflowService) {}

  @Post('forms/:id/submit')
  submit(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SubmitWorkflowDto,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string },
  ) {
    return this.workflowService.submit(user, id, dto, meta);
  }

  @Post('forms/:id/approve-internal')
  approveInternal(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApprovalDecisionDto,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string },
  ) {
    return this.workflowService.approveInternal(user, id, dto, meta);
  }

  @Post('forms/:id/reject-internal')
  rejectInternal(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApprovalDecisionDto,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string },
  ) {
    return this.workflowService.rejectInternal(user, id, dto, meta);
  }

  @Post('forms/:id/approve-external')
  approveExternal(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApprovalDecisionDto,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string },
  ) {
    return this.workflowService.approveExternal(user, id, dto, meta);
  }

  @Post('forms/:id/reject-external')
  rejectExternal(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApprovalDecisionDto,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string },
  ) {
    return this.workflowService.rejectExternal(user, id, dto, meta);
  }

  @Post('forms/:id/resubmit')
  resubmit(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SubmitWorkflowDto,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string },
  ) {
    return this.workflowService.resubmit(user, id, dto, meta);
  }

  @Get('forms/:id/history')
  getHistory(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.workflowService.getApprovalHistory(user, id);
  }
}
