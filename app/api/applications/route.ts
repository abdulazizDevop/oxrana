import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { sendPush } from '@/lib/push';
import { rateLimit, clientKey } from '@/lib/rate-limit';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    const res = await query('SELECT * FROM connection_applications ORDER BY created_at DESC');
    return NextResponse.json(res.rows);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    // Public endpoint — anyone can submit an application. Rate-limit per IP so a single
    // spammer can't drown the admin in fake requests.
    if (!rateLimit(clientKey(req, 'app-post'), 10, 60_000)) {
      return NextResponse.json({ error: 'Слишком много заявок, подождите минуту' }, { status: 429 });
    }
    const { name, phone, object_name, address, userId, type, companyId } = await req.json();
    if (!name || !phone || !object_name) {
      return NextResponse.json({ error: 'name, phone, object_name required' }, { status: 400 });
    }
    const res = await query(
      'INSERT INTO connection_applications (name, phone, object_name, address, user_id, type, company_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [name, phone, object_name, address || '', userId || null, type || 'connect', companyId || null]
    );

    // Notify admins in the background. We call sendPush() directly (no HTTP roundtrip
    // through nginx + sslip.io DNS) and intentionally don't await — the response returns
    // immediately so iPhone PWA users don't see a 5-10s "loading" while we hit Apple/Google.
    const reqType = type || 'connect';
    const titleByType: Record<string, string> = {
      connect: '📝 Новая заявка на подключение',
      new_object: '🏗️ Заявка на новый объект',
      subscription: '💳 Заявка на продление подписки',
    };
    const pushTitle = titleByType[reqType] || '📝 Новая заявка';
    const pushBody = `${name} · ${phone}${object_name ? ' · ' + object_name : ''}`;
    sendPush({ title: pushTitle, body: pushBody, urgent: true, adminOnly: true }).catch(() => {});

    return NextResponse.json(res.rows[0]);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    const { id, status } = await req.json();
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    const res = await query(
      'UPDATE connection_applications SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );
    return NextResponse.json(res.rows[0]);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    const id = req.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    await query('DELETE FROM connection_applications WHERE id = $1', [id]);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
