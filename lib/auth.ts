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
  // DB column names (snake_case)
  allowed_sections?: SectionId[];
  allowed_cities?: string[];
  allowed_companies?: string[];
  // Frontend mapped names (camelCase)
  allowedSections: SectionId[];
  allowedCities: string[];
  allowedCompanies: string[];
  email?: string;
  phone?: string;
  created_at?: string;
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
