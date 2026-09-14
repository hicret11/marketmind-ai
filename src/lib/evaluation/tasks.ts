import type { BenchmarkTaskDefinition, BenchmarkTaskId } from "@/types/evaluation";

/**
 * The five benchmark tasks. Static product definitions (like
 * lib/product-context.ts) — the DATA (datasets/cases/runs) is dynamic and
 * file-backed; these definitions are not.
 */
export const BENCHMARK_TASKS: BenchmarkTaskDefinition[] = [
  {
    id: "lead-qualification",
    title: "Lead Qualification",
    shortTitle: "Lead Qualification",
    description:
      "Given the same verified business + website evidence Opportunity Discovery already produced, which model best predicts whether a business is a qualified Sing My Birthday partnership opportunity?",
    evaluationMode: "classification",
    promptVersion: "lead-qualification-v1",
    route: "/evaluation/lead-qualification",
  },
  {
    id: "website-analysis",
    title: "Website Analysis",
    shortTitle: "Website Analysis",
    description:
      "Given real website text, which model most reliably answers specific yes/no questions (offers birthday parties? serves families? mentions personalization?).",
    evaluationMode: "classification",
    promptVersion: "website-analysis-v1",
    route: "/evaluation/website-analysis",
  },
  {
    id: "lyrics",
    title: "Personalized Lyrics Generation",
    shortTitle: "Lyrics Generation",
    description:
      "Given the same personalization brief, which model writes the strongest personalized birthday lyrics? Scored by human review — this is a creative task, not a classification one.",
    evaluationMode: "human-eval",
    promptVersion: "lyrics-v1",
    route: "/evaluation/lyrics",
  },
  {
    id: "content",
    title: "Marketing Content Generation",
    shortTitle: "Content Generation",
    description:
      "Given the same content brief (platform, goal, audience, voice), which model writes the strongest Sing My Birthday marketing copy? Scored by human review.",
    evaluationMode: "human-eval",
    promptVersion: "content-v1",
    route: "/evaluation/content",
  },
  {
    id: "image",
    title: "Birthday Image Generation",
    shortTitle: "Image Generation",
    description:
      "Framework for comparing birthday-themed image generation sources (e.g. a future Sing My Birthday SDXL LoRA vs. a baseline). V1 imports already-generated images for human scoring — no live image API is called yet.",
    evaluationMode: "human-eval",
    promptVersion: "image-v1",
    route: "/evaluation/images",
  },
];

export function getTaskDefinition(taskId: BenchmarkTaskId): BenchmarkTaskDefinition {
  const task = BENCHMARK_TASKS.find((t) => t.id === taskId);
  if (!task) throw new Error(`Unknown benchmark task: ${taskId}`);
  return task;
}
