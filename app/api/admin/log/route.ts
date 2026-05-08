import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAuth, requireAdmin } from "@/lib/auth";

// GET: журнал логов — только для админа
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const adminCheck = requireAdmin(auth.payload);
  if (adminCheck) return adminCheck;

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

// POST: запись в лог из других секций (требует входа в систему)
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

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
