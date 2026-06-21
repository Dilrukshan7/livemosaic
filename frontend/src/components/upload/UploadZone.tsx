"use client";
import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { cn, formatBytes } from "@/lib/utils";

interface UploadZoneProps {
  label: string;
  accept: Record<string, string[]>;
  file: File | null;
  preview?: string | null;
  error?: string;
  maxSize: number;
  onFile: (file: File) => void;
}

export default function UploadZone({
  label,
  accept,
  file,
  preview,
  error,
  maxSize,
  onFile,
}: UploadZoneProps) {
  const onDrop = useCallback(
    (accepted: File[]) => {
      if (accepted[0]) onFile(accepted[0]);
    },
    [onFile]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxFiles: 1,
    maxSize,
  });

  const hasFile = !!file;

  return (
    <div className="space-y-1">
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors",
          isDragActive && "border-blue-400 bg-blue-50",
          !isDragActive && !hasFile && !error && "border-gray-200 hover:border-blue-300 hover:bg-gray-50",
          !isDragActive && hasFile && !error && "border-green-400 bg-green-50",
          error && "border-red-300 bg-red-50"
        )}
      >
        <input {...getInputProps()} />

        {preview ? (
          /* Image preview */
          <div className="space-y-2">
            <img src={preview} alt="Preview" className="mx-auto max-h-40 rounded-lg object-cover" />
            <p className="text-xs text-gray-500">{file?.name} — {file ? formatBytes(file.size) : ""}</p>
          </div>
        ) : hasFile ? (
          /* Non-image file selected */
          <div className="text-green-700">
            <svg className="mx-auto mb-2 h-10 w-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm font-medium">{file.name}</p>
            <p className="text-xs text-green-600 mt-0.5">{formatBytes(file.size)} — click to replace</p>
          </div>
        ) : (
          /* Empty state */
          <div className="text-gray-400">
            <svg className="mx-auto mb-2 h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M4 16l4.586-4.586A2 2 0 0111 11h2a2 2 0 011.414.586L19 16M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M4 16H2m18 0h2M12 3v10" />
            </svg>
            <p className="text-sm font-medium text-gray-600">{label}</p>
            <p className="text-xs text-gray-400 mt-1">Drag &amp; drop or click to browse</p>
          </div>
        )}
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
