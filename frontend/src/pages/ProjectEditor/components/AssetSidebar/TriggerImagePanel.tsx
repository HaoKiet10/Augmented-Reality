import { useRef } from 'react';
import { ImageIcon, Trash2, Upload } from 'lucide-react';

interface TriggerImagePanelProps {
    triggerImageUrl: string | null;
    onUpload: (file: File) => void;
    onDelete: () => void;
}

export function TriggerImagePanel({ triggerImageUrl, onUpload, onDelete }: TriggerImagePanelProps) {
    const inputRef = useRef<HTMLInputElement>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) onUpload(file);
        e.target.value = '';
    };

    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                    <ImageIcon size={12} />
                    Trigger Image
                </span>
                {triggerImageUrl && (
                    <button
                        onClick={onDelete}
                        className="p-1 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-all"
                        title="Remove trigger image"
                    >
                        <Trash2 size={13} />
                    </button>
                )}
            </div>

            {triggerImageUrl ? (
                <div
                    onClick={() => inputRef.current?.click()}
                    className="relative h-36 rounded-xl overflow-hidden border border-white/8 cursor-pointer group"
                >
                    <img
                        src={triggerImageUrl}
                        alt="Trigger"
                        className="w-full h-full object-cover group-hover:opacity-70 transition-opacity duration-200"
                    />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <span className="text-xs font-semibold text-white bg-black/60 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                            <Upload size={12} /> Replace
                        </span>
                    </div>
                </div>
            ) : (
                <div
                    onClick={() => inputRef.current?.click()}
                    className="h-36 rounded-xl border border-dashed border-white/15 hover:border-blue-500/50 bg-white/2 hover:bg-blue-500/5 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all duration-200 group"
                >
                    <div className="p-2 rounded-lg bg-white/5 group-hover:bg-blue-500/10 transition-colors">
                        <Upload size={18} className="text-gray-500 group-hover:text-blue-400 transition-colors" />
                    </div>
                    <span className="text-xs text-gray-500 group-hover:text-gray-400 transition-colors">
                        Upload trigger image
                    </span>
                </div>
            )}

            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleChange}
            />
        </div>
    );
}