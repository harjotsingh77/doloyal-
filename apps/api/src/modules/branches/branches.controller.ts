import { Controller, Get, Post, Patch, Delete, Param, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { BranchesService } from './branches.service';
import { CreateBranchDto, UpdateBranchDto } from './branches.dto';
import { CurrentUser } from '../../common/current-user.decorator';
import { Roles } from '../../common/roles.decorator';

@Controller()
export class BranchesController {
  constructor(private readonly branches: BranchesService) {}

  @Get('branches')
  list(@CurrentUser() user: any) {
    return this.branches.list(user.activeTenantId);
  }

  @Get('branches/:id')
  async get(@Param('id') id: string, @CurrentUser() user: any) {
    return this.branches.getStats(user.activeTenantId, id);
  }

  @Post('branches')
  @Roles('OWNER', 'MANAGER')
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateBranchDto, @CurrentUser() user: any) {
    return this.branches.create(user.activeTenantId, dto);
  }

  @Patch('branches/:id')
  @Roles('OWNER', 'MANAGER')
  update(@Param('id') id: string, @Body() dto: UpdateBranchDto, @CurrentUser() user: any) {
    return this.branches.update(user.activeTenantId, id, dto);
  }

  @Delete('branches/:id')
  @Roles('OWNER')
  @HttpCode(HttpStatus.OK)
  delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.branches.delete(user.activeTenantId, id);
  }
}
