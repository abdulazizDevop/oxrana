"use client";

import { fullClientReset } from "@/lib/clientReset";

// Floating top-right escape hatch — visible on EVERY page (login, city/company select,
// inside Dashboard, AdminPanel) so a user stuck on a stale iOS PWA bundle can fully reset
// the app from anywhere.
export function ResetButton() {
  const handleReset = async () => {
    if (typeof window === "undefined") return;
    if (!confirm("Полностью сбросить приложение? Будут удалены кеш, cookies и локальные данные. Вы выйдете из аккаунта.")) return;
    await fullClientReset();
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
