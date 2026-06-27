import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  StreamableFile,
  Header,
} from '@nestjs/common';
import { ReportsService } from './reports.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('forms/:id/pdf')
  @Header('Content-Type', 'application/pdf')
  async downloadFormPdf(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<StreamableFile> {
    const { buffer, filename } =
      await this.reportsService.generateFormInstancePdf(user, id);
    return new StreamableFile(buffer, {
      disposition: `attachment; filename="${filename}"`,
    });
  }

  @Get('ipc/:id/pdf')
  @Header('Content-Type', 'application/pdf')
  async downloadIpcPdf(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<StreamableFile> {
    const { buffer, filename } =
      await this.reportsService.generateIpcPdf(user, id);
    return new StreamableFile(buffer, {
      disposition: `attachment; filename="${filename}"`,
    });
  }
}
