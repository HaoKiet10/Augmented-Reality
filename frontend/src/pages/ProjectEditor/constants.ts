export { API_URL } from '../../config';

/** Giới hạn dung lượng tổng cộng cho mỗi project (5 MB) */
export const MAX_PROJECT_SIZE_MB = 5.0;
export const MAX_PROJECT_SIZE_BYTES = MAX_PROJECT_SIZE_MB * 1024 * 1024;

export const MODEL_EXTENSIONS = ['.glb', '.gltf'] as const;
export const VIDEO_EXTENSIONS = ['.mp4', '.webm'] as const;
export const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg'] as const;

/** Dùng cho thuộc tính `accept` của input file */
export const ACCEPTED_FILE_EXTENSIONS = [
    ...MODEL_EXTENSIONS,
    ...VIDEO_EXTENSIONS,
    ...IMAGE_EXTENSIONS,
].join(',');

/**
 * QUY ƯỚC KHÔNG GIAN (editor <-> mobile) — nguồn sự thật duy nhất:
 * - Gốc toạ độ (0,0,0) = TÂM ảnh trigger. Ảnh trigger là mặt phẳng XY đứng thẳng (z = 0),
 *   x sang phải, y hướng lên (cạnh trên ảnh), z hướng ra phía người xem.
 * - 1 đơn vị = 100% BỀ RỘNG ảnh trigger (nên ảnh trigger luôn rộng đúng 1 đơn vị trong editor).
 *   Mobile nhân với bề rộng danh nghĩa (mét) khi dựng AR.
 * - Asset mới đặt ở tâm ảnh, nhô ra trước mặt phẳng một chút (z = 0.02) để không bị z-fight.
 */
export const MARKER_PLANE_WIDTH = 1;

export const DEFAULT_SPATIAL_CONFIG = {
    position: { x: 0, y: 0, z: 0.02 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
};