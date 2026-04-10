import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { verifyToken } from '@/lib/jwt';

async function getUserPayload(req: NextRequest): Promise<any> {
  const token = req.cookies.get('auth_token')?.value;
  if (!token) return null;
  return await verifyToken(token);
}

function hasPermissionForEntities(payload: any, requestedCities: string[], requestedCompanies: string[]) {
  if (payload.is_admin) return true;
  
  const userCities = payload.allowed_cities || [];
  const userCompanies = payload.allowed_companies || [];
  
  const hasCities = requestedCities.every(c => userCities.includes(c));
  const hasCompanies = requestedCompanies.every(c => userCompanies.includes(c));
  
  return hasCities && hasCompanies;
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
    const res = await query(
      'SELECT id, name, role, profession, login, plain_password, allowed_sections, allowed_cities, allowed_companies, is_admin FROM app_users ORDER BY created_at DESC'
    );
    return NextResponse.json(res.rows);
  }

    // Filter users by allowed cities/companies if not admin
    if (!payload.is_admin) {
      const userCities = (payload.allowed_cities as string[]) || [];
      const userCompanies = (payload.allowed_companies as string[]) || [];
    
    if (userCities.length === 0 || userCompanies.length === 0) {
      return NextResponse.json([]); // return empty if user has no access to any companies/cities
    }

    const res = await query(
      'SELECT id, name, role, profession, login, allowed_sections, allowed_cities, allowed_companies, is_admin, created_at FROM app_users ORDER BY created_at DESC'
    );
    // Filter in JS for simplicity since array overlap in postgres can be tricky here
    const filtered = res.rows.filter(u => {
      const uCities = u.allowed_cities || [];
      const uCompanies = u.allowed_companies || [];
      return uCities.some((c: string) => userCities.includes(c)) && uCompanies.some((c: string) => userCompanies.includes(c));
    });
    return NextResponse.json(filtered);
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

  if (!hasPermissionForEntities(payload, allowedCities, allowedCompanies)) {
    return NextResponse.json({ error: 'Forbidden: Cannot assign cities/companies you do not have access to' }, { status: 403 });
  }

  // Check 10 employees limit per company
  if (!payload.is_admin) {
    for (const coId of allowedCompanies) {
      const countRes = await query('SELECT COUNT(*) as count FROM app_users WHERE $1 = ANY(allowed_companies)', [coId]);
      if (parseInt(countRes.rows[0].count) >= 10) {
        return NextResponse.json({ error: `Превышен лимит сотрудников (макс. 10) для компании с ID: ${coId}` }, { status: 400 });
      }
    }
  }

  const hash = await bcrypt.hash(password, 12);
  const res = await query(
    `INSERT INTO app_users (id, name, role, profession, login, password_hash, plain_password, allowed_sections, allowed_cities, allowed_companies, is_admin)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, false) RETURNING id, name, role, profession, login, allowed_sections, allowed_cities, allowed_companies, is_admin`,
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

  if (!hasPermissionForEntities(payload, allowedCities, allowedCompanies)) {
    return NextResponse.json({ error: 'Forbidden: Cannot assign cities/companies you do not have access to' }, { status: 403 });
  }

  if (!payload.is_admin) {
    const target = await query('SELECT allowed_cities, allowed_companies, is_admin FROM app_users WHERE id = $1', [id]);
    if (target.rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (target.rows[0].is_admin) return NextResponse.json({ error: 'Forbidden: Cannot edit admin' }, { status: 403 });
    if (!hasPermissionForEntities(payload, target.rows[0].allowed_cities || [], target.rows[0].allowed_companies || [])) {
      return NextResponse.json({ error: 'Forbidden: Cannot edit user outside your access scope' }, { status: 403 });
    }
  }

  if (password) {
    const hash = await bcrypt.hash(password, 12);
    await query(
      `UPDATE app_users SET name=$2, role=$3, profession=$4, login=$5, password_hash=$6, plain_password=$7, allowed_sections=$8, allowed_cities=$9, allowed_companies=$10 WHERE id=$1`,
      [id, name, role, profession, login, hash, password, allowedSections || [], allowedCities || [], allowedCompanies || []]
    );
  } else {
    await query(
      `UPDATE app_users SET name=$2, role=$3, profession=$4, login=$5, allowed_sections=$6, allowed_cities=$7, allowed_companies=$8 WHERE id=$1`,
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

  if (!payload.is_admin) {
    const target = await query('SELECT allowed_cities, allowed_companies, is_admin FROM app_users WHERE id = $1', [id]);
    if (target.rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (target.rows[0].is_admin) return NextResponse.json({ error: 'Forbidden: Cannot delete admin' }, { status: 403 });
    if (!hasPermissionForEntities(payload, target.rows[0].allowed_cities || [], target.rows[0].allowed_companies || [])) {
      return NextResponse.json({ error: 'Forbidden: Cannot delete user outside your access scope' }, { status: 403 });
    }
  }

  await query('DELETE FROM app_users WHERE id = $1', [id]);
  return NextResponse.json({ ok: true });
}
