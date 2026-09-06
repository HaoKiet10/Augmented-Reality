import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

describe('AuthService', () => {
  let service: AuthService;
  let userService: { validate: jest.Mock; findByEmail: jest.Mock; create: jest.Mock; sanitize: jest.Mock };
  let prisma: {
    refreshToken: {
      create: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
  };
  let jwtService: { sign: jest.Mock };
  let configService: { getOrThrow: jest.Mock };

  const fakeUser = { id: 'u1', email: 'a@test.com', role: 'designer', password: 'hashed' };

  beforeEach(async () => {
    userService = {
      validate: jest.fn(),
      findByEmail: jest.fn(),
      create: jest.fn(),
      sanitize: jest.fn((u) => {
        const { password, ...rest } = u;
        return rest;
      }),
    };
    prisma = {
      refreshToken: {
        create: jest.fn().mockResolvedValue({}),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
    };
    jwtService = {
      sign: jest.fn((payload: any) => `signed-${payload.type}-${payload.sub}`),
    };
    configService = {
      getOrThrow: jest.fn().mockReturnValue('refresh-secret'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserService, useValue: userService },
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('login', () => {
    it('throw UnauthorizedException khi credentials sai', async () => {
      userService.validate.mockResolvedValue(null);

      await expect(
        service.login({ email: 'a@test.com', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('trả về token + refreshToken + user đã sanitize khi login thành công', async () => {
      userService.validate.mockResolvedValue(fakeUser);

      const result = await service.login({ email: 'a@test.com', password: 'right' });

      expect(userService.validate).toHaveBeenCalledWith('a@test.com', 'right');
      expect(result.message).toBe('Login successful');
      expect(result.user).toEqual({ id: 'u1', email: 'a@test.com', role: 'designer' });
      expect((result.user as any).password).toBeUndefined();
      expect(result.token).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      // refresh token phải được lưu lại (hash), không lưu raw token
      expect(prisma.refreshToken.create).toHaveBeenCalledTimes(1);
      const createArg = prisma.refreshToken.create.mock.calls[0][0];
      expect(createArg.data.userId).toBe('u1');
      expect(createArg.data.tokenHash).not.toBe(result.refreshToken);
    });

    it('access token và refresh token được ký với secret khác nhau', async () => {
      userService.validate.mockResolvedValue(fakeUser);

      await service.login({ email: 'a@test.com', password: 'right' });

      // Lệnh sign() đầu tiên (access) không truyền secret riêng, refresh thì có
      const accessCall = jwtService.sign.mock.calls[0];
      const refreshCall = jwtService.sign.mock.calls[1];
      expect(accessCall[1].secret).toBeUndefined();
      expect(refreshCall[1].secret).toBe('refresh-secret');
      expect(configService.getOrThrow).toHaveBeenCalledWith('JWT_REFRESH_SECRET');
    });
  });

  describe('signup', () => {
    it('throw UnauthorizedException khi email đã tồn tại', async () => {
      userService.findByEmail.mockResolvedValue(fakeUser);

      await expect(
        service.signup({ email: 'a@test.com', password: 'abcdefgh' }),
      ).rejects.toThrow(UnauthorizedException);
      expect(userService.create).not.toHaveBeenCalled();
    });

    it('tạo user mới và trả về token khi email chưa tồn tại', async () => {
      userService.findByEmail.mockResolvedValue(null);
      userService.create.mockResolvedValue(fakeUser);

      const result = await service.signup({
        email: 'a@test.com',
        password: 'abcdefgh',
        name: 'A',
      });

      expect(userService.create).toHaveBeenCalledWith({
        email: 'a@test.com',
        password: 'abcdefgh',
        name: 'A',
      });
      expect(result.message).toBe('Signup successful');
      expect(result.token).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });
  });

  describe('refreshTokens', () => {
    it('throw khi không tìm thấy refresh token trong DB', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(null);

      await expect(
        service.refreshTokens('u1', 'a@test.com', 'designer', 'raw-token'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throw khi token tồn tại nhưng thuộc user khác', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt1',
        userId: 'someone-else',
        revoked: false,
        expiresAt: new Date(Date.now() + 100000),
      });

      await expect(
        service.refreshTokens('u1', 'a@test.com', 'designer', 'raw-token'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('revoke toàn bộ token của user khi phát hiện reuse (token đã revoked)', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt1',
        userId: 'u1',
        revoked: true,
        expiresAt: new Date(Date.now() + 100000),
      });

      await expect(
        service.refreshTokens('u1', 'a@test.com', 'designer', 'raw-token'),
      ).rejects.toThrow(UnauthorizedException);

      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'u1', revoked: false },
        data: { revoked: true },
      });
    });

    it('revoke toàn bộ token của user khi token đã hết hạn', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt1',
        userId: 'u1',
        revoked: false,
        expiresAt: new Date(Date.now() - 1000), // đã hết hạn
      });

      await expect(
        service.refreshTokens('u1', 'a@test.com', 'designer', 'raw-token'),
      ).rejects.toThrow(UnauthorizedException);

      expect(prisma.refreshToken.updateMany).toHaveBeenCalled();
    });

    it('rotate: revoke token cũ và issue cặp token mới khi hợp lệ', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt1',
        userId: 'u1',
        revoked: false,
        expiresAt: new Date(Date.now() + 100000),
      });

      const result = await service.refreshTokens('u1', 'a@test.com', 'designer', 'raw-token');

      expect(prisma.refreshToken.update).toHaveBeenCalledWith({
        where: { id: 'rt1' },
        data: { revoked: true },
      });
      expect(prisma.refreshToken.create).toHaveBeenCalledTimes(1); // token mới được lưu
      expect(result.token).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });
  });

  describe('logout', () => {
    it('revoke refresh token khi có token được truyền vào', async () => {
      await service.logout('raw-token');

      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { tokenHash: expect.any(String) },
        data: { revoked: true },
      });
    });

    it('không throw và không gọi prisma khi không có token truyền vào', async () => {
      const result = await service.logout(undefined);

      expect(prisma.refreshToken.updateMany).not.toHaveBeenCalled();
      expect(result).toEqual({ message: 'Logout successful' });
    });
  });
});