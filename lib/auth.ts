// Типы
export type SectionId = "patrol" | "shift" | "posts" | "photo" | "apartment" | "inventory" | "transport" | "schedule" | "fines" | "requests" | "employees";

export const ALL_SECTIONS: SectionId[] = ["patrol","shift","posts","photo","apartment","inventory","transport","schedule","fines","requests","employees"];

export interface AppUser {
  id: string;
  name: string;
  profession: string;
  role: string;
  login: string;
  password: string;
  is_admin?: boolean;
  allowedSections: SectionId[];
  allowed_sections?: SectionId[];
  allowed_cities?: string[];
  allowed_companies?: string[];
  allowedCities: string[];
  allowedCompanies: string[];
  createdAt?: number;
}

export interface Company {
  id: string;
  name: string;
  cityId: string;
  description?: string;
  professions_list?: string;
  employee_count?: number;
  createdAt?: number;
  subscriptionEndsAt?: string;
  ownerId?: string;
}
