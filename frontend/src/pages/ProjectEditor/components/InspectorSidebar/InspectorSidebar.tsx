import { PanelRightClose, PanelRightOpen, SlidersHorizontal } from 'lucide-react';
import type { Axis } from '../../types';
import { PositionControls } from './PositionControls';
import { RotationControls } from './RotationControls';
import { ScaleControls } from './ScaleControls';

interface InspectorSidebarProps {
    posX: number; posY: number; posZ: number;
    setPosX: (val: number) => void; setPosY: (val: number) => void; setPosZ: (val: number) => void;
    rotX: number; rotY: number; rotZ: number;
    setRotX: (val: number) => void; setRotY: (val: number) => void; setRotZ: (val: number) => void;
    scaleX: number; scaleY: number; scaleZ: number;
    updateScale: (axis: Axis, val: number) => void;
    uniformScale: boolean;
    setUniformScale: (val: boolean) => void;
    onResetConfig: () => void;
    onBeforeChange: () => void;
    collapsed: boolean;
    onToggleCollapsed: () => void;
}

export function InspectorSidebar({
    posX, posY, posZ, setPosX, setPosY, setPosZ,
    rotX, rotY, rotZ, setRotX, setRotY, setRotZ,
    scaleX, scaleY, scaleZ, updateScale,
    uniformScale, setUniformScale,
    onResetConfig,
    onBeforeChange,
    collapsed,
    onToggleCollapsed,
}: InspectorSidebarProps) {
    if (collapsed) {
        return (
            <aside className="w-14 border-l border-white/8 bg-[#111218] flex flex-col items-center py-4 gap-4 shrink-0 transition-all duration-200">
                <button
                    onClick={onToggleCollapsed}
                    title="Expand properties inspector"
                    className="p-2 hover:bg-white/5 border border-white/6 rounded-lg transition-colors text-gray-300 hover:text-white"
                >
                    <PanelRightOpen size={18} />
                </button>
                <div className="p-2 text-gray-500" title="Properties Inspector">
                    <SlidersHorizontal size={18} />
                </div>
            </aside>
        );
    }

    return (
        <aside className="w-80 border-l border-white/8 bg-[#111218] p-5 flex flex-col justify-between overflow-y-auto shrink-0 transition-all duration-200">
            {/* onFocus ở đây bắt luôn mọi input số bên trong (PositionControls/RotationControls/
                ScaleControls) nhờ React delegate sự kiện focus qua synthetic event system — chốt
                đúng 1 snapshot undo ngay khi user bắt đầu sửa 1 ô, không cần sửa từng input riêng. */}
            <div className="flex flex-col gap-6" onFocus={onBeforeChange}>
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold tracking-wide text-gray-300">PROPERTIES INSPECTOR</h3>
                    <button
                        onClick={onToggleCollapsed}
                        title="Collapse properties inspector"
                        className="p-1.5 hover:bg-white/5 border border-white/6 rounded-lg transition-colors text-gray-400 hover:text-white"
                    >
                        <PanelRightClose size={16} />
                    </button>
                </div>

                <PositionControls posX={posX} posY={posY} posZ={posZ} setPosX={setPosX} setPosY={setPosY} setPosZ={setPosZ} />
                <RotationControls rotX={rotX} rotY={rotY} rotZ={rotZ} setRotX={setRotX} setRotY={setRotY} setRotZ={setRotZ} />
                <ScaleControls
                    scaleX={scaleX}
                    scaleY={scaleY}
                    scaleZ={scaleZ}
                    updateScale={updateScale}
                    uniformScale={uniformScale}
                    setUniformScale={setUniformScale}
                />
            </div>

            <div className="flex flex-col gap-2">
                <button
                    onClick={() => { onBeforeChange(); onResetConfig(); }}
                    className="w-full py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg font-bold text-xs text-gray-300 hover:text-white transition-all active:scale-[0.98]"
                >
                    Reset Coordinates
                </button>
            </div>
        </aside>
    );
}