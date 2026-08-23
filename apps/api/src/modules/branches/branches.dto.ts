import { IsString, IsOptional, IsNotEmpty } from 'class-validator';

export class CreateBranchDto {
  @IsString() @IsNotEmpty() name: string;
  @IsString() @IsOptional() phone?: string;
  @IsString() @IsOptional() address?: string;
  @IsString() @IsOptional() city?: string;
}

export class UpdateBranchDto {
  @IsString() @IsOptional() name?: string;
  @IsString() @IsOptional() phone?: string;
  @IsString() @IsOptional() address?: string;
  @IsString() @IsOptional() city?: string;
}
