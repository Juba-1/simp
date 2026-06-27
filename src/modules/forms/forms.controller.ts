import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseUUIDPipe,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { FormTemplatesService } from './form-templates.service';
import { FormInstancesService } from './form-instances.service';
import {
  CreateFormTemplateDto,
  PublishTemplateVersionDto,
  UpdateFormTemplateDto,
} from './dto/form-template.dto';
import {
  CreateFormInstanceDto,
  FormInstanceQueryDto,
  UpdateFormInstanceDto,
} from './dto/form-instance.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequestMeta } from '../../common/decorators/request-meta.decorator';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';

@Controller('forms')
export class FormsController {
  constructor(
    private readonly templatesService: FormTemplatesService,
    private readonly instancesService: FormInstancesService,
  ) {}

  // ─── Templates ─────────────────────────────────────────────────────────────

  @Post('templates')
  createTemplate(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateFormTemplateDto,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string },
  ) {
    return this.templatesService.create(user, dto, {
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
  }

  @Get('templates/project/:projectId')
  listTemplates(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    return this.templatesService.findByProject(user, projectId);
  }

  @Get('templates/:id')
  getTemplate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.templatesService.findOne(user, id);
  }

  @Patch('templates/:id')
  updateTemplate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFormTemplateDto,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string },
  ) {
    return this.templatesService.update(user, id, dto, {
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
  }

  @Post('templates/:id/publish')
  publishTemplate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PublishTemplateVersionDto,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string },
  ) {
    return this.templatesService.publishVersion(user, id, dto, {
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
  }

  @Post('templates/seed/project/:projectId')
  seedStandardTemplates(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string },
  ) {
    return this.templatesService.seedStandardTemplates(user, projectId, {
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
  }

  @Delete('templates/:id')
  deleteTemplate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string },
  ) {
    return this.templatesService.remove(user, id, {
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
  }

  // ─── Instances (JSONB payloads) ──────────────────────────────────────────

  @Post('instances')
  createInstance(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateFormInstanceDto,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string },
  ) {
    return this.instancesService.create(user, dto, {
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
  }

  @Get('instances/pending/approvals')
  listPendingApprovals(
    @CurrentUser() user: AuthenticatedUser,
    @Query('projectId', new ParseUUIDPipe({ optional: true })) projectId?: string,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit?: number,
  ) {
    return this.instancesService.findPendingApprovals(user, { projectId, limit });
  }

  @Get('instances/project/:projectId')
  listInstances(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query() query: FormInstanceQueryDto,
  ) {
    return this.instancesService.findAll(user, projectId, query);
  }

  @Get('instances/:id')
  getInstance(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.instancesService.findOne(user, id);
  }

  @Patch('instances/:id')
  updateInstance(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFormInstanceDto,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string },
  ) {
    return this.instancesService.update(user, id, dto, {
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
  }

  @Delete('instances/:id')
  deleteInstance(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @RequestMeta() meta: { ipAddress?: string; userAgent?: string },
  ) {
    return this.instancesService.remove(user, id, {
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
  }
}
