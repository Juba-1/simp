import {
  Injectable,
  Logger,
  OnModuleInit,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

@Injectable()
export class SupabaseStorageService implements OnModuleInit {
  private readonly logger = new Logger(SupabaseStorageService.name);
  private client: SupabaseClient | null = null;
  private bucket = 'avatars';

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const url = this.configService.get<string>('app.supabaseUrl');
    const serviceKey = this.configService.get<string>(
      'app.supabaseServiceRoleKey',
    );
    this.bucket =
      this.configService.get<string>('app.supabaseAvatarsBucket') ?? 'avatars';

    if (!url || !serviceKey) {
      this.logger.warn(
        'SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set — avatar uploads disabled',
      );
      return;
    }

    this.client = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    try {
      await this.ensureBucket();
    } catch (err) {
      this.logger.error('Failed to initialize Supabase avatars bucket', err);
    }
  }

  isConfigured(): boolean {
    return this.client !== null;
  }

  async uploadAvatar(
    userId: string,
    buffer: Buffer,
    mimeType: string,
  ): Promise<string> {
    if (!this.client) {
      throw new BadRequestException(
        'Avatar storage is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
      );
    }

    const ext = mimeType.includes('png')
      ? 'png'
      : mimeType.includes('webp')
        ? 'webp'
        : 'jpg';
    const objectPath = `${userId}/${randomUUID()}.${ext}`;

    const { error } = await this.client.storage
      .from(this.bucket)
      .upload(objectPath, buffer, {
        contentType: mimeType,
        upsert: false,
        cacheControl: '3600',
      });

    if (error) {
      throw new BadRequestException(`Avatar upload failed: ${error.message}`);
    }

    const { data } = this.client.storage
      .from(this.bucket)
      .getPublicUrl(objectPath);

    return data.publicUrl;
  }

  private async ensureBucket(): Promise<void> {
    if (!this.client) return;

    const { data: buckets, error: listError } =
      await this.client.storage.listBuckets();

    if (listError) {
      throw listError;
    }

    if (buckets?.some((b) => b.name === this.bucket)) {
      return;
    }

    const { error: createError } = await this.client.storage.createBucket(
      this.bucket,
      { public: true, fileSizeLimit: 5 * 1024 * 1024 },
    );

    if (createError && !createError.message.includes('already exists')) {
      throw createError;
    }
  }
}
