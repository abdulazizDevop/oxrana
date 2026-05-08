import { Pool } from 'pg';

const isLocalDb = process.env.DATABASE_URL?.includes('sslmode=disable') || process.env.DATABASE_URL?.includes('localhost') || process.env.DATABASE_URL?.includes('@db:');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isLocalDb ? false : { rejectUnauthorized: false },
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
        post_name TEXT,
        guard TEXT,
        status TEXT DEFAULT 'active',
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS photo_reports (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        city TEXT NOT NULL DEFAULT '',
        complex TEXT,
        violation_type TEXT,
        description TEXT,
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
      CREATE TABLE IF NOT EXISTS tmc_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        city_id TEXT NOT NULL DEFAULT '',
        company_id TEXT NOT NULL DEFAULT '',
        requester_name TEXT,
        item_name TEXT,
        quantity INTEGER DEFAULT 1,
        status TEXT DEFAULT 'pending',
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS work_schedules (
        id TEXT PRIMARY KEY,
        city_id TEXT NOT NULL DEFAULT '',
        company_id TEXT NOT NULL DEFAULT '',
        employee_name TEXT,
        role TEXT DEFAULT '',
        schedule_type TEXT DEFAULT 'vahta',
        work_start DATE,
        work_end DATE,
        rest_start DATE,
        rest_end DATE,
        shift_hours INTEGER DEFAULT 24,
        rest_hours INTEGER DEFAULT 72,
        note TEXT DEFAULT '',
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
        used_storage_bytes BIGINT DEFAULT 0,
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
      
      CREATE TABLE IF NOT EXISTS section_records (
        id TEXT PRIMARY KEY,
        city_id TEXT NOT NULL DEFAULT '',
        company_id TEXT NOT NULL DEFAULT '',
        section TEXT NOT NULL DEFAULT '',
        data JSONB DEFAULT '{}',
        created_by TEXT,
        updated_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS record_files (
        id TEXT PRIMARY KEY,
        record_id TEXT NOT NULL,
        file_name TEXT,
        file_path TEXT,
        file_type TEXT,
        file_size BIGINT DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS cameras (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        city_id TEXT NOT NULL DEFAULT '',
        company_id TEXT NOT NULL DEFAULT '',
        name TEXT,
        url TEXT,
        type TEXT DEFAULT 'iframe',
        created_at TIMESTAMPTZ DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS conferences (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        city_id TEXT NOT NULL DEFAULT '',
        company_id TEXT,
        created_by TEXT NOT NULL,
        created_by_name TEXT NOT NULL,
        status TEXT DEFAULT 'active',
        jitsi_room TEXT,
        ended_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS conference_invitations (
        id TEXT PRIMARY KEY,
        conference_id TEXT NOT NULL,
        city_id TEXT NOT NULL DEFAULT '',
        company_id TEXT,
        seen_by TEXT[] DEFAULT '{}',
        invited_at TIMESTAMPTZ DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS conference_messages (
        id TEXT PRIMARY KEY,
        conference_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        user_name TEXT NOT NULL,
        user_role TEXT DEFAULT '',
        message TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS transport (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        city TEXT NOT NULL DEFAULT '',
        complex TEXT,
        plate_number TEXT,
        direction TEXT,
        driver_name TEXT,
        purpose TEXT,
        created_at TIMESTAMPTZ DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS transport_vehicles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        city_id TEXT NOT NULL DEFAULT '',
        company_id TEXT NOT NULL DEFAULT '',
        list_type TEXT NOT NULL DEFAULT '',
        plate_number TEXT NOT NULL,
        driver_name TEXT DEFAULT '',
        description TEXT DEFAULT '',
        created_by TEXT DEFAULT '',
        created_at TIMESTAMPTZ DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS transport_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        city_id TEXT NOT NULL DEFAULT '',
        company_id TEXT NOT NULL DEFAULT '',
        vehicle_id UUID,
        plate_number TEXT NOT NULL,
        driver_name TEXT DEFAULT '',
        list_type TEXT NOT NULL DEFAULT '',
        action TEXT NOT NULL,
        logged_by TEXT DEFAULT '',
        logged_by_role TEXT DEFAULT '',
        note TEXT DEFAULT '',
        logged_at TIMESTAMPTZ DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS face_check_logs (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        user_name TEXT NOT NULL,
        user_login TEXT NOT NULL,
        photo_url TEXT,
        check_type TEXT DEFAULT 'login',
        status TEXT DEFAULT 'approved',
        city TEXT DEFAULT '',
        company_id TEXT DEFAULT '',
        ip_address TEXT DEFAULT '',
        created_at TIMESTAMPTZ DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS admin_log (
        id TEXT PRIMARY KEY,
        city_id TEXT NOT NULL DEFAULT '',
        company_id TEXT NOT NULL DEFAULT '',
        actor_name TEXT NOT NULL,
        actor_role TEXT DEFAULT '',
        action TEXT NOT NULL,
        section TEXT DEFAULT '',
        detail TEXT DEFAULT '',
        logged_at TIMESTAMPTZ DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS admin_settings (
        id TEXT PRIMARY KEY,
        value TEXT,
        updated_at TIMESTAMPTZ DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS admin_expenses (
        id TEXT PRIMARY KEY,
        city_id TEXT NOT NULL DEFAULT '',
        company_id TEXT NOT NULL DEFAULT '',
        expense_name TEXT NOT NULL,
        advance_amount NUMERIC DEFAULT 0,
        total_amount NUMERIC DEFAULT 0,
        comment TEXT DEFAULT '',
        created_by TEXT DEFAULT '',
        created_by_role TEXT DEFAULT '',
        created_at TIMESTAMPTZ DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS emergency_alerts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        city_id TEXT NOT NULL DEFAULT '',
        company_id TEXT NOT NULL DEFAULT '',
        triggered_by TEXT NOT NULL,
        triggered_by_role TEXT DEFAULT '',
        message TEXT DEFAULT '',
        resolved_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id TEXT,
        user_name TEXT,
        is_admin BOOLEAN DEFAULT false,
        endpoint TEXT UNIQUE NOT NULL,
        p256dh TEXT DEFAULT '',
        auth TEXT DEFAULT '',
        created_at TIMESTAMPTZ DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS role_instructions (
        id TEXT PRIMARY KEY,
        role_key TEXT UNIQUE NOT NULL,
        role_label TEXT DEFAULT '',
        content TEXT DEFAULT '',
        updated_by TEXT DEFAULT '',
        updated_at TIMESTAMPTZ DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS user_logins (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        login TEXT UNIQUE NOT NULL,
        plain_password TEXT,
        password_hash TEXT NOT NULL,
        label TEXT DEFAULT '',
        created_at TIMESTAMPTZ DEFAULT now()
      );

      -- Add missing columns to existing tables if needed
      ALTER TABLE companies ADD COLUMN IF NOT EXISTS owner_id TEXT;
      ALTER TABLE companies ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMPTZ;
      ALTER TABLE companies ADD COLUMN IF NOT EXISTS used_storage_bytes BIGINT DEFAULT 0;

      ALTER TABLE connection_applications ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'connect';
      ALTER TABLE connection_applications ADD COLUMN IF NOT EXISTS user_id TEXT;
      ALTER TABLE connection_applications ADD COLUMN IF NOT EXISTS company_id TEXT;

      ALTER TABLE app_users ADD COLUMN IF NOT EXISTS email TEXT;
      ALTER TABLE app_users ADD COLUMN IF NOT EXISTS phone TEXT;

      -- ─── Indexes for hot lookup paths ─────────────────────────────────────────
      -- Each one below targets a query pattern that the API runs frequently.
      -- IF NOT EXISTS lets initDb() be safely re-run on every cold start.

      -- Registration/login lookup by email
      CREATE INDEX IF NOT EXISTS idx_app_users_email ON app_users (email);

      -- handleSelectCity → /api/companies?cityId=…
      CREATE INDEX IF NOT EXISTS idx_companies_city_id ON companies (city_id);
      -- /api/users hasPermissionForEntities owner check + general ownership lookups
      CREATE INDEX IF NOT EXISTS idx_companies_owner_id ON companies (owner_id);

      -- Admin sees newest applications first; pending vs done
      CREATE INDEX IF NOT EXISTS idx_apps_status_created ON connection_applications (status, created_at DESC);

      -- The hottest section_records query: WHERE city_id=… AND company_id=… AND section=…
      CREATE INDEX IF NOT EXISTS idx_section_records_filter
        ON section_records (city_id, company_id, section, created_at DESC);
      -- LEFT JOIN record_files ON file.record_id = section_records.id
      CREATE INDEX IF NOT EXISTS idx_record_files_record_id ON record_files (record_id);

      -- Polled by Dashboard every 30s — emergency_alerts WHERE resolved_at IS NULL AND city/company
      CREATE INDEX IF NOT EXISTS idx_emergency_unresolved
        ON emergency_alerts (city_id, company_id) WHERE resolved_at IS NULL;

      -- Polled by ConferenceSection every 30s, by Dashboard every 60s
      CREATE INDEX IF NOT EXISTS idx_conferences_city_company ON conferences (city_id, company_id);
      CREATE INDEX IF NOT EXISTS idx_conf_invites_city_company ON conference_invitations (city_id, company_id);

      -- AdminPanel cameras filter
      CREATE INDEX IF NOT EXISTS idx_cameras_city_company ON cameras (city_id, company_id);

      -- Admin log scrollback
      CREATE INDEX IF NOT EXISTS idx_admin_log_filter
        ON admin_log (city_id, company_id, logged_at DESC);

      -- Admin expenses page
      CREATE INDEX IF NOT EXISTS idx_admin_expenses_filter
        ON admin_expenses (city_id, company_id, created_at DESC);

      -- Transport log scrollback
      CREATE INDEX IF NOT EXISTS idx_transport_log_filter
        ON transport_log (city_id, company_id, logged_at DESC);

      -- Transport vehicles by list type (allowed/working) within company
      CREATE INDEX IF NOT EXISTS idx_transport_vehicles_lookup
        ON transport_vehicles (city_id, company_id, list_type);

      -- Push send adminOnly filter
      CREATE INDEX IF NOT EXISTS idx_push_subs_admin ON push_subscriptions (is_admin) WHERE is_admin = true;

      -- Schedules by company (EmployeesSection /api/records?section=schedule lookup)
      CREATE INDEX IF NOT EXISTS idx_work_schedules_filter ON work_schedules (city_id, company_id);

      -- user_logins reverse lookup by login (login flow alternate creds)
      CREATE INDEX IF NOT EXISTS idx_user_logins_login ON user_logins (login);
      CREATE INDEX IF NOT EXISTS idx_user_logins_user ON user_logins (user_id);

      -- Face-check log lookup by user
      CREATE INDEX IF NOT EXISTS idx_face_check_user ON face_check_logs (user_id, created_at DESC);
    `);
  } finally {
    client.release();
  }
}
