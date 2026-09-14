import { useAuth } from '../../../context/AuthContext';
import { API_URL } from '../constants';
import type { Asset } from '../types';

interface UseAssetActionsParams {
    id: string | undefined;
    activeAsset: Asset | null;
    onDeleted: (assetId: string) => void;
    onActiveAssetCleared: () => void;
    onDuplicated?: (newAsset: Asset) => void;
}

export function useAssetActions({
    id,
    activeAsset,
    onDeleted,
    onActiveAssetCleared,
    onDuplicated,
}: UseAssetActionsParams) {
    const { token, authFetch } = useAuth();

    // `e` optional — nút X trong sidebar gọi kèm MouseEvent (cần stopPropagation để
    // không kích hoạt luôn onClick chọn asset của item cha), còn phím tắt (Delete/Backspace)
    // gọi thẳng không có event chuột nào cả.
    const handleDeleteAsset = async (assetId: string, e?: React.MouseEvent) => {
        e?.stopPropagation();
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

    const handleDuplicateAsset = async (assetId: string) => {
        if (!token || !id) return;

        try {
            const response = await authFetch(`${API_URL}/projects/${id}/assets/${assetId}/duplicate`, {
                method: 'POST',
            });

            if (!response.ok) throw new Error('Failed to duplicate asset');

            const newAsset: Asset = await response.json();
            onDuplicated?.(newAsset);
        } catch (err: any) {
            console.error(err);
            alert('Failed to duplicate asset.');
        }
    };

    return { handleDeleteAsset, handleDuplicateAsset };
}