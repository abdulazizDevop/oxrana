import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";


export async function POST(req: NextRequest) {
  const body = await req.json();
  const { userId, userName, isAdmin, subscription } = body;
  if (!subscription?.endpoint) return NextResponse.json({ error: "no subscription" }, { status: 400 });
  try {
    await pool.query(
      `INSERT INTO push_subscriptions (user_id, user_name, is_admin, endpoint, p256dh, auth)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (endpoint) DO UPDATE SET user_id=$1, user_name=$2, is_admin=$3, p256dh=$5, auth=$6`,
      [userId, userName, !!isAdmin, subscription.endpoint, subscription.keys?.p256dh || "", subscription.keys?.auth || ""]
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
