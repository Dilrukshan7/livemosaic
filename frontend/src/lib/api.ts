import { MosaicSettings, JobStatusResponse } from "@/types";

const API = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/$/, "");

async function authFetch(url: string, init: RequestInit = {}, token: string): Promise<Response> {
  return fetch(url, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      Authorization: `Bearer ${token}`,
    },
  });
}

export function generateMosaic(
  mainImage: File,
  tilesZip: File,
  settings: MosaicSettings,
  token: string,
  onUploadProgress?: (pct: number) => void
): Promise<{ job_id: string }> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append("main_image", mainImage);
    form.append("tiles_zip", tilesZip);
    form.append("settings_json", JSON.stringify(settings));

    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable && onUploadProgress) {
        onUploadProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch {
          reject(new Error("Invalid server response"));
        }
      } else if (xhr.status === 401) {
        reject(new Error("Authentication failed. Please sign out and sign back in."));
      } else if (xhr.status === 429) {
        reject(new Error("Too many requests. Please wait a minute and try again."));
      } else if (xhr.status === 403) {
        try {
          const err = JSON.parse(xhr.responseText);
          reject(new Error(err.detail ?? "Plan limit reached. Please upgrade."));
        } catch {
          reject(new Error("Plan limit reached. Please upgrade."));
        }
      } else {
        try {
          const err = JSON.parse(xhr.responseText);
          reject(new Error(err.detail ?? `Server error (${xhr.status})`));
        } catch {
          reject(new Error(`Server error (${xhr.status})`));
        }
      }
    });

    xhr.addEventListener("error", () => reject(new Error("Network error — check your connection and try again.")));
    xhr.addEventListener("abort", () => reject(new Error("Upload cancelled.")));

    xhr.open("POST", `${API}/api/mosaic/generate`);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.send(form);
  });
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

export async function createCheckout(planName: string, token: string) {
  const res = await authFetch(
    `${API}/api/plans/checkout/${planName}`,
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
