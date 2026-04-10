import { NextRequest, NextResponse } from "next/server";
import { query, initDb } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    await initDb();
    const city = req.nextUrl.searchParams.get("city") || "";
    const companyId = req.nextUrl.searchParams.get("companyId") || "";
    const month = parseInt(req.nextUrl.searchParams.get("month") || "0");
    const year = parseInt(req.nextUrl.searchParams.get("year") || "0");

    let text = "SELECT * FROM post_accounting WHERE city = $1";
    const params: unknown[] = [city];

    if (companyId) { text += ` AND company_id = $${params.length + 1}`; params.push(companyId); }
    if (month) { text += ` AND month = $${params.length + 1}`; params.push(month); }
    if (year) { text += ` AND year = $${params.length + 1}`; params.push(year); }
    text += " ORDER BY created_at ASC";

    const res = await query(text, params);
    return NextResponse.json(res.rows);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await initDb();
    const body = await req.json();
    const res = await query(
      `INSERT INTO post_accounting (employee_name, post_name, city, company_id, year, month, days, total_hours)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [
        body.employee_name,
        body.post_name || "Пост 1",
        body.city || "",
        body.company_id || "",
        body.year,
        body.month,
        JSON.stringify(body.days || {}),
        body.total_hours || 0,
      ]
    );
    return NextResponse.json(res.rows[0], { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await initDb();
    const body = await req.json();
    const res = await query(
      `UPDATE post_accounting SET days=$1, total_hours=$2 WHERE id=$3 RETURNING *`,
      [JSON.stringify(body.days || {}), body.total_hours || 0, body.id]
    );
    return NextResponse.json(res.rows[0]);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await initDb();
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    await query(`DELETE FROM post_accounting WHERE id=$1`, [id]);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
