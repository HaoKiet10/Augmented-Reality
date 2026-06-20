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

    const handleSaveConfig = async () => {
        if (!token || !id || !activeAsset) return;

        const transform: AssetTransform = activeAsset.transform ?? {
            position: { x: 0, y: 0.8, z: -2 },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 },
        };

        try {
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

            if (!response.ok) throw new Error('Failed to save transform');

            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 3000);
            navigate('/dashboard');
        } catch (err: any) {
            console.error(err);
            setSaveStatus('error');
        }
    };

    return { saveStatus, handleSaveConfig };
}