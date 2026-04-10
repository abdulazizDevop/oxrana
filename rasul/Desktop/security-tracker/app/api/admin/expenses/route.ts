import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

async function writeLog(cityId: string, companyId: string, actorName: string, actorRole: string, action: string, section: string, detail: string) {
  await query(
    `INSERT INTO admin_log (id, city_id, company_id, actor_name, actor_role, action, section, detail)
     VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7)`,
    [cityId, companyId, actorName, actorRole, action, section, detail]
  );
}

export async function GET(req: NextRequest) {
  const cityId = req.nextUrl.searchParams.get("cityId") || "";
  const companyId = req.nextUrl.searchParams.get("companyId") || "";
  const conds: string[] = [];
  const params: string[] = [];
  if (cityId) { conds.push(`city_id = $${params.length + 1}`); params.push(cityId); }
  if (companyId) { conds.push(`company_id = $${params.length + 1}`); params.push(companyId); }
  const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";
  const result = await query(`SELECT * FROM admin_expenses ${where} ORDER BY created_at DESC`, params);
  return NextResponse.json(result.rows);
}

export async function POST(req: NextRequest) {
  const { cityId, companyId, expenseName, advanceAmount, totalAmount, comment, actorName, actorRole } = await req.json();
  if (!cityId || !companyId || !expenseName) {
    return NextResponse.json({ error: "Обязательные поля: cityId, companyId, expenseName" }, { status: 400 });
  }
  const result = await query(
    `INSERT INTO admin_expenses (id, city_id, company_id, expense_name, advance_amount, total_amount, comment, created_by, created_by_role)
     VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [cityId, companyId, expenseName, advanceAmount || 0, totalAmount || 0, comment || "", actorName || "", actorRole || ""]
  );
  await writeLog(cityId, companyId, actorName || "", actorRole || "",
    "Создан расход", "Расходы",
    `«${expenseName}» — аванс: ${advanceAmount || 0}, сумма: ${totalAmount || 0}${comment ? `, комментарий: ${comment}` : ""}`
  );
  return NextResponse.json(result.rows[0]);
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  const actorName = req.nextUrl.searchParams.get("actorName") || "";
  const actorRole = req.nextUrl.searchParams.get("actorRole") || "";
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const found = await query(`SELECT * FROM admin_expenses WHERE id = $1`, [id]);
  if (found.rows.length > 0) {
    const row = found.rows[0];
    await writeLog(row.city_id, row.company_id, actorName, actorRole,
      "Удалён расход", "Расходы", `«${row.expense_name}»`
    );
  }
  await query(`DELETE FROM admin_expenses WHERE id = $1`, [id]);
  return NextResponse.json({ ok: true });
}
