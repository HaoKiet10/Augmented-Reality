export const API_URL = 'http://localhost:3000';

/** Giới hạn dung lượng tổng cộng cho mỗi project (5 MB) */
export const MAX_PROJECT_SIZE_MB = 5.0;
export const MAX_PROJECT_SIZE_BYTES = MAX_PROJECT_SIZE_MB * 1024 * 1024;

export const MODEL_EXTENSIONS = ['.glb', '.gltf'] as const;
export const VIDEO_EXTENSIONS = ['.mp4', '.webm'] as const;
export const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.svg'] as const;

/** Dùng cho thuộc tính `accept` của input file */
export const ACCEPTED_FILE_EXTENSIONS = [
    ...MODEL_EXTENSIONS,
    ...VIDEO_EXTENSIONS,
    ...IMAGE_EXTENSIONS,
].join(',');

export const DEFAULT_SPATIAL_CONFIG = {
    position: { x: 0, y: 0.8, z: -2 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
};