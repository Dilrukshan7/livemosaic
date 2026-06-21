"use client";
import { Card } from "@/components/ui/Card";
import { UserProfile } from "@/types";
import Button from "@/components/ui/Button";
import Link from "next/link";

interface UsageCardProps {
  user: UserProfile;
  onManageBilling?: () => void;
}

export default function UsageCard({ user, onManageBilling }: UsageCardProps) {
  const pct =
    user.monthly_limit != null && user.monthly_limit > 0
      ? Math.min(100, Math.round((user.mosaics_used_this_month / user.monthly_limit) * 100))
      : null;

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm text-gray-500">Current plan</p>
          <p className="text-xl font-bold text-gray-900">{user.plan_display_name}</p>
        </div>
        {user.plan_name === "free" && (
          <Link href="/pricing">
            <Button size="sm">Upgrade</Button>
          </Link>
        )}
        {user.plan_name !== "free" && onManageBilling && (
          <Button size="sm" variant="secondary" onClick={onManageBilling}>
            Manage Billing
          </Button>
        )}
      </div>

      <div>
        <div className="flex justify-between mb-1">
          <span className="text-sm text-gray-600">Mosaics this month</span>
          <span className="text-sm font-semibold text-gray-800">
            {user.mosaics_used_this_month}
            {user.monthly_limit != null ? ` / ${user.monthly_limit}` : " (unlimited)"}
          </span>
        </div>
        {pct !== null && (
          <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${pct >= 90 ? "bg-red-500" : "bg-blue-600"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        )}
      </div>
    </Card>
  );
}
