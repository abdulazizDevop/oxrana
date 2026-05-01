import { NextRequest, NextResponse } from 'next/server';
import { signToken } from '@/lib/jwt';
import { rateLimit } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
  if (!rateLimit(ip, 5, 60000)) {
    return NextResponse.json({ error: 'Слишком много попыток входа' }, { status: 429 });
  }

  try {
    const { code } = await req.json();
    if (!code) return NextResponse.json({ error: 'Введите код' }, { status: 400 });

    const expected = process.env.ADMIN_PANEL_CODE || '5051';
    if (code !== expected) {
      return NextResponse.json({ error: 'Неверный код' }, { status: 401 });
    }

    const adminUser = {
      id: 'admin_sys',
      name: 'Администратор',
      role: 'admin',
      profession: 'Системный администратор',
      login: 'admin',
      allowed_sections: [],
      allowed_cities: [],
      allowed_companies: [],
      is_admin: true,
    };

    const token = await signToken(adminUser);
    const response = NextResponse.json({ success: true, user: adminUser });
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
    return NextResponse.json({ error: e?.message || 'Ошибка авторизации' }, { status: 500 });
  }
}
