import { useAuth } from '../../../context/AuthContext';
import { API_URL } from '../constants';
import type { Asset } from '../types';

interface UseAssetActionsParams {
    id: string | undefined;
    assets: Asset[];
    activeAsset: Asset | null;
    onDeleted: (assetId: string) => void;
    onRestore: (asset: Asset) => void;
    onActiveAssetCleared: () => void;
    onDuplicated?: (newAsset: Asset) => void;
    pushUndoAction: (action: { undo: () => void; redo: () => void }) => void;
}

/**
 * Xoá/nhân bản asset — cả 2 đều commit thật lên server NGAY khi bấm (không hoãn), nhưng vẫn
 * undo được an toàn vì backend dùng soft-delete: `DELETE` chỉ đánh dấu `deletedAt`, KHÔNG đụng
 * file vật lý; `POST .../restore` gỡ dấu đó ra. Nhờ vậy Ctrl+Z hoạt động đúng bất kể đã bao lâu
 * hay đã autosave bao nhiêu lần kể từ lúc xoá — không cần cơ chế "hoãn xoá tới lúc Save" nữa.
 */
export function useAssetActions({
    id,
    assets,
    activeAsset,
    onDeleted,
    onRestore,
    onActiveAssetCleared,
    onDuplicated,
    pushUndoAction,
}: UseAssetActionsParams) {
    const { token, authFetch } = useAuth();

    // `e` optional — nút X trong sidebar gọi kèm MouseEvent (cần stopPropagation để
    // không kích hoạt luôn onClick chọn asset của item cha), còn phím tắt (Delete)
    // gọi thẳng không có event chuột nào cả.
    const handleDeleteAsset = async (assetId: string, e?: React.MouseEvent) => {
        e?.stopPropagation();
        const assetToDelete = assets.find((a) => a.id === assetId);
        if (!token || !id || !assetToDelete) return;

        try {
            const response = await authFetch(`${API_URL}/projects/${id}/assets/${assetId}`, {
                method: 'DELETE',
            });
            if (!response.ok) throw new Error('Failed to delete asset');

            onDeleted(assetId);
            if (activeAsset?.id === assetId) onActiveAssetCleared();

            pushUndoAction({
                undo: () => {
                    // Soft-delete ở backend nên restore luôn khôi phục đúng file gốc — không cần
                    // re-upload/re-duplicate gì cả.
                    authFetch(`${API_URL}/projects/${id}/assets/${assetId}/restore`, { method: 'POST' })
                        .then((res) => { if (!res.ok) throw new Error('Failed to restore asset'); })
                        .catch((err) => console.error(err));
                    onRestore(assetToDelete);
                },
                redo: () => {
                    authFetch(`${API_URL}/projects/${id}/assets/${assetId}`, { method: 'DELETE' }).catch((err) =>
                        console.error(err)
                    );
                    onDeleted(assetId);
                    if (activeAsset?.id === assetId) onActiveAssetCleared();
                },
            });
        } catch (err: any) {
            console.error(err);
            alert('Failed to delete asset.');
        }
    };

    const duplicateAssetRequest = async (assetId: string): Promise<Asset | null> => {
        if (!token || !id) return null;
        const response = await authFetch(`${API_URL}/projects/${id}/assets/${assetId}/duplicate`, {
            method: 'POST',
        });
        if (!response.ok) throw new Error('Failed to duplicate asset');
        return response.json();
    };

    const handleDuplicateAsset = async (assetId: string) => {
        if (!token || !id) return;

        try {
            const newAsset = await duplicateAssetRequest(assetId);
            if (!newAsset) return;
            onDuplicated?.(newAsset);

            pushUndoAction({
                undo: () => {
                    // Bản sao vừa tạo chưa ai kịp sửa gì — xoá thật (soft-delete) ngay cũng an toàn.
                    authFetch(`${API_URL}/projects/${id}/assets/${newAsset.id}`, { method: 'DELETE' }).catch(
                        (err) => console.error('Failed to remove duplicated asset:', err)
                    );
                    onDeleted(newAsset.id);
                },
                redo: () => {
                    // Redo = tạo lại 1 bản sao MỚI của asset gốc — id vật lý khác bản đã bị undo,
                    // nhưng kết quả với user là tương đương.
                    duplicateAssetRequest(assetId)
                        .then((redoneAsset) => {
                            if (redoneAsset) onDuplicated?.(redoneAsset);
                        })
                        .catch((err) => console.error('Failed to redo duplicate:', err));
                },
            });
        } catch (err: any) {
            console.error(err);
            alert('Failed to duplicate asset.');
        }
    };

    return { handleDeleteAsset, handleDuplicateAsset };
}