import { Injectable, Logger } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private supabase: SupabaseClient | null = null;
  private readonly localUploadDir = path.join(process.cwd(), 'uploads');

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey) {
      try {
        this.supabase = createClient(supabaseUrl, supabaseKey, {
          auth: {
            persistSession: false,
          },
        });
        this.logger.log('Supabase Storage client initialized successfully.');
      } catch (err) {
        this.logger.error('Failed to initialize Supabase client:', err);
      }
    } else {
      this.logger.warn('Supabase credentials not found in env. Falling back to local filesystem storage.');
    }

    // Ensure local upload directory exists
    if (!fs.existsSync(this.localUploadDir)) {
      fs.mkdirSync(this.localUploadDir, { recursive: true });
    }
  }

  async uploadFile(
    file: Express.Multer.File,
    projectId: string
  ): Promise<{ url: string; storageKey: string }> {
    const fileExt = path.extname(file.originalname);
    const uniqueFilename = `${projectId}-${Date.now()}${fileExt}`;
    const storageKey = `assets/${projectId}/${uniqueFilename}`;

    if (this.supabase) {
      try {
        const { data, error } = await this.supabase.storage
          .from('assets')
          .upload(storageKey, file.buffer, {
            contentType: file.mimetype,
            upsert: true,
          });

        if (error) {
          this.logger.error(`Supabase upload error: ${error.message}. Falling back to local storage.`);
        } else if (data) {
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
      }
    }

    // Local Storage Fallback
    const localFilePath = path.join(this.localUploadDir, uniqueFilename);
    fs.writeFileSync(localFilePath, file.buffer);
    
    // We assume the NestJS server is serving static files or there is a controller route.
    // The public URL will point to /projects/uploads/:filename
    const baseUrl = process.env.API_URL || 'http://localhost:3000';
    const localUrl = `${baseUrl}/projects/uploads/${uniqueFilename}`;

    return {
      url: localUrl,
      storageKey: `local/${uniqueFilename}`,
    };
  }

  async deleteFile(storageKey: string): Promise<void> {
    if (storageKey.startsWith('local/')) {
      const filename = storageKey.replace('local/', '');
      const localFilePath = path.join(this.localUploadDir, filename);
      if (fs.existsSync(localFilePath)) {
        fs.unlinkSync(localFilePath);
      }
      return;
    }

    if (this.supabase) {
      try {
        await this.supabase.storage.from('assets').remove([storageKey]);
      } catch (err) {
        this.logger.error(`Failed to delete file from Supabase storage (${storageKey}):`, err);
      }
    }
  }

  getLocalFilePath(filename: string): string {
    return path.join(this.localUploadDir, filename);
  }
}
