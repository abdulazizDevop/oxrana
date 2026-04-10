import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

async function sendTelegramAlert(text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
  if (!token || !chatId) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
    });
  } catch {}
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const cityId = searchParams.get('cityId');
  const companyId = searchParams.get('companyId');
  const conditions: string[] = ['resolved_at IS NULL'];
  const params: string[] = [];
  if (cityId) { conditions.push(`city_id = $${params.length + 1}`); params.push(cityId); }
  if (companyId) { conditions.push(`company_id = $${params.length + 1}`); params.push(companyId); }
  const res = await query(
    `SELECT * FROM emergency_alerts WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC`,
    params
  );
  return NextResponse.json(res.rows);
}

export async function POST(req: NextRequest) {
  const { cityId, companyId, triggeredBy, triggeredByRole, message } = await req.json();
  const res = await query(
    `INSERT INTO emergency_alerts (city_id, company_id, triggered_by, triggered_by_role, message)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [cityId, companyId, triggeredBy, triggeredByRole, message || 'ЧП на объекте!']
  );

  const now = new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow', hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
    await sendTelegramAlert(
      `🚨🚨🚨 <b>ЧП ЧП ЧП</b> 🚨🚨🚨\n\n` +
      `⛔️ <b>ЭКСТРЕННАЯ СИТУАЦИЯ НА ОБЪЕКТЕ!</b>\n\n` +
      `👤 Сообщил: <b>${triggeredBy}</b> (${triggeredByRole})\n` +
      `📍 Объект: ${cityId || '—'}${companyId ? ' · ' + companyId : ''}\n` +
      `🕐 Время: ${now}\n\n` +
      `🚨 ЧП ЧП ЧП 🚨\n` +
      `⚠️ ТРЕБУЕТСЯ НЕМЕДЛЕННОЕ РЕАГИРОВАНИЕ!`
    );

  return NextResponse.json(res.rows[0]);
}

export async function PATCH(req: NextRequest) {
  const { id } = await req.json();
  await query(`UPDATE emergency_alerts SET resolved_at = NOW() WHERE id = $1`, [id]);
  return NextResponse.json({ ok: true });
}
