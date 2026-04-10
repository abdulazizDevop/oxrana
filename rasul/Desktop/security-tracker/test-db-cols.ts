import { query } from './lib/db';
async function test() {
  const res = await query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'app_users'");
  console.log(res.rows);
  process.exit(0);
}
test();
