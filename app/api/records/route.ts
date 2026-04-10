import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const cityId = searchParams.get('cityId');
    const companyId = searchParams.get('companyId');
    const section = searchParams.get('section');

    let sql = `
      SELECT r.*,
        json_agg(json_build_object(
          'id', f.id, 'file_name', f.file_name, 'url', f.file_path, 'file_type', f.file_type, 'file_size', f.file_size
        )) FILTER (WHERE f.id IS NOT NULL) as files
      FROM section_records r
      LEFT JOIN record_files f ON f.record_id = r.id
      WHERE 1=1
    `;
    const params: string[] = [];
    let i = 1;

    if (cityId) { sql += ` AND r.city_id = $${i++}`; params.push(cityId); }
    if (companyId) { sql += ` AND r.company_id = $${i++}`; params.push(companyId); }
    if (section) { sql += ` AND r.section = $${i++}`; params.push(section); }

    sql += ' GROUP BY r.id ORDER BY r.created_at DESC';

    const res = await query(sql, params);
    return NextResponse.json(res.rows);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { cityId, companyId, section, data, createdBy } = await req.json();
    if (!section) return NextResponse.json({ error: 'section required' }, { status: 400 });
    const id = uuidv4();
    const res = await query(
      `INSERT INTO section_records (id, city_id, company_id, section, data, created_by) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [id, cityId || '', companyId || '', section, JSON.stringify(data || {}), createdBy || null]
    );
    return NextResponse.json(res.rows[0]);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { id, data } = await req.json();
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    const res = await query(
      `UPDATE section_records SET data=$2, updated_at=NOW() WHERE id=$1 RETURNING *`,
      [id, JSON.stringify(data || {})]
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
    await query('DELETE FROM section_records WHERE id = $1', [id]);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
