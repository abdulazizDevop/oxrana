import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";


// GET /api/conferences/invite?cityId=&companyId=&userId=
// Возвращает активные приглашения, которые пользователь ещё не видел
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const cityId = searchParams.get("cityId");
  const companyId = searchParams.get("companyId");
  const userId = searchParams.get("userId");

  if (!cityId || !userId) return NextResponse.json([]);

  try {
    // Ищем приглашения к активным конференциям для этого города/компании,
    // которые пользователь ещё не отметил как просмотренные
    const result = await pool.query(
      `SELECT ci.*, c.title, c.jitsi_room, c.created_by_name, c.created_at as conf_created_at
       FROM conference_invitations ci
       JOIN conferences c ON c.id = ci.conference_id
       WHERE ci.city_id = $1
         AND ($2::text IS NULL OR ci.company_id = $2 OR ci.company_id IS NULL)
         AND c.status = 'active'
         AND NOT ($3 = ANY(ci.seen_by))
       ORDER BY ci.invited_at DESC`,
      [cityId, companyId || null, userId]
    );
    return NextResponse.json(result.rows);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PATCH /api/conferences/invite - отметить как просмотренное
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { conferenceId, userId } = body;

    if (!conferenceId || !userId) return NextResponse.json({ error: "Не хватает данных" }, { status: 400 });

    await pool.query(
      `UPDATE conference_invitations
       SET seen_by = array_append(seen_by, $1)
       WHERE conference_id = $2 AND NOT ($1 = ANY(seen_by))`,
      [userId, conferenceId]
    );

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
