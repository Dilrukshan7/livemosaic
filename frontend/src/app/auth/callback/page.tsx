"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

export default function AuthCallback() {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        router.push("/dashboard");
        router.refresh();
      }
    });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center text-gray-500">
      Signing you in…
    </div>
  );
}
