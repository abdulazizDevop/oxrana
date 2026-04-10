import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  const res = await query('SELECT * FROM connection_applications ORDER BY created_at DESC');
  return NextResponse.json(res.rows);
}

export async function POST(req: NextRequest) {
  const { name, phone, object_name, address, userId, type, companyId } = await req.json();
  const res = await query(
    'INSERT INTO connection_applications (name, phone, object_name, address, user_id, type, company_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
    [name, phone, object_name, address || '', userId || null, type || 'connect', companyId || null]
  );
  return NextResponse.json(res.rows[0]);
}

export async function PATCH(req: NextRequest) {
  const { id, status } = await req.json();
  const res = await query(
    'UPDATE connection_applications SET status = $1 WHERE id = $2 RETURNING *',
    [status, id]
  );
  return NextResponse.json(res.rows[0]);
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (id) {
    await query('DELETE FROM connection_applications WHERE id = $1', [id]);
    return NextResponse.json({ success: true });
  }
  return NextResponse.json({ error: 'Missing id' }, { status: 400 });
}
