export * from "./opportunity";

export interface NavItem {
  label: string;
  href: string;
  icon: string;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

export interface Company {
  id: string;
  name: string;
  industry?: string;
  website?: string;
  createdAt: string;
}

export type OpportunityStage =
  | "lead"
  | "qualified"
  | "proposal"
  | "won"
  | "lost";

export interface Opportunity {
  id: string;
  title: string;
  company: string;
  value: number;
  stage: OpportunityStage;
  createdAt: string;
}

export interface Note {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface Contact {
  id: string;
  name: string;
  email: string;
  company?: string;
  role?: string;
}
