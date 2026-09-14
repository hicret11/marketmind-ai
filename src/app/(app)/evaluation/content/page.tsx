"use client";

import { HumanEvalBenchmarkPage } from "@/components/evaluation/human-eval-benchmark-page";
import { CONTENT_SCORE_DIMENSIONS } from "@/types/evaluation";

export default function ContentBenchmarkPage() {
  return (
    <HumanEvalBenchmarkPage
      taskId="content"
      title="Marketing Content Benchmark"
      icon="✍️"
      description="Given the same content brief, which model writes the strongest Sing My Birthday marketing copy?"
      dimensions={CONTENT_SCORE_DIMENSIONS}
    />
  );
}
