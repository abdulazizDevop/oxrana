// GET /api/transport/log?cityId=&companyId=&vehicleId=&date=
// POST /api/transport/log — зафиксировать въезд или выезд

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const cityId = searchParams.get('cityId');
  const companyId = searchParams.get('companyId');
  const vehicleId = searchParams.get('vehicleId');
  const date = searchParams.get('date'); // YYYY-MM-DD

  let sql = `SELECT * FROM transport_log WHERE 1=1`;
  const params: string[] = [];
  let i = 1;

  if (cityId) { sql += ` AND city_id = $${i++}`; params.push(cityId); }
  if (companyId) { sql += ` AND company_id = $${i++}`; params.push(companyId); }
  if (vehicleId) { sql += ` AND vehicle_id = $${i++}`; params.push(vehicleId); }
  if (date) { sql += ` AND logged_at::date = $${i++}`; params.push(date); }

  sql += ' ORDER BY logged_at DESC';

  const res = await query(sql, params);
  return NextResponse.json(res.rows);
}

export async function POST(req: NextRequest) {
  try {
    const { cityId, companyId, vehicleId, plateNumber, driverName, listType, action, loggedBy, loggedByRole, note } = await req.json();
    if (!plateNumber || !action || !listType) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

    // Verify vehicle exists before logging (avoid FK violation)
    let resolvedVehicleId: string | null = null;
    if (vehicleId) {
      const check = await query(`SELECT id FROM transport_vehicles WHERE id = $1`, [vehicleId]);
      if (check.rows.length > 0) resolvedVehicleId = vehicleId;
    }

    const res = await query(
      `INSERT INTO transport_log (city_id, company_id, vehicle_id, plate_number, driver_name, list_type, action, logged_by, logged_by_role, note)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [cityId, companyId, resolvedVehicleId, plateNumber, driverName || '', listType, action, loggedBy || '', loggedByRole || '', note || '']
    );
    return NextResponse.json(res.rows[0]);
  } catch (e: any) {
    console.error('transport/log POST error:', e?.message);
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}
