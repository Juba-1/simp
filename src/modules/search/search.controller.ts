import { Controller, Get, Query } from '@nestjs/common';
import { SearchService } from './search.service';
import { SearchQueryDto } from './dto/search.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('forms')
  searchForms(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: SearchQueryDto,
  ) {
    return this.searchService.searchForms(user, query);
  }
}
