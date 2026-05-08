import pool from "@/lib/db";
import webpush from "web-push";

let vapidConfigured = false;
function ensureVapid() {
  if (vapidConfigured) return true;
  if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return false;
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL || "mailto:admin@jktracker.ru",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
  vapidConfigured = true;
  return true;
}

export type PushPayload = { title: string; body?: string; urgent?: boolean; adminOnly?: boolean };

// Sends a push notification to all matching subscribers. Safe to call without `await`
// — failures are swallowed so callers (e.g. application POST) never block on push delivery.
export async function sendPush(p: PushPayload): Promise<{ ok: boolean; sent: number; failed: number }> {
  if (!ensureVapid()) return { ok: false, sent: 0, failed: 0 };
  try {
    let query = "SELECT * FROM push_subscriptions";
    if (p.adminOnly) query += " WHERE is_admin = true";

    const { rows } = await pool.query(query);
    if (rows.length === 0) return { ok: true, sent: 0, failed: 0 };

    const results = await Promise.allSettled(
      rows.map(sub =>
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify({ title: p.title, body: p.body || "", urgent: !!p.urgent })
        )
      )
    );

    const sent = results.filter(r => r.status === "fulfilled").length;
    const failed = results.filter(r => r.status === "rejected").length;

    // Drop subscriptions Apple/Google have killed (410 Gone) so we don't keep retrying them.
    const expired = rows.filter((_, i) => {
      const r = results[i];
      return r.status === "rejected" && (r as PromiseRejectedResult).reason?.statusCode === 410;
    });
    for (const sub of expired) {
      try { await pool.query("DELETE FROM push_subscriptions WHERE endpoint=$1", [sub.endpoint]); } catch {}
    }

    return { ok: true, sent, failed };
  } catch {
    return { ok: false, sent: 0, failed: 0 };
  }
}
