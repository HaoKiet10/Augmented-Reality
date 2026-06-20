import { useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { API_URL } from '../constants';
import type { Asset, Project } from '../types';

export function useProjectData(id: string | undefined) {
    const { token, authFetch } = useAuth();

    const [project, setProject] = useState<Project | null>(null);
    const [assets, setAssets] = useState<Asset[]>([]);
    const [activeAsset, setActiveAsset] = useState<Asset | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!token || !id) return;

        const loadData = async () => {
            try {
                setLoading(true);

                const projectRes = await authFetch(`${API_URL}/projects/${id}`);
                if (!projectRes.ok) throw new Error('Project not found');
                const projectData: Project = await projectRes.json();
                setProject(projectData);

                const assetsRes = await authFetch(`${API_URL}/projects/${id}/assets`);
                if (!assetsRes.ok) throw new Error('Failed to load assets');
                const assetsData: Asset[] = await assetsRes.json();
                setAssets(assetsData);
            } catch (err: any) {
                console.error(err);
                setError(err.message || 'Failed to initialize workspace.');
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [id, token]);

    // Tự chọn asset đầu tiên làm preview nếu chưa có asset active nào.
    useEffect(() => {
        if (assets.length > 0 && !activeAsset) {
            setActiveAsset(assets[0]);
        }
    }, [assets, activeAsset]);

    /** Cập nhật transform của 1 asset cụ thể, đồng bộ cả `assets` và `activeAsset` nếu trùng id */
    const updateAssetTransform = (assetId: string, transform: Asset['transform']) => {
        setAssets((prev) =>
            prev.map((a) => (a.id === assetId ? { ...a, transform } : a))
        );
        setActiveAsset((prev) => (prev?.id === assetId ? { ...prev, transform } : prev));
    };

    return {
        project, setProject,
        assets, setAssets,
        activeAsset, setActiveAsset,
        loading,
        error, setError,
        updateAssetTransform,
    };
}