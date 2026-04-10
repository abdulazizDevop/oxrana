import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET() {
  try {
    const { rows } = await query("SELECT * FROM role_instructions ORDER BY role_label");
    return NextResponse.json(rows);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { roleKey, roleLabel, content, updatedBy } = body;
  try {
    const { rows } = await query(
      `INSERT INTO role_instructions (id, role_key, role_label, content, updated_by, updated_at)
       VALUES (gen_random_uuid()::text, $1, $2, $3, $4, NOW())
       ON CONFLICT (role_key) DO UPDATE SET content=$3, role_label=$2, updated_by=$4, updated_at=NOW()
       RETURNING *`,
      [roleKey, roleLabel || roleKey, content, updatedBy || "admin"]
    );
    return NextResponse.json(rows[0]);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
