import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { UserService } from './user.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

// bcrypt là native addon (compiled binding) — property của nó không configurable nên
// jest.spyOn trực tiếp trên module thật sẽ throw "Cannot redefine property". Mock cả
// module để có thể kiểm soát hash/compare trong test.
jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('UserService', () => {
  let service: UserService;
  let storage: { uploadAvatar: jest.Mock; deleteAvatar: jest.Mock; avatarKeyFromUrl: jest.Mock };
  let prisma: {
    user: {
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    storage = {
      uploadAvatar: jest.fn(),
      deleteAvatar: jest.fn().mockResolvedValue(undefined),
      avatarKeyFromUrl: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: PrismaService, useValue: prisma },
        { provide: StorageService, useValue: storage },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('trả về user khi tìm thấy theo id', async () => {
      const user = { id: '1', email: 'a@test.com' };
      prisma.user.findUnique.mockResolvedValue(user);

      const result = await service.findById('1');

      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: '1' } });
      expect(result).toEqual(user);
    });

    it('trả về null khi không tìm thấy', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const result = await service.findById('missing');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('hash password trước khi lưu và không lưu password gốc', async () => {
      mockedBcrypt.hash.mockResolvedValue('hashed-pw' as never);
      prisma.user.create.mockImplementation(({ data }) => Promise.resolve({ id: '1', ...data }));

      const result = await service.create({
        email: 'a@test.com',
        password: 'plain-password',
        name: 'A',
      });

      expect(mockedBcrypt.hash).toHaveBeenCalledWith('plain-password', 10);
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: { email: 'a@test.com', password: 'hashed-pw', name: 'A' },
      });
      expect(result.password).toBe('hashed-pw');
      expect(result.password).not.toBe('plain-password');
    });
  });

  describe('update', () => {
    it('hash lại password khi có password mới trong payload', async () => {
      mockedBcrypt.hash.mockResolvedValue('new-hashed' as never);
      prisma.user.update.mockResolvedValue({ id: '1', password: 'new-hashed' });

      await service.update('1', { password: 'new-plain' });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { password: 'new-hashed' },
      });
    });

    it('không đụng vào password khi payload không có password', async () => {
      prisma.user.update.mockResolvedValue({ id: '1', name: 'B' });

      await service.update('1', { name: 'B' });

      expect(mockedBcrypt.hash).not.toHaveBeenCalled();
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { name: 'B' },
      });
    });
  });

  describe('delete', () => {
    it('gọi prisma.user.delete với đúng id', async () => {
      prisma.user.delete.mockResolvedValue({ id: '1' });

      await service.delete('1');

      expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: '1' } });
    });
  });

  describe('validate', () => {
    it('trả về user khi email tồn tại và password khớp', async () => {
      const user = { id: '1', email: 'a@test.com', password: 'hashed' };
      prisma.user.findUnique.mockResolvedValue(user);
      mockedBcrypt.compare.mockResolvedValue(true as never);

      const result = await service.validate('a@test.com', 'plain');

      expect(result).toEqual(user);
    });

    it('trả về null khi password không khớp', async () => {
      const user = { id: '1', email: 'a@test.com', password: 'hashed' };
      prisma.user.findUnique.mockResolvedValue(user);
      mockedBcrypt.compare.mockResolvedValue(false as never);

      const result = await service.validate('a@test.com', 'wrong');

      expect(result).toBeNull();
    });

    it('trả về null khi không tìm thấy user theo email (không gọi bcrypt.compare)', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const result = await service.validate('missing@test.com', 'anything');

      expect(result).toBeNull();
      expect(mockedBcrypt.compare).not.toHaveBeenCalled();
    });
  });

  describe('findByEmail', () => {
    it('gọi prisma với đúng email', async () => {
      const user = { id: '1', email: 'a@test.com' };
      prisma.user.findUnique.mockResolvedValue(user);

      const result = await service.findByEmail('a@test.com');

      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { email: 'a@test.com' } });
      expect(result).toEqual(user);
    });
  });

  describe('setPassword', () => {
    it('hash và lưu password cho tài khoản Google-only chưa có password', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: '1', password: null, googleId: 'g1' });
      mockedBcrypt.hash.mockResolvedValue('hashed-new' as never);
      prisma.user.update.mockResolvedValue({ id: '1', password: 'hashed-new' });

      const result = await service.setPassword('1', 'new-password');

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { password: 'hashed-new' },
      });
      expect(result).toEqual({ message: 'Password set successfully' });
    });

    it('từ chối khi tài khoản đã có password (phải đi qua đổi mật khẩu có xác nhận)', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: '1', password: 'existing-hash' });

      await expect(service.setPassword('1', 'new-password')).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('throw NotFound khi user không tồn tại', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.setPassword('missing', 'new-password')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('updateAvatar', () => {
    const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const makeFile = (overrides: Partial<Express.Multer.File> = {}): Express.Multer.File => ({
      fieldname: 'file',
      originalname: 'me.png',
      encoding: '7bit',
      mimetype: 'image/png',
      buffer: PNG,
      size: PNG.length,
      stream: undefined as any,
      destination: '',
      filename: '',
      path: '',
      ...overrides,
    });

    it('upload ảnh hợp lệ, lưu avatarUrl mới và xoá file avatar cũ của mình', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: '1', avatarUrl: 'https://sb/old.png' });
      storage.uploadAvatar.mockResolvedValue('https://sb/new.png');
      storage.avatarKeyFromUrl.mockReturnValue('1/old.png');
      prisma.user.update.mockResolvedValue({ id: '1', avatarUrl: 'https://sb/new.png' });

      const result = await service.updateAvatar('1', makeFile());

      expect(storage.uploadAvatar).toHaveBeenCalledWith('1', expect.objectContaining({ originalname: 'me.png' }));
      expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: '1' }, data: { avatarUrl: 'https://sb/new.png' } });
      expect(storage.deleteAvatar).toHaveBeenCalledWith('1/old.png');
      expect(result.avatarUrl).toBe('https://sb/new.png');
    });

    it('KHÔNG xoá gì khi avatar cũ là ảnh Google (không thuộc bucket mình)', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: '1', avatarUrl: 'https://lh3.googleusercontent.com/a/x' });
      storage.uploadAvatar.mockResolvedValue('https://sb/new.png');
      storage.avatarKeyFromUrl.mockReturnValue(null);
      prisma.user.update.mockResolvedValue({ id: '1', avatarUrl: 'https://sb/new.png' });

      await service.updateAvatar('1', makeFile());

      expect(storage.deleteAvatar).not.toHaveBeenCalled();
    });

    it('từ chối file không phải ảnh (chữ ký sai) và không upload gì', async () => {
      const fake = makeFile({ buffer: Buffer.from('<script>alert(1)</script>') });

      await expect(service.updateAvatar('1', fake)).rejects.toBeInstanceOf(BadRequestException);
      expect(storage.uploadAvatar).not.toHaveBeenCalled();
    });

    it('throw NotFound khi user không tồn tại', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.updateAvatar('missing', makeFile())).rejects.toBeInstanceOf(NotFoundException);
      expect(storage.uploadAvatar).not.toHaveBeenCalled();
    });
  });

  describe('removeAvatar', () => {
    it('đặt avatarUrl = null và xoá file nếu là file của mình', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: '1', avatarUrl: 'https://sb/old.png' });
      storage.avatarKeyFromUrl.mockReturnValue('1/old.png');
      prisma.user.update.mockResolvedValue({ id: '1', avatarUrl: null });

      const result = await service.removeAvatar('1');

      expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: '1' }, data: { avatarUrl: null } });
      expect(storage.deleteAvatar).toHaveBeenCalledWith('1/old.png');
      expect(result.avatarUrl).toBeNull();
    });

    it('bỏ ảnh Google: chỉ xoá link, không gọi xoá storage', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: '1', avatarUrl: 'https://lh3.googleusercontent.com/a/x' });
      storage.avatarKeyFromUrl.mockReturnValue(null);
      prisma.user.update.mockResolvedValue({ id: '1', avatarUrl: null });

      await service.removeAvatar('1');

      expect(storage.deleteAvatar).not.toHaveBeenCalled();
    });
  });

  describe('sanitize', () => {
    it('loại bỏ field password khỏi object trả về', () => {
      const user = { id: '1', email: 'a@test.com', password: 'secret-hash', name: 'A' };

      const result = service.sanitize(user);

      expect(result).toEqual({ id: '1', email: 'a@test.com', name: 'A' });
      expect((result as any).password).toBeUndefined();
    });
  });
});
