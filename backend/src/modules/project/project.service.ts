import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from './storage.service';

const MAX_LIMIT = 5 * 1024 * 1024; // 5MB in bytes

interface SpatialVector {
  x: number;
  y: number;
  z: number;
}

interface AssetTransform {
  position: SpatialVector;
  rotation: SpatialVector;
  scale: SpatialVector;
}

/**
 * Sinh transform mặc định cho asset mới, lệch nhẹ ngẫu nhiên trên trục X/Z
 * để các asset không bị chồng lên nhau khi cùng active trong scene.
 */
function generateDefaultTransform(): AssetTransform {
  const jitter = () => Math.round((Math.random() - 0.5) * 1.0 * 100) / 100; // ±0.5m, 2 chữ số

  return {
    position: { x: jitter(), y: 0.8, z: -2 + jitter() },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
  };
}

@Injectable()
export class ProjectService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService
  ) { }

  async findAll(designerId: string) {
    return this.prisma.project.findMany({
      where: { designerId },
      orderBy: { lastOpenedAt: 'desc' },
    });
  }

  async findOne(id: string, designerId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, designerId },
      include: {
        assets: true,
      },
    });
    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }
    return project;
  }

  async create(designerId: string, name: string) {
    return this.prisma.project.create({
      data: {
        name,
        description: 'Interact with target images and 3D overlays in real-time.',
        status: 'draft',
        designerId,
      },
    });
  }

  async update(id: string, designerId: string, data: { name?: string; status?: string; description?: string; lastOpenedAt?: Date | string }) {
    await this.findOne(id, designerId);

    return this.prisma.project.update({
      where: { id },
      data,
    });
  }

  async delete(id: string, designerId: string) {
    const project = await this.findOne(id, designerId);

    // Clean up all associated assets from storage first
    for (const asset of project.assets) {
      try {
        await this.storageService.deleteFile(asset.storageKey);
      } catch (err) {
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

  async getAssets(projectId: string, designerId: string) {
    await this.findOne(projectId, designerId); // Verify access
    return this.prisma.asset.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addAsset(projectId: string, designerId: string, file: Express.Multer.File) {
    await this.findOne(projectId, designerId); // Verify access

    // 1. Calculate current project size
    const assets = await this.prisma.asset.findMany({
      where: { projectId },
      select: { fileSize: true },
    });

    const currentTotalSize = assets.reduce((sum, asset) => sum + asset.fileSize, 0);
    const newFileSize = file.size;

    if (currentTotalSize + newFileSize > MAX_LIMIT) {
      throw new BadRequestException(
        `Project asset limit exceeded. Maximum 5MB allowed per project. (Current: ${(currentTotalSize / (1024 * 1024)).toFixed(2)}MB, New file: ${(newFileSize / (1024 * 1024)).toFixed(2)}MB)`
      );
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
        transform: generateDefaultTransform() as any,
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

  async deleteAsset(projectId: string, assetId: string, designerId: string) {
    await this.findOne(projectId, designerId); // Verify access

    const asset = await this.prisma.asset.findFirst({
      where: { id: assetId, projectId },
    });

    if (!asset) {
      throw new NotFoundException(`Asset not found in this project`);
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
  async updateAssetTransform(
    projectId: string,
    assetId: string,
    designerId: string,
    transform: AssetTransform
  ) {
    await this.findOne(projectId, designerId); // Verify access

    const asset = await this.prisma.asset.findFirst({
      where: { id: assetId, projectId },
    });

    if (!asset) {
      throw new NotFoundException(`Asset not found in this project`);
    }

    return this.prisma.asset.update({
      where: { id: assetId },
      data: { transform: transform as any },
    });
  }
}