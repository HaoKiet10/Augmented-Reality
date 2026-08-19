import { AlertCircle, ArrowLeft, Save, Sparkles, Upload, Undo2, Loader2 } from 'lucide-react';
import type { ProjectStatus, SaveStatus } from '../types';

interface EditorHeaderProps {
    name: string | undefined;
    setName: (name: string) => void;
    isEditing: boolean;
    setIsEditing: (editing: boolean) => void;
    onRenameSave: () => void;
    onRenameKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
    status: ProjectStatus | undefined;
    saveStatus: SaveStatus;
    onBack: () => void;
    onSaveConfig: () => void;
    onPublish: () => void;
    onUnpublish: () => void;
    publishLoading: boolean;
    publishError: string | null;
}

export function EditorHeader({
    name,
    setName,
    isEditing,
    setIsEditing,
    onRenameSave,
    onRenameKeyDown,
    status,
    saveStatus,
    onBack,
    onSaveConfig,
    onPublish,
    onUnpublish,
    publishLoading,
    publishError,
}: EditorHeaderProps) {
    return (
        <header className="relative z-10 border-b border-white/8 bg-white/2 backdrop-blur-md px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
                <button
                    onClick={onBack}
                    className="p-2 hover:bg-white/5 border border-white/6 rounded-lg transition-colors text-gray-300 hover:text-white"
                >
                    <ArrowLeft size={18} />
                </button>
                <div>
                    <div className="flex items-center gap-2">
                        {isEditing ? (
                            <input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                onBlur={onRenameSave}
                                onKeyDown={onRenameKeyDown}
                                autoFocus
                                className="font-bold text-lg bg-transparent border-b border-gray-500 outline-none"
                            />
                        ) : (
                            <h1
                                className="font-bold text-lg cursor-pointer hover:opacity-80"
                                onClick={() => setIsEditing(true)}
                            >
                                {name}
                            </h1>
                        )}

                        <span
                            className={`px-2 py-0.5 text-xs font-semibold rounded-full capitalize border ${status === 'published'
                                    ? 'bg-green-500/20 text-green-300 border-green-500/30'
                                    : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                                }`}
                        >
                            {status}
                        </span>
                    </div>

                    <p className="text-xs text-gray-400">Campaign Editor Workspace</p>
                    {publishError && (
                        <p className="text-xs text-red-400 mt-1 flex items-center gap-1 max-w-md">
                            <AlertCircle size={12} className="shrink-0" /> {publishError}
                        </p>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-3">
                {saveStatus === 'saved' && (
                    <span className="text-xs text-green-400 flex items-center gap-1">
                        <Sparkles size={14} /> Coordinates saved
                    </span>
                )}
                {saveStatus === 'error' && (
                    <span className="text-xs text-red-400 flex items-center gap-1">
                        <AlertCircle size={14} /> Error saving configs
                    </span>
                )}
                <button
                    onClick={onSaveConfig}
                    disabled={saveStatus === 'saving'}
                    className="flex items-center gap-2 px-5 py-2.5 bg-linear-to-r from-blue-500 to-purple-600 rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all font-semibold shadow-md shadow-blue-500/20 text-sm active:scale-[0.98] disabled:opacity-50"
                >
                    <Save size={16} />
                    <span>{saveStatus === 'saving' ? 'Saving...' : 'Done'}</span>
                </button>

                {status === 'published' ? (
                    <button
                        onClick={onUnpublish}
                        disabled={publishLoading}
                        className="flex items-center gap-2 px-5 py-2.5 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-all font-semibold text-sm active:scale-[0.98] disabled:opacity-50"
                    >
                        {publishLoading ? <Loader2 size={16} className="animate-spin" /> : <Undo2 size={16} />}
                        <span>Unpublish</span>
                    </button>
                ) : (
                    <button
                        onClick={onPublish}
                        disabled={publishLoading}
                        className="flex items-center gap-2 px-5 py-2.5 bg-linear-to-r from-green-500 to-emerald-600 rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all font-semibold shadow-md shadow-green-500/20 text-sm active:scale-[0.98] disabled:opacity-50"
                    >
                        {publishLoading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                        <span>{publishLoading ? 'Publishing...' : 'Publish'}</span>
                    </button>
                )}
            </div>
        </header>
    );
}