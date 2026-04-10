const { Pool } = require('pg');
require('dotenv').config({ path: './rasul/Desktop/security-tracker/.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

pool.query(`
      CREATE TABLE IF NOT EXISTS connection_applications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        object_name TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMPTZ DEFAULT now()
      );
`).then(() => { console.log('created'); process.exit(0); }).catch(console.error);
