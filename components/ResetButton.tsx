"use client";

// Floating top-right escape hatch — visible on EVERY page (login, city/company select,
// inside Dashboard, AdminPanel) so a user stuck on a stale iOS PWA bundle can fully reset
// the app from anywhere. Wipes SW, caches, localStorage, sessionStorage, cookies and IndexedDB.
export function ResetButton() {
  const handleReset = async () => {
    if (typeof window === "undefined") return;
    if (!confirm("Полностью сбросить приложение? Будут удалены кеш, cookies и локальные данные. Вы выйдете из аккаунта.")) return;
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
    window.location.href = window.location.pathname + "?v=" + Date.now();
  };

  return (
    <button
      onClick={handleReset}
      aria-label="Сбросить приложение"
      title="Полный сброс: кеш, cookies, локальные данные"
      style={{
        position: "fixed",
        top: "max(14px, env(safe-area-inset-top, 14px))",
        right: 14,
        zIndex: 99999,
        width: 38, height: 38,
        borderRadius: 12,
        border: "1px solid rgba(239,68,68,0.35)",
        background: "rgba(239,68,68,0.18)",
        color: "#f87171",
        fontSize: 16, fontWeight: 700,
        cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      ↻
    </button>
  );
}
