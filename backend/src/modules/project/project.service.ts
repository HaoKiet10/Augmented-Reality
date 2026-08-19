import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from './storage.service';
import { UpdateProjectDto } from './dto/update-project.dto';
import { validateUploadedFile, ALLOWED_TRIGGER_IMAGE_TYPES } from './asset-validation';

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

  async update(id: string, designerId: string, data: UpdateProjectDto) {
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

    // Clean up trigger image if exists
    if (project.triggerImage) {
      try {
        await this.storageService.deleteFile(project.triggerImage);
      } catch (err) {
        console.error(`Failed to delete project trigger image file:`, err);
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

  // --- TRIGGER IMAGE ---

  async setTriggerImage(projectId: string, designerId: string, file: Express.Multer.File) {
    const project = await this.findOne(projectId, designerId);

    validateUploadedFile(file, ALLOWED_TRIGGER_IMAGE_TYPES);

    if (project.triggerImage) {
      try {
        await this.storageService.deleteFile(project.triggerImage);
      } catch (err) {
        console.error('Failed to delete old trigger image:', err);
      }
    }

    const { url, storageKey } = await this.storageService.uploadFile(file, projectId);

    return this.prisma.project.update({
      where: { id: projectId },
      data: {
        triggerImage: storageKey,
        triggerImageUrl: url,
      },
    });
  }

  async deleteTriggerImage(projectId: string, designerId: string) {
    const project = await this.findOne(projectId, designerId);

    if (!project.triggerImage) {
      throw new NotFoundException('No trigger image to delete');
    }

    try {
      await this.storageService.deleteFile(project.triggerImage);
    } catch (err) {
      console.error('Failed to delete trigger image file:', err);
    }

    return this.prisma.project.update({
      where: { id: projectId },
      data: {
        triggerImage: null,
        triggerImageUrl: null,
      },
    });
  }

  // --- PUBLISH ---

  /**
   * Publish project cho mobile app quét được. Không yêu cầu kích thước thật —
   * mobile app dùng NOMINAL_MARKER_WIDTH cố định (xem ARSceneContent.tsx phía
   * mobile) và position/scale của asset được hiểu là TỈ LỆ theo chiều rộng
   * marker, không phải mét tuyệt đối. Overlay vẫn hiện đúng tỉ lệ trên camera
   * dù trigger image được in/hiển thị ở kích thước thật bất kỳ.
   */
  async publish(projectId: string, designerId: string) {
    const project = await this.findOne(projectId, designerId);

    const missing: string[] = [];
    if (!project.triggerImageUrl) missing.push('trigger image');
    if (project.assets.length === 0) missing.push('ít nhất 1 asset');

    if (missing.length > 0) {
      throw new BadRequestException(
        `Chưa thể publish, còn thiếu: ${missing.join(', ')}`
      );
    }

    return this.prisma.project.update({
      where: { id: projectId },
      data: {
        status: 'published',
        publishedAt: new Date(),
      },
    });
  }

  async unpublish(projectId: string, designerId: string) {
    await this.findOne(projectId, designerId);

    return this.prisma.project.update({
      where: { id: projectId },
      data: {
        status: 'draft',
        publishedAt: null,
      },
    });
  }

  // --- PUBLIC SCAN (không cần auth) ---

  /**
   * Dùng cho mobile app end-user quét trigger image.
   * Chỉ trả project đã published, không lộ designerId hay field nội bộ.
   */
  async findPublishedForScan(id: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, status: 'published' },
      include: {
        assets: {
          select: {
            id: true,
            filename: true,
            fileType: true,
            url: true,
            transform: true,
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found or not published');
    }

    return {
      id: project.id,
      name: project.name,
      description: project.description,
      triggerImageUrl: project.triggerImageUrl,
      assets: project.assets,
    };
  }
}