import { AxisInputGroup, AxisSlider } from './AxisInputGroup';

interface RotationControlsProps {
    rotX: number;
    rotY: number;
    rotZ: number;
    setRotX: (val: number) => void;
    setRotY: (val: number) => void;
    setRotZ: (val: number) => void;
}

export function RotationControls({ rotX, rotY, rotZ, setRotX, setRotY, setRotZ }: RotationControlsProps) {
    return (
        <div className="flex flex-col gap-3">
            <span className="text-xs font-semibold text-gray-400">Rotation (X, Y, Z Degrees)</span>

            <div className="grid grid-cols-3 gap-2">
                <AxisInputGroup label="X Rotation" value={rotX} onChange={setRotX} step={5} />
                <AxisInputGroup label="Y Rotation" value={rotY} onChange={setRotY} step={5} />
                <AxisInputGroup label="Z Rotation" value={rotZ} onChange={setRotZ} step={5} />
            </div>

            <div className="mt-1 flex flex-col gap-2">
                <AxisSlider sliderLabel="X-Axis Rotation" value={rotX} onChange={setRotX} step={5} min={-180} max={180} unit="°" />
                <AxisSlider sliderLabel="Y-Axis Rotation" value={rotY} onChange={setRotY} step={5} min={-180} max={180} unit="°" />
                <AxisSlider sliderLabel="Z-Axis Rotation" value={rotZ} onChange={setRotZ} step={5} min={-180} max={180} unit="°" />
            </div>
        </div>
    );
}