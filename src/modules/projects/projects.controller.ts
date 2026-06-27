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
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import {
  CreateProjectDto,
  UpdateProjectDto,
  InviteProjectOrganizationDto,
  InviteSubContractorDto,
  AssignProjectUserDto,
  OnboardVendorDto,
  ProvisionSubContractorDto,
} from './dto/project.dto';
import { ResetPasswordDto } from '../users/dto/user.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateProjectDto,
  ) {
    return this.projectsService.create(user, dto);
  }

  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() pagination: PaginationDto,
  ) {
    return this.projectsService.findAll(user, pagination);
  }

  @Get('sub-contractors')
  listMySubContractors(@CurrentUser() user: AuthenticatedUser) {
    return this.projectsService.listMySubContractors(user);
  }

  @Patch('sub-contractors/:orgId/admin/password')
  resetSubContractorAdminPassword(
    @CurrentUser() user: AuthenticatedUser,
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Body() dto: ResetPasswordDto,
  ) {
    return this.projectsService.resetManagedSubContractorAdminPassword(
      user,
      orgId,
      dto,
    );
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.projectsService.findOne(user, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProjectDto,
  ) {
    return this.projectsService.update(user, id, dto);
  }

  @Delete(':id')
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.projectsService.remove(user, id);
  }

  @Post(':id/organizations')
  inviteOrganization(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: InviteProjectOrganizationDto,
  ) {
    return this.projectsService.inviteOrganization(user, id, dto);
  }

  @Delete(':id/organizations/:membershipId')
  unassignOrganization(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('membershipId', ParseUUIDPipe) membershipId: string,
  ) {
    return this.projectsService.unassignOrganization(user, id, membershipId);
  }

  @Post(':id/sub-contractors')
  inviteSubContractor(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: InviteSubContractorDto,
  ) {
    return this.projectsService.inviteSubContractor(user, id, dto);
  }

  @Post(':id/sub-contractors/provision')
  provisionSubContractor(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ProvisionSubContractorDto,
  ) {
    return this.projectsService.provisionSubContractor(user, id, dto);
  }

  // ─── User ↔ Project access matrix ───────────────────────────────────────────

  @Get(':id/team')
  getProjectTeam(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.projectsService.getProjectTeam(user, id);
  }

  @Post(':id/team')
  assignUserToProject(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignProjectUserDto,
  ) {
    return this.projectsService.assignUserToProject(user, id, dto);
  }

  @Delete(':id/team/:userId')
  removeUserFromProject(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.projectsService.removeUserFromProject(user, id, userId);
  }

  // ─── Client-driven vendor onboarding ────────────────────────────────────────

  @Post(':id/vendors')
  onboardVendor(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: OnboardVendorDto,
  ) {
    return this.projectsService.onboardVendor(user, id, dto);
  }
}
