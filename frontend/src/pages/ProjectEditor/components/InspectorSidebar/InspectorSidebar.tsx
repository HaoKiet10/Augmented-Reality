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
}

export function InspectorSidebar({
    posX, posY, posZ, setPosX, setPosY, setPosZ,
    rotX, rotY, rotZ, setRotX, setRotY, setRotZ,
    scaleX, scaleY, scaleZ, updateScale,
    uniformScale, setUniformScale,
    onResetConfig,
}: InspectorSidebarProps) {
    return (
        <aside className="w-80 border-l border-white/8 bg-[#111218] p-5 flex flex-col justify-between overflow-y-auto">
            <div className="flex flex-col gap-6">
                <h3 className="text-sm font-bold tracking-wide text-gray-300">PROPERTIES INSPECTOR</h3>

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
                    onClick={onResetConfig}
                    className="w-full py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg font-bold text-xs text-gray-300 hover:text-white transition-all active:scale-[0.98]"
                >
                    Reset Coordinates
                </button>
            </div>
        </aside>
    );
}