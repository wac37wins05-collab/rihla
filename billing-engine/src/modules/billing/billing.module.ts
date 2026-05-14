import { Module } from '@nestjs/common'
import { PrismaService } from '../../shared/prisma.service'
import { AuditService } from '../audit/audit.service'

// Services
import { InvoiceService } from './services/invoice.service'
import { PaymentService } from './services/payment.service'
import { VatService } from './services/vat.service'
import { CurrencyService } from './services/currency.service'
import { InvoiceNumberingService } from './services/invoice-numbering.service'
import { ReportService } from './services/report.service'

// Controllers
import { InvoiceController } from './controllers/invoice.controller'
import { PaymentController } from './controllers/payment.controller'
import { ReportController } from './controllers/report.controller'

@Module({
  controllers: [
    InvoiceController,
    PaymentController,
    ReportController,
  ],
  providers: [
    PrismaService,
    AuditService,
    VatService,
    CurrencyService,
    InvoiceNumberingService,
    InvoiceService,
    PaymentService,
    ReportService,
  ],
  exports: [
    InvoiceService,
    PaymentService,
    VatService,
    CurrencyService,
    ReportService,
    AuditService,
  ],
})
export class BillingModule {}
