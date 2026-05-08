import { NextRequest, NextResponse } from "next/server";
import { sendPush } from "@/lib/push";
import { requireAuth } from "@/lib/auth";

// Manual push trigger from the UI. Requires login so anonymous spam can't reach admins.
// (Internal callers like /api/applications use sendPush() directly without HTTP, bypassing this auth.)
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();
  const { title, body: msgBody, urgent, adminOnly } = body;
  if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });
  const result = await sendPush({ title, body: msgBody, urgent, adminOnly });
  if (!result.ok && result.sent === 0 && result.failed === 0) {
    return NextResponse.json({ error: "VAPID keys not configured" }, { status: 503 });
  }
  return NextResponse.json(result);
}
