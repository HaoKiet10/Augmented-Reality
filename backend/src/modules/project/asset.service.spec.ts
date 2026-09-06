import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { AssetService } from './asset.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from './storage.service';
import { ProjectService } from './project.service';

describe('AssetService', () => {
  let service: AssetService;
  let prisma: {
    asset: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    project: {
      update: jest.Mock;
    };
  };
  let storageService: { uploadFile: jest.Mock; deleteFile: jest.Mock };
  let projectService: { findOne: jest.Mock };

  const projectId = 'project-1';
  const designerId = 'designer-1';
  const assetId = 'asset-1';

  const makeFile = (overrides: Partial<Express.Multer.File> = {}): Express.Multer.File => ({
    fieldname: 'file',
    originalname: 'texture.png',
    encoding: '7bit',
    mimetype: 'image/png',
    buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    size: 1024,
    stream: undefined as any,
    destination: '',
    filename: '',
    path: '',
    ...overrides,
  });

  beforeEach(async () => {
    prisma = {
      asset: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      project: {
        update: jest.fn().mockResolvedValue({}),
      },
    };
    storageService = {
      uploadFile: jest.fn().mockResolvedValue({ url: 'https://cdn/x.png', storageKey: 'assets/x.png' }),
      deleteFile: jest.fn().mockResolvedValue(undefined),
    };
    projectService = {
      findOne: jest.fn().mockResolvedValue({ id: projectId, designerId, assets: [] }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssetService,
        { provide: PrismaService, useValue: prisma },
        { provide: StorageService, useValue: storageService },
        { provide: ProjectService, useValue: projectService },
      ],
    }).compile();

    service = module.get<AssetService>(AssetService);
  });

  describe('getAssets', () => {
    it('verify quyền truy cập project trước khi trả asset', async () => {
      prisma.asset.findMany.mockResolvedValue([{ id: 'a1' }]);

      const result = await service.getAssets(projectId, designerId);

      expect(projectService.findOne).toHaveBeenCalledWith(projectId, designerId);
      expect(prisma.asset.findMany).toHaveBeenCalledWith({
        where: { projectId },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual([{ id: 'a1' }]);
    });

    it('throw NotFoundException nếu project không thuộc designer (được throw ra từ projectService)', async () => {
      projectService.findOne.mockRejectedValue(new NotFoundException());

      await expect(service.getAssets(projectId, designerId)).rejects.toThrow(NotFoundException);
      expect(prisma.asset.findMany).not.toHaveBeenCalled();
    });
  });

  describe('addAsset', () => {
    it('throw BadRequestException khi file không đúng định dạng cho phép (vd .exe)', async () => {
      const file = makeFile({ originalname: 'virus.exe', mimetype: 'application/octet-stream' });

      await expect(service.addAsset(projectId, designerId, file)).rejects.toThrow(BadRequestException);
      expect(storageService.uploadFile).not.toHaveBeenCalled();
    });

    it('throw BadRequestException khi magic bytes không khớp với extension khai báo', async () => {
      // đuôi .png nhưng nội dung không phải PNG thật
      const file = makeFile({ originalname: 'fake.png', mimetype: 'image/png', buffer: Buffer.from('not a real png') });

      await expect(service.addAsset(projectId, designerId, file)).rejects.toThrow(BadRequestException);
    });

    it('throw BadRequestException khi vượt quá giới hạn 5MB tổng dung lượng project', async () => {
      prisma.asset.findMany.mockResolvedValue([{ fileSize: 4 * 1024 * 1024 }]);
      const file = makeFile({ size: 2 * 1024 * 1024 }); // 4MB + 2MB > 5MB

      await expect(service.addAsset(projectId, designerId, file)).rejects.toThrow(BadRequestException);
      expect(storageService.uploadFile).not.toHaveBeenCalled();
    });

    it('cho phép upload khi vừa đủ dưới giới hạn 5MB', async () => {
      prisma.asset.findMany.mockResolvedValue([{ fileSize: 1 * 1024 * 1024 }]);
      const file = makeFile({ size: 3 * 1024 * 1024 }); // 1MB + 3MB < 5MB
      prisma.asset.create.mockImplementation(({ data }) => Promise.resolve({ id: 'new-asset', ...data }));

      const result = await service.addAsset(projectId, designerId, file);

      expect(storageService.uploadFile).toHaveBeenCalledWith(file, projectId);
      expect(result.filename).toBe('texture.png');
      expect(result.uploadedBy).toBe(designerId);
    });

    it('tạo transform mặc định hợp lệ (scale=1, y=0.8) cho asset mới', async () => {
      const file = makeFile();
      prisma.asset.create.mockImplementation(({ data }) => Promise.resolve({ id: 'new-asset', ...data }));

      const result = await service.addAsset(projectId, designerId, file);

      const transform = result.transform as any;
      expect(transform.scale).toEqual({ x: 1, y: 1, z: 1 });
      expect(transform.rotation).toEqual({ x: 0, y: 0, z: 0 });
      expect(transform.position.y).toBe(0.8);
    });

    it('cập nhật lastOpenedAt của project sau khi thêm asset thành công', async () => {
      const file = makeFile();
      prisma.asset.create.mockResolvedValue({ id: 'new-asset' });

      await service.addAsset(projectId, designerId, file);

      expect(prisma.project.update).toHaveBeenCalledWith({
        where: { id: projectId },
        data: { lastOpenedAt: expect.any(Date) },
      });
    });
  });

  describe('deleteAsset', () => {
    it('throw NotFoundException khi asset không tồn tại trong project', async () => {
      prisma.asset.findFirst.mockResolvedValue(null);

      await expect(service.deleteAsset(projectId, assetId, designerId)).rejects.toThrow(NotFoundException);
      expect(storageService.deleteFile).not.toHaveBeenCalled();
    });

    it('xoá file storage + record DB, trả success khi asset tồn tại', async () => {
      prisma.asset.findFirst.mockResolvedValue({ id: assetId, storageKey: 'assets/x.png' });
      prisma.asset.delete.mockResolvedValue({});

      const result = await service.deleteAsset(projectId, assetId, designerId);

      expect(storageService.deleteFile).toHaveBeenCalledWith('assets/x.png');
      expect(prisma.asset.delete).toHaveBeenCalledWith({ where: { id: assetId } });
      expect(result).toEqual({ success: true });
    });
  });

  describe('updateAssetTransform', () => {
    const transform = {
      position: { x: 1, y: 2, z: 3 },
      rotation: { x: 0, y: 90, z: 0 },
      scale: { x: 2, y: 2, z: 2 },
    };

    it('throw NotFoundException khi asset không thuộc project', async () => {
      prisma.asset.findFirst.mockResolvedValue(null);

      await expect(
        service.updateAssetTransform(projectId, assetId, designerId, transform),
      ).rejects.toThrow(NotFoundException);
    });

    it('cập nhật transform khi asset hợp lệ', async () => {
      prisma.asset.findFirst.mockResolvedValue({ id: assetId });
      prisma.asset.update.mockResolvedValue({ id: assetId, transform });

      const result = await service.updateAssetTransform(projectId, assetId, designerId, transform);

      expect(prisma.asset.update).toHaveBeenCalledWith({
        where: { id: assetId },
        data: { transform },
      });
      expect(result.transform).toEqual(transform);
    });
  });
});