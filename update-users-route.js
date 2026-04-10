const fs = require('fs');
const path = require('path');

const content = `import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { verifyToken } from '@/lib/jwt';

async function getUserPayload(req: NextRequest) {
  const token = req.cookies.get('auth_token')?.value;
  if (!token) return null;
  return await verifyToken(token);
}

export async function GET(req: NextRequest) {
  const payload = await getUserPayload(req);
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const withPassword = searchParams.get('withPassword') === '1';

  if (withPassword) {
    if (!payload.is_admin) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const id = searchParams.get('id');
    if (id) {
      const res = await query(
        'SELECT id, name, login, plain_password FROM app_users WHERE id = $1',
        [id]
      );
      return NextResponse.json(res.rows[0] || null);
    }
    // All users with passwords (for admin logins tab)
    const res = await query(
      'SELECT id, name, role, profession, login, plain_password, allowed_sections, allowed_cities, allowed_companies, is_admin FROM app_users ORDER BY created_at DESC'
    );
    return NextResponse.json(res.rows);
  }

  const res = await query(
    'SELECT id, name, role, profession, login, allowed_sections, allowed_cities, allowed_companies, is_admin, created_at FROM app_users ORDER BY created_at DESC'
  );
  return NextResponse.json(res.rows);
}

export async function POST(req: NextRequest) {
  const payload = await getUserPayload(req);
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!payload.is_admin && !payload.allowed_sections?.includes('employees')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id, name, role, profession, login, password, allowedSections, allowedCities, allowedCompanies } = await req.json();

  if (!allowedCities || allowedCities.length === 0) return NextResponse.json({ error: 'Выберите город' }, { status: 400 });
  if (!allowedCompanies || allowedCompanies.length === 0) return NextResponse.json({ error: 'Выберите компанию' }, { status: 400 });

  const hash = await bcrypt.hash(password, 10);
  const res = await query(
    \`INSERT INTO app_users (id, name, role, profession, login, password_hash, plain_password, allowed_sections, allowed_cities, allowed_companies, is_admin)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, false) RETURNING id, name, role, profession, login, allowed_sections, allowed_cities, allowed_companies, is_admin\`,
    [id, name, role, profession, login, hash, password, allowedSections || [], allowedCities || [], allowedCompanies || []]
  );
  return NextResponse.json(res.rows[0]);
}

export async function PUT(req: NextRequest) {
  const payload = await getUserPayload(req);
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!payload.is_admin && !payload.allowed_sections?.includes('employees')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id, name, role, profession, login, password, allowedSections, allowedCities, allowedCompanies } = await req.json();

  if (!allowedCities || allowedCities.length === 0) return NextResponse.json({ error: 'Выберите город' }, { status: 400 });
  if (!allowedCompanies || allowedCompanies.length === 0) return NextResponse.json({ error: 'Выберите компанию' }, { status: 400 });

  if (password) {
    const hash = await bcrypt.hash(password, 10);
    await query(
      \`UPDATE app_users SET name=$2, role=$3, profession=$4, login=$5, password_hash=$6, plain_password=$7, allowed_sections=$8, allowed_cities=$9, allowed_companies=$10 WHERE id=$1\`,
      [id, name, role, profession, login, hash, password, allowedSections || [], allowedCities || [], allowedCompanies || []]
    );
  } else {
    await query(
      \`UPDATE app_users SET name=$2, role=$3, profession=$4, login=$5, allowed_sections=$6, allowed_cities=$7, allowed_companies=$8 WHERE id=$1\`,
      [id, name, role, profession, login, allowedSections || [], allowedCities || [], allowedCompanies || []]
    );
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const payload = await getUserPayload(req);
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!payload.is_admin && !payload.allowed_sections?.includes('employees')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  await query('DELETE FROM app_users WHERE id = $1', [id]);
  return NextResponse.json({ ok: true });
}
`;

fs.writeFileSync(path.join(__dirname, 'rasul/Desktop/security-tracker/app/api/users/route.ts'), content);
