import { Box, FileVideo, Image, Trash2 } from 'lucide-react';
import type { Asset } from '../../types';
import { isImageAsset, isVideoAsset } from '../../utils/assetType';
import { formatMB } from '../../utils/format';

interface AssetListItemProps {
    asset: Asset;
    isSelected: boolean;
    onSelect: () => void;
    onDelete: (e: React.MouseEvent) => void;
}

function getAssetIcon(fileType: string, filename?: string) {
    if (isVideoAsset(fileType, filename)) {
        return <FileVideo className="text-teal-400" size={18} />;
    }
    if (isImageAsset(fileType, filename)) {
        return <Image className="text-emerald-400" size={18} />;
    }
    return <Box className="text-blue-400" size={18} />;
}

export function AssetListItem({ asset, isSelected, onSelect, onDelete }: AssetListItemProps) {
    return (
        <div
            onClick={onSelect}
            className={`group p-3 border rounded-xl flex items-center justify-between cursor-pointer transition-all duration-200 ${isSelected
                ? 'bg-blue-500/10 border-blue-500/40 hover:bg-blue-500/15'
                : 'bg-white/2 border-white/6 hover:border-white/15 hover:bg-white/4'
                }`}
        >
            <div className="flex items-center gap-3 overflow-hidden">
                <div className={`p-2 rounded-lg ${isSelected ? 'bg-blue-500/20' : 'bg-white/5'}`}>
                    {getAssetIcon(asset.fileType, asset.filename)}
                </div>
                <div className="overflow-hidden text-left">
                    <p className="text-xs font-semibold text-gray-200 truncate group-hover:text-white">
                        {asset.filename}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{formatMB(asset.fileSize)} MB</p>
                </div>
            </div>

            <button
                onClick={onDelete}
                className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                title="Delete asset"
            >
                <Trash2 size={14} />
            </button>
        </div>
    );
}