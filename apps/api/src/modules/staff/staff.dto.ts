import {
  IsString,
  IsOptional,
  IsArray,
  IsEmail,
  IsBoolean,
  IsIn,
  IsInt,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { STAFF_STATUSES, INVITATION_STATUSES } from '@doloyal/shared';

const STAFF_ROLES = ['OWNER', 'MANAGER', 'RECEPTIONIST', 'STAFF'] as const;

export class ListStaffQuery {
  @IsString()
  @IsOptional()
  search?: string;

  @IsString()
  @IsOptional()
  role?: string;

  @IsString()
  @IsOptional()
  branchId?: string;

  @IsIn(STAFF_STATUSES as unknown as string[])
  @IsOptional()
  status?: string;

  @IsIn(INVITATION_STATUSES as unknown as string[])
  @IsOptional()
  invitationStatus?: string;

  @IsIn(['true', 'false'])
  @IsOptional()
  online?: string;

  @IsString()
  @IsOptional()
  dateJoinedFrom?: string;

  @IsString()
  @IsOptional()
  dateJoinedTo?: string;

  @IsString()
  @IsOptional()
  lastLoginFrom?: string;

  @IsString()
  @IsOptional()
  lastLoginTo?: string;

  @IsString()
  @IsOptional()
  sortBy?: string;

  @IsIn(['asc', 'desc'])
  @IsOptional()
  sortDir?: 'asc' | 'desc';

  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @IsInt()
  @Min(1)
  @Max(200)
  @IsOptional()
  pageSize?: number;
}

export class ListInvitationsQuery {
  @IsIn([...INVITATION_STATUSES, 'ALL'] as unknown as string[])
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  search?: string;

  @IsIn(STAFF_ROLES as unknown as string[])
  @IsOptional()
  role?: string;

  @IsString()
  @IsOptional()
  dateFrom?: string;

  @IsString()
  @IsOptional()
  dateTo?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @IsInt()
  @Min(1)
  @Max(200)
  @IsOptional()
  pageSize?: number;
}

export class InviteMemberDto {
  @IsString()
  @MaxLength(60)
  @IsOptional()
  firstName?: string;

  @IsString()
  @MaxLength(60)
  @IsOptional()
  lastName?: string;

  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @MaxLength(40)
  @IsOptional()
  phone?: string;

  @IsIn(STAFF_ROLES as unknown as string[])
  role!: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  branchIds?: string[];

  @IsString()
  @MaxLength(80)
  @IsOptional()
  department?: string;

  @IsString()
  @MaxLength(120)
  @IsOptional()
  jobTitle?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  permissions?: string[];

  @IsString()
  @MaxLength(2000)
  @IsOptional()
  notes?: string;

  @IsString()
  @MaxLength(1000)
  @IsOptional()
  message?: string;

  @IsBoolean()
  @IsOptional()
  sendWelcomeEmail?: boolean;

  @IsBoolean()
  @IsOptional()
  requirePasswordReset?: boolean;

  @IsBoolean()
  @IsOptional()
  twoFactorRequired?: boolean;

  @IsBoolean()
  @IsOptional()
  saveDraft?: boolean;
}

export class UpdateStaffDto {
  @IsString()
  @MaxLength(60)
  @IsOptional()
  firstName?: string;

  @IsString()
  @MaxLength(60)
  @IsOptional()
  lastName?: string;

  @IsString()
  @MaxLength(40)
  @IsOptional()
  phone?: string | null;

  @IsString()
  @MaxLength(80)
  @IsOptional()
  department?: string | null;

  @IsString()
  @MaxLength(120)
  @IsOptional()
  jobTitle?: string | null;

  @IsIn(STAFF_ROLES as unknown as string[])
  @IsOptional()
  role?: string;

  @IsIn(STAFF_STATUSES as unknown as string[])
  @IsOptional()
  status?: string;

  @IsString()
  @MaxLength(2000)
  @IsOptional()
  notes?: string | null;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  permissions?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  branchIds?: string[];

  @IsBoolean()
  @IsOptional()
  requirePasswordReset?: boolean;

  @IsBoolean()
  @IsOptional()
  twoFactorRequired?: boolean;
}

export class SetTwoFactorDto {
  @IsIn(['REQUIRE', 'DISABLE', 'RESET'])
  action!: 'REQUIRE' | 'DISABLE' | 'RESET';
}

export class NoteDto {
  @IsString()
  @MaxLength(2000)
  body!: string;

  @IsString()
  @MaxLength(40)
  @IsOptional()
  category?: string;
}

export class BulkActionDto {
  @IsArray()
  @IsString({ each: true })
  ids!: string[];

  @IsIn([
    'DELETE',
    'DEACTIVATE',
    'ACTIVATE',
    'SUSPEND',
    'ASSIGN_BRANCH',
    'CHANGE_ROLE',
    'RESEND_INVITATION',
    'ENABLE_2FA',
    'DISABLE_2FA',
  ])
  action!: string;

  @IsString()
  @IsOptional()
  branchId?: string;

  @IsIn(STAFF_ROLES as unknown as string[])
  @IsOptional()
  role?: string;
}

export class AcceptInvitationDto {
  @IsString()
  @MaxLength(72)
  @IsOptional()
  password?: string;

  @IsString()
  @IsOptional()
  userId?: string;

  @IsString()
  @MaxLength(60)
  @IsOptional()
  firstName?: string;

  @IsString()
  @MaxLength(60)
  @IsOptional()
  lastName?: string;

  @IsString()
  @MaxLength(40)
  @IsOptional()
  phone?: string;
}
