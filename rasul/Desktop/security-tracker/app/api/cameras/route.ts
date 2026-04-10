import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const cityId = searchParams.get('cityId');
  const companyId = searchParams.get('companyId');
  const conditions: string[] = [];
  const params: string[] = [];
  if (cityId) { conditions.push(`city_id = $${params.length + 1}`); params.push(cityId); }
  if (companyId) { conditions.push(`company_id = $${params.length + 1}`); params.push(companyId); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const res = await query(`SELECT * FROM cameras ${where} ORDER BY created_at ASC`, params);
  return NextResponse.json(res.rows);
}

export async function POST(req: NextRequest) {
  const { cityId, companyId, name, url, type } = await req.json();
  const res = await query(
    `INSERT INTO cameras (city_id, company_id, name, url, type) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [cityId, companyId, name, url, type || 'iframe']
  );
  return NextResponse.json(res.rows[0]);
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  await query('DELETE FROM cameras WHERE id = $1', [id]);
  return NextResponse.json({ ok: true });
}
