import {
  IsEnum,
  IsString,
  IsOptional,
  IsUUID,
  IsDateString,
  IsArray,
  ValidateNested,
  IsNumber,
  IsBoolean,
  Min,
  ArrayMinSize,
} from 'class-validator'
import { Type } from 'class-transformer'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { InvoiceType } from '@prisma/client'

export class CreateInvoiceItemDto {
  @ApiProperty({ example: 'Guide service — 3 days' })
  @IsString()
  description: string

  @ApiProperty({ example: 3 })
  @IsNumber()
  @Min(0)
  quantity: number

  @ApiProperty({ example: '1200.00', description: 'Unit price (string to preserve precision)' })
  @IsString()
  unitPrice: string

  @ApiPropertyOptional({ example: '0', description: 'Fixed discount amount on this line' })
  @IsOptional()
  @IsString()
  discountAmount?: string

  @ApiPropertyOptional({ description: 'Reference to a TaxRate row; overrides taxRatePct' })
  @IsOptional()
  @IsUUID()
  taxRateId?: string

  @ApiPropertyOptional({ example: 20, description: 'Tax % when no taxRateId. Ignored if taxRateId set.' })
  @IsOptional()
  @IsNumber()
  taxRatePct?: number

  @ApiPropertyOptional({ example: false, description: 'True = price already includes tax' })
  @IsOptional()
  @IsBoolean()
  isTaxInclusive?: boolean
}

export class CreateInvoiceDto {
  @ApiProperty({ enum: InvoiceType, example: 'FINAL' })
  @IsEnum(InvoiceType)
  type: InvoiceType

  @ApiProperty({ description: 'Customer ID (UUID)' })
  @IsUUID()
  customerId: string

  @ApiPropertyOptional({ description: 'Booking ID to link this invoice to' })
  @IsOptional()
  @IsUUID()
  bookingId?: string

  @ApiProperty({ example: 'MAD', description: 'ISO 4217 currency code' })
  @IsString()
  currency: string

  @ApiPropertyOptional({ example: '2026-05-09', description: 'ISO 8601 date. Defaults to today.' })
  @IsOptional()
  @IsDateString()
  issueDate?: string

  @ApiPropertyOptional({ example: '2026-06-09', description: 'Payment due date' })
  @IsOptional()
  @IsDateString()
  dueDate?: string

  @ApiProperty({ type: [CreateInvoiceItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateInvoiceItemDto)
  items: CreateInvoiceItemDto[]

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  termsAndConditions?: string
}
