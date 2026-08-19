import React, { useState } from 'react';
import {
  ViroARScene,
  ViroARImageMarker,
  ViroARTrackingTargets,
  Viro3DObject,
  ViroAmbientLight,
  ViroSpotLight,
} from '@reactvision/react-viro';
import { PublicProject } from '../types/ar';

const TRACKING_TARGET_NAME = 'active_project_trigger';

// Kích thước "danh nghĩa" cố định cho MỌI project, không phải kích thước thật.
// Coi trigger image luôn là 1 đơn vị chiều rộng — designer định vị/scale asset
// TƯƠNG ĐỐI theo đơn vị này (0.5 = bằng nửa chiều rộng ảnh trigger), không phải mét
// tuyệt đối. Nhờ vậy overlay luôn hiện đúng tỉ lệ trên camera dù ảnh được in/hiển
// thị ở kích thước thật bất kỳ (giống cách Artivive/MindAR hoạt động).
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

const getViroObjectType = (filename: string): 'GLB' | 'OBJ' | 'VRX' => {
  const ext = filename.toLowerCase().split('.').pop();
  if (ext === 'obj') return 'OBJ';
  if (ext === 'vrx') return 'VRX';
  return 'GLB'; // mặc định glb/gltf-binary
};

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
        {isFound &&
          project.assets.map((asset) => (
            <Viro3DObject
              key={asset.id}
              source={{ uri: asset.url }}
              type={getViroObjectType(asset.filename)}
              position={
                asset.transform
                  ? [asset.transform.position.x, asset.transform.position.y, asset.transform.position.z]
                  : [0, 0, 0]
              }
              scale={
                asset.transform
                  ? [asset.transform.scale.x, asset.transform.scale.y, asset.transform.scale.z]
                  : [1, 1, 1]
              }
              rotation={
                asset.transform
                  ? [asset.transform.rotation.x, asset.transform.rotation.y, asset.transform.rotation.z]
                  : [0, 0, 0]
              }
            />
          ))}
      </ViroARImageMarker>
    </ViroARScene>
  );
};

export default ARSceneContent;