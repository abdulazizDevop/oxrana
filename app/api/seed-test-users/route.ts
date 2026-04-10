import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { requireAuth, requireAdmin } from '@/lib/auth';

const TEST_PASSWORD = 'test123';

const TEST_USERS = [
  { login: 'test_patrol',       name: 'Тест Обходы',      role: 'guard',    profession: 'Охранник',  section: 'patrol' },
  { login: 'test_shift',        name: 'Тест Смены',       role: 'guard',    profession: 'Охранник',  section: 'shift' },
  { login: 'test_posts',        name: 'Тест Посты',       role: 'guard',    profession: 'Охранник',  section: 'posts' },
  { login: 'test_photo',        name: 'Тест Фото',        role: 'guard',    profession: 'Охранник',  section: 'photo' },
  { login: 'test_apartment',    name: 'Тест Квартира',    role: 'manager',  profession: 'Менеджер',  section: 'apartment' },
  { login: 'test_inventory',    name: 'Тест Имущество',   role: 'manager',  profession: 'Менеджер',  section: 'inventory' },
  { login: 'test_transport',    name: 'Тест Транспорт',   role: 'driver',   profession: 'Водитель',  section: 'transport' },
  { login: 'test_schedule',     name: 'Тест График',      role: 'manager',  profession: 'Менеджер',  section: 'schedule' },
  { login: 'test_fines',        name: 'Тест Штрафы',      role: 'manager',  profession: 'Менеджер',  section: 'fines' },
  { login: 'test_requests',     name: 'Тест Заявки',      role: 'guard',    profession: 'Охранник',  section: 'requests' },
  { login: 'test_expenses',     name: 'Тест Расходы',     role: 'manager',  profession: 'Менеджер',  section: 'expenses' },
  { login: 'test_work_schedule',name: 'Тест Вахта',       role: 'guard',    profession: 'Охранник',  section: 'work_schedule' },
];

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;
    const adminCheck = requireAdmin(auth.payload);
    if (adminCheck) return adminCheck;

    const hash = await bcrypt.hash(TEST_PASSWORD, 12);
    const created: { login: string; name: string; section: string }[] = [];
    const skipped: string[] = [];

    for (const u of TEST_USERS) {
      const existing = await query('SELECT id FROM app_users WHERE login = $1', [u.login]);
      if (existing.rows.length > 0) { skipped.push(u.login); continue; }
      const id = 'test_' + u.section + '_' + Date.now();
      await query(
        `INSERT INTO app_users (id, name, role, profession, login, password_hash, plain_password, allowed_sections, allowed_cities, allowed_companies, is_admin)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, '{}', '{}', false)`,
        [id, u.name, u.role, u.profession, u.login, hash, TEST_PASSWORD, [u.section]]
      );
      created.push({ login: u.login, name: u.name, section: u.section });
    }
    return NextResponse.json({ created, skipped });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;
    const adminCheck = requireAdmin(auth.payload);
    if (adminCheck) return adminCheck;

    const res = await query(
      `SELECT id, name, login, plain_password, allowed_sections FROM app_users WHERE login LIKE $1 ORDER BY created_at ASC`,
      ['test_%']
    );
    return NextResponse.json(res.rows);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;
    const adminCheck = requireAdmin(auth.payload);
    if (adminCheck) return adminCheck;

    await query(`DELETE FROM app_users WHERE login LIKE $1`, ['test_%']);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
