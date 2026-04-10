import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 10,
});

export default pool;

export async function query(text: string, params?: unknown[]) {
  const client = await pool.connect();
  try {
    const res = await client.query(text, params);
    return res;
  } finally {
    client.release();
  }
}

// Tagged template literal helper for parameterized queries
export async function sql(strings: TemplateStringsArray, ...values: unknown[]): Promise<any[]> {
  let text = '';
  const params: unknown[] = [];
  strings.forEach((str, i) => {
    text += str;
    if (i < values.length) {
      params.push(values[i]);
      text += `$${params.length}`;
    }
  });
  const client = await pool.connect();
  try {
    const res = await client.query(text, params);
    return res.rows;
  } finally {
    client.release();
  }
}

// Create tables if they don't exist
export async function initDb() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS patrols (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        city TEXT NOT NULL DEFAULT '',
        complex TEXT,
        guard TEXT,
        area TEXT,
        status TEXT DEFAULT 'pending',
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS shifts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        city TEXT NOT NULL DEFAULT '',
        complex TEXT,
        outgoing TEXT,
        incoming TEXT,
        status TEXT DEFAULT 'pending',
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS posts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        city TEXT NOT NULL DEFAULT '',
        complex TEXT,
        name TEXT,
        status TEXT DEFAULT 'active',
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS photo_reports (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        city TEXT NOT NULL DEFAULT '',
        complex TEXT,
        title TEXT,
        photo_url TEXT,
        status TEXT DEFAULT 'pending',
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS apartments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        city TEXT NOT NULL DEFAULT '',
        complex TEXT,
        room_name TEXT,
        status TEXT DEFAULT 'ok',
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS inventory (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        city TEXT NOT NULL DEFAULT '',
        complex TEXT,
        item_name TEXT,
        quantity INTEGER DEFAULT 0,
        status TEXT DEFAULT 'ok',
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS fines (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        city TEXT NOT NULL DEFAULT '',
        complex TEXT,
        guard TEXT,
        violation TEXT,
        amount NUMERIC DEFAULT 0,
        status TEXT DEFAULT 'pending',
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        city TEXT NOT NULL DEFAULT '',
        complex TEXT,
        requester TEXT,
        description TEXT,
        status TEXT DEFAULT 'pending',
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS schedules (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        city TEXT NOT NULL DEFAULT '',
        complex TEXT,
        employee TEXT,
        schedule_date DATE,
        shift_type TEXT,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS cities (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        is_default BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS companies (
        id TEXT PRIMARY KEY,
        city_id TEXT,
        name TEXT NOT NULL,
        description TEXT DEFAULT '',
        professions_list TEXT DEFAULT '',
        employee_count INTEGER DEFAULT 0,
        owner_id TEXT,
        subscription_ends_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS app_users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        login TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        plain_password TEXT,
        role TEXT DEFAULT 'guard',
        profession TEXT DEFAULT '',
        is_admin BOOLEAN DEFAULT false,
        allowed_sections TEXT[] DEFAULT '{}',
        allowed_cities TEXT[] DEFAULT '{}',
        allowed_companies TEXT[] DEFAULT '{}',
        email TEXT,
        phone TEXT,
        created_at TIMESTAMPTZ DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS post_accounting (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        employee_name TEXT NOT NULL,
        post_name TEXT NOT NULL DEFAULT 'Пост 1',
        city TEXT NOT NULL DEFAULT '',
        company_id TEXT DEFAULT '',
        year INTEGER NOT NULL,
        month INTEGER NOT NULL,
        days JSONB DEFAULT '{}',
        total_hours NUMERIC DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS connection_applications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        object_name TEXT NOT NULL,
        address TEXT DEFAULT '',
        status TEXT DEFAULT 'pending',
        type TEXT DEFAULT 'connect',
        user_id TEXT,
        company_id TEXT,
        created_at TIMESTAMPTZ DEFAULT now()
      );
      
      -- Add missing columns to existing tables if needed
      ALTER TABLE companies ADD COLUMN IF NOT EXISTS owner_id TEXT;
      ALTER TABLE companies ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMPTZ;
      
      ALTER TABLE connection_applications ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'connect';
      ALTER TABLE connection_applications ADD COLUMN IF NOT EXISTS user_id TEXT;
      ALTER TABLE connection_applications ADD COLUMN IF NOT EXISTS company_id TEXT;
      
      ALTER TABLE app_users ADD COLUMN IF NOT EXISTS email TEXT;
      ALTER TABLE app_users ADD COLUMN IF NOT EXISTS phone TEXT;
    `);
  } finally {
    client.release();
  }
}
