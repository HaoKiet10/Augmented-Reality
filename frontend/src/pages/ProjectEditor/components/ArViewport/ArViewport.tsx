import { Box } from 'lucide-react';
import type { Asset } from '../../types';
import { ArScene } from './ArScene';
import { ArStatusBadge } from './ArStatusBadge';

interface ArViewportProps {
    aframeLoaded: boolean;
    assets: Asset[];
    activeAssetId: string | null;
    onSelectAsset: (assetId: string) => void;
}

export function ArViewport({ aframeLoaded, assets, activeAssetId, onSelectAsset }: ArViewportProps) {
    const activeAsset = assets.find((a) => a.id === activeAssetId) ?? null;

    return (
        <main className="flex-1 bg-[#15171e] relative overflow-hidden flex flex-col justify-center items-center">
            {!aframeLoaded ? (
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-gray-400 text-sm">Rendering A-Frame Graphics Engine...</p>
                </div>
            ) : assets.length === 0 ? (
                <div className="max-w-md text-center flex flex-col items-center p-8">
                    <div className="p-4 bg-white/2 border border-white/5 rounded-full mb-4 animate-pulse">
                        <Box size={36} className="text-blue-400" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-200">AR Preview Sandbox</h3>
                    <p className="text-sm text-gray-400 mt-2 leading-relaxed">
                        Add models or video assets using the left side-panel, then select them to test their
                        layout coordinates in the mock 3D space.
                    </p>
                </div>
            ) : (
                <div className="absolute inset-0 w-full h-full">
                    <ArScene assets={assets} activeAssetId={activeAssetId} onSelectAsset={onSelectAsset} />
                    {activeAsset && <ArStatusBadge activeAsset={activeAsset} />}
                </div>
            )}
        </main>
    );
}