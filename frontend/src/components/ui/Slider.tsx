"use client";
interface SliderProps {
  label: string;
  description: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  disabled?: boolean;
  onChange: (v: number) => void;
}

export default function Slider({
  label,
  description,
  value,
  min,
  max,
  step = 1,
  unit = "",
  disabled,
  onChange,
}: SliderProps) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-baseline">
        <label className="text-sm font-medium text-gray-800">{label}</label>
        <span className="text-sm font-semibold text-blue-600">
          {value}{unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 accent-blue-600 rounded-lg cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
      />
      <p className="text-xs text-gray-500 leading-relaxed">{description}</p>
    </div>
  );
}
