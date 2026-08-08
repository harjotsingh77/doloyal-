import { Controller, Get, Patch, Delete, Param, Body } from '@nestjs/common';
import { UsersService } from './users.service';
import { CurrentUser } from '../../common/current-user.decorator';
import { Roles } from '../../common/roles.decorator';
import { IsString, IsNotEmpty } from 'class-validator';

class UpdateRoleDto {
  @IsString()
  @IsNotEmpty()
  role: string;
}

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('members')
  @Roles('OWNER', 'MANAGER')
  async getMembers(@CurrentUser() user: any) {
    return this.usersService.getMembers(user.activeTenantId);
  }

  @Patch('members/:id/role')
  @Roles('OWNER')
  async updateRole(
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
    @CurrentUser() user: any,
  ) {
    return this.usersService.updateMemberRole(user.activeTenantId, id, dto.role);
  }

  @Delete('members/:id')
  @Roles('OWNER')
  async removeMember(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.usersService.removeMember(user.activeTenantId, id);
  }
}
