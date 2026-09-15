import { useState } from 'react';
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

    /**
     * Lưu transform của TẤT CẢ asset trong project — KHÔNG điều hướng, dùng lại được ở nhiều nơi
     * (Done, Publish, Ctrl+S). Trước đây hàm này chỉ lưu asset đang active; nếu user kéo/scale
     * nhiều asset khác nhau trong cùng phiên rồi bấm Done, các asset không active lúc đó bị mất
     * transform khi tải lại trang (chưa từng được PATCH lên server) — sửa lại lưu toàn bộ.
     */
    const saveTransform = async () => {
        if (!token || !id || assets.length === 0) return;

        setSaveStatus('saving');

        const results = await Promise.all(
            assets.map((asset) =>
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