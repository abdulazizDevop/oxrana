import { NextRequest, NextResponse } from "next/server";
import { sql, initDb } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    await initDb();
    const city = req.nextUrl.searchParams.get("city");
    const rows = city
      ? await sql`SELECT * FROM photo_reports WHERE city = ${city} ORDER BY created_at DESC`
      : await sql`SELECT * FROM photo_reports ORDER BY created_at DESC`;
    return NextResponse.json(rows);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await initDb();
    const body = await req.json();
    const rows = await sql`
      INSERT INTO photo_reports (city, complex, violation_type, description, photo_url)
      VALUES (${body.city ?? ""}, ${body.complex}, ${body.violation_type}, ${body.description ?? null}, ${body.photo_url ?? null})
      RETURNING *
    `;
    return NextResponse.json(rows[0], { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
