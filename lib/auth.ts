import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from './jwt';

// Auth helper — use in every protected route
export async function requireAuth(req: NextRequest): Promise<{ payload: any } | NextResponse> {
  const token = req.cookies.get('auth_token')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const payload = await verifyToken(token);
  if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  return { payload };
}

export function requireAdmin(payload: any): NextResponse | null {
  if (!payload?.is_admin) return NextResponse.json({ error: 'Forbidden: Admin only' }, { status: 403 });
  return null;
}

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
