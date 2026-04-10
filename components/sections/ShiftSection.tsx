"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, RefreshCw, Loader2, Trash2, Search, User, ArrowRight, FileText, X } from "lucide-react";
import FileUpload from "@/components/FileUpload";

type ShiftRecord = { id: string; data: { outgoing: string; incoming: string; status: string; notes?: string; }; files?: { id: string; url: string; file_name: string; file_type: string; file_size: number }[]; created_at: string; };

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  pending:     { label: "Ожидает",   color: "text-slate-400",   bg: "bg-slate-500/10 border border-slate-500/20",   dot: "bg-slate-400" },
  in_progress: { label: "В процессе", color: "text-amber-400",  bg: "bg-amber-500/10 border border-amber-500/20",   dot: "bg-amber-400" },
  completed:   { label: "Принята",   color: "text-emerald-400", bg: "bg-emerald-500/10 border border-emerald-500/20", dot: "bg-emerald-400" },
};

export default function ShiftSection({ city, companyId }: { city: string; companyId?: string }) {
  const [records, setRecords] = useState<ShiftRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ outgoing: "", incoming: "", notes: "", status: "pending" });
  const [employees, setEmployees] = useState<{ id: string; name: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => { fetchAll(); }, [city, companyId]);
  useEffect(() => {
    fetch("/api/users").then(r => r.json()).then(data => {
      if (Array.isArray(data)) setEmployees(data.map((u: any) => ({ id: u.id, name: u.name })));
    }).catch(() => {});
  }, []);

  async function fetchAll() {
    setLoading(true);
    const q = new URLSearchParams({ section: "shift" });
    if (city) q.set("cityId", city);
    if (companyId) q.set("companyId", companyId);
    const res = await fetch(`/api/records?${q}`);
    const data = await res.json();
    setRecords(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  async function openForm() {
    const res = await fetch("/api/records", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cityId: city, companyId: companyId || "", section: "shift", data: {} }) });
    const rec = await res.json();
    setPendingId(rec.id);
    setShowForm(true);
  }

  async function save() {
    if (!form.outgoing || !form.incoming) return;
    setSaving(true);
    await fetch("/api/records", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: pendingId, data: form }) });
    setForm({ outgoing: "", incoming: "", notes: "", status: "pending" });
    setPendingId(null); setShowForm(false); setSaving(false); fetchAll();
  }

  async function cancelForm() {
    if (pendingId) await fetch(`/api/records?id=${pendingId}`, { method: "DELETE" });
    setPendingId(null); setShowForm(false); setForm({ outgoing: "", incoming: "", notes: "", status: "pending" });
  }

  async function remove(id: string) {
    await fetch(`/api/records?id=${id}`, { method: "DELETE" });
    setDeleteConfirm(null);
    fetchAll();
  }

  const filteredRecords = records.filter(r => {
    if (!searchQuery) return true;
    const s = searchQuery.toLowerCase();
    return r.data.outgoing?.toLowerCase().includes(s) ||
           r.data.incoming?.toLowerCase().includes(s) ||
           r.data.notes?.toLowerCase().includes(s) ||
           STATUS_CONFIG[r.data.status]?.label.toLowerCase().includes(s);
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 pb-5 border-b border-white/6">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold text-white">Приём и сдача смен</h2>
          {records.length > 0 && (
            <p className="text-xs text-white/30 mt-1">{records.length} {records.length === 1 ? "запись" : records.length < 5 ? "записи" : "записей"}</p>
          )}
        </div>
        <motion.button onClick={openForm} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }} transition={{ type: "spring", stiffness: 500, damping: 20 }}
          className="flex items-center gap-2 px-7 py-3.5 rounded-2xl text-[15px] font-semibold border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white transition-all">
          <Plus size={15} strokeWidth={2.5} /><span>Добавить</span>
        </motion.button>
      </div>

      {/* Search */}
      <div className="search-wrap">
        <div className="search-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg></div>
        <input className="search-input" type="text" placeholder="Поиск по ФИО или примечаниям..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
      </div>

      {/* Modal Form */}
      <AnimatePresence>
        {showForm && (
            <div style={{ position: "fixed", inset: 0, zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={cancelForm}
                style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }} />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }} transition={{ type: "spring", stiffness: 340, damping: 28 }}
                className="modal-content"
                style={{ position: "relative", background: "#13131a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 22, padding: "28px 24px", width: "100%", maxWidth: 540, maxHeight: "90vh", overflowY: "auto", zIndex: 1, boxShadow: "0 32px 80px rgba(0,0,0,0.7)" }}
              >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                <div>
                  <h3 style={{ fontSize: 17, fontWeight: 700, color: "#f0f0fa", margin: 0 }}>Новая запись смены</h3>
                  <p style={{ fontSize: 12, color: "#555570", margin: "4px 0 0" }}>Укажите сдающего и принимающего</p>
                </div>
                <button onClick={cancelForm} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#888" }}>
                  <X size={16} />
                </button>
              </div>
                <div className="grid grid-cols-2 sm:grid-cols-2 gap-4" style={{ marginBottom: 16 }}>
                <div className="space-y-2">
                  <label className="flex items-center gap-1.5 text-[10px] text-white/35 uppercase tracking-widest font-medium"><User size={10} /> Сдаёт смену</label>
                  {employees.length > 0 ? (
                    <select value={form.outgoing} onChange={e => setForm({ ...form, outgoing: e.target.value })}
                      className="w-full bg-white/5 border border-white/8 focus:border-white/25 text-white rounded-xl px-5 py-4 text-[15px] outline-none transition-all cursor-pointer">
                      <option value="" className="bg-[#0a0a0f]">— Выберите —</option>
                      {employees.map(e => <option key={e.id} value={e.name} className="bg-[#0a0a0f]">{e.name}</option>)}
                    </select>
                  ) : (
                    <input placeholder="ФИО охранника" value={form.outgoing} onChange={e => setForm({ ...form, outgoing: e.target.value })}
                      className="w-full bg-white/5 border border-white/8 focus:border-white/25 text-white rounded-xl px-5 py-4 text-[15px] placeholder-white/20 outline-none transition-all" />
                  )}
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-1.5 text-[10px] text-white/35 uppercase tracking-widest font-medium"><User size={10} /> Принимает смену</label>
                  {employees.length > 0 ? (
                    <select value={form.incoming} onChange={e => setForm({ ...form, incoming: e.target.value })}
                      className="w-full bg-white/5 border border-white/8 focus:border-white/25 text-white rounded-xl px-5 py-4 text-[15px] outline-none transition-all cursor-pointer">
                      <option value="" className="bg-[#0a0a0f]">— Выберите —</option>
                      {employees.map(e => <option key={e.id} value={e.name} className="bg-[#0a0a0f]">{e.name}</option>)}
                    </select>
                  ) : (
                    <input placeholder="ФИО охранника" value={form.incoming} onChange={e => setForm({ ...form, incoming: e.target.value })}
                      className="w-full bg-white/5 border border-white/8 focus:border-white/25 text-white rounded-xl px-5 py-4 text-[15px] placeholder-white/20 outline-none transition-all" />
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] text-white/35 uppercase tracking-widest font-medium block">Статус</label>
                  <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                    className="w-full bg-white/5 border border-white/8 focus:border-white/25 text-white rounded-xl px-5 py-4 text-[15px] outline-none transition-all appearance-none cursor-pointer">
                    <option value="pending" className="bg-[#0a0a0f]">Ожидает</option>
                    <option value="in_progress" className="bg-[#0a0a0f]">В процессе</option>
                    <option value="completed" className="bg-[#0a0a0f]">Принята</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-1.5 text-[10px] text-white/35 uppercase tracking-widest font-medium"><FileText size={10} /> Примечания</label>
                  <input placeholder="Доп. информация" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                    className="w-full bg-white/5 border border-white/8 focus:border-white/25 text-white rounded-xl px-5 py-4 text-[15px] placeholder-white/20 outline-none transition-all" />
                </div>
              </div>
              <FileUpload recordId={pendingId || undefined} companyId={companyId} files={[]} />
              <div className="flex gap-2 pt-4">
                <motion.button onClick={save} disabled={saving} whileHover={{ scale: saving ? 1 : 1.02 }} whileTap={{ scale: saving ? 1 : 0.97 }}
                  className="flex-1 py-4 bg-white text-black rounded-2xl text-[15px] font-semibold flex items-center justify-center gap-2 hover:bg-white/90 transition-all disabled:opacity-50">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : null} Сохранить запись
                </motion.button>
                <motion.button onClick={cancelForm} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  className="px-6 py-4 bg-white/4 border border-white/8 text-white/50 rounded-2xl text-[15px] hover:text-white/80 transition-all">Отмена</motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-14"><Loader2 className="animate-spin text-white/20" size={28} /></div>
      ) : filteredRecords.length === 0 ? (
        <div className="text-center py-16 flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-white/4 flex items-center justify-center">
            <RefreshCw size={24} className="text-white/20" />
          </div>
          <span className="text-sm text-white/25">{searchQuery ? "Ничего не найдено" : "Смен не найдено"}</span>
        </div>
      ) : (
        <div className="flex flex-col gap-4 mt-4">
            {filteredRecords.map((r, i) => {
              const cfg = STATUS_CONFIG[r.data.status] || STATUS_CONFIG.pending;
              return (
                <motion.div key={r.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: i * 0.04 }}
                  className="group bg-white/[0.035] hover:bg-white/[0.06] border border-white/8 hover:border-white/15 rounded-2xl transition-all"
                  style={{ boxShadow: "0 1px 0 rgba(255,255,255,0.04)" }}>
                <div className="p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 min-w-0 flex-1">
                      <div className="w-11 h-11 rounded-2xl bg-teal-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <RefreshCw size={18} className="text-teal-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-white text-sm font-semibold">{r.data.outgoing || "—"}</span>
                          <ArrowRight size={13} className="text-white/20 flex-shrink-0" />
                          <span className="text-white text-sm font-semibold">{r.data.incoming || "—"}</span>
                        </div>
                        {r.data.notes && (
                          <p className="text-white/35 text-xs mt-1.5 flex items-center gap-1.5">
                            <FileText size={10} className="text-white/20 flex-shrink-0" />
                            {r.data.notes}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
                      <span className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg ${cfg.bg} ${cfg.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                        {cfg.label}
                      </span>
                      {deleteConfirm === r.id ? (
                        <div className="flex items-center gap-1">
                          <button onClick={() => remove(r.id)} className="text-[11px] px-2.5 py-1 rounded-lg bg-red-500/15 text-red-400 border border-red-500/20 hover:bg-red-500/25 transition-all">Удалить</button>
                          <button onClick={() => setDeleteConfirm(null)} className="text-[11px] px-2.5 py-1 rounded-lg bg-white/5 text-white/40 border border-white/8 hover:bg-white/10 transition-all">Нет</button>
                        </div>
                      ) : (
                        <button onClick={() => setDeleteConfirm(r.id)} className="opacity-40 group-hover:opacity-100 text-white/20 hover:text-red-400 transition-all p-1">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                  {r.files && r.files.length > 0 && (
                    <div className="flex gap-3 mt-4 pt-4 border-t border-white/5 flex-wrap">
                      {r.files.map(f => f.file_type?.startsWith("image/") ? (
                        <a key={f.id} href={f.url} target="_blank" rel="noreferrer">
                          <img src={f.url} alt={f.file_name} className="w-14 h-14 rounded-xl object-cover border border-white/10 hover:border-white/30 transition-all" />
                        </a>
                      ) : (
                        <a key={f.id} href={f.url} target="_blank" rel="noreferrer"
                          className="w-14 h-14 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[10px] text-white/40 hover:border-white/30 transition-all">файл</a>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
