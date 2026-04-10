import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// GET /api/conferences?cityId=&companyId=&status=active
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const cityId = searchParams.get("cityId");
  const companyId = searchParams.get("companyId");
  const status = searchParams.get("status") || "active";

  try {
    let query = `SELECT * FROM conferences WHERE 1=1`;
    const params: any[] = [];

    if (cityId) { params.push(cityId); query += ` AND city_id = $${params.length}`; }
    if (companyId) { params.push(companyId); query += ` AND (company_id = $${params.length} OR company_id IS NULL)`; }
    if (status !== "all") { params.push(status); query += ` AND status = $${params.length}`; }

    query += ` ORDER BY created_at DESC`;

    const result = await pool.query(query, params);
    return NextResponse.json(result.rows);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST /api/conferences - создать конференцию (admin only)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, cityId, companyId, createdBy, createdByName } = body;

    if (!title || !cityId || !createdBy || !createdByName) {
      return NextResponse.json({ error: "Не хватает данных" }, { status: 400 });
    }

    const id = "conf_" + Date.now();
    // Jitsi room — уникальная комната на основе id
    const jitsiRoom = "security-tracker-" + id.replace("conf_", "");

    const result = await pool.query(
      `INSERT INTO conferences (id, title, city_id, company_id, created_by, created_by_name, status, jitsi_room)
       VALUES ($1, $2, $3, $4, $5, $6, 'active', $7)
       RETURNING *`,
      [id, title, cityId, companyId || null, createdBy, createdByName, jitsiRoom]
    );

    // Создать приглашение для города/компании
    const invId = "inv_" + Date.now();
    await pool.query(
      `INSERT INTO conference_invitations (id, conference_id, city_id, company_id)
       VALUES ($1, $2, $3, $4)`,
      [invId, id, cityId, companyId || null]
    );

    return NextResponse.json(result.rows[0]);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PATCH /api/conferences - завершить конференцию
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, status } = body;

    if (!id) return NextResponse.json({ error: "id обязателен" }, { status: 400 });

    const result = await pool.query(
      `UPDATE conferences SET status = $1, ended_at = CASE WHEN $1 = 'ended' THEN NOW() ELSE ended_at END
       WHERE id = $2 RETURNING *`,
      [status || "ended", id]
    );

    return NextResponse.json(result.rows[0] || {});
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
