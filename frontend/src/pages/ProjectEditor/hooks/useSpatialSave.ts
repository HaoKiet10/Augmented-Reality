import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { API_URL } from '../constants';
import type { Asset, AssetTransform, SaveStatus } from '../types';

interface UseSpatialSaveParams {
    id: string | undefined;
    activeAsset: Asset | null;
}

export function useSpatialSave({ id, activeAsset }: UseSpatialSaveParams) {
    const { token, authFetch } = useAuth();
    const navigate = useNavigate();
    const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

    /** Lưu transform của asset đang chọn — KHÔNG điều hướng, dùng lại được ở nhiều nơi (Done, Publish). */
    const saveTransform = async () => {
        if (!token || !id || !activeAsset) return;

        const transform: AssetTransform = activeAsset.transform ?? {
            position: { x: 0, y: 0.8, z: -2 },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 },
        };

        setSaveStatus('saving');
        const response = await authFetch(
            `${API_URL}/projects/${id}/assets/${activeAsset.id}/transform`,
            {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(transform),
            }
        );

        if (!response.ok) {
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