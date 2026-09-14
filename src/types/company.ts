/**
 * Company profile types.
 *
 * The architecture supports multiple companies (a `companies` list, each with
 * an `isActive` flag), but only ONE is seeded and active today: Sing My
 * Birthday. Nothing here is fabricated — fields the user hasn't supplied for
 * a newly-created company are simply empty, never invented.
 */

export interface CompanyProfile {
  id: string;
  name: string;
  website: string | null;
  /** Free-text company type, e.g. "Personalized birthday experience / digital gifting". */
  companyType: string | null;
  description: string | null;

  /** Product section. */
  useCases: string[];
  productStrengths: string[];

  /** Target Audience section. */
  targetAudience: string[];

  /** B2B Opportunity Profile section. */
  businessModel: string | null; // e.g. "B2C + B2B"
  b2bTargetCategories: string[];

  /** Brand Voice section. */
  brandPositioning: string | null;
  brandFocusThemes: string[];

  /** Marketing Goals section. */
  marketingGoals: string[];

  /** Current Technology / Integrations section — plain, editable text list. */
  integrations: string[];

  notes: string | null;

  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** The simpler field set the "+ Add Company" form collects. */
export interface CreateCompanyInput {
  name: string;
  website: string | null;
  description: string | null;
  industry: string | null;
  targetAudience: string[];
  productsServices: string[];
  goals: string[];
  notes: string | null;
}

export interface CompanyListResponse {
  ok: boolean;
  companies: CompanyProfile[];
  active: CompanyProfile | null;
}

export interface CompanyResponse {
  ok: boolean;
  company: CompanyProfile;
}
