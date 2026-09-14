import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as path from 'path';
import WebSocket from 'ws';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private supabase: SupabaseClient | null = null;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey) {
      try {
        this.supabase = createClient(supabaseUrl, supabaseKey, {
          auth: {
            persistSession: false,
          },
          // Node < 22 chưa có global WebSocket, mà supabase-js khởi tạo Realtime client
          // ngay khi createClient() chạy -> phải tự cấp transport qua package `ws`,
          // nếu không constructor sẽ throw và toàn bộ Storage bị vô hiệu (this.supabase = null).
          realtime: {
            transport: WebSocket as any,
          },
        });
        this.logger.log('Supabase Storage client initialized successfully.');
      } catch (err) {
        this.logger.error('Failed to initialize Supabase client:', err);
      }
    } else {
      this.logger.warn('Supabase credentials not found in env.');
    }
  }

  async uploadFile(
    file: Express.Multer.File,
    projectId: string
  ): Promise<{ url: string; storageKey: string }> {
    if (!this.supabase) {
      throw new BadRequestException('Supabase Storage is not configured. Please check environment variables.');
    }

    const fileExt = path.extname(file.originalname);
    const uniqueFilename = `${projectId}-${Date.now()}${fileExt}`;
    const storageKey = `assets/${projectId}/${uniqueFilename}`;

    try {
      const { data, error } = await this.supabase.storage
        .from('assets')
        .upload(storageKey, file.buffer, {
          contentType: file.mimetype,
          upsert: true,
        });

      if (error) {
        this.logger.error(`Supabase upload error: ${error.message}`);
        throw new BadRequestException(`Upload failed: ${error.message}`);
      }

      if (data) {
        const { data: urlData } = this.supabase.storage
          .from('assets')
          .getPublicUrl(storageKey);

        if (urlData?.publicUrl) {
          return {
            url: urlData.publicUrl,
            storageKey,
          };
        }
      }
    } catch (err) {
      this.logger.error('Error during Supabase upload:', err);
      if (err instanceof BadRequestException) throw err;
      throw new BadRequestException('Failed to upload file to Supabase Storage');
    }

    throw new BadRequestException('Failed to generate public URL for uploaded file');
  }

  /**
   * Copy 1 file đã có trong bucket sang 1 storageKey mới (dùng cho tính năng
   * duplicate asset) — copy ở phía server của Supabase, không cần tải bytes
   * về rồi upload lại, nên nhanh và không tốn băng thông app server.
   */
  async copyFile(
    sourceStorageKey: string,
    projectId: string,
    originalFilename: string
  ): Promise<{ url: string; storageKey: string }> {
    if (!this.supabase) {
      throw new BadRequestException('Supabase Storage is not configured. Please check environment variables.');
    }

    const fileExt = path.extname(originalFilename);
    const uniqueFilename = `${projectId}-${Date.now()}-copy${fileExt}`;
    const destStorageKey = `assets/${projectId}/${uniqueFilename}`;

    const { error } = await this.supabase.storage
      .from('assets')
      .copy(sourceStorageKey, destStorageKey);

    if (error) {
      this.logger.error(`Supabase copy error: ${error.message}`);
      throw new BadRequestException(`Duplicate failed: ${error.message}`);
    }

    const { data: urlData } = this.supabase.storage
      .from('assets')
      .getPublicUrl(destStorageKey);

    if (!urlData?.publicUrl) {
      throw new BadRequestException('Failed to generate public URL for duplicated file');
    }

    return { url: urlData.publicUrl, storageKey: destStorageKey };
  }

  async deleteFile(storageKey: string): Promise<void> {
    if (!this.supabase) {
      this.logger.warn('Supabase is not configured. Skipping delete.');
      return;
    }

    try {
      await this.supabase.storage.from('assets').remove([storageKey]);
    } catch (err) {
      this.logger.error(`Failed to delete file from Supabase storage (${storageKey}):`, err);
    }
  }
}