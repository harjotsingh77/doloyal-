import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AdminGuard, AdminPermission } from '../../common/admin.guard';
import { AdminAiService } from './admin-ai.service';

@Controller('admin/ai')
@UseGuards(AdminGuard)
export class AdminAiController {
  constructor(private readonly ai: AdminAiService) {}

  @Get('overview')
  @AdminPermission('ai:view')
  overview(@Query('range') range?: string) {
    return this.ai.overview(range);
  }
}