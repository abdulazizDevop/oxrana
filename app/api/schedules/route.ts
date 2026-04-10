import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";


export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const cityId = searchParams.get("cityId");
  const companyId = searchParams.get("companyId");
  try {
    const conditions: string[] = [];
    const vals: string[] = [];
    let i = 1;
    if (cityId) { conditions.push(`city_id = $${i++}`); vals.push(cityId); }
    if (companyId) { conditions.push(`company_id = $${i++}`); vals.push(companyId); }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const { rows } = await pool.query(
      `SELECT * FROM work_schedules ${where} ORDER BY work_start DESC`,
      vals
    );
    return NextResponse.json(rows);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { cityId, companyId, employeeName, role, scheduleType, workStart, workEnd, restStart, restEnd, shiftHours, restHours, note } = body;
  try {
    const id = `sched_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const { rows } = await pool.query(
      `INSERT INTO work_schedules (id,city_id,company_id,employee_name,role,schedule_type,work_start,work_end,rest_start,rest_end,shift_hours,rest_hours,note)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [id, cityId || "", companyId || "", employeeName, role || "", scheduleType || "vahta",
       workStart, workEnd, restStart || null, restEnd || null,
       shiftHours || 24, restHours || 72, note || ""]
    );
    return NextResponse.json(rows[0]);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "no id" }, { status: 400 });
  try {
    await pool.query("DELETE FROM work_schedules WHERE id=$1", [id]);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
