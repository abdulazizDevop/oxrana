// GET /api/companies?cityId=xxx
// POST /api/companies
// PATCH /api/companies
// DELETE /api/companies?id=xxx

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const cityId = searchParams.get('cityId');
  const id = searchParams.get('id');

  if (id) {
    const res = await query('SELECT id, city_id as "cityId", name, description, professions_list, employee_count, created_at as "createdAt", subscription_ends_at as "subscriptionEndsAt", owner_id as "ownerId" FROM companies WHERE id = $1', [id]);
    return NextResponse.json(res.rows[0]);
  }

  if (cityId) {
    const res = await query('SELECT id, city_id as "cityId", name, description, professions_list, employee_count, created_at as "createdAt", subscription_ends_at as "subscriptionEndsAt", owner_id as "ownerId" FROM companies WHERE city_id = $1 ORDER BY name ASC', [cityId]);
    return NextResponse.json(res.rows);
  }
  const res = await query('SELECT id, city_id as "cityId", name, description, professions_list, employee_count, created_at as "createdAt", subscription_ends_at as "subscriptionEndsAt", owner_id as "ownerId" FROM companies ORDER BY name ASC');
  return NextResponse.json(res.rows);
}

export async function POST(req: NextRequest) {
  const { id, cityId, name, description, professions_list, employee_count, ownerId } = await req.json();
  
  // Set subscription to 3 days from now for new companies
  const subscriptionEndsAt = new Date();
  subscriptionEndsAt.setDate(subscriptionEndsAt.getDate() + 3);

  const res = await query(
    'INSERT INTO companies (id, city_id, name, description, professions_list, employee_count, owner_id, subscription_ends_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, professions_list = EXCLUDED.professions_list, employee_count = EXCLUDED.employee_count RETURNING id, city_id as "cityId", name, description, professions_list, employee_count, created_at as "createdAt", subscription_ends_at as "subscriptionEndsAt"',
    [id, cityId, name, description || '', professions_list || '', employee_count || 0, ownerId || null, subscriptionEndsAt]
  );
  return NextResponse.json(res.rows[0]);
}

export async function PATCH(req: NextRequest) {
  const { id, name, description, professions_list, employee_count, subscriptionEndsAt } = await req.json();
  const res = await query(
    'UPDATE companies SET name = COALESCE($2, name), description = COALESCE($3, description), professions_list = COALESCE($4, professions_list), employee_count = COALESCE($5, employee_count), subscription_ends_at = COALESCE($6, subscription_ends_at) WHERE id = $1 RETURNING id, city_id as "cityId", name, description, professions_list, employee_count, created_at as "createdAt", subscription_ends_at as "subscriptionEndsAt"',
    [id, name, description, professions_list, employee_count, subscriptionEndsAt]
  );
  return NextResponse.json(res.rows[0]);
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  await query('DELETE FROM companies WHERE id = $1', [id]);
  return NextResponse.json({ ok: true });
}
