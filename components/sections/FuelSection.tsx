"use client";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Trash2, Fuel, Plus, X } from "lucide-react";
import { AppUser } from "@/lib/auth";

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

const SEASON_META: Record<Season, { label: string; color: string; bg: string; icon: string }> = {
  winter: { label: "Зимний", color: "#60a5fa", bg: "rgba(96,165,250,0.12)", icon: "❄️" },
  summer: { label: "Летний", color: "#fbbf24", bg: "rgba(251,191,36,0.12)", icon: "☀️" },
};

const emptyForm = {
  vehicle_number: "",
  vehicle_name: "",
  driver_name: "",
  season: "summer" as Season,
  fuel_amount: "",
  fuel_price: "",
  date: new Date().toISOString().split("T")[0],
  note: "",
};

export default function FuelSection({
  city, companyId, currentUser,
}: {
  city: string; companyId?: string; currentUser?: AppUser;
}) {
  const [records, setRecords] = useState<FuelRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [filterSeason, setFilterSeason] = useState<Season | "all">("all");
  const [search, setSearch] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    const q = new URLSearchParams();
    if (city) q.set("cityId", city);
    if (companyId) q.set("companyId", companyId);
    const res = await fetch(`/api/fuel?${q}`);
    const data = await res.json();
    setRecords(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [city, companyId]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const handleSave = async () => {
    if (!form.vehicle_number.trim() || !form.driver_name.trim() || !form.fuel_amount) return;
    setSaving(true);
    setSaveError(null);
    const res = await fetch("/api/fuel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cityId: city,
        companyId: companyId || "",
        vehicleNumber: form.vehicle_number.trim(),
        vehicleName: form.vehicle_name.trim(),
        driverName: form.driver_name.trim(),
        season: form.season,
        fuelAmount: parseFloat(form.fuel_amount) || 0,
        fuelPrice: parseFloat(form.fuel_price) || 0,
        date: form.date,
        note: form.note.trim(),
        createdBy: currentUser?.name || "",
      }),
    });
    if (res.ok) {
      setForm({ ...emptyForm, date: new Date().toISOString().split("T")[0] });
      setShowForm(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
      fetchRecords();
    } else {
      const e = await res.json().catch(() => ({}));
      setSaveError(e?.error || "Ошибка сохранения");
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/fuel?id=${id}`, { method: "DELETE" });
    setDeleteConfirm(null);
    fetchRecords();
  };

  const filtered = records.filter(r => {
    if (filterSeason !== "all" && r.season !== filterSeason) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      r.vehicle_number.toLowerCase().includes(s) ||
      r.driver_name.toLowerCase().includes(s) ||
      (r.vehicle_name?.toLowerCase().includes(s))
    );
  });

  const totalLitres = filtered.reduce((acc, r) => acc + (r.fuel_amount || 0), 0);
  const totalCost   = filtered.reduce((acc, r) => acc + (r.total_cost || 0), 0);

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: "#f0f0fa", letterSpacing: "-0.4px" }}>Расход топлива</h2>
            <p style={{ fontSize: 12, color: "#404058", marginTop: 2 }}>Учёт топлива по транспортным средствам</p>
          </div>
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }}
            onClick={() => { setShowForm(v => !v); setSaveError(null); }}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "13px 28px", borderRadius: 14, background: showForm ? "rgba(251,191,36,0.15)" : "rgba(255,255,255,0.06)", border: `1px solid ${showForm ? "rgba(251,191,36,0.3)" : "rgba(255,255,255,0.1)"}`, color: showForm ? "#fbbf24" : "#f0f0fa", fontSize: 13, cursor: "pointer", fontWeight: 600 }}>
            <Plus size={15} /> Добавить
          </motion.button>
        </div>

        {/* Season filter */}
        <div style={{ display: "flex", gap: 8, background: "rgba(255,255,255,0.03)", borderRadius: 18, padding: 4 }}>
          {(["all", "summer", "winter"] as const).map(s => {
            const isActive = filterSeason === s;
            const meta = s === "all" ? { label: "Все периоды", color: "#a0a0c0", bg: "rgba(160,160,192,0.12)", icon: "⛽" } : SEASON_META[s];
            return (
              <motion.button key={s} whileTap={{ scale: 0.96 }}
                onClick={() => setFilterSeason(s)}
                style={{
                  flex: 1, padding: "10px 12px", borderRadius: 14, border: "none",
                  background: isActive ? meta.bg : "transparent",
                  color: isActive ? meta.color : "#404058",
                  fontSize: 13, fontWeight: isActive ? 700 : 500, cursor: "pointer",
                  transition: "all 0.2s",
                  outline: isActive ? `1px solid ${meta.color}33` : "none",
                }}>
                {meta.icon} {meta.label}
              </motion.button>
            );
          })}
        </div>

        {/* Search */}
        <div className="search-wrap">
          <input type="text" placeholder="Поиск по номеру авто или водителю..."
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1.5px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "12px 16px 12px 42px", fontSize: 13, color: "#f0f0fa", outline: "none", boxSizing: "border-box" }}
            onFocus={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.18)"}
            onBlur={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"} />
          <div className="search-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg></div>
        </div>

        {/* Stats */}
        {!loading && filtered.length > 0 && (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
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
              <div style={{ fontSize: 18, fontWeight: 800, color: "#f0f0fa" }}>{filtered.length}</div>
              <div style={{ fontSize: 10, color: "#404058" }}>Записей</div>
            </div>
          </div>
        )}

        {/* Records list */}
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "48px 0" }}>
            <Loader2 className="animate-spin" size={28} style={{ color: "#404058" }} />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "56px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
            <Fuel size={44} style={{ color: "#202038", opacity: 0.5 }} />
            <div style={{ fontSize: 15, color: "#404058", fontWeight: 600 }}>Записей пока нет</div>
            <div style={{ fontSize: 12, color: "#303048" }}>Нажмите «Добавить» выше</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.map((r, i) => {
              const sm = SEASON_META[r.season];
              return (
                <motion.div key={r.id}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: i * 0.03 }}
                  style={{ background: "rgba(18,18,30,0.9)", border: "1.5px solid rgba(255,255,255,0.06)", borderRadius: 18, padding: "14px 16px" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    {/* Icon */}
                    <div style={{ width: 44, height: 44, borderRadius: 14, flexShrink: 0, background: sm.bg, border: `1px solid ${sm.color}33`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                      {sm.icon}
                    </div>
                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                        <span style={{ fontSize: 15, fontWeight: 800, color: "#f0f0fa" }}>{r.vehicle_number}</span>
                        {r.vehicle_name && <span style={{ fontSize: 12, color: "#505068" }}>{r.vehicle_name}</span>}
                        <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 8, background: sm.bg, color: sm.color, border: `1px solid ${sm.color}33` }}>
                          {sm.icon} {sm.label}
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 12, color: "#505068" }}>
                        <span>👤 {r.driver_name}</span>
                        <span style={{ color: "#fbbf24", fontWeight: 600 }}>⛽ {r.fuel_amount} л</span>
                        {r.total_cost > 0 && <span style={{ color: "#34d399", fontWeight: 600 }}>₽ {r.total_cost.toLocaleString("ru-RU")}</span>}
                        <span style={{ color: "#383855" }}>📅 {new Date(r.date).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" })}</span>
                      </div>
                      {r.note && <div style={{ fontSize: 11, color: "#383855", marginTop: 4, fontStyle: "italic" }}>{r.note}</div>}
                    </div>
                    {/* Delete */}
                    <motion.button whileTap={{ scale: 0.92 }}
                      onClick={() => setDeleteConfirm(r.id)}
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
      </div>

        <AnimatePresence>
          {showForm && (
            <div style={{ position: "fixed", inset: 0, zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setShowForm(false)}
                style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.78)", backdropFilter: "blur(10px)" }} />
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }} transition={{ type: "spring", stiffness: 340, damping: 28 }}
                className="modal-content" style={{ position: "relative", background: "#12121e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 24, padding: "26px 22px", width: "100%", maxWidth: 540, zIndex: 1, boxShadow: "0 40px 100px rgba(0,0,0,0.7)", maxHeight: "90vh", overflowY: "auto" }}>

              {/* Modal header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
                <div>
                  <h3 style={{ fontSize: 17, fontWeight: 700, color: "#f0f0fa", margin: 0 }}>Добавить расход топлива</h3>
                  <p style={{ fontSize: 12, color: "#404058", margin: "4px 0 0" }}>Заполните поля и сохраните запись</p>
                </div>
                <button onClick={() => setShowForm(false)}
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
                    const active = form.season === s;
                    return (
                      <motion.button key={s} whileTap={{ scale: 0.96 }}
                        onClick={() => setForm(f => ({ ...f, season: s }))}
                        style={{
                          flex: 1, padding: "11px 14px", borderRadius: 14, border: `1.5px solid ${active ? m.color + "55" : "rgba(255,255,255,0.08)"}`,
                          background: active ? m.bg : "rgba(255,255,255,0.03)",
                          color: active ? m.color : "#404058",
                          fontSize: 13, fontWeight: active ? 700 : 500, cursor: "pointer",
                        }}>
                        {m.icon} {m.label}
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Fields */}
              <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 18 }}>

                {/* Row 1: vehicle number + vehicle name */}
                <div className="grid-cols-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 10, color: "#404058", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, marginBottom: 6 }}>Номер машины *</label>
                    <input placeholder="А123БВ 77" value={form.vehicle_number}
                      onChange={e => setForm(f => ({ ...f, vehicle_number: e.target.value }))}
                      style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1.5px solid rgba(255,255,255,0.08)", borderRadius: 13, padding: "11px 14px", fontSize: 13, color: "#f0f0fa", outline: "none", boxSizing: "border-box" }}
                      onFocus={e => e.currentTarget.style.borderColor = "rgba(251,191,36,0.4)"}
                      onBlur={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"} />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 10, color: "#404058", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, marginBottom: 6 }}>Название (марка)</label>
                    <input placeholder="Ford Transit" value={form.vehicle_name}
                      onChange={e => setForm(f => ({ ...f, vehicle_name: e.target.value }))}
                      style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1.5px solid rgba(255,255,255,0.08)", borderRadius: 13, padding: "11px 14px", fontSize: 13, color: "#f0f0fa", outline: "none", boxSizing: "border-box" }}
                      onFocus={e => e.currentTarget.style.borderColor = "rgba(251,191,36,0.4)"}
                      onBlur={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"} />
                  </div>
                </div>

                {/* Row 2: driver */}
                <div>
                  <label style={{ display: "block", fontSize: 10, color: "#404058", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, marginBottom: 6 }}>Фамилия водителя *</label>
                  <input placeholder="Иванов И.И." value={form.driver_name}
                    onChange={e => setForm(f => ({ ...f, driver_name: e.target.value }))}
                    style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1.5px solid rgba(255,255,255,0.08)", borderRadius: 13, padding: "11px 14px", fontSize: 13, color: "#f0f0fa", outline: "none", boxSizing: "border-box" }}
                    onFocus={e => e.currentTarget.style.borderColor = "rgba(251,191,36,0.4)"}
                    onBlur={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"} />
                </div>

                {/* Row 3: fuel amount + price + date */}
                <div className="grid-cols-3" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 10, color: "#404058", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, marginBottom: 6 }}>Литров *</label>
                    <input type="number" min="0" step="0.1" placeholder="50" value={form.fuel_amount}
                      onChange={e => setForm(f => ({ ...f, fuel_amount: e.target.value }))}
                      style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1.5px solid rgba(255,255,255,0.08)", borderRadius: 13, padding: "11px 14px", fontSize: 13, color: "#f0f0fa", outline: "none", boxSizing: "border-box" }}
                      onFocus={e => e.currentTarget.style.borderColor = "rgba(251,191,36,0.4)"}
                      onBlur={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"} />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 10, color: "#404058", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, marginBottom: 6 }}>Цена за л (₽)</label>
                    <input type="number" min="0" step="0.01" placeholder="58.50" value={form.fuel_price}
                      onChange={e => setForm(f => ({ ...f, fuel_price: e.target.value }))}
                      style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1.5px solid rgba(255,255,255,0.08)", borderRadius: 13, padding: "11px 14px", fontSize: 13, color: "#f0f0fa", outline: "none", boxSizing: "border-box" }}
                      onFocus={e => e.currentTarget.style.borderColor = "rgba(251,191,36,0.4)"}
                      onBlur={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"} />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 10, color: "#404058", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, marginBottom: 6 }}>Дата</label>
                    <input type="date" value={form.date}
                      onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                      style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1.5px solid rgba(255,255,255,0.08)", borderRadius: 13, padding: "11px 14px", fontSize: 13, color: "#f0f0fa", outline: "none", boxSizing: "border-box" }}
                      onFocus={e => e.currentTarget.style.borderColor = "rgba(251,191,36,0.4)"}
                      onBlur={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"} />
                  </div>
                </div>

                {/* Total preview */}
                {form.fuel_amount && form.fuel_price && (
                  <div style={{ background: "rgba(52,211,153,0.07)", border: "1px solid rgba(52,211,153,0.18)", borderRadius: 12, padding: "10px 14px", fontSize: 13, color: "#34d399" }}>
                    Итого: <strong>{(parseFloat(form.fuel_amount) * parseFloat(form.fuel_price)).toLocaleString("ru-RU", { maximumFractionDigits: 2 })} ₽</strong>
                  </div>
                )}

                {/* Note */}
                <div>
                  <label style={{ display: "block", fontSize: 10, color: "#404058", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, marginBottom: 6 }}>Примечание</label>
                  <textarea placeholder="Необязательно..." value={form.note}
                    onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                    rows={2}
                    style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1.5px solid rgba(255,255,255,0.08)", borderRadius: 13, padding: "11px 14px", fontSize: 13, color: "#f0f0fa", outline: "none", resize: "vertical", boxSizing: "border-box", fontFamily: "inherit" }}
                    onFocus={e => e.currentTarget.style.borderColor = "rgba(251,191,36,0.4)"}
                    onBlur={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"} />
                </div>
              </div>

              {saveError && (
                <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 12, padding: "10px 14px", fontSize: 12, color: "#f87171", marginBottom: 14 }}>
                  {saveError}
                </div>
              )}

              <div style={{ display: "flex", gap: 10 }}>
                <motion.button whileTap={{ scale: 0.97 }} onClick={handleSave}
                  disabled={saving || !form.vehicle_number.trim() || !form.driver_name.trim() || !form.fuel_amount}
                  style={{ flex: 1, padding: "13px", background: "linear-gradient(135deg, #fbbf24, #f59e0b)", border: "none", borderRadius: 14, fontSize: 13, fontWeight: 700, color: "#0a0a14", cursor: "pointer", opacity: saving || !form.vehicle_number.trim() || !form.driver_name.trim() || !form.fuel_amount ? 0.4 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Fuel size={14} />}
                  Сохранить запись
                </motion.button>
                <motion.button whileTap={{ scale: 0.97 }} onClick={() => setShowForm(false)}
                  style={{ padding: "13px 20px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, fontSize: 13, color: "#606078", cursor: "pointer" }}>
                  Отмена
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Delete confirm */}
      <AnimatePresence>
        {deleteConfirm && (
          <div style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 20 }}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setDeleteConfirm(null)}
              style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(12px)" }} />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              style={{ position: "relative", zIndex: 10, background: "#12121e", border: "1.5px solid rgba(239,68,68,0.2)", borderRadius: 24, padding: "28px 24px", width: "100%", maxWidth: 320, textAlign: "center" }}>
              <div style={{ fontSize: 38, marginBottom: 12 }}>🗑️</div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "#f0f0fa", marginBottom: 6 }}>Удалить запись?</h3>
              <p style={{ fontSize: 12, color: "#505068", marginBottom: 22 }}>Это действие нельзя отменить.</p>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setDeleteConfirm(null)} style={{ flex: 1, padding: "13px", borderRadius: 14, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "#606078", fontSize: 13, cursor: "pointer" }}>Отмена</button>
                <motion.button whileTap={{ scale: 0.96 }} onClick={() => handleDelete(deleteConfirm)}
                  style={{ flex: 1, padding: "13px", borderRadius: 14, background: "rgba(239,68,68,0.12)", border: "1.5px solid rgba(239,68,68,0.25)", color: "#f87171", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                  Удалить
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast: Success */}
      <AnimatePresence>
        {saveSuccess && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20 }}
            style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", zIndex: 60, background: "#22c55e", color: "white", fontSize: 13, fontWeight: 600, padding: "13px 30px", borderRadius: 16, boxShadow: "0 8px 32px rgba(34,197,94,0.4)", display: "flex", alignItems: "center", gap: 8 }}>
            ✅ Запись сохранена
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
