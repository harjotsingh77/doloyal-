import { Controller, Get, Post, Patch, Param, Body } from '@nestjs/common';
import { CampaignsService } from './campaigns.service';
import { CampaignAiService } from './campaign-ai.service';
import { CurrentUser } from '../../common/current-user.decorator';
import { Roles } from '../../common/roles.decorator';
import { IsString, IsNotEmpty, IsOptional, IsIn, MaxLength } from 'class-validator';

class CreateCampaignDto {
  @IsString() @IsNotEmpty() @MaxLength(200) name: string;
  @IsString() @IsOptional() @MaxLength(300) subject?: string;
  @IsString() @IsNotEmpty() @MaxLength(10000) body: string;
  @IsIn(['EMAIL', 'SMS', 'WHATSAPP']) channel: 'EMAIL' | 'SMS' | 'WHATSAPP';
  @IsIn(['All', 'VIP', 'At Risk', 'Inactive']) @IsOptional() audience?: 'All' | 'VIP' | 'At Risk' | 'Inactive';
  @IsString() @IsOptional() scheduleDate?: string;
}

class DraftCampaignDto {
  @IsString() @IsNotEmpty() @MaxLength(600) goal: string;
  @IsIn(['EMAIL', 'WHATSAPP']) channel: 'EMAIL' | 'WHATSAPP';
  @IsIn(['All', 'VIP', 'At Risk', 'Inactive']) @IsOptional() audience?: 'All' | 'VIP' | 'At Risk' | 'Inactive';
}

class SetStatusDto {
  @IsIn(['DRAFT', 'SCHEDULED', 'PAUSED']) status: string;
}

@Controller('campaigns')
export class CampaignsController {
  constructor(
    private readonly campaigns: CampaignsService,
    private readonly campaignAi: CampaignAiService,
  ) {}

  @Get()
  list(@CurrentUser() user: any) {
    return this.campaigns.list(user.activeTenantId);
  }

  @Roles('OWNER', 'MANAGER')
  @Post()
  create(@Body() dto: CreateCampaignDto, @CurrentUser() user: any) {
    return this.campaigns.create(user.activeTenantId, {
      name: dto.name,
      subject: dto.subject,
      body: dto.body,
      channel: dto.channel,
      audience: dto.audience,
      scheduleDate: dto.scheduleDate,
    });
  }

  /** Draft the name, subject and message with AI. Nothing is saved or sent. */
  @Roles('OWNER', 'MANAGER')
  @Post('ai-draft')
  draft(@Body() dto: DraftCampaignDto, @CurrentUser() user: any) {
    return this.campaignAi.draft(user.activeTenantId, {
      goal: dto.goal,
      channel: dto.channel,
      audience: dto.audience,
    });
  }

  @Roles('OWNER', 'MANAGER')
  @Patch(':id/status')
  setStatus(@Param('id') id: string, @Body() dto: SetStatusDto, @CurrentUser() user: any) {
    return this.campaigns.setStatus(user.activeTenantId, id, dto.status);
  }

  @Roles('OWNER', 'MANAGER')
  @Post(':id/send')
  send(@Param('id') id: string, @CurrentUser() user: any) {
    return this.campaigns.send(user.activeTenantId, id);
  }
}