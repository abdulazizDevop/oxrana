"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Save, X, Printer, ChevronLeft, ChevronRight } from "lucide-react";

type DutyRecord = {
  id: string;
  employee_name: string;
  post_name: string;
  city: string;
  company_id: string;
  year: number;
  month: number; // 1-12
  days: Record<number, string>; // day -> hours (e.g. "12" or "")
  total_hours: number;
  created_at: string;
};

const MONTH_NAMES = [
  "Январь","Февраль","Март","Апрель","Май","Июнь",
  "Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"
];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

export default function PostAccountingSection({ city, companyId }: { city: string; companyId?: string }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [records, setRecords] = useState<DutyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCell, setEditingCell] = useState<{ id: string; day: number } | null>(null);
  const [cellValue, setCellValue] = useState("");
  const [newName, setNewName] = useState("");
  const [newPost, setNewPost] = useState("");
  const [saving, setSaving] = useState(false);
  const [objectName, setObjectName] = useState("");
  const [postNumber, setPostNumber] = useState("");

  const daysInMonth = getDaysInMonth(year, month);

  const load = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({ city, month: String(month), year: String(year) });
      if (companyId) q.set("companyId", companyId);
      const res = await fetch(`/api/post-accounting?${q}`);
      const data = await res.json();
      setRecords(Array.isArray(data) ? data : []);
    } catch { setRecords([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [city, companyId, month, year]);

  const addEmployee = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/post-accounting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employee_name: newName.trim(),
          post_name: newPost.trim() || "Пост 1",
          city, company_id: companyId || "",
          year, month, days: {}, total_hours: 0,
        }),
      });
      const created = await res.json();
      setRecords(p => [...p, created]);
      setNewName(""); setNewPost(""); setShowAddModal(false);
    } finally { setSaving(false); }
  };

  const saveCell = async (record: DutyRecord) => {
    const val = cellValue.trim();
    const updatedDays = { ...record.days, [editingCell!.day]: val };
    const total = Object.values(updatedDays).reduce((s, v) => s + (parseFloat(v) || 0), 0);
    const res = await fetch("/api/post-accounting", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: record.id, days: updatedDays, total_hours: total }),
    });
    const updated = await res.json();
    setRecords(p => p.map(r => r.id === updated.id ? updated : r));
    setEditingCell(null);
  };

  const deleteRecord = async (id: string) => {
    await fetch(`/api/post-accounting?id=${id}`, { method: "DELETE" });
    setRecords(p => p.filter(r => r.id !== id));
  };

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-white">Учёт поста</h2>
          <p className="text-sm text-white/40 mt-0.5">График выхода на дежурство</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-white/[0.07] hover:bg-white/[0.12] border border-white/10 rounded-xl px-4 py-2 text-sm font-semibold text-white transition-all"
        >
          <Plus size={16} /> Добавить сотрудника
        </motion.button>
      </div>

      {/* Object / post info inputs */}
      <div className="flex gap-3 flex-wrap">
        <input
          value={objectName}
          onChange={e => setObjectName(e.target.value)}
          placeholder="Название объекта (напр. Стройка объект №1)"
          className="flex-1 min-w-[200px] bg-white/[0.04] border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 outline-none focus:border-white/20"
        />
        <input
          value={postNumber}
          onChange={e => setPostNumber(e.target.value)}
          placeholder="Пост (напр. Пост №1)"
          className="w-44 bg-white/[0.04] border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 outline-none focus:border-white/20"
        />
      </div>

      {/* Month navigator */}
      <div className="flex items-center gap-3 bg-white/[0.03] border border-white/8 rounded-2xl px-4 py-3">
        <motion.button whileTap={{ scale: 0.9 }} onClick={prevMonth}
          className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-all">
          <ChevronLeft size={18} />
        </motion.button>
        <span className="flex-1 text-center text-white font-semibold text-base">
          {MONTH_NAMES[month - 1]} {year}
        </span>
        <motion.button whileTap={{ scale: 0.9 }} onClick={nextMonth}
          className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-all">
          <ChevronRight size={18} />
        </motion.button>
      </div>

      {/* Print header block */}
      {(objectName || postNumber) && (
        <div className="bg-white/[0.025] border border-white/6 rounded-2xl px-5 py-4 text-white/70 text-sm space-y-1">
          {objectName && <div className="font-semibold text-white">{objectName}</div>}
          {postNumber && <div className="text-white/50">{postNumber}</div>}
          <div className="text-white/40 text-xs mt-1">
            График выхода на дежурство за {MONTH_NAMES[month - 1].toLowerCase()} {year} г.
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-white/20 border-t-white/70 rounded-full animate-spin" />
        </div>
      ) : records.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-white/25 gap-3">
          <div className="text-5xl">📋</div>
          <div className="text-sm">Нет записей за {MONTH_NAMES[month - 1]} {year}</div>
          <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
            onClick={() => setShowAddModal(true)}
            className="mt-2 px-4 py-2 bg-white/[0.06] border border-white/10 rounded-xl text-sm text-white/60 hover:text-white transition-all">
            + Добавить сотрудника
          </motion.button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/8">
          <table className="w-full text-sm border-collapse" style={{ minWidth: 900 }}>
            <thead>
              <tr className="bg-white/[0.05]">
                <th className="text-left px-3 py-3 text-white/50 font-semibold border-b border-r border-white/8 whitespace-nowrap" style={{ minWidth: 36 }}>№</th>
                <th className="text-left px-3 py-3 text-white/50 font-semibold border-b border-r border-white/8 whitespace-nowrap" style={{ minWidth: 160 }}>Ф.И.О.</th>
                <th className="text-left px-3 py-3 text-white/50 font-semibold border-b border-r border-white/8 whitespace-nowrap" style={{ minWidth: 100 }}>Пост</th>
                {Array.from({ length: daysInMonth }, (_, i) => (
                  <th key={i + 1} className="px-1.5 py-3 text-white/40 font-medium border-b border-r border-white/8 text-center" style={{ minWidth: 34 }}>
                    {i + 1}
                  </th>
                ))}
                <th className="px-3 py-3 text-white/50 font-semibold border-b border-r border-white/8 text-center whitespace-nowrap" style={{ minWidth: 72 }}>Часов</th>
                <th className="px-2 py-3 border-b border-white/8" style={{ minWidth: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {records.map((r, idx) => (
                <motion.tr key={r.id}
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: idx * 0.03 }}
                  className="border-b border-white/5 hover:bg-white/[0.025] transition-colors group">
                  <td className="px-3 py-2.5 text-white/30 text-center border-r border-white/5">{idx + 1}</td>
                  <td className="px-3 py-2.5 text-white font-medium border-r border-white/5 whitespace-nowrap">{r.employee_name}</td>
                  <td className="px-3 py-2.5 text-white/50 border-r border-white/5 whitespace-nowrap">{r.post_name}</td>
                  {Array.from({ length: daysInMonth }, (_, d) => {
                    const day = d + 1;
                    const val = r.days?.[day] || "";
                    const isEditing = editingCell?.id === r.id && editingCell?.day === day;
                    return (
                      <td key={day} className="border-r border-white/5 p-0 text-center" style={{ height: 40 }}>
                        {isEditing ? (
                          <input
                            autoFocus
                            value={cellValue}
                            onChange={e => setCellValue(e.target.value)}
                            onBlur={() => saveCell(r)}
                            onKeyDown={e => {
                              if (e.key === "Enter") saveCell(r);
                              if (e.key === "Escape") setEditingCell(null);
                            }}
                            className="w-full h-full text-center bg-blue-500/20 border-0 outline-none text-white text-xs px-0"
                            style={{ minWidth: 34 }}
                          />
                        ) : (
                          <button
                            onClick={() => { setEditingCell({ id: r.id, day }); setCellValue(val); }}
                            className="w-full h-full text-center hover:bg-white/10 transition-colors text-xs text-white/80 font-medium"
                            style={{ minWidth: 34, minHeight: 40 }}
                          >
                            {val || <span className="text-white/10">—</span>}
                          </button>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-2 py-2.5 text-center border-r border-white/5">
                    <span className="text-sm font-bold text-cyan-400">{r.total_hours || 0}</span>
                  </td>
                  <td className="px-2 py-2.5 text-center">
                    <button onClick={() => deleteRecord(r.id)}
                      className="opacity-40 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-red-500/20 text-white/30 hover:text-red-400">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary footer */}
      {records.length > 0 && (
        <div className="flex justify-end">
          <div className="bg-white/[0.04] border border-white/8 rounded-xl px-5 py-3 text-sm text-white/60">
            Всего сотрудников: <span className="text-white font-bold ml-1">{records.length}</span>
            <span className="mx-3 text-white/20">·</span>
            Итого часов: <span className="text-cyan-400 font-bold ml-1">
              {records.reduce((s, r) => s + (r.total_hours || 0), 0)}
            </span>
          </div>
        </div>
      )}

      {/* Add employee modal */}
      <AnimatePresence>
        {showAddModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => { setShowAddModal(false); setNewName(""); setNewPost(""); }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }} transition={{ type: "spring", stiffness: 320, damping: 28 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#0e0e1a] border border-white/12 rounded-2xl p-7 w-[90%] max-w-sm z-51 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold text-white">Добавить сотрудника</h3>
                <button onClick={() => { setShowAddModal(false); setNewName(""); setNewPost(""); }}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-all">
                  <X size={16} />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-white/40 uppercase tracking-widest mb-2 font-semibold">Ф.И.О.</label>
                  <input
                    autoFocus
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && addEmployee()}
                    placeholder="Например: Иванов Иван"
                    className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 outline-none focus:border-white/25"
                  />
                </div>
                <div>
                  <label className="block text-xs text-white/40 uppercase tracking-widest mb-2 font-semibold">Наименование поста</label>
                  <input
                    value={newPost}
                    onChange={e => setNewPost(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && addEmployee()}
                    placeholder="Пост №1"
                    className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 outline-none focus:border-white/25"
                  />
                </div>
                <div className="flex gap-3 pt-1">
                  <button onClick={() => { setShowAddModal(false); setNewName(""); setNewPost(""); }}
                    className="flex-1 bg-white/[0.04] border border-white/8 rounded-xl py-3 text-sm text-white/50 hover:text-white transition-all">
                    Отмена
                  </button>
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                    onClick={addEmployee} disabled={saving || !newName.trim()}
                    className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl py-3 text-sm font-semibold text-white disabled:opacity-50 flex items-center justify-center gap-2">
                    {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={15} />}
                    Добавить
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
