/**
 * InvoiceController — REST endpoints for invoice lifecycle
 * POST   /invoices                → create draft
 * GET    /invoices                → list (paginated, filterable)
 * GET    /invoices/:id            → find by id with items + payments
 * PATCH  /invoices/:id            → update draft fields
 * POST   /invoices/:id/send       → send (DRAFT → SENT)
 * POST   /invoices/:id/void       → void with reason
 * DELETE /invoices/:id            → soft delete (DRAFT only)
 * GET    /invoices/:id/history    → audit trail
 * POST   /invoices/mark-overdue   → batch overdue check (internal/cron)
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  UseGuards,
  Req,
} from '@nestjs/common'
import {
  ApiTags,
  ApiOperation,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiBearerAuth,
} from '@nestjs/swagger'
import { InvoiceStatus, InvoiceType } from '@prisma/client'
import { InvoiceService } from '../services/invoice.service'
import { AuditService } from '../../audit/audit.service'
import { CreateInvoiceDto } from '../dto/create-invoice.dto'
import { UpdateInvoiceDto } from '../dto/update-invoice.dto'
import { AuditContext } from '../../audit/audit.service'

// Lightweight guard stub — replace with your actual JwtAuthGuard
// import { JwtAuthGuard } from '../../../auth/jwt-auth.guard'

@ApiTags('Invoices')
@ApiBearerAuth()
// @UseGuards(JwtAuthGuard)
@Controller('invoices')
export class InvoiceController {
  constructor(
    private readonly invoiceService: InvoiceService,
    private readonly auditService: AuditService,
  ) {}

  // ── CREATE ─────────────────────────────────────────────────────────

  @Post()
  @ApiOperation({ summary: 'Create a draft invoice' })
  @ApiCreatedResponse({ description: 'Invoice ID' })
  async create(@Req() req: any, @Body() dto: CreateInvoiceDto) {
    const ctx = this.buildCtx(req)
    const id = await this.invoiceService.create(ctx, dto)
    return { id }
  }

  // ── LIST ───────────────────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'List invoices (paginated)' })
  async list(
    @Req() req: any,
    @Query('customerId') customerId?: string,
    @Query('status') status?: InvoiceStatus,
    @Query('type') type?: InvoiceType,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '25',
  ) {
    const companyId = this.getCompanyId(req)
    return this.invoiceService.list(companyId, {
      customerId,
      status,
      type,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    })
  }

  // ── FIND ONE ───────────────────────────────────────────────────────

  @Get(':id')
  @ApiOperation({ summary: 'Get invoice by ID' })
  async findById(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const companyId = this.getCompanyId(req)
    return this.invoiceService.findById(companyId, id)
  }

  // ── UPDATE DRAFT ───────────────────────────────────────────────────

  @Patch(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Update a DRAFT invoice (notes, dueDate, terms)' })
  async update(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateInvoiceDto,
  ) {
    const ctx = this.buildCtx(req)
    await this.invoiceService.update(ctx, id, dto)
  }

  // ── SEND ───────────────────────────────────────────────────────────

  @Post(':id/send')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Send invoice (DRAFT → SENT)' })
  async send(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const ctx = this.buildCtx(req)
    await this.invoiceService.send(ctx, id)
  }

  // ── VOID ───────────────────────────────────────────────────────────

  @Post(':id/void')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Void an invoice' })
  async void(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason: string,
  ) {
    const ctx = this.buildCtx(req)
    await this.invoiceService.void(ctx, id, reason)
  }

  // ── SOFT DELETE ────────────────────────────────────────────────────

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a DRAFT invoice' })
  async remove(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const ctx = this.buildCtx(req)
    await this.invoiceService.softDelete(ctx, id)
  }

  // ── AUDIT HISTORY ──────────────────────────────────────────────────

  @Get(':id/history')
  @ApiOperation({ summary: 'Audit trail for an invoice' })
  async history(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const companyId = this.getCompanyId(req)
    return this.auditService.getHistory(companyId, 'Invoice', id)
  }

  // ── BATCH OVERDUE (cron / internal) ───────────────────────────────

  @Post('mark-overdue')
  @ApiOperation({ summary: 'Mark overdue invoices (call from cron)' })
  async markOverdue(@Req() req: any) {
    const companyId = this.getCompanyId(req)
    const count = await this.invoiceService.markOverdue(companyId)
    return { markedOverdue: count }
  }

  // ── Helpers ────────────────────────────────────────────────────────

  private buildCtx(req: any): AuditContext {
    return {
      companyId: req.user?.companyId ?? req.headers['x-company-id'],
      userId: req.user?.sub,
      userEmail: req.user?.email,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    }
  }

  private getCompanyId(req: any): string {
    return req.user?.companyId ?? req.headers['x-company-id']
  }
}
