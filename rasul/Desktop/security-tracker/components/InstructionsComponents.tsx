"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, ChevronRight, X, Edit3, Save, Loader2, Plus, Trash2 } from "lucide-react";

type RoleInstruction = {
  id: string;
  role_key: string;
  role_label: string;
  content: string;
  updated_at: string;
  updated_by: string;
};

const DEFAULT_ICON: Record<string, string> = {
  guard: "🛡️",
  senior_guard: "⭐",
  manager: "📊",
  operator: "🖥️",
  default: "👤",
};

// ─── Модалка для сотрудника при входе ────────────────────────────────────────
export function InstructionsModal({
  role,
  onClose,
}: {
  role: string;
  onClose: () => void;
}) {
  const [instructions, setInstructions] = useState<RoleInstruction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<RoleInstruction | null>(null);

  useEffect(() => {
    fetch("/api/instructions")
      .then(r => r.json())
      .then(data => {
        const arr = Array.isArray(data) ? data : [];
        setInstructions(arr);
        // Автоматически открываем инструкцию своей роли
        const mine = arr.find((i: RoleInstruction) =>
          i.role_key === role || i.role_label.toLowerCase() === role.toLowerCase()
        );
        if (mine) setSelected(mine);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [role]);

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)", zIndex: 1000 }} />
      <motion.div
        initial={{ opacity: 0, x: "-50%", y: "-40%", scale: 0.95 }}
        animate={{ opacity: 1, x: "-50%", y: "-50%", scale: 1 }}
        exit={{ opacity: 0, x: "-50%", y: "-40%", scale: 0.95 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position: "fixed", top: "50%", left: "50%", 
          background: "#0e0e16", border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 24, width: "94%", maxWidth: 560, maxHeight: "88vh",
          zIndex: 1001, overflow: "hidden", display: "flex", flexDirection: "column",
          boxShadow: "0 32px 80px rgba(0,0,0,0.7)"
        }}
      >
        {/* Header */}
        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: "linear-gradient(135deg,#4f8ef7,#2563eb)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <BookOpen size={18} color="white" />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#e8e8f0" }}>Инструкции по работе</div>
              <div style={{ fontSize: 11, color: "#6b6b80" }}>Ознакомьтесь перед началом работы</div>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 10, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#8888a0", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <X size={16} />
          </button>
        </div>

        {loading ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Loader2 size={28} className="animate-spin" style={{ color: "rgba(255,255,255,0.2)" }} />
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row flex-1 overflow-hidden">
            {/* Left: role list */}
            <div className="w-full sm:w-[180px] shrink-0 sm:border-r border-b sm:border-b-0 border-white/5 p-2 sm:p-3 overflow-y-auto max-h-[140px] sm:max-h-full">
              {instructions.map(instr => {
                const icon = DEFAULT_ICON[instr.role_key] || DEFAULT_ICON.default;
                const isActive = selected?.id === instr.id;
                const isMyRole = instr.role_key === role || instr.role_label.toLowerCase() === role.toLowerCase();
                return (
                  <motion.button key={instr.id} onClick={() => setSelected(instr)}
                    whileTap={{ scale: 0.97 }}
                    style={{
                      width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 10px",
                      borderRadius: 12, border: isActive ? "1px solid rgba(79,142,247,0.4)" : "1px solid transparent",
                      background: isActive ? "rgba(79,142,247,0.1)" : "transparent",
                      cursor: "pointer", textAlign: "left", marginBottom: 2, position: "relative"
                    }}>
                    <span style={{ fontSize: 18, flexShrink: 0 }}>{icon}</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: isActive ? 600 : 400, color: isActive ? "#e8e8f0" : "#8888a0", lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {instr.role_label}
                      </div>
                      {isMyRole && <div style={{ fontSize: 9, color: "#4f8ef7", marginTop: 1 }}>Ваша роль</div>}
                    </div>
                    {isActive && <ChevronRight size={12} style={{ color: "#4f8ef7", flexShrink: 0, marginLeft: "auto" }} />}
                  </motion.button>
                );
              })}
              {instructions.length === 0 && (
                <div style={{ padding: "20px 10px", textAlign: "center", color: "#55556a", fontSize: 12 }}>
                  Нет инструкций
                </div>
              )}
            </div>

            {/* Right: content */}
            <div style={{ flex: 1, padding: "20px 24px", overflowY: "auto" }}>
              {selected ? (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                    <span style={{ fontSize: 28 }}>{DEFAULT_ICON[selected.role_key] || DEFAULT_ICON.default}</span>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: "#e8e8f0" }}>{selected.role_label}</div>
                      <div style={{ fontSize: 11, color: "#55556a" }}>
                        Обновлено: {new Date(selected.updated_at).toLocaleDateString("ru-RU")}
                        {selected.updated_by ? ` · ${selected.updated_by}` : ""}
                      </div>
                    </div>
                  </div>
                  <div style={{
                    fontSize: 13, color: "rgba(255,255,255,0.7)", lineHeight: 1.8,
                    whiteSpace: "pre-wrap",
                    background: "rgba(255,255,255,0.02)", borderRadius: 14,
                    padding: "16px 20px", border: "1px solid rgba(255,255,255,0.05)"
                  }}>
                    {selected.content}
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "40px 20px", color: "#55556a" }}>
                  <BookOpen size={36} style={{ opacity: 0.3, margin: "0 auto 12px" }} />
                  <div style={{ fontSize: 13 }}>Выберите роль слева</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ padding: "14px 24px", borderTop: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 }}>
          <motion.button onClick={onClose} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            style={{
              width: "100%", background: "linear-gradient(135deg,#4f8ef7,#2563eb)",
              border: "none", borderRadius: 12, padding: "13px",
              fontSize: 14, fontWeight: 600, color: "white", cursor: "pointer"
            }}>
            Ознакомлен — Войти
          </motion.button>
        </div>
      </motion.div>
    </>
  );
}

// ─── Редактор инструкций для AdminPanel ──────────────────────────────────────
export function InstructionsEditor() {
  const [instructions, setInstructions] = useState<RoleInstruction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<RoleInstruction | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editLabel, setEditLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newLabel, setNewLabel] = useState("");

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    const res = await fetch("/api/instructions");
    const data = await res.json();
    const arr = Array.isArray(data) ? data : [];
    setInstructions(arr);
    if (arr.length > 0 && !selected) {
      setSelected(arr[0]);
      setEditContent(arr[0].content);
      setEditLabel(arr[0].role_label);
    }
    setLoading(false);
  }

  function selectInstr(instr: RoleInstruction) {
    setSelected(instr);
    setEditContent(instr.content);
    setEditLabel(instr.role_label);
    setSaved(false);
  }

  async function saveInstr() {
    if (!selected) return;
    setSaving(true);
    await fetch("/api/instructions", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roleKey: selected.role_key, roleLabel: editLabel, content: editContent, updatedBy: "Администратор" }),
    });
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    fetchAll();
  }

  async function addRole() {
    if (!newKey.trim() || !newLabel.trim()) return;
    await fetch("/api/instructions", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roleKey: newKey.trim().toLowerCase().replace(/\s+/g, "_"), roleLabel: newLabel.trim(), content: "", updatedBy: "Администратор" }),
    });
    setNewKey(""); setNewLabel(""); setShowAdd(false);
    fetchAll();
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 size={28} className="animate-spin text-white/20" /></div>;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-white">Инструкции по ролям</h3>
          <p className="text-xs text-white/30 mt-0.5">Сотрудники видят эти инструкции при входе</p>
        </div>
        <motion.button onClick={() => setShowAdd(!showAdd)} whileTap={{ scale: 0.95 }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-semibold border border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white transition-all">
          <Plus size={13} />Добавить роль
        </motion.button>
      </div>

      {/* Add role form */}
      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden">
            <div className="bg-white/[0.03] border border-white/8 rounded-2xl p-5 space-y-4">
              <p className="text-xs font-semibold text-white/40 uppercase tracking-widest">Новая роль</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[11px] text-white/35 tracking-wide">Ключ (англ.)</label>
                  <input placeholder="например: guard_2" value={newKey} onChange={e => setNewKey(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/10 focus:border-white/30 focus:bg-white/[0.06] text-white placeholder-white/20 rounded-2xl px-4 py-3 text-sm outline-none transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] text-white/35 tracking-wide">Название роли</label>
                  <input placeholder="например: Охранник 2" value={newLabel} onChange={e => setNewLabel(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/10 focus:border-white/30 focus:bg-white/[0.06] text-white placeholder-white/20 rounded-2xl px-4 py-3 text-sm outline-none transition-all" />
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={addRole}
                  className="flex-1 py-3 bg-white text-black rounded-2xl text-sm font-semibold hover:bg-white/90 transition-all">
                  Создать
                </button>
                <button onClick={() => setShowAdd(false)}
                  className="px-5 py-3 bg-white/[0.04] border border-white/10 text-white/40 rounded-2xl text-sm hover:text-white/70 hover:bg-white/[0.07] transition-all">
                  Отмена
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main layout */}
      <div className="flex gap-4" style={{ height: 500 }}>

        {/* Left: role list */}
        <div className="w-48 flex-shrink-0 flex flex-col gap-1.5 overflow-y-auto pr-1">
          {instructions.map(instr => {
            const icon = DEFAULT_ICON[instr.role_key] || DEFAULT_ICON.default;
            const isActive = selected?.id === instr.id;
            return (
              <motion.button key={instr.id} onClick={() => selectInstr(instr)} whileTap={{ scale: 0.97 }}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border text-left transition-all ${
                  isActive
                    ? "border-blue-500/25 bg-gradient-to-r from-blue-500/15 to-blue-500/5 shadow-[0_0_20px_rgba(79,142,247,0.08)]"
                    : "border-white/[0.06] bg-white/[0.025] hover:bg-white/[0.05] hover:border-white/10"
                }`}>
                <span className="text-lg flex-shrink-0">{icon}</span>
                <span className={`text-[13px] truncate font-medium ${isActive ? "text-white" : "text-white/45"}`}>
                  {instr.role_label}
                </span>
                {isActive && <ChevronRight size={13} className="ml-auto flex-shrink-0 text-blue-400" />}
              </motion.button>
            );
          })}
        </div>

        {/* Right: editor */}
        {selected ? (
          <div className="flex-1 flex flex-col gap-4 min-w-0 bg-white/[0.025] border border-white/[0.06] rounded-3xl p-5 overflow-hidden">

            {/* Role name field */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/[0.06] border border-white/10 flex items-center justify-center text-xl flex-shrink-0">
                {DEFAULT_ICON[selected.role_key] || DEFAULT_ICON.default}
              </div>
              <div className="flex-1 relative">
                <input
                  value={editLabel}
                  onChange={e => setEditLabel(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/10 focus:border-white/25 focus:bg-white/[0.06] text-white rounded-2xl px-4 py-3 text-sm font-semibold outline-none transition-all placeholder-white/20"
                  placeholder="Название роли"
                />
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-white/[0.05]" />

            {/* Textarea */}
            <div className="flex-1 relative flex flex-col">
              <label className="text-[10px] text-white/30 uppercase tracking-widest mb-2">Текст инструкции</label>
              <textarea
                value={editContent}
                onChange={e => setEditContent(e.target.value)}
                className="flex-1 bg-white/[0.03] border border-white/[0.07] focus:border-white/20 focus:bg-white/[0.05] text-white/80 rounded-2xl px-5 py-4 text-[13.5px] outline-none resize-none leading-[1.85] transition-all placeholder-white/15"
                placeholder="Введите инструкции для этой роли..."
              />
            </div>

            {/* Footer */}
            <div className="flex items-center gap-3 pt-1">
              <motion.button
                onClick={saveInstr}
                disabled={saving}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className={`flex-1 py-3.5 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50 ${
                  saved
                    ? "bg-emerald-500/20 border border-emerald-500/30 text-emerald-400"
                    : "bg-white text-black hover:bg-white/90"
                }`}>
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {saved ? "Сохранено!" : saving ? "Сохраняю..." : "Сохранить"}
              </motion.button>
              <div className="text-[10px] text-white/18 leading-tight">
                <span className="text-white/20">Обновлено:</span><br />
                {new Date(selected.updated_at).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-white/15 gap-3 bg-white/[0.02] border border-white/[0.05] rounded-3xl">
            <Edit3 size={32} strokeWidth={1.2} />
            <span className="text-sm">Выберите роль слева</span>
          </div>
        )}
      </div>
    </div>
  );
}
