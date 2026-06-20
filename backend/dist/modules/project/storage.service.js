"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var StorageService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageService = void 0;
const common_1 = require("@nestjs/common");
const supabase_js_1 = require("@supabase/supabase-js");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
let StorageService = StorageService_1 = class StorageService {
    constructor() {
        this.logger = new common_1.Logger(StorageService_1.name);
        this.supabase = null;
        this.localUploadDir = path.join(process.cwd(), 'uploads');
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
        if (supabaseUrl && supabaseKey) {
            try {
                this.supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey, {
                    auth: {
                        persistSession: false,
                    },
                });
                this.logger.log('Supabase Storage client initialized successfully.');
            }
            catch (err) {
                this.logger.error('Failed to initialize Supabase client:', err);
            }
        }
        else {
            this.logger.warn('Supabase credentials not found in env. Falling back to local filesystem storage.');
        }
        // Ensure local upload directory exists
        if (!fs.existsSync(this.localUploadDir)) {
            fs.mkdirSync(this.localUploadDir, { recursive: true });
        }
    }
    async uploadFile(file, projectId) {
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
                }
                else if (data) {
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
            }
            catch (err) {
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
    async deleteFile(storageKey) {
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
            }
            catch (err) {
                this.logger.error(`Failed to delete file from Supabase storage (${storageKey}):`, err);
            }
        }
    }
    getLocalFilePath(filename) {
        return path.join(this.localUploadDir, filename);
    }
};
exports.StorageService = StorageService;
exports.StorageService = StorageService = StorageService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], StorageService);
