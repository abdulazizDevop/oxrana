"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Mobile bottom-nav "Ещё" overflow menu for the AdminPanel — shows tabs that didn't fit
// in the main bar so the admin can still reach them on a phone.
export function AdminMoreMenu({ tab, setTab, allTabs, excludeIds }: {
  tab: string;
  setTab: (t: string) => void;
  allTabs: { id: string; icon: string; label: string }[];
  excludeIds: string[];
}) {
  const [open, setOpen] = useState(false);
  const extra = allTabs.filter(t => !excludeIds.includes(t.id));
  const isExtraActive = extra.some(t => t.id === tab);
  return (
    <div style={{ position: "relative" }}>
      <motion.button whileTap={{ scale: 0.84 }} onClick={() => setOpen(!open)}
        style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "6px 10px", borderRadius: 14, border: "none", background: isExtraActive ? "rgba(255,255,255,0.07)" : "transparent", cursor: "pointer", minWidth: 56 }}>
        <span style={{ fontSize: 22 }}>⋯</span>
        <span style={{ fontSize: 10, color: isExtraActive ? "#f0f0fa" : "#404058", fontWeight: isExtraActive ? 700 : 400 }}>Ещё</span>
      </motion.button>
      <AnimatePresence>
        {open && (
          <>
            <div style={{ position: "fixed", inset: 0, zIndex: 290 }} onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.94 }} animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.94 }} transition={{ type: "spring", stiffness: 400, damping: 28 }}
              style={{ position: "absolute", bottom: "calc(100% + 12px)", right: 0, background: "rgba(12,12,22,0.99)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 22, padding: "8px", minWidth: 220, backdropFilter: "blur(28px)", zIndex: 300, boxShadow: "0 -12px 50px rgba(0,0,0,0.7)", maxHeight: "60vh", overflowY: "auto" }}>
              {extra.map(item => (
                <motion.button key={item.id} whileTap={{ scale: 0.96 }}
                  onClick={() => { setTab(item.id); setOpen(false); }}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 11, padding: "11px 14px", borderRadius: 14, border: "none", background: tab === item.id ? "rgba(79,142,247,0.12)" : "transparent", cursor: "pointer", textAlign: "left" }}>
                  <span style={{ fontSize: 20 }}>{item.icon}</span>
                  <span style={{ fontSize: 14, color: tab === item.id ? "#f0f0fa" : "#606078", fontWeight: tab === item.id ? 600 : 400 }}>{item.label}</span>
                </motion.button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
