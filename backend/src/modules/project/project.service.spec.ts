import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ProjectService } from './project.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from './storage.service';

describe('ProjectService', () => {
  let service: ProjectService;
  let prisma: {
    project: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    asset: {
      deleteMany: jest.Mock;
    };
  };
  let storageService: { uploadFile: jest.Mock; deleteFile: jest.Mock };

  const designerId = 'designer-1';
  const projectId = 'project-1';

  beforeEach(async () => {
    prisma = {
      project: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      asset: {
        deleteMany: jest.fn(),
      },
    };
    storageService = {
      uploadFile: jest.fn(),
      deleteFile: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectService,
        { provide: PrismaService, useValue: prisma },
        { provide: StorageService, useValue: storageService },
      ],
    }).compile();

    service = module.get<ProjectService>(ProjectService);
  });

  describe('findAll', () => {
    it('trả về danh sách project của đúng designer, sắp xếp theo lastOpenedAt desc', async () => {
      const projects = [{ id: '1' }, { id: '2' }];
      prisma.project.findMany.mockResolvedValue(projects);

      const result = await service.findAll(designerId);

      expect(prisma.project.findMany).toHaveBeenCalledWith({
        where: { designerId },
        orderBy: { lastOpenedAt: 'desc' },
      });
      expect(result).toEqual(projects);
    });
  });

  describe('findOne', () => {
    it('trả về project kèm assets khi tìm thấy', async () => {
      const project = { id: projectId, designerId, assets: [] };
      prisma.project.findFirst.mockResolvedValue(project);

      const result = await service.findOne(projectId, designerId);

      expect(prisma.project.findFirst).toHaveBeenCalledWith({
        where: { id: projectId, designerId },
        include: { assets: true },
      });
      expect(result).toEqual(project);
    });

    it('throw NotFoundException khi không tìm thấy (kể cả khi thuộc designer khác)', async () => {
      prisma.project.findFirst.mockResolvedValue(null);

      await expect(service.findOne(projectId, designerId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('tạo project mới với status mặc định draft', async () => {
      prisma.project.create.mockImplementation(({ data }) => Promise.resolve({ id: 'new-id', ...data }));

      const result = await service.create(designerId, 'My AR Project');

      expect(prisma.project.create).toHaveBeenCalledWith({
        data: {
          name: 'My AR Project',
          description: expect.any(String),
          status: 'draft',
          designerId,
        },
      });
      expect(result.status).toBe('draft');
    });
  });

  describe('update', () => {
    it('throw NotFoundException nếu project không thuộc designer (không cho update)', async () => {
      prisma.project.findFirst.mockResolvedValue(null);

      await expect(
        service.update(projectId, designerId, { name: 'New name' } as any),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.project.update).not.toHaveBeenCalled();
    });

    it('update project khi hợp lệ', async () => {
      prisma.project.findFirst.mockResolvedValue({ id: projectId, designerId, assets: [] });
      prisma.project.update.mockResolvedValue({ id: projectId, name: 'New name' });

      const result = await service.update(projectId, designerId, { name: 'New name' } as any);

      expect(prisma.project.update).toHaveBeenCalledWith({
        where: { id: projectId },
        data: { name: 'New name' },
      });
      expect(result.name).toBe('New name');
    });
  });

  describe('delete', () => {
    it('xoá file storage cho từng asset + trigger image, rồi xoá asset & project trong DB', async () => {
      const project = {
        id: projectId,
        designerId,
        triggerImage: 'trigger-key',
        assets: [
          { id: 'a1', storageKey: 'key-1' },
          { id: 'a2', storageKey: 'key-2' },
        ],
      };
      prisma.project.findFirst.mockResolvedValue(project);
      prisma.project.delete.mockResolvedValue(project);

      await service.delete(projectId, designerId);

      expect(storageService.deleteFile).toHaveBeenCalledWith('key-1');
      expect(storageService.deleteFile).toHaveBeenCalledWith('key-2');
      expect(storageService.deleteFile).toHaveBeenCalledWith('trigger-key');
      expect(prisma.asset.deleteMany).toHaveBeenCalledWith({ where: { projectId } });
      expect(prisma.project.delete).toHaveBeenCalledWith({ where: { id: projectId } });
    });

    it('vẫn xoá project được dù storageService.deleteFile bị lỗi (không để lỗi storage chặn xoá)', async () => {
      const project = {
        id: projectId,
        designerId,
        triggerImage: null,
        assets: [{ id: 'a1', storageKey: 'key-1' }],
      };
      prisma.project.findFirst.mockResolvedValue(project);
      storageService.deleteFile.mockRejectedValue(new Error('storage down'));
      prisma.project.delete.mockResolvedValue(project);

      await expect(service.delete(projectId, designerId)).resolves.toEqual(project);
      expect(prisma.project.delete).toHaveBeenCalled();
    });

    it('không xoá trigger image nếu project không có trigger image', async () => {
      const project = { id: projectId, designerId, triggerImage: null, assets: [] };
      prisma.project.findFirst.mockResolvedValue(project);
      prisma.project.delete.mockResolvedValue(project);

      await service.delete(projectId, designerId);

      expect(storageService.deleteFile).not.toHaveBeenCalled();
    });
  });

  describe('publish', () => {
    it('throw BadRequestException khi thiếu trigger image', async () => {
      prisma.project.findFirst.mockResolvedValue({
        id: projectId,
        designerId,
        triggerImageUrl: null,
        assets: [{ id: 'a1' }],
      });

      await expect(service.publish(projectId, designerId)).rejects.toThrow(BadRequestException);
    });

    it('throw BadRequestException khi chưa có asset nào', async () => {
      prisma.project.findFirst.mockResolvedValue({
        id: projectId,
        designerId,
        triggerImageUrl: 'https://x/trigger.png',
        assets: [],
      });

      await expect(service.publish(projectId, designerId)).rejects.toThrow(BadRequestException);
    });

    it('báo đủ cả 2 lý do thiếu trong message khi thiếu cả hai', async () => {
      prisma.project.findFirst.mockResolvedValue({
        id: projectId,
        designerId,
        triggerImageUrl: null,
        assets: [],
      });

      await expect(service.publish(projectId, designerId)).rejects.toThrow(
        /trigger image.*asset/,
      );
    });

    it('publish thành công khi đủ điều kiện: set status=published và publishedAt', async () => {
      prisma.project.findFirst.mockResolvedValue({
        id: projectId,
        designerId,
        triggerImageUrl: 'https://x/trigger.png',
        assets: [{ id: 'a1' }],
      });
      prisma.project.update.mockImplementation(({ data }) => Promise.resolve({ id: projectId, ...data }));

      const result = await service.publish(projectId, designerId);

      expect(result.status).toBe('published');
      expect(result.publishedAt).toBeInstanceOf(Date);
    });
  });

  describe('unpublish', () => {
    it('set status về draft và publishedAt về null', async () => {
      prisma.project.findFirst.mockResolvedValue({ id: projectId, designerId, assets: [] });
      prisma.project.update.mockImplementation(({ data }) => Promise.resolve({ id: projectId, ...data }));

      const result = await service.unpublish(projectId, designerId);

      expect(prisma.project.update).toHaveBeenCalledWith({
        where: { id: projectId },
        data: { status: 'draft', publishedAt: null },
      });
      expect(result.status).toBe('draft');
    });
  });

  describe('findPublishedForScan', () => {
    it('throw NotFoundException khi project không tồn tại hoặc chưa published', async () => {
      prisma.project.findFirst.mockResolvedValue(null);

      await expect(service.findPublishedForScan(projectId)).rejects.toThrow(NotFoundException);
      expect(prisma.project.findFirst).toHaveBeenCalledWith({
        where: { id: projectId, status: 'published' },
        include: expect.any(Object),
      });
    });

    it('chỉ trả về field public, không lộ designerId', async () => {
      const project = {
        id: projectId,
        name: 'AR Card',
        description: 'desc',
        designerId: 'secret-designer-id',
        triggerImageUrl: 'https://x/img.png',
        assets: [{ id: 'a1', filename: 'a.glb', fileType: 'model/gltf-binary', url: 'https://x/a.glb', transform: {} }],
      };
      prisma.project.findFirst.mockResolvedValue(project);

      const result = await service.findPublishedForScan(projectId);

      expect(result).toEqual({
        id: projectId,
        name: 'AR Card',
        description: 'desc',
        triggerImageUrl: 'https://x/img.png',
        assets: project.assets,
      });
      expect((result as any).designerId).toBeUndefined();
    });
  });

  describe('setTriggerImage', () => {
    const pngFile = {
      originalname: 'trigger.png',
      mimetype: 'image/png',
      buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      size: 1024,
    } as Express.Multer.File;

    it('throw NotFoundException nếu project không thuộc designer', async () => {
      prisma.project.findFirst.mockResolvedValue(null);

      await expect(
        service.setTriggerImage(projectId, designerId, pngFile),
      ).rejects.toThrow(NotFoundException);
      expect(storageService.uploadFile).not.toHaveBeenCalled();
    });

    it('throw BadRequestException nếu file không phải ảnh raster hợp lệ (vd .mp4)', async () => {
      prisma.project.findFirst.mockResolvedValue({ id: projectId, designerId, triggerImage: null, assets: [] });
      const invalidFile = { ...pngFile, originalname: 'clip.mp4', mimetype: 'video/mp4' } as Express.Multer.File;

      await expect(
        service.setTriggerImage(projectId, designerId, invalidFile),
      ).rejects.toThrow(BadRequestException);
      expect(storageService.uploadFile).not.toHaveBeenCalled();
    });

    it('xoá trigger image cũ trước khi upload cái mới', async () => {
      prisma.project.findFirst.mockResolvedValue({
        id: projectId,
        designerId,
        triggerImage: 'old-key',
        assets: [],
      });
      storageService.uploadFile.mockResolvedValue({ url: 'https://cdn/new.png', storageKey: 'new-key' });
      prisma.project.update.mockImplementation(({ data }) => Promise.resolve({ id: projectId, ...data }));

      const result = await service.setTriggerImage(projectId, designerId, pngFile);

      expect(storageService.deleteFile).toHaveBeenCalledWith('old-key');
      expect(storageService.uploadFile).toHaveBeenCalledWith(pngFile, projectId);
      expect(result.triggerImage).toBe('new-key');
      expect(result.triggerImageUrl).toBe('https://cdn/new.png');
    });

    it('không xoá gì cả nếu project chưa có trigger image, vẫn upload bình thường', async () => {
      prisma.project.findFirst.mockResolvedValue({ id: projectId, designerId, triggerImage: null, assets: [] });
      storageService.uploadFile.mockResolvedValue({ url: 'https://cdn/new.png', storageKey: 'new-key' });
      prisma.project.update.mockResolvedValue({ id: projectId });

      await service.setTriggerImage(projectId, designerId, pngFile);

      expect(storageService.deleteFile).not.toHaveBeenCalled();
      expect(storageService.uploadFile).toHaveBeenCalled();
    });

    it('vẫn upload thành công dù xoá ảnh cũ bị lỗi (không để lỗi storage chặn cập nhật)', async () => {
      prisma.project.findFirst.mockResolvedValue({
        id: projectId,
        designerId,
        triggerImage: 'old-key',
        assets: [],
      });
      storageService.deleteFile.mockRejectedValue(new Error('storage down'));
      storageService.uploadFile.mockResolvedValue({ url: 'https://cdn/new.png', storageKey: 'new-key' });
      prisma.project.update.mockResolvedValue({ id: projectId, triggerImage: 'new-key' });

      await expect(service.setTriggerImage(projectId, designerId, pngFile)).resolves.toBeDefined();
      expect(storageService.uploadFile).toHaveBeenCalled();
    });
  });

  describe('deleteTriggerImage', () => {
    it('throw NotFoundException nếu project không thuộc designer', async () => {
      prisma.project.findFirst.mockResolvedValue(null);

      await expect(service.deleteTriggerImage(projectId, designerId)).rejects.toThrow(NotFoundException);
    });

    it('throw NotFoundException nếu project chưa có trigger image', async () => {
      prisma.project.findFirst.mockResolvedValue({ id: projectId, designerId, triggerImage: null, assets: [] });

      await expect(service.deleteTriggerImage(projectId, designerId)).rejects.toThrow(NotFoundException);
      expect(storageService.deleteFile).not.toHaveBeenCalled();
    });

    it('xoá file storage và set triggerImage/triggerImageUrl về null', async () => {
      prisma.project.findFirst.mockResolvedValue({
        id: projectId,
        designerId,
        triggerImage: 'old-key',
        assets: [],
      });
      prisma.project.update.mockImplementation(({ data }) => Promise.resolve({ id: projectId, ...data }));

      const result = await service.deleteTriggerImage(projectId, designerId);

      expect(storageService.deleteFile).toHaveBeenCalledWith('old-key');
      expect(prisma.project.update).toHaveBeenCalledWith({
        where: { id: projectId },
        data: { triggerImage: null, triggerImageUrl: null },
      });
      expect(result.triggerImage).toBeNull();
      expect(result.triggerImageUrl).toBeNull();
    });

    it('vẫn xoá DB record dù storageService.deleteFile bị lỗi', async () => {
      prisma.project.findFirst.mockResolvedValue({
        id: projectId,
        designerId,
        triggerImage: 'old-key',
        assets: [],
      });
      storageService.deleteFile.mockRejectedValue(new Error('storage down'));
      prisma.project.update.mockResolvedValue({ id: projectId, triggerImage: null });

      await expect(service.deleteTriggerImage(projectId, designerId)).resolves.toBeDefined();
    });
  });
});
