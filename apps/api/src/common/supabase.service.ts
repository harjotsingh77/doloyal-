import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private readonly logger = new Logger(SupabaseService.name);
  private client: SupabaseClient | null = null;
  private adminClient: SupabaseClient | null = null;

  constructor(private configService: ConfigService) {
    this.initClients();
  }

  private initClients() {
    const url = this.configService?.get<string>('NEXT_PUBLIC_SUPABASE_URL') || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = this.configService?.get<string>('NEXT_PUBLIC_SUPABASE_ANON_KEY') || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceRoleKey = this.configService?.get<string>('SUPABASE_SERVICE_ROLE_KEY') || process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (url && anonKey) {
      this.client = createClient(url, anonKey);
      this.logger.log('Supabase standard client initialized.');
    } else {
      this.logger.warn('NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY missing. Client not initialized.');
    }

    if (url && serviceRoleKey) {
      this.adminClient = createClient(url, serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });
      this.logger.log('Supabase admin service client initialized.');
    }
  }

  public getClient(): SupabaseClient | null {
    return this.client;
  }

  public getAdminClient(): SupabaseClient | null {
    return this.adminClient;
  }

  public isConfigured(): boolean {
    return this.client !== null;
  }
}
