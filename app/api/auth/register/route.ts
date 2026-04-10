import { rateLimit } from "@/lib/rate-limit";

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { signToken } from '@/lib/jwt';

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
  if (!rateLimit(ip, 5, 60000)) {
    return NextResponse.json({ error: "Слишком много попыток регистрации, подождите минуту" }, { status: 429 });
  }

  try {
    const { login, email, name, phone, password } = await req.json();

    if (!login || login.length < 3) {
      return NextResponse.json({ error: 'Логин должен содержать минимум 3 символа' }, { status: 400 });
    }

    const checkRes = await query('SELECT id FROM app_users WHERE login = $1', [login]);
    if (checkRes.rows.length > 0) {
      return NextResponse.json({ error: 'Этот логин уже занят' }, { status: 400 });
    }

    // Try checking email if column exists (it should now)
    const checkEmail = await query('SELECT id FROM app_users WHERE email = $1', [email]);
    if (checkEmail.rows.length > 0) {
      return NextResponse.json({ error: 'Этот email уже зарегистрирован' }, { status: 400 });
    }

    const password_hash = await bcrypt.hash(password, 12);
    const id = "usr_" + Date.now() + "_" + Math.random().toString(36).substring(2,9);

    const allowed_sections = [
      "passes", "schedule", "violations", "fuel", "vehicles", 
      "night_checks", "tabel", "documents", "finances", 
      "passes_permanent", "weapon", "seal", "tmd", "racer", "alcohol",
      "employees", "reports", "settings"
    ];

    // FIX: Do not store plain_password to DB (set as [HIDDEN] for compatibility if column is required)
    await query(
      `INSERT INTO app_users (id, name, role, profession, login, password_hash, plain_password, allowed_sections, allowed_cities, allowed_companies, is_admin, email, phone) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, false, $11, $12)`,
      [id, name, 'company_manager', 'Офис ЧОПа', login, password_hash, '[HIDDEN]', allowed_sections, [], [], email, phone]
    );

    const safeUser = { 
      id, 
      name, 
      role: 'company_manager', 
      profession: 'Офис ЧОПа',
      login, 
      allowed_sections: allowed_sections,
      allowed_cities: [],
      allowed_companies: [],
      is_admin: false
    };

    const token = await signToken(safeUser);
    const response = NextResponse.json(safeUser);
    response.cookies.set({
      name: 'auth_token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return response;

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
