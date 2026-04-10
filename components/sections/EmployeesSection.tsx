"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AppUser } from "@/lib/auth";

const AVAILABLE_SECTIONS = [
  { id: "patrol", label: "Обходы", icon: "🔦" },
  { id: "shift", label: "Смены", icon: "🔄" },
  { id: "posts", label: "Посты", icon: "🏢" },
  { id: "photo", label: "Фото отчёт", icon: "📷" },
  { id: "apartment", label: "Квартира", icon: "🏠" },
  { id: "inventory", label: "Имущество", icon: "📦" },
  { id: "transport", label: "Транспорт", icon: "🚗" },
  { id: "schedule", label: "График", icon: "📅" },
  { id: "fines", label: "Штрафы", icon: "⚠️" },
  { id: "conference", label: "Конференция", icon: "🎥" },
];

export default function EmployeesSection({ city, companyId, currentUser }: { city: string; companyId?: string; currentUser: AppUser; }) {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingScheduleId, setViewingScheduleId] = useState<string | null>(null);
  const [empSchedules, setEmpSchedules] = useState<any[]>([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);

  async function fetchEmpSchedule(name: string, id: string) {
    setLoadingSchedule(true);
    setViewingScheduleId(id);
    try {
      const res = await fetch(`/api/records?section=schedule&companyId=${companyId}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        // Filter by name (case-insensitive)
        setEmpSchedules(data.filter(r => r.data.guard?.toLowerCase().includes(name.toLowerCase())));
      }
    } catch {}
    setLoadingSchedule(false);
  }
  const [form, setForm] = useState({ 
    name: "", login: "", password: "", role: "Охранник", profession: "",
    allowedSections: ["patrol", "shift", "posts"] // default sections
  });
  const [error, setError] = useState("");

  useEffect(() => { fetchUsers(); }, [companyId]);

  async function fetchUsers() {
    setLoading(true);
    const res = await fetch("/api/users");
    const data = await res.json();
    if (Array.isArray(data)) {
      setUsers(data.filter(u => u.allowed_companies?.includes(companyId || "") || u.allowedCompanies?.includes(companyId || "")));
    }
    setLoading(false);
  }

  function toggleSection(id: string) {
    setForm(prev => {
      const isSelected = prev.allowedSections.includes(id);
      if (isSelected) {
        return { ...prev, allowedSections: prev.allowedSections.filter(s => s !== id) };
      } else {
        return { ...prev, allowedSections: [...prev.allowedSections, id] };
      }
    });
  }

  function openEdit(user: AppUser) {
    setForm({
      name: user.name,
      login: user.login,
      password: "", // leave empty unless they want to change
      role: user.role || "Охранник",
      profession: user.profession || "",
      allowedSections: user.allowedSections || user.allowed_sections || []
    });
    setEditingId(user.id);
    setShowForm(true);
  }

  async function handleAdd() {
    if (!form.name || !form.login || (!form.password && !editingId)) { setError("Заполните все поля"); return; }
    if (form.allowedSections.length === 0) { setError("Выберите хотя бы один раздел доступа"); return; }
    setError("");
    const method = editingId ? "PUT" : "POST";
    const res = await fetch("/api/users", {
      method, headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editingId || "emp_" + Date.now(),
        name: form.name, role: form.role, profession: form.profession, login: form.login, password: form.password,
        allowedSections: form.allowedSections,
        allowedCities: [city], allowedCompanies: [companyId]
      })
    });
    if (!res.ok) { setError("Ошибка при создании"); return; }
    setShowForm(false);
    fetchUsers();
  }

  async function handleDelete(id: string) {
    if (confirm("Удалить сотрудника?")) {
      await fetch(`/api/users?id=${id}`, { method: "DELETE" });
      fetchUsers();
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "#e8e8f0", margin: 0 }}>Сотрудники объекта</h2>
        <motion.button onClick={() => { setEditingId(null); setShowForm(true); setForm({ name: "", login: "", password: "", role: "Охранник", profession: "", allowedSections: ["patrol", "shift", "posts"] }); }}
          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }}
          style={{ padding: "13px 28px", borderRadius: 14, background: "rgba(79,142,247,0.12)", border: "1px solid rgba(79,142,247,0.3)", color: "#4f8ef7", fontSize: 15, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
          + Новый сотрудник
        </motion.button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} style={{ overflow: "hidden" }}>
            <div style={{ background: "rgba(255,255,255,0.05)", padding: 20, borderRadius: 16, display: "flex", flexDirection: "column", gap: 14, marginBottom: 16, border: "1px solid rgba(255,255,255,0.08)" }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: "#fff", margin: "0 0 4px 0" }}>{editingId ? "Редактирование сотрудника" : "Данные сотрудника"}</h3>
              <input placeholder="ФИО (например: Иванов Иван)" value={form.name} onChange={e => setForm({...form, name: e.target.value})} style={inp} />
              <input placeholder="Должность (Охранник, Диспетчер...)" value={form.profession} onChange={e => setForm({...form, profession: e.target.value})} style={inp} />
              <div style={{ display: "flex", gap: 10 }}>
                <input placeholder="Логин для входа" value={form.login} onChange={e => setForm({...form, login: e.target.value})} style={{...inp, flex: 1}} />
                <input placeholder={editingId ? "Новый пароль (оставьте пустым, если не меняете)" : "Пароль"} value={form.password} onChange={e => setForm({...form, password: e.target.value})} style={{...inp, flex: 1}} />
              </div>
              
              <div style={{ margin: "10px 0" }}>
                <h3 style={{ fontSize: 13, fontWeight: 600, color: "#a0a0b8", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>Разделы доступа</h3>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {AVAILABLE_SECTIONS.map(sec => {
                    const isSelected = form.allowedSections.includes(sec.id);
                    return (
                      <div key={sec.id} onClick={() => toggleSection(sec.id)}
                        style={{
                          padding: "8px 12px", borderRadius: 10, fontSize: 13, cursor: "pointer",
                          background: isSelected ? "rgba(79,142,247,0.15)" : "rgba(255,255,255,0.03)",
                          border: `1px solid ${isSelected ? "rgba(79,142,247,0.4)" : "rgba(255,255,255,0.08)"}`,
                          color: isSelected ? "#4f8ef7" : "#8888a0",
                          display: "flex", alignItems: "center", gap: 6,
                          transition: "all 0.2s"
                        }}>
                        <span>{sec.icon}</span> {sec.label}
                      </div>
                    );
                  })}
                </div>
              </div>

              {error && <div style={{ color: "#f87171", fontSize: 13, background: "rgba(248,113,113,0.1)", padding: "8px 12px", borderRadius: 8, border: "1px solid rgba(248,113,113,0.2)" }}>⚠️ {error}</div>}
              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                <button onClick={() => setShowForm(false)} style={{ flex: 1, padding: "12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#a0a0b8", borderRadius: 12, cursor: "pointer", fontWeight: 600 }}>Отмена</button>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleAdd} style={{ flex: 1, padding: "12px", background: "linear-gradient(135deg, #4f8ef7, #2563eb)", border: "none", color: "white", borderRadius: 12, cursor: "pointer", fontWeight: 700, boxShadow: "0 4px 14px rgba(79,142,247,0.3)" }}>{editingId ? "Сохранить изменения" : "Создать сотрудника и выдать логин"}</motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? <div style={{ color: "#aaa", textAlign: "center", padding: 20 }}>Загрузка...</div> : users.length === 0 ? <div style={{ color: "#aaa", textAlign: "center", padding: 20, background: "rgba(255,255,255,0.02)", borderRadius: 16, border: "1px dashed rgba(255,255,255,0.05)" }}>Нет сотрудников. Нажмите «Новый сотрудник», чтобы выдать доступы.</div> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {users.map(u => (
              <div key={u.id} style={{ display: "flex", flexDirection: "column", gap: 10, background: "rgba(255,255,255,0.03)", padding: 18, borderRadius: 16, border: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 600, color: "#fff", marginBottom: 4 }}>{u.name} <span style={{ fontSize: 12, fontWeight: 500, color: "#a855f7", background: "rgba(168,85,247,0.15)", padding: "2px 8px", borderRadius: 20, marginLeft: 8 }}>{u.profession || u.role}</span></div>
                    <div style={{ fontSize: 13, color: "#a0a0b8", display: "flex", gap: 12 }}>
                      <span>Логин: <strong style={{color:"#e8e8f0"}}>{u.login}</strong></span>
                      <span>Секций: <strong style={{color:"#e8e8f0"}}>{u.allowedSections?.length || u.allowed_sections?.length || 0}</strong></span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => viewingScheduleId === u.id ? setViewingScheduleId(null) : fetchEmpSchedule(u.name, u.id)} style={{ padding: "8px 12px", background: "rgba(96,165,250,0.1)", color: "#60a5fa", border: "1px solid rgba(96,165,250,0.2)", borderRadius: 10, fontSize: 13, cursor: "pointer", fontWeight: 600 }}>
                        {viewingScheduleId === u.id ? "Скрыть график" : "График"}
                      </button>
                      <button onClick={() => openEdit(u)} style={{ padding: "8px 12px", background: "rgba(255,255,255,0.05)", color: "#e8e8f0", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, fontSize: 13, cursor: "pointer", fontWeight: 600, transition: "all 0.2s" }}
                        onMouseOver={e => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
                        onMouseOut={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}>
                        Изменить
                      </button>
                      <button onClick={() => handleDelete(u.id)} style={{ padding: "8px 12px", background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, fontSize: 13, cursor: "pointer", fontWeight: 600, transition: "all 0.2s" }}
                    onMouseOver={e => e.currentTarget.style.background = "rgba(239,68,68,0.2)"}
                    onMouseOut={e => e.currentTarget.style.background = "rgba(239,68,68,0.1)"}>
                    Удалить
                  </button>
                </div>
                </div>

                {viewingScheduleId === u.id && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ overflow: "hidden", marginTop: 8 }}>
                    <div style={{ background: "rgba(96,165,250,0.05)", borderRadius: 12, padding: 12, border: "1px solid rgba(96,165,250,0.1)" }}>
                      <h4 style={{ fontSize: 11, color: "#60a5fa", textTransform: "uppercase", fontWeight: 700, marginBottom: 8, letterSpacing: "0.05em" }}>Запланированные дежурства</h4>
                      {loadingSchedule ? <div style={{ fontSize: 12, color: "#555" }}>Загрузка...</div> : empSchedules.length === 0 ? <div style={{ fontSize: 12, color: "#555" }}>График не заполнен</div> : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {empSchedules.map(r => (
                            <div key={r.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                              <span style={{ color: "#fff" }}>{r.data.post_name}</span>
                              <span style={{ color: "#60a5fa", fontWeight: 600 }}>
                                {r.data.date_start ? `${r.data.date_start.split('-').slice(1).reverse().join('.')} – ${r.data.date_end?.split('-').slice(1).reverse().join('.')}` : r.data.date}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </div>

          ))}
        </div>
      )}
    </div>
  );
}

const inp = { width: "100%", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "12px 14px", color: "white", outline: "none", fontSize: 14, boxSizing: "border-box" as const, transition: "border 0.2s" };
