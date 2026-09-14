"use client";

import { ClassificationBenchmarkPage } from "@/components/evaluation/classification-benchmark-page";

export default function LeadQualificationBenchmarkPage() {
  return (
    <ClassificationBenchmarkPage
      taskId="lead-qualification"
      title="Lead Qualification Benchmark"
      icon="🎯"
      description="Given the same verified business + website evidence Opportunity Discovery already produced, which model best predicts whether a business is a qualified Sing My Birthday partnership opportunity?"
    />
  );
}
