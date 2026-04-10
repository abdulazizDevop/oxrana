import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";


// GET /api/conferences/messages?conferenceId=
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const conferenceId = searchParams.get("conferenceId");

  if (!conferenceId) return NextResponse.json({ error: "conferenceId обязателен" }, { status: 400 });

  try {
    const result = await pool.query(
      `SELECT * FROM conference_messages WHERE conference_id = $1 ORDER BY created_at ASC`,
      [conferenceId]
    );
    return NextResponse.json(result.rows);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST /api/conferences/messages
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { conferenceId, userId, userName, userRole, message } = body;

    if (!conferenceId || !userId || !userName || !message) {
      return NextResponse.json({ error: "Не хватает данных" }, { status: 400 });
    }

    const id = "msg_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7);
    const result = await pool.query(
      `INSERT INTO conference_messages (id, conference_id, user_id, user_name, user_role, message)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [id, conferenceId, userId, userName, userRole || "", message]
    );

    return NextResponse.json(result.rows[0]);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
