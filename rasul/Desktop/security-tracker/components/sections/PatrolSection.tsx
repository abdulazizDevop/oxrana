"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, MapPin, Loader2, Trash2, ChevronDown, Clock, CheckCircle2, Circle, X } from "lucide-react";
import FileUpload from "@/components/FileUpload";

type Record = {
  id: string;
  data: { guard: string; area: string; status: string; notes?: string };
  files?: { id: string; url: string; file_name: string; file_type: string; file_size: number }[];
  created_at: string;
};

const STATUS = {
  pending:     { label: "Ожидает",   color: "text-slate-400",   bg: "bg-slate-500/10",   border: "border-slate-500/20",   dot: "bg-slate-500",   Icon: Circle },
  in_progress: { label: "В обходе",  color: "text-amber-400",   bg: "bg-amber-500/10",   border: "border-amber-500/20",   dot: "bg-amber-400",   Icon: Clock },
  completed:   { label: "Завершён",  color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", dot: "bg-emerald-400", Icon: CheckCircle2 },
} as const;

function statusKey(s: string): keyof typeof STATUS {
  return (s in STATUS ? s : "pending") as keyof typeof STATUS;
}

export default function PatrolSection({ city, companyId }: { city: string; companyId?: string }) {
  const [records, setRecords] = useState<Record[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ guard: "", area: "", notes: "", status: "pending" });
  const [saving, setSaving] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<{ id: string; url: string; fileName: string; fileType: string; fileSize: number }[]>([]);
  const [pendingRecordId, setPendingRecordId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => { fetchAll(); }, [city, companyId]);

  async function fetchAll() {
    setLoading(true);
    const q = new URLSearchParams({ section: "patrol" });
    if (city) q.set("cityId", city);
    if (companyId) q.set("companyId", companyId);
    const res = await fetch(`/api/records?${q}`);
    const data = await res.json();
    setRecords(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  async function openForm() {
    const res = await fetch("/api/records", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cityId: city, companyId: companyId || "", section: "patrol", data: {} }),
    });
    const rec = await res.json();
    setPendingRecordId(rec.id);
    setShowForm(true);
  }

  async function save() {
    if (!form.guard || !form.area) return;
    setSaving(true);
    await fetch("/api/records", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: pendingRecordId, data: form }),
    });
    setForm({ guard: "", area: "", notes: "", status: "pending" });
    setUploadedFiles([]);
    setPendingRecordId(null);
    setShowForm(false);
    setSaving(false);
    fetchAll();
  }

  async function cancelForm() {
    if (pendingRecordId) await fetch(`/api/records?id=${pendingRecordId}`, { method: "DELETE" });
    setPendingRecordId(null);
    setShowForm(false);
    setForm({ guard: "", area: "", notes: "", status: "pending" });
    setUploadedFiles([]);
  }

  async function remove(id: string) {
    await fetch(`/api/records?id=${id}`, { method: "DELETE" });
    fetchAll();
  }

  const filtered = records.filter(r => {
    if (!searchQuery) return true;
    const s = searchQuery.toLowerCase();
    return (
      r.data.guard?.toLowerCase().includes(s) ||
      r.data.area?.toLowerCase().includes(s) ||
      r.data.notes?.toLowerCase().includes(s) ||
      STATUS[statusKey(r.data.status)].label.toLowerCase().includes(s)
    );
  });

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 pb-4 border-b border-white/6">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Обходы по территории</h2>
          <p className="text-xs text-white/30 mt-1">{records.length} записей</p>
        </div>
        <motion.button
          onClick={openForm}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: "spring", stiffness: 500, damping: 20 }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-semibold border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white transition-all flex-shrink-0"
        >
          <Plus size={15} strokeWidth={2.5} />
          <span>Добавить</span>
        </motion.button>
      </div>

      {/* Search */}
      <div className="search-wrap">
        <div className="search-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg></div>
        <input
          type="text"
          placeholder="Поиск по охраннику, маршруту или примечаниям..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 16, padding: "12px 16px 12px 50px", fontSize: 13, color: "#f0f0fa", outline: "none", transition: "border-color 0.2s" }}
          onFocus={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)"}
          onBlur={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)"}
        />
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
                className="modal-mobile"
                style={{ position: "relative", background: "#13131a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 22, padding: "28px 24px", width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto", zIndex: 1, boxShadow: "0 32px 80px rgba(0,0,0,0.7)" }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                  <div>
                    <h3 style={{ fontSize: 17, fontWeight: 700, color: "#f0f0fa", margin: 0 }}>Новый обход</h3>
                    <p style={{ fontSize: 12, color: "#555570", margin: "4px 0 0" }}>Заполните данные обхода</p>
                  </div>
                  <button onClick={cancelForm} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#888" }}>
                    <X size={16} />
                  </button>
                </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" style={{ marginBottom: 16 }}>
                {[
                  { label: "Охранник", key: "guard", placeholder: "Имя охранника" },
                  { label: "Территория / маршрут", key: "area", placeholder: "Укажите маршрут" },
                  { label: "Примечания", key: "notes", placeholder: "Доп. информация" },
                ].map(f => (
                  <div key={f.key} className="space-y-1.5">
                    <label className="text-[10px] text-white/35 uppercase tracking-widest font-medium">{f.label}</label>
                    <input
                      placeholder={f.placeholder}
                      value={(form as any)[f.key]}
                      onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                      className="w-full bg-white/[0.04] border border-white/8 focus:border-white/25 text-white rounded-xl px-4 py-3 text-sm placeholder-white/20 outline-none transition-all"
                    />
                  </div>
                ))}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-white/35 uppercase tracking-widest font-medium">Статус</label>
                  <select
                    value={form.status}
                    onChange={e => setForm({ ...form, status: e.target.value })}
                    className="w-full bg-white/[0.04] border border-white/8 focus:border-white/25 text-white rounded-xl px-4 py-3 text-sm outline-none transition-all appearance-none cursor-pointer"
                  >
                    <option value="pending" className="bg-[#0a0a0f]">Ожидает</option>
                    <option value="in_progress" className="bg-[#0a0a0f]">В обходе</option>
                    <option value="completed" className="bg-[#0a0a0f]">Завершён</option>
                  </select>
                </div>
              </div>
              <FileUpload recordId={pendingRecordId || undefined} files={[]} onUpload={f => setUploadedFiles(p => [...p, f])} />
              <div className="flex gap-2 pt-4">
                <motion.button
                  onClick={save} disabled={saving}
                  whileHover={{ scale: saving ? 1 : 1.02 }} whileTap={{ scale: saving ? 1 : 0.97 }}
                  className="flex-1 py-3 bg-white text-black rounded-xl text-sm font-semibold flex items-center justify-center gap-2 hover:bg-white/90 transition-all disabled:opacity-50"
                >
                  {saving && <Loader2 size={14} className="animate-spin" />}
                  Сохранить запись
                </motion.button>
                <motion.button
                  onClick={cancelForm}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  className="px-5 py-3 bg-white/[0.04] border border-white/8 text-white/50 rounded-xl text-sm hover:text-white/80 transition-all"
                >
                  Отмена
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-white/20" size={28} /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/6 flex items-center justify-center">
            <MapPin size={22} className="text-white/20" />
          </div>
          <p className="text-sm text-white/25">Обходов не найдено</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4 px-1">
          {filtered.map((r, i) => {
            const sk = statusKey(r.data.status);
            const st = STATUS[sk];
            const isExpanded = expandedId === r.id;
            const hasFiles = r.files && r.files.length > 0;
            const hasNotes = !!r.data.notes;

            return (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: i * 0.04 }}
                className={`bg-white/[0.035] border rounded-2xl overflow-hidden transition-all group ${isExpanded ? "border-white/12" : "border-white/8 hover:border-white/15"}`}
                style={{ boxShadow: "0 1px 0 rgba(255,255,255,0.04)" }}
              >
                <div
                  className="flex items-center gap-4 p-5 cursor-pointer select-none"
                  onClick={() => setExpandedId(isExpanded ? null : r.id)}
                >
                  <div className="w-11 h-11 rounded-2xl bg-blue-500/10 border border-blue-500/15 flex items-center justify-center flex-shrink-0">
                    <MapPin size={17} className="text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-semibold truncate">{r.data.area || "—"}</p>
                    <p className="text-white/35 text-xs truncate mt-1">{r.data.guard || "—"}</p>
                  </div>
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium flex-shrink-0 ${st.bg} ${st.border} ${st.color}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                    {st.label}
                  </div>
                  {(hasFiles || hasNotes) && (
                    <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }} className="text-white/20 flex-shrink-0">
                      <ChevronDown size={15} />
                    </motion.div>
                  )}
                    <button
                      onClick={e => { e.stopPropagation(); remove(r.id); }}
                      className="opacity-40 group-hover:opacity-100 text-white/30 hover:text-red-400 transition-all flex-shrink-0 ml-1"
                    >
                    <Trash2 size={14} />
                  </button>
                </div>
                <AnimatePresence>
                  {isExpanded && (hasFiles || hasNotes) && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5 pt-0 space-y-4 border-t border-white/5">
                        {hasNotes && (
                          <div className="pt-3">
                            <p className="text-[10px] text-white/30 uppercase tracking-widest font-medium mb-1.5">Примечание</p>
                            <p className="text-sm text-white/60 leading-relaxed">{r.data.notes}</p>
                          </div>
                        )}
                        {hasFiles && (
                          <div className={hasNotes ? "" : "pt-3"}>
                            <p className="text-[10px] text-white/30 uppercase tracking-widest font-medium mb-2">Фото / видео</p>
                            <div className="flex gap-2 flex-wrap">
                              {r.files!.map(f => f.file_type?.startsWith("image/") ? (
                                <a key={f.id} href={f.url} target="_blank" rel="noreferrer">
                                  <img src={f.url} alt={f.file_name} className="w-16 h-16 rounded-xl object-cover border border-white/10 hover:border-white/30 transition-all" />
                                </a>
                              ) : (
                                <a key={f.id} href={f.url} target="_blank" rel="noreferrer"
                                  className="w-16 h-16 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[10px] text-white/40 hover:border-white/30 transition-all">
                                  видео
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
