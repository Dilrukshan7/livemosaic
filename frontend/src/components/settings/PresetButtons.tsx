"use client";
import { PRESETS, PresetName } from "@/types";
import { cn } from "@/lib/utils";

const PRESET_DESCRIPTIONS: Record<PresetName, string> = {
  Subtle: "Original photo clearly visible, tiles hidden",
  Balanced: "Recommended starting point",
  Bold: "Tiles dominate, original non-guessable",
  "Ultra-Fine": "Maximum tile density",
  Custom: "Adjust sliders manually",
};

interface PresetButtonsProps {
  active: PresetName;
  onChange: (preset: PresetName) => void;
}

export default function PresetButtons({ active, onChange }: PresetButtonsProps) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-gray-800">Preset</p>
      <div className="flex flex-wrap gap-2">
        {(Object.keys(PRESETS) as PresetName[]).map((name) => (
          <button
            key={name}
            onClick={() => onChange(name)}
            title={PRESET_DESCRIPTIONS[name]}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm font-medium border transition-all",
              active === name
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-gray-600 border-gray-200 hover:border-blue-400 hover:text-blue-600"
            )}
          >
            {name}
          </button>
        ))}
      </div>
      <p className="text-xs text-gray-500">{PRESET_DESCRIPTIONS[active]}</p>
    </div>
  );
}
