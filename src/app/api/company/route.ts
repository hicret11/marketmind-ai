import { toCompanyErrorResponse } from "@/lib/company/errors";
import { createCompany, getActiveCompany, listCompanies } from "@/lib/company/repository";
import { parseCreateCompany } from "@/lib/company/validate";
import type { CompanyListResponse, CompanyResponse } from "@/types/company";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [companies, active] = await Promise.all([listCompanies(), getActiveCompany()]);
    const body: CompanyListResponse = { ok: true, companies, active };
    return Response.json(body);
  } catch (error) {
    return toCompanyErrorResponse(error);
  }
}

/** "+ Add Company" — creates a new company profile. Does not switch the active company. */
export async function POST(request: Request) {
  try {
    const raw = await request.json().catch(() => null);
    const input = parseCreateCompany(raw);
    const company = await createCompany(input);
    const body: CompanyResponse = { ok: true, company };
    return Response.json(body, { status: 201 });
  } catch (error) {
    return toCompanyErrorResponse(error);
  }
}
