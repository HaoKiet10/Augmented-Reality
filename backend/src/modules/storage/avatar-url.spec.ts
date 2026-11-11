import { avatarKeyFromUrl } from './avatar-url';

const BASE = 'https://abc.supabase.co';

describe('avatarKeyFromUrl', () => {
  it('trả storageKey khi URL là public URL trong bucket avatar của mình', () => {
    const url = `${BASE}/storage/v1/object/public/avatars/user-1/1700000000.png`;

    expect(avatarKeyFromUrl(url, BASE, 'avatars')).toBe('user-1/1700000000.png');
  });

  it('trả null cho ảnh Google (không phải file của mình, không được xoá)', () => {
    const url = 'https://lh3.googleusercontent.com/a/abc=s96-c';

    expect(avatarKeyFromUrl(url, BASE, 'avatars')).toBeNull();
  });

  it('trả null cho file nằm ở bucket khác (vd asset của project)', () => {
    const url = `${BASE}/storage/v1/object/public/assets/assets/p1/x.png`;

    expect(avatarKeyFromUrl(url, BASE, 'avatars')).toBeNull();
  });

  it('trả null khi url rỗng/null', () => {
    expect(avatarKeyFromUrl(null, BASE, 'avatars')).toBeNull();
    expect(avatarKeyFromUrl('', BASE, 'avatars')).toBeNull();
  });

  it('chịu được SUPABASE_URL có dấu / ở cuối', () => {
    const url = `${BASE}/storage/v1/object/public/avatars/user-1/a.webp`;

    expect(avatarKeyFromUrl(url, `${BASE}/`, 'avatars')).toBe('user-1/a.webp');
  });
});
