import { useEffect, useRef } from 'react';

/**
 * Tự động lưu định kỳ. Dùng ref để giữ `saveFn` mới nhất thay vì đưa thẳng vào dependency array
 * của effect — `saveFn` (thường là `saveTransform` bọc closure theo `assets`) đổi identity liên
 * tục lúc kéo/scale (assets đổi theo từng mousemove), nếu đưa thẳng vào dependency thì effect bị
 * dọn + lập lại interval mới mỗi lần render, khiến đồng hồ 30s không bao giờ thật sự đếm hết.
 *
 * Xoá asset không cần autosave lo (backend soft-delete, xoá commit thật ngay lúc bấm rồi) — hàm
 * này chỉ cần lo phần transform (position/rotation/scale), vốn vẫn chỉ tồn tại cục bộ cho tới khi
 * có 1 lần save nào đó (thủ công hoặc tự động) chạy.
 */
export function useAutosave(saveFn: () => Promise<void>, intervalMs = 30000) {
    const saveFnRef = useRef(saveFn);
    saveFnRef.current = saveFn;

    useEffect(() => {
        const timer = setInterval(() => {
            saveFnRef.current().catch((err) => console.error('Autosave failed:', err));
        }, intervalMs);
        return () => clearInterval(timer);
    }, [intervalMs]);
}