import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

import { useAframeScript } from './hooks/useAframeScript';
import { useProjectData } from './hooks/useProjectData';
import { useAssetTransform } from './hooks/useAssetTransform';
import { useAssetUpload } from './hooks/useAssetUpload';
import { useAssetActions } from './hooks/useAssetActions';
import { useSpatialSave } from './hooks/useSpatialSave';
import { useProjectRename } from './hooks/useProjectRename';

import { EditorHeader } from './components/EditorHeader';
import { AssetSidebar } from './components/AssetSidebar/AssetSidebar';
import { ArViewport } from './components/ArViewport/ArViewport';
import { InspectorSidebar } from './components/InspectorSidebar/InspectorSidebar';

import './aframe.d.ts';

export const ProjectEditor: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    useAuth();

    const aframeLoaded = useAframeScript();

    const {
        project, setProject,
        assets, setAssets,
        activeAsset, setActiveAsset,
        loading,
        error, setError,
        updateAssetTransform,
    } = useProjectData(id);

    const spatialConfig = useAssetTransform({
        activeAsset,
        onTransformChange: updateAssetTransform,
    });

    const totalSizeBytes = assets.reduce((sum, asset) => sum + asset.fileSize, 0);

    const { uploading, fileInputRef, handleFileUpload } = useAssetUpload({
        id,
        totalSizeBytes,
        onUploaded: (newAsset) => {
            setAssets((prev) => [newAsset, ...prev]);
            setActiveAsset(newAsset);
        },
        onError: (message) => setError(message || null),
    });

    const { handleDeleteAsset } = useAssetActions({
        id,
        activeAsset,
        onDeleted: (assetId) => setAssets((prev) => prev.filter((a) => a.id !== assetId)),
        onActiveAssetCleared: () => setActiveAsset(null),
    });

    const { saveStatus, handleSaveConfig } = useSpatialSave({ id, activeAsset });

    const { name, setName, isEditing, setIsEditing, handleSave, handleKeyDown } = useProjectRename({
        id,
        project,
        onProjectUpdated: setProject,
    });

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0d0e12] flex items-center justify-center text-white">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-gray-400 font-medium">Loading project workspace...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="relative min-h-screen bg-[#0d0e12] flex flex-col text-white font-sans overflow-hidden">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full filter blur-[120px] pointer-events-none"></div>

            <EditorHeader
                name={name}
                setName={setName}
                isEditing={isEditing}
                setIsEditing={setIsEditing}
                onRenameSave={handleSave}
                onRenameKeyDown={handleKeyDown}
                status={project?.status}
                saveStatus={saveStatus}
                onBack={() => navigate('/dashboard')}
                onSaveConfig={handleSaveConfig}
            />

            <div className="flex-1 flex overflow-hidden relative z-10">
                <AssetSidebar
                    assets={assets}
                    activeAsset={activeAsset}
                    totalSizeBytes={totalSizeBytes}
                    error={error}
                    onDismissError={() => setError(null)}
                    uploading={uploading}
                    fileInputRef={fileInputRef}
                    onFileUpload={handleFileUpload}
                    onSelectAsset={setActiveAsset}
                    onDeleteAsset={handleDeleteAsset}
                />

                <ArViewport
                    aframeLoaded={aframeLoaded}
                    assets={assets}
                    activeAssetId={activeAsset?.id ?? null}
                    onSelectAsset={(assetId) => {
                        const found = assets.find((a) => a.id === assetId);
                        if (found) setActiveAsset(found);
                    }}
                />

                <InspectorSidebar
                    posX={spatialConfig.posX} posY={spatialConfig.posY} posZ={spatialConfig.posZ}
                    setPosX={spatialConfig.setPosX} setPosY={spatialConfig.setPosY} setPosZ={spatialConfig.setPosZ}
                    rotX={spatialConfig.rotX} rotY={spatialConfig.rotY} rotZ={spatialConfig.rotZ}
                    setRotX={spatialConfig.setRotX} setRotY={spatialConfig.setRotY} setRotZ={spatialConfig.setRotZ}
                    scaleX={spatialConfig.scaleX} scaleY={spatialConfig.scaleY} scaleZ={spatialConfig.scaleZ}
                    updateScale={spatialConfig.updateScale}
                    uniformScale={spatialConfig.uniformScale}
                    setUniformScale={spatialConfig.setUniformScale}
                    onResetConfig={spatialConfig.resetConfig}
                />
            </div>
        </div>
    );
};