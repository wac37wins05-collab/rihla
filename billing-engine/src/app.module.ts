import { Module, Controller, Get } from '@nestjs/common'
import { BillingModule } from './modules/billing/billing.module'

@Controller()
class HealthController {
  @Get('health')
  health() {
    return { status: 'ok', service: 'billing-engine', ts: new Date().toISOString() }
  }
}

@Module({
  imports: [BillingModule],
  controllers: [HealthController],
})
export class AppModule {}
