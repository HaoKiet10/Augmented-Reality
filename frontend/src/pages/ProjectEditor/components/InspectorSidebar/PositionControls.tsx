import { AxisInputGroup, AxisSlider } from './AxisInputGroup';

interface PositionControlsProps {
    posX: number;
    posY: number;
    posZ: number;
    setPosX: (val: number) => void;
    setPosY: (val: number) => void;
    setPosZ: (val: number) => void;
}

export function PositionControls({ posX, posY, posZ, setPosX, setPosY, setPosZ }: PositionControlsProps) {
    return (
        <div className="flex flex-col gap-3">
            <span className="text-xs font-semibold text-gray-400">Position (X, Y, Z)</span>

            <div className="grid grid-cols-3 gap-2">
                <AxisInputGroup label="X Position" value={posX} onChange={setPosX} step={0.05} />
                <AxisInputGroup label="Y Position" value={posY} onChange={setPosY} step={0.05} />
                <AxisInputGroup label="Z Position" value={posZ} onChange={setPosZ} step={0.05} />
            </div>

            <div className="mt-1 flex flex-col gap-2">
                <AxisSlider sliderLabel="X-Axis (Horizontal)" value={posX} onChange={setPosX} step={0.05} min={-10} max={10} unit="m" />
                <AxisSlider sliderLabel="Y-Axis (Vertical)" value={posY} onChange={setPosY} step={0.05} min={-10} max={10} unit="m" />
                <AxisSlider sliderLabel="Z-Axis (Depth)" value={posZ} onChange={setPosZ} step={0.05} min={-10} max={10} unit="m" />
            </div>
        </div>
    );
}