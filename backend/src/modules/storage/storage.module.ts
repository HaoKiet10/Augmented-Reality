import { Module } from '@nestjs/common';
import { StorageService } from './storage.service';

// Tách StorageService ra module riêng để cả project (asset) lẫn user (avatar)
// dùng chung 1 Supabase client, thay vì mỗi module tự new 1 instance.
@Module({
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
