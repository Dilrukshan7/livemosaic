"use client";
interface ProgressProps {
  value: number;     // 0-100
  label?: string;
  className?: string;
}

export default function Progress({ value, label, className }: ProgressProps) {
  return (
    <div className={className}>
      {label && (
        <div className="flex justify-between mb-1">
          <span className="text-sm text-gray-600">{label}</span>
          <span className="text-sm text-gray-500">{value}%</span>
        </div>
      )}
      <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-600 rounded-full transition-all duration-300"
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  );
}
