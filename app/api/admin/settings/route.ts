import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth, requireAdmin } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    const res = await query('SELECT id, value FROM admin_settings');
    const settings = res.rows.reduce((acc: any, row: any) => {
      acc[row.id] = row.value;
      return acc;
    }, {});
    return NextResponse.json(settings);
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
