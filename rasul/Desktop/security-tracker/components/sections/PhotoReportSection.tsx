"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Camera, Loader2, Trash2, X } from "lucide-react";
import FileUpload from "@/components/FileUpload";

type Record = { id: string; data: { violation_type: string; description?: string; location?: string; }; files?: { id: string; url: string; file_name: string; file_type: string; file_size: number }[]; created_at: string; };

const VIOLATION_TYPES = ["Парковка", "Вандализм", "Нарушение порядка", "Посторонние лица", "Пожарная безопасность", "Другое"];

export default function PhotoReportSection({ city, companyId }: { city: string; companyId?: string }) {
  const [records, setRecords] = useState<Record[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ violation_type: VIOLATION_TYPES[0], description: "", location: "" });
  const [saving, setSaving] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);

  useEffect(() => { fetchAll(); }, [city, companyId]);

  async function fetchAll() {
    setLoading(true);
    const q = new URLSearchParams({ section: "photo" });
    if (city) q.set("cityId", city); if (companyId) q.set("companyId", companyId);
    const res = await fetch(`/api/records?${q}`);
    const data = await res.json();
    setRecords(Array.isArray(data) ? data : []); setLoading(false);
  }

  async function openForm() {
    const res = await fetch("/api/records", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cityId: city, companyId: companyId || "", section: "photo", data: {} }) });
    const rec = await res.json(); setPendingId(rec.id); setShowForm(true);
  }

  async function save() {
    setSaving(true);
    await fetch("/api/records", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: pendingId, data: form }) });
    setForm({ violation_type: VIOLATION_TYPES[0], description: "", location: "" });
    setPendingId(null); setShowForm(false); setSaving(false); fetchAll();
  }

  async function cancelForm() {
    if (pendingId) await fetch(`/api/records?id=${pendingId}`, { method: "DELETE" });
    setPendingId(null); setShowForm(false); setForm({ violation_type: VIOLATION_TYPES[0], description: "", location: "" });
  }

  async function remove(id: string) { await fetch(`/api/records?id=${id}`, { method: "DELETE" }); fetchAll(); }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between gap-3 pb-4 border-b border-white/6">
        <h2 className="text-lg sm:text-xl font-semibold text-white truncate">Фото отчёт / Нарушение</h2>
        <motion.button onClick={openForm} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }} transition={{ type: "spring", stiffness: 500, damping: 20 }}
          className="flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-2xl text-sm font-semibold border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white transition-all">
          <Plus size={15} strokeWidth={2.5} /><span>Добавить</span>
        </motion.button>
      </div>

      {/* Modal Form */}
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
                  <h3 style={{ fontSize: 17, fontWeight: 700, color: "#f0f0fa", margin: 0 }}>Новое нарушение</h3>
                  <p style={{ fontSize: 12, color: "#555570", margin: "4px 0 0" }}>Укажите тип и место нарушения</p>
                </div>
                <button onClick={cancelForm} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#888" }}>
                  <X size={16} />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" style={{ marginBottom: 16 }}>
                <div className="space-y-1.5">
                  <label className="text-[10px] text-white/40 uppercase tracking-widest font-medium">Тип нарушения</label>
                  <select value={form.violation_type} onChange={e => setForm({ ...form, violation_type: e.target.value })}
                    className="w-full bg-white/4 border border-white/8 focus:border-white/25 text-white rounded-xl px-4 py-3 text-sm outline-none transition-all appearance-none cursor-pointer">
                    {VIOLATION_TYPES.map(t => <option key={t} className="bg-[#0a0a0f]">{t}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] text-white/40 uppercase tracking-widest font-medium">Место</label>
                  <input placeholder="Укажите место" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })}
                    className="w-full bg-white/4 border border-white/8 focus:border-white/25 text-white rounded-xl px-4 py-3 text-sm placeholder-white/20 outline-none transition-all" />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <label className="text-[10px] text-white/40 uppercase tracking-widest font-medium">Описание</label>
                  <textarea placeholder="Подробное описание нарушения" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3}
                    className="w-full bg-white/4 border border-white/8 focus:border-white/25 text-white rounded-xl px-4 py-3 text-sm placeholder-white/20 outline-none transition-all resize-none" />
                </div>
              </div>
              <FileUpload recordId={pendingId || undefined} files={[]} />
              <div className="flex gap-2 pt-4">
                <motion.button onClick={save} disabled={saving} whileHover={{ scale: saving ? 1 : 1.02 }} whileTap={{ scale: saving ? 1 : 0.97 }}
                  className="flex-1 py-3 bg-white text-black rounded-xl text-sm font-semibold flex items-center justify-center gap-2 hover:bg-white/90 transition-all">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : null} Сохранить запись
                </motion.button>
                <motion.button onClick={cancelForm} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  className="px-5 py-3 bg-white/4 border border-white/8 text-white/50 rounded-xl text-sm hover:text-white/80 transition-all">Отмена</motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {loading ? <div className="flex justify-center py-12"><Loader2 className="animate-spin text-white/20" size={28} /></div>
        : records.length === 0 ? <div className="text-center py-14 text-white/20 flex flex-col items-center gap-3"><Camera size={36} className="opacity-30" /><span className="text-sm">Нарушений нет</span></div>
          : <div className="flex flex-col gap-4">{records.map((r, i) => (
            <motion.div key={r.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: i * 0.04 }}
              className="bg-white/[0.035] border border-white/8 hover:border-white/15 rounded-2xl p-3.5 sm:p-4 group transition-all"
              style={{ boxShadow: "0 1px 0 rgba(255,255,255,0.04)" }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-9 h-9 rounded-xl bg-orange-500/10 flex items-center justify-center flex-shrink-0"><Camera size={16} className="text-orange-400" /></div>
                  <div className="min-w-0">
                    <p className="text-white text-sm font-medium truncate">{r.data.violation_type}</p>
                    <p className="text-white/30 text-xs truncate">{r.data.location}{r.data.description ? ` · ${r.data.description}` : ""}</p>
                  </div>
                </div>
                <button onClick={() => remove(r.id)} className="opacity-40 group-hover:opacity-100 text-white/20 hover:text-red-400 transition-all ml-2"><Trash2 size={14} /></button>
              </div>
              {r.files && r.files.length > 0 && (
                <div className="flex gap-2 mt-3 flex-wrap">
                  {r.files.map(f => f.file_type?.startsWith("image/") ? (
                    <a key={f.id} href={f.url} target="_blank" rel="noreferrer"><img src={f.url} alt={f.file_name} className="w-14 h-14 rounded-xl object-cover border border-white/10 hover:border-white/30 transition-all" /></a>
                  ) : <a key={f.id} href={f.url} target="_blank" rel="noreferrer" className="w-14 h-14 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[10px] text-white/40 hover:border-white/30 transition-all">видео</a>)}
                </div>
              )}
            </motion.div>
          ))}</div>}
    </div>
  );
}
