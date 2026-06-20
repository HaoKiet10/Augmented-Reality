import { HardDrive } from 'lucide-react';
import { MAX_PROJECT_SIZE_MB } from '../../constants';
import { formatMB } from '../../utils/format';

interface CapacityBarProps {
    totalSizeBytes: number;
}

export function CapacityBar({ totalSizeBytes }: CapacityBarProps) {
    const totalSizeMB = totalSizeBytes / (1024 * 1024);
    const sizePercentage = Math.min((totalSizeMB / MAX_PROJECT_SIZE_MB) * 100, 100);

    const barColor =
        sizePercentage > 90 ? 'bg-red-500' : sizePercentage > 75 ? 'bg-yellow-500' : 'bg-blue-500';

    return (
        <div className="p-4 bg-white/2 border border-white/5 rounded-xl">
            <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-gray-400 font-semibold flex items-center gap-1.5">
                    <HardDrive size={13} className="text-purple-400" />
                    PROJECT CAPACITY
                </span>
                <span className="text-xs font-bold text-gray-200">
                    {formatMB(totalSizeBytes)} / {MAX_PROJECT_SIZE_MB.toFixed(1)} MB
                </span>
            </div>
            <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                <div
                    className={`h-full transition-all duration-300 rounded-full ${barColor}`}
                    style={{ width: `${sizePercentage}%` }}
                ></div>
            </div>
            <p className="text-[10px] text-gray-500 mt-2">
                Combined weight of all models and media assets for this project.
            </p>
        </div>
    );
}