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
import { OrganizationsService } from './organizations.service';
import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
  OrganizationDirectoryQueryDto,
} from './dto/organization.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateOrganizationDto,
  ) {
    return this.organizationsService.create(user, dto);
  }

  @Get('directory/search')
  searchDirectory(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: OrganizationDirectoryQueryDto,
  ) {
    return this.organizationsService.searchDirectory(user, query);
  }

  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() pagination: PaginationDto,
  ) {
    return this.organizationsService.findAll(user, pagination);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.organizationsService.findOne(user, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrganizationDto,
  ) {
    return this.organizationsService.update(user, id, dto);
  }

  @Delete(':id')
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.organizationsService.remove(user, id);
  }
}
