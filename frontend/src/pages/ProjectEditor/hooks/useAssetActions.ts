import { useAuth } from '../../../context/AuthContext';
import { API_URL } from '../constants';
import type { Asset } from '../types';

interface UseAssetActionsParams {
    id: string | undefined;
    activeAsset: Asset | null;
    onDeleted: (assetId: string) => void;
    onActiveAssetCleared: () => void;
}

export function useAssetActions({
    id,
    activeAsset,
    onDeleted,
    onActiveAssetCleared,
}: UseAssetActionsParams) {
    const { token, authFetch } = useAuth();

    const handleDeleteAsset = async (assetId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!token || !id) return;

        if (!window.confirm('Are you sure you want to delete this asset?')) return;

        try {
            const response = await authFetch(`${API_URL}/projects/${id}/assets/${assetId}`, {
                method: 'DELETE',
            });

            if (!response.ok) throw new Error('Failed to delete asset');

            onDeleted(assetId);
            if (activeAsset?.id === assetId) {
                onActiveAssetCleared();
            }
        } catch (err: any) {
            console.error(err);
            alert('Failed to delete asset.');
        }
    };

    return { handleDeleteAsset };
}