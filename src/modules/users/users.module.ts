import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { SupabaseStorageService } from './supabase-storage.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService, SupabaseStorageService],
  exports: [UsersService],
})
export class UsersModule {}
