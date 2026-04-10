export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initDb } = await import('@/lib/db');
    try {
      await initDb();
      console.log('✅ Database tables initialized');
    } catch (e) {
      console.error('❌ Database init failed:', e);
    }
  }
}
