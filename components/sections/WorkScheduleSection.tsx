"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Calendar, Loader2, Trash2, Clock, Moon, RefreshCw, ChevronDown, X } from "lucide-react";

type Schedule = {
  id: string;
  employee_name: string;
  role: string;
  schedule_type: string;
  work_start: string;
  work_end: string;
  rest_start: string | null;
  rest_end: string | null;
  shift_hours: number;
  rest_hours: number;
  note: string;
  created_at: string;
};

const SCHEDULE_TYPES = [
  { value: "vahta", label: "Вахта", icon: "🏗️", desc: "Работа блоками (30/30, 15/15 и т.д.)" },
  { value: "daily", label: "Суточный", icon: "🌙", desc: "24ч работа / 72ч отдых" },
  { value: "shift_2_2", label: "2/2", icon: "🔄", desc: "2 дня работа / 2 дня отдых" },
  { value: "shift_5_2", label: "5/2", icon: "📅", desc: "5 дней работа / 2 дня отдых" },
  { value: "custom", label: "Свой", icon: "⚙️", desc: "Произвольный график" },
];

function getStatusInfo(s: Schedule): { label: string; color: string; bg: string } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const workStart = new Date(s.work_start);
  const workEnd = new Date(s.work_end);
  workEnd.setHours(23, 59, 59, 999);
  if (today >= workStart && today <= workEnd) {
    return { label: "На работе", color: "#4ade80", bg: "rgba(74,222,128,0.12)" };
  }
  if (s.rest_start && s.rest_end) {
    const restStart = new Date(s.rest_start);
    const restEnd = new Date(s.rest_end);
    restEnd.setHours(23, 59, 59, 999);
    if (today >= restStart && today <= restEnd) {
      return { label: "На отдыхе", color: "#60a5fa", bg: "rgba(96,165,250,0.12)" };
    }
  }
  if (today < workStart) {
    return { label: "Ожидает", color: "#fbbf24", bg: "rgba(251,191,36,0.12)" };
  }
  return { label: "Завершён", color: "#6b7280", bg: "rgba(107,114,128,0.1)" };
}

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("ru-RU", { day: "2-digit", month: "short" });
}

function daysCount(start: string, end: string | null) {
  if (!end) return 0;
  const s = new Date(start); const e = new Date(end);
  return Math.round((e.getTime() - s.getTime()) / 86400000) + 1;
}

export default function WorkScheduleSection({ city, companyId }: { city: string; companyId?: string }) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "rest" | "pending">("all");
  const [employees, setEmployees] = useState<{ id: string; name: string }[]>([]);

  const [form, setForm] = useState({
    employeeName: "",
    role: "",
    scheduleType: "vahta",
    workStart: "",
    workEnd: "",
    restStart: "",
    restEnd: "",
    shiftHours: "24",
    restHours: "72",
    note: "",
  });

  useEffect(() => { fetchAll(); }, [city, companyId]);
  useEffect(() => {
    fetch("/api/users").then(r => r.json()).then(data => {
      if (Array.isArray(data)) setEmployees(data.map((u: any) => ({ id: u.id, name: u.name })));
    }).catch(() => {});
  }, []);

  async function fetchAll() {
    setLoading(true);
    const q = new URLSearchParams();
    if (city) q.set("cityId", city);
    if (companyId) q.set("companyId", companyId);
    const res = await fetch(`/api/schedules?${q}`);
    const data = await res.json();
    setSchedules(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  async function save() {
    if (!form.employeeName.trim() || !form.workStart || !form.workEnd) return;
    setSaving(true);
    await fetch("/api/schedules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cityId: city,
        companyId: companyId || "",
        employeeName: form.employeeName.trim(),
        role: form.role.trim(),
        scheduleType: form.scheduleType,
        workStart: form.workStart,
        workEnd: form.workEnd,
        restStart: form.restStart || null,
        restEnd: form.restEnd || null,
        shiftHours: parseInt(form.shiftHours) || 24,
        restHours: parseInt(form.restHours) || 72,
        note: form.note.trim(),
      }),
    });
    setForm({ employeeName: "", role: "", scheduleType: "vahta", workStart: "", workEnd: "", restStart: "", restEnd: "", shiftHours: "24", restHours: "72", note: "" });
    setShowForm(false);
    setSaving(false);
    fetchAll();
  }

  async function remove(id: string) {
    await fetch(`/api/schedules?id=${id}`, { method: "DELETE" });
    setSchedules(prev => prev.filter(s => s.id !== id));
  }

  const filtered = schedules.filter(s => {
    if (filterStatus === "all") return true;
    const status = getStatusInfo(s);
    if (filterStatus === "active") return status.label === "На работе";
    if (filterStatus === "rest") return status.label === "На отдыхе";
    if (filterStatus === "pending") return status.label === "Ожидает";
    return true;
  });

  const counters = {
    active: schedules.filter(s => getStatusInfo(s).label === "На работе").length,
    rest: schedules.filter(s => getStatusInfo(s).label === "На отдыхе").length,
    pending: schedules.filter(s => getStatusInfo(s).label === "Ожидает").length,
  };

  const inputCls = "w-full bg-white/4 border border-white/8 focus:border-white/25 text-white rounded-xl px-5 py-4 text-[15px] placeholder-white/20 outline-none transition-all";

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold text-white">График работы и отдыха</h2>
          <p className="text-xs text-white/30 mt-0.5">Вахты, смены, перевахтовка</p>
        </div>
        <motion.button onClick={() => setShowForm(!showForm)}
          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }}
          className="flex items-center gap-2 px-7 py-3.5 rounded-2xl text-[15px] font-semibold border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white transition-all">
          <Plus size={15} strokeWidth={2.5} />
          <span>Добавить</span>
        </motion.button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { key: "active" as const, label: "На работе", icon: <Clock size={14} />, color: "#4ade80", count: counters.active },
          { key: "rest" as const, label: "На отдыхе", icon: <Moon size={14} />, color: "#60a5fa", count: counters.rest },
          { key: "pending" as const, label: "Ожидают", icon: <Calendar size={14} />, color: "#fbbf24", count: counters.pending },
        ].map(({ key, label, icon, color, count }) => (
          <motion.button key={key} onClick={() => setFilterStatus(filterStatus === key ? "all" : key)}
            whileTap={{ scale: 0.96 }}
            className={`rounded-2xl p-3 border text-left transition-all ${filterStatus === key ? "border-white/20 bg-white/8" : "border-white/5 bg-[#13131a]"}`}>
            <div className="flex items-center gap-1.5 mb-1" style={{ color }}>
              {icon}
              <span className="text-xs font-medium">{label}</span>
            </div>
            <div className="text-xl font-bold text-white">{count}</div>
          </motion.button>
        ))}
      </div>

      {/* Form modal */}
      <AnimatePresence>
        {showForm && (
          <div style={{ position: "fixed", inset: 0, zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowForm(false)}
              style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }} />
            <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }} transition={{ type: "spring", stiffness: 340, damping: 28 }}
              className="modal-mobile" style={{ position: "relative", background: "#13131a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 22, padding: "28px 24px", width: "100%", maxWidth: 560, maxHeight: "90vh", overflowY: "auto", zIndex: 1, boxShadow: "0 32px 80px rgba(0,0,0,0.7)" }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                <h3 style={{ fontSize: 17, fontWeight: 700, color: "#f0f0fa", margin: 0 }}>Новый график</h3>
                <button onClick={() => setShowForm(false)} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#888" }}>
                  <X size={16} />
                </button>
              </div>
              <div className="space-y-4">
                {/* Тип графика */}
                <div className="space-y-4">
                  <label className="text-[10px] text-white/40 uppercase tracking-widest font-medium">Тип графика</label>
                  <div className="grid grid-cols-3 gap-2">
                    {SCHEDULE_TYPES.map(t => (
                      <button key={t.value} onClick={() => setForm({ ...form, scheduleType: t.value })}
                        className={`rounded-xl p-3 border text-left transition-all ${form.scheduleType === t.value ? "border-white/30 bg-white/8" : "border-white/6 bg-white/2 hover:bg-white/5"}`}>
                        <div className="text-base mb-1">{t.icon}</div>
                        <div className="text-xs font-semibold text-white">{t.label}</div>
                        <div className="text-[10px] text-white/30 mt-0.5 leading-tight">{t.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
                {/* Сотрудник */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-white/40 uppercase tracking-widest font-medium">ФИО сотрудника *</label>
                    {employees.length > 0 ? (
                      <select value={form.employeeName} onChange={e => setForm({ ...form, employeeName: e.target.value })} className={`${inputCls} cursor-pointer`}>
                        <option value="" className="bg-[#0a0a0f]">— Выберите —</option>
                        {employees.map(e => <option key={e.id} value={e.name} className="bg-[#0a0a0f]">{e.name}</option>)}
                      </select>
                    ) : (
                      <input placeholder="Иван Иванов" value={form.employeeName}
                        onChange={e => setForm({ ...form, employeeName: e.target.value })} className={inputCls} />
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-white/40 uppercase tracking-widest font-medium">Должность</label>
                    <input placeholder="Охранник" value={form.role}
                      onChange={e => setForm({ ...form, role: e.target.value })} className={inputCls} />
                  </div>
                </div>
                {/* Даты работы */}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-white/40 uppercase tracking-widest font-medium flex items-center gap-1.5">
                    <Clock size={11} className="text-green-400" /> Период работы *
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <span className="text-[10px] text-white/25">Начало</span>
                      <input type="date" value={form.workStart}
                        onChange={e => setForm({ ...form, workStart: e.target.value })} className={inputCls} />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-white/25">Конец</span>
                      <input type="date" value={form.workEnd}
                        onChange={e => setForm({ ...form, workEnd: e.target.value })} className={inputCls} />
                    </div>
                  </div>
                  {form.workStart && form.workEnd && (
                    <p className="text-[11px] text-green-400/70">Период работы: {daysCount(form.workStart, form.workEnd)} дн.</p>
                  )}
                </div>
                {/* Даты отдыха */}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-white/40 uppercase tracking-widest font-medium flex items-center gap-1.5">
                    <Moon size={11} className="text-blue-400" /> Период отдыха
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <span className="text-[10px] text-white/25">Начало отдыха</span>
                      <input type="date" value={form.restStart}
                        onChange={e => setForm({ ...form, restStart: e.target.value })} className={inputCls} />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-white/25">Конец отдыха</span>
                      <input type="date" value={form.restEnd}
                        onChange={e => setForm({ ...form, restEnd: e.target.value })} className={inputCls} />
                    </div>
                  </div>
                  {form.restStart && form.restEnd && (
                    <p className="text-[11px] text-blue-400/70">Период отдыха: {daysCount(form.restStart, form.restEnd)} дн.</p>
                  )}
                </div>
                {/* Часы смены */}
                {(form.scheduleType === "daily" || form.scheduleType === "custom") && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-white/40 uppercase tracking-widest font-medium">Часов в смене</label>
                      <input type="number" placeholder="24" value={form.shiftHours}
                        onChange={e => setForm({ ...form, shiftHours: e.target.value })} className={inputCls} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-white/40 uppercase tracking-widest font-medium">Часов отдыха</label>
                      <input type="number" placeholder="72" value={form.restHours}
                        onChange={e => setForm({ ...form, restHours: e.target.value })} className={inputCls} />
                    </div>
                  </div>
                )}
                {/* Заметка */}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-white/40 uppercase tracking-widest font-medium">Заметка</label>
                  <textarea placeholder="Доп. информация..." value={form.note}
                    onChange={e => setForm({ ...form, note: e.target.value })}
                    rows={2} className={`${inputCls} resize-none`} />
                </div>
                <div className="flex gap-2 pt-1">
                  <motion.button onClick={save} disabled={saving || !form.employeeName.trim() || !form.workStart || !form.workEnd}
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                    className="flex-1 py-4 bg-white text-black rounded-2xl text-[15px] font-semibold flex items-center justify-center gap-2 hover:bg-white/90 transition-all disabled:opacity-40">
                    {saving ? <Loader2 size={14} className="animate-spin" /> : null}
                    Сохранить
                  </motion.button>
                  <motion.button onClick={() => setShowForm(false)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                    className="px-5 py-4 bg-white/4 border border-white/8 text-white/50 rounded-2xl text-[15px] hover:text-white/80 transition-all">
                    Отмена
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-white/20" size={28} /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-14 text-white/20 flex flex-col items-center gap-3">
          <RefreshCw size={36} className="opacity-30" />
          <span className="text-sm">{filterStatus === "all" ? "Графиков нет" : "Нет по фильтру"}</span>
        </div>
      ) : (
          <div className="space-y-4">
          {filtered.map((s, i) => {
            const status = getStatusInfo(s);
            const typeInfo = SCHEDULE_TYPES.find(t => t.value === s.schedule_type) || SCHEDULE_TYPES[0];
            const isExpanded = expandedId === s.id;
            return (
              <motion.div key={s.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: i * 0.04 }}
                className="bg-[#13131a] border border-white/5 hover:border-white/10 rounded-2xl overflow-hidden transition-all">
                <div className="flex items-center gap-3 p-3.5 sm:p-4 cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : s.id)}>
                  {/* Иконка типа */}
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-base"
                    style={{ background: status.bg }}>
                    {typeInfo.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-white text-sm font-semibold truncate">{s.employee_name}</p>
                      {s.role && <span className="text-[10px] text-white/30 bg-white/5 px-2 py-0.5 rounded-full">{s.role}</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-[11px] px-2 py-0.5 rounded-full font-medium" style={{ color: status.color, background: status.bg }}>
                        {status.label}
                      </span>
                      <span className="text-white/25 text-[11px]">{typeInfo.label}</span>
                      <span className="text-white/20 text-[11px]">
                        {fmtDate(s.work_start)} — {fmtDate(s.work_end)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                      <ChevronDown size={14} className="text-white/20" />
                    </motion.div>
                    <button onClick={e => { e.stopPropagation(); remove(s.id); }}
                      className="text-white/15 hover:text-red-400 transition-all p-1">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}
                      className="overflow-hidden">
                      <div className="border-t border-white/5 px-4 py-3 space-y-3">
                        {/* Визуальная шкала */}
                        <ScheduleTimeline schedule={s} />
                        {/* Детали */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="bg-white/3 rounded-xl p-3">
                            <div className="flex items-center gap-1.5 text-green-400 mb-1">
                              <Clock size={12} />
                              <span className="text-[10px] font-semibold uppercase tracking-wider">Работа</span>
                            </div>
                            <div className="text-white text-sm font-medium">{fmtDate(s.work_start)} — {fmtDate(s.work_end)}</div>
                            <div className="text-white/30 text-[11px] mt-0.5">{daysCount(s.work_start, s.work_end)} дн.</div>
                          </div>
                          {s.rest_start && (
                            <div className="bg-white/3 rounded-xl p-3">
                              <div className="flex items-center gap-1.5 text-blue-400 mb-1">
                                <Moon size={12} />
                                <span className="text-[10px] font-semibold uppercase tracking-wider">Отдых</span>
                              </div>
                              <div className="text-white text-sm font-medium">{fmtDate(s.rest_start)} — {fmtDate(s.rest_end)}</div>
                              <div className="text-white/30 text-[11px] mt-0.5">{daysCount(s.rest_start!, s.rest_end)} дн.</div>
                            </div>
                          )}
                        </div>
                        {s.note && (
                          <div className="bg-white/3 rounded-xl p-3">
                            <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Заметка</p>
                            <p className="text-white/70 text-sm">{s.note}</p>
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

function ScheduleTimeline({ schedule }: { schedule: Schedule }) {
  const workStart = new Date(schedule.work_start);
  const workEnd = new Date(schedule.work_end);
  const today = new Date();
  today.setHours(12, 0, 0, 0);

  const totalStart = workStart;
  const totalEnd = schedule.rest_end ? new Date(schedule.rest_end) : workEnd;
  const totalMs = totalEnd.getTime() - totalStart.getTime();
  if (totalMs <= 0) return null;

  const workWidth = Math.min(100, ((workEnd.getTime() - workStart.getTime()) / totalMs) * 100);
  const restStart = schedule.rest_start ? new Date(schedule.rest_start) : null;
  const restEnd = schedule.rest_end ? new Date(schedule.rest_end) : null;
  const restLeft = restStart ? ((restStart.getTime() - totalStart.getTime()) / totalMs) * 100 : null;
  const restWidth = restStart && restEnd ? ((restEnd.getTime() - restStart.getTime()) / totalMs) * 100 : null;
  const todayLeft = ((today.getTime() - totalStart.getTime()) / totalMs) * 100;
  const showToday = todayLeft >= 0 && todayLeft <= 100;

  return (
    <div className="space-y-2">
      <div className="text-[10px] text-white/25 uppercase tracking-wider">Временная шкала</div>
      <div className="relative h-6 bg-white/4 rounded-lg overflow-hidden">
        {/* Работа */}
        <div className="absolute top-0 bottom-0 bg-green-500/40 rounded-lg"
          style={{ left: 0, width: `${workWidth}%` }} />
        {/* Отдых */}
        {restLeft !== null && restWidth !== null && (
          <div className="absolute top-0 bottom-0 bg-blue-500/40 rounded-lg"
            style={{ left: `${restLeft}%`, width: `${restWidth}%` }} />
        )}
        {/* Сегодня */}
        {showToday && (
          <div className="absolute top-0 bottom-0 w-0.5 bg-white/60"
            style={{ left: `${todayLeft}%` }}>
            <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-white" />
          </div>
        )}
      </div>
      <div className="flex gap-3 text-[10px] text-white/30">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-green-500/50 inline-block" />Работа</span>
        {restLeft !== null && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-blue-500/50 inline-block" />Отдых</span>}
        {showToday && <span className="flex items-center gap-1"><span className="w-0.5 h-3 bg-white/50 inline-block" />Сегодня</span>}
      </div>
    </div>
  );
}
