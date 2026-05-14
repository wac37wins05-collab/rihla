import {
  IsString,
  IsOptional,
  IsUUID,
  IsDateString,
  IsArray,
  ArrayMinSize,
} from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class RecordPaymentDto {
  @ApiProperty({ description: 'Customer ID making the payment' })
  @IsUUID()
  customerId: string

  @ApiProperty({ type: [String], description: 'Invoice IDs to allocate this payment against' })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID(undefined, { each: true })
  invoiceIds: string[]

  @ApiProperty({ example: '3600.00', description: 'Amount received (string for precision)' })
  @IsString()
  amount: string

  @ApiProperty({ example: 'MAD', description: 'Currency of the payment' })
  @IsString()
  currency: string

  @ApiProperty({ example: 'BANK_TRANSFER', description: 'Payment method' })
  @IsString()
  method: string

  @ApiPropertyOptional({ example: '2026-05-09', description: 'Defaults to today' })
  @IsOptional()
  @IsDateString()
  paymentDate?: string

  @ApiPropertyOptional({ example: 'REF-20260509-001', description: 'Bank / cheque reference' })
  @IsOptional()
  @IsString()
  reference?: string

  @ApiPropertyOptional({ example: 'BMCE-001' })
  @IsOptional()
  @IsString()
  bankAccount?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string
}
