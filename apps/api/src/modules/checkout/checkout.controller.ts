import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { IsIn, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { CheckoutService } from './checkout.service';
import { CurrentUser } from '../../common/current-user.decorator';
import { Roles } from '../../common/roles.decorator';

export class CreateCheckoutSessionDto {
  @IsString()
  @IsIn(['starter', 'growth'])
  plan: string;

  @IsString()
  @IsIn(['monthly', 'yearly'])
  cycle: 'monthly' | 'yearly';

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  country?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  pincode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  businessName?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[0-9A-Za-z]{15}$/, { message: 'GSTIN must be 15 characters' })
  gstin?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  address?: string;
}

export class VerifyCheckoutDto {
  @IsString()
  razorpayOrderId: string;

  @IsString()
  razorpayPaymentId: string;

  @IsString()
  razorpaySignature: string;

  @IsString()
  @IsIn(['starter', 'growth'])
  planId: string;

  @IsString()
  @IsIn(['monthly', 'yearly'])
  cycle: 'monthly' | 'yearly';
}

@Controller('checkout')
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  /**
   * Create a Razorpay order for the selected plan + billing cycle.
   * Returns everything the client needs to open Razorpay Checkout.
   */
  @Post('session')
  @Roles('OWNER')
  async createSession(
    @Body() dto: CreateCheckoutSessionDto,
    @CurrentUser() user: any,
  ) {
    return this.checkoutService.createSession(user.activeTenantId, dto.plan, dto.cycle, {
      email: dto.email,
      name: dto.name,
      country: dto.country,
      pincode: dto.pincode,
      businessName: dto.businessName,
      gstin: dto.gstin,
      address: dto.address,
    });
  }

  /**
   * Verify a Razorpay checkout result server-side and activate the
   * subscription. The frontend NEVER activates a subscription on its own.
   */
  @Post('verify')
  @Roles('OWNER')
  @HttpCode(HttpStatus.OK)
  async verifyPayment(
    @Body() dto: VerifyCheckoutDto,
    @CurrentUser() user: any,
  ) {
    return this.checkoutService.verifyPayment(user.activeTenantId, dto);
  }

  /**
   * Activate the 1-month free trial — no payment involved.
   */
  @Post('trial')
  @Roles('OWNER')
  @HttpCode(HttpStatus.OK)
  async activateTrial(@CurrentUser() user: any) {
    return this.checkoutService.activateTrial(user.activeTenantId);
  }
}
