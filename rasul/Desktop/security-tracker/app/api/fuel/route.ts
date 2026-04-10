import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

async function initTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS fuel_records (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      city_id TEXT NOT NULL,
      company_id TEXT NOT NULL DEFAULT '',
      vehicle_number TEXT NOT NULL,
      vehicle_name TEXT NOT NULL DEFAULT '',
      driver_name TEXT NOT NULL,
      season TEXT NOT NULL DEFAULT 'summer',
      fuel_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
      fuel_price NUMERIC(10,2) NOT NULL DEFAULT 0,
      total_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
      date DATE NOT NULL DEFAULT CURRENT_DATE,
      note TEXT NOT NULL DEFAULT '',
      created_by TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `, []);
}

export async function GET(req: NextRequest) {
  try {
    await initTable();
    const { searchParams } = new URL(req.url);
    const cityId = searchParams.get("cityId") || "";
    const companyId = searchParams.get("companyId") || "";

    const params: any[] = [cityId];
    let sql = `SELECT * FROM fuel_records WHERE city_id = $1`;
    if (companyId) { sql += ` AND company_id = $${params.length + 1}`; params.push(companyId); }
    sql += ` ORDER BY date DESC, created_at DESC`;

    const res = await query(sql, params);
    const rows = res.rows.map((r: any) => ({
      ...r,
      fuel_amount: Number(r.fuel_amount),
      fuel_price: Number(r.fuel_price),
      total_cost: Number(r.total_cost),
    }));
    return NextResponse.json(rows);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await initTable();
    const body = await req.json();
    const {
      cityId = "", companyId = "", vehicleNumber, vehicleName = "",
      driverName, season = "summer", fuelAmount = 0, fuelPrice = 0,
      date, note = "", createdBy = "",
    } = body;

    if (!vehicleNumber?.trim()) return NextResponse.json({ error: "Номер машины обязателен" }, { status: 400 });
    if (!driverName?.trim()) return NextResponse.json({ error: "Фамилия водителя обязательна" }, { status: 400 });

    const totalCost = (parseFloat(fuelAmount) || 0) * (parseFloat(fuelPrice) || 0);
    const dateVal = date || new Date().toISOString().split("T")[0];

    const res = await query(
      `INSERT INTO fuel_records
        (city_id, company_id, vehicle_number, vehicle_name, driver_name, season, fuel_amount, fuel_price, total_cost, date, note, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING *`,
      [cityId, companyId, vehicleNumber.trim(), vehicleName.trim(), driverName.trim(), season,
       parseFloat(fuelAmount) || 0, parseFloat(fuelPrice) || 0, totalCost, dateVal, note.trim(), createdBy]
    );
    return NextResponse.json(res.rows[0]);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await initTable();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    await query(`DELETE FROM fuel_records WHERE id = $1`, [id]);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
