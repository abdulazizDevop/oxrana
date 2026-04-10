"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Application = {
  id: string;
  name: string;
  phone: string;
  object_name: string;
  address: string;
  status: string;
  type: 'connect' | 'new_object' | 'subscription';
  user_id?: string;
  company_id?: string;
  created_at: string;
};

type TmcRequest = {
  id: string;
  city_id: string;
  company_id: string;
  requester_name: string;
  item_name: string;
  quantity: number;
  notes: string;
  status: string;
  created_at: string;
};

type City = { id: string; name: string };

const inp: React.CSSProperties = {
  width: "100%", background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.1)", borderRadius: 11,
  padding: "11px 13px", fontSize: 14, color: "#e8e8f0", outline: "none", boxSizing: "border-box"
};

interface Props {
  city: string;
  companyId?: string;
}

export default function RequestsSection({ city, companyId }: Props) {
  const [subTab, setSubTab] = useState<"connections" | "tmc">("connections");
  const [apps, setApps] = useState<Application[]>([]);
  const [tmcReqs, setTmcReqs] = useState<TmcRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Grant Access state
  const [grantApp, setGrantApp] = useState<Application | null>(null);
  const [cities, setCities] = useState<City[]>([]);
  const [form, setForm] = useState({ cityId: "", objectName: "", address: "", login: "", password: "" });
  const [formError, setFormError] = useState("");
  const [generatedCreds, setGeneratedCreds] = useState<{login: string, password: string, objectName: string} | null>(null);

  useEffect(() => { 
    fetch("/api/cities").then(r => r.json()).then(rows => setCities(rows));
  }, []);

  useEffect(() => {
    if (subTab === "connections") fetchApps();
    else fetchTmc();
  }, [subTab, city, companyId]);

  async function fetchApps() {
    setLoading(true);
    const res = await fetch("/api/applications");
    const data = await res.json();
    setApps(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  async function fetchTmc() {
    setLoading(true);
    const q = new URLSearchParams({ cityId: city });
    if (companyId) q.set("companyId", companyId);
    const res = await fetch(`/api/tmc-requests?${q}`);
    const data = await res.json();
    setTmcReqs(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  async function changeAppStatus(id: string, newStatus: string) {
    await fetch("/api/applications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: newStatus }),
    });
    fetchApps();
  }

  async function changeTmcStatus(id: string, newStatus: string) {
    await fetch("/api/tmc-requests", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: newStatus }),
    });
    fetchTmc();
  }

  async function removeApp(id: string) {
    if (confirm("Точно удалить заявку?")) {
      await fetch(`/api/applications?id=${id}`, { method: "DELETE" });
      fetchApps();
    }
  }

  async function removeTmc(id: string) {
    if (confirm("Точно удалить заявку ТМЦ?")) {
      await fetch(`/api/tmc-requests?id=${id}`, { method: "DELETE" });
      fetchTmc();
    }
  }

  function openGrant(app: Application) {
    const chars = "abcdefghijkmnpqrstuvwxyz23456789";
    let pass = "";
    for (let i = 0; i < 8; i++) pass += chars[Math.floor(Math.random() * chars.length)];
    const randId = Math.floor(Math.random() * 9000) + 1000;
    const initialLogin = "obj_" + randId;

    setForm({
      cityId: cities.length > 0 ? cities[0].id : "",
      objectName: app.object_name,
      address: app.address || "",
      login: initialLogin,
      password: pass
    });
    setFormError("");
    setGrantApp(app);
  }

  async function handleGrant() {
    if (!form.cityId) return setFormError("Выберите город");
    if (!form.objectName.trim()) return setFormError("Введите название объекта");
    if (!form.login.trim() || !form.password.trim()) return setFormError("Введите логин и пароль");

    setFormError("");
    try {
      const res = await fetch("/api/applications/grant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId: grantApp!.id,
          cityId: form.cityId,
          objectName: form.objectName.trim(),
          address: form.address.trim(),
          login: form.login.trim(),
          password: form.password.trim(),
          userId: grantApp!.user_id,
          type: grantApp!.type,
          companyId: grantApp!.company_id
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка");
      
      setGeneratedCreds({ login: form.login, password: form.password, objectName: form.objectName });
      setGrantApp(null);
      fetchApps();
    } catch (err: any) {
      setFormError(err.message);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "#e8e8f0", margin: 0 }}>Журнал заявок</h2>
        <div style={{ display: "flex", background: "rgba(255,255,255,0.05)", padding: 4, borderRadius: 12 }}>
          <button 
            onClick={() => setSubTab("connections")}
            style={{ 
              padding: "6px 14px", borderRadius: 9, fontSize: 12, border: "none", cursor: "pointer",
              background: subTab === "connections" ? "rgba(79,142,247,0.2)" : "transparent",
              color: subTab === "connections" ? "#4f8ef7" : "#888",
              fontWeight: subTab === "connections" ? 600 : 400
            }}
          >Подключения</button>
          <button 
            onClick={() => setSubTab("tmc")}
            style={{ 
              padding: "6px 14px", borderRadius: 9, fontSize: 12, border: "none", cursor: "pointer",
              background: subTab === "tmc" ? "rgba(79,142,247,0.2)" : "transparent",
              color: subTab === "tmc" ? "#4f8ef7" : "#888",
              fontWeight: subTab === "tmc" ? 600 : 400
            }}
          >Заявки ТМЦ</button>
        </div>
      </div>

      {loading ? (
        <div style={{ color: "#888", textAlign: "center", padding: 40 }}>Загрузка...</div>
      ) : subTab === "connections" ? (
        apps.length === 0 ? (
          <div style={{ color: "#888", textAlign: "center", padding: 40 }}>Нет заявок на подключение.</div>
        ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {apps.map(a => (
                <motion.div key={a.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ background: "rgba(255,255,255,0.05)", padding: 16, borderRadius: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <h3 style={{ margin: 0, fontSize: 16, color: "#f0f0f8" }}>{a.object_name}</h3>
                          <span style={{ 
                            fontSize: 10, padding: "2px 6px", borderRadius: 6, 
                            background: a.type === 'subscription' ? 'rgba(251,191,36,0.15)' : (a.type === 'new_object' ? 'rgba(79,142,247,0.15)' : 'rgba(52,211,153,0.15)'),
                            color: a.type === 'subscription' ? '#fbbf24' : (a.type === 'new_object' ? '#4f8ef7' : '#34d399'),
                            border: `1px solid ${a.type === 'subscription' ? 'rgba(251,191,36,0.3)' : (a.type === 'new_object' ? 'rgba(79,142,247,0.3)' : 'rgba(52,211,153,0.3)')}`,
                            fontWeight: 700, textTransform: 'uppercase'
                          }}>
                            {a.type === 'subscription' ? 'Оплата' : (a.type === 'new_object' ? 'Новый объект' : 'Подключение')}
                          </span>
                        </div>
                        {a.address && <div style={{ fontSize: 13, color: "#e8e8f0", marginTop: 4 }}>📍 {a.address}</div>}
                        <div style={{ fontSize: 13, color: "#aaa", marginTop: 4 }}>{a.name} · {a.phone}</div>
                      </div>
                    <div style={{ fontSize: 12, padding: "4px 8px", borderRadius: 8, background: a.status === 'pending' ? "rgba(243,156,18,0.2)" : "rgba(46,204,113,0.2)", color: a.status === 'pending' ? "#f39c12" : "#2ecc71" }}>
                      {a.status === 'pending' ? 'Новая' : 'Обработана'}
                    </div>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                    {a.status === 'pending' && (
                      <>
                        <button onClick={() => changeAppStatus(a.id, 'done')} style={{ background: "rgba(46,204,113,0.1)", border: "1px solid rgba(46,204,113,0.3)", color: "#2ecc71", padding: "6px 12px", borderRadius: 8, cursor: "pointer", fontSize: 12 }}>
                          {a.type === 'subscription' ? 'Подтвердить оплату' : 'Пометить как обработанную'}
                        </button>
                        {a.type !== 'subscription' && (
                          <button onClick={() => openGrant(a)} style={{ background: "rgba(79,142,247,0.1)", border: "1px solid rgba(79,142,247,0.3)", color: "#4f8ef7", padding: "6px 12px", borderRadius: 8, cursor: "pointer", fontSize: 12 }}>
                            {a.type === 'new_object' ? 'Одобрить создание' : 'Выдать лог/пароль'}
                          </button>
                        )}
                        {a.type === 'subscription' && (
                          <button onClick={async () => {
                            if (confirm(`Продлить подписку для ${a.object_name}?`)) {
                              const res = await fetch("/api/applications/grant", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ applicationId: a.id, type: 'subscription', companyId: a.company_id })
                              });
                              if (res.ok) fetchApps();
                            }
                          }} style={{ background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.3)", color: "#fbbf24", padding: "6px 12px", borderRadius: 8, cursor: "pointer", fontSize: 12 }}>
                            Продлить подписку (+1 мес)
                          </button>
                        )}
                      </>
                    )}
                    <button onClick={() => removeApp(a.id)} style={{ background: "rgba(231,76,60,0.1)", border: "1px solid rgba(231,76,60,0.3)", color: "#e74c3c", padding: "6px 12px", borderRadius: 8, cursor: "pointer", fontSize: 12 }}>
                      Удалить
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
        )
      ) : (
        tmcReqs.length === 0 ? (
          <div style={{ color: "#888", textAlign: "center", padding: 40 }}>Нет заявок ТМЦ.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {tmcReqs.map(r => (
              <motion.div key={r.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ background: "rgba(255,255,255,0.05)", padding: 16, borderRadius: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: 16, color: "#f0f0f8" }}>{r.item_name}</h3>
                      <div style={{ fontSize: 13, color: "#e8e8f0", marginTop: 4 }}>Количество: <b>{r.quantity}</b></div>
                      <div style={{ fontSize: 13, color: "#aaa", marginTop: 4 }}>От: {r.requester_name}</div>
                      {r.notes && <div style={{ fontSize: 13, color: "#888", marginTop: 6, fontStyle: "italic" }}>"{r.notes}"</div>}
                    </div>
                  <div style={{ fontSize: 12, padding: "4px 8px", borderRadius: 8, background: r.status === 'pending' ? "rgba(243,156,18,0.2)" : (r.status === 'done' ? "rgba(46,204,113,0.2)" : "rgba(231,76,60,0.2)"), color: r.status === 'pending' ? "#f39c12" : (r.status === 'done' ? "#2ecc71" : "#e74c3c") }}>
                    {r.status === 'pending' ? 'Ожидает' : (r.status === 'done' ? 'Выдано' : 'Отклонено')}
                  </div>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                  {r.status === 'pending' && (
                    <>
                      <button onClick={() => changeTmcStatus(r.id, 'done')} style={{ background: "rgba(46,204,113,0.1)", border: "1px solid rgba(46,204,113,0.3)", color: "#2ecc71", padding: "6px 12px", borderRadius: 8, cursor: "pointer", fontSize: 12 }}>
                        Выдать
                      </button>
                      <button onClick={() => changeTmcStatus(r.id, 'rejected')} style={{ background: "rgba(243,156,18,0.1)", border: "1px solid rgba(243,156,18,0.3)", color: "#f39c12", padding: "6px 12px", borderRadius: 8, cursor: "pointer", fontSize: 12 }}>
                        Отклонить
                      </button>
                    </>
                  )}
                  <button onClick={() => removeTmc(r.id)} style={{ background: "rgba(231,76,60,0.1)", border: "1px solid rgba(231,76,60,0.3)", color: "#e74c3c", padding: "6px 12px", borderRadius: 8, cursor: "pointer", fontSize: 12 }}>
                    Удалить
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )
      )}

      {/* Grant Access Modal */}
      <AnimatePresence>
        {grantApp && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              style={{ background: "#13131a", borderRadius: 16, padding: 24, width: "100%", maxWidth: 400, border: "1px solid rgba(255,255,255,0.1)" }}>
              <h3 style={{ margin: "0 0 16px 0", color: "#fff", fontSize: 18 }}>Создание объекта и доступа</h3>
              
              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, color: "#aaa", marginBottom: 4 }}>Город</label>
                  <select value={form.cityId} onChange={e => setForm({ ...form, cityId: e.target.value })} style={inp}>
                    <option value="">-- Выберите город --</option>
                    {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, color: "#aaa", marginBottom: 4 }}>Название объекта</label>
                  <input type="text" value={form.objectName} onChange={e => setForm({ ...form, objectName: e.target.value })} style={inp} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, color: "#aaa", marginBottom: 4 }}>Адрес</label>
                  <input type="text" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} style={inp} />
                </div>
                <div style={{ display: "flex", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: "block", fontSize: 12, color: "#aaa", marginBottom: 4 }}>Логин</label>
                    <input type="text" value={form.login} onChange={e => setForm({ ...form, login: e.target.value })} style={inp} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: "block", fontSize: 12, color: "#aaa", marginBottom: 4 }}>Пароль</label>
                    <input type="text" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} style={inp} />
                  </div>
                </div>
                {formError && <div style={{ color: "#e74c3c", fontSize: 12 }}>{formError}</div>}
              </div>
              
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setGrantApp(null)} style={{ flex: 1, padding: "10px", borderRadius: 8, border: "none", background: "rgba(255,255,255,0.1)", color: "#fff", cursor: "pointer" }}>Отмена</button>
                <button onClick={handleGrant} style={{ flex: 1, padding: "10px", borderRadius: 8, border: "none", background: "#4f8ef7", color: "#fff", cursor: "pointer", fontWeight: "bold" }}>Создать и выдать</button>
              </div>
            </motion.div>
          </motion.div>
        )}
        
        {/* Success Modal */}
        {generatedCreds && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              style={{ background: "#13131a", borderRadius: 16, padding: 24, width: "100%", maxWidth: 400, border: "1px solid rgba(46,204,113,0.3)", textAlign: "center" }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>✅</div>
              <h3 style={{ margin: "0 0 8px 0", color: "#fff", fontSize: 18 }}>Объект создан!</h3>
              <p style={{ fontSize: 14, color: "#aaa", marginBottom: 20 }}>
                Отправьте эти данные клиенту. Он сможет зайти через кнопку <b>«Вход в объект»</b> и добавить своих сотрудников.
              </p>
              
              <div style={{ background: "rgba(255,255,255,0.05)", padding: 16, borderRadius: 12, marginBottom: 20, textAlign: "left" }}>
                <div style={{ marginBottom: 8 }}><span style={{ color: "#aaa", fontSize: 12 }}>Объект:</span> <b style={{ color: "#fff" }}>{generatedCreds.objectName}</b></div>
                <div style={{ marginBottom: 8 }}><span style={{ color: "#aaa", fontSize: 12 }}>Логин:</span> <b style={{ color: "#fff", fontFamily: "monospace", fontSize: 16 }}>{generatedCreds.login}</b></div>
                <div><span style={{ color: "#aaa", fontSize: 12 }}>Пароль:</span> <b style={{ color: "#fff", fontFamily: "monospace", fontSize: 16 }}>{generatedCreds.password}</b></div>
              </div>
              
              <button onClick={() => setGeneratedCreds(null)} style={{ width: "100%", padding: "12px", borderRadius: 8, border: "none", background: "#2ecc71", color: "#fff", cursor: "pointer", fontWeight: "bold" }}>Понятно, закрыть</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
