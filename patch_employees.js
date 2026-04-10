const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'rasul/Desktop/security-tracker/components/sections/EmployeesSection.tsx');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
  'const [showForm, setShowForm] = useState(false);',
  'const [showForm, setShowForm] = useState(false);\n  const [editingId, setEditingId] = useState<string | null>(null);'
);

content = content.replace(
  'async function handleAdd() {',
  `function openEdit(user: AppUser) {
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

  async function handleAdd() {`
);

content = content.replace(
  'const res = await fetch("/api/users", {',
  `const method = editingId ? "PUT" : "POST";
    const res = await fetch("/api/users", {`
);

content = content.replace(
  'method: "POST"',
  'method'
);

content = content.replace(
  'id: "emp_" + Date.now(),',
  'id: editingId || "emp_" + Date.now(),'
);

content = content.replace(
  '<motion.button onClick={() => { setShowForm(true); setForm({ name: "", login: "", password: "", role: "Охранник", profession: "", allowedSections: ["patrol", "shift", "posts"] }); }}',
  '<motion.button onClick={() => { setEditingId(null); setShowForm(true); setForm({ name: "", login: "", password: "", role: "Охранник", profession: "", allowedSections: ["patrol", "shift", "posts"] }); }}'
);

content = content.replace(
  '<h3 style={{ fontSize: 15, fontWeight: 600, color: "#fff", margin: "0 0 4px 0" }}>Данные сотрудника</h3>',
  '<h3 style={{ fontSize: 15, fontWeight: 600, color: "#fff", margin: "0 0 4px 0" }}>{editingId ? "Редактирование сотрудника" : "Данные сотрудника"}</h3>'
);

content = content.replace(
  '<input placeholder="Пароль" value={form.password} onChange={e => setForm({...form, password: e.target.value})} style={{...inp, flex: 1}} />',
  '<input placeholder={editingId ? "Новый пароль (оставьте пустым, если не меняете)" : "Пароль"} value={form.password} onChange={e => setForm({...form, password: e.target.value})} style={{...inp, flex: 1}} />'
);

content = content.replace(
  'if (!form.name || !form.login || !form.password) { setError("Заполните все поля"); return; }',
  'if (!form.name || !form.login || (!form.password && !editingId)) { setError("Заполните все поля"); return; }'
);

content = content.replace(
  '<motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleAdd} style={{ flex: 1, padding: "12px", background: "linear-gradient(135deg, #4f8ef7, #2563eb)", border: "none", color: "white", borderRadius: 12, cursor: "pointer", fontWeight: 700, boxShadow: "0 4px 14px rgba(79,142,247,0.3)" }}>Создать сотрудника и выдать логин</motion.button>',
  '<motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleAdd} style={{ flex: 1, padding: "12px", background: "linear-gradient(135deg, #4f8ef7, #2563eb)", border: "none", color: "white", borderRadius: 12, cursor: "pointer", fontWeight: 700, boxShadow: "0 4px 14px rgba(79,142,247,0.3)" }}>{editingId ? "Сохранить изменения" : "Создать сотрудника и выдать логин"}</motion.button>'
);

content = content.replace(
  '<button onClick={() => handleDelete(u.id)} style={{ padding: "8px 12px", background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, fontSize: 13, cursor: "pointer", fontWeight: 600, transition: "all 0.2s" }}',
  `<div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => openEdit(u)} style={{ padding: "8px 12px", background: "rgba(255,255,255,0.05)", color: "#e8e8f0", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, fontSize: 13, cursor: "pointer", fontWeight: 600, transition: "all 0.2s" }}
                    onMouseOver={e => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
                    onMouseOut={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}>
                    Изменить
                  </button>
                  <button onClick={() => handleDelete(u.id)} style={{ padding: "8px 12px", background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, fontSize: 13, cursor: "pointer", fontWeight: 600, transition: "all 0.2s" }}`
);

content = content.replace(
  'Удалить\n                </button>',
  'Удалить\n                  </button>\n                </div>'
);

fs.writeFileSync(filePath, content);
console.log("Patched!");
