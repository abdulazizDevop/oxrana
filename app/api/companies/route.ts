import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { signToken } from '@/lib/jwt';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(req.url);
    const cityId = searchParams.get('cityId');
    const id = searchParams.get('id');

    if (id) {
      const res = await query('SELECT id, city_id as "cityId", name, description, professions_list, employee_count, created_at as "createdAt", subscription_ends_at as "subscriptionEndsAt", owner_id as "ownerId", used_storage_bytes as "usedStorageBytes" FROM companies WHERE id = $1', [id]);
      return NextResponse.json(res.rows[0]);
    }
    if (cityId) {
      const res = await query('SELECT id, city_id as "cityId", name, description, professions_list, employee_count, created_at as "createdAt", subscription_ends_at as "subscriptionEndsAt", owner_id as "ownerId", used_storage_bytes as "usedStorageBytes" FROM companies WHERE city_id = $1 ORDER BY name ASC', [cityId]);
      return NextResponse.json(res.rows);
    }
    const res = await query('SELECT id, city_id as "cityId", name, description, professions_list, employee_count, created_at as "createdAt", subscription_ends_at as "subscriptionEndsAt", owner_id as "ownerId", used_storage_bytes as "usedStorageBytes" FROM companies ORDER BY name ASC');
    return NextResponse.json(res.rows);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    const { id, cityId, name, description, professions_list, employee_count, ownerId } = await req.json();
    if (!id || !name) return NextResponse.json({ error: 'id and name required' }, { status: 400 });
    if (!cityId) return NextResponse.json({ error: 'cityId required' }, { status: 400 });

    const subscriptionEndsAt = new Date();
    subscriptionEndsAt.setDate(subscriptionEndsAt.getDate() + 3);

    // Admin may pass an explicit ownerId; for non-admin users, force ownership to themselves
    const effectiveOwner = auth.payload.is_admin ? (ownerId || auth.payload.id) : auth.payload.id;

    const res = await query(
      'INSERT INTO companies (id, city_id, name, description, professions_list, employee_count, owner_id, subscription_ends_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, professions_list = EXCLUDED.professions_list, employee_count = EXCLUDED.employee_count RETURNING id, city_id as "cityId", name, description, professions_list, employee_count, created_at as "createdAt", subscription_ends_at as "subscriptionEndsAt", owner_id as "ownerId"',
      [id, cityId, name, description || '', professions_list || '', employee_count || 0, effectiveOwner, subscriptionEndsAt]
    );

    // Grant the creator (or assigned owner) permission to the new city/company so they can manage it.
    // This is the critical fix for the "company manager cannot create employees" bug.
    if (effectiveOwner && !auth.payload.is_admin) {
      await query(
        `UPDATE app_users
           SET allowed_cities    = (SELECT ARRAY(SELECT DISTINCT unnest(COALESCE(allowed_cities,    '{}'::text[]) || $1::text[]))),
               allowed_companies = (SELECT ARRAY(SELECT DISTINCT unnest(COALESCE(allowed_companies, '{}'::text[]) || $2::text[])))
         WHERE id = $3`,
        [[cityId], [id], effectiveOwner]
      );

      // Re-issue JWT cookie with refreshed permissions if the creator is the current caller
      if (effectiveOwner === auth.payload.id) {
        const userRes = await query(
          'SELECT id, name, role, profession, login, allowed_sections, allowed_cities, allowed_companies, is_admin FROM app_users WHERE id = $1',
          [effectiveOwner]
        );
        if (userRes.rows[0]) {
          const newToken = await signToken(userRes.rows[0]);
          const response = NextResponse.json({ ...res.rows[0], updatedUser: userRes.rows[0] });
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
        }
      }
    }

    return NextResponse.json(res.rows[0]);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    const { id, name, description, professions_list, employee_count, subscriptionEndsAt } = await req.json();
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    const res = await query(
      'UPDATE companies SET name = COALESCE($2, name), description = COALESCE($3, description), professions_list = COALESCE($4, professions_list), employee_count = COALESCE($5, employee_count), subscription_ends_at = COALESCE($6, subscription_ends_at) WHERE id = $1 RETURNING id, city_id as "cityId", name, description, professions_list, employee_count, created_at as "createdAt", subscription_ends_at as "subscriptionEndsAt"',
      [id, name, description, professions_list, employee_count, subscriptionEndsAt]
    );
    return NextResponse.json(res.rows[0]);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    const id = req.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    await query('DELETE FROM companies WHERE id = $1', [id]);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
