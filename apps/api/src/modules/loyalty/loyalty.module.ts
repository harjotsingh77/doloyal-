import { Module } from '@nestjs/common';
import { LoyaltyService } from './loyalty.service';
import { LoyaltyController } from './loyalty.controller';
import { LoyaltyModulesService } from './loyalty-modules.service';
import { WorkflowsModule } from '../workflows/workflow.module';

@Module({
  imports: [WorkflowsModule],
  controllers: [LoyaltyController],
  providers: [LoyaltyService, LoyaltyModulesService],
  exports: [LoyaltyService, LoyaltyModulesService],
})
export class LoyaltyModule {}
