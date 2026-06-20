import { useRef, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { API_URL, MAX_PROJECT_SIZE_BYTES, MAX_PROJECT_SIZE_MB } from '../constants';
import type { Asset } from '../types';
import { isSupportedUploadFile } from '../utils/assetType';
import { bytesToMB, formatMB } from '../utils/format';

interface UseAssetUploadParams {
    id: string | undefined;
    totalSizeBytes: number;
    onUploaded: (asset: Asset) => void;
    onError: (message: string) => void;
}

export function useAssetUpload({ id, totalSizeBytes, onUploaded, onError }: UseAssetUploadParams) {
    const { token, authFetch } = useAuth();
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0 || !id || !token) return;

        const file = files[0];

        if (!isSupportedUploadFile(file.name)) {
            alert('Invalid file format. Supported formats: 3D Models (.glb, .gltf), Videos (.mp4, .webm), and Images (.png, .jpg, .jpeg, .svg).');
            return;
        }

        const nextTotalSize = totalSizeBytes + file.size;
        if (nextTotalSize > MAX_PROJECT_SIZE_BYTES) {
            alert(
                `Upload blocked. The file exceeds the project's ${MAX_PROJECT_SIZE_MB.toFixed(1)} MB size limit. ` +
                `Current: ${formatMB(totalSizeBytes)} MB. New: ${bytesToMB(file.size).toFixed(2)} MB.`
            );
            return;
        }

        try {
            setUploading(true);
            onError('');

            const formData = new FormData();
            formData.append('file', file);

            const response = await authFetch(`${API_URL}/projects/${id}/assets`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'File upload failed');
            }

            const newAsset: Asset = await response.json();
            onUploaded(newAsset);
        } catch (err: any) {
            console.error(err);
            onError(err.message || 'File upload failed.');
        } finally {
            setUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    return { uploading, fileInputRef, handleFileUpload };
}