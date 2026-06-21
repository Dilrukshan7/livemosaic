export type OutputFormat = "JPEG" | "PNG";

export interface MosaicSettings {
  cell_size: number;
  blend: number;
  output_resolution: number;
  output_format: OutputFormat;
  jpeg_quality: number;
}

export const DEFAULT_SETTINGS: MosaicSettings = {
  cell_size: 20,
  blend: 0.40,
  output_resolution: 2.0,
  output_format: "JPEG",
  jpeg_quality: 92,
};

export type PresetName = "Subtle" | "Balanced" | "Bold" | "Ultra-Fine" | "Custom";

export const PRESETS: Record<PresetName, Partial<MosaicSettings>> = {
  Subtle: { cell_size: 40, blend: 0.70 },
  Balanced: { cell_size: 20, blend: 0.40 },
  Bold: { cell_size: 10, blend: 0.15 },
  "Ultra-Fine": { cell_size: 4, blend: 0.10 },
  Custom: {},
};

export type JobStatus = "pending" | "processing" | "completed" | "failed" | "expired";

export interface JobStatusResponse {
  job_id: string;
  status: JobStatus;
  progress: number;
  message: string;
  output_url?: string;
  output_format?: string;
  error?: string;
}

export interface Plan {
  id: string;
  name: string;
  display_name: string;
  price_usd: number;
  monthly_mosaics: number | null;
  min_cell_size: number;
  max_cell_size: number;
  max_output_resolution: number;
  allowed_formats: string[];
  features: {
    png_download: boolean;
    commercial_use: boolean;
    priority_queue: boolean;
  };
}

export interface UserProfile {
  id: string;
  email: string;
  plan_name: string;
  plan_display_name: string;
  mosaics_used_this_month: number;
  monthly_limit: number | null;
  features: Record<string, boolean>;
  allowed_formats: string[];
  max_output_resolution: number;
  min_cell_size: number;
}

export interface MosaicJob {
  id: string;
  status: JobStatus;
  settings: MosaicSettings;
  created_at: string;
  completed_at?: string;
  download_url?: string;
  output_format?: string;
  tile_count?: number;
  expires_at?: string;
}
