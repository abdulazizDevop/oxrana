import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth, requireAdmin } from '@/lib/auth';

// Public-readable settings (subscription contact info etc.) — Dashboard fetches these
// for every logged-in user, including non-admin office accounts.
const PUBLIC_SETTING_IDS = ['subscription_phone', 'subscription_card', 'subscription_price'];

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    const res = await query('SELECT id, value FROM admin_settings');
    const all = res.rows.reduce((acc: any, row: any) => {
      acc[row.id] = row.value;
      return acc;
    }, {});

    // Non-admin users only see the public allow-list (avoids leaking admin-only settings).
    if (!auth.payload.is_admin) {
      const filtered: any = {};
      for (const id of PUBLIC_SETTING_IDS) if (id in all) filtered[id] = all[id];
      return NextResponse.json(filtered);
    }
    return NextResponse.json(all);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;
    const adminCheck = requireAdmin(auth.payload);
    if (adminCheck) return adminCheck;

    const { id, value } = await req.json();
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    const res = await query(
      'INSERT INTO admin_settings (id, value) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET value = EXCLUDED.value RETURNING *',
      [id, value]
    );
    return NextResponse.json(res.rows[0]);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
