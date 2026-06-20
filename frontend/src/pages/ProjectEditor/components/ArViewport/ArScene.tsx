import { Entity, Scene } from 'aframe-react';
import type { Asset } from '../../types';
import { isImageAsset, isVideoAsset } from '../../utils/assetType';
import { DEFAULT_SPATIAL_CONFIG } from '../../constants';

interface ArSceneProps {
    assets: Asset[];
    activeAssetId: string | null;
    onSelectAsset: (assetId: string) => void;
}

function vectorToString(v: { x: number; y: number; z: number }) {
    return `${v.x} ${v.y} ${v.z}`;
}

function AssetEntity({
    asset,
    isSelected,
    onSelect,
}: {
    asset: Asset;
    isSelected: boolean;
    onSelect: () => void;
}) {
    const isVideo = isVideoAsset(asset.fileType, asset.filename);
    const isImage = isImageAsset(asset.fileType, asset.filename);
    const transform = asset.transform ?? DEFAULT_SPATIAL_CONFIG;
    const videoElId = `ar-video-src-${asset.id}`;

    return (
        <Entity
            position={vectorToString(transform.position)}
            rotation={vectorToString(transform.rotation)}
            scale={vectorToString(transform.scale)}
            events={{ click: onSelect }}
        >
            {isVideo && (
                <Entity primitive="a-video" src={`#${videoElId}`} width="1.6" height="0.9" material="side: double" />
            )}
            {isImage && (
                <Entity primitive="a-image" src={asset.url} width="1.6" height="1.6" material="side: double" />
            )}
            {!isVideo && !isImage && <Entity primitive="a-gltf-model" src={asset.url} />}

            {isSelected && (
                <Entity
                    geometry="primitive: ring; radiusInner: 0.85; radiusOuter: 0.9"
                    material="color: #3b82f6; shader: flat; side: double"
                    position="0 0 0.01"
                />
            )}
        </Entity>
    );
}

export function ArScene({ assets, activeAssetId, onSelectAsset }: ArSceneProps) {
    const videoAssets = assets.filter((a) => isVideoAsset(a.fileType, a.filename));

    return (
        <Scene embedded className="w-full h-full" vr-mode-ui="enabled: false" cursor="rayOrigin: mouse">
            {/* <a-assets> phải là con TRỰC TIẾP của <a-scene>, không bọc div ngoài.
          A-Frame tự ẩn nó, không cần display:none thủ công. */}
            <a-assets>
                {videoAssets.map((asset) => (
                    <video
                        key={asset.id}
                        id={`ar-video-src-${asset.id}`}
                        src={asset.url}
                        autoPlay
                        loop
                        muted
                        playsInline
                        crossOrigin="anonymous"
                    />
                ))}
            </a-assets>

            {/* Environment & Floor */}
            <Entity primitive="a-plane" position="0 0 0" rotation="-90 0 0" width="30" height="30" color="#2c3e50" opacity="0.3" />
            <Entity primitive="a-sky" color="#0d0e12" />

            {/* Lights */}
            <Entity light="type: ambient; color: #BBB" />
            <Entity light="type: directional; color: #FFF; intensity: 0.6" position="-0.5 1 1" />

            {/* Render TẤT CẢ assets cùng lúc, mỗi cái với transform riêng */}
            {assets.map((asset) => (
                <AssetEntity
                    key={asset.id}
                    asset={asset}
                    isSelected={asset.id === activeAssetId}
                    onSelect={() => onSelectAsset(asset.id)}
                />
            ))}

            {/* Grid indicator to help align */}
            <Entity position="0 0.01 0" rotation="90 0 0" className="grid-helper">
                <Entity primitive="a-plane" width="10" height="10" color="#ffffff" opacity="0.05" material="wireframe: true" />
            </Entity>

            {/* Camera controls */}
            <Entity primitive="a-camera" position="0 1.6 0" look-controls="enabled: true" wasd-controls="enabled: true" />
        </Scene>
    );
}