import { UnauthorizedException } from '@nestjs/common';
import { of } from 'rxjs';

// Mock AuthGuard('jwt-refresh') cha để kiểm soát hoàn toàn kết quả canActivate của passport,
// tách biệt phần logic tự viết thêm (tra role từ DB) khỏi phần passport xử lý authentication.
const mockSuperCanActivate = jest.fn();
jest.mock('@nestjs/passport', () => ({
  AuthGuard: () =>
    class {
      canActivate(context: any) {
        return mockSuperCanActivate(context);
      }
    },
}));

import { JwtRefreshAuthGuard } from './jwt-refresh-auth.guard';

describe('JwtRefreshAuthGuard', () => {
  let guard: JwtRefreshAuthGuard;
  let prisma: { user: { findUnique: jest.Mock } };

  const makeContext = (request: any) => ({
    switchToHttp: () => ({ getRequest: () => request }),
  } as any);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = { user: { findUnique: jest.fn() } };
    guard = new JwtRefreshAuthGuard(prisma as any);
  });

  it('trả về false ngay khi passport authenticate thất bại (không tra DB)', async () => {
    mockSuperCanActivate.mockReturnValue(false);
    const context = makeContext({});

    const result = await guard.canActivate(context);

    expect(result).toBe(false);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('không tra DB nếu request.user đã có sẵn role (token mới có role claim)', async () => {
    mockSuperCanActivate.mockReturnValue(true);
    const request = { user: { sub: 'u1', role: 'designer' } };
    const context = makeContext(request);

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
    expect(request.user.role).toBe('designer');
  });

  it('tra role từ DB và gán vào request.user khi token thiếu role claim', async () => {
    mockSuperCanActivate.mockReturnValue(true);
    prisma.user.findUnique.mockResolvedValue({ role: 'admin' });
    const request: { user: { sub: string; role?: string } } = { user: { sub: 'u1' } };
    const context = makeContext(request);

    const result = await guard.canActivate(context);

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'u1' },
      select: { role: true },
    });
    expect(request.user.role).toBe('admin');
    expect(result).toBe(true);
  });

  it('throw UnauthorizedException nếu user trong token không còn tồn tại trong DB', async () => {
    mockSuperCanActivate.mockReturnValue(true);
    prisma.user.findUnique.mockResolvedValue(null);
    const request = { user: { sub: 'deleted-user' } };
    const context = makeContext(request);

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('hỗ trợ kết quả canActivate dạng Observable từ AuthGuard cha', async () => {
    mockSuperCanActivate.mockReturnValue(of(true));
    const request = { user: { sub: 'u1', role: 'designer' } };
    const context = makeContext(request);

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
  });
});
