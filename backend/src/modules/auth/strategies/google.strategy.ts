// google.strategy.ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, StrategyOptions, Profile } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../../user/user.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private configService: ConfigService,
    private userService: UserService,
  ) {
    super({
      clientID: configService.getOrThrow<string>('GOOGLE_CLIENT_ID'),
      clientSecret: configService.getOrThrow<string>('GOOGLE_CLIENT_SECRET'),
      callbackURL: configService.getOrThrow<string>('GOOGLE_CALLBACK_URL'),
      scope: ['email', 'profile'],
    } as StrategyOptions);
  }

  // Passport gọi hàm này sau khi Google redirect về /auth/google/callback kèm code,
  // và passport-google-oauth20 đã tự đổi code lấy profile. Giá trị return ở đây
  // chính là req.user mà GoogleAuthGuard + controller nhận được.
  async validate(_accessToken: string, _refreshToken: string, profile: Profile) {
    const email = profile.emails?.[0]?.value;
    if (!email) {
      // Scope 'email' luôn trả email cho tài khoản Google thường, nhưng vẫn
      // phòng trường hợp field rỗng thay vì để undefined lọt xuống DB.
      throw new Error('Google account has no public email');
    }

    const user = await this.userService.findOrCreateByGoogle({
      googleId: profile.id,
      email,
      name: profile.displayName,
      avatarUrl: profile.photos?.[0]?.value,
    });

    return user;
  }
}
