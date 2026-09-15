import { useCallback, useRef } from 'react';
import type { Asset } from '../types';

const MAX_HISTORY = 50;

type HistoryEntry =
    | { kind: 'snapshot'; assets: Asset[] }
    | { kind: 'action'; undo: () => void; redo: () => void };

/**
 * Undo/Redo cho các thay đổi trong Design editor.
 *
 * Có 2 loại entry:
 * - 'snapshot': dùng cho thay đổi TRANSFORM (kéo/scale/nudge/Inspector) — chỉ cần lưu lại toàn
 *   bộ `assets` TRƯỚC khi đổi, undo/redo = setAssets thẳng snapshot đó. Đơn giản vì transform chỉ
 *   đổi state cục bộ, không đụng server cho tới lúc Save.
 * - 'action': dùng cho XOÁ/NHÂN BẢN asset — 2 thao tác này có tác dụng phụ thật (xoá file khỏi
 *   storage, tạo record DB mới) nên không thể chỉ "phục hồi state cũ" là xong; nơi gọi
 *   (useAssetActions) tự định nghĩa cách undo/redo đúng đắn cho từng trường hợp (xem file đó).
 */
export function useUndoRedo(assets: Asset[], setAssets: React.Dispatch<React.SetStateAction<Asset[]>>) {
    const undoStack = useRef<HistoryEntry[]>([]);
    const redoStack = useRef<HistoryEntry[]>([]);
    // Giữ tham chiếu `assets` mới nhất mà không cần đưa vào dependency array của các callback bên
    // dưới — tránh phải tạo lại snapshot/undo/redo mỗi lần assets đổi (chúng đổi liên tục lúc kéo).
    const assetsRef = useRef(assets);
    assetsRef.current = assets;

    const clone = (list: Asset[]): Asset[] => JSON.parse(JSON.stringify(list));

    /** Gọi TRƯỚC khi bắt đầu 1 thay đổi transform rời rạc (đầu gesture kéo, focus vào ô số...). */
    const snapshot = useCallback(() => {
        undoStack.current.push({ kind: 'snapshot', assets: clone(assetsRef.current) });
        if (undoStack.current.length > MAX_HISTORY) undoStack.current.shift();
        redoStack.current = [];
    }, []);

    /** Đăng ký 1 hành động có logic undo/redo riêng (xoá/nhân bản asset) — xem useAssetActions.ts. */
    const pushAction = useCallback((action: { undo: () => void; redo: () => void }) => {
        undoStack.current.push({ kind: 'action', ...action });
        if (undoStack.current.length > MAX_HISTORY) undoStack.current.shift();
        redoStack.current = [];
    }, []);

    const undo = useCallback(() => {
        const entry = undoStack.current.pop();
        if (!entry) return;
        if (entry.kind === 'snapshot') {
            redoStack.current.push({ kind: 'snapshot', assets: clone(assetsRef.current) });
            setAssets(entry.assets);
        } else {
            entry.undo();
            redoStack.current.push(entry);
        }
    }, [setAssets]);

    const redo = useCallback(() => {
        const entry = redoStack.current.pop();
        if (!entry) return;
        if (entry.kind === 'snapshot') {
            undoStack.current.push({ kind: 'snapshot', assets: clone(assetsRef.current) });
            setAssets(entry.assets);
        } else {
            entry.redo();
            undoStack.current.push(entry);
        }
    }, [setAssets]);

    return { snapshot, pushAction, undo, redo };
}