import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import webpush from "web-push";


if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL || "mailto:admin@jktracker.ru",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { title, body: msgBody, urgent, adminOnly } = body;

  if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    return NextResponse.json({ error: "VAPID keys not configured" }, { status: 503 });
  }

  try {
    let query = "SELECT * FROM push_subscriptions";
    if (adminOnly) query += " WHERE is_admin = true";

    const { rows } = await pool.query(query);
    const results = await Promise.allSettled(
      rows.map(sub =>
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify({ title, body: msgBody, urgent: !!urgent })
        )
      )
    );

    const sent = results.filter(r => r.status === "fulfilled").length;
    const failed = results.filter(r => r.status === "rejected").length;

    // Удаляем просроченные подписки
    const expired = rows.filter((_, i) => {
      const r = results[i];
      return r.status === "rejected" && (r as PromiseRejectedResult).reason?.statusCode === 410;
    });
    for (const sub of expired) {
      await pool.query("DELETE FROM push_subscriptions WHERE endpoint=$1", [sub.endpoint]);
    }

    return NextResponse.json({ ok: true, sent, failed });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
