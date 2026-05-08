"use client";
// Top-level error boundary. When the entire layout crashes (e.g. a stale iOS PWA
// references hashed JS chunks that no longer exist on the server), Next.js renders
// THIS instead of the layout — so the reset button must live here too, otherwise
// users get a black screen with no way to recover.

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const fullReset = async () => {
    if (typeof window === "undefined") return;
    try {
      try { await fetch("/api/auth", { method: "DELETE" }); } catch {}
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(r => r.unregister()));
      }
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }
      try { localStorage.clear(); } catch {}
      try { sessionStorage.clear(); } catch {}
      try {
        document.cookie.split(";").forEach(c => {
          const eq = c.indexOf("=");
          const name = (eq > -1 ? c.substr(0, eq) : c).trim();
          if (!name) return;
          const expire = "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
          document.cookie = name + expire;
          document.cookie = name + expire + "; domain=" + window.location.hostname;
        });
      } catch {}
      try {
        const anyIdb = (indexedDB as any);
        if (anyIdb?.databases) {
          const dbs: { name?: string }[] = await anyIdb.databases();
          await Promise.all(dbs.map(db => db.name ? new Promise<void>(resolve => {
            const req = indexedDB.deleteDatabase(db.name!);
            req.onsuccess = req.onerror = req.onblocked = () => resolve();
          }) : Promise.resolve()));
        }
      } catch {}
    } catch {}
    window.location.href = "/?v=" + Date.now();
  };

  return (
    <html lang="ru">
      <body style={{ margin: 0, background: "#0a0a14", color: "#f0f0fa", fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif", minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ maxWidth: 380, width: "100%", textAlign: "center" }}>
          <div style={{ fontSize: 56, marginBottom: 12 }}>⚠️</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Что-то пошло не так</h1>
          <p style={{ fontSize: 14, color: "#8888a0", marginBottom: 20, lineHeight: 1.5 }}>
            Скорее всего у вас закеширована старая версия приложения. Нажмите кнопку ниже — приложение полностью обновится.
          </p>
          <button onClick={fullReset}
            style={{ width: "100%", padding: "14px 20px", borderRadius: 14, border: "none", background: "linear-gradient(135deg, #e63946, #c1121f)", color: "white", fontSize: 15, fontWeight: 700, cursor: "pointer", marginBottom: 10, boxShadow: "0 8px 24px rgba(230,57,70,0.3)" }}>
            ↻ Полный сброс и перезагрузка
          </button>
          <button onClick={() => reset()}
            style={{ width: "100%", padding: "12px 20px", borderRadius: 14, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "#a0a0b8", fontSize: 13, cursor: "pointer" }}>
            Попробовать ещё раз
          </button>
          {error?.digest && (
            <p style={{ fontSize: 10, color: "#44445a", marginTop: 16, fontFamily: "monospace" }}>
              Код ошибки: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
