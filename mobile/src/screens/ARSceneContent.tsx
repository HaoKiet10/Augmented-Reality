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
  if (!project.triggerImageUrl || !project.triggerPhysicalWidth) {
    throw new Error('Project thiếu trigger image hoặc chưa khai báo kích thước thật (physicalWidth)');
  }

  ViroARTrackingTargets.createTargets({
    [TRACKING_TARGET_NAME]: {
      source: { uri: project.triggerImageUrl },
      orientation: 'Up',
      physicalWidth: project.triggerPhysicalWidth,
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
