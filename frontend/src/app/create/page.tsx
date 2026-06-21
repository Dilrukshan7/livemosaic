"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import UploadZone from "@/components/upload/UploadZone";
import MosaicSettingsPanel from "@/components/settings/MosaicSettings";
import MosaicResult from "@/components/result/MosaicResult";
import Progress from "@/components/ui/Progress";
import Button from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DEFAULT_SETTINGS, MosaicSettings, PresetName, JobStatusResponse, UserProfile } from "@/types";
import { generateMosaic, getJobStatus, getMe } from "@/lib/api";
import { createClient } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";

export default function CreatePage() {
  const router = useRouter();
  const supabase = createClient();
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string>("");

  const [mainFile, setMainFile] = useState<File | null>(null);
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [settings, setSettings] = useState<MosaicSettings>(DEFAULT_SETTINGS);
  const [preset, setPreset] = useState<PresetName>("Balanced");

  const [submitting, setSubmitting] = useState(false);
  const [jobStatus, setJobStatus] = useState<JobStatusResponse | null>(null);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const s = data.session;
      if (!s) { router.push("/auth/login"); return; }
      setUser(s.user);
      setToken(s.access_token);
      getMe(s.access_token).then(setProfile).catch(() => {});
    });
  }, []);

  function handleMainFile(file: File) {
    setMainFile(file);
    const url = URL.createObjectURL(file);
    setPreview(url);
  }

  async function handleGenerate() {
    if (!mainFile || !zipFile || !token) return;
    setError("");
    setSubmitting(true);
    setJobStatus(null);

    try {
      const { job_id } = await generateMosaic(mainFile, zipFile, settings, token);

      setJobStatus({ job_id, status: "pending", progress: 0, message: "Queued" });

      pollRef.current = setInterval(async () => {
        try {
          const status = await getJobStatus(job_id, token);
          setJobStatus(status);
          if (status.status === "completed" || status.status === "failed") {
            clearInterval(pollRef.current!);
            setSubmitting(false);
          }
        } catch {
          clearInterval(pollRef.current!);
          setSubmitting(false);
        }
      }, 1500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Generation failed");
      setSubmitting(false);
    }
  }

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const canGenerate = !!mainFile && !!zipFile && !submitting;

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar user={user} />
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-10 space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Create a Mosaic</h1>
          <p className="text-gray-500 mt-1">Upload your photos, pick your settings, and generate.</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Upload */}
          <Card>
            <h2 className="text-base font-semibold text-gray-800 mb-4">Upload Files</h2>
            <div className="space-y-4">
              <UploadZone
                label="Main Photo (JPG or PNG)"
                accept={{ "image/jpeg": [".jpg", ".jpeg"], "image/png": [".png"] }}
                file={mainFile}
                preview={preview}
                maxSize={20 * 1024 * 1024}
                onFile={handleMainFile}
              />
              <UploadZone
                label="Tile Images (ZIP file)"
                accept={{ "application/zip": [".zip"], "application/x-zip-compressed": [".zip"] }}
                file={zipFile}
                maxSize={200 * 1024 * 1024}
                onFile={setZipFile}
              />
            </div>
          </Card>

          {/* Settings */}
          <Card>
            <h2 className="text-base font-semibold text-gray-800 mb-4">Settings</h2>
            <MosaicSettingsPanel
              settings={settings}
              preset={preset}
              user={profile}
              onChange={setSettings}
              onPreset={setPreset}
            />
          </Card>
        </div>

        {/* Generate button */}
        <div className="flex flex-col items-center gap-4">
          {error && (
            <div className="w-full bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
              {error}
            </div>
          )}
          <Button
            size="lg"
            loading={submitting}
            disabled={!canGenerate}
            onClick={handleGenerate}
            className="min-w-48"
          >
            {submitting ? "Generating…" : "Generate Mosaic"}
          </Button>
        </div>

        {/* Progress */}
        {jobStatus && (jobStatus.status === "pending" || jobStatus.status === "processing") && (
          <Card>
            <Progress
              value={jobStatus.progress}
              label={jobStatus.message || "Processing…"}
            />
          </Card>
        )}

        {/* Result */}
        {jobStatus?.status === "completed" && jobStatus.output_url && (
          <Card padding={false} className="p-6">
            <MosaicResult result={jobStatus} />
          </Card>
        )}

        {jobStatus?.status === "failed" && (
          <Card>
            <p className="text-red-600 text-sm">{jobStatus.error ?? "Generation failed. Please try again."}</p>
          </Card>
        )}
      </main>
      <Footer />
    </div>
  );
}
