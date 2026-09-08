import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { ClientAuthService } from './client-auth.service';
import { ClientPortalController } from './client-portal.controller';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './jwt-auth.guard';
import { EncryptionService } from '../../common/encryption.service';
import { StaffModule } from '../staff/staff.module';
import { CustomersModule } from '../customers/customers.module';

@Module({
  imports: [
    StaffModule,
    CustomersModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: process.env.JWT_SECRET || 'doloyal-jwt-secret-dev',
        signOptions: { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as any },
      }),
    }),
  ],
  controllers: [AuthController, ClientPortalController],
  providers: [AuthService, ClientAuthService, JwtStrategy, JwtAuthGuard, EncryptionService],
  exports: [AuthService, ClientAuthService, JwtModule, JwtAuthGuard, EncryptionService],
})
export class AuthModule {}
