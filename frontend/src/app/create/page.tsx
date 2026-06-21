"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import UploadZone from "@/components/upload/UploadZone";
import MosaicSettingsPanel from "@/components/settings/MosaicSettings";
import MosaicResult from "@/components/result/MosaicResult";
import Button from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DEFAULT_SETTINGS, MosaicSettings, PresetName, JobStatusResponse, UserProfile } from "@/types";
import { generateMosaic, getJobStatus, getMe } from "@/lib/api";
import { createClient } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";

type Phase = "idle" | "uploading" | "processing" | "done" | "failed";

export default function CreatePage() {
  const router = useRouter();
  const supabase = createClient();
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const errorRef = useRef<HTMLDivElement | null>(null);

  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string>("");

  const [mainFile, setMainFile] = useState<File | null>(null);
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [settings, setSettings] = useState<MosaicSettings>(DEFAULT_SETTINGS);
  const [preset, setPreset] = useState<PresetName>("Balanced");

  const [phase, setPhase] = useState<Phase>("idle");
  const [uploadPct, setUploadPct] = useState(0);
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

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  function handleMainFile(file: File) {
    setMainFile(file);
    setPreview(URL.createObjectURL(file));
  }

  async function handleGenerate() {
    if (!mainFile || !zipFile || !token || phase !== "idle") return;
    setError("");
    setJobStatus(null);
    setUploadPct(0);
    setPhase("uploading");

    try {
      const { job_id } = await generateMosaic(
        mainFile, zipFile, settings, token,
        (pct) => setUploadPct(pct),
      );

      setPhase("processing");
      setJobStatus({ job_id, status: "pending", progress: 0, message: "Queued" });

      pollRef.current = setInterval(async () => {
        try {
          const status = await getJobStatus(job_id, token);
          setJobStatus(status);
          if (status.status === "completed") {
            clearInterval(pollRef.current!);
            setPhase("done");
          } else if (status.status === "failed") {
            clearInterval(pollRef.current!);
            setError(status.error ?? "Generation failed. Please try again.");
            setPhase("failed");
          }
        } catch {
          clearInterval(pollRef.current!);
          setError("Lost connection while polling. Please refresh and check your dashboard.");
          setPhase("failed");
        }
      }, 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Generation failed";
      setError(msg);
      setPhase("failed");
      setTimeout(() => errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
    }
  }

  function handleReset() {
    if (pollRef.current) clearInterval(pollRef.current);
    setPhase("idle");
    setError("");
    setJobStatus(null);
    setUploadPct(0);
  }

  const isBusy = phase === "uploading" || phase === "processing";
  const canGenerate = !!mainFile && !!zipFile && phase === "idle";

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
                disabled={isBusy}
              />
              <UploadZone
                label="Tile Images (ZIP file)"
                accept={{ "application/zip": [".zip"], "application/x-zip-compressed": [".zip"] }}
                file={zipFile}
                maxSize={200 * 1024 * 1024}
                onFile={setZipFile}
                disabled={isBusy}
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

        {/* Error */}
        {error && (
          <div ref={errorRef} className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm flex items-start gap-3">
            <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div className="flex-1">
              <p className="font-medium">Error</p>
              <p className="mt-0.5">{error}</p>
            </div>
            <button onClick={handleReset} className="text-red-500 hover:text-red-700 text-xs underline mt-0.5">Dismiss</button>
          </div>
        )}

        {/* Phase: Uploading */}
        {phase === "uploading" && (
          <Card>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm font-medium text-gray-700">
                <span>Uploading files to server…</span>
                <span className="text-blue-600 font-semibold">{uploadPct}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className="h-3 bg-blue-500 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${uploadPct}%` }}
                />
              </div>
              <p className="text-xs text-gray-500">
                Sending {mainFile && zipFile
                  ? `${(((mainFile.size + zipFile.size) / 1024 / 1024)).toFixed(1)} MB`
                  : "files"} — please keep this tab open.
              </p>
            </div>
          </Card>
        )}

        {/* Phase: Processing */}
        {phase === "processing" && jobStatus && (
          <Card>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm font-medium text-gray-700">
                <span>{jobStatus.message || "Processing mosaic…"}</span>
                <span className="text-blue-600 font-semibold">{jobStatus.progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className="h-3 bg-blue-500 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${jobStatus.progress}%` }}
                />
              </div>
              <p className="text-xs text-gray-500">This may take 1–3 minutes depending on image size.</p>
            </div>
          </Card>
        )}

        {/* Result */}
        {phase === "done" && jobStatus?.output_url && (
          <Card padding={false} className="p-6">
            <MosaicResult result={jobStatus} />
          </Card>
        )}

        {/* Generate / status button */}
        <div className="flex flex-col items-center gap-3">
          {phase === "done" ? (
            <Button variant="secondary" onClick={handleReset}>
              Create another mosaic
            </Button>
          ) : phase === "failed" ? (
            <Button onClick={handleReset}>
              Try again
            </Button>
          ) : phase === "uploading" ? (
            <Button size="lg" disabled className="min-w-56 cursor-not-allowed opacity-80">
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
                Uploading… {uploadPct}%
              </span>
            </Button>
          ) : phase === "processing" ? (
            <Button size="lg" disabled className="min-w-56 cursor-not-allowed opacity-80">
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
                Generating mosaic…
              </span>
            </Button>
          ) : (
            <Button
              size="lg"
              disabled={!canGenerate}
              onClick={handleGenerate}
              className="min-w-56"
            >
              Generate Mosaic
            </Button>
          )}

          {!mainFile && phase === "idle" && (
            <p className="text-xs text-gray-400">Upload a main photo and a ZIP of tiles to get started.</p>
          )}
          {mainFile && !zipFile && phase === "idle" && (
            <p className="text-xs text-gray-400">Now upload a ZIP file containing your tile images.</p>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
