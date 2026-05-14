/**
 * Prisma seed — bootstraps a demo company with:
 *  - Base company record (S'TOURS, MAD base currency)
 *  - Morocco TVA rates (0%, 7%, 10%, 14%, 20%)
 *  - Common currencies (EUR, USD, GBP, MAD)
 *  - Sample exchange rates (EUR/MAD = 10.80, USD/MAD = 9.95, GBP/MAD = 12.60)
 *
 * Run: npx ts-node prisma/seed.ts
 */

import { PrismaClient, TaxType } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding billing engine...')

  // 1. Company
  const company = await prisma.company.upsert({
    where: { id: 'stours-main' },
    create: {
      id: 'stours-main',
      name: "S'TOURS Voyages",
      legalName: "S'TOURS SARL",
      taxNumber: 'RC-123456',
      email: 'billing@stours.ma',
      phone: '+212 522 000 000',
      address: '1 Boulevard Mohammed V, Casablanca 20000',
      country: 'MA',
      baseCurrency: 'MAD',
    },
    update: { baseCurrency: 'MAD' },
  })
  console.log(`✅ Company: ${company.name}`)

  // 2. Morocco TVA rates
  const MA_RATES = [
    { code: 'TVA0',  name: 'Exonéré (0%)',  rate: '0',  isDefault: false },
    { code: 'TVA7',  name: 'TVA 7%',        rate: '7',  isDefault: false },
    { code: 'TVA10', name: 'TVA 10%',       rate: '10', isDefault: false },
    { code: 'TVA14', name: 'TVA 14%',       rate: '14', isDefault: false },
    { code: 'TVA20', name: 'TVA 20%',       rate: '20', isDefault: true  },
  ]

  for (const r of MA_RATES) {
    await prisma.taxRate.upsert({
      where: { companyId_code: { companyId: company.id, code: r.code } },
      create: {
        companyId: company.id,
        code: r.code,
        name: r.name,
        type: TaxType.VAT,
        rate: r.rate as any,
        country: 'MA',
        isDefault: r.isDefault,
        isActive: true,
      },
      update: { name: r.name, rate: r.rate as any, isDefault: r.isDefault },
    })
  }
  console.log('✅ Morocco TVA rates (0/7/10/14/20%)')

  // 3. Currencies
  const CURRENCIES = [
    { code: 'MAD', name: 'Dirham Marocain',  symbol: 'MAD' },
    { code: 'EUR', name: 'Euro',              symbol: '€'   },
    { code: 'USD', name: 'US Dollar',         symbol: '$'   },
    { code: 'GBP', name: 'British Pound',     symbol: '£'   },
  ]

  for (const c of CURRENCIES) {
    await prisma.currency.upsert({
      where: { companyId_code: { companyId: company.id, code: c.code } },
      create: { companyId: company.id, ...c, isActive: true },
      update: { name: c.name, symbol: c.symbol },
    })
  }
  console.log('✅ Currencies (MAD, EUR, USD, GBP)')

  // 4. Exchange rates (effective today)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const RATES = [
    // 1 EUR = 10.80 MAD
    { code: 'EUR', rate: '10.80000000', inverse: '0.09259259' },
    // 1 USD = 9.95 MAD
    { code: 'USD', rate: '9.95000000',  inverse: '0.10050251' },
    // 1 GBP = 12.60 MAD
    { code: 'GBP', rate: '12.60000000', inverse: '0.07936508' },
  ]

  for (const r of RATES) {
    const currency = await prisma.currency.findUnique({
      where: { companyId_code: { companyId: company.id, code: r.code } },
    })
    if (!currency) continue

    await prisma.exchangeRate.upsert({
      where: {
        companyId_currencyCode_effectiveDate: {
          companyId: company.id,
          currencyCode: r.code,
          effectiveDate: today,
        },
      },
      create: {
        companyId: company.id,
        currencyId: currency.id,
        currencyCode: r.code,
        baseCurrencyCode: 'MAD',
        rate: r.rate as any,
        inverseRate: r.inverse as any,
        effectiveDate: today,
        source: 'SEED',
      },
      update: { rate: r.rate as any, inverseRate: r.inverse as any },
    })
  }
  console.log('✅ Exchange rates (EUR, USD, GBP → MAD)')

  console.log('\n🎉 Seed complete!')
  console.log(`   Company ID: ${company.id}`)
  console.log('   Run: npx prisma studio to inspect data')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
