import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ExportService } from './export.service';
import { ExportQueryDto } from './dto/export-query.dto';

@Controller('inventory/export')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Get()
  async export(@Query() query: ExportQueryDto, @Res() res: Response) {
    const { format, ...filter } = query;
    if (format === 'csv') return await this.exportService.exportCSV(filter, res);
    if (format === 'xlsx') return await this.exportService.exportXLSX(filter, res);
    return this.exportService.rejectUnsupportedFormat();
  }
}
