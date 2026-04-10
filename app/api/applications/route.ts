import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    const res = await query('SELECT * FROM connection_applications ORDER BY created_at DESC');
    return NextResponse.json(res.rows);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, phone, object_name, address, userId, type, companyId } = await req.json();
    if (!name || !phone || !object_name) return NextResponse.json({ error: 'name, phone, object_name required' }, { status: 400 });
    const res = await query(
      'INSERT INTO connection_applications (name, phone, object_name, address, user_id, type, company_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [name, phone, object_name, address || '', userId || null, type || 'connect', companyId || null]
    );
    return NextResponse.json(res.rows[0]);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    const { id, status } = await req.json();
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    const res = await query(
      'UPDATE connection_applications SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
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
    await query('DELETE FROM connection_applications WHERE id = $1', [id]);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
