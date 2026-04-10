// GET /api/cities — список городов
// POST /api/cities — добавить город
// DELETE /api/cities?id=xxx — удалить город

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  const res = await query('SELECT * FROM cities ORDER BY is_default DESC, name ASC');
  return NextResponse.json(res.rows);
}

export async function POST(req: NextRequest) {
  const { id, name } = await req.json();
  const res = await query(
    'INSERT INTO cities (id, name, is_default) VALUES ($1, $2, false) ON CONFLICT (id) DO NOTHING RETURNING *',
    [id, name]
  );
  return NextResponse.json(res.rows[0]);
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  await query('DELETE FROM cities WHERE id = $1 AND is_default = false', [id]);
  return NextResponse.json({ ok: true });
}
