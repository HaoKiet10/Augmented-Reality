import { useState, memo } from 'react';
import { Entity, Scene } from 'aframe-react';
import type { Asset } from '../../types';
import { isImageAsset, isVideoAsset } from '../../utils/assetType';
import { DEFAULT_SPATIAL_CONFIG } from '../../constants';

interface ArSceneProps {
    assets: Asset[];
    activeAssetId: string | null;
    onSelectAsset: (assetId: string) => void;
    onDragAsset: (assetId: string, position: { x: number; y: number; z: number }) => void;
    onScaleAsset: (assetId: string, scale: { x: number; y: number; z: number }) => void;
}

function vectorToString(v: { x: number; y: number; z: number }) {
    return `${v.x} ${v.y} ${v.z}`;
}

/**
 * Camera tách riêng + bọc memo: component này KHÔNG nhận prop nào thay đổi theo asset,
 * nên React sẽ bỏ qua re-render nó khi ArScene re-render (do kéo/scale asset khác).
 * Nếu không tách, aframe-react sẽ gọi lại setAttribute('position', '0 1.6 0') mỗi lần
 * ArScene render lại — xoá sạch vị trí camera đã bay tới bằng WASD (free-fly-controls).
 */
const CameraRig = memo(function CameraRig() {
    return (
        <Entity
            primitive="a-camera"
            position="0 1.6 0"
            look-controls="enabled: true"
            free-fly-controls="speed: 0.08"
        />
    );
});

function AssetEntity({
    asset,
    isSelected,
    onSelect,
    onDragPosition,
    onDragStart,
    onDragEnd,
    isDragging,
    onScale,
}: {
    asset: Asset;
    isSelected: boolean;
    onSelect: () => void;
    onDragPosition: (position: { x: number; y: number; z: number }) => void;
    onDragStart: () => void;
    onDragEnd: () => void;
    isDragging: boolean;
    onScale: (scale: { x: number; y: number; z: number }) => void;
}) {
    const isVideo = isVideoAsset(asset.fileType, asset.filename);
    const isImage = isImageAsset(asset.fileType, asset.filename);
    const transform = asset.transform ?? DEFAULT_SPATIAL_CONFIG;
    const videoElId = `ar-video-src-${asset.id}`;

    const entityProps: any = {
        position: vectorToString(transform.position),
        rotation: vectorToString(transform.rotation),
        scale: vectorToString(transform.scale),
        'draggable-object': '',
        events: {
            click: onSelect,
            dragstart: onDragStart,
            dragposition: (e: any) => onDragPosition(e.detail),
            dragend: onDragEnd,
            scalevalue: (e: any) => onScale(e.detail),
        }
    };

    return (
        <Entity {...entityProps}>
            {isVideo && (
                <Entity primitive="a-video" src={`#${videoElId}`} width="1.6" height="0.9" material="side: double" />
            )}
            {isImage && (
                <Entity primitive="a-image" src={asset.url} width="1.6" height="1.6" material="side: double" />
            )}
            {!isVideo && !isImage && <Entity primitive="a-gltf-model" src={asset.url} />}

            {isSelected && (
                <>
                    {/* Vòng tròn chỉ báo đang chọn (không dùng để kéo xoay nữa — xoay dùng
                        ô số bên Inspector sidebar cho cả 3 trục, chính xác và gọn hơn). */}
                    <Entity
                        geometry="primitive: ring; radiusInner: 0.85; radiusOuter: 0.9"
                        material={`color: ${isDragging ? '#f59e0b' : '#3b82f6'}; shader: flat; side: double`}
                        rotation="-90 0 0"
                    />
                    {/* Chấm nhỏ ở rìa — kéo ra xa/gần tâm để scale đều 3 trục. */}
                    <Entity
                        scale-handle=""
                        geometry="primitive: sphere; radius: 0.06"
                        material="color: #fbbf24; shader: flat"
                        position="0.9 0 0"
                    />
                </>
            )}
        </Entity>
    );
}

export function ArScene({ assets, activeAssetId, onSelectAsset, onDragAsset, onScaleAsset }: ArSceneProps) {
    const videoAssets = assets.filter((a) => isVideoAsset(a.fileType, a.filename));
    const [draggingId, setDraggingId] = useState<string | null>(null);

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
                    onDragPosition={(pos) => onDragAsset(asset.id, pos)}
                    onDragStart={() => setDraggingId(asset.id)}
                    onDragEnd={() => setDraggingId(null)}
                    isDragging={asset.id === draggingId}
                    onScale={(scale) => onScaleAsset(asset.id, scale)}
                />
            ))}

            {/* Grid indicator to help align */}
            <Entity position="0 0.01 0" rotation="90 0 0" className="grid-helper">
                <Entity primitive="a-plane" width="10" height="10" color="#ffffff" opacity="0.05" material="wireframe: true" />
            </Entity>

            {/* Camera controls */}
            <CameraRig />
        </Scene>
    );
}