// Full client-side reset: drops every client artefact (auth cookie, SW, caches,
// localStorage, sessionStorage, cookies, IndexedDB) and reloads with a cache-busting
// query so the next start downloads the freshest bundle.
// Used both from the floating ResetButton and the global-error page.
export async function fullClientReset(): Promise<void> {
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
  window.location.href = window.location.pathname + "?v=" + Date.now();
}
