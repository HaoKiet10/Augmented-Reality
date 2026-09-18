import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { API_URL } from '../constants';
import type { Asset, AssetTransform, SaveStatus } from '../types';

interface UseSpatialSaveParams {
    id: string | undefined;
    assets: Asset[];
}

const FALLBACK_TRANSFORM: AssetTransform = {
    position: { x: 0, y: 0.8, z: -2 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
};

export function useSpatialSave({ id, assets }: UseSpatialSaveParams) {
    const { token, authFetch } = useAuth();
    const navigate = useNavigate();
    const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

    // "Baseline" — transform của lần lưu (hoặc lần tải) gần nhất cho từng asset, dùng để so sánh
    // xem asset nào THẬT SỰ đổi transform trước khi PATCH. Trước đây saveTransform() luôn gửi
    // PATCH cho TẤT CẢ asset trong project mỗi lần lưu/autosave, kể cả asset không đổi gì — với
    // project nhiều asset, 30s autosave 1 lần sẽ tạo ra N request thừa liên tục. Dùng useRef (không
    // phải state) vì đây là dữ liệu "sổ sách" nội bộ, không cần trigger re-render khi đổi.
    const lastSavedRef = useRef<Map<string, string>>(new Map());

    // Ghi nhận baseline cho asset MỚI xuất hiện (tải trang lần đầu, vừa upload, vừa nhân bản) —
    // đúng lúc đó transform hiện tại của asset CHÍNH LÀ transform đã lưu trên server rồi, nên coi
    // là "sạch". Chỉ ghi cho id CHƯA có trong map — không đụng tới asset đã có baseline, để không
    // xoá mất trạng thái "dirty" đang chờ lưu của nó (effect này chạy lại mỗi khi mảng `assets`
    // đổi, kể cả lúc đang kéo/scale asset khác).
    useEffect(() => {
        assets.forEach((asset) => {
            if (!lastSavedRef.current.has(asset.id)) {
                lastSavedRef.current.set(asset.id, JSON.stringify(asset.transform ?? FALLBACK_TRANSFORM));
            }
        });
    }, [assets]);

    /**
     * Lưu transform của những asset THẬT SỰ thay đổi kể từ lần lưu gần nhất — KHÔNG điều hướng,
     * dùng lại được ở nhiều nơi (Done, Publish, Ctrl+S, autosave 30s). Trước đây hàm này lưu TOÀN
     * BỘ asset mỗi lần gọi; nếu user kéo/scale nhiều asset khác nhau trong cùng phiên rồi bấm Done,
     * các asset không active lúc đó bị mất transform khi tải lại trang (chưa từng được PATCH lên
     * server) — sửa lại lưu toàn bộ asset ĐÃ ĐỔI (so với bản đã lưu), thay vì lưu asset active hay
     * lưu tất cả bất kể có đổi hay không.
     */
    const saveTransform = async () => {
        if (!token || !id || assets.length === 0) return;

        const dirtyAssets = assets.filter(
            (asset) => JSON.stringify(asset.transform ?? FALLBACK_TRANSFORM) !== lastSavedRef.current.get(asset.id)
        );
        if (dirtyAssets.length === 0) return; // không có gì đổi — khỏi tốn request

        setSaveStatus('saving');

        const results = await Promise.all(
            dirtyAssets.map((asset) =>
                authFetch(`${API_URL}/projects/${id}/assets/${asset.id}/transform`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(asset.transform ?? FALLBACK_TRANSFORM),
                })
            )
        );

        if (results.some((res) => !res.ok)) {
            setSaveStatus('error');
            throw new Error('Failed to save transform, please try again.');
        }

        // Chỉ cập nhật baseline cho đúng những asset vừa PATCH thành công — asset khác (không đổi
        // gì, không nằm trong dirtyAssets) giữ nguyên baseline cũ, không ảnh hưởng gì.
        dirtyAssets.forEach((asset) => {
            lastSavedRef.current.set(asset.id, JSON.stringify(asset.transform ?? FALLBACK_TRANSFORM));
        });

        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 3000);
    };

    /** Nút "Done" — lưu xong thì quay về dashboard. */
    const handleSaveConfig = async () => {
        try {
            await saveTransform();
            navigate('/dashboard');
        } catch (err: any) {
            console.error(err);
        }
    };

    return { saveStatus, handleSaveConfig, saveTransform };
}