import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';

// GET /api/users/logins?userId=xxx — все логины сотрудника
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  if (!userId) return NextResponse.json([], { status: 200 });
  const res = await query(
    'SELECT id, user_id, login, plain_password, label, created_at FROM user_logins WHERE user_id = $1 ORDER BY created_at ASC',
    [userId]
  );
  return NextResponse.json(res.rows);
}

// POST /api/users/logins — создать новый логин
export async function POST(req: NextRequest) {
  const { userId, login, password, label } = await req.json();
  if (!userId || !login || !password) {
    return NextResponse.json({ error: 'Заполните все поля' }, { status: 400 });
  }
  // Проверить уникальность логина
  const existing = await query(
    'SELECT id FROM user_logins WHERE login = $1 UNION ALL SELECT id FROM app_users WHERE login = $1',
    [login]
  );
  if (existing.rows.length > 0) {
    return NextResponse.json({ error: 'Логин уже занят' }, { status: 409 });
  }
  const hash = await bcrypt.hash(password, 12);
  const id = 'ul_' + Date.now();
  const res = await query(
    `INSERT INTO user_logins (id, user_id, login, plain_password, password_hash, label)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, user_id, login, plain_password, label, created_at`,
    [id, userId, login, password, hash, label || '']
  );
  return NextResponse.json(res.rows[0]);
}

// DELETE /api/users/logins?id=xxx — удалить логин
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'No id' }, { status: 400 });
  await query('DELETE FROM user_logins WHERE id = $1', [id]);
  return NextResponse.json({ ok: true });
}
