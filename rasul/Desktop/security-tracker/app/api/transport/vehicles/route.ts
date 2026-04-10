// GET /api/transport/vehicles?cityId=&companyId=&listType=
// POST /api/transport/vehicles — добавить транспорт
// DELETE /api/transport/vehicles?id=

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const cityId = searchParams.get('cityId');
  const companyId = searchParams.get('companyId');
  const listType = searchParams.get('listType');

  // Get vehicles with their latest log action for today
  let sql = `
    SELECT v.*,
      (
        SELECT action FROM transport_log l
        WHERE l.vehicle_id = v.id
          AND l.logged_at::date = CURRENT_DATE
        ORDER BY l.logged_at DESC
        LIMIT 1
      ) as today_last_action,
      (
        SELECT logged_at FROM transport_log l
        WHERE l.vehicle_id = v.id
          AND l.logged_at::date = CURRENT_DATE
        ORDER BY l.logged_at DESC
        LIMIT 1
      ) as today_last_time
    FROM transport_vehicles v
    WHERE 1=1
  `;
  const params: (string)[] = [];
  let i = 1;

  if (cityId) { sql += ` AND v.city_id = $${i++}`; params.push(cityId); }
  if (companyId) { sql += ` AND v.company_id = $${i++}`; params.push(companyId); }
  if (listType) { sql += ` AND v.list_type = $${i++}`; params.push(listType); }

  sql += ' ORDER BY v.created_at DESC';

  const res = await query(sql, params);
  return NextResponse.json(res.rows);
}

export async function POST(req: NextRequest) {
  const { cityId, companyId, listType, plateNumber, driverName, description, createdBy } = await req.json();
  if (!plateNumber || !listType) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

  const res = await query(
    `INSERT INTO transport_vehicles (city_id, company_id, list_type, plate_number, driver_name, description, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [cityId, companyId, listType, plateNumber.toUpperCase(), driverName || '', description || '', createdBy || '']
  );
  return NextResponse.json(res.rows[0]);
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  await query('DELETE FROM transport_vehicles WHERE id = $1', [id]);
  return NextResponse.json({ ok: true });
}
