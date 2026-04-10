"use client";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AppUser } from "@/lib/auth";

interface Conference {
  id: string;
  title: string;
  city_id: string;
  company_id: string | null;
  created_by: string;
  created_by_name: string;
  status: string;
  jitsi_room: string;
  created_at: string;
  ended_at: string | null;
}

interface ChatMessage {
  id: string;
  conference_id: string;
  user_id: string;
  user_name: string;
  user_role: string;
  message: string;
  created_at: string;
}

interface Props {
  city: string;
  companyId?: string;
  currentUser: AppUser;
  isAdmin?: boolean;
  allCities?: { id: string; label: string }[];
  companies?: { id: string; name: string; cityId: string }[];
}

const DEFAULT_CITIES = [
  { id: "moscow", label: "Москва" },
  { id: "spb", label: "Санкт-Петербург" },
  { id: "novosibirsk", label: "Новосибирск" },
  { id: "yekaterinburg", label: "Екатеринбург" },
  { id: "kazan", label: "Казань" },
  { id: "krasnodar", label: "Краснодар" },
];

export default function ConferenceSection({ city, companyId, currentUser, isAdmin, allCities, companies }: Props) {
  const [conferences, setConferences] = useState<Conference[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeConf, setActiveConf] = useState<Conference | null>(null);
  const [jitsiLoaded, setJitsiLoaded] = useState(false);
  const jitsiRef = useRef<HTMLDivElement>(null);
  const jitsiApiRef = useRef<any>(null);

  // Create form (admin only)
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: "",
    cityId: city || "moscow",
    companyId: companyId || "",
  });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  // Chat
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const chatPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Mic state (tracked locally)
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(false);
  const [showChat, setShowChat] = useState(true);

  const cities = allCities || DEFAULT_CITIES;
  const cityLabel = (id: string) => cities.find(c => c.id === id)?.label || id;
  const companyList = (companies || []).filter(c => c.cityId === createForm.cityId);

  const loadConferences = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (city) q.set("cityId", city);
      if (companyId) q.set("companyId", companyId);
      q.set("status", "active");
      const res = await fetch(`/api/conferences?${q}`);
      const data = await res.json();
      setConferences(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConferences();
    const interval = setInterval(loadConferences, 10000);
    return () => clearInterval(interval);
  }, [city, companyId]);

  // Load Jitsi Meet External API
  useEffect(() => {
      if (typeof window !== "undefined" && !(window as any).JitsiMeetExternalAPI) {
        const script = document.createElement("script");
        script.src = "/external_api.js";
        script.async = true;
        script.onload = () => setJitsiLoaded(true);
        document.head.appendChild(script);
    } else if ((window as any).JitsiMeetExternalAPI) {
      setJitsiLoaded(true);
    }
  }, []);

  // Init Jitsi when joining
  useEffect(() => {
    if (!activeConf || !jitsiLoaded || !jitsiRef.current) return;

    // Destroy previous
    if (jitsiApiRef.current) {
      try { jitsiApiRef.current.dispose(); } catch {}
      jitsiApiRef.current = null;
    }

    const JitsiMeetExternalAPI = (window as any).JitsiMeetExternalAPI;
    if (!JitsiMeetExternalAPI) return;

    const api = new JitsiMeetExternalAPI("meet.jit.si", {
      roomName: activeConf.jitsi_room,
      parentNode: jitsiRef.current,
      width: "100%",
      height: "100%",
      userInfo: {
        displayName: currentUser.name,
        email: "",
      },
      configOverwrite: {
        startWithAudioMuted: false,
        startWithVideoMuted: true,
        disableDeepLinking: true,
        prejoinPageEnabled: false,
        enableWelcomePage: false,
        toolbarButtons: ["microphone", "camera", "hangup", "fullscreen", "tileview"],
      },
      interfaceConfigOverwrite: {
        SHOW_JITSI_WATERMARK: false,
        SHOW_BRAND_WATERMARK: false,
        SHOW_POWERED_BY: false,
        TOOLBAR_ALWAYS_VISIBLE: true,
        MOBILE_APP_PROMO: false,
      },
    });

    api.on("audioMuteStatusChanged", ({ muted }: { muted: boolean }) => setMicOn(!muted));
    api.on("videoMuteStatusChanged", ({ muted }: { muted: boolean }) => setCamOn(!muted));
    api.on("readyToClose", () => handleLeave());

    jitsiApiRef.current = api;

    return () => {
      try { api.dispose(); } catch {}
    };
  }, [activeConf?.id, jitsiLoaded]);

  // Chat polling
  useEffect(() => {
    if (!activeConf) {
      if (chatPollRef.current) clearInterval(chatPollRef.current);
      setMessages([]);
      return;
    }
    loadMessages(activeConf.id);
    chatPollRef.current = setInterval(() => loadMessages(activeConf.id), 3000);
    return () => { if (chatPollRef.current) clearInterval(chatPollRef.current); };
  }, [activeConf?.id]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadMessages = async (confId: string) => {
    const res = await fetch(`/api/conferences/messages?conferenceId=${confId}`);
    const data = await res.json();
    if (Array.isArray(data)) setMessages(data);
  };

  const handleJoin = async (conf: Conference) => {
    // Mark invitation as seen
    await fetch("/api/conferences/invite", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conferenceId: conf.id, userId: currentUser.id }),
    }).catch(() => {});
    setActiveConf(conf);
    setShowChat(true);
  };

  const handleLeave = () => {
    if (jitsiApiRef.current) {
      try { jitsiApiRef.current.dispose(); } catch {}
      jitsiApiRef.current = null;
    }
    setActiveConf(null);
    loadConferences();
  };

  const handleEndConference = async (confId: string) => {
    await fetch("/api/conferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: confId, status: "ended" }),
    });
    handleLeave();
  };

  const handleCreate = async () => {
    if (!createForm.title.trim()) { setCreateError("Введите название"); return; }
    if (!createForm.cityId) { setCreateError("Выберите город"); return; }
    setCreating(true);
    setCreateError("");
    try {
      const res = await fetch("/api/conferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: createForm.title.trim(),
          cityId: createForm.cityId,
          companyId: createForm.companyId || null,
          createdBy: currentUser.id,
          createdByName: currentUser.name,
        }),
      });
      if (!res.ok) { const d = await res.json(); setCreateError(d.error || "Ошибка"); return; }
      const conf = await res.json();
      setShowCreate(false);
      setCreateForm({ title: "", cityId: city || "moscow", companyId: companyId || "" });
      await loadConferences();
      handleJoin(conf);
    } finally {
      setCreating(false);
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || !activeConf) return;
    setSendingMsg(true);
    try {
      await fetch("/api/conferences/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conferenceId: activeConf.id,
          userId: currentUser.id,
          userName: currentUser.name,
          userRole: currentUser.role,
          message: chatInput.trim(),
        }),
      });
      setChatInput("");
      await loadMessages(activeConf.id);
    } finally {
      setSendingMsg(false);
    }
  };

  const toggleMic = () => {
    if (jitsiApiRef.current) jitsiApiRef.current.executeCommand("toggleAudio");
  };

  const toggleCam = () => {
    if (jitsiApiRef.current) jitsiApiRef.current.executeCommand("toggleVideo");
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  };

  // ── ACTIVE CONFERENCE VIEW ──
  if (activeConf) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 120px)", gap: 0 }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", gap: 12, padding: "14px 20px",
          background: "rgba(19,19,30,0.95)", borderBottom: "1px solid rgba(255,255,255,0.07)",
          borderRadius: "18px 18px 0 0", flexShrink: 0
        }}>
          <div style={{ width: 36, height: 36, borderRadius: 11, background: "linear-gradient(135deg, #4f8ef7, #7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
            🎥
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#f0f0fa", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{activeConf.title}</div>
            <div style={{ fontSize: 11, color: "#55556a", marginTop: 1 }}>
              {cityLabel(activeConf.city_id)} · Создал {activeConf.created_by_name}
            </div>
          </div>
          {/* Controls */}
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <motion.button whileTap={{ scale: 0.9 }} onClick={toggleMic}
              style={{
                width: 38, height: 38, borderRadius: 11,
                background: micOn ? "rgba(74,222,128,0.12)" : "rgba(239,68,68,0.12)",
                border: `1px solid ${micOn ? "rgba(74,222,128,0.25)" : "rgba(239,68,68,0.25)"}`,
                color: micOn ? "#4ade80" : "#ef4444", cursor: "pointer", fontSize: 18,
                display: "flex", alignItems: "center", justifyContent: "center"
              }}>
              {micOn ? "🎙️" : "🔇"}
            </motion.button>
            <motion.button whileTap={{ scale: 0.9 }} onClick={toggleCam}
              style={{
                width: 38, height: 38, borderRadius: 11,
                background: camOn ? "rgba(74,222,128,0.12)" : "rgba(255,255,255,0.05)",
                border: `1px solid ${camOn ? "rgba(74,222,128,0.25)" : "rgba(255,255,255,0.1)"}`,
                color: camOn ? "#4ade80" : "#55556a", cursor: "pointer", fontSize: 18,
                display: "flex", alignItems: "center", justifyContent: "center"
              }}>
              {camOn ? "📸" : "📷"}
            </motion.button>
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowChat(v => !v)}
              style={{
                width: 38, height: 38, borderRadius: 11,
                background: showChat ? "rgba(79,142,247,0.12)" : "rgba(255,255,255,0.05)",
                border: `1px solid ${showChat ? "rgba(79,142,247,0.25)" : "rgba(255,255,255,0.1)"}`,
                color: showChat ? "#4f8ef7" : "#55556a", cursor: "pointer", fontSize: 18,
                display: "flex", alignItems: "center", justifyContent: "center"
              }}>
              💬
            </motion.button>
            {isAdmin && (
              <motion.button whileTap={{ scale: 0.9 }}
                onClick={() => handleEndConference(activeConf.id)}
                style={{
                  height: 38, borderRadius: 11, padding: "0 14px",
                  background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)",
                  color: "#ef4444", cursor: "pointer", fontSize: 12, fontWeight: 700
                }}>
                Завершить
              </motion.button>
            )}
            <motion.button whileTap={{ scale: 0.9 }} onClick={handleLeave}
              style={{
                height: 38, borderRadius: 11, padding: "0 14px",
                background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
                color: "#ef4444", cursor: "pointer", fontSize: 12, fontWeight: 600
              }}>
              Выйти
            </motion.button>
          </div>
        </div>

        {/* Body: Jitsi + Chat */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden", borderRadius: "0 0 18px 18px", background: "#080810" }}>
          {/* Jitsi */}
          <div style={{ flex: 1, minWidth: 0, position: "relative" }}>
            <div ref={jitsiRef} style={{ width: "100%", height: "100%" }} />
            {!jitsiLoaded && (
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "#080810", color: "#55556a", flexDirection: "column", gap: 12 }}>
                <div style={{ fontSize: 40 }}>🎥</div>
                <div style={{ fontSize: 14 }}>Загрузка видеозвонка...</div>
              </div>
            )}
          </div>

          {/* Chat panel */}
          <AnimatePresence>
            {showChat && (
              <motion.div
                initial={{ width: 0, opacity: 0 }} animate={{ width: 300, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }} transition={{ duration: 0.25 }}
                style={{
                  width: 300, flexShrink: 0, display: "flex", flexDirection: "column",
                  background: "rgba(12,12,20,0.98)", borderLeft: "1px solid rgba(255,255,255,0.06)", overflow: "hidden"
                }}
              >
                <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", fontSize: 12, fontWeight: 700, color: "#7878a0", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                  Чат конференции
                </div>

                {/* Messages */}
                <div style={{ flex: 1, overflowY: "auto", padding: "12px", display: "flex", flexDirection: "column", gap: 10 }}>
                  {messages.length === 0 ? (
                    <div style={{ color: "#44444e", fontSize: 12, textAlign: "center", marginTop: 24 }}>Нет сообщений</div>
                  ) : messages.map(msg => {
                    const isMe = msg.user_id === currentUser.id;
                    return (
                      <div key={msg.id} style={{ display: "flex", flexDirection: "column", alignItems: isMe ? "flex-end" : "flex-start" }}>
                        {!isMe && (
                          <div style={{ fontSize: 10, color: "#55556a", marginBottom: 3, paddingLeft: 4 }}>
                            {msg.user_name} {msg.user_role && <span style={{ color: "#44444e" }}>· {msg.user_role}</span>}
                          </div>
                        )}
                        <div style={{
                          maxWidth: "85%", padding: "8px 12px", borderRadius: isMe ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                          background: isMe ? "linear-gradient(135deg, #4f8ef7, #2563eb)" : "rgba(255,255,255,0.07)",
                          color: isMe ? "white" : "#d0d0e8", fontSize: 13, lineHeight: 1.45,
                          border: isMe ? "none" : "1px solid rgba(255,255,255,0.08)"
                        }}>
                          {msg.message}
                        </div>
                        <div style={{ fontSize: 9, color: "#33333d", marginTop: 3, paddingRight: 4 }}>{formatTime(msg.created_at)}</div>
                      </div>
                    );
                  })}
                  <div ref={chatBottomRef} />
                </div>

                {/* Input */}
                <div style={{ padding: "10px 12px", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", gap: 8 }}>
                  <input
                    type="text"
                    placeholder="Сообщение..."
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                    style={{
                      flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 11, padding: "9px 12px", fontSize: 13, color: "#e8e8f0", outline: "none",
                    }}
                  />
                  <motion.button
                    whileTap={{ scale: 0.9 }} onClick={handleSendMessage} disabled={sendingMsg || !chatInput.trim()}
                    style={{
                      width: 38, height: 38, borderRadius: 11, flexShrink: 0,
                      background: chatInput.trim() ? "linear-gradient(135deg, #4f8ef7, #2563eb)" : "rgba(255,255,255,0.05)",
                      border: "none", color: "white", cursor: chatInput.trim() ? "pointer" : "default",
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16
                    }}>
                    ➤
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  // ── CONFERENCE LIST VIEW ──
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: 16, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#f0f0fa", margin: 0 }}>Конференции</h2>
          <p style={{ fontSize: 13, color: "#55556a", marginTop: 4 }}>Видеозвонки и чат для сотрудников</p>
        </div>
        {isAdmin && (
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={() => { setShowCreate(v => !v); setCreateError(""); }}
            style={{
              background: showCreate ? "rgba(230,57,70,0.1)" : "linear-gradient(135deg, #4f8ef7, #2563eb)",
              border: showCreate ? "1px solid rgba(230,57,70,0.3)" : "none",
              borderRadius: 14, padding: "11px 20px", fontSize: 14, fontWeight: 600,
              color: showCreate ? "#e63946" : "white", cursor: "pointer",
              boxShadow: showCreate ? "none" : "0 4px 14px rgba(79,142,247,0.35)",
              display: "flex", alignItems: "center", gap: 8
            }}>
            {showCreate ? "✕ Отмена" : <><span style={{ fontSize: 18 }}>+</span> Создать конференцию</>}
          </motion.button>
        )}
      </div>

      {/* Create form (admin) */}
      <AnimatePresence>
        {showCreate && isAdmin && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            style={{ overflow: "hidden" }}
          >
            <div style={{
              background: "rgba(79,142,247,0.04)", border: "1px solid rgba(79,142,247,0.18)",
              borderRadius: 20, padding: "24px"
            }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#e8e8f0", marginBottom: 20 }}>Новая конференция</div>
              <div className="grid-cols-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={{ fontSize: 11, color: "#55556a", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>Название <span style={{ color: "#e63946" }}>*</span></label>
                  <input
                    type="text" placeholder="Оперативное совещание..."
                    value={createForm.title}
                    onChange={e => setCreateForm(f => ({ ...f, title: e.target.value }))}
                    style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "12px 14px", fontSize: 14, color: "#e8e8f0", outline: "none", boxSizing: "border-box" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: "#55556a", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>Город <span style={{ color: "#e63946" }}>*</span></label>
                  <select
                    value={createForm.cityId}
                    onChange={e => setCreateForm(f => ({ ...f, cityId: e.target.value, companyId: "" }))}
                    style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "12px 14px", fontSize: 14, color: "#e8e8f0", outline: "none", cursor: "pointer" }}
                  >
                    {cities.map(c => <option key={c.id} value={c.id} style={{ background: "#0a0a14" }}>{c.label}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 11, color: "#55556a", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>Компания <span style={{ color: "#44444e" }}>(все сотрудники города, если не выбрать)</span></label>
                <select
                  value={createForm.companyId}
                  onChange={e => setCreateForm(f => ({ ...f, companyId: e.target.value }))}
                  style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "12px 14px", fontSize: 14, color: "#e8e8f0", outline: "none", cursor: "pointer" }}
                >
                  <option value="" style={{ background: "#0a0a14" }}>Все компании города</option>
                  {companyList.map(c => <option key={c.id} value={c.id} style={{ background: "#0a0a14" }}>{c.name}</option>)}
                </select>
              </div>
              {createError && <p style={{ fontSize: 12, color: "#ef4444", marginBottom: 12 }}>⚠️ {createError}</p>}
              <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                onClick={handleCreate} disabled={creating}
                style={{
                  width: "100%", background: creating ? "rgba(79,142,247,0.3)" : "linear-gradient(135deg, #4f8ef7, #2563eb)",
                  border: "none", borderRadius: 14, padding: "14px", fontSize: 14, fontWeight: 700,
                  color: "white", cursor: creating ? "default" : "pointer", boxShadow: "0 4px 16px rgba(79,142,247,0.3)"
                }}>
                {creating ? "Создание..." : "🎥 Создать и войти в конференцию"}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Conferences list */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px", color: "#55556a" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🎥</div>
          <div>Загрузка...</div>
        </div>
      ) : conferences.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "64px 32px",
          background: "rgba(19,19,26,0.5)", border: "1px dashed rgba(255,255,255,0.08)",
          borderRadius: 20, color: "#44444e"
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎥</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: "#55556a", marginBottom: 8 }}>Нет активных конференций</div>
          <div style={{ fontSize: 13 }}>
            {isAdmin ? "Нажмите «Создать конференцию» чтобы начать видеозвонок" : "Администратор пришлёт вам приглашение"}
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {conferences.map((conf, i) => (
            <motion.div
              key={conf.id}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: i * 0.06 }}
              style={{
                background: "rgba(19,19,30,0.9)", border: "1px solid rgba(79,142,247,0.2)",
                borderRadius: 20, padding: "20px 24px", display: "flex", alignItems: "center", gap: 20
              }}
            >
              {/* Live indicator */}
              <div style={{ position: "relative", flexShrink: 0 }}>
                <div style={{ width: 52, height: 52, borderRadius: 16, background: "linear-gradient(135deg, #4f8ef7, #7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>
                  🎥
                </div>
                <div style={{
                  position: "absolute", bottom: -2, right: -2, width: 14, height: 14,
                  borderRadius: "50%", background: "#4ade80", border: "2px solid #080810",
                  boxShadow: "0 0 8px rgba(74,222,128,0.6)"
                }} />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: "#f0f0fa" }}>{conf.title}</span>
                  <span style={{
                    fontSize: 9, padding: "2px 8px", borderRadius: 20,
                    background: "rgba(74,222,128,0.12)", color: "#4ade80",
                    border: "1px solid rgba(74,222,128,0.25)", fontWeight: 700, letterSpacing: "0.08em"
                  }}>LIVE</span>
                </div>
                <div style={{ fontSize: 12, color: "#55556a", display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <span>📍 {cityLabel(conf.city_id)}</span>
                  <span>👤 {conf.created_by_name}</span>
                  <span>🕐 {formatDate(conf.created_at)}</span>
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                {isAdmin && (
                  <motion.button
                    whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    onClick={() => handleEndConference(conf.id)}
                    style={{
                      height: 40, borderRadius: 12, padding: "0 16px",
                      background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
                      color: "#ef4444", cursor: "pointer", fontSize: 12, fontWeight: 600
                    }}>
                    Завершить
                  </motion.button>
                )}
                <motion.button
                  whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                  onClick={() => handleJoin(conf)}
                  style={{
                    height: 40, borderRadius: 12, padding: "0 20px",
                    background: "linear-gradient(135deg, #4f8ef7, #2563eb)",
                    border: "none", color: "white", cursor: "pointer",
                    fontSize: 13, fontWeight: 700, boxShadow: "0 4px 14px rgba(79,142,247,0.35)",
                    display: "flex", alignItems: "center", gap: 8
                  }}>
                  <span style={{ fontSize: 16 }}>📞</span> Войти
                </motion.button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
