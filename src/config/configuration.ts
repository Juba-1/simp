import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  jwtSecret: process.env.JWT_SECRET ?? 'dev-secret-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  uploadDir: process.env.UPLOAD_DIR ?? 'uploads',
  maxUploadSizeMb: parseInt(process.env.MAX_UPLOAD_SIZE_MB ?? '5', 10),
  timeSpoofingThresholdMs: parseInt(
    process.env.TIME_SPOOFING_THRESHOLD_MS ?? '300000',
    10,
  ),
  externalSlaHours: parseInt(process.env.EXTERNAL_SLA_HOURS ?? '48', 10),
  slaCronExpression: process.env.SLA_CRON_EXPRESSION ?? '0 * * * *',
  supabaseUrl: process.env.SUPABASE_URL ?? '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  supabaseAvatarsBucket: process.env.SUPABASE_AVATARS_BUCKET ?? 'avatars',
  storageProvider: process.env.STORAGE_PROVIDER ?? 'local',
  supabaseUploadsBucket: process.env.SUPABASE_UPLOADS_BUCKET ?? 'uploads',
}));
