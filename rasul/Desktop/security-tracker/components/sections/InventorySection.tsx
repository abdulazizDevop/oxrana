"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Package, Loader2, Trash2, ChevronDown, Check, Search, Tag, Hash, FileText, X } from "lucide-react";
import FileUpload from "@/components/FileUpload";

type InventoryRecord = {
  id: string;
  data: { item_name: string; quantity: number; status: string; notes?: string };
  files?: { id: string; url: string; file_name: string; file_type: string; file_size: number }[];
  created_at: string;
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  ok:      { label: "На месте",    color: "text-emerald-400", bg: "bg-emerald-500/10 border border-emerald-500/20", dot: "bg-emerald-400" },
  damaged: { label: "Повреждено",  color: "text-amber-400",   bg: "bg-amber-500/10 border border-amber-500/20",   dot: "bg-amber-400" },
  missing: { label: "Отсутствует", color: "text-red-400",     bg: "bg-red-500/10 border border-red-500/20",       dot: "bg-red-400" },
};

const ICON_BG: Record<string, string> = {
  ok:      "bg-emerald-500/10",
  damaged: "bg-amber-500/10",
  missing: "bg-red-500/10",
};
const ICON_COLOR: Record<string, string> = {
  ok:      "text-emerald-400",
  damaged: "text-amber-400",
  missing: "text-red-400",
};

const STATUSES = [
  { value: "ok",      label: "На месте" },
  { value: "damaged", label: "Повреждено" },
  { value: "missing", label: "Отсутствует" },
];

export default function InventorySection({
  city,
  companyId,
  readOnly = false,
  currentUser,
}: {
  city: string;
  companyId?: string;
  readOnly?: boolean;
  currentUser?: any;
}) {
  const [records, setRecords] = useState<InventoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ item_name: "", quantity: "1", notes: "", status: "ok" });
  const [saving, setSaving] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusOpen, setStatusOpen] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // TMC Request state
  const [showTmcForm, setShowTmcForm] = useState(false);
  const [tmcForm, setTmcForm] = useState({ item_name: "", quantity: "1", notes: "" });
  const [tmcSaving, setTmcSaving] = useState(false);

  async function saveTmcRequest() {
    if (!tmcForm.item_name) return;
    setTmcSaving(true);
    await fetch("/api/tmc-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        cityId: city, 
        companyId: companyId || "", 
        requesterName: currentUser?.name || "Сотрудник",
        itemName: tmcForm.item_name,
        quantity: Number(tmcForm.quantity),
        notes: tmcForm.notes
      }),
    });
    setTmcForm({ item_name: "", quantity: "1", notes: "" });
    setShowTmcForm(false);
    setTmcSaving(false);
    alert("Заявка ТМЦ отправлена!");
  }

  useEffect(() => { fetchAll(); }, [city, companyId]);

  async function fetchAll() {
    setLoading(true);
    const q = new URLSearchParams({ section: "inventory" });
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
      body: JSON.stringify({ cityId: city, companyId: companyId || "", section: "inventory", data: {} }),
    });
    const rec = await res.json();
    setPendingId(rec.id);
    setShowForm(true);
  }

  async function save() {
    if (!form.item_name) return;
    setSaving(true);
    await fetch("/api/records", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: pendingId, data: { ...form, quantity: Number(form.quantity) } }),
    });
    setForm({ item_name: "", quantity: "1", notes: "", status: "ok" });
    setPendingId(null); setShowForm(false); setSaving(false); fetchAll();
  }

  async function cancelForm() {
    if (pendingId) await fetch(`/api/records?id=${pendingId}`, { method: "DELETE" });
    setPendingId(null); setShowForm(false); setForm({ item_name: "", quantity: "1", notes: "", status: "ok" });
  }

  async function remove(id: string) {
    await fetch(`/api/records?id=${id}`, { method: "DELETE" });
    setDeleteConfirm(null);
    fetchAll();
  }

  async function updateStatus(record: InventoryRecord, newStatus: string) {
    setUpdatingId(record.id);
    setStatusOpen(null);
    await fetch("/api/records", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: record.id, data: { ...record.data, status: newStatus } }),
    });
    setUpdatingId(null);
    fetchAll();
  }

  const filteredRecords = records.filter(r => {
    if (!searchQuery) return true;
    const s = searchQuery.toLowerCase();
    return (
      r.data.item_name?.toLowerCase().includes(s) ||
      r.data.notes?.toLowerCase().includes(s) ||
      STATUS_CONFIG[r.data.status]?.label.toLowerCase().includes(s)
    );
  });

  const counts = {
    ok: records.filter(r => r.data.status === "ok").length,
    damaged: records.filter(r => r.data.status === "damaged").length,
    missing: records.filter(r => r.data.status === "missing").length,
  };

        return (
          <div className="flex flex-col gap-8">
            {/* Header */}
            <div className="flex items-center justify-between gap-4 pb-5 border-b border-white/6">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-white">Учёт имущества ЧОП</h2>
            {records.length > 0 && (
              <p className="text-xs text-white/30 mt-1">{records.length} {records.length === 1 ? "предмет" : records.length < 5 ? "предмета" : "предметов"}</p>
            )}
          </div>
        </div>

        {/* Stats strip */}
        {records.length > 0 && (
          <div className="grid grid-cols-3 gap-4">
            {[
              { key: "ok",      label: "На месте",    val: counts.ok },
              { key: "damaged", label: "Повреждено",  val: counts.damaged },
              { key: "missing", label: "Отсутствует", val: counts.missing },
            ].map(({ key, label, val }) => (
              <div key={key} className={`rounded-2xl px-4 py-5 ${STATUS_CONFIG[key].bg} flex flex-col gap-2`}>
                <span className={`text-2xl font-bold ${STATUS_CONFIG[key].color}`}>{val}</span>
                <span className="text-[11px] text-white/40 leading-tight">{label}</span>
              </div>
            ))}
          </div>
        )}

          {/* Staff hint */}
          {readOnly && (
            <div className="flex items-center justify-between gap-4 px-4 py-3 rounded-2xl bg-blue-500/8 border border-blue-500/15">
              <div className="flex items-center gap-2 text-blue-300/60 text-xs">
                <Package size={13} className="flex-shrink-0" />
                <span>Нажмите на статус, чтобы обновить его</span>
              </div>
              <motion.button
                onClick={() => setShowTmcForm(true)}
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }}
                className="bg-blue-500/20 text-blue-300 px-3 py-1.5 rounded-xl text-[11px] font-bold border border-blue-500/20"
              >
                Запросить ТМЦ
              </motion.button>
            </div>
          )}


        {/* Search + Add */}
        {!readOnly && (
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
                <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#404058", pointerEvents: "none" }}>
                  <Search size={16} />
                </div>
                <input
                  type="text"
                  placeholder="Поиск по наименованию или примечаниям..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1.5px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "12px 16px 12px 42px", fontSize: 13, color: "#f0f0fa", outline: "none", transition: "border-color 0.2s" }}
                  onFocus={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.18)"}
                  onBlur={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"}
                />
            </div>
            <motion.button
              onClick={openForm}
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 500, damping: 20 }}
              className="flex items-center gap-2 px-5 py-4 rounded-2xl text-sm font-semibold border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white transition-all whitespace-nowrap flex-shrink-0"
            >
              <Plus size={15} strokeWidth={2.5} />
              Добавить
            </motion.button>
          </div>
        )}
        {readOnly && (
          <div className="search-wrap">
            <div className="search-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg></div>
            <input className="search-input"
                type="text"
                placeholder="Поиск по наименованию или примечаниям..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)} />
          </div>
        )}

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
                    <h3 style={{ fontSize: 17, fontWeight: 700, color: "#f0f0fa", margin: 0 }}>Новый предмет</h3>
                    <p style={{ fontSize: 12, color: "#555570", margin: "4px 0 0" }}>Укажите имущество и статус</p>
                  </div>
                  <button onClick={cancelForm} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#888" }}>
                    <X size={16} />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" style={{ marginBottom: 16 }}>
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1.5 text-[10px] text-white/35 uppercase tracking-widest font-medium">
                      <Tag size={10} /> Наименование
                    </label>
                    <input
                      placeholder="Рация, жилет, фонарь..."
                      value={form.item_name}
                      onChange={e => setForm({ ...form, item_name: e.target.value })}
                      className="w-full bg-white/5 border border-white/8 focus:border-white/25 text-white rounded-xl px-4 py-3 text-sm placeholder-white/20 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1.5 text-[10px] text-white/35 uppercase tracking-widest font-medium">
                      <Hash size={10} /> Количество
                    </label>
                    <input
                      type="number" min="1"
                      value={form.quantity}
                      onChange={e => setForm({ ...form, quantity: e.target.value })}
                      className="w-full bg-white/5 border border-white/8 focus:border-white/25 text-white rounded-xl px-4 py-3 text-sm outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-white/35 uppercase tracking-widest font-medium block">Статус</label>
                    <select
                      value={form.status}
                      onChange={e => setForm({ ...form, status: e.target.value })}
                      className="w-full bg-white/5 border border-white/8 focus:border-white/25 text-white rounded-xl px-4 py-3 text-sm outline-none transition-all appearance-none cursor-pointer"
                    >
                      <option value="ok" className="bg-[#0a0a0f]">На месте</option>
                      <option value="damaged" className="bg-[#0a0a0f]">Повреждено</option>
                      <option value="missing" className="bg-[#0a0a0f]">Отсутствует</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1.5 text-[10px] text-white/35 uppercase tracking-widest font-medium">
                      <FileText size={10} /> Примечания
                    </label>
                    <input
                      placeholder="Доп. информация"
                      value={form.notes}
                      onChange={e => setForm({ ...form, notes: e.target.value })}
                      className="w-full bg-white/5 border border-white/8 focus:border-white/25 text-white rounded-xl px-4 py-3 text-sm placeholder-white/20 outline-none transition-all"
                    />
                  </div>
                </div>
                <FileUpload recordId={pendingId || undefined} files={[]} />
                <div className="flex gap-2 pt-4">
                  <motion.button
                    onClick={save} disabled={saving}
                    whileHover={{ scale: saving ? 1 : 1.02 }} whileTap={{ scale: saving ? 1 : 0.97 }}
                    className="flex-1 py-3 bg-white text-black rounded-xl text-sm font-semibold flex items-center justify-center gap-2 hover:bg-white/90 transition-all disabled:opacity-50"
                  >
                    {saving ? <Loader2 size={14} className="animate-spin" /> : null}
                    Сохранить запись
                  </motion.button>
                  <motion.button
                    onClick={cancelForm}
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                    className="px-5 py-3 bg-white/4 border border-white/8 text-white/50 rounded-xl text-sm hover:text-white/80 transition-all"
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
        <div className="flex justify-center py-14">
          <Loader2 className="animate-spin text-white/20" size={28} />
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="text-center py-16 flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-white/4 flex items-center justify-center">
            <Package size={24} className="text-white/20" />
          </div>
          <span className="text-sm text-white/25">
            {searchQuery ? "Ничего не найдено" : "Имущество не добавлено"}
          </span>
        </div>
      ) : (
            <div className="flex flex-col gap-4">
                  {filteredRecords.map((r, i) => {
            const cfg = STATUS_CONFIG[r.data.status] || STATUS_CONFIG.ok;
            return (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: i * 0.04 }}
                  className="group bg-white/[0.035] hover:bg-white/[0.06] border border-white/8 hover:border-white/15 rounded-2xl transition-all overflow-visible"
                  style={{ boxShadow: "0 1px 0 rgba(255,255,255,0.04)" }}
                >
                  <div className="p-6 sm:p-7">
                    <div className="flex items-start justify-between gap-4">
                      {/* Icon + Name */}
                      <div className="flex items-start gap-4 min-w-0 flex-1">
                        <div className={`w-11 h-11 rounded-2xl ${ICON_BG[r.data.status] || "bg-white/8"} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                          <Package size={18} className={ICON_COLOR[r.data.status] || "text-white/40"} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-white text-sm font-semibold leading-snug truncate">
                            {r.data.item_name || "—"}
                          </p>
                          <div className="flex items-center gap-4 mt-2 flex-wrap">
                            <span className="flex items-center gap-1.5 text-xs text-white/35">
                              <Hash size={10} className="text-white/20" />
                              {r.data.quantity} шт.
                            </span>
                            {r.data.notes && (
                              <span className="flex items-center gap-1.5 text-xs text-white/35 truncate max-w-[160px]">
                                <FileText size={10} className="text-white/20 flex-shrink-0" />
                                {r.data.notes}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                    {/* Status + Delete */}
                    <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
                      {readOnly ? (
                        <div className="relative">
                          <button
                            onClick={() => setStatusOpen(statusOpen === r.id ? null : r.id)}
                            className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all ${cfg.bg} ${cfg.color} hover:brightness-110`}
                          >
                            {updatingId === r.id ? (
                              <Loader2 size={11} className="animate-spin" />
                            ) : (
                              <>
                                <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} flex-shrink-0`} />
                                {cfg.label}
                                <ChevronDown size={11} className={`transition-transform ${statusOpen === r.id ? "rotate-180" : ""}`} />
                              </>
                            )}
                          </button>
                          <AnimatePresence>
                            {statusOpen === r.id && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.92, y: -4 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.92, y: -4 }}
                                transition={{ duration: 0.15 }}
                                className="absolute right-0 top-full mt-1.5 z-30 bg-[#1a1a26] border border-white/10 rounded-xl overflow-hidden shadow-2xl min-w-[148px]"
                              >
                                {STATUSES.map(s => {
                                  const sc = STATUS_CONFIG[s.value];
                                  return (
                                    <button
                                      key={s.value}
                                      onClick={() => updateStatus(r, s.value)}
                                      className="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 text-xs transition-all hover:bg-white/5"
                                    >
                                      <span className={`flex items-center gap-2 ${sc.color}`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                                        {s.label}
                                      </span>
                                      {r.data.status === s.value && <Check size={12} className="text-white/40" />}
                                    </button>
                                  );
                                })}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      ) : (
                        <>
                          <span className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg ${cfg.bg} ${cfg.color}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                            {cfg.label}
                          </span>
                          {deleteConfirm === r.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => remove(r.id)}
                                className="text-[11px] px-2.5 py-1 rounded-lg bg-red-500/15 text-red-400 border border-red-500/20 hover:bg-red-500/25 transition-all"
                              >
                                Удалить
                              </button>
                              <button
                                onClick={() => setDeleteConfirm(null)}
                                className="text-[11px] px-2.5 py-1 rounded-lg bg-white/5 text-white/40 border border-white/8 hover:bg-white/10 transition-all"
                              >
                                Нет
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirm(r.id)}
                              className="opacity-40 group-hover:opacity-100 text-white/20 hover:text-red-400 transition-all p-1"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                      {/* Files */}
                      {r.files && r.files.length > 0 && (
                        <div className="flex gap-3 mt-4 pt-4 border-t border-white/5 flex-wrap">
                      {r.files.map(f =>
                        f.file_type?.startsWith("image/") ? (
                          <a key={f.id} href={f.url} target="_blank" rel="noreferrer">
                            <img
                              src={f.url} alt={f.file_name}
                              className="w-14 h-14 rounded-xl object-cover border border-white/10 hover:border-white/30 transition-all"
                            />
                          </a>
                        ) : (
                          <a key={f.id} href={f.url} target="_blank" rel="noreferrer"
                            className="w-14 h-14 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[10px] text-white/40 hover:border-white/30 transition-all">
                            файл
                          </a>
                        )
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
        {/* TMC Request Modal */}
        <AnimatePresence>
          {showTmcForm && (
            <div style={{ position: "fixed", inset: 0, zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setShowTmcForm(false)}
                style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }} />
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                style={{ position: "relative", background: "#13131a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 22, padding: "28px 24px", width: "100%", maxWidth: 440, zIndex: 1 }}
              >
                <div style={{ marginBottom: 20 }}>
                  <h3 style={{ fontSize: 17, fontWeight: 700, color: "#f0f0fa", margin: 0 }}>Заявка на ТМЦ</h3>
                  <p style={{ fontSize: 12, color: "#555570", margin: "4px 0 0" }}>Запросите необходимое имущество</p>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-white/35 uppercase tracking-widest font-medium">Наименование ТМЦ</label>
                    <input
                      placeholder="Что именно нужно?"
                      value={tmcForm.item_name}
                      onChange={e => setTmcForm({ ...tmcForm, item_name: e.target.value })}
                      className="w-full bg-white/5 border border-white/8 focus:border-white/25 text-white rounded-xl px-4 py-3 text-sm outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-white/35 uppercase tracking-widest font-medium">Количество</label>
                    <input
                      type="number" min="1"
                      value={tmcForm.quantity}
                      onChange={e => setTmcForm({ ...tmcForm, quantity: e.target.value })}
                      className="w-full bg-white/5 border border-white/8 focus:border-white/25 text-white rounded-xl px-4 py-3 text-sm outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-white/35 uppercase tracking-widest font-medium">Примечания</label>
                    <textarea
                      placeholder="Зачем это нужно или подробности..."
                      value={tmcForm.notes}
                      onChange={e => setTmcForm({ ...tmcForm, notes: e.target.value })}
                      className="w-full bg-white/5 border border-white/8 focus:border-white/25 text-white rounded-xl px-4 py-3 text-sm outline-none transition-all min-h-[80px] resize-none"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-6">
                  <motion.button
                    onClick={saveTmcRequest} disabled={tmcSaving}
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                    className="flex-1 py-3 bg-blue-500 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 hover:bg-blue-600 transition-all disabled:opacity-50"
                  >
                    {tmcSaving ? <Loader2 size={14} className="animate-spin" /> : "Отправить заявку"}
                  </motion.button>
                  <motion.button
                    onClick={() => setShowTmcForm(false)}
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                    className="px-5 py-3 bg-white/5 border border-white/8 text-white/50 rounded-xl text-sm hover:text-white/80 transition-all"
                  >
                    Отмена
                  </motion.button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }

