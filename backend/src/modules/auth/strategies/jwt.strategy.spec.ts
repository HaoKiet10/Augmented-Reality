import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let configService: { getOrThrow: jest.Mock };

  beforeEach(() => {
    configService = { getOrThrow: jest.fn().mockReturnValue('jwt-secret') };
    strategy = new JwtStrategy(configService as any);
  });

  it('dùng JWT_SECRET lấy từ ConfigService khi khởi tạo', () => {
    expect(configService.getOrThrow).toHaveBeenCalledWith('JWT_SECRET');
  });

  describe('validate', () => {
    it('trả về user object rút gọn (id/email/role) khi payload hợp lệ', async () => {
      const payload = { sub: 'u1', email: 'a@test.com', role: 'designer', type: 'access' as const };

      const result = await strategy.validate(payload);

      expect(result).toEqual({ id: 'u1', email: 'a@test.com', role: 'designer' });
    });

    it('throw UnauthorizedException khi thiếu sub trong payload', async () => {
      const payload = { sub: '', email: 'a@test.com', type: 'access' as const };

      await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
    });

    it('throw UnauthorizedException khi type không phải "access" (vd token refresh bị dùng sai chỗ)', async () => {
      const payload = { sub: 'u1', email: 'a@test.com', type: 'refresh' as const };

      await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
    });
  });
});
