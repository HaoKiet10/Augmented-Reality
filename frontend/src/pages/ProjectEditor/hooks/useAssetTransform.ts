import { useCallback, useState } from 'react';
import type { Asset, AssetTransform, Axis, SpatialVector } from '../types';
import { DEFAULT_SPATIAL_CONFIG } from '../constants';

interface UseAssetTransformParams {
    activeAsset: Asset | null;
    onTransformChange: (assetId: string, transform: AssetTransform) => void;
}

const FALLBACK_TRANSFORM: AssetTransform = {
    position: { ...DEFAULT_SPATIAL_CONFIG.position },
    rotation: { ...DEFAULT_SPATIAL_CONFIG.rotation },
    scale: { ...DEFAULT_SPATIAL_CONFIG.scale },
};

/**
 * Quản lý transform (position/rotation/scale) của asset ĐANG ACTIVE.
 * Mọi thay đổi áp trực tiếp lên `activeAsset.transform` thông qua `onTransformChange`,
 * nên khi user đổi sang asset khác, các input tự động phản ánh đúng transform của asset đó.
 */
export function useAssetTransform({ activeAsset, onTransformChange }: UseAssetTransformParams) {
    const transform = activeAsset?.transform ?? FALLBACK_TRANSFORM;

    // Cờ UI cục bộ — không thuộc về data transform, không lưu DB.
    const [uniformScale, setUniformScale] = useState(true);

    const updateVector = useCallback(
        (key: 'position' | 'rotation' | 'scale', axis: Axis, val: number) => {
            if (!activeAsset) return;
            const current = activeAsset.transform ?? FALLBACK_TRANSFORM;
            const nextVector: SpatialVector = { ...current[key], [axis]: val };
            onTransformChange(activeAsset.id, { ...current, [key]: nextVector });
        },
        [activeAsset, onTransformChange]
    );

    const setPosX = (val: number) => updateVector('position', 'x', val);
    const setPosY = (val: number) => updateVector('position', 'y', val);
    const setPosZ = (val: number) => updateVector('position', 'z', val);

    const setRotX = (val: number) => updateVector('rotation', 'x', val);
    const setRotY = (val: number) => updateVector('rotation', 'y', val);
    const setRotZ = (val: number) => updateVector('rotation', 'z', val);

    const updateScale = useCallback(
        (axis: Axis, val: number) => {
            if (!activeAsset) return;
            const current = activeAsset.transform ?? FALLBACK_TRANSFORM;

            if (uniformScale) {
                onTransformChange(activeAsset.id, { ...current, scale: { x: val, y: val, z: val } });
                return;
            }
            updateVector('scale', axis, val);
        },
        [activeAsset, onTransformChange, uniformScale, updateVector]
    );

    const resetConfig = useCallback(() => {
        if (!activeAsset) return;
        onTransformChange(activeAsset.id, {
            position: { ...DEFAULT_SPATIAL_CONFIG.position },
            rotation: { ...DEFAULT_SPATIAL_CONFIG.rotation },
            scale: { ...DEFAULT_SPATIAL_CONFIG.scale },
        });
        setUniformScale(true);
    }, [activeAsset, onTransformChange]);

    return {
        posX: transform.position.x, posY: transform.position.y, posZ: transform.position.z,
        setPosX, setPosY, setPosZ,
        rotX: transform.rotation.x, rotY: transform.rotation.y, rotZ: transform.rotation.z,
        setRotX, setRotY, setRotZ,
        scaleX: transform.scale.x, scaleY: transform.scale.y, scaleZ: transform.scale.z,
        uniformScale, setUniformScale,
        updateScale,
        resetConfig,
    };
}