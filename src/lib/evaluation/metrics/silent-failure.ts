/**
 * Silent Failure classification.
 *
 * Definition (per spec): the model produces a valid-looking answer that is
 * WRONG and does NOT indicate uncertainty — as opposed to being wrong but
 * honestly flagging doubt. Only computed when ground truth exists; never
 * fabricated uncertainty detection — "flagged" is read directly from the
 * model's own structured `confidence` / `uncertainty` fields (part of the
 * same schema-validated response, not a separate judgment call).
 *
 *   Correct            -> predicted == actual
 *   Incorrect, flagged  -> predicted != actual AND (confidence == "low" OR uncertainty is non-empty)
 *   Incorrect, silent    -> predicted != actual AND confidence != "low" AND uncertainty is empty
 */
export type SilentFailureCategory = "correct" | "incorrect_flagged" | "incorrect_silent";

export function categorizeSilentFailure(params: {
  predicted: boolean;
  actual: boolean;
  confidence: "high" | "medium" | "low";
  uncertainty: string;
}): SilentFailureCategory {
  if (params.predicted === params.actual) return "correct";
  const flagged = params.confidence === "low" || params.uncertainty.trim().length > 0;
  return flagged ? "incorrect_flagged" : "incorrect_silent";
}
