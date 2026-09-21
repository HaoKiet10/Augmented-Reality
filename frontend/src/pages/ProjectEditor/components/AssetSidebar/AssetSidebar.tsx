import { PanelLeftClose, PanelLeftOpen, Layers } from 'lucide-react';
import type { Asset } from '../../types';
import { CapacityBar } from './CapacityBar';
import { UploadDropzone } from './UploadDropzone';
import { AssetList } from './AssetList';
import { HelpCard } from './HelpCard';
import { TriggerImagePanel } from './TriggerImagePanel';

interface AssetSidebarProps {
    assets: Asset[];
    activeAsset: Asset | null;
    totalSizeBytes: number;
    error: string | null;
    onDismissError: () => void;
    uploading: boolean;
    fileInputRef: React.RefObject<HTMLInputElement | null>;
    onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onSelectAsset: (asset: Asset) => void;
    onDeleteAsset: (assetId: string, e: React.MouseEvent) => void;
    triggerImageUrl: string | null;
    onUploadTrigger: (file: File) => void;
    onDeleteTrigger: () => void;
    collapsed: boolean;
    onToggleCollapsed: () => void;
}

export function AssetSidebar({
    assets,
    activeAsset,
    totalSizeBytes,
    error,
    onDismissError,
    uploading,
    fileInputRef,
    onFileUpload,
    onSelectAsset,
    onDeleteAsset,
    triggerImageUrl,
    onUploadTrigger,
    onDeleteTrigger,
    collapsed,
    onToggleCollapsed,
}: AssetSidebarProps) {
    if (collapsed) {
        return (
            <aside className="w-14 border-r border-white/8 bg-[#111218] flex flex-col items-center py-4 gap-4 shrink-0 transition-all duration-200">
                <button
                    onClick={onToggleCollapsed}
                    title="Expand assets panel"
                    className="p-2 hover:bg-white/5 border border-white/6 rounded-lg transition-colors text-gray-300 hover:text-white"
                >
                    <PanelLeftOpen size={18} />
                </button>
                <div className="p-2 text-gray-500" title="Assets">
                    <Layers size={18} />
                </div>
                {assets.length > 0 && (
                    <span className="text-[10px] font-bold text-gray-400 bg-white/5 rounded-full px-1.5 py-0.5">
                        {assets.length}
                    </span>
                )}
            </aside>
        );
    }

    return (
        <aside className="w-80 border-r border-white/8 bg-[#111218] flex flex-col justify-between overflow-y-auto shrink-0 transition-all duration-200">
            <div className="p-5 flex-1 flex flex-col gap-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold tracking-wide text-gray-300">ASSETS</h3>
                    <button
                        onClick={onToggleCollapsed}
                        title="Collapse assets panel"
                        className="p-1.5 hover:bg-white/5 border border-white/6 rounded-lg transition-colors text-gray-400 hover:text-white"
                    >
                        <PanelLeftClose size={16} />
                    </button>
                </div>
                <TriggerImagePanel
                    triggerImageUrl={triggerImageUrl}
                    onUpload={onUploadTrigger}
                    onDelete={onDeleteTrigger}
                />
                <CapacityBar totalSizeBytes={totalSizeBytes} />
                {error && (
                    <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-xs flex justify-between items-center">
                        <span className="truncate max-w-50">{error}</span>
                        <button onClick={onDismissError} className="hover:text-red-200 ml-2 font-bold shrink-0">✕</button>
                    </div>
                )}
                <UploadDropzone
                    uploading={uploading}
                    fileInputRef={fileInputRef}
                    onFileUpload={onFileUpload}
                />
                <AssetList
                    assets={assets}
                    activeAsset={activeAsset}
                    onSelectAsset={onSelectAsset}
                    onDeleteAsset={onDeleteAsset}
                />
            </div>
            <HelpCard />
        </aside>
    );
}