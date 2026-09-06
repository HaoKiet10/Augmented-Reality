import { UnauthorizedException } from '@nestjs/common';
import { TokenExpiredError, JsonWebTokenError } from 'jsonwebtoken';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;

  beforeEach(() => {
    guard = new JwtAuthGuard();
  });

  describe('handleRequest', () => {
    it('trả về user khi xác thực thành công', () => {
      const user = { id: 'u1', email: 'a@test.com' };

      const result = guard.handleRequest(null as any, user, null as any);

      expect(result).toEqual(user);
    });

    it('throw "Token expired" khi info là TokenExpiredError', () => {
      const info = new TokenExpiredError('jwt expired', new Date());

      expect(() => guard.handleRequest(null as any, null, info)).toThrow(
        new UnauthorizedException('Token expired. Please log in again.'),
      );
    });

    it('throw "Invalid token" khi info là JsonWebTokenError (không phải TokenExpiredError)', () => {
      const info = new JsonWebTokenError('malformed jwt');

      expect(() => guard.handleRequest(null as any, null, info)).toThrow(
        new UnauthorizedException('Invalid token. Please log in again.'),
      );
    });

    it('throw message của err gốc khi có err nhưng không phải lỗi JWT xác định được', () => {
      const err = new Error('custom passport error');

      expect(() => guard.handleRequest(err, null, null as any)).toThrow(
        new UnauthorizedException('custom passport error'),
      );
    });

    it('throw "Unauthorized" mặc định khi không có user, không có err, không có info', () => {
      expect(() => guard.handleRequest(null as any, null, null as any)).toThrow(
        new UnauthorizedException('Unauthorized'),
      );
    });

    it('throw ngay cả khi có user nhưng có err (err được ưu tiên)', () => {
      const err = new Error('some error');
      const user = { id: 'u1' };

      expect(() => guard.handleRequest(err, user, null as any)).toThrow(UnauthorizedException);
    });
  });
});
