import { NextResponse } from "next/server";

// ─── Standardised JSON responses ─────────────────────────────────────────────
// Every API endpoint should return either ok(...) or err(...) so the client
// always sees a consistent { ok: true, data } / { error: "..." } shape.

export function ok<T>(data: T, init?: number | ResponseInit): NextResponse {
  const opts = typeof init === "number" ? { status: init } : init;
  return NextResponse.json(data, opts);
}

export function err(message: string, status = 400, extra?: Record<string, unknown>): NextResponse {
  return NextResponse.json({ error: message, ...(extra || {}) }, { status });
}

// ─── Request body helpers ────────────────────────────────────────────────────

// Safe JSON parse — returns null instead of throwing so handlers can branch.
export async function readJson<T = any>(req: Request): Promise<T | null> {
  try { return await req.json() as T; } catch { return null; }
}

// Validates that every named field is present and non-empty (after trim).
// Returns null on success, or a 400 NextResponse describing the missing field.
export function requireFields(
  body: Record<string, any> | null | undefined,
  ...fields: string[]
): NextResponse | null {
  if (!body) return err("Тело запроса пустое или невалидный JSON", 400);
  for (const f of fields) {
    const v = body[f];
    if (v === undefined || v === null) return err(`Не указано поле: ${f}`, 400);
    if (typeof v === "string" && v.trim().length === 0) return err(`Не указано поле: ${f}`, 400);
  }
  return null;
}

// Bounded string trim — used to defend against accidentally storing huge blobs of text
// (e.g. someone pastes a 10MB document into a "name" field). Returns the trimmed value.
export function trimString(value: unknown, maxLen = 500): string {
  if (typeof value !== "string") return "";
  const s = value.trim();
  return s.length > maxLen ? s.slice(0, maxLen) : s;
}
