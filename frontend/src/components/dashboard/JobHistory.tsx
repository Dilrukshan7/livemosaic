"use client";
import { MosaicJob } from "@/types";
import { Card } from "@/components/ui/Card";
import { formatDate } from "@/lib/utils";

interface JobHistoryProps {
  jobs: MosaicJob[];
  loading?: boolean;
}

export default function JobHistory({ jobs, loading }: JobHistoryProps) {
  if (loading) {
    return (
      <Card>
        <div className="animate-pulse space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-100 rounded-lg" />
          ))}
        </div>
      </Card>
    );
  }

  if (jobs.length === 0) {
    return (
      <Card>
        <p className="text-center text-gray-400 py-6">No mosaics yet. Create your first one!</p>
      </Card>
    );
  }

  return (
    <Card padding={false}>
      <div className="divide-y divide-gray-50">
        {jobs.map((job) => (
          <div key={job.id} className="flex items-center justify-between p-4">
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-block w-2 h-2 rounded-full ${
                    job.status === "completed"
                      ? "bg-green-400"
                      : job.status === "failed"
                      ? "bg-red-400"
                      : "bg-yellow-400"
                  }`}
                />
                <span className="text-sm font-medium text-gray-800 capitalize">{job.status}</span>
                {job.tile_count && (
                  <span className="text-xs text-gray-400">{job.tile_count} tiles</span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-0.5">{formatDate(job.created_at)}</p>
            </div>
            {job.download_url && (
              <a
                href={job.download_url}
                download
                className="text-sm text-blue-600 hover:underline font-medium"
              >
                Download
              </a>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
