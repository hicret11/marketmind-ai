import { FeatureCard } from "@/components/feature-card";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <FeatureCard
          title="Revenue"
          value="$48.2k"
          description="+12% this month"
          icon="💰"
        />
        <FeatureCard
          title="Leads"
          value={128}
          description="+8 today"
          icon="🎯"
        />
        <FeatureCard
          title="Campaigns"
          value={6}
          description="3 active"
          icon="📣"
        />
        <FeatureCard
          title="Conversion"
          value="3.4%"
          description="+0.3% vs last week"
          icon="📈"
        />
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-medium">Activity</h2>
        <p className="mt-2 text-sm text-gray-500">
          Connect Supabase and the API client to populate this view.
        </p>
      </div>
    </div>
  );
}
