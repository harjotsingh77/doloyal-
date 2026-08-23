import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { IntegrationsController } from './integrations.controller';
import { IntegrationsService } from './integrations.service';
import { GoogleCalendarIntegrationService } from './services/google-calendar.service';
import { ResendIntegrationService } from './services/resend.service';
import { EmailService } from './services/email.service';
import { StripeIntegrationService } from './services/stripe.service';
import { RazorpayIntegrationService } from './services/razorpay.service';
import { EncryptionService } from '../../common/encryption.service';

@Module({
  imports: [JwtModule],
  controllers: [IntegrationsController],
  providers: [
    IntegrationsService,
    GoogleCalendarIntegrationService,
    ResendIntegrationService,
    EmailService,
    StripeIntegrationService,
    RazorpayIntegrationService,
    EncryptionService,
  ],
  exports: [
    IntegrationsService,
    GoogleCalendarIntegrationService,
    ResendIntegrationService,
    EmailService,
    StripeIntegrationService,
    RazorpayIntegrationService,
  ],
})
export class IntegrationsModule {}
