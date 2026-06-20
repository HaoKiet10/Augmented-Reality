import { Box } from 'lucide-react';
import type { Asset } from '../../types';
import { AssetListItem } from './AssetListItem';

interface AssetListProps {
    assets: Asset[];
    activeAsset: Asset | null;
    onSelectAsset: (asset: Asset) => void;
    onDeleteAsset: (assetId: string, e: React.MouseEvent) => void;
}

export function AssetList({ assets, activeAsset, onSelectAsset, onDeleteAsset }: AssetListProps) {
    return (
        <div className="flex-1 flex flex-col">
            <h3 className="text-sm font-bold mb-3 tracking-wide text-gray-300 flex items-center justify-between">
                <span>ASSETS BANK</span>
                <span className="text-xs font-normal text-gray-500">({assets.length} items)</span>
            </h3>

            <div className="flex-1 overflow-y-auto max-h-[300px] pr-1 flex flex-col gap-2">
                {assets.length === 0 ? (
                    <div className="h-32 border border-white/5 border-dashed rounded-xl flex flex-col items-center justify-center text-center p-4">
                        <Box size={24} className="text-gray-600 mb-2" />
                        <span className="text-xs text-gray-500 font-medium">No assets uploaded</span>
                    </div>
                ) : (
                    assets.map((asset) => (
                        <AssetListItem
                            key={asset.id}
                            asset={asset}
                            isSelected={activeAsset?.id === asset.id}
                            onSelect={() => onSelectAsset(asset)}
                            onDelete={(e) => onDeleteAsset(asset.id, e)}
                        />
                    ))
                )}
            </div>
        </div>
    );
}