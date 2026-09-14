import { useEffect } from 'react';
import type { Asset, AssetTransform } from '../types';
import { DEFAULT_SPATIAL_CONFIG } from '../constants';

interface UseAssetKeyboardShortcutsParams {
    assets: Asset[];
    activeAsset: Asset | null;
    onSelectAsset: (asset: Asset | null) => void;
    onTransformChange: (assetId: string, transform: AssetTransform) => void;
    onDeleteAsset: (assetId: string) => void;
    onDuplicateAsset: (assetId: string) => void;
}

// Đơn vị position là TỈ LỆ TƯƠNG ĐỐI so với chiều rộng trigger image (xem asset.service.ts
// backend) — 0.01 ~ 1% chiều rộng marker, 0.05 ~ 5% khi giữ Shift để nhích nhanh hơn.
const NUDGE_STEP = 0.01;
const NUDGE_STEP_FAST = 0.05;

function isTypingInField(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false;
    const tag = target.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}

/**
 * Phím tắt thao tác asset trong màn Design:
 * - Delete: xoá asset đang chọn
 * - Escape: bỏ chọn
 * - Mũi tên: nhích vị trí asset đang chọn trên mặt phẳng marker (X/Z), giữ Shift = nhích nhanh
 * - Ctrl/Cmd + D: nhân bản asset đang chọn
 * - Tab / Shift+Tab: chuyển qua asset kế tiếp/trước đó trong danh sách
 *
 * Cố ý KHÔNG dùng Backspace để xoá asset (dù là phím xoá quen thuộc): các bộ gõ tiếng Việt
 * Telex (Unikey...) tự ý bắn ra 1 sự kiện Backspace thật ở tầng hệ thống khi ghép 1 số ký tự
 * (vd. gõ 'w' đứng riêng ra chữ "ư") — kể cả khi không hề có field nào đang focus. Nếu bind
 * theo Backspace, chỉ cần bật Unikey và gõ 'w' lúc đang bay camera là asset bị xoá oan.
 *
 * Tất cả đều bị bỏ qua khi đang gõ trong 1 field (input/textarea/select/contentEditable) —
 * ví dụ ô rename project, ô nhập số trong Inspector — để không phá thao tác gõ chữ/số bình
 * thường của user. Riêng Tab còn bị bỏ qua nếu đang có phần tử nào khác được focus (không
 * phải <body>), để không phá luồng Tab điều hướng bằng bàn phím (accessibility) qua các nút
 * bấm/menu bình thường của trang.
 */
export function useAssetKeyboardShortcuts({
    assets,
    activeAsset,
    onSelectAsset,
    onTransformChange,
    onDeleteAsset,
    onDuplicateAsset,
}: UseAssetKeyboardShortcutsParams) {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (isTypingInField(e.target) || isTypingInField(document.activeElement)) return;

            const key = e.key;

            if (key === 'Tab') {
                // Chỉ cướp Tab khi không có phần tử nào khác đang được focus, để không phá
                // luồng Tab điều hướng bàn phím bình thường qua nút bấm/menu của trang.
                if (document.activeElement && document.activeElement !== document.body) return;
                if (assets.length === 0) return;

                e.preventDefault();
                const currentIndex = activeAsset ? assets.findIndex((a) => a.id === activeAsset.id) : -1;
                const direction = e.shiftKey ? -1 : 1;
                const nextIndex = (currentIndex + direction + assets.length) % assets.length;
                onSelectAsset(assets[nextIndex]);
                return;
            }

            if (!activeAsset) return;

            if (key === 'Delete') {
                e.preventDefault();
                onDeleteAsset(activeAsset.id);
                return;
            }

            if (key === 'Escape') {
                onSelectAsset(null);
                return;
            }

            if ((e.ctrlKey || e.metaKey) && key.toLowerCase() === 'd') {
                e.preventDefault(); // trình duyệt mặc định Ctrl+D = bookmark trang
                onDuplicateAsset(activeAsset.id);
                return;
            }

            if (key === 'ArrowLeft' || key === 'ArrowRight' || key === 'ArrowUp' || key === 'ArrowDown') {
                e.preventDefault();
                const step = e.shiftKey ? NUDGE_STEP_FAST : NUDGE_STEP;
                const current = activeAsset.transform ?? DEFAULT_SPATIAL_CONFIG;

                // Trái/phải = trục X, lên/xuống = trục Z (mặt phẳng marker — Y là chiều cao,
                // không nudge bằng phím mũi tên để tránh nhầm với thao tác kéo scale-handle).
                const deltaX = key === 'ArrowLeft' ? -step : key === 'ArrowRight' ? step : 0;
                const deltaZ = key === 'ArrowUp' ? -step : key === 'ArrowDown' ? step : 0;

                onTransformChange(activeAsset.id, {
                    ...current,
                    position: {
                        x: current.position.x + deltaX,
                        y: current.position.y,
                        z: current.position.z + deltaZ,
                    },
                });
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [assets, activeAsset, onSelectAsset, onTransformChange, onDeleteAsset, onDuplicateAsset]);
}