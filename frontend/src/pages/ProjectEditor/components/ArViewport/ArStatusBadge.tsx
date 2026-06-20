import type { Asset } from '../../types';

interface ArStatusBadgeProps {
    activeAsset: Asset;
}

export function ArStatusBadge({ activeAsset }: ArStatusBadgeProps) {
    return (
        <div className="absolute bottom-4 left-4 z-20 px-3 py-1.5 bg-black/70 border border-white/10 rounded-lg text-xs font-semibold text-gray-300 flex items-center gap-2 backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-ping"></span>
            <span>
                Active Preview: <b className="text-white">{activeAsset.filename}</b>
            </span>
        </div>
    );
}