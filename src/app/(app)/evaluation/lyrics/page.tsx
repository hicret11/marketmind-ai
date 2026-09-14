"use client";

import { HumanEvalBenchmarkPage } from "@/components/evaluation/human-eval-benchmark-page";
import { LYRICS_SCORE_DIMENSIONS } from "@/types/evaluation";

export default function LyricsBenchmarkPage() {
  return (
    <HumanEvalBenchmarkPage
      taskId="lyrics"
      title="Personalized Lyrics Benchmark"
      icon="🎵"
      description="Given the same personalization brief, which model writes the strongest personalized birthday lyrics?"
      dimensions={LYRICS_SCORE_DIMENSIONS}
    />
  );
}
