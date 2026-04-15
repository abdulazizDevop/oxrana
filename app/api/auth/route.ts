import { rateLimit } from "@/lib/rate-limit";

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { signToken } from '@/lib/jwt';

export async function POST(req: NextRequest) {
  const forwardedFor = req.headers.get("x-forwarded-for");
  const ip = req.headers.get("x-real-ip") ?? (forwardedFor ? forwardedFor.split(',')[0].trim() : "127.0.0.1");
  if (!rateLimit(ip, 10, 60000)) {
    return NextResponse.json({ error: "Слишком много попыток входа, подождите минуту" }, { status: 429 });
  }

  try {
  const { login, password } = await req.json();

  if (!login || !password) {
    return NextResponse.json({ error: 'Заполните все поля' }, { status: 400 });
  }

  // Admin login check (via environment variables only)
  const envAdminLogin = process.env.ADMIN_LOGIN;
  const envAdminPassword = process.env.ADMIN_PASSWORD;

  if (
    envAdminLogin && envAdminPassword &&
    login.trim() === envAdminLogin &&
    password === envAdminPassword
  ) {
    const adminUser = {
      id: 'admin_sys',
      name: 'Администратор',
      role: 'admin',
      profession: 'Системный администратор',
      login: envAdminLogin,
      allowed_sections: [],
      allowed_cities: [],
      allowed_companies: [],
      is_admin: true,
    };
    
    const token = await signToken(adminUser);
    const response = NextResponse.json(adminUser);
    response.cookies.set({
      name: 'auth_token',
      value: token,
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === 'true',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7, // 30 days
      path: '/',
    });
    return response;
  }

  // 1. Ищем в основных пользователях
  const res = await query('SELECT * FROM app_users WHERE login = $1', [login]);
  if (res.rows.length > 0) {
    const user = res.rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return NextResponse.json({ error: 'Неверный пароль' }, { status: 401 });
    
    const { password_hash, plain_password, ...safeUser } = user;
    
    const token = await signToken(safeUser);
    const response = NextResponse.json(safeUser);
    response.cookies.set({
      name: 'auth_token',
      value: token,
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === 'true',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7, // 30 days
      path: '/',
    });
    return response;
  }

  // 2. Ищем в дополнительных логинах
  const loginRes = await query(
    'SELECT ul.*, au.id as main_id, au.name, au.role, au.profession, au.allowed_sections, au.allowed_cities, au.allowed_companies, au.is_admin FROM user_logins ul JOIN app_users au ON au.id = ul.user_id WHERE ul.login = $1',
    [login]
  );
  if (loginRes.rows.length === 0) {
    return NextResponse.json({ error: 'Пользователь не найден' }, { status: 401 });
  }
  const ul = loginRes.rows[0];
  const ok = await bcrypt.compare(password, ul.password_hash);
  if (!ok) return NextResponse.json({ error: 'Неверный пароль' }, { status: 401 });

  const safeUser = {
    id: ul.main_id,
    name: ul.name,
    role: ul.role,
    profession: ul.profession,
    login: ul.login,
    allowed_sections: ul.allowed_sections,
    allowed_cities: ul.allowed_cities,
    allowed_companies: ul.allowed_companies,
    is_admin: ul.is_admin,
  };

  const token = await signToken(safeUser);
  const response = NextResponse.json(safeUser);
  response.cookies.set({
    name: 'auth_token',
    value: token,
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === 'true',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });
  return response;
  } catch (e: any) {
    console.error('Auth error:', e?.message);
    return NextResponse.json({ error: 'Ошибка авторизации' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  // Simple check route
  const token = req.cookies.get('auth_token')?.value;
  if (!token) return NextResponse.json({ authenticated: false }, { status: 401 });
  
  const { verifyToken } = await import('@/lib/jwt');
  const payload = await verifyToken(token);
  if (!payload) return NextResponse.json({ authenticated: false }, { status: 401 });
  
  return NextResponse.json({ authenticated: true, user: payload });
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete('auth_token');
  return response;
}
