import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { imageSize } from 'image-size';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from './storage.service';
import { ProjectService } from './project.service';
import { validateUploadedFile, ALLOWED_ASSET_TYPES } from './asset-validation';

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
/**
 * Transform mặc định cho asset mới, theo quy ước TỈ LỆ TƯƠNG ĐỐI so với chiều
 * rộng trigger image (1 = 100% chiều rộng marker) — KHÔNG phải mét tuyệt đối.
 * Đặt ở giữa marker (position 0,0,0), lệch nhẹ ngẫu nhiên trên trục X/Z để
 * nhiều asset trong cùng project không chồng khít lên nhau khi cùng active.
 */
function generateDefaultTransform(): AssetTransform {
  const jitter = () => Math.round((Math.random() - 0.5) * 0.3 * 100) / 100; // ±0.15, đơn vị tương đối

  return {
    position: { x: jitter(), y: 0, z: jitter() },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
  };
}

@Injectable()
export class AssetService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    private readonly projectService: ProjectService
  ) { }

  async getAssets(projectId: string, designerId: string) {
    await this.projectService.findOne(projectId, designerId); // Verify access
    return this.prisma.asset.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async assertWithinSizeLimit(projectId: string, additionalBytes: number) {
    const assets = await this.prisma.asset.findMany({
      where: { projectId },
      select: { fileSize: true },
    });

    const currentTotalSize = assets.reduce((sum, asset) => sum + asset.fileSize, 0);

    if (currentTotalSize + additionalBytes > MAX_LIMIT) {
      throw new BadRequestException(
        `Project asset limit exceeded. Maximum 5MB allowed per project. (Current: ${(currentTotalSize / (1024 * 1024)).toFixed(2)}MB, New file: ${(additionalBytes / (1024 * 1024)).toFixed(2)}MB)`
      );
    }
  }

  async addAsset(projectId: string, designerId: string, file: Express.Multer.File) {
    await this.projectService.findOne(projectId, designerId); // Verify access

    // Kiểm tra nội dung file THẬT (magic bytes) — không tin đuôi file/mimetype
    // client tự khai báo, vì fileFilter ở multer chỉ chặn được lớp ngoài dễ giả mạo.
    validateUploadedFile(file, ALLOWED_ASSET_TYPES);

    // 1. Kiểm tra giới hạn dung lượng project
    await this.assertWithinSizeLimit(projectId, file.size);

    // 2. Upload file
    const { url, storageKey } = await this.storageService.uploadFile(file, projectId);

    // 2b. Nếu là ảnh, đọc kích thước gốc (px) từ buffer để giữ đúng tỉ lệ khung hình
    // khi render trong AR scene — nếu không, scene sẽ luôn vẽ ảnh thành hình vuông mặc định.
    let width: number | undefined;
    let height: number | undefined;
    if (file.mimetype.startsWith('image/')) {
      try {
        const dimensions = imageSize(file.buffer);
        width = dimensions.width;
        height = dimensions.height;
      } catch {
        // Không đọc được kích thước (file ảnh hỏng/định dạng lạ) — vẫn cho upload,
        // scene sẽ fallback về tỉ lệ vuông mặc định.
      }
    }

    // 3. Create db record với transform mặc định (lệch nhẹ ngẫu nhiên)
    const asset = await this.prisma.asset.create({
      data: {
        filename: file.originalname,
        fileType: file.mimetype,
        fileSize: file.size,
        storageKey,
        url,
        width,
        height,
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

  /** Nhân bản 1 asset: copy file trong storage (không tốn băng thông app server) + tạo record DB mới. */
  async duplicateAsset(projectId: string, assetId: string, designerId: string) {
    await this.projectService.findOne(projectId, designerId); // Verify access

    const original = await this.prisma.asset.findFirst({
      where: { id: assetId, projectId },
    });

    if (!original) {
      throw new NotFoundException(`Asset not found in this project`);
    }

    await this.assertWithinSizeLimit(projectId, original.fileSize);

    const { url, storageKey } = await this.storageService.copyFile(
      original.storageKey,
      projectId,
      original.filename
    );

    // Lệch nhẹ vị trí bản sao so với bản gốc (theo cùng quy ước jitter tương đối
    // như generateDefaultTransform) để 2 asset không chồng khít lên nhau.
    const originalTransform = (original.transform as unknown as AssetTransform) ?? generateDefaultTransform();
    const duplicatedTransform: AssetTransform = {
      ...originalTransform,
      position: {
        x: originalTransform.position.x + 0.15,
        y: originalTransform.position.y,
        z: originalTransform.position.z + 0.15,
      },
    };

    const asset = await this.prisma.asset.create({
      data: {
        filename: original.filename,
        fileType: original.fileType,
        fileSize: original.fileSize,
        storageKey,
        url,
        width: original.width,
        height: original.height,
        transform: duplicatedTransform as any,
        projectId,
        uploadedBy: designerId,
      },
    });

    await this.prisma.project.update({
      where: { id: projectId },
      data: { lastOpenedAt: new Date() },
    });

    return asset;
  }

  async deleteAsset(projectId: string, assetId: string, designerId: string) {
    await this.projectService.findOne(projectId, designerId); // Verify access

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
    await this.projectService.findOne(projectId, designerId); // Verify access

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