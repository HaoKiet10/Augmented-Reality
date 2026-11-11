import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as path from 'path';
import WebSocket from 'ws';
import { avatarKeyFromUrl } from './avatar-url';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private supabase: SupabaseClient;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // Cố tình KHÔNG fallback sang SUPABASE_ANON_KEY: ghi/xoá file trong bucket
    // "assets" cần quyền service_role. Nếu thiếu biến này, phải fail cứng ngay
    // lúc app khởi động (Render sẽ báo đỏ deploy), thay vì âm thầm chạy bằng
    // anon key rồi lỗi khó hiểu (hoặc tệ hơn, "thành công" với quyền sai) khi
    // có request upload/xoá thật.
    if (!supabaseUrl) {
      throw new Error(
        'Missing SUPABASE_URL. StorageService requires the service_role key (not the anon key) to upload/delete files in the "assets" bucket.'
      );
    }
    if (!supabaseKey) {
      throw new Error(
        'Missing SUPABASE_SERVICE_ROLE_KEY. StorageService requires the service_role key (not the anon key) to upload/delete files in the "assets" bucket.'
      );
    }

    this.supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
      },
      // Node < 22 chưa có global WebSocket, mà supabase-js khởi tạo Realtime client
      // ngay khi createClient() chạy -> phải tự cấp transport qua package `ws`,
      // nếu không constructor sẽ throw ngay tại đây (đúng ý muốn: fail sớm).
      realtime: {
        transport: WebSocket as any,
      },
    });
    this.logger.log('Supabase Storage client initialized successfully.');
  }

  async uploadFile(
    file: Express.Multer.File,
    projectId: string
  ): Promise<{ url: string; storageKey: string }> {
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

  /** Upload bytes do server tự sinh ra (vd: database nhận diện .imgdb) vào đúng storageKey cho trước. */
  async uploadBuffer(storageKey: string, buffer: Buffer, contentType: string): Promise<string> {
    const { error } = await this.supabase.storage
      .from('assets')
      .upload(storageKey, buffer, { contentType, upsert: true });

    if (error) {
      throw new Error(`Supabase upload error (${storageKey}): ${error.message}`);
    }

    const { data: urlData } = this.supabase.storage.from('assets').getPublicUrl(storageKey);
    if (!urlData?.publicUrl) {
      throw new Error(`Failed to generate public URL for ${storageKey}`);
    }
    return urlData.publicUrl;
  }

  /** Bucket riêng cho avatar: public read, giới hạn size/mime đặt ở chính bucket trên Supabase. */
  private get avatarBucket(): string {
    return process.env.SUPABASE_AVATAR_BUCKET || 'avatars';
  }

  /** Upload avatar vào `<userId>/<timestamp><ext>` trong bucket avatar, trả về public URL. */
  async uploadAvatar(userId: string, file: Express.Multer.File): Promise<string> {
    const storageKey = `${userId}/${Date.now()}${path.extname(file.originalname).toLowerCase()}`;
    const { error } = await this.supabase.storage
      .from(this.avatarBucket)
      .upload(storageKey, file.buffer, { contentType: file.mimetype, upsert: false });

    if (error) {
      this.logger.error(`Supabase avatar upload error: ${error.message}`);
      throw new BadRequestException(`Avatar upload failed: ${error.message}`);
    }

    const { data: urlData } = this.supabase.storage.from(this.avatarBucket).getPublicUrl(storageKey);
    if (!urlData?.publicUrl) {
      throw new BadRequestException('Failed to generate public URL for avatar');
    }
    return urlData.publicUrl;
  }

  /** storageKey nếu URL là avatar do mình upload, null với ảnh Google/URL lạ. */
  avatarKeyFromUrl(url: string | null | undefined): string | null {
    return avatarKeyFromUrl(url, process.env.SUPABASE_URL!, this.avatarBucket);
  }

  /** Xoá file avatar cũ. Lỗi chỉ log — avatar mới đã lưu xong, file mồ côi không đáng làm fail request. */
  async deleteAvatar(storageKey: string): Promise<void> {
    const { error } = await this.supabase.storage.from(this.avatarBucket).remove([storageKey]);
    if (error) {
      this.logger.error(`Failed to delete old avatar (${storageKey}): ${error.message}`);
    }
  }

  async deleteFile(storageKey: string): Promise<void> {
    try {
      await this.supabase.storage.from('assets').remove([storageKey]);
    } catch (err) {
      this.logger.error(`Failed to delete file from Supabase storage (${storageKey}):`, err);
    }
  }
}