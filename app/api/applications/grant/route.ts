import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const { applicationId, cityId, objectName, address, login, password, userId: existingUserId, type, companyId: existingCompanyId } = data;

    if (!applicationId) return NextResponse.json({ error: 'applicationId required' }, { status: 400 });

    // 1. Handle Subscription Extension
    if (type === 'subscription' && existingCompanyId) {
      const subscriptionEndsAt = new Date();
      subscriptionEndsAt.setMonth(subscriptionEndsAt.getMonth() + 1); // Extend by 1 month by default on grant
      
      await query(
        'UPDATE companies SET subscription_ends_at = $1 WHERE id = $2',
        [subscriptionEndsAt, existingCompanyId]
      );
      
      await query('UPDATE connection_applications SET status = $1 WHERE id = $2', ['done', applicationId]);
      return NextResponse.json({ success: true, type: 'subscription' });
    }

    // 2. Handle New Object for Existing User
    if (type === 'new_object' && existingUserId) {
      const companyId = (objectName || 'new_object').toLowerCase().replace(/\s+/g, "_") + "_" + Date.now();
      const subscriptionEndsAt = new Date();
      subscriptionEndsAt.setDate(subscriptionEndsAt.getDate() + 30); // 30 days for approved object

      await query(
        'INSERT INTO companies (id, city_id, name, description, subscription_ends_at, owner_id) VALUES ($1, $2, $3, $4, $5, $6)',
        [companyId, cityId, objectName, address, subscriptionEndsAt, existingUserId]
      );

      // Update user's allowed companies
      await query(
        'UPDATE app_users SET allowed_companies = array_append(allowed_companies, $1) WHERE id = $2',
        [companyId, existingUserId]
      );

      await query('UPDATE connection_applications SET status = $1 WHERE id = $2', ['done', applicationId]);
      return NextResponse.json({ success: true, companyId, type: 'new_object' });
    }

    // 3. Default: Create New User and Company (Existing logic)
    if (!objectName?.trim()) return NextResponse.json({ error: 'objectName required' }, { status: 400 });
    if (!password?.trim()) return NextResponse.json({ error: 'password required' }, { status: 400 });
    if (!login?.trim()) return NextResponse.json({ error: 'login required' }, { status: 400 });
    if (!cityId) return NextResponse.json({ error: 'cityId required' }, { status: 400 });
    const companyId = objectName.toLowerCase().replace(/\s+/g, "_") + "_" + Date.now();
    const subscriptionEndsAt = new Date();
    subscriptionEndsAt.setDate(subscriptionEndsAt.getDate() + 3); // 3 days trial

    await query(
      'INSERT INTO companies (id, city_id, name, description, subscription_ends_at) VALUES ($1, $2, $3, $4, $5)',
      [companyId, cityId, objectName, address, subscriptionEndsAt]
    );

    const userId = "user_" + Date.now();
    const hash = await bcrypt.hash(password, 12);
    const allowedSections = ["patrol", "shift", "posts", "photo", "apartment", "inventory", "transport", "schedule", "fines", "requests", "employees", "conference"];
    
    await query(
      `INSERT INTO app_users (id, name, role, profession, login, password_hash, plain_password, allowed_sections, allowed_cities, allowed_companies, is_admin)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [userId, objectName, "Объект", "Руководитель", login, hash, password, allowedSections, [cityId], [companyId], false]
    );
    
    // Link company to owner
    await query('UPDATE companies SET owner_id = $1 WHERE id = $2', [userId, companyId]);

    await query('UPDATE connection_applications SET status = $1 WHERE id = $2', ['done', applicationId]);

    return NextResponse.json({ success: true, companyId, userId, type: 'connect' });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
