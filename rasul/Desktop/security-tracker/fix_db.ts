import pool from './lib/db';

async function run() {
  try {
    const client = await pool.connect();
    await client.query(`ALTER TABLE face_check_logs ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;`);
    console.log("Success");
    client.release();
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}
run();
