"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import Button from "@/components/ui/Button";
import { User } from "@supabase/supabase-js";

interface NavbarProps {
  user: User | null;
}

export default function Navbar({ user }: NavbarProps) {
  const router = useRouter();
  const supabase = createClient();

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-gray-900 text-lg">
          <span className="text-2xl">🎨</span>
          MosaicForge
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/pricing" className="text-sm text-gray-600 hover:text-gray-900">
            Pricing
          </Link>
          {user ? (
            <>
              <Link href="/create">
                <Button size="sm">Create Mosaic</Button>
              </Link>
              <Link href="/dashboard">
                <Button size="sm" variant="secondary">Dashboard</Button>
              </Link>
              <Button size="sm" variant="ghost" onClick={signOut}>
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Link href="/auth/login">
                <Button size="sm" variant="secondary">Sign in</Button>
              </Link>
              <Link href="/auth/register">
                <Button size="sm">Get started</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
