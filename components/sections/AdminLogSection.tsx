"use client";
import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";

interface LogEntry {
  id: string;
  city_id: string;
  company_id: string;
  actor_name: string;
  actor_role: string;
  action: string;
  section: string;
  detail: string;
  logged_at: string;
}

const SECTION_ICONS: Record<string, string> = {
  "Расходы": "💰",
  "Транспорт": "🚗",
  "Обходы": "🔦",
  "Смены": "🔄",
  "Посты": "🏢",
  "Фото": "📷",
  "Имущество": "📦",
  "График": "📅",
  "Штрафы": "⚠️",
};

interface Props {
  city: string;
  companyId?: string;
}

export default function AdminLogSection({ city, companyId }: Props) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [sectionFilter, setSectionFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    const q = new URLSearchParams({ cityId: city, limit: "300" });
    if (companyId) q.set("companyId", companyId);
    fetch(`/api/admin/log?${q}`)
      .then(r => r.json())
      .then(data => { setLogs(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [city, companyId]);

  useEffect(() => { load(); }, [load]);

  const sections = Array.from(new Set(logs.map(l => l.section).filter(Boolean)));
  const filtered = logs.filter(l => {
    if (sectionFilter && l.section !== sectionFilter) return false;
    if (!searchQuery) return true;
    const s = searchQuery.toLowerCase();
    return l.actor_name?.toLowerCase().includes(s) || 
           l.action?.toLowerCase().includes(s) || 
           l.detail?.toLowerCase().includes(s) || 
           l.section?.toLowerCase().includes(s);
  });

  return (
    <div style={{ maxWidth: 780, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#e8e8f0", margin: 0 }}>🗂️ Журнал логов</h2>
          <p style={{ fontSize: 12, color: "#55556a", marginTop: 4 }}>Все действия сотрудников и администратора</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            fontSize: 12, color: "#6b6b80",
            background: "rgba(255,255,255,0.04)",
            borderRadius: 8, padding: "5px 10px"
          }}>{filtered.length} записей</div>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={load}
            style={{
              background: "rgba(79,142,247,0.1)",
              border: "1px solid rgba(79,142,247,0.2)",
              borderRadius: 9, padding: "6px 12px",
              fontSize: 12, color: "#4f8ef7", cursor: "pointer"
            }}
          >↻ Обновить</motion.button>
        </div>
      </div>

      {/* Поиск */}
      <div className="search-wrap">
        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: "#55556a" }}>🔍</span>
        <input
          type="text"
          placeholder="Поиск по имени, действию или деталям..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full bg-white/5 border border-white/10 focus:border-white/25 text-white rounded-2xl pr-5 py-3.5 text-sm placeholder-white/30 outline-none transition-all"
          style={{ paddingLeft: 36 }}
        />
      </div>

      {/* Фильтр по секции */}
      {sections.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
          <button
            onClick={() => setSectionFilter("")}
            style={{
              padding: "6px 14px", borderRadius: 9, fontSize: 12, cursor: "pointer", border: "none",
              background: !sectionFilter ? "rgba(79,142,247,0.2)" : "rgba(255,255,255,0.05)",
              color: !sectionFilter ? "#4f8ef7" : "#6b6b80", fontWeight: !sectionFilter ? 600 : 400,
            }}
          >Все</button>
          {sections.map(s => (
            <button key={s} onClick={() => setSectionFilter(s)}
              style={{
                padding: "6px 14px", borderRadius: 9, fontSize: 12, cursor: "pointer", border: "none",
                background: sectionFilter === s ? "rgba(79,142,247,0.15)" : "rgba(255,255,255,0.05)",
                color: sectionFilter === s ? "#4f8ef7" : "#6b6b80", fontWeight: sectionFilter === s ? 600 : 400,
              }}
            >{SECTION_ICONS[s] || "📌"} {s}</button>
          ))}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: "60px", color: "#55556a" }}>Загрузка...</div>
      ) : filtered.length === 0 ? (
        <div style={{
          background: "rgba(19,19,26,0.4)",
          border: "1px dashed rgba(255,255,255,0.08)",
          borderRadius: 18, padding: "56px", textAlign: "center", color: "#55556a"
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🗂️</div>
          <div style={{ fontSize: 14 }}>Журнал пуст</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {filtered.map((entry, i) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: i * 0.02 }}
              style={{
                background: "rgba(19,19,26,0.8)",
                border: "1px solid rgba(255,255,255,0.05)",
                borderRadius: 12, padding: "12px 14px",
                display: "flex", alignItems: "center", gap: 12
              }}
            >
              <div style={{
                width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                background: "rgba(79,142,247,0.1)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 16
              }}>
                {SECTION_ICONS[entry.section] || "📌"}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 2 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#e8e8f0" }}>{entry.action}</span>
                  {entry.section && (
                    <span style={{
                      fontSize: 10, padding: "2px 7px", borderRadius: 5,
                      background: "rgba(79,142,247,0.1)", color: "#4f8ef7"
                    }}>{entry.section}</span>
                  )}
                </div>
                {entry.detail && (
                  <div style={{
                    fontSize: 12, color: "#8888a0",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"
                  }}>{entry.detail}</div>
                )}
                <div style={{ fontSize: 11, color: "#44444e", marginTop: 2 }}>
                  <span style={{ color: "#6b6b80" }}>{entry.actor_name}</span>
                  {entry.actor_role && <span style={{ color: "#44444e" }}> ({entry.actor_role})</span>}
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontSize: 11, color: "#6b6b80" }}>
                  {new Date(entry.logged_at).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "2-digit" })}
                </div>
                <div style={{ fontSize: 10, color: "#44444e" }}>
                  {new Date(entry.logged_at).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
