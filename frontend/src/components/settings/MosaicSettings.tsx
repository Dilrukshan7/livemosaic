"use client";
import { MosaicSettings as Settings, PresetName, PRESETS, DEFAULT_SETTINGS } from "@/types";
import Slider from "@/components/ui/Slider";
import PresetButtons from "./PresetButtons";
import { UserProfile } from "@/types";

interface MosaicSettingsProps {
  settings: Settings;
  preset: PresetName;
  user: UserProfile | null;
  onChange: (s: Settings) => void;
  onPreset: (p: PresetName) => void;
}

const RESOLUTIONS = [1.0, 2.0, 3.0, 4.0];
const FORMATS = ["JPEG", "PNG"] as const;

export default function MosaicSettingsPanel({
  settings,
  preset,
  user,
  onChange,
  onPreset,
}: MosaicSettingsProps) {
  const maxRes = user?.max_output_resolution ?? 2.0;
  const minCell = user?.min_cell_size ?? 12;

  function handlePreset(p: PresetName) {
    if (p === "Custom") {
      onPreset("Custom");
      return;
    }
    const overrides = PRESETS[p];
    let newSettings = { ...DEFAULT_SETTINGS, ...overrides };
    // Clamp to plan limits
    newSettings.cell_size = Math.max(newSettings.cell_size, minCell);
    newSettings.output_resolution = Math.min(newSettings.output_resolution ?? 2.0, maxRes);
    onChange(newSettings);
    onPreset(p);
  }

  function set<K extends keyof Settings>(key: K, value: Settings[K]) {
    onChange({ ...settings, [key]: value });
    onPreset("Custom");
  }

  const pngAllowed = user?.allowed_formats?.includes("PNG") ?? false;

  return (
    <div className="space-y-6">
      <PresetButtons active={preset} onChange={handlePreset} />

      <div className="border-t border-gray-100 pt-6 space-y-6">
        <Slider
          label="Cell Size"
          description="Controls how large each tile image is. Smaller values create a finer mosaic that looks more like the original photo. Larger values make individual tile photos easier to see."
          value={settings.cell_size}
          min={minCell}
          max={64}
          step={2}
          unit="px"
          onChange={(v) => set("cell_size", v)}
        />

        <Slider
          label="Blend Strength"
          description="How much of the original photo's color bleeds through. Higher values make the original photo more recognizable. Lower values let the tile photos dominate."
          value={Math.round(settings.blend * 100)}
          min={0}
          max={100}
          step={5}
          unit="%"
          onChange={(v) => set("blend", v / 100)}
        />

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-800">Output Resolution</label>
          <div className="flex gap-2 flex-wrap">
            {RESOLUTIONS.map((r) => (
              <button
                key={r}
                disabled={r > maxRes}
                onClick={() => set("output_resolution", r)}
                className={`px-3 py-1.5 rounded-lg text-sm border transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                  settings.output_resolution === r
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-600 border-gray-200 hover:border-blue-400"
                }`}
              >
                {r}x{r > maxRes ? " 🔒" : ""}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500">
            The final image size. Higher resolutions produce sharper results but take longer to generate.
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-800">Output Format</label>
          <div className="flex gap-2">
            {FORMATS.map((f) => (
              <button
                key={f}
                disabled={f === "PNG" && !pngAllowed}
                onClick={() => set("output_format", f)}
                className={`px-3 py-1.5 rounded-lg text-sm border transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                  settings.output_format === f
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-600 border-gray-200 hover:border-blue-400"
                }`}
              >
                {f}{f === "PNG" && !pngAllowed ? " 🔒" : ""}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500">
            Choose between JPG (smaller file size) and PNG (lossless quality).
          </p>
        </div>

        {settings.output_format === "JPEG" && (
          <Slider
            label="JPEG Quality"
            description="Controls compression level. Higher values produce larger, sharper files."
            value={settings.jpeg_quality}
            min={60}
            max={100}
            step={1}
            onChange={(v) => set("jpeg_quality", v)}
          />
        )}
      </div>
    </div>
  );
}
