"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, AlertTriangle, Loader2, Trash2, X } from "lucide-react";
import FileUpload from "@/components/FileUpload";

type Record = { id: string; data: { guard: string; violation: string; amount: number; status: string; notes?: string; }; files?: { id: string; url: string; file_name: string; file_type: string; file_size: number }[]; created_at: string; };

const statusColor = (s: string) => s === "paid" ? "text-emerald-400" : s === "disputed" ? "text-amber-400" : "text-red-400";
const statusLabel = (s: string) => s === "paid" ? "Оплачен" : s === "disputed" ? "Оспаривается" : "Ожидает";
const statusBg = (s: string) => s === "paid" ? "bg-emerald-500/10" : s === "disputed" ? "bg-amber-500/10" : "bg-red-500/10";

export default function FinesSection({ city, companyId }: { city: string; companyId?: string }) {
  const [records, setRecords] = useState<Record[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ guard: "", violation: "", amount: "", notes: "", status: "pending" });
  const [employees, setEmployees] = useState<{ id: string; name: string }[]>([]);
    const [saving, setSaving] = useState(false);
    const [pendingId, setPendingId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");


  useEffect(() => { fetchAll(); }, [city, companyId]);
  useEffect(() => {
    fetch("/api/users").then(r => r.json()).then(data => {
      if (Array.isArray(data)) setEmployees(data.map((u: any) => ({ id: u.id, name: u.name })));
    }).catch(() => {});
  }, []);

  async function fetchAll() {
    setLoading(true);
    const q = new URLSearchParams({ section: "fines" });
    if (city) q.set("cityId", city); if (companyId) q.set("companyId", companyId);
    const res = await fetch(`/api/records?${q}`);
    const data = await res.json();
    setRecords(Array.isArray(data) ? data : []); setLoading(false);
  }

  async function openForm() {
    const res = await fetch("/api/records", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cityId: city, companyId: companyId || "", section: "fines", data: {} }) });
    const rec = await res.json(); setPendingId(rec.id); setShowForm(true);
  }

  async function save() {
    if (!form.guard || !form.violation) return;
    setSaving(true);
    await fetch("/api/records", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: pendingId, data: { ...form, amount: Number(form.amount) } }) });
    setForm({ guard: "", violation: "", amount: "", notes: "", status: "pending" });
    setPendingId(null); setShowForm(false); setSaving(false); fetchAll();
  }

  async function cancelForm() {
    if (pendingId) await fetch(`/api/records?id=${pendingId}`, { method: "DELETE" });
    setPendingId(null); setShowForm(false); setForm({ guard: "", violation: "", amount: "", notes: "", status: "pending" });
  }

  async function remove(id: string) { await fetch(`/api/records?id=${id}`, { method: "DELETE" }); fetchAll(); }

  const filteredRecords = records.filter(r => {
    if (!searchQuery) return true;
    const s = searchQuery.toLowerCase();
    return r.data.guard?.toLowerCase().includes(s) || 
           r.data.violation?.toLowerCase().includes(s) || 
           r.data.notes?.toLowerCase().includes(s) || 
           statusLabel(r.data.status).toLowerCase().includes(s);
  });

  return (
    <div className="flex flex-col gap-8">
      <div className="pb-5 border-b border-white/6">
        <h2 className="text-lg sm:text-xl font-semibold text-white">Штрафы за нарушение</h2>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <div className="search-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg></div>
            <input 
              type="text"
              placeholder="Поиск по ФИО, нарушению или примечаниям..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 16, padding: "12px 16px 12px 50px", fontSize: 13, color: "#f0f0fa", outline: "none", transition: "border-color 0.2s" }}
              onFocus={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)"}
              onBlur={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)"}
            />
        </div>
        <motion.button onClick={openForm} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }} transition={{ type: "spring", stiffness: 500, damping: 20 }}
          className="flex items-center gap-2 px-5 py-4 rounded-2xl text-sm font-semibold border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white transition-all whitespace-nowrap flex-shrink-0">
          <Plus size={15} strokeWidth={2.5} />
          Добавить
        </motion.button>
      </div>

      <AnimatePresence>
        {showForm && (
          <div style={{ position: "fixed", inset: 0, zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={cancelForm}
              style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }} />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }} transition={{ type: "spring", stiffness: 340, damping: 28 }}
              className="modal-mobile" style={{ position: "relative", background: "#13131a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 22, padding: "28px 24px", width: "100%", maxWidth: 540, maxHeight: "90vh", overflowY: "auto", zIndex: 1, boxShadow: "0 32px 80px rgba(0,0,0,0.7)" }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                <div>
                  <h3 style={{ fontSize: 17, fontWeight: 700, color: "#f0f0fa", margin: 0 }}>Новый штраф</h3>
                  <p style={{ fontSize: 12, color: "#555570", margin: "4px 0 0" }}>Укажите данные нарушения</p>
                </div>
                <button onClick={cancelForm} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#888" }}>
                  <X size={16} />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" style={{ marginBottom: 16 }}>
                <div className="space-y-1.5">
                  <label className="text-[10px] text-white/40 uppercase tracking-widest font-medium">Охранник</label>
                  {employees.length > 0 ? (
                    <select value={form.guard} onChange={e => setForm({ ...form, guard: e.target.value })}
                      className="w-full bg-white/4 border border-white/8 focus:border-white/25 text-white rounded-xl px-5 py-4 text-[15px] outline-none transition-all cursor-pointer">
                      <option value="" className="bg-[#0a0a0f]">— Выберите —</option>
                      {employees.map(e => <option key={e.id} value={e.name} className="bg-[#0a0a0f]">{e.name}</option>)}
                    </select>
                  ) : (
                    <input placeholder="ФИО охранника" value={form.guard} onChange={e => setForm({ ...form, guard: e.target.value })}
                      className="w-full bg-white/4 border border-white/8 focus:border-white/25 text-white rounded-xl px-5 py-4 text-[15px] placeholder-white/20 outline-none transition-all" />
                  )}
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] text-white/40 uppercase tracking-widest font-medium">Нарушение</label>
                  <input placeholder="Описание нарушения" value={form.violation} onChange={e => setForm({ ...form, violation: e.target.value })}
                    className="w-full bg-white/4 border border-white/8 focus:border-white/25 text-white rounded-xl px-5 py-4 text-[15px] placeholder-white/20 outline-none transition-all" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] text-white/40 uppercase tracking-widest font-medium">Сумма (руб)</label>
                  <input type="number" min="0" placeholder="5000" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })}
                    className="w-full bg-white/4 border border-white/8 focus:border-white/25 text-white rounded-xl px-5 py-4 text-[15px] placeholder-white/20 outline-none transition-all" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] text-white/40 uppercase tracking-widest font-medium">Статус</label>
                  <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                    className="w-full bg-white/4 border border-white/8 focus:border-white/25 text-white rounded-xl px-5 py-4 text-[15px] outline-none transition-all appearance-none cursor-pointer">
                    <option value="pending" className="bg-[#0a0a0f]">Ожидает</option>
                    <option value="disputed" className="bg-[#0a0a0f]">Оспаривается</option>
                    <option value="paid" className="bg-[#0a0a0f]">Оплачен</option>
                  </select>
                </div>
                <div className="space-y-1.5 col-span-2">
                  <label className="text-[10px] text-white/40 uppercase tracking-widest font-medium">Примечания</label>
                  <input placeholder="Доп. информация" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                    className="w-full bg-white/4 border border-white/8 focus:border-white/25 text-white rounded-xl px-5 py-4 text-[15px] placeholder-white/20 outline-none transition-all" />
                </div>
              </div>
              <FileUpload recordId={pendingId || undefined} companyId={companyId} files={[]} />
              <div className="flex gap-2 pt-4">
                <motion.button onClick={save} disabled={saving} whileHover={{ scale: saving ? 1 : 1.02 }} whileTap={{ scale: saving ? 1 : 0.97 }}
                  className="flex-1 py-4 bg-white text-black rounded-2xl text-[15px] font-semibold flex items-center justify-center gap-2 hover:bg-white/90 transition-all">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : null} Сохранить запись
                </motion.button>
                <motion.button onClick={cancelForm} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  className="px-5 py-4 bg-white/4 border border-white/8 text-white/50 rounded-2xl text-[15px] hover:text-white/80 transition-all">Отмена</motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-white/20" size={28} /></div>
      ) : filteredRecords.length === 0 ? (
        <div className="text-center py-14 text-white/20 flex flex-col items-center gap-3">
          <AlertTriangle size={36} className="opacity-30" />
          <span className="text-sm">Штрафов не найдено</span>
        </div>
      ) : (
            <div className="flex flex-col gap-4">
                {filteredRecords.map((r, i) => (
                <motion.div key={r.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: i * 0.04 }}
                  className="bg-white/[0.035] border border-white/8 hover:border-white/15 rounded-2xl p-6 sm:p-7 group transition-all"
                  style={{ boxShadow: "0 1px 0 rgba(255,255,255,0.04)" }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center flex-shrink-0"><AlertTriangle size={16} className="text-red-400" /></div>
                  <div className="min-w-0">
                    <p className="text-white text-sm font-medium truncate">{r.data.guard}</p>
                    <p className="text-white/30 text-xs truncate">{r.data.violation}{r.data.amount ? ` · ${r.data.amount.toLocaleString()} руб.` : ""}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-lg ${statusBg(r.data.status)} ${statusColor(r.data.status)}`}>{statusLabel(r.data.status)}</span>
                  <button onClick={() => remove(r.id)} className="opacity-40 group-hover:opacity-100 text-white/20 hover:text-red-400 transition-all"><Trash2 size={14} /></button>
                </div>
              </div>
              {r.files && r.files.length > 0 && (
                <div className="flex gap-2 mt-3 flex-wrap">
                  {r.files.map(f => f.file_type?.startsWith("image/") ? (
                    <a key={f.id} href={f.url} target="_blank" rel="noreferrer"><img src={f.url} alt={f.file_name} className="w-14 h-14 rounded-xl object-cover border border-white/10 hover:border-white/30 transition-all" /></a>
                  ) : <a key={f.id} href={f.url} target="_blank" rel="noreferrer" className="w-14 h-14 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[10px] text-white/40 hover:border-white/30 transition-all">видео</a>)}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
