"use client";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Trash2, Fuel, Plus, X } from "lucide-react";
import { AppUser } from "@/lib/auth";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Expense {
  id: string;
  city_id: string;
  company_id: string;
  expense_name: string;
  advance_amount: number;
  total_amount: number;
  comment: string;
  created_by: string;
  created_by_role: string;
  created_at: string;
}

type Season = "winter" | "summer";
type FuelRecord = {
  id: string;
  vehicle_number: string;
  vehicle_name: string;
  driver_name: string;
  season: Season;
  fuel_amount: number;
  fuel_price: number;
  total_cost: number;
  date: string;
  note: string;
  city_id: string;
  company_id: string;
  created_by: string;
  created_at: string;
};

interface Props {
  city: string;
  companyId?: string;
  currentUser: AppUser;
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const inp: React.CSSProperties = {
  width: "100%",
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 11,
  padding: "11px 13px",
  fontSize: 14,
  color: "#e8e8f0",
  outline: "none",
  boxSizing: "border-box",
};

const fuelInp: React.CSSProperties = {
  width: "100%",
  background: "rgba(255,255,255,0.05)",
  border: "1.5px solid rgba(255,255,255,0.08)",
  borderRadius: 13,
  padding: "11px 14px",
  fontSize: 13,
  color: "#f0f0fa",
  outline: "none",
  boxSizing: "border-box",
};

const SEASON_META: Record<Season, { label: string; color: string; bg: string; icon: string }> = {
  winter: { label: "Зимний", color: "#60a5fa", bg: "rgba(96,165,250,0.12)", icon: "❄️" },
  summer: { label: "Летний", color: "#fbbf24", bg: "rgba(251,191,36,0.12)", icon: "☀️" },
};

const emptyFuelForm = {
  vehicle_number: "",
  vehicle_name: "",
  driver_name: "",
  season: "summer" as Season,
  fuel_amount: "",
  fuel_price: "",
  date: new Date().toISOString().split("T")[0],
  note: "",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function ExpensesSection({ city, companyId, currentUser }: Props) {
  const [tab, setTab] = useState<"expenses" | "fuel">("expenses");

  // ── Expenses state ──
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expLoading, setExpLoading] = useState(true);
  const [showExpForm, setShowExpForm] = useState(false);
  const [deleteExpConfirm, setDeleteExpConfirm] = useState<string | null>(null);
  const [expSaving, setExpSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [expForm, setExpForm] = useState({ expenseName: "", advanceAmount: "", totalAmount: "", comment: "" });
  const [expFormError, setExpFormError] = useState("");

  // ── Fuel state ──
  const [fuelRecords, setFuelRecords] = useState<FuelRecord[]>([]);
  const [fuelLoading, setFuelLoading] = useState(true);
  const [showFuelForm, setShowFuelForm] = useState(false);
  const [fuelForm, setFuelForm] = useState({ ...emptyFuelForm });
  const [fuelSaving, setFuelSaving] = useState(false);
  const [fuelSaveError, setFuelSaveError] = useState<string | null>(null);
  const [deleteFuelConfirm, setDeleteFuelConfirm] = useState<string | null>(null);
  const [filterSeason, setFilterSeason] = useState<Season | "all">("all");
  const [fuelSearch, setFuelSearch] = useState("");
  const [fuelSaveSuccess, setFuelSaveSuccess] = useState(false);

  // ── Load expenses ──
  const loadExpenses = useCallback(() => {
    setExpLoading(true);
    const q = new URLSearchParams({ cityId: city });
    if (companyId) q.set("companyId", companyId);
    fetch(`/api/admin/expenses?${q}`)
      .then(r => r.json())
      .then(data => { setExpenses(Array.isArray(data) ? data : []); setExpLoading(false); })
      .catch(() => setExpLoading(false));
  }, [city, companyId]);

  // ── Load fuel ──
  const loadFuel = useCallback(async () => {
    setFuelLoading(true);
    const q = new URLSearchParams();
    if (city) q.set("cityId", city);
    if (companyId) q.set("companyId", companyId);
    const res = await fetch(`/api/fuel?${q}`);
    const data = await res.json();
    const parsed = Array.isArray(data) ? data.map((r: FuelRecord) => ({
      ...r,
      fuel_amount: Number(r.fuel_amount),
      fuel_price: Number(r.fuel_price),
      total_cost: Number(r.total_cost),
    })) : [];
    setFuelRecords(parsed);
    setFuelLoading(false);
  }, [city, companyId]);

  useEffect(() => { loadExpenses(); }, [loadExpenses]);
  useEffect(() => { loadFuel(); }, [loadFuel]);

  // ── Expenses handlers ──
  const resetExpForm = () => { setExpForm({ expenseName: "", advanceAmount: "", totalAmount: "", comment: "" }); setExpFormError(""); };

  const handleSaveExp = async () => {
    if (!expForm.expenseName.trim()) { setExpFormError("Введите название расхода"); return; }
    setExpSaving(true);
    try {
      await fetch("/api/admin/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cityId: city, companyId: companyId || "",
          expenseName: expForm.expenseName.trim(),
          advanceAmount: parseFloat(expForm.advanceAmount) || 0,
          totalAmount: parseFloat(expForm.totalAmount) || 0,
          comment: expForm.comment.trim(),
          actorName: currentUser.name, actorRole: currentUser.role,
        }),
      });
      resetExpForm(); setShowExpForm(false); loadExpenses();
    } catch { setExpFormError("Ошибка сохранения"); }
    finally { setExpSaving(false); }
  };

  const handleDeleteExp = async (id: string) => {
    const q = new URLSearchParams({ id, actorName: currentUser.name, actorRole: currentUser.role });
    await fetch(`/api/admin/expenses?${q}`, { method: "DELETE" });
    setDeleteExpConfirm(null); loadExpenses();
  };

  // ── Fuel handlers ──
  const handleSaveFuel = async () => {
    if (!fuelForm.vehicle_number.trim() || !fuelForm.driver_name.trim() || !fuelForm.fuel_amount) return;
    setFuelSaving(true); setFuelSaveError(null);
    const res = await fetch("/api/fuel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cityId: city, companyId: companyId || "",
        vehicleNumber: fuelForm.vehicle_number.trim(),
        vehicleName: fuelForm.vehicle_name.trim(),
        driverName: fuelForm.driver_name.trim(),
        season: fuelForm.season,
        fuelAmount: parseFloat(fuelForm.fuel_amount) || 0,
        fuelPrice: parseFloat(fuelForm.fuel_price) || 0,
        date: fuelForm.date,
        note: fuelForm.note.trim(),
        createdBy: currentUser?.name || "",
      }),
    });
    if (res.ok) {
      setFuelForm({ ...emptyFuelForm, date: new Date().toISOString().split("T")[0] });
      setShowFuelForm(false); setFuelSaveSuccess(true);
      setTimeout(() => setFuelSaveSuccess(false), 2500);
      loadFuel();
    } else {
      const e = await res.json().catch(() => ({}));
      setFuelSaveError(e?.error || "Ошибка сохранения");
    }
    setFuelSaving(false);
  };

  const handleDeleteFuel = async (id: string) => {
    await fetch(`/api/fuel?id=${id}`, { method: "DELETE" });
    setDeleteFuelConfirm(null); loadFuel();
  };

  // ── Derived ──
  const filteredExpenses = expenses.filter(e => {
    if (!searchQuery) return true;
    const s = searchQuery.toLowerCase();
    return e.expense_name?.toLowerCase().includes(s) || e.comment?.toLowerCase().includes(s) || e.created_by?.toLowerCase().includes(s);
  });
  const totalAdvance = filteredExpenses.reduce((s, e) => s + Number(e.advance_amount), 0);
  const totalSum = filteredExpenses.reduce((s, e) => s + Number(e.total_amount), 0);
  const fmt = (n: number) => n.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const filteredFuel = fuelRecords.filter(r => {
    if (filterSeason !== "all" && r.season !== filterSeason) return false;
    if (!fuelSearch) return true;
    const s = fuelSearch.toLowerCase();
    return r.vehicle_number.toLowerCase().includes(s) || r.driver_name.toLowerCase().includes(s) || (r.vehicle_name?.toLowerCase().includes(s));
  });
  const totalLitres = filteredFuel.reduce((acc, r) => acc + (r.fuel_amount || 0), 0);
  const totalCost = filteredFuel.reduce((acc, r) => acc + (r.total_cost || 0), 0);

  return (
    <div style={{ maxWidth: 820, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "#e8e8f0", margin: 0 }}>💰 Расходы</h2>
        <p style={{ fontSize: 12, color: "#55556a", marginTop: 4 }}>Только для администратора</p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, background: "rgba(255,255,255,0.03)", borderRadius: 16, padding: 5, marginBottom: 24 }}>
        {([
          { id: "expenses", label: "Общие расходы", icon: "💰" },
          { id: "fuel",     label: "Расход топлива", icon: "⛽" },
        ] as const).map(t => (
          <motion.button key={t.id} whileTap={{ scale: 0.97 }}
            onClick={() => setTab(t.id)}
            style={{
              flex: 1, padding: "10px 14px", borderRadius: 12, border: "none", cursor: "pointer",
              background: tab === t.id ? "rgba(255,255,255,0.08)" : "transparent",
              color: tab === t.id ? "#e8e8f0" : "#55556a",
              fontSize: 13, fontWeight: tab === t.id ? 700 : 500,
              outline: tab === t.id ? "1px solid rgba(255,255,255,0.1)" : "none",
              transition: "all 0.18s",
            }}>
            {t.icon} {t.label}
          </motion.button>
        ))}
      </div>

      <AnimatePresence mode="wait">

        {/* ═══════════════════ TAB: EXPENSES ═══════════════════ */}
        {tab === "expenses" && (
          <motion.div key="expenses" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>

            {/* Add button */}
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
              <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                onClick={() => { resetExpForm(); setShowExpForm(true); }}
                style={{ background: "linear-gradient(135deg, #f39c12, #e67e22)", border: "none", borderRadius: 14, padding: "13px 30px", fontSize: 14, fontWeight: 600, color: "white", cursor: "pointer", boxShadow: "0 4px 14px rgba(243,156,18,0.35)", display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap" }}>
                <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> Добавить расход
              </motion.button>
            </div>

            {/* Search */}
            <div className="search-wrap">
              <input type="text" placeholder="Поиск по названию или комментарию..."
                value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "10px 14px 10px 38px", fontSize: 13, color: "#e8e8f0", outline: "none", boxSizing: "border-box" }} />
              <div className="search-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg></div>
            </div>

            {/* Stats */}
            {expenses.length > 0 && (
              <div className="grid-cols-3" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
                {[
                  { label: "Записей", value: expenses.length.toString(), icon: "📋", color: "#4f8ef7" },
                  { label: "Итого авансов", value: `${fmt(totalAdvance)} ₽`, icon: "💵", color: "#f39c12" },
                  { label: "Итого расходов", value: `${fmt(totalSum)} ₽`, icon: "💰", color: "#2ecc71" },
                ].map(stat => (
                  <div key={stat.label} style={{ background: "rgba(19,19,26,0.8)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "14px 16px", display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 22 }}>{stat.icon}</span>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: stat.color }}>{stat.value}</div>
                      <div style={{ fontSize: 11, color: "#6b6b80" }}>{stat.label}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* List */}
            {expLoading ? (
              <div style={{ textAlign: "center", padding: "60px", color: "#55556a" }}>Загрузка...</div>
            ) : filteredExpenses.length === 0 ? (
              <div style={{ background: "rgba(19,19,26,0.4)", border: "1px dashed rgba(255,255,255,0.08)", borderRadius: 18, padding: "56px", textAlign: "center", color: "#55556a" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>💰</div>
                <div style={{ fontSize: 15 }}>Расход не найден</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {filteredExpenses.map((exp, i) => (
                  <motion.div key={exp.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: i * 0.04 }}
                    style={{ background: "rgba(19,19,26,0.85)", border: "1px solid rgba(243,156,18,0.12)", borderRadius: 16, padding: "16px 18px" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: "#e8e8f0", marginBottom: 8 }}>{exp.expense_name}</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: exp.comment ? 8 : 0 }}>
                          <div style={{ background: "rgba(243,156,18,0.1)", border: "1px solid rgba(243,156,18,0.2)", borderRadius: 8, padding: "5px 12px" }}>
                            <span style={{ fontSize: 10, color: "#6b6b80", display: "block" }}>Аванс расхода</span>
                            <span style={{ fontSize: 14, fontWeight: 700, color: "#f39c12" }}>{fmt(Number(exp.advance_amount))} ₽</span>
                          </div>
                          <div style={{ background: "rgba(46,204,113,0.08)", border: "1px solid rgba(46,204,113,0.2)", borderRadius: 8, padding: "5px 12px" }}>
                            <span style={{ fontSize: 10, color: "#6b6b80", display: "block" }}>Сумма расхода</span>
                            <span style={{ fontSize: 14, fontWeight: 700, color: "#2ecc71" }}>{fmt(Number(exp.total_amount))} ₽</span>
                          </div>
                        </div>
                        {exp.comment && (
                          <div style={{ fontSize: 13, color: "#8888a0", background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "7px 10px", borderLeft: "3px solid rgba(255,255,255,0.1)" }}>{exp.comment}</div>
                        )}
                        <div style={{ fontSize: 11, color: "#44444e", marginTop: 8 }}>
                          {exp.created_by}{exp.created_by_role ? ` (${exp.created_by_role})` : ""} · {new Date(exp.created_at).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                      <motion.button whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }}
                        onClick={() => setDeleteExpConfirm(exp.id)}
                        style={{ background: "rgba(230,57,70,0.08)", border: "1px solid rgba(230,57,70,0.18)", borderRadius: 10, padding: "7px 12px", fontSize: 12, color: "#e63946", cursor: "pointer", flexShrink: 0 }}>
                        Удалить
                      </motion.button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* ═══════════════════ TAB: FUEL ═══════════════════ */}
        {tab === "fuel" && (
          <motion.div key="fuel" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>

            {/* Add button */}
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }}
                onClick={() => { setShowFuelForm(v => !v); setFuelSaveError(null); }}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "13px 28px", borderRadius: 14, background: showFuelForm ? "rgba(251,191,36,0.15)" : "rgba(255,255,255,0.06)", border: `1px solid ${showFuelForm ? "rgba(251,191,36,0.3)" : "rgba(255,255,255,0.1)"}`, color: showFuelForm ? "#fbbf24" : "#f0f0fa", fontSize: 13, cursor: "pointer", fontWeight: 600 }}>
                <Plus size={15} /> Добавить запись
              </motion.button>
            </div>

            {/* Season filter */}
            <div style={{ display: "flex", gap: 8, background: "rgba(255,255,255,0.03)", borderRadius: 18, padding: 4, marginBottom: 16 }}>
              {(["all", "summer", "winter"] as const).map(s => {
                const isActive = filterSeason === s;
                const meta = s === "all" ? { label: "Все периоды", color: "#a0a0c0", bg: "rgba(160,160,192,0.12)", icon: "⛽" } : SEASON_META[s];
                return (
                  <motion.button key={s} whileTap={{ scale: 0.96 }}
                    onClick={() => setFilterSeason(s)}
                    style={{ flex: 1, padding: "10px 12px", borderRadius: 14, border: "none", background: isActive ? meta.bg : "transparent", color: isActive ? meta.color : "#404058", fontSize: 13, fontWeight: isActive ? 700 : 500, cursor: "pointer", transition: "all 0.2s", outline: isActive ? `1px solid ${meta.color}33` : "none" }}>
                    {meta.icon} {meta.label}
                  </motion.button>
                );
              })}
            </div>

            {/* Search */}
            <div className="search-wrap">
              <input type="text" placeholder="Поиск по номеру авто или водителю..."
                value={fuelSearch} onChange={e => setFuelSearch(e.target.value)}
                style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1.5px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "12px 16px 12px 42px", fontSize: 13, color: "#f0f0fa", outline: "none", boxSizing: "border-box" }}
                onFocus={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.18)"}
                onBlur={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"} />
              <div className="search-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg></div>
            </div>

            {/* Stats */}
            {!fuelLoading && filteredFuel.length > 0 && (
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
                <div style={{ flex: 1, minWidth: 140, background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.18)", borderRadius: 14, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
                  <Fuel size={18} style={{ color: "#fbbf24", flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: "#fbbf24" }}>{totalLitres.toFixed(1)} л</div>
                    <div style={{ fontSize: 10, color: "#505068" }}>Итого литров</div>
                  </div>
                </div>
                {totalCost > 0 && (
                  <div style={{ flex: 1, minWidth: 140, background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.18)", borderRadius: 14, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 18, color: "#34d399" }}>₽</span>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: "#34d399" }}>{totalCost.toLocaleString("ru-RU")} ₽</div>
                      <div style={{ fontSize: 10, color: "#505068" }}>Итого сумма</div>
                    </div>
                  </div>
                )}
                <div style={{ minWidth: 80, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "12px 16px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "#f0f0fa" }}>{filteredFuel.length}</div>
                  <div style={{ fontSize: 10, color: "#404058" }}>Записей</div>
                </div>
              </div>
            )}

            {/* List */}
            {fuelLoading ? (
              <div style={{ display: "flex", justifyContent: "center", padding: "48px 0" }}>
                <Loader2 className="animate-spin" size={28} style={{ color: "#404058" }} />
              </div>
            ) : filteredFuel.length === 0 ? (
              <div style={{ textAlign: "center", padding: "56px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                <Fuel size={44} style={{ color: "#202038", opacity: 0.5 }} />
                <div style={{ fontSize: 15, color: "#404058", fontWeight: 600 }}>Записей пока нет</div>
                <div style={{ fontSize: 12, color: "#303048" }}>Нажмите «Добавить запись» выше</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {filteredFuel.map((r, i) => {
                  const sm = SEASON_META[r.season];
                  return (
                    <motion.div key={r.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: i * 0.03 }}
                      style={{ background: "rgba(18,18,30,0.9)", border: "1.5px solid rgba(255,255,255,0.06)", borderRadius: 18, padding: "14px 16px" }}>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                        <div style={{ width: 44, height: 44, borderRadius: 14, flexShrink: 0, background: sm.bg, border: `1px solid ${sm.color}33`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                          {sm.icon}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                            <span style={{ fontSize: 15, fontWeight: 800, color: "#f0f0fa" }}>{r.vehicle_number}</span>
                            {r.vehicle_name && <span style={{ fontSize: 12, color: "#505068" }}>{r.vehicle_name}</span>}
                            <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 8, background: sm.bg, color: sm.color, border: `1px solid ${sm.color}33` }}>{sm.icon} {sm.label}</span>
                          </div>
                          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 12, color: "#505068" }}>
                            <span>👤 {r.driver_name}</span>
                            <span style={{ color: "#fbbf24", fontWeight: 600 }}>⛽ {r.fuel_amount} л</span>
                            {r.total_cost > 0 && <span style={{ color: "#34d399", fontWeight: 600 }}>₽ {r.total_cost.toLocaleString("ru-RU")}</span>}
                            <span style={{ color: "#383855" }}>📅 {new Date(r.date).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" })}</span>
                          </div>
                          {r.note && <div style={{ fontSize: 11, color: "#383855", marginTop: 4, fontStyle: "italic" }}>{r.note}</div>}
                        </div>
                        <motion.button whileTap={{ scale: 0.92 }}
                          onClick={() => setDeleteFuelConfirm(r.id)}
                          style={{ width: 36, height: 36, borderRadius: 11, background: "transparent", border: "1px solid rgba(255,255,255,0.06)", color: "#383855", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                          onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,0.1)"; e.currentTarget.style.color = "#f87171"; }}
                          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#383855"; }}>
                          <Trash2 size={14} />
                        </motion.button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════ MODAL: Add Expense ═══════════════ */}
      <AnimatePresence>
        {showExpForm && (
          <div style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 20 }}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowExpForm(false)}
              style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.72)", backdropFilter: "blur(6px)" }} />
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.95 }} transition={{ type: "spring", stiffness: 300, damping: 28 }}
              className="modal-mobile" style={{ position: "relative", background: "#14141e", border: "1px solid rgba(243,156,18,0.2)", borderRadius: 22, padding: "28px 24px", width: "100%", maxWidth: 480, zIndex: 1, boxShadow: "0 32px 100px rgba(0,0,0,0.8)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <div style={{ width: 38, height: 38, borderRadius: 11, background: "linear-gradient(135deg, #f39c12, #e67e22)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>💰</div>
                <div>
                  <h3 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>Новый расход</h3>
                  <p style={{ fontSize: 12, color: "#6b6b80", margin: 0 }}>Заполните поля расхода</p>
                </div>
              </div>
              <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "18px 0" }} />
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 11, color: "#6b6b80", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>Расход *</label>
                <input type="text" value={expForm.expenseName}
                  onChange={e => { setExpForm(f => ({ ...f, expenseName: e.target.value })); setExpFormError(""); }}
                  placeholder="Например: Закупка оборудования" style={inp} autoFocus />
              </div>
              <div className="grid-cols-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, color: "#6b6b80", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>Аванс расхода (₽)</label>
                  <input type="number" min="0" step="0.01" value={expForm.advanceAmount}
                    onChange={e => setExpForm(f => ({ ...f, advanceAmount: e.target.value }))}
                    placeholder="0.00" style={{ ...inp, borderColor: "rgba(243,156,18,0.25)" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, color: "#6b6b80", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>Сумма расхода (₽)</label>
                  <input type="number" min="0" step="0.01" value={expForm.totalAmount}
                    onChange={e => setExpForm(f => ({ ...f, totalAmount: e.target.value }))}
                    placeholder="0.00" style={{ ...inp, borderColor: "rgba(46,204,113,0.2)" }} />
                </div>
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontSize: 11, color: "#6b6b80", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Комментарий <span style={{ color: "#44444e", textTransform: "none", fontWeight: 400 }}>(необязательно)</span>
                </label>
                <textarea value={expForm.comment} onChange={e => setExpForm(f => ({ ...f, comment: e.target.value }))}
                  placeholder="Любая заметка или пояснение..." rows={3}
                  style={{ ...inp, resize: "vertical", minHeight: 70, lineHeight: 1.5, fontFamily: "inherit" }} />
              </div>
              {expFormError && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ fontSize: 12, color: "#e63946", marginBottom: 12 }}>{expFormError}</motion.p>}
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setShowExpForm(false)} style={{ flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "12px", fontSize: 14, color: "#888", cursor: "pointer" }}>Отмена</button>
                <motion.button onClick={handleSaveExp} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} disabled={expSaving}
                  style={{ flex: 2, background: expSaving ? "rgba(243,156,18,0.3)" : "linear-gradient(135deg, #f39c12, #e67e22)", border: "none", borderRadius: 12, padding: "12px", fontSize: 14, fontWeight: 600, color: "white", cursor: expSaving ? "not-allowed" : "pointer", boxShadow: expSaving ? "none" : "0 4px 16px rgba(243,156,18,0.3)" }}>
                  {expSaving ? "Сохранение..." : "Сохранить"}
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ═══════════════ MODAL: Add Fuel ═══════════════ */}
      <AnimatePresence>
        {showFuelForm && (
          <div style={{ position: "fixed", inset: 0, zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowFuelForm(false)}
              style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.78)", backdropFilter: "blur(10px)" }} />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }} transition={{ type: "spring", stiffness: 340, damping: 28 }}
              style={{ position: "relative", background: "#12121e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 24, padding: "26px 22px", width: "100%", maxWidth: 540, zIndex: 1, boxShadow: "0 40px 100px rgba(0,0,0,0.7)", maxHeight: "90vh", overflowY: "auto" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
                <div>
                  <h3 style={{ fontSize: 17, fontWeight: 700, color: "#f0f0fa", margin: 0 }}>⛽ Добавить расход топлива</h3>
                  <p style={{ fontSize: 12, color: "#404058", margin: "4px 0 0" }}>Заполните поля и сохраните запись</p>
                </div>
                <button onClick={() => setShowFuelForm(false)}
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#888" }}>
                  <X size={15} />
                </button>
              </div>

              {/* Season selector */}
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: "block", fontSize: 10, color: "#404058", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, marginBottom: 8 }}>Период *</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {(["summer", "winter"] as Season[]).map(s => {
                    const m = SEASON_META[s];
                    const active = fuelForm.season === s;
                    return (
                      <motion.button key={s} whileTap={{ scale: 0.96 }}
                        onClick={() => setFuelForm(f => ({ ...f, season: s }))}
                        style={{ flex: 1, padding: "11px 14px", borderRadius: 14, border: `1.5px solid ${active ? m.color + "55" : "rgba(255,255,255,0.08)"}`, background: active ? m.bg : "rgba(255,255,255,0.03)", color: active ? m.color : "#404058", fontSize: 13, fontWeight: active ? 700 : 500, cursor: "pointer" }}>
                        {m.icon} {m.label}
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 18 }}>
                <div className="grid-cols-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 10, color: "#404058", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, marginBottom: 6 }}>Номер машины *</label>
                    <input placeholder="А123БВ 77" value={fuelForm.vehicle_number}
                      onChange={e => setFuelForm(f => ({ ...f, vehicle_number: e.target.value }))}
                      style={fuelInp}
                      onFocus={e => e.currentTarget.style.borderColor = "rgba(251,191,36,0.4)"}
                      onBlur={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"} />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 10, color: "#404058", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, marginBottom: 6 }}>Название (марка)</label>
                    <input placeholder="Ford Transit" value={fuelForm.vehicle_name}
                      onChange={e => setFuelForm(f => ({ ...f, vehicle_name: e.target.value }))}
                      style={fuelInp}
                      onFocus={e => e.currentTarget.style.borderColor = "rgba(251,191,36,0.4)"}
                      onBlur={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"} />
                  </div>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 10, color: "#404058", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, marginBottom: 6 }}>Фамилия водителя *</label>
                  <input placeholder="Иванов И.И." value={fuelForm.driver_name}
                    onChange={e => setFuelForm(f => ({ ...f, driver_name: e.target.value }))}
                    style={fuelInp}
                    onFocus={e => e.currentTarget.style.borderColor = "rgba(251,191,36,0.4)"}
                    onBlur={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"} />
                </div>
                <div className="grid-cols-3" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 10, color: "#404058", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, marginBottom: 6 }}>Литров *</label>
                    <input type="number" min="0" step="0.1" placeholder="50" value={fuelForm.fuel_amount}
                      onChange={e => setFuelForm(f => ({ ...f, fuel_amount: e.target.value }))}
                      style={fuelInp}
                      onFocus={e => e.currentTarget.style.borderColor = "rgba(251,191,36,0.4)"}
                      onBlur={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"} />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 10, color: "#404058", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, marginBottom: 6 }}>Цена за л (₽)</label>
                    <input type="number" min="0" step="0.01" placeholder="58.50" value={fuelForm.fuel_price}
                      onChange={e => setFuelForm(f => ({ ...f, fuel_price: e.target.value }))}
                      style={fuelInp}
                      onFocus={e => e.currentTarget.style.borderColor = "rgba(251,191,36,0.4)"}
                      onBlur={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"} />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 10, color: "#404058", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, marginBottom: 6 }}>Дата</label>
                    <input type="date" value={fuelForm.date}
                      onChange={e => setFuelForm(f => ({ ...f, date: e.target.value }))}
                      style={fuelInp}
                      onFocus={e => e.currentTarget.style.borderColor = "rgba(251,191,36,0.4)"}
                      onBlur={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"} />
                  </div>
                </div>
                {fuelForm.fuel_amount && fuelForm.fuel_price && (
                  <div style={{ background: "rgba(52,211,153,0.07)", border: "1px solid rgba(52,211,153,0.18)", borderRadius: 12, padding: "10px 14px", fontSize: 13, color: "#34d399" }}>
                    Итого: <strong>{(parseFloat(fuelForm.fuel_amount) * parseFloat(fuelForm.fuel_price)).toLocaleString("ru-RU", { maximumFractionDigits: 2 })} ₽</strong>
                  </div>
                )}
                <div>
                  <label style={{ display: "block", fontSize: 10, color: "#404058", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, marginBottom: 6 }}>Примечание</label>
                  <textarea placeholder="Необязательно..." value={fuelForm.note}
                    onChange={e => setFuelForm(f => ({ ...f, note: e.target.value }))}
                    rows={2} style={{ ...fuelInp, resize: "vertical", fontFamily: "inherit" }}
                    onFocus={e => e.currentTarget.style.borderColor = "rgba(251,191,36,0.4)"}
                    onBlur={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"} />
                </div>
              </div>

              {fuelSaveError && (
                <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 12, padding: "10px 14px", fontSize: 12, color: "#f87171", marginBottom: 14 }}>{fuelSaveError}</div>
              )}

              <div style={{ display: "flex", gap: 10 }}>
                <motion.button whileTap={{ scale: 0.97 }} onClick={handleSaveFuel}
                  disabled={fuelSaving || !fuelForm.vehicle_number.trim() || !fuelForm.driver_name.trim() || !fuelForm.fuel_amount}
                  style={{ flex: 1, padding: "13px", background: "linear-gradient(135deg, #fbbf24, #f59e0b)", border: "none", borderRadius: 14, fontSize: 13, fontWeight: 700, color: "#0a0a14", cursor: "pointer", opacity: fuelSaving || !fuelForm.vehicle_number.trim() || !fuelForm.driver_name.trim() || !fuelForm.fuel_amount ? 0.4 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                  {fuelSaving ? <Loader2 size={14} className="animate-spin" /> : <Fuel size={14} />}
                  Сохранить запись
                </motion.button>
                <motion.button whileTap={{ scale: 0.97 }} onClick={() => setShowFuelForm(false)}
                  style={{ padding: "13px 20px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, fontSize: 13, color: "#606078", cursor: "pointer" }}>
                  Отмена
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ═══════════════ MODAL: Delete Expense ═══════════════ */}
      <AnimatePresence>
        {deleteExpConfirm && (
          <div style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300, padding: 20 }}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setDeleteExpConfirm(null)}
              style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }} />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              style={{ position: "relative", background: "#14141e", border: "1px solid rgba(230,57,70,0.3)", borderRadius: 18, padding: "28px 24px", width: "100%", maxWidth: 320, zIndex: 1, textAlign: "center" }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>🗑️</div>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Удалить расход?</h3>
              <p style={{ fontSize: 13, color: "#6b6b80", marginBottom: 22 }}>Запись удалится из журнала</p>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setDeleteExpConfirm(null)} style={{ flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "11px", fontSize: 14, color: "#888", cursor: "pointer" }}>Отмена</button>
                <motion.button whileTap={{ scale: 0.96 }} onClick={() => handleDeleteExp(deleteExpConfirm)}
                  style={{ flex: 1, background: "linear-gradient(135deg, #e63946, #c1121f)", border: "none", borderRadius: 12, padding: "11px", fontSize: 14, fontWeight: 600, color: "white", cursor: "pointer" }}>Удалить</motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ═══════════════ MODAL: Delete Fuel ═══════════════ */}
      <AnimatePresence>
        {deleteFuelConfirm && (
          <div style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 20 }}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setDeleteFuelConfirm(null)}
              style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(12px)" }} />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              style={{ position: "relative", zIndex: 10, background: "#12121e", border: "1.5px solid rgba(239,68,68,0.2)", borderRadius: 24, padding: "28px 24px", width: "100%", maxWidth: 320, textAlign: "center" }}>
              <div style={{ fontSize: 38, marginBottom: 12 }}>🗑️</div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "#f0f0fa", marginBottom: 6 }}>Удалить запись?</h3>
              <p style={{ fontSize: 12, color: "#505068", marginBottom: 22 }}>Это действие нельзя отменить.</p>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setDeleteFuelConfirm(null)} style={{ flex: 1, padding: "13px", borderRadius: 14, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "#606078", fontSize: 13, cursor: "pointer" }}>Отмена</button>
                <motion.button whileTap={{ scale: 0.96 }} onClick={() => handleDeleteFuel(deleteFuelConfirm)}
                  style={{ flex: 1, padding: "13px", borderRadius: 14, background: "rgba(239,68,68,0.12)", border: "1.5px solid rgba(239,68,68,0.25)", color: "#f87171", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                  Удалить
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {fuelSaveSuccess && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20 }}
            style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", zIndex: 60, background: "#22c55e", color: "white", fontSize: 13, fontWeight: 600, padding: "13px 30px", borderRadius: 16, boxShadow: "0 8px 32px rgba(34,197,94,0.4)", display: "flex", alignItems: "center", gap: 8 }}>
            ✅ Запись сохранена
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
