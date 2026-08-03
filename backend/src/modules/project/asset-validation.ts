import { BadRequestException } from '@nestjs/common';

/**
 * Whitelist các loại file được phép upload làm ASSET trong scene AR.
 * Cố tình KHÔNG cho phép .svg: SVG có thể chứa <script> nhúng và bị trình duyệt
 * thực thi khi mở trực tiếp URL file (stored XSS qua upload) — không đáng để
 * đánh đổi chỉ vì tiện cho vài icon vector.
 */
export const ALLOWED_ASSET_TYPES: Record<string, { mimetypes: string[]; magic?: (buf: Buffer) => boolean }> = {
  '.png': {
    mimetypes: ['image/png'],
    magic: (buf) => buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  },
  '.jpg': {
    mimetypes: ['image/jpeg'],
    magic: (buf) => buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff,
  },
  '.jpeg': {
    mimetypes: ['image/jpeg'],
    magic: (buf) => buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff,
  },
  '.mp4': {
    mimetypes: ['video/mp4'],
    magic: (buf) => buf.length >= 8 && buf.subarray(4, 8).toString('ascii') === 'ftyp',
  },
  '.webm': {
    mimetypes: ['video/webm'],
    magic: (buf) => buf.length >= 4 && buf.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3])),
  },
  '.glb': {
    mimetypes: ['model/gltf-binary', 'application/octet-stream'],
    magic: (buf) => buf.length >= 4 && buf.subarray(0, 4).toString('ascii') === 'glTF',
  },
  '.gltf': {
    // .gltf là JSON text, không có magic bytes nhị phân cố định — chỉ kiểm tra parse được JSON.
    mimetypes: ['model/gltf+json', 'application/json', 'text/plain'],
    magic: (buf) => {
      try {
        JSON.parse(buf.toString('utf-8'));
        return true;
      } catch {
        return false;
      }
    },
  },
};

/** Trigger image dùng để nhận diện marker AR — chỉ nhận ảnh raster, không nhận SVG/video/model. */
export const ALLOWED_TRIGGER_IMAGE_TYPES: Record<string, { mimetypes: string[]; magic?: (buf: Buffer) => boolean }> = {
  '.png': ALLOWED_ASSET_TYPES['.png'],
  '.jpg': ALLOWED_ASSET_TYPES['.jpg'],
  '.jpeg': ALLOWED_ASSET_TYPES['.jpeg'],
};

function getExtension(filename: string): string {
  const idx = filename.lastIndexOf('.');
  return idx === -1 ? '' : filename.slice(idx).toLowerCase();
}

/**
 * Validate 1 file upload theo whitelist truyền vào. Kiểm tra CẢ extension, mimetype
 * client khai báo, LẪN magic bytes thật trong nội dung file — vì mimetype/tên file
 * là do client tự gửi lên, hoàn toàn có thể giả mạo.
 * Throw BadRequestException nếu không hợp lệ.
 */
export function validateUploadedFile(
  file: Express.Multer.File | undefined,
  allowedTypes: Record<string, { mimetypes: string[]; magic?: (buf: Buffer) => boolean }>
): void {
  if (!file) {
    throw new BadRequestException('No file uploaded');
  }

  const ext = getExtension(file.originalname);
  const rule = allowedTypes[ext];

  if (!rule) {
    throw new BadRequestException(
      `File type not allowed. Accepted: ${Object.keys(allowedTypes).join(', ')}`
    );
  }

  if (!rule.mimetypes.includes(file.mimetype)) {
    throw new BadRequestException('File content type does not match its extension');
  }

  if (rule.magic && file.buffer && !rule.magic(file.buffer)) {
    throw new BadRequestException('File content does not match its declared type (failed signature check)');
  }
}