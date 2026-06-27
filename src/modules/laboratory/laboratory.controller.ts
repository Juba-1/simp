import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import { LaboratoryService } from './laboratory.service';
import {
  CreateLabTestRequestDto,
  SubmitLabTestResultDto,
} from './dto/laboratory.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequestMeta } from '../../common/decorators/request-meta.decorator';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';

@Controller('laboratory')
export class LaboratoryController {
  constructor(private readonly laboratoryService: LaboratoryService) {}

  @Post('requests')
  createRequest(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateLabTestRequestDto,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string },
  ) {
    return this.laboratoryService.createTestRequest(user, dto, meta);
  }

  @Get('requests/pending')
  listPendingForLab(@CurrentUser() user: AuthenticatedUser) {
    return this.laboratoryService.getPendingRequestsForLab(user);
  }

  @Get('requests/project/:projectId')
  listByProject(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    return this.laboratoryService.getRequestsByProject(user, projectId);
  }

  @Get('requests/form/:formInstanceId')
  listByForm(
    @CurrentUser() user: AuthenticatedUser,
    @Param('formInstanceId', ParseUUIDPipe) formInstanceId: string,
  ) {
    return this.laboratoryService.getRequestsByForm(user, formInstanceId);
  }

  @Get('requests/:requestId')
  getRequest(
    @CurrentUser() user: AuthenticatedUser,
    @Param('requestId', ParseUUIDPipe) requestId: string,
  ) {
    return this.laboratoryService.getRequestById(user, requestId);
  }

  @Post('requests/:requestId/results')
  submitResultById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('requestId', ParseUUIDPipe) requestId: string,
    @Body() dto: SubmitLabTestResultDto,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string },
  ) {
    return this.laboratoryService.submitResultByRequestId(
      user,
      requestId,
      dto,
      meta,
    );
  }

  /** Legacy LTR ID lookup — retained for API compatibility */
  @Get('barcode/:barcode')
  lookupBarcode(
    @CurrentUser() user: AuthenticatedUser,
    @Param('barcode') barcode: string,
  ) {
    return this.laboratoryService.lookupByBarcode(user, barcode);
  }

  @Post('barcode/:barcode/results')
  submitResult(
    @CurrentUser() user: AuthenticatedUser,
    @Param('barcode') barcode: string,
    @Body() dto: SubmitLabTestResultDto,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string },
  ) {
    return this.laboratoryService.submitResultByBarcode(
      user,
      barcode,
      dto,
      meta,
    );
  }
}
