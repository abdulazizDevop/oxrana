import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const cityId = req.nextUrl.searchParams.get('cityId');
    const companyId = req.nextUrl.searchParams.get('companyId');

    let q = 'SELECT * FROM tmc_requests';
    const params: string[] = [];

    if (cityId || companyId) {
      q += ' WHERE TRUE';
      if (cityId) { params.push(cityId); q += ` AND city_id = $${params.length}`; }
      if (companyId) { params.push(companyId); q += ` AND company_id = $${params.length}`; }
    }

    q += ' ORDER BY created_at DESC';

    const res = await query(q, params);
    return NextResponse.json(res.rows);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { cityId, companyId, requesterName, itemName, quantity, notes } = await req.json();
    if (!itemName) return NextResponse.json({ error: 'itemName required' }, { status: 400 });
    const res = await query(
      'INSERT INTO tmc_requests (city_id, company_id, requester_name, item_name, quantity, notes) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [cityId || '', companyId || '', requesterName || '', itemName, quantity || 1, notes || '']
    );
    return NextResponse.json(res.rows[0]);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, status } = await req.json();
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    const res = await query(
      'UPDATE tmc_requests SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
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
    await query('DELETE FROM tmc_requests WHERE id = $1', [id]);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
