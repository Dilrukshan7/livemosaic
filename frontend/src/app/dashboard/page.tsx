"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import UsageCard from "@/components/dashboard/UsageCard";
import JobHistory from "@/components/dashboard/JobHistory";
import { UserProfile, MosaicJob } from "@/types";
import { getMe, getHistory, getBillingPortal } from "@/lib/api";
import { createClient } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";
import Link from "next/link";
import Button from "@/components/ui/Button";

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();

  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [jobs, setJobs] = useState<MosaicJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const s = data.session;
      if (!s) { router.push("/auth/login"); return; }
      setUser(s.user);
      setToken(s.access_token);
      try {
        const [p, h] = await Promise.all([getMe(s.access_token), getHistory(s.access_token)]);
        setProfile(p);
        setJobs(h);
      } catch {}
      setLoading(false);
    });
  }, []);

  async function handleManageBilling() {
    try {
      const { portal_url } = await getBillingPortal(token);
      window.location.href = portal_url;
    } catch (e) {
      alert("Could not open billing portal.");
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar user={user} />
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-10 space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <Link href="/create">
            <Button>Create Mosaic</Button>
          </Link>
        </div>

        {loading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-32 bg-gray-100 rounded-xl" />
            <div className="h-48 bg-gray-100 rounded-xl" />
          </div>
        ) : (
          <>
            {profile && <UsageCard user={profile} onManageBilling={handleManageBilling} />}
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-3">Recent mosaics</h2>
              <JobHistory jobs={jobs} />
            </div>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
