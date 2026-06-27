import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  ParseUUIDPipe,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { UsersService } from './users.service';
import {
  CreateUserDto,
  ResetPasswordDto,
  SetMemberProjectsDto,
  UpdateProfileDto,
  UpdateTeamMemberDto,
} from './dto/user.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me/profile')
  getMyProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.findById(user.id).then((u) =>
      u ? this.usersService.sanitizeMember(u) : null,
    );
  }

  @Patch('me/profile')
  updateMyProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(user, dto);
  }

  @Post('me/avatar')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  uploadAvatar(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    return this.usersService.uploadAvatar(user, file);
  }

  @Get('organization/members')
  listMembers(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.listOrganizationMembers(user);
  }

  @Get('organization/roles')
  listRoles(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.listOrganizationRoles(user);
  }

  @Post('organization/members')
  createMember(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateUserDto,
  ) {
    return this.usersService.createMember(user, dto);
  }

  @Patch('organization/members/:id')
  updateMember(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTeamMemberDto,
  ) {
    return this.usersService.updateMember(user, id, dto);
  }

  @Patch('organization/members/:id/password')
  resetPassword(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResetPasswordDto,
  ) {
    return this.usersService.resetMemberPassword(user, id, dto);
  }

  @Get('organization/members/:id/projects')
  getMemberProjects(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.usersService.getMemberProjectAccess(user, id);
  }

  @Patch('organization/members/:id/projects')
  setMemberProjects(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetMemberProjectsDto,
  ) {
    return this.usersService.setMemberProjectAccess(user, id, dto);
  }
}
