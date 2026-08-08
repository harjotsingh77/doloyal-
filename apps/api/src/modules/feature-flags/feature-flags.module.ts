import { Module, Global, forwardRef } from '@nestjs/common';
import { FeatureFlagsService } from './feature-flags.service';
import { FeatureFlagsController } from './feature-flags.controller';
import { FeatureFlagGuard } from '../../common/feature-flag.guard';
import { LoyaltyModule } from '../loyalty/loyalty.module';

@Global()
@Module({
  imports: [forwardRef(() => LoyaltyModule)],
  controllers: [FeatureFlagsController],
  providers: [FeatureFlagsService, FeatureFlagGuard],
  exports: [FeatureFlagsService, FeatureFlagGuard],
})
export class FeatureFlagsModule {}
