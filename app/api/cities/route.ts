import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth, requireAdmin } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    const res = await query('SELECT * FROM cities ORDER BY is_default DESC, name ASC');
    return NextResponse.json(res.rows);
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

    const { id, name } = await req.json();
    if (!id || !name) return NextResponse.json({ error: 'id and name required' }, { status: 400 });
    const res = await query(
      'INSERT INTO cities (id, name, is_default) VALUES ($1, $2, false) ON CONFLICT (id) DO NOTHING RETURNING *',
      [id, name]
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
    const adminCheck = requireAdmin(auth.payload);
    if (adminCheck) return adminCheck;

    const id = req.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    await query('DELETE FROM cities WHERE id = $1 AND is_default = false', [id]);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
