import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Patch,
  Query,
} from '@nestjs/common';
import { IsString, IsOptional, IsIn, IsObject, IsInt, Min, MaxLength } from 'class-validator';
import { WorkflowService } from './workflow.service';
import { WorkflowValidationService } from './workflow-validation.service';
import { CurrentUser } from '../../common/current-user.decorator';

class GenerateDto {
  @IsString() @MaxLength(4000) prompt: string;
}

class EditDto {
  @IsString() @MaxLength(2000) instruction: string;
  @IsObject() @IsOptional() definition?: any;
  @IsString() @MaxLength(6000) @IsOptional() context?: string;
}

class SaveDto {
  @IsObject() definition: any;
}

class ValidateDto {
  @IsObject() @IsOptional() definition?: any;
}

class ActivateDto {
  @IsInt() @IsOptional() @Min(0) audience?: number;
}

class TestDto {
  @IsIn(['preview', 'sample', 'real']) @IsOptional() mode?: 'preview' | 'sample' | 'real';
}

class ListQueryDto {
  @IsString() @IsOptional() search?: string;
  @IsString() @IsOptional() status?: string;
  @IsString() @IsOptional() sort?: string;
  @IsIn(['all', 'COMPLETED', 'FAILED', 'QUEUED', 'RUNNING']) @IsOptional() runStatus?: string;
}

@Controller('workflows')
export class WorkflowController {
  constructor(
    private readonly workflows: WorkflowService,
    private readonly validation: WorkflowValidationService,
  ) {}

  @Get()
  list(@CurrentUser() user: any, @Query() query: ListQueryDto) {
    return this.workflows.list(user.activeTenantId, query);
  }

  @Get('templates')
  templates() {
    return this.workflows.listTemplates();
  }

  @Get('catalog')
  catalog() {
    return this.workflows.catalog();
  }

  @Get(':id')
  get(@Param('id') id: string, @CurrentUser() user: any) {
    return this.workflows.get(user.activeTenantId, id);
  }

  @Get(':id/runs')
  runs(@Param('id') id: string, @CurrentUser() user: any, @Query() query: ListQueryDto) {
    return this.workflows.listRuns(user.activeTenantId, id, { limit: 25, status: query.runStatus });
  }

  @Get(':id/analytics')
  analytics(@Param('id') id: string, @CurrentUser() user: any) {
    return this.workflows.analytics(user.activeTenantId, id);
  }

  @Get(':id/audit')
  audit(@Param('id') id: string, @CurrentUser() user: any) {
    return this.workflows.auditLogs(user.activeTenantId, id);
  }

  @Get('runs/:runId')
  getRun(@Param('runId') runId: string, @CurrentUser() user: any) {
    return this.workflows.getRun(user.activeTenantId, runId);
  }

  @Post('generate')
  @HttpCode(HttpStatus.OK)
  async generate(@Body() dto: GenerateDto, @CurrentUser() user: any) {
    const { reply, workflow } = await this.workflows.generate(user.activeTenantId, user.id, dto.prompt);
    if (!workflow) {
      return {
        workflow: null,
        message: reply.message,
        needsClarification: reply.needsClarification,
        clarification: reply.clarification,
        warnings: reply.warnings,
      };
    }
    return {
      workflow,
      message: reply.message,
      warnings: reply.warnings,
    };
  }

  @Post(':id/edit')
  @HttpCode(HttpStatus.OK)
  async edit(@Param('id') id: string, @Body() dto: EditDto, @CurrentUser() user: any) {
    const { reply, workflow } = await this.workflows.editViaAi(user.activeTenantId, user.id, id, dto.instruction, {
      definition: dto.definition,
      context: dto.context,
    });
    if (!workflow) {
      return {
        workflow: null,
        message: reply.message,
        needsClarification: reply.needsClarification,
        clarification: reply.clarification,
      };
    }
    return { workflow, message: reply.message };
  }

  @Post(':id/explain')
  @HttpCode(HttpStatus.OK)
  explain(@Param('id') id: string, @CurrentUser() user: any) {
    return this.workflows.explain(user.activeTenantId, id);
  }

  @Post(':id/validate')
  @HttpCode(HttpStatus.OK)
  async validate(@Param('id') id: string, @Body() dto: ValidateDto, @CurrentUser() user: any) {
    const workflow = await this.workflows.get(user.activeTenantId, id);
    const definition = dto.definition || workflow.definition;
    return this.validation.validate(user.activeTenantId, definition);
  }

  @Post(':id/save')
  @HttpCode(HttpStatus.OK)
  save(@Param('id') id: string, @Body() dto: SaveDto, @CurrentUser() user: any) {
    return this.workflows.save(user.activeTenantId, user.id, id, dto.definition);
  }

  @Post('templates/:templateId/use')
  @HttpCode(HttpStatus.CREATED)
  fromTemplate(@Param('templateId') templateId: string, @CurrentUser() user: any) {
    return this.workflows.createFromTemplate(user.activeTenantId, user.id, templateId);
  }

  @Post(':id/activate')
  @HttpCode(HttpStatus.OK)
  async activate(@Param('id') id: string, @Body() dto: ActivateDto, @CurrentUser() user: any) {
    const { workflow } = await this.workflows.activate(user.activeTenantId, user.id, id, dto);
    return workflow;
  }

  @Post(':id/pause')
  @HttpCode(HttpStatus.OK)
  pause(@Param('id') id: string, @CurrentUser() user: any) {
    return this.workflows.pause(user.activeTenantId, user.id, id);
  }

  @Post(':id/resume')
  @HttpCode(HttpStatus.OK)
  resume(@Param('id') id: string, @CurrentUser() user: any) {
    return this.workflows.resume(user.activeTenantId, user.id, id);
  }

  @Post(':id/duplicate')
  @HttpCode(HttpStatus.CREATED)
  duplicate(@Param('id') id: string, @CurrentUser() user: any) {
    return this.workflows.duplicate(user.activeTenantId, user.id, id);
  }

  @Post(':id/test')
  @HttpCode(HttpStatus.OK)
  async test(@Param('id') id: string, @Body() dto: TestDto, @CurrentUser() user: any) {
    const run = await this.workflows.test(user.activeTenantId, user.id, id, dto.mode || 'sample');
    const failed = run.status === 'FAILED';
    return {
      mode: dto.mode || 'sample',
      ok: !failed,
      message: failed
        ? run.error || 'Workflow test failed.'
        : `Test run ${run.status.toLowerCase()}. ${run.steps.length} step(s) executed successfully.`,
      steps: run.steps.map((s) => ({ nodeKey: s.nodeKey, status: s.status, output: s.output })),
    };
  }

  @Post('runs/:runId/retry')
  @HttpCode(HttpStatus.OK)
  retryRun(@Param('runId') runId: string, @CurrentUser() user: any) {
    return this.workflows.retryRun(user.activeTenantId, user.id, runId);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  patch(@Param('id') id: string, @Body() dto: SaveDto, @CurrentUser() user: any) {
    return this.workflows.save(user.activeTenantId, user.id, id, dto.definition);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  archive(@Param('id') id: string, @CurrentUser() user: any) {
    return this.workflows.archive(user.activeTenantId, user.id, id);
  }
}
