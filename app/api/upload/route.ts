// POST /api/upload — загрузка файла (фото/видео)
// Returns { url, fileId, fileName, fileType, fileSize }

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';



export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const recordId = formData.get('recordId') as string;

    if (!file) {
      return NextResponse.json({ error: 'Файл не найден' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Папка uploads в public
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    await mkdir(uploadsDir, { recursive: true });

    const ext = path.extname(file.name) || '';
    const fileId = uuidv4();
    const fileName = `${fileId}${ext}`;
    const filePath = path.join(uploadsDir, fileName);

    await writeFile(filePath, buffer);

    const publicUrl = `/uploads/${fileName}`;

    // Если есть recordId — сохраняем в БД
    if (recordId) {
      await query(
        `INSERT INTO record_files (id, record_id, file_name, file_path, file_type, file_size) VALUES ($1,$2,$3,$4,$5,$6)`,
        [fileId, recordId, file.name, publicUrl, file.type, file.size]
      );
    }

    return NextResponse.json({
      id: fileId,
      url: publicUrl,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
    });
  } catch (err) {
    console.error('Upload error:', err);
    return NextResponse.json({ error: 'Ошибка загрузки' }, { status: 500 });
  }
}
