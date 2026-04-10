import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { uploadToS3 } from '@/lib/s3';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('photo') as File;
    const userLogin = (formData.get('userLogin') as string) || '';
    const userName = (formData.get('userName') as string) || '';
    const userId = (formData.get('userId') as string) || null;
    const checkType = (formData.get('checkType') as string) || 'login';
    const city = (formData.get('city') as string) || '';
    const companyId = (formData.get('companyId') as string) || '';

    if (!file) return NextResponse.json({ error: 'Фото не найдено' }, { status: 400 });
    if (!userLogin || !userName) return NextResponse.json({ error: 'Данные пользователя не переданы' }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const ext = file.type === 'image/png' ? '.png' : '.jpg';
    const fileId = uuidv4();
    const key = `face-checks/${fileId}${ext}`;

    const photoUrl = await uploadToS3(key, buffer, file.type || 'image/jpeg');
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '';

    await query(
      `INSERT INTO face_check_logs (id, user_id, user_name, user_login, photo_url, check_type, status, city, company_id, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, 'approved', $7, $8, $9)`,
      [fileId, userId || null, userName, userLogin, photoUrl, checkType, city, companyId, ipAddress]
    );

    // Update company storage usage
    if (companyId) {
      await query('UPDATE companies SET used_storage_bytes = used_storage_bytes + $1 WHERE id = $2', [buffer.length, companyId]);
    }

    return NextResponse.json({ success: true, photoUrl, logId: fileId });
  } catch (err) {
    console.error('Face check error:', err);
    return NextResponse.json({ error: 'Ошибка сохранения фото' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userLogin = searchParams.get('userLogin');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    let rows;
    if (userLogin) {
      const res = await query(
        `SELECT * FROM face_check_logs WHERE user_login = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
        [userLogin, limit, offset]
      );
      rows = res.rows;
    } else {
      const res = await query(
        `SELECT * FROM face_check_logs ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
        [limit, offset]
      );
      rows = res.rows;
    }

    return NextResponse.json(rows);
  } catch (err) {
    console.error('Face check GET error:', err);
    return NextResponse.json({ error: 'Ошибка получения логов' }, { status: 500 });
  }
}
