import { query } from './lib/db';
async function run() {
  try {
    await query("ALTER TABLE app_users ADD COLUMN IF NOT EXISTS email TEXT");
    await query("ALTER TABLE app_users ADD COLUMN IF NOT EXISTS phone TEXT");
    console.log("Success");
  } catch (e) {
    console.error(e);
  }
  process.exit(0);
}
run();
