"use client";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Trash2, ArrowRightCircle, ArrowLeftCircle } from "lucide-react";
import { AppUser } from "@/lib/auth";

type ListType = "allowed" | "working";
type Vehicle = {
  id: string; city_id: string; company_id: string; list_type: ListType;
  plate_number: string; driver_name: string; description: string;
  created_by: string; created_at: string;
  today_last_action: "entry" | "exit" | null; today_last_time: string | null;
};
type LogEntry = {
  id: string; plate_number: string; driver_name: string; list_type: ListType;
  action: "entry" | "exit"; logged_by: string; logged_by_role: string;
  note: string; logged_at: string;
};

const LIST_META = {
  allowed: { label: "Разрешённый", icon: "✅", color: "#4f8ef7", bg: "rgba(79,142,247,0.12)" },
  working: { label: "Рабочий",     icon: "🔧", color: "#fbbf24", bg: "rgba(251,191,36,0.12)" },
};

export default function TransportSection({ city, companyId, currentUser }: { city: string; companyId?: string; currentUser?: AppUser }) {
  const [activeList, setActiveList]   = useState<ListType>("allowed");
  const [vehicles, setVehicles]       = useState<Vehicle[]>([]);
  const [loading, setLoading]         = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm]         = useState({ plate_number: "", driver_name: "", description: "" });
  const [saving, setSaving]           = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [entryConfirm, setEntryConfirm] = useState<Vehicle | null>(null);
  const [entryNote, setEntryNote]       = useState("");
  const [entryLoading, setEntryLoading] = useState(false);
  const [exitConfirm, setExitConfirm]   = useState<Vehicle | null>(null);
  const [exitLoading, setExitLoading]   = useState(false);

  const [showLog, setShowLog]           = useState(false);
  const [log, setLog]                   = useState<LogEntry[]>([]);
  const [logLoading, setLogLoading]     = useState(false);
  const [logSearch, setLogSearch]       = useState("");

  const fetchVehicles = useCallback(async () => {
    setLoading(true);
    const q = new URLSearchParams({ listType: activeList });
    if (city) q.set("cityId", city);
    if (companyId) q.set("companyId", companyId);
    const res = await fetch(`/api/transport/vehicles?${q}`);
    const data = await res.json();
    setVehicles(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [city, companyId, activeList]);

  useEffect(() => { fetchVehicles(); }, [fetchVehicles]);

  const fetchLog = async () => {
    setLogLoading(true);
    const q = new URLSearchParams();
    if (city) q.set("cityId", city);
    if (companyId) q.set("companyId", companyId);
    const res = await fetch(`/api/transport/log?${q}`);
    const data = await res.json();
    setLog(Array.isArray(data) ? data : []);
    setLogLoading(false);
  };

  const handleAdd = async () => {
    if (!addForm.plate_number.trim()) return;
    setSaving(true);
    await fetch("/api/transport/vehicles", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cityId: city, companyId: companyId || "", listType: activeList, plateNumber: addForm.plate_number, driverName: addForm.driver_name, description: addForm.description, createdBy: currentUser?.name || "" }),
    });
    setAddForm({ plate_number: "", driver_name: "", description: "" });
    setShowAddForm(false); setSaving(false); fetchVehicles();
  };

  const logAction = async (vehicle: Vehicle, action: "entry" | "exit", note = "") => {
    const res = await fetch("/api/transport/log", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cityId: city, companyId: companyId || "", vehicleId: vehicle.id, plateNumber: vehicle.plate_number, driverName: vehicle.driver_name, listType: vehicle.list_type, action, loggedBy: currentUser?.name || "Неизвестно", loggedByRole: currentUser?.role || "", note }),
    });
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.error || "Ошибка сервера"); }
  };

  const handleEntry = async () => {
    if (!entryConfirm) return;
    setEntryLoading(true);
    try { await logAction(entryConfirm, "entry", entryNote); setEntryConfirm(null); setEntryNote(""); fetchVehicles(); }
    catch (e: any) { setActionError(e.message); }
    finally { setEntryLoading(false); }
  };

  const handleExit = async () => {
    if (!exitConfirm) return;
    setExitLoading(true);
    try { await logAction(exitConfirm, "exit"); setExitConfirm(null); fetchVehicles(); }
    catch (e: any) { setActionError(e.message); }
    finally { setExitLoading(false); }
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/transport/vehicles?id=${id}`, { method: "DELETE" });
    setDeleteConfirm(null); fetchVehicles();
  };

  const meta = LIST_META[activeList];
  const filtered = vehicles.filter(v => {
    if (!searchQuery) return true;
    const s = searchQuery.toLowerCase();
    return v.plate_number.toLowerCase().includes(s) || (v.driver_name?.toLowerCase().includes(s)) || (v.description?.toLowerCase().includes(s));
  });
  const onObject = filtered.filter(v => v.today_last_action === "entry").length;

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

        {/* ── Header ── */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: "#f0f0fa", letterSpacing: "-0.4px" }}>Транспорт</h2>
            <p style={{ fontSize: 12, color: "#404058", marginTop: 2 }}>Регистрация въездов и выездов</p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }}
              onClick={() => { setShowLog(true); fetchLog(); }}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 14, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "#606078", fontSize: 13, cursor: "pointer", fontWeight: 500 }}>
              📋 Журнал
            </motion.button>
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }}
              onClick={() => setShowAddForm(v => !v)}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", borderRadius: 14, background: showAddForm ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#f0f0fa", fontSize: 13, cursor: "pointer", fontWeight: 600 }}>
              + Добавить
            </motion.button>
          </div>
        </div>

        {/* ── List toggle pills ── */}
        <div style={{ display: "flex", gap: 8, background: "rgba(255,255,255,0.03)", borderRadius: 18, padding: 4 }}>
          {(["allowed", "working"] as ListType[]).map(lt => {
            const m = LIST_META[lt];
            const isActive = activeList === lt;
            return (
              <motion.button key={lt} whileTap={{ scale: 0.96 }}
                onClick={() => { setActiveList(lt); setShowAddForm(false); }}
                style={{
                  flex: 1, padding: "10px 16px", borderRadius: 14, border: "none",
                  background: isActive ? m.bg : "transparent",
                  color: isActive ? m.color : "#404058",
                  fontSize: 13, fontWeight: isActive ? 700 : 500, cursor: "pointer",
                  transition: "all 0.2s",
                  outline: isActive ? `1px solid ${m.color}33` : "none",
                }}>
                {m.icon} {m.label}
              </motion.button>
            );
          })}
        </div>

        {/* ── Search ── */}
        <div className="search-wrap">
          <input type="text" placeholder="Поиск по номеру или имени..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1.5px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "12px 16px 12px 42px", fontSize: 13, color: "#f0f0fa", outline: "none", transition: "border-color 0.2s" }}
            onFocus={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.18)"}
            onBlur={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"} />
          <div className="search-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg></div>
        </div>

        {/* ── Hint & stats ── */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 160, background: meta.bg, border: `1px solid ${meta.color}22`, borderRadius: 14, padding: "10px 14px", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 16 }}>🚗</span>
            <span style={{ fontSize: 12, color: "#606078" }}><span style={{ color: "#e0e0f0", fontWeight: 600 }}>Нажмите на авто</span> — зафиксировать въезд/выезд</span>
          </div>
          {!loading && filtered.length > 0 && (
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "10px 18px", display: "flex", gap: 16, alignItems: "center" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#f0f0fa" }}>{filtered.length}</div>
                <div style={{ fontSize: 10, color: "#404058" }}>Всего</div>
              </div>
              <div style={{ width: 1, height: 28, background: "rgba(255,255,255,0.06)" }} />
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#4ade80" }}>{onObject}</div>
                <div style={{ fontSize: 10, color: "#404058" }}>На объекте</div>
              </div>
            </div>
          )}
        </div>

          {/* ── Add form (modal) ── */}
          <AnimatePresence>
            {showAddForm && (
              <div style={{ position: "fixed", inset: 0, zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  onClick={() => setShowAddForm(false)}
                  style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }} />
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }} transition={{ type: "spring", stiffness: 340, damping: 28 }}
                  className="modal-mobile" style={{ position: "relative", background: "#13131a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 22, padding: "28px 24px", width: "100%", maxWidth: 520, zIndex: 1, boxShadow: "0 32px 80px rgba(0,0,0,0.7)" }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                    <div>
                      <h3 style={{ fontSize: 17, fontWeight: 700, color: "#f0f0fa", margin: 0 }}>Добавить · {LIST_META[activeList].label}</h3>
                      <p style={{ fontSize: 12, color: "#555570", margin: "4px 0 0" }}>Укажите данные транспортного средства</p>
                    </div>
                    <button onClick={() => setShowAddForm(false)} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#888" }}>
                      ✕
                    </button>
                  </div>
                  <div className="grid-cols-3" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 18 }}>
                    {[
                      { key: "plate_number", label: "Номер авто *", placeholder: "А123БВ 77" },
                      { key: "driver_name",  label: "Водитель",     placeholder: "ФИО" },
                      { key: "description",  label: "Описание",     placeholder: "Марка, цвет..." },
                    ].map(f => (
                      <div key={f.key}>
                        <label style={{ display: "block", fontSize: 10, color: "#404058", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, marginBottom: 6 }}>{f.label}</label>
                        <input placeholder={f.placeholder} value={(addForm as any)[f.key]} onChange={e => setAddForm({ ...addForm, [f.key]: e.target.value })}
                          style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1.5px solid rgba(255,255,255,0.08)", borderRadius: 13, padding: "11px 14px", fontSize: 13, color: "#f0f0fa", outline: "none", boxSizing: "border-box" }}
                          onFocus={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"}
                          onBlur={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"} />
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <motion.button whileTap={{ scale: 0.97 }} onClick={handleAdd} disabled={saving || !addForm.plate_number.trim()}
                      style={{ flex: 1, padding: "12px", background: "linear-gradient(135deg, #f0f0fa, #c8c8e0)", border: "none", borderRadius: 14, fontSize: 13, fontWeight: 700, color: "#0a0a14", cursor: "pointer", opacity: saving || !addForm.plate_number.trim() ? 0.4 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                      {saving && <Loader2 size={14} className="animate-spin" />} Добавить
                    </motion.button>
                    <motion.button whileTap={{ scale: 0.97 }} onClick={() => setShowAddForm(false)}
                      style={{ padding: "12px 20px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, fontSize: 13, color: "#606078", cursor: "pointer" }}>
                      Отмена
                    </motion.button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

        {/* ── Vehicle cards ── */}
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "48px 0" }}>
            <Loader2 className="animate-spin" size={28} style={{ color: "#404058" }} />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "56px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
            <div style={{ fontSize: 44, opacity: 0.3 }}>🚗</div>
            <div style={{ fontSize: 15, color: "#404058", fontWeight: 600 }}>В списке нет транспорта</div>
            <div style={{ fontSize: 12, color: "#303048" }}>Нажмите «Добавить» выше</div>
          </div>
        ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {filtered.map((v, i) => {
              const isInside = v.today_last_action === "entry";
              return (
                <motion.div key={v.id}
                  initial={{ opacity: 0, y: 12, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: i * 0.04, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="group">
                  <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.985 }}
                    onClick={() => { if (isInside) setExitConfirm(v); else setEntryConfirm(v); }}
                    style={{
                      background: isInside ? "rgba(74,222,128,0.07)" : "rgba(18,18,30,0.9)",
                      border: `1.5px solid ${isInside ? "rgba(74,222,128,0.22)" : "rgba(255,255,255,0.06)"}`,
                      borderRadius: 20, padding: "16px 18px", cursor: "pointer",
                      transition: "all 0.18s",
                    }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      {/* Icon */}
                      <div style={{
                        width: 50, height: 50, borderRadius: 16, flexShrink: 0,
                        background: isInside ? "rgba(74,222,128,0.15)" : "rgba(255,255,255,0.05)",
                        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
                      }}>🚗</div>

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 16, fontWeight: 800, color: "#f0f0fa", letterSpacing: "-0.2px" }}>{v.plate_number}</span>
                          <span style={{
                            fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 8,
                            background: isInside ? "rgba(74,222,128,0.15)" : "rgba(255,255,255,0.05)",
                            color: isInside ? "#4ade80" : "#404058",
                            border: `1px solid ${isInside ? "rgba(74,222,128,0.25)" : "rgba(255,255,255,0.07)"}`,
                          }}>{isInside ? "На объекте" : "Не на объекте"}</span>
                        </div>
                        <p style={{ fontSize: 12, color: "#505068", marginTop: 3 }}>
                          {v.driver_name && <span>{v.driver_name}</span>}
                          {v.driver_name && v.description && <span> · </span>}
                          {v.description && <span>{v.description}</span>}
                          {v.today_last_time && (
                            <span style={{ color: "#383855" }}> · {isInside ? "въехал" : "выехал"} в {new Date(v.today_last_time).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}</span>
                          )}
                        </p>
                      </div>

                      {/* Action button */}
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                        <div style={{
                          width: 40, height: 40, borderRadius: 13, display: "flex", alignItems: "center", justifyContent: "center",
                          background: isInside ? "rgba(239,68,68,0.1)" : "rgba(74,222,128,0.1)",
                          border: `1px solid ${isInside ? "rgba(239,68,68,0.25)" : "rgba(74,222,128,0.25)"}`,
                        }}>
                          {isInside
                            ? <ArrowLeftCircle size={18} style={{ color: "#f87171" }} />
                            : <ArrowRightCircle size={18} style={{ color: "#4ade80" }} />}
                        </div>
                        <motion.button whileTap={{ scale: 0.92 }}
                          onClick={e => { e.stopPropagation(); setDeleteConfirm(v.id); }}
                          style={{ width: 40, height: 40, borderRadius: 13, background: "transparent", border: "1px solid rgba(255,255,255,0.06)", color: "#383855", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}
                          onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,0.1)"; e.currentTarget.style.color = "#f87171"; e.currentTarget.style.borderColor = "rgba(239,68,68,0.2)"; }}
                          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#383855"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; }}>
                          <Trash2 size={15} />
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── MODAL: Въезд ── */}
      <AnimatePresence>
        {entryConfirm && (
          <div style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 20 }}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => !entryLoading && setEntryConfirm(null)}
              style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(12px)" }} />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
              style={{ position: "relative", zIndex: 10, background: "#12121e", border: "1.5px solid rgba(74,222,128,0.25)", borderRadius: 26, padding: "28px 24px", width: "100%", maxWidth: 360, textAlign: "center" }}>
              <div style={{ fontSize: 44, marginBottom: 12 }}>🚗</div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "#f0f0fa", marginBottom: 4 }}>Зафиксировать въезд?</h3>
              <div style={{ fontSize: 22, fontWeight: 900, color: "#f0f0fa", marginBottom: 4, letterSpacing: "-0.3px" }}>{entryConfirm.plate_number}</div>
              {entryConfirm.driver_name && <div style={{ fontSize: 13, color: "#505068", marginBottom: 16 }}>{entryConfirm.driver_name}</div>}
              <div style={{ marginBottom: 18, textAlign: "left" }}>
                <label style={{ display: "block", fontSize: 10, color: "#404058", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700, marginBottom: 6 }}>Заметка</label>
                <input value={entryNote} onChange={e => setEntryNote(e.target.value)} placeholder="Необязательно..."
                  style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1.5px solid rgba(255,255,255,0.08)", borderRadius: 13, padding: "11px 14px", fontSize: 13, color: "#f0f0fa", outline: "none" }} />
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setEntryConfirm(null)} disabled={entryLoading}
                  style={{ flex: 1, padding: "13px", borderRadius: 14, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "#606078", fontSize: 13, cursor: "pointer" }}>Отмена</button>
                <motion.button whileTap={{ scale: 0.96 }} onClick={handleEntry} disabled={entryLoading}
                  style={{ flex: 1, padding: "13px", borderRadius: 14, background: "rgba(74,222,128,0.15)", border: "1.5px solid rgba(74,222,128,0.3)", color: "#4ade80", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, opacity: entryLoading ? 0.6 : 1 }}>
                  {entryLoading ? <Loader2 size={14} className="animate-spin" /> : <ArrowRightCircle size={14} />} Въезд
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL: Выезд ── */}
      <AnimatePresence>
        {exitConfirm && (
          <div style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 20 }}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => !exitLoading && setExitConfirm(null)}
              style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(12px)" }} />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
              style={{ position: "relative", zIndex: 10, background: "#12121e", border: "2px solid rgba(239,68,68,0.4)", borderRadius: 26, padding: "28px 24px", width: "100%", maxWidth: 360, textAlign: "center", boxShadow: "0 0 40px rgba(239,68,68,0.15)" }}>
              <div style={{ fontSize: 44, marginBottom: 12 }}>🚨</div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "#f0f0fa", marginBottom: 4 }}>Подтвердить выезд</h3>
              <div style={{ fontSize: 22, fontWeight: 900, color: "#f0f0fa", marginBottom: 4 }}>{exitConfirm.plate_number}</div>
              {exitConfirm.driver_name && <div style={{ fontSize: 13, color: "#505068", marginBottom: 4 }}>{exitConfirm.driver_name}</div>}
              {exitConfirm.today_last_time && (
                <div style={{ fontSize: 12, color: "#383855", marginBottom: 18 }}>
                  Въехал в {new Date(exitConfirm.today_last_time).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                </div>
              )}
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setExitConfirm(null)} disabled={exitLoading}
                  style={{ flex: 1, padding: "13px", borderRadius: 14, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "#606078", fontSize: 13, cursor: "pointer" }}>Отмена</button>
                <motion.button whileTap={{ scale: 0.96 }} onClick={handleExit} disabled={exitLoading}
                  style={{ flex: 1, padding: "13px", borderRadius: 14, background: "linear-gradient(135deg, #ef4444, #c1121f)", border: "none", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, opacity: exitLoading ? 0.6 : 1 }}>
                  {exitLoading ? <Loader2 size={14} className="animate-spin" /> : <ArrowLeftCircle size={14} />} Выезд
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL: Журнал ── */}
      <AnimatePresence>
        {showLog && (
          <div style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 20 }}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowLog(false)}
              style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(12px)" }} />
            <motion.div initial={{ opacity: 0, y: 10, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.97 }} transition={{ type: "spring", stiffness: 300, damping: 28 }}
              style={{ position: "relative", zIndex: 10, background: "#0e0e1a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 28, width: "100%", maxWidth: 680, maxHeight: "88vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 22px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <div>
                  <h3 style={{ fontSize: 17, fontWeight: 700, color: "#f0f0fa" }}>Журнал транспорта</h3>
                  <p style={{ fontSize: 11, color: "#404058", marginTop: 2 }}>История въездов и выездов</p>
                </div>
                <button onClick={() => setShowLog(false)} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, width: 34, height: 34, color: "#606078", cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
              </div>
              <div style={{ padding: "16px 22px 18px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <input type="text" placeholder="Поиск в журнале..." value={logSearch} onChange={e => setLogSearch(e.target.value)}
                  style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1.5px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "13px 16px", fontSize: 14, color: "#f0f0fa", outline: "none" }} />
              </div>
                <div style={{ flex: 1, overflowY: "auto", padding: "18px 22px", display: "flex", flexDirection: "column", gap: 16 }}>
                {logLoading ? (
                  <div style={{ display: "flex", justifyContent: "center", padding: 40 }}><Loader2 className="animate-spin" size={24} style={{ color: "#404058" }} /></div>
                ) : log.length === 0 ? (
                  <div style={{ textAlign: "center", padding: 40, color: "#404058", fontSize: 14 }}>Журнал пуст</div>
                ) : (
                  log.filter(e => {
                    if (!logSearch) return true;
                    const s = logSearch.toLowerCase();
                    return e.plate_number.toLowerCase().includes(s) || (e.driver_name?.toLowerCase().includes(s)) || (e.logged_by?.toLowerCase().includes(s));
                  }).map((entry, i) => (
                    <motion.div key={entry.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.025 }}
                      style={{
                        display: "flex", alignItems: "center", gap: 12, padding: "13px 15px", borderRadius: 16,
                        background: entry.action === "entry" ? "rgba(74,222,128,0.05)" : "rgba(239,68,68,0.05)",
                        border: `1px solid ${entry.action === "entry" ? "rgba(74,222,128,0.12)" : "rgba(239,68,68,0.12)"}`,
                      }}>
                      <div style={{ width: 38, height: 38, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: entry.action === "entry" ? "rgba(74,222,128,0.12)" : "rgba(239,68,68,0.12)" }}>
                        {entry.action === "entry" ? <ArrowRightCircle size={17} style={{ color: "#4ade80" }} /> : <ArrowLeftCircle size={17} style={{ color: "#f87171" }} />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: "#f0f0fa" }}>{entry.plate_number}</span>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 7, background: entry.action === "entry" ? "rgba(74,222,128,0.12)" : "rgba(239,68,68,0.12)", color: entry.action === "entry" ? "#4ade80" : "#f87171" }}>
                            {entry.action === "entry" ? "въезд" : "выезд"}
                          </span>
                        </div>
                        <p style={{ fontSize: 11, color: "#505068", marginTop: 2 }}>
                          {entry.driver_name && <span>{entry.driver_name} · </span>}
                          <span style={{ color: "#606080" }}>{entry.logged_by}</span>
                          {entry.note && <span style={{ color: "#383855" }}> · {entry.note}</span>}
                        </p>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ fontSize: 12, color: "#505068" }}>{new Date(entry.logged_at).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" })}</div>
                        <div style={{ fontSize: 11, color: "#383855" }}>{new Date(entry.logged_at).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}</div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL: Удаление ── */}
      <AnimatePresence>
        {deleteConfirm && (
          <div style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 20 }}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDeleteConfirm(null)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(12px)" }} />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              style={{ position: "relative", zIndex: 10, background: "#12121e", border: "1.5px solid rgba(239,68,68,0.2)", borderRadius: 26, padding: "28px 24px", width: "100%", maxWidth: 340, textAlign: "center" }}>
              <div style={{ fontSize: 38, marginBottom: 12 }}>🗑️</div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "#f0f0fa", marginBottom: 6 }}>Удалить из списка?</h3>
              <p style={{ fontSize: 12, color: "#505068", marginBottom: 22 }}>Журнал событий сохранится.</p>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setDeleteConfirm(null)} style={{ flex: 1, padding: "13px", borderRadius: 14, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "#606078", fontSize: 13, cursor: "pointer" }}>Отмена</button>
                <motion.button whileTap={{ scale: 0.96 }} onClick={() => handleDelete(deleteConfirm)}
                  style={{ flex: 1, padding: "13px", borderRadius: 14, background: "rgba(239,68,68,0.12)", border: "1.5px solid rgba(239,68,68,0.25)", color: "#f87171", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Удалить</motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Toast ошибки ── */}
      <AnimatePresence>
        {actionError && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20 }}
            style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", zIndex: 60, background: "#ef4444", color: "white", fontSize: 13, fontWeight: 600, padding: "12px 20px", borderRadius: 16, boxShadow: "0 8px 32px rgba(239,68,68,0.4)", display: "flex", alignItems: "center", gap: 10, maxWidth: 320 }}>
            <span>⚠️ {actionError}</span>
            <button onClick={() => setActionError(null)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.7)", cursor: "pointer", fontSize: 18, lineHeight: 1 }}>×</button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
