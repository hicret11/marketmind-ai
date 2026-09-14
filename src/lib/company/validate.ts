import { CompanyError } from "./errors";
import type { CreateCompanyInput } from "@/types/company";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function strArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter(Boolean);
}

export function parseCreateCompany(body: unknown): CreateCompanyInput {
  if (!isRecord(body)) throw new CompanyError("INVALID_REQUEST", "Request body must be an object.");
  const name = str(body.name);
  if (!name) throw new CompanyError("INVALID_REQUEST", "`name` is required.");

  return {
    name,
    website: str(body.website),
    description: str(body.description),
    industry: str(body.industry),
    targetAudience: strArray(body.targetAudience),
    productsServices: strArray(body.productsServices),
    goals: strArray(body.goals),
    notes: str(body.notes),
  };
}
