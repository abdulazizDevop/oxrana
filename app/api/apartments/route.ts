import { NextRequest, NextResponse } from "next/server";
import { sql, initDb } from "@/lib/db";
import { requireAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;
    await initDb();
    const city = req.nextUrl.searchParams.get("city");
    const rows = city
      ? await sql`SELECT * FROM apartments WHERE city = ${city} ORDER BY created_at DESC`
      : await sql`SELECT * FROM apartments ORDER BY created_at DESC`;
    return NextResponse.json(rows);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;
    await initDb();
    const body = await req.json();
    const rows = await sql`
      INSERT INTO apartments (city, complex, room_name, status, notes)
      VALUES (${body.city ?? ""}, ${body.complex}, ${body.room_name}, ${body.status ?? "ok"}, ${body.notes ?? null})
      RETURNING *
    `;
    return NextResponse.json(rows[0], { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
