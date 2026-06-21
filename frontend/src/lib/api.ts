import { MosaicSettings, JobStatusResponse } from "@/types";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function authFetch(url: string, init: RequestInit = {}, token: string): Promise<Response> {
  return fetch(url, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function generateMosaic(
  mainImage: File,
  tilesZip: File,
  settings: MosaicSettings,
  token: string
): Promise<{ job_id: string }> {
  const form = new FormData();
  form.append("main_image", mainImage);
  form.append("tiles_zip", tilesZip);
  form.append("settings_json", JSON.stringify(settings));

  const res = await authFetch(`${API}/api/mosaic/generate`, { method: "POST", body: form }, token);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(err.detail ?? "Generation failed");
  }
  return res.json();
}

export async function getJobStatus(jobId: string, token: string): Promise<JobStatusResponse> {
  const res = await authFetch(`${API}/api/mosaic/status/${jobId}`, {}, token);
  if (!res.ok) throw new Error("Failed to fetch job status");
  return res.json();
}

export async function getHistory(token: string) {
  const res = await authFetch(`${API}/api/mosaic/history`, {}, token);
  if (!res.ok) throw new Error("Failed to fetch history");
  return res.json();
}

export async function getMe(token: string) {
  const res = await authFetch(`${API}/api/users/me`, {}, token);
  if (!res.ok) throw new Error("Failed to fetch user profile");
  return res.json();
}

export async function getPlans() {
  const res = await fetch(`${API}/api/plans/`);
  if (!res.ok) throw new Error("Failed to fetch plans");
  return res.json();
}

export async function getCurrencyRates(base = "USD") {
  const res = await fetch(`${API}/api/plans/currency-rates?base=${base}`);
  if (!res.ok) return null;
  return res.json();
}

export async function createCheckout(planName: string, userId: string, token: string) {
  const res = await authFetch(
    `${API}/api/plans/checkout/${planName}?user_id=${encodeURIComponent(userId)}`,
    { method: "POST" },
    token
  );
  if (!res.ok) throw new Error("Failed to create checkout");
  return res.json();
}

export async function getBillingPortal(token: string) {
  const res = await authFetch(`${API}/api/payments/portal`, { method: "POST" }, token);
  if (!res.ok) throw new Error("Failed to open billing portal");
  return res.json();
}
