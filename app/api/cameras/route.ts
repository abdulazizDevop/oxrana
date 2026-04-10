import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
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
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { cityId, companyId, name, url, type } = await req.json();
    if (!name || !url) return NextResponse.json({ error: 'name and url required' }, { status: 400 });
    const res = await query(
      `INSERT INTO cameras (city_id, company_id, name, url, type) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [cityId, companyId, name, url, type || 'iframe']
    );
    return NextResponse.json(res.rows[0]);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    await query('DELETE FROM cameras WHERE id = $1', [id]);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
