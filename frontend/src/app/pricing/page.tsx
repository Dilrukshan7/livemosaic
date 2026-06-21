"use client";
import { useEffect, useState } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Plan } from "@/types";
import { getPlans, getCurrencyRates, createCheckout } from "@/lib/api";
import { createClient } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";

const CURRENCIES = ["USD", "EUR", "GBP", "JPY", "CAD", "AUD", "INR", "BRL"];

function formatPrice(usd: number, currency: string, rates: Record<string, number> | null): string {
  if (!rates || currency === "USD") return `$${usd.toFixed(2)}`;
  const rate = rates[currency];
  if (!rate) return `$${usd.toFixed(2)}`;
  const converted = usd * rate;
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(converted);
  } catch {
    return `${currency} ${converted.toFixed(2)}`;
  }
}

export default function PricingPage() {
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState("");
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currency, setCurrency] = useState("USD");
  const [rates, setRates] = useState<Record<string, number> | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setToken(data.session?.access_token ?? "");
    });
    getPlans().then(setPlans).catch(() => {});
    // Detect currency by IP (best-effort)
    fetch("https://ipapi.co/json/")
      .then((r) => r.json())
      .then((d) => {
        if (d.currency) setCurrency(d.currency);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    getCurrencyRates("USD").then((d) => {
      if (d?.rates) setRates(d.rates);
    }).catch(() => {});
  }, []);

  async function handleUpgrade(planName: string) {
    if (!user || !token) { window.location.href = "/auth/login"; return; }
    setLoading(true);
    try {
      const { checkout_url } = await createCheckout(planName, user.id, token);
      window.location.href = checkout_url;
    } catch (e) {
      alert("Could not start checkout. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar user={user} />
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Simple, transparent pricing</h1>
          <p className="text-gray-500 text-lg">Start for free. Upgrade when you need more.</p>
          <div className="mt-6 flex justify-center">
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const isPopular = plan.name === "pro";
            return (
              <Card
                key={plan.id}
                className={`relative flex flex-col ${isPopular ? "border-blue-500 shadow-lg" : ""}`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-blue-600 text-white text-xs font-semibold px-3 py-0.5 rounded-full">
                      Most popular
                    </span>
                  </div>
                )}
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-gray-900">{plan.display_name}</h2>
                  <p className="text-3xl font-bold text-gray-900 mt-3">
                    {plan.price_usd === 0
                      ? "Free"
                      : formatPrice(plan.price_usd, currency, rates)}
                    {plan.price_usd > 0 && (
                      <span className="text-base font-normal text-gray-400">/month</span>
                    )}
                  </p>

                  <ul className="mt-6 space-y-3 text-sm text-gray-600">
                    <li>
                      {plan.monthly_mosaics == null
                        ? "✓ Unlimited mosaics"
                        : `✓ ${plan.monthly_mosaics} mosaics / month`}
                    </li>
                    <li>✓ Min cell size: {plan.min_cell_size}px</li>
                    <li>✓ Max resolution: {plan.max_output_resolution}x</li>
                    <li>
                      {plan.allowed_formats.includes("PNG") ? "✓" : "✗"} PNG output
                    </li>
                    <li>
                      {plan.features?.commercial_use ? "✓" : "✗"} Commercial use
                    </li>
                    <li>
                      {plan.features?.priority_queue ? "✓" : "✗"} Priority processing
                    </li>
                  </ul>
                </div>

                <div className="mt-8">
                  {plan.price_usd === 0 ? (
                    <Button
                      variant="secondary"
                      className="w-full"
                      onClick={() => (window.location.href = user ? "/create" : "/auth/register")}
                    >
                      Get started free
                    </Button>
                  ) : (
                    <Button
                      className="w-full"
                      loading={loading}
                      onClick={() => handleUpgrade(plan.name)}
                    >
                      Upgrade to {plan.display_name}
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </main>
      <Footer />
    </div>
  );
}
