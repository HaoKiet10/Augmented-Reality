interface AxisInputGroupProps {
    label: string;
    value: number;
    onChange: (val: number) => void;
    step: number;
}

export function AxisInputGroup({ label, value, onChange, step }: AxisInputGroupProps) {
    const roundedValue = Math.round(value * 100) / 100;
    return (
        <div className="bg-white/2 border border-white/5 rounded-lg px-2.5 py-1.5">
            <label className="text-[10px] text-gray-500 block">{label}</label>
            <input
                type="number"
                step={step}
                value={roundedValue}
                onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
                className="w-full bg-transparent border-0 text-white font-mono text-sm focus:outline-hidden mt-0.5"
            />
        </div>
    );
}

interface AxisSliderProps {
    sliderLabel: string;
    value: number;
    onChange: (val: number) => void;
    step: number;
    min: number;
    max: number;
    /** Hậu tố hiển thị cạnh giá trị, ví dụ "m", "°", "x" */
    unit?: string;
    /** Số chữ số thập phân hiển thị giá trị (mặc định: 2) */
    displayFractionDigits?: number;
}

export function AxisSlider({
    sliderLabel,
    value,
    onChange,
    step,
    min,
    max,
    unit = '',
    displayFractionDigits = 2,
}: AxisSliderProps) {
    const displayValue = value.toFixed(displayFractionDigits);

    return (
        <div className="flex flex-col gap-1">
            <span className="text-[10px] text-gray-500 flex justify-between">
                <span>{sliderLabel}</span>
                <span>
                    {displayValue}
                    {unit}
                </span>
            </span>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => onChange(parseFloat(e.target.value))}
                className="w-full accent-blue-500 bg-white/10 rounded-lg appearance-none h-1"
            />
        </div>
    );
}