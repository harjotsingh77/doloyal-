import { Module, forwardRef } from '@nestjs/common';
import { LoyaltyService } from './loyalty.service';
import { LoyaltyController } from './loyalty.controller';
import { LoyaltyModulesService } from './loyalty-modules.service';

@Module({
  controllers: [LoyaltyController],
  providers: [LoyaltyService, LoyaltyModulesService],
  exports: [LoyaltyService, LoyaltyModulesService],
})
export class LoyaltyModule {}
