import { apiRequest } from "@/lib/http";
import type { CompanyListResponse, CompanyResponse, CreateCompanyInput } from "@/types/company";

export { ApiError } from "@/lib/http";

export function fetchCompanies(): Promise<CompanyListResponse> {
  return apiRequest<CompanyListResponse>("/api/company");
}

export function createCompany(input: CreateCompanyInput): Promise<CompanyResponse> {
  return apiRequest<CompanyResponse>("/api/company", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
