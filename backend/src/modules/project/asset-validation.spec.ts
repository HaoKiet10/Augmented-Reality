import { BadRequestException } from '@nestjs/common';
import {
  validateUploadedFile,
  ALLOWED_ASSET_TYPES,
  ALLOWED_TRIGGER_IMAGE_TYPES,
} from './asset-validation';

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const JPEG_MAGIC = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
const GLB_MAGIC = Buffer.concat([Buffer.from('glTF', 'ascii'), Buffer.alloc(4)]);
const WEBM_MAGIC = Buffer.from([0x1a, 0x45, 0xdf, 0xa3]);
const MP4_MAGIC = Buffer.concat([Buffer.alloc(4), Buffer.from('ftyp', 'ascii')]);

const makeFile = (overrides: Partial<Express.Multer.File> = {}): Express.Multer.File => ({
  fieldname: 'file',
  originalname: 'file.png',
  encoding: '7bit',
  mimetype: 'image/png',
  buffer: PNG_MAGIC,
  size: PNG_MAGIC.length,
  stream: undefined as any,
  destination: '',
  filename: '',
  path: '',
  ...overrides,
});

describe('validateUploadedFile', () => {
  it('throw BadRequestException khi không có file', () => {
    expect(() => validateUploadedFile(undefined, ALLOWED_ASSET_TYPES)).toThrow(BadRequestException);
  });

  it('throw BadRequestException khi extension không nằm trong whitelist', () => {
    const file = makeFile({ originalname: 'malware.exe', mimetype: 'application/octet-stream' });

    expect(() => validateUploadedFile(file, ALLOWED_ASSET_TYPES)).toThrow(BadRequestException);
  });

  it('từ chối .svg dù được đặt tên/mimetype hợp lệ (chặn stored XSS qua SVG)', () => {
    const file = makeFile({ originalname: 'icon.svg', mimetype: 'image/svg+xml', buffer: Buffer.from('<svg></svg>') });

    expect(() => validateUploadedFile(file, ALLOWED_ASSET_TYPES)).toThrow(BadRequestException);
  });

  it('throw khi mimetype không khớp với extension (giả mạo Content-Type)', () => {
    const file = makeFile({ originalname: 'file.png', mimetype: 'application/pdf' });

    expect(() => validateUploadedFile(file, ALLOWED_ASSET_TYPES)).toThrow(
      'File content type does not match its extension',
    );
  });

  it('throw khi magic bytes không khớp nội dung thật (đổi đuôi .exe -> .png)', () => {
    const file = makeFile({
      originalname: 'renamed.png',
      mimetype: 'image/png',
      buffer: Buffer.from('MZ\x90\x00this-is-actually-an-exe'), // magic bytes của .exe
    });

    expect(() => validateUploadedFile(file, ALLOWED_ASSET_TYPES)).toThrow(
      'failed signature check',
    );
  });

  it('pass khi file .png hợp lệ (extension + mimetype + magic bytes khớp nhau)', () => {
    const file = makeFile();

    expect(() => validateUploadedFile(file, ALLOWED_ASSET_TYPES)).not.toThrow();
  });

  it('pass khi file .jpg hợp lệ', () => {
    const file = makeFile({ originalname: 'photo.jpg', mimetype: 'image/jpeg', buffer: JPEG_MAGIC });

    expect(() => validateUploadedFile(file, ALLOWED_ASSET_TYPES)).not.toThrow();
  });

  it('pass khi file .glb hợp lệ (asset 3D)', () => {
    const file = makeFile({
      originalname: 'model.glb',
      mimetype: 'model/gltf-binary',
      buffer: GLB_MAGIC,
    });

    expect(() => validateUploadedFile(file, ALLOWED_ASSET_TYPES)).not.toThrow();
  });

  it('throw khi .gltf có nội dung không phải JSON hợp lệ', () => {
    const file = makeFile({
      originalname: 'model.gltf',
      mimetype: 'model/gltf+json',
      buffer: Buffer.from('{ not valid json'),
    });

    expect(() => validateUploadedFile(file, ALLOWED_ASSET_TYPES)).toThrow(BadRequestException);
  });

  it('pass khi .gltf là JSON hợp lệ', () => {
    const file = makeFile({
      originalname: 'model.gltf',
      mimetype: 'model/gltf+json',
      buffer: Buffer.from(JSON.stringify({ asset: { version: '2.0' } })),
    });

    expect(() => validateUploadedFile(file, ALLOWED_ASSET_TYPES)).not.toThrow();
  });

  it('pass khi file .webm và .mp4 hợp lệ', () => {
    const webm = makeFile({ originalname: 'clip.webm', mimetype: 'video/webm', buffer: WEBM_MAGIC });
    const mp4 = makeFile({ originalname: 'clip.mp4', mimetype: 'video/mp4', buffer: MP4_MAGIC });

    expect(() => validateUploadedFile(webm, ALLOWED_ASSET_TYPES)).not.toThrow();
    expect(() => validateUploadedFile(mp4, ALLOWED_ASSET_TYPES)).not.toThrow();
  });

  describe('ALLOWED_TRIGGER_IMAGE_TYPES', () => {
    it('chỉ chấp nhận ảnh raster (png/jpg/jpeg), từ chối video và model 3D', () => {
      const mp4 = makeFile({ originalname: 'clip.mp4', mimetype: 'video/mp4', buffer: MP4_MAGIC });
      const glb = makeFile({ originalname: 'model.glb', mimetype: 'model/gltf-binary', buffer: GLB_MAGIC });

      expect(() => validateUploadedFile(mp4, ALLOWED_TRIGGER_IMAGE_TYPES)).toThrow(BadRequestException);
      expect(() => validateUploadedFile(glb, ALLOWED_TRIGGER_IMAGE_TYPES)).toThrow(BadRequestException);
    });

    it('pass với ảnh png hợp lệ cho trigger image', () => {
      const file = makeFile();

      expect(() => validateUploadedFile(file, ALLOWED_TRIGGER_IMAGE_TYPES)).not.toThrow();
    });
  });
});
