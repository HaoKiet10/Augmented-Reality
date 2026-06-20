"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const storage_service_1 = require("./storage.service");
const MAX_LIMIT = 5 * 1024 * 1024; // 5MB in bytes
/**
 * Sinh transform mặc định cho asset mới, lệch nhẹ ngẫu nhiên trên trục X/Z
 * để các asset không bị chồng lên nhau khi cùng active trong scene.
 */
function generateDefaultTransform() {
    const jitter = () => Math.round((Math.random() - 0.5) * 1.0 * 100) / 100; // ±0.5m, 2 chữ số
    return {
        position: { x: jitter(), y: 0.8, z: -2 + jitter() },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
    };
}
let ProjectService = class ProjectService {
    constructor(prisma, storageService) {
        this.prisma = prisma;
        this.storageService = storageService;
    }
    async findAll(designerId) {
        return this.prisma.project.findMany({
            where: { designerId },
            orderBy: { lastOpenedAt: 'desc' },
        });
    }
    async findOne(id, designerId) {
        const project = await this.prisma.project.findFirst({
            where: { id, designerId },
            include: {
                assets: true,
            },
        });
        if (!project) {
            throw new common_1.NotFoundException(`Project with ID ${id} not found`);
        }
        return project;
    }
    async create(designerId, name) {
        return this.prisma.project.create({
            data: {
                name,
                description: 'Interact with target images and 3D overlays in real-time.',
                status: 'draft',
                designerId,
            },
        });
    }
    async update(id, designerId, data) {
        await this.findOne(id, designerId);
        return this.prisma.project.update({
            where: { id },
            data,
        });
    }
    async delete(id, designerId) {
        const project = await this.findOne(id, designerId);
        // Clean up all associated assets from storage first
        for (const asset of project.assets) {
            try {
                await this.storageService.deleteFile(asset.storageKey);
            }
            catch (err) {
                console.error(`Failed to delete asset ${asset.id} file:`, err);
            }
        }
        // Delete assets metadata
        await this.prisma.asset.deleteMany({
            where: { projectId: id },
        });
        return this.prisma.project.delete({
            where: { id },
        });
    }
    // --- ASSET MANAGEMENT ---
    async getAssets(projectId, designerId) {
        await this.findOne(projectId, designerId); // Verify access
        return this.prisma.asset.findMany({
            where: { projectId },
            orderBy: { createdAt: 'desc' },
        });
    }
    async addAsset(projectId, designerId, file) {
        await this.findOne(projectId, designerId); // Verify access
        // 1. Calculate current project size
        const assets = await this.prisma.asset.findMany({
            where: { projectId },
            select: { fileSize: true },
        });
        const currentTotalSize = assets.reduce((sum, asset) => sum + asset.fileSize, 0);
        const newFileSize = file.size;
        if (currentTotalSize + newFileSize > MAX_LIMIT) {
            throw new common_1.BadRequestException(`Project asset limit exceeded. Maximum 5MB allowed per project. (Current: ${(currentTotalSize / (1024 * 1024)).toFixed(2)}MB, New file: ${(newFileSize / (1024 * 1024)).toFixed(2)}MB)`);
        }
        // 2. Upload file
        const { url, storageKey } = await this.storageService.uploadFile(file, projectId);
        // 3. Create db record với transform mặc định (lệch nhẹ ngẫu nhiên)
        const asset = await this.prisma.asset.create({
            data: {
                filename: file.originalname,
                fileType: file.mimetype,
                fileSize: file.size,
                storageKey,
                url,
                transform: generateDefaultTransform(),
                projectId,
                uploadedBy: designerId,
            },
        });
        // 4. Update lastOpenedAt on the project
        await this.prisma.project.update({
            where: { id: projectId },
            data: { lastOpenedAt: new Date() },
        });
        return asset;
    }
    async deleteAsset(projectId, assetId, designerId) {
        await this.findOne(projectId, designerId); // Verify access
        const asset = await this.prisma.asset.findFirst({
            where: { id: assetId, projectId },
        });
        if (!asset) {
            throw new common_1.NotFoundException(`Asset not found in this project`);
        }
        // Delete physical file
        await this.storageService.deleteFile(asset.storageKey);
        // Delete DB record
        await this.prisma.asset.delete({
            where: { id: assetId },
        });
        // Update lastOpenedAt on the project
        await this.prisma.project.update({
            where: { id: projectId },
            data: { lastOpenedAt: new Date() },
        });
        return { success: true };
    }
    /** Cập nhật transform (position/rotation/scale) cho 1 asset cụ thể */
    async updateAssetTransform(projectId, assetId, designerId, transform) {
        await this.findOne(projectId, designerId); // Verify access
        const asset = await this.prisma.asset.findFirst({
            where: { id: assetId, projectId },
        });
        if (!asset) {
            throw new common_1.NotFoundException(`Asset not found in this project`);
        }
        return this.prisma.asset.update({
            where: { id: assetId },
            data: { transform: transform },
        });
    }
};
exports.ProjectService = ProjectService;
exports.ProjectService = ProjectService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        storage_service_1.StorageService])
], ProjectService);
