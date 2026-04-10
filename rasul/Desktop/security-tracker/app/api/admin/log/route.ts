import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

// GET: получить журнал логов
export async function GET(req: NextRequest) {
  const cityId = req.nextUrl.searchParams.get("cityId") || "";
  const companyId = req.nextUrl.searchParams.get("companyId") || "";
  const limit = parseInt(req.nextUrl.searchParams.get("limit") || "200");
  const conds: string[] = [];
  const params: unknown[] = [];
  if (cityId) { conds.push(`city_id = $${params.length + 1}`); params.push(cityId); }
  if (companyId) { conds.push(`company_id = $${params.length + 1}`); params.push(companyId); }
  params.push(limit);
  const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";
  const result = await query(
    `SELECT * FROM admin_log ${where} ORDER BY logged_at DESC LIMIT $${params.length}`,
    params
  );
  return NextResponse.json(result.rows);
}

// POST: записать в лог вручную (из других секций)
export async function POST(req: NextRequest) {
  const { cityId, companyId, actorName, actorRole, action, section, detail } = await req.json();
  if (!cityId || !actorName || !action) {
    return NextResponse.json({ error: "cityId, actorName, action required" }, { status: 400 });
  }
  const result = await query(
    `INSERT INTO admin_log (id, city_id, company_id, actor_name, actor_role, action, section, detail)
     VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [cityId, companyId || "", actorName, actorRole || "", action, section || "", detail || ""]
  );
  return NextResponse.json(result.rows[0]);
}
