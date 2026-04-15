import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { verifyToken, signToken } from '@/lib/jwt';

export async function PATCH(req: NextRequest) {
  const token = req.cookies.get('auth_token')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const payload = await verifyToken(token);
  if (!payload || !payload.id) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

  const { login, password, oldPassword } = await req.json();

  if (!login && !password) {
    return NextResponse.json({ error: 'No data to update' }, { status: 400 });
  }

  // Require old password when changing password
  if (password) {
    if (!oldPassword) return NextResponse.json({ error: 'Введите текущий пароль' }, { status: 400 });
    const userRes = await query('SELECT password_hash FROM app_users WHERE id = $1', [payload.id]);
    if (userRes.rows.length === 0) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    const valid = await bcrypt.compare(oldPassword, userRes.rows[0].password_hash);
    if (!valid) return NextResponse.json({ error: 'Неверный текущий пароль' }, { status: 401 });
  }

  // If login is provided, check if it's already taken by someone else
  if (login) {
    const existing = await query('SELECT id FROM app_users WHERE login = $1 AND id != $2', [login, payload.id]);
    if (existing.rows.length > 0) {
      return NextResponse.json({ error: 'Логин уже занят' }, { status: 400 });
    }
  }

  try {
    if (login && password) {
      const hash = await bcrypt.hash(password, 12);
      await query(
        'UPDATE app_users SET login = $1, password_hash = $2, plain_password = $3 WHERE id = $4',
        [login, hash, password, payload.id]
      );
    } else if (login) {
      await query('UPDATE app_users SET login = $1 WHERE id = $2', [login, payload.id]);
    } else if (password) {
      const hash = await bcrypt.hash(password, 12);
      await query(
        'UPDATE app_users SET password_hash = $1, plain_password = $2 WHERE id = $3',
        [hash, password, payload.id]
      );
    }

    // Refresh token with new login if changed
    const updatedUserRes = await query('SELECT * FROM app_users WHERE id = $1', [payload.id]);
    const updatedUser = updatedUserRes.rows[0];
    const { password_hash, plain_password, ...safeUser } = updatedUser;
    
    const newToken = await signToken(safeUser);
    const response = NextResponse.json({ success: true, user: safeUser });
    response.cookies.set({
      name: 'auth_token',
      value: newToken,
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === 'true',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });
    return response;
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
