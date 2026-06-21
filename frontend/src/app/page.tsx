import Link from "next/link";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Button from "@/components/ui/Button";

async function getUser() {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll() } }
    );
    const { data } = await supabase.auth.getUser();
    return data.user;
  } catch {
    return null;
  }
}

export default async function Home() {
  const user = await getUser();

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar user={user} />

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-4 py-24">
        <div className="max-w-3xl">
          <span className="inline-block bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full mb-6 uppercase tracking-wide">
            Photomosaic Generator
          </span>
          <h1 className="text-5xl sm:text-6xl font-bold text-gray-900 leading-tight mb-6">
            Turn any photo into a{" "}
            <span className="text-blue-600">stunning mosaic</span>
          </h1>
          <p className="text-xl text-gray-500 mb-10 max-w-xl mx-auto leading-relaxed">
            Upload your main photo and a collection of tile images. MosaicForge builds a
            photomosaic where every pixel is made from your own photos.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link href={user ? "/create" : "/auth/register"}>
              <Button size="lg">
                {user ? "Create a Mosaic" : "Get started free"}
              </Button>
            </Link>
            <Link href="/pricing">
              <Button size="lg" variant="secondary">
                See pricing
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-white border-t border-gray-100 py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">How it works</h2>
          <div className="grid sm:grid-cols-3 gap-8">
            {[
              {
                step: "1",
                title: "Upload your photos",
                desc: "Choose a main photo and a ZIP file of tile images — hundreds of personal photos work great.",
              },
              {
                step: "2",
                title: "Adjust the settings",
                desc: "Pick a preset or fine-tune cell size, blend, resolution and format with our sliders.",
              },
              {
                step: "3",
                title: "Download your mosaic",
                desc: "We process it on our servers and give you a high-quality download link within minutes.",
              },
            ].map(({ step, title, desc }) => (
              <div key={step} className="text-center">
                <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold text-lg flex items-center justify-center mx-auto mb-4">
                  {step}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
