/**
 * ReportController — Financial reporting endpoints
 * GET /reports/revenue     → revenue summary for a period
 * GET /reports/aging       → AR aging buckets
 * GET /reports/vat         → VAT report for DGI
 * GET /reports/profit      → profitability by booking
 */

import { Controller, Get, Query, Req } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { ReportService } from '../services/report.service'

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Get('revenue')
  @ApiOperation({ summary: 'Revenue summary for a date range' })
  async revenue(
    @Req() req: any,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    const companyId = this.getCompanyId(req)
    return this.reportService.revenueSummary(
      companyId,
      new Date(from),
      new Date(to),
    )
  }

  @Get('aging')
  @ApiOperation({ summary: 'Accounts receivable aging report' })
  async aging(@Req() req: any) {
    const companyId = this.getCompanyId(req)
    return this.reportService.agingReport(companyId)
  }

  @Get('vat')
  @ApiOperation({ summary: 'VAT report by rate for a date range (DGI)' })
  async vat(
    @Req() req: any,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    const companyId = this.getCompanyId(req)
    return this.reportService.vatReport(
      companyId,
      new Date(from),
      new Date(to),
    )
  }

  @Get('profit')
  @ApiOperation({ summary: 'Profitability by booking for a date range' })
  async profit(
    @Req() req: any,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    const companyId = this.getCompanyId(req)
    return this.reportService.profitabilityReport(
      companyId,
      new Date(from),
      new Date(to),
    )
  }

  private getCompanyId(req: any): string {
    return req.user?.companyId ?? req.headers['x-company-id']
  }
}
