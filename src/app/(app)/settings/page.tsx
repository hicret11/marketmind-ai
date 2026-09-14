import { ComingSoon } from "@/components/coming-soon";
import { AiIntelligenceStatus } from "@/components/settings/ai-intelligence-status";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <AiIntelligenceStatus />
      <ComingSoon title="Settings" description="More settings are coming soon." />
    </div>
  );
}
