import { UploadCloud } from 'lucide-react';
import { ACCEPTED_FILE_EXTENSIONS } from '../../constants';

interface UploadDropzoneProps {
    uploading: boolean;
    fileInputRef: React.RefObject<HTMLInputElement | null>;
    onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function UploadDropzone({ uploading, fileInputRef, onFileUpload }: UploadDropzoneProps) {
    return (
        <div>
            <h3 className="text-sm font-semibold mb-3 text-gray-200">Add overlays</h3>
            <div
                onClick={() => fileInputRef.current?.click()}
                className="group border border-dashed border-white/15 hover:border-accent/60 bg-white/1 hover:bg-white/4 p-6 rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300"
            >
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={onFileUpload}
                    accept={ACCEPTED_FILE_EXTENSIONS}
                    className="hidden"
                />
                <UploadCloud
                    size={32}
                    className="text-gray-500 group-hover:text-accent-ink group-hover:scale-105 transition-all mb-3"
                />
                <span className="text-xs font-bold text-gray-300 group-hover:text-white mb-1">
                    {uploading ? 'Uploading asset...' : 'Upload 3D Models, Videos, or Images'}
                </span>
                <span className="text-[10px] text-gray-500">
                    Drag files here or browse. Max 5MB remaining.
                </span>
            </div>
        </div>
    );
}