import { randomUUID } from "node:crypto";
import { createJsonArrayStore } from "@/lib/file-store";
import type { CompanyProfile, CreateCompanyInput } from "@/types/company";

/**
 * Company persistence — .data/companies.json, same file-based repository
 * pattern used across MarketMind (Notes, Chat, Evaluation Lab, Social).
 * Multiple companies are supported architecturally; today exactly one is
 * seeded (Sing My Birthday) and active. Nothing here is invented per-field —
 * a newly added company simply has empty sections until the user fills them.
 */

const store = createJsonArrayStore<CompanyProfile>("companies.json");

function seedSingMyBirthday(): CompanyProfile {
  const now = new Date().toISOString();
  return {
    id: "sing-my-birthday",
    name: "Sing My Birthday",
    website: "https://singmybirthday.com",
    companyType: "Personalized birthday experience / digital gifting",
    description:
      "Sing My Birthday creates personalized birthday songs using the recipient's name, personality, interests, memories and story. The experience can include custom lyrics, generated music, a shareable digital page, personalized video and optional photo slideshow.",
    useCases: [
      "Personalized birthday gifts",
      "Romantic birthday surprises",
      "Family birthday experiences",
      "Birthday venue add-ons",
      "Restaurant / hotel celebration experiences",
      "Kids party experiences",
      "Event planner partnerships",
      "Gift partnerships",
    ],
    productStrengths: [
      "Personalization",
      "Emotional gifting",
      "Memorable birthday experience",
      "Digital delivery",
      "B2B add-on opportunity",
    ],
    targetAudience: [
      "People buying a personalized birthday gift for someone else",
      "Couples and partners planning a romantic birthday surprise",
      "Families celebrating a birthday together",
      "Birthday and party venues looking for a premium add-on",
      "Restaurants and hotels with celebration packages",
      "Kids party businesses",
      "Event planners and gifting businesses",
    ],
    businessModel: "B2C + B2B",
    b2bTargetCategories: [
      "Birthday / party venues",
      "Soft play / kids entertainment",
      "Event and party planners",
      "Restaurants with celebration offerings",
      "Hotels",
      "Daycare / nursery where relevant",
      "Gift businesses",
      "Florists",
      "Celebration services",
    ],
    brandPositioning:
      "Do not position the product mainly as \"AI-powered.\" Lead with the emotional experience the recipient has, not the technology behind it.",
    brandFocusThemes: ["Emotion", "Memory", "Reaction", "Personalization", "Feeling", "Replay value"],
    marketingGoals: [],
    integrations: [
      "MarketMind AI Opportunity Discovery (OpenStreetMap business search)",
      "Gemini — AI Opportunity Intelligence & content analysis",
      "Instagram API with Instagram Login — real account sync & insights",
    ],
    notes: null,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };
}

async function ensureSeeded(): Promise<CompanyProfile[]> {
  const existing = await store.list();
  if (existing.length > 0) return existing;
  const seeded = seedSingMyBirthday();
  await store.mutate((items) => ({ items: [seeded], result: undefined }));
  return [seeded];
}

export async function listCompanies(): Promise<CompanyProfile[]> {
  return ensureSeeded();
}

export async function getActiveCompany(): Promise<CompanyProfile | null> {
  const companies = await ensureSeeded();
  return companies.find((c) => c.isActive) ?? companies[0] ?? null;
}

export async function getCompanyById(id: string): Promise<CompanyProfile | null> {
  const companies = await ensureSeeded();
  return companies.find((c) => c.id === id) ?? null;
}

/** Creates a new company from the "+ Add Company" form. Does NOT switch the active company. */
export async function createCompany(input: CreateCompanyInput): Promise<CompanyProfile> {
  await ensureSeeded();
  const now = new Date().toISOString();
  const record: CompanyProfile = {
    id: randomUUID(),
    name: input.name,
    website: input.website,
    companyType: input.industry,
    description: input.description,
    useCases: input.productsServices,
    productStrengths: [],
    targetAudience: input.targetAudience,
    businessModel: null,
    b2bTargetCategories: [],
    brandPositioning: null,
    brandFocusThemes: [],
    marketingGoals: input.goals,
    integrations: [],
    notes: input.notes,
    isActive: false,
    createdAt: now,
    updatedAt: now,
  };
  await store.mutate((items) => ({ items: [...items, record], result: undefined }));
  return record;
}
