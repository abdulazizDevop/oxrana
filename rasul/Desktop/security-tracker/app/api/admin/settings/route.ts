import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  const res = await query('SELECT id, value FROM admin_settings');
  const settings = res.rows.reduce((acc: any, row: any) => {
    acc[row.id] = row.value;
    return acc;
  }, {});
  return NextResponse.json(settings);
}

export async function POST(req: NextRequest) {
  const { id, value } = await req.json();
  const res = await query(
    'INSERT INTO admin_settings (id, value) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET value = EXCLUDED.value RETURNING *',
    [id, value]
  );
  return NextResponse.json(res.rows[0]);
}
