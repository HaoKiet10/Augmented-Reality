import type { Asset, SpatialVector } from '../../types';
import { isImageAsset, isVideoAsset } from '../../utils/assetType';

interface ArSceneProps {
    activeAsset: Asset;
    position: SpatialVector;
    rotation: SpatialVector;
    scale: SpatialVector;
}

export function ArScene({ activeAsset, position, rotation, scale }: ArSceneProps) {
    const isActiveVideo = isVideoAsset(activeAsset.fileType, activeAsset.filename);
    const isActiveImage = isImageAsset(activeAsset.fileType, activeAsset.filename);

    return (
        <>
            {/* HTML Video Asset if active */}
            <div style={{ display: 'none' }}>
                <a-assets>
                    {isActiveVideo && (
                        <video
                            key={activeAsset.id}
                            id="ar-video-src"
                            src={activeAsset.url}
                            autoPlay
                            loop
                            muted
                            playsInline
                            crossOrigin="anonymous"
                        />
                    )}
                </a-assets>
            </div>

            {/* A-Frame Scene */}
            <a-scene embedded className="w-full h-full" vr-mode-ui="enabled: false">
                {/* Environment & Floor */}
                <a-plane
                    position="0 0 0"
                    rotation="-90 0 0"
                    width="30"
                    height="30"
                    color="#2c3e50"
                    opacity="0.3"
                ></a-plane>
                <a-sky color="#0d0e12"></a-sky>

                {/* Lights */}
                <a-entity light="type: ambient; color: #BBB"></a-entity>
                <a-entity light="type: directional; color: #FFF; intensity: 0.6" position="-0.5 1 1"></a-entity>

                {/* Dynamic Preview Target — `key` buộc React unmount/remount khi đổi asset,
            vì A-Frame không tự refresh src/geometry khi props thay đổi trên element cũ. */}
                <a-entity
                    key={activeAsset.id}
                    id="preview-target"
                    position={`${position.x} ${position.y} ${position.z}`}
                    rotation={`${rotation.x} ${rotation.y} ${rotation.z}`}
                    scale={`${scale.x} ${scale.y} ${scale.z}`}
                >
                    {isActiveVideo ? (
                        <a-video src="#ar-video-src" width="1.6" height="0.9" material="side: double"></a-video>
                    ) : isActiveImage ? (
                        <a-image src={activeAsset.url} width="1.6" height="1.6" material="side: double"></a-image>
                    ) : (
                        <a-gltf-model src={activeAsset.url}></a-gltf-model>
                    )}
                </a-entity>

                {/* Grid indicator to help align */}
                <a-entity position="0 0.01 0" rotation="90 0 0" class="grid-helper">
                    <a-plane width="10" height="10" color="#ffffff" opacity="0.05" material="wireframe: true"></a-plane>
                </a-entity>

                {/* Camera controls */}
                <a-camera position="0 1.6 0" look-controls="enabled: true" wasd-controls="enabled: true"></a-camera>
            </a-scene>
        </>
    );
}