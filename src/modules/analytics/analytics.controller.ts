import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  getPortfolioDashboard(@CurrentUser() user: AuthenticatedUser) {
    return this.analyticsService.getPortfolioDashboard(user);
  }

  @Get('dashboard/project/:projectId')
  getProjectDashboard(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    return this.analyticsService.getProjectDashboard(user, projectId);
  }
}
