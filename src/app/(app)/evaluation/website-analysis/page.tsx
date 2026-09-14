"use client";

import { ClassificationBenchmarkPage } from "@/components/evaluation/classification-benchmark-page";

export default function WebsiteAnalysisBenchmarkPage() {
  return (
    <ClassificationBenchmarkPage
      taskId="website-analysis"
      title="Website Analysis Benchmark"
      icon="🔍"
      description="Given real website text, which model most reliably answers specific yes/no questions — offers birthday parties, serves families, mentions personalization?"
    />
  );
}
