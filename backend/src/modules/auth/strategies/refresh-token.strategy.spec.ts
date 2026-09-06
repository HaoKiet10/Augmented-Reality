import { UnauthorizedException } from '@nestjs/common';
import { RefreshTokenStrategy, REFRESH_COOKIE_NAME } from './refresh-token.strategy';

describe('RefreshTokenStrategy', () => {
  let strategy: RefreshTokenStrategy;
  let configService: { getOrThrow: jest.Mock };

  beforeEach(() => {
    configService = { getOrThrow: jest.fn().mockReturnValue('refresh-secret') };
    strategy = new RefreshTokenStrategy(configService as any);
  });

  it('dùng JWT_REFRESH_SECRET lấy từ ConfigService khi khởi tạo', () => {
    expect(configService.getOrThrow).toHaveBeenCalledWith('JWT_REFRESH_SECRET');
  });

  describe('validate', () => {
    it('throw UnauthorizedException khi request không có cookie refresh token', async () => {
      const req = { cookies: {} } as any;
      const payload = { sub: 'u1', email: 'a@test.com', type: 'refresh' as const };

      await expect(strategy.validate(req, payload)).rejects.toThrow(
        new UnauthorizedException('Refresh token not found'),
      );
    });

    it('throw UnauthorizedException khi payload.type không phải "refresh"', async () => {
      const req = { cookies: { [REFRESH_COOKIE_NAME]: 'raw-token' } } as any;
      const payload = { sub: 'u1', email: 'a@test.com', type: 'access' as const };

      await expect(strategy.validate(req, payload)).rejects.toThrow(
        new UnauthorizedException('Invalid token type'),
      );
    });

    it('trả về payload kèm refreshToken lấy từ cookie khi hợp lệ', async () => {
      const req = { cookies: { [REFRESH_COOKIE_NAME]: 'raw-token-value' } } as any;
      const payload = { sub: 'u1', email: 'a@test.com', type: 'refresh' as const };

      const result = await strategy.validate(req, payload);

      expect(result).toEqual({ ...payload, refreshToken: 'raw-token-value' });
    });
  });
});
