import type { Axis } from '../../types';
import { AxisInputGroup, AxisSlider } from './AxisInputGroup';

interface ScaleControlsProps {
    scaleX: number;
    scaleY: number;
    scaleZ: number;
    updateScale: (axis: Axis, val: number) => void;
    uniformScale: boolean;
    setUniformScale: (val: boolean) => void;
}

export function ScaleControls({
    scaleX,
    scaleY,
    scaleZ,
    updateScale,
    uniformScale,
    setUniformScale,
}: ScaleControlsProps) {
    return (
        <div className="flex flex-col gap-3">
            <span className="text-xs font-semibold text-gray-400">Scale (X, Y, Z Multipliers)</span>

            <div className="grid grid-cols-3 gap-2">
                <AxisInputGroup label="X Scale" value={scaleX} onChange={(v) => updateScale('x', v)} step={0.1} />
                <AxisInputGroup label="Y Scale" value={scaleY} onChange={(v) => updateScale('y', v)} step={0.1} />
                <AxisInputGroup label="Z Scale" value={scaleZ} onChange={(v) => updateScale('z', v)} step={0.1} />
            </div>

            {/* Uniform Scale Toggle */}
            <div className="flex items-center gap-2 mt-1">
                <input
                    type="checkbox"
                    id="uniform-scale-toggle"
                    checked={uniformScale}
                    onChange={(e) => setUniformScale(e.target.checked)}
                    className="rounded border-white/10 accent-blue-500 bg-white/2"
                />
                <label htmlFor="uniform-scale-toggle" className="text-[10px] text-gray-400 cursor-pointer select-none">
                    Link Axes (Uniform Scale)
                </label>
            </div>

            <div className="mt-1 flex flex-col gap-2">
                <AxisSlider
                    sliderLabel="X-Axis Scale"
                    value={scaleX}
                    onChange={(v) => updateScale('x', v)}
                    step={0.05}
                    min={0.1}
                    max={5}
                    unit="x"
                    displayFractionDigits={2}
                />
                <AxisSlider
                    sliderLabel="Y-Axis Scale"
                    value={scaleY}
                    onChange={(v) => updateScale('y', v)}
                    step={0.05}
                    min={0.1}
                    max={5}
                    unit="x"
                    displayFractionDigits={2}
                />
                <AxisSlider
                    sliderLabel="Z-Axis Scale"
                    value={scaleZ}
                    onChange={(v) => updateScale('z', v)}
                    step={0.05}
                    min={0.1}
                    max={5}
                    unit="x"
                    displayFractionDigits={2}
                />
            </div>
        </div>
    );
}