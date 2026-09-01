import React, { useState } from 'react';
import {
  ViroARScene,
  ViroARImageMarker,
  ViroARTrackingTargets,
  Viro3DObject,
  ViroImage,
  ViroVideo,
  ViroAmbientLight,
  ViroSpotLight,
} from '@reactvision/react-viro';
import { ARAsset, PublicProject, SpatialVector } from '../types/ar';

const TRACKING_TARGET_NAME = 'active_project_trigger';

// Kích thước "danh nghĩa" cố định cho MỌI project — không phải kích thước thật.
// Trigger image luôn được coi là rộng 1 đơn vị AR. Designer trên web nhập
// position/scale dưới dạng TỈ LỆ (1 = 100% chiều rộng ảnh trigger, 0.5 = 50%)
// — không cần đo kích thước thật ngoài đời. Overlay vẫn hiện đúng tỉ lệ trên
// camera dù ảnh được in/hiển thị ở kích thước thật bất kỳ (giống cách
// Artivive/MindAR hoạt động).
const NOMINAL_MARKER_WIDTH = 1.0;

interface Props {
  project: PublicProject;
  onMarkerFound: () => void;
  onMarkerLost: () => void;
}

/**
 * Đăng ký trigger image của project với ARKit/ARCore.
 * Gọi 1 LẦN DUY NHẤT trước khi ARScene mount — không gọi lại trong render loop.
 */
export function registerProjectTrigger(project: PublicProject) {
  if (!project.triggerImageUrl) {
    throw new Error('Project chưa có trigger image');
  }

  ViroARTrackingTargets.createTargets({
    [TRACKING_TARGET_NAME]: {
      source: { uri: project.triggerImageUrl },
      orientation: 'Up',
      physicalWidth: NOMINAL_MARKER_WIDTH,
      type: 'Image',
    },
  });
}

/** Quy đổi số tương đối (1 = 100% chiều rộng marker) sang đơn vị AR nội bộ */
function relativeToAR(vec: SpatialVector | undefined, fallback: [number, number, number]): [number, number, number] {
  if (!vec) return fallback;
  return [
    vec.x * NOMINAL_MARKER_WIDTH,
    vec.y * NOMINAL_MARKER_WIDTH,
    vec.z * NOMINAL_MARKER_WIDTH,
  ];
}

/** Rotation giữ nguyên đơn vị độ, không quy đổi phần trăm */
function rotationToAR(vec: SpatialVector | undefined): [number, number, number] {
  if (!vec) return [0, 0, 0];
  return [vec.x, vec.y, vec.z];
}

type AssetKind = 'model' | 'image' | 'video';

const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp']);
const VIDEO_EXTENSIONS = new Set(['mp4', 'mov', 'm4v']);

/** Nhận diện asset thuộc nhóm nào (model 3D / ảnh / video) dựa theo đuôi file.
 * Model 3D (glb/gltf/obj/vrx) là mặc định nếu không khớp ảnh/video. */
function getAssetKind(filename: string): AssetKind {
  const ext = filename.toLowerCase().split('.').pop() ?? '';
  if (IMAGE_EXTENSIONS.has(ext)) return 'image';
  if (VIDEO_EXTENSIONS.has(ext)) return 'video';
  return 'model'; // mặc định coi là model 3D (glb/obj/vrx)
}

const getViroObjectType = (filename: string): 'GLB' | 'OBJ' | 'VRX' => {
  const ext = filename.toLowerCase().split('.').pop();
  if (ext === 'obj') return 'OBJ';
  if (ext === 'vrx') return 'VRX';
  return 'GLB'; // mặc định glb/gltf-binary
};

/** Render đúng component Viro theo loại file: model 3D / ảnh / video */
function renderAsset(asset: ARAsset) {
  const position = relativeToAR(asset.transform?.position, [0, 0, 0]);
  const scale = relativeToAR(asset.transform?.scale, [1, 1, 1]);
  const rotation = rotationToAR(asset.transform?.rotation);
  const kind = getAssetKind(asset.filename);

  if (kind === 'image') {
    // ViroImage cần width/height cố định (đơn vị nội bộ) rồi mới scale theo transform,
    // width=height=1 nghĩa là ảnh vuông rộng bằng NOMINAL_MARKER_WIDTH lúc scale=[1,1,1]
    return (
      <ViroImage
        key={asset.id}
        source={{ uri: asset.url }}
        width={1}
        height={1}
        position={position}
        scale={scale}
        rotation={rotation}
      />
    );
  }

  if (kind === 'video') {
    return (
      <ViroVideo
        key={asset.id}
        source={{ uri: asset.url }}
        width={1}
        height={1}
        position={position}
        scale={scale}
        rotation={rotation}
        loop={true}
        muted={false}
      />
    );
  }

  return (
    <Viro3DObject
      key={asset.id}
      source={{ uri: asset.url }}
      type={getViroObjectType(asset.filename)}
      position={position}
      scale={scale}
      rotation={rotation}
    />
  );
}

const ARSceneContent: React.FC<Props> = ({ project, onMarkerFound, onMarkerLost }) => {
  const [isFound, setIsFound] = useState(false);

  const handleAnchorFound = () => {
    setIsFound(true);
    onMarkerFound();
  };

  const handleAnchorRemoved = () => {
    setIsFound(false);
    onMarkerLost();
  };

  return (
    <ViroARScene>
      <ViroAmbientLight color="#ffffff" intensity={300} />
      <ViroSpotLight
        innerAngle={5}
        outerAngle={45}
        direction={[0, -1, -0.2]}
        position={[0, 5, 0]}
        color="#ffffff"
        castsShadow={true}
      />

      <ViroARImageMarker
        target={TRACKING_TARGET_NAME}
        onAnchorFound={handleAnchorFound}
        onAnchorRemoved={handleAnchorRemoved}
      >
        {isFound && project.assets.map((asset) => renderAsset(asset))}
      </ViroARImageMarker>
    </ViroARScene>
  );
};

export default ARSceneContent;