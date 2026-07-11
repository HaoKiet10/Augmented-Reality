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
}: AssetSidebarProps) {
    return (
        <aside className="w-80 border-r border-white/8 bg-[#111218] flex flex-col justify-between overflow-y-auto">
            <div className="p-5 flex-1 flex flex-col gap-6">
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