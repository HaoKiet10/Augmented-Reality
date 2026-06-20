import { IMAGE_EXTENSIONS, MODEL_EXTENSIONS, VIDEO_EXTENSIONS } from '../constants';

const hasExtension = (filename: string, extensions: readonly string[]): boolean =>
    extensions.some((ext) => filename.toLowerCase().endsWith(ext));

/**
 * Kiểm tra theo TÊN FILE (đuôi mở rộng). Dùng khi validate file trước khi upload,
 * lúc chưa có `fileType` từ server.
 */
export const isModelFilename = (filename: string): boolean =>
    hasExtension(filename, MODEL_EXTENSIONS);

export const isVideoFilename = (filename: string): boolean =>
    hasExtension(filename, VIDEO_EXTENSIONS);

export const isImageFilename = (filename: string): boolean =>
    hasExtension(filename, IMAGE_EXTENSIONS);

/**
 * Kiểm tra theo MIME type (fileType) trả về từ server, có fallback theo tên file.
 * Dùng cho asset đã tồn tại trong hệ thống (hiển thị icon, chọn renderer AR...).
 */
export const isVideoAsset = (fileType: string, filename?: string): boolean =>
    fileType.includes('video') || (!!filename && isVideoFilename(filename));

export const isImageAsset = (fileType: string, filename?: string): boolean =>
    fileType.includes('image') || (!!filename && isImageFilename(filename));

/** Validate file trước khi upload: phải là model, video, hoặc image hợp lệ */
export const isSupportedUploadFile = (filename: string): boolean =>
    isModelFilename(filename) || isVideoFilename(filename) || isImageFilename(filename);