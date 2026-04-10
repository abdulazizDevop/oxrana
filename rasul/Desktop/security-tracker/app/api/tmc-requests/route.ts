import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
  const cityId = req.nextUrl.searchParams.get('cityId');
  const companyId = req.nextUrl.searchParams.get('companyId');
  
  let q = 'SELECT * FROM tmc_requests';
  const params: any[] = [];
  
  if (cityId || companyId) {
    q += ' WHERE TRUE';
    if (cityId) {
      params.push(cityId);
      q += ` AND city_id = $${params.length}`;
    }
    if (companyId) {
      params.push(companyId);
      q += ` AND company_id = $${params.length}`;
    }
  }
  
  q += ' ORDER BY created_at DESC';
  
  const res = await query(q, params);
  return NextResponse.json(res.rows);
}

export async function POST(req: NextRequest) {
  const { cityId, companyId, requesterName, itemName, quantity, notes } = await req.json();
  const res = await query(
    'INSERT INTO tmc_requests (city_id, company_id, requester_name, item_name, quantity, notes) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
    [cityId || '', companyId || '', requesterName, itemName, quantity || 1, notes || '']
  );
  return NextResponse.json(res.rows[0]);
}

export async function PATCH(req: NextRequest) {
  const { id, status } = await req.json();
  const res = await query(
    'UPDATE tmc_requests SET status = $1 WHERE id = $2 RETURNING *',
    [status, id]
  );
  return NextResponse.json(res.rows[0]);
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (id) {
    await query('DELETE FROM tmc_requests WHERE id = $1', [id]);
    return NextResponse.json({ success: true });
  }
  return NextResponse.json({ error: 'Missing id' }, { status: 400 });
}
