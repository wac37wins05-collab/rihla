/**
 * PaymentController — REST endpoints for payment management
 * POST   /payments              → record a payment
 * GET    /payments/:id          → get payment with allocations
 * POST   /payments/:id/void     → void a payment
 * POST   /payments/:id/refund   → create a refund
 * GET    /customers/:id/balance → outstanding balance for a customer
 */

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  Req,
} from '@nestjs/common'
import {
  ApiTags,
  ApiOperation,
  ApiCreatedResponse,
  ApiBearerAuth,
} from '@nestjs/swagger'
import { PaymentService } from '../services/payment.service'
import { RecordPaymentDto } from '../dto/record-payment.dto'
import { AuditContext } from '../../audit/audit.service'

@ApiTags('Payments')
@ApiBearerAuth()
@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  // ── RECORD ─────────────────────────────────────────────────────────

  @Post()
  @ApiOperation({ summary: 'Record a payment and allocate to invoices' })
  @ApiCreatedResponse({ description: 'paymentId + allocation summary' })
  async record(@Req() req: any, @Body() dto: RecordPaymentDto) {
    const ctx = this.buildCtx(req)
    return this.paymentService.record(ctx, dto)
  }

  // ── FIND ONE ───────────────────────────────────────────────────────

  @Get(':id')
  @ApiOperation({ summary: 'Get payment by ID with allocations and refunds' })
  async findById(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const companyId = this.getCompanyId(req)
    return this.paymentService.findById(companyId, id)
  }

  // ── VOID ───────────────────────────────────────────────────────────

  @Post(':id/void')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Void a payment (reverses allocations)' })
  async void(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason: string,
  ) {
    const ctx = this.buildCtx(req)
    await this.paymentService.void(ctx, id, reason)
  }

  // ── REFUND ─────────────────────────────────────────────────────────

  @Post(':id/refund')
  @ApiOperation({ summary: 'Issue a (partial) refund against a payment' })
  async refund(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('amount') amount: string,
    @Body('reason') reason: string,
    @Body('method') method?: string,
  ) {
    const ctx = this.buildCtx(req)
    const refundId = await this.paymentService.refund(ctx, id, amount, reason, method)
    return { refundId }
  }

  // ── CUSTOMER BALANCE ──────────────────────────────────────────────

  @Get('/customers/:customerId/balance')
  @ApiOperation({ summary: 'Outstanding balance for a customer' })
  async customerBalance(
    @Req() req: any,
    @Param('customerId', ParseUUIDPipe) customerId: string,
  ) {
    const companyId = this.getCompanyId(req)
    return this.paymentService.outstandingBalance(companyId, customerId)
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
