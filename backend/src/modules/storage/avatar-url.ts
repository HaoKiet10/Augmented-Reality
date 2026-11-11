/**
 * Lấy storageKey từ public URL của avatar — CHỈ khi URL đó trỏ vào bucket avatar
 * của chính mình. Trả null cho mọi URL khác (ảnh Google, file ở bucket khác...),
 * để logic thay/xoá avatar không bao giờ gọi xoá thứ không phải do mình upload.
 */
export function avatarKeyFromUrl(url: string | null | undefined, supabaseUrl: string, bucket: string): string | null {
  if (!url) return null;
  const prefix = `${supabaseUrl.replace(/\/+$/, '')}/storage/v1/object/public/${bucket}/`;
  if (!url.startsWith(prefix)) return null;
  const key = url.slice(prefix.length);
  return key || null;
}
