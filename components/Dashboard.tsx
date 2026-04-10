"use client";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import PatrolSection from "./sections/PatrolSection";
import ShiftSection from "./sections/ShiftSection";
import PostsSection from "./sections/PostsSection";
import PhotoReportSection from "./sections/PhotoReportSection";
import ApartmentSection from "./sections/ApartmentSection";
import InventorySection from "./sections/InventorySection";
import TransportSection from "./sections/TransportSection";
import ScheduleSection from "./sections/ScheduleSection";
import FinesSection from "./sections/FinesSection";
import ExpensesSection from "./sections/ExpensesSection";
import AdminLogSection from "./sections/AdminLogSection";
import WorkScheduleSection from "./sections/WorkScheduleSection";
import EmployeesSection from "./sections/EmployeesSection";
import ConferenceSection from "./sections/ConferenceSection";
import PostAccountingSection from "./sections/PostAccountingSection";
import { AppUser, Company } from "@/lib/auth";
import { FaceCheckModal, shouldRequireFaceCheck } from "@/components/FaceCheckModal";
import { RequestModal } from "./RequestModal";

const MENU = [
  { id: "patrol",        label: "Обходы",    fullLabel: "Обходы",          icon: "🔦", color: "#4f8ef7", bg: "rgba(79,142,247,0.15)",  adminOnly: false },
  { id: "shift",         label: "Смены",     fullLabel: "Смены",           icon: "🔄", color: "#43b89c", bg: "rgba(67,184,156,0.15)",  adminOnly: false },
  { id: "posts",         label: "Посты",     fullLabel: "Посты",           icon: "🏢", color: "#a78bfa", bg: "rgba(167,139,250,0.15)", adminOnly: false },
  { id: "photo",         label: "Фото",      fullLabel: "Фото отчёт",      icon: "📷", color: "#fb923c", bg: "rgba(251,146,60,0.15)",  adminOnly: false },
  { id: "apartment",     label: "Квартира",  fullLabel: "Квартира",        icon: "🏠", color: "#34d399", bg: "rgba(52,211,153,0.15)",  adminOnly: false },
  { id: "inventory",     label: "Имущество", fullLabel: "Имущество ЧОП",   icon: "📦", color: "#f87171", bg: "rgba(248,113,113,0.15)", adminOnly: false },
  { id: "transport",     label: "Транспорт", fullLabel: "Транспорт",       icon: "🚗", color: "#fbbf24", bg: "rgba(251,191,36,0.15)",  adminOnly: false },
  { id: "schedule",      label: "График",    fullLabel: "График",          icon: "📅", color: "#60a5fa", bg: "rgba(96,165,250,0.15)",  adminOnly: false },
  { id: "fines",         label: "Штрафы",    fullLabel: "Штрафы",          icon: "⚠️", color: "#ef4444", bg: "rgba(239,68,68,0.15)",   adminOnly: false },
  { id: "expenses",      label: "Расходы",   fullLabel: "Расходы",         icon: "💰", color: "#fbbf24", bg: "rgba(251,191,36,0.15)",  adminOnly: true  },
  { id: "work_schedule", label: "Вахта",     fullLabel: "График вахт",     icon: "🗓️", color: "#22d3ee", bg: "rgba(34,211,238,0.15)",  adminOnly: true  },
  { id: "admin_log",     label: "Журнал",    fullLabel: "Журнал логов",    icon: "🗂️", color: "#4f8ef7", bg: "rgba(79,142,247,0.15)",  adminOnly: true  },
  { id: "employees",     label: "Сотрудники", fullLabel: "Сотрудники",       icon: "👥", color: "#3b82f6", bg: "rgba(59,130,246,0.15)",  adminOnly: false },
  { id: "post_accounting", label: "Учёт поста", fullLabel: "Учёт поста",  icon: "📊", color: "#10b981", bg: "rgba(16,185,129,0.15)",  adminOnly: true  },
  { id: "conference",    label: "Конф.",     fullLabel: "Конференция",      icon: "🎥", color: "#7c3aed", bg: "rgba(124,58,237,0.15)",  adminOnly: false },
];

const CITY_LABELS: Record<string, string> = {
  moscow: "Москва", spb: "Санкт-Петербург", novosibirsk: "Новосибирск",
  yekaterinburg: "Екатеринбург", kazan: "Казань", krasnodar: "Краснодар",
};

function getSectionMap(city: string, companyId?: string, currentUser?: AppUser): Record<string, React.ReactNode> {
  return {
    patrol:        <PatrolSection city={city} companyId={companyId} />,
    shift:         <ShiftSection city={city} companyId={companyId} />,
    posts:         <PostsSection city={city} companyId={companyId} />,
    photo:         <PhotoReportSection city={city} companyId={companyId} />,
    apartment:     <ApartmentSection city={city} companyId={companyId} />,
    inventory:     <InventorySection city={city} companyId={companyId} readOnly={!currentUser?.is_admin} currentUser={currentUser} />,
    transport:     <TransportSection city={city} companyId={companyId} currentUser={currentUser} />,
    schedule:      <ScheduleSection city={city} companyId={companyId} />,
    fines:         <FinesSection city={city} companyId={companyId} />,
    expenses:      currentUser ? <ExpensesSection city={city} companyId={companyId} currentUser={currentUser} /> : null,
    work_schedule: <WorkScheduleSection city={city} companyId={companyId} />,
      employees: <EmployeesSection city={city} companyId={companyId} currentUser={currentUser as AppUser} />,
      admin_log:     <AdminLogSection city={city} companyId={companyId} />,
      post_accounting: <PostAccountingSection city={city} companyId={companyId} />,
      conference:    <ConferenceSection city={city} companyId={companyId} currentUser={currentUser as AppUser} isAdmin={!!currentUser?.is_admin} />,
  };
}

type EmergencyAlert = { id: string; triggered_by: string; triggered_by_role: string; message: string; created_at: string; };

export default function Dashboard({ city, cityLabel, company, currentUser, onCityChange, onLogout }: {
  city: string; cityLabel?: string; company?: Company; currentUser: AppUser;
  onCityChange: () => void; onLogout: () => void;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [showCompanyInfo, setShowCompanyInfo] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestType, setRequestType] = useState<"connect" | "new_object" | "subscription">("connect");
  const [subscriptionPhone, setSubscriptionPhone] = useState("+7 (999) 000-00-00");
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showCredentialsPrompt, setShowCredentialsPrompt] = useState(false);
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  
  const isTrialExpired = useMemo(() => {
    if (currentUser.is_admin) return false;
    if (!company?.subscriptionEndsAt) return false;
    return new Date(company.subscriptionEndsAt).getTime() < Date.now();
  }, [company?.subscriptionEndsAt, currentUser.is_admin]);

  const daysLeft = useMemo(() => {
    if (!company?.subscriptionEndsAt) return 0;
    const diff = new Date(company.subscriptionEndsAt).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }, [company?.subscriptionEndsAt]);

  useEffect(() => {
    if (isTrialExpired) setShowSubscriptionModal(true);
  }, [isTrialExpired]);

  useEffect(() => {
    // Suggest changing credentials after 3 days
    if (currentUser.created_at && !currentUser.is_admin) {
      const ageInDays = (Date.now() - new Date(currentUser.created_at).getTime()) / (1000 * 60 * 60 * 24);
      const hasDismissed = localStorage.getItem(`dismissed_creds_prompt_${currentUser.id}`);
      if (ageInDays >= 3 && !hasDismissed) {
        setShowCredentialsPrompt(true);
      }
    }
  }, [currentUser.created_at, currentUser.id, currentUser.is_admin]);

  useEffect(() => {
    fetch("/api/admin/settings").then(r => r.json()).then(s => {
      if (s.subscription_phone) setSubscriptionPhone(s.subscription_phone);
    }).catch(() => {});
  }, []);

  const sectionMap = getSectionMap(city, company?.id, currentUser);

  // Periodic face check every 3 hours
  const [showPeriodicFaceCheck, setShowPeriodicFaceCheck] = useState(false);
  useEffect(() => {
    // Check immediately on mount if 3h have passed
    if (shouldRequireFaceCheck(currentUser.login)) {
      setShowPeriodicFaceCheck(true);
    }
    // Re-check every minute
    const interval = setInterval(() => {
      if (shouldRequireFaceCheck(currentUser.login)) {
        setShowPeriodicFaceCheck(true);
      }
    }, 60_000);
    return () => clearInterval(interval);
  }, [currentUser.login]);

  const [emergencyAlert, setEmergencyAlert] = useState<EmergencyAlert | null>(null);
  const [emConfirm, setEmConfirm] = useState(false);
  const [emSending, setEmSending] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Conference notifications
  type ConfInvite = { id: string; conference_id: string; title: string; jitsi_room: string; created_by_name: string; conf_created_at: string; };
  const [confInvites, setConfInvites] = useState<ConfInvite[]>([]);
  const [showConfBanner, setShowConfBanner] = useState(false);
  const confPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const checkConfInvites = useCallback(async () => {
    try {
      const q = new URLSearchParams();
      q.set("cityId", city);
      if (company?.id) q.set("companyId", company.id);
      q.set("userId", currentUser.id);
      const res = await fetch(`/api/conferences/invite?${q}`);
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setConfInvites(data);
        setShowConfBanner(true);
      }
    } catch {}
  }, [city, company?.id, currentUser.id]);

  useEffect(() => {
    checkConfInvites();
    confPollRef.current = setInterval(checkConfInvites, 8000);
    return () => { if (confPollRef.current) clearInterval(confPollRef.current); };
  }, [checkConfInvites]);

  const checkEmergency = useCallback(async () => {
    try {
      const q = new URLSearchParams();
      if (city) q.set("cityId", city);
      if (company?.id) q.set("companyId", company.id);
      const res = await fetch(`/api/emergency?${q}`);
      const data = await res.json();
      setEmergencyAlert(Array.isArray(data) && data.length > 0 ? data[0] : null);
    } catch {}
  }, [city, company?.id]);

  const triggerEmergency = async () => {
    setEmSending(true);
    await fetch("/api/emergency", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cityId: city, companyId: company?.id || "", triggeredBy: currentUser.name, triggeredByRole: currentUser.role, message: "ЧП на объекте!" }),
    });
    fetch("/api/push/send", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "🚨 ЧП НА ОБЪЕКТЕ!", body: `Сообщил: ${currentUser.name}`, urgent: true, adminOnly: true }),
    }).catch(() => {});
    setEmSending(false); setEmConfirm(false); checkEmergency();
  };

  const resolveEmergency = async () => {
    if (!emergencyAlert) return;
    await fetch("/api/emergency", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: emergencyAlert.id }) });
    setEmergencyAlert(null);
  };

  useEffect(() => {
    checkEmergency();
    pollRef.current = setInterval(checkEmergency, 10000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [checkEmergency]);

  useEffect(() => {
    if (!currentUser.is_admin) return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) return;
    navigator.serviceWorker.ready.then(reg => {
      Notification.requestPermission().then(perm => {
        if (perm !== "granted") return;
        reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: vapidKey }).then(sub => {
          fetch("/api/push/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: currentUser.id, userName: currentUser.name, isAdmin: true, subscription: sub.toJSON() }) }).catch(() => {});
        }).catch(() => {});
      });
    }).catch(() => {});
  }, [currentUser.is_admin, currentUser.id, currentUser.name]);

  const allowedMenu = MENU.filter(m => {
    if (m.adminOnly) return !!currentUser.is_admin;
    if (currentUser.allowedSections.length === 0) return true;
    return currentUser.allowedSections.includes(m.id as any);
  });

  const [active, setActive] = useState<string | null>(allowedMenu.length > 0 ? allowedMenu[0].id : null);

  useEffect(() => {
    const check = () => {
      const w = window.innerWidth;
      setIsMobile(w < 768);
      if (w < 1024) setSidebarOpen(false);
      else setSidebarOpen(true);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  if (isMobile) {
    return (
      <>
        {/* ── PERIODIC FACE CHECK (every 3h) ── */}
        {showPeriodicFaceCheck && (
          <FaceCheckModal
            userLogin={currentUser.login}
            userName={currentUser.name}
            userId={currentUser.id}
            city={city}
            companyId={company?.id}
            checkType="periodic"
            onSuccess={() => setShowPeriodicFaceCheck(false)}
          />
        )}
        <MobileLayout
          active={active} setActive={setActive} sectionMap={sectionMap} city={city}
          onCityChange={onCityChange} menu={allowedMenu} currentUser={currentUser} onLogout={onLogout}
          emergencyAlert={emergencyAlert} onEmergency={() => setEmConfirm(true)} onResolve={resolveEmergency}
          emConfirm={emConfirm} setEmConfirm={setEmConfirm} emSending={emSending} triggerEmergency={triggerEmergency}
          onRequest={(type: "connect" | "new_object" | "subscription" = "connect") => { setRequestType(type); setShowRequestModal(true); }}
        />
      </>
    );
  }

  const activeItem = MENU.find(m => m.id === active);

  return (
    <>
      {/* ── PERIODIC FACE CHECK desktop (every 3h) ── */}
      {showPeriodicFaceCheck && (
        <FaceCheckModal
          userLogin={currentUser.login}
          userName={currentUser.name}
          userId={currentUser.id}
          city={city}
          companyId={company?.id}
          checkType="periodic"
          onSuccess={() => setShowPeriodicFaceCheck(false)}
        />
      )}
      <div style={{ display: "flex", height: "100dvh", background: "#080810", overflow: "hidden", width: "100%" }}>

        {/* ── SIDEBAR ── */}
        <aside style={{
          width: sidebarOpen ? 248 : 64,
          height: "100%",
          background: "rgba(10,10,18,0.97)",
          borderRight: "1px solid rgba(255,255,255,0.05)",
          display: "flex", flexDirection: "column", flexShrink: 0,
          transition: "width 0.32s cubic-bezier(0.16,1,0.3,1)",
          overflow: "hidden", position: "sticky", top: 0, zIndex: 100,
        }}>

          {/* Logo */}
          <div style={{ padding: "18px 12px 10px", display: "flex", alignItems: "center", gap: 10 }}>
            <motion.div whileHover={{ scale: 1.07 }} whileTap={{ scale: 0.95 }}
              onClick={() => setSidebarOpen(v => !v)}
              style={{
                width: 40, height: 40, borderRadius: 14, flexShrink: 0,
                background: "linear-gradient(135deg, #e63946 0%, #ff6b35 100%)",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 4px 20px rgba(230,57,70,0.35)", cursor: "pointer",
              }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L4 6v6c0 5.5 3.5 10.7 8 12 4.5-1.3 8-6.5 8-12V6L12 2z" fill="white"/>
              </svg>
            </motion.div>
            <AnimatePresence>
              {sidebarOpen && (
                <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.18 }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "#f0f0fa", letterSpacing: "-0.3px" }}>Глаза ЧОПа</div>
                  <div style={{ fontSize: 9, color: "#404058", letterSpacing: "0.12em", textTransform: "uppercase", marginTop: 1 }}>ВИСРАИЛ</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Nav */}
          <nav style={{ flex: 1, padding: "4px 8px", overflowY: "auto" }}>
            {[
              { id: "monitoring", label: "Мониторинг", sections: ["transport","patrol","admin_log","photo"] },
              { id: "management", label: "Управление",  sections: ["shift","posts","apartment","inventory","schedule","fines","expenses","work_schedule","post_accounting"] },
            ].map(group => {
              const items = allowedMenu.filter(m => group.sections.includes(m.id));
              if (items.length === 0) return null;
              return (
                <div key={group.id} style={{ marginBottom: 8 }}>
                  {sidebarOpen && (
                    <div style={{ padding: "10px 10px 4px", fontSize: 10, fontWeight: 700, color: "#383850", textTransform: "uppercase", letterSpacing: "0.12em" }}>
                      {group.label}
                    </div>
                  )}
                  {items.map((item, i) => {
                    const isActive = active === item.id;
                    return (
                      <motion.button key={item.id}
                        initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03 }}
                        onClick={() => setActive(item.id)}
                        whileHover={{ x: sidebarOpen ? 2 : 0 }}
                        whileTap={{ scale: 0.96 }}
                        style={{
                          width: "100%", display: "flex", alignItems: "center",
                          gap: 10, padding: sidebarOpen ? "9px 10px" : "9px 0",
                          justifyContent: sidebarOpen ? "flex-start" : "center",
                          borderRadius: 13, border: "none", cursor: "pointer", marginBottom: 2,
                          background: isActive ? item.bg : "transparent",
                          transition: "all 0.18s",
                        }}>
                        <span style={{
                          fontSize: 18, flexShrink: 0, width: 26, height: 26,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          borderRadius: 9,
                          background: isActive ? "rgba(255,255,255,0.1)" : "transparent",
                        }}>{item.icon}</span>
                        {sidebarOpen && (
                          <span style={{
                            fontSize: 13, fontWeight: isActive ? 600 : 400,
                            color: isActive ? "#f0f0fa" : "#606078",
                          }}>{item.fullLabel}</span>
                        )}
                        {isActive && sidebarOpen && (
                          <motion.div layoutId="activeBar"
                            style={{ marginLeft: "auto", width: 6, height: 6, borderRadius: "50%", background: item.color, flexShrink: 0 }} />
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              );
            })}
          </nav>

          {/* User footer */}
          <AnimatePresence>
            {sidebarOpen && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ padding: "12px", borderTop: "1px solid rgba(255,255,255,0.04)", margin: "0 4px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 12, flexShrink: 0,
                    background: "linear-gradient(135deg, #4f8ef7, #a78bfa)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 15, fontWeight: 700, color: "white",
                  }}>{currentUser.name.charAt(0).toUpperCase()}</div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#e8e8f0" }}>{currentUser.name}</div>
                    <div style={{ fontSize: 10, color: "#404058" }}>{currentUser.role}</div>
                  </div>
                </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} 
                          onClick={() => { setRequestType("new_object"); setShowRequestModal(true); }}
                          style={{ flex: 1, background: "rgba(79,142,247,0.1)", border: "1px solid rgba(79,142,247,0.2)", borderRadius: 11, padding: "8px 6px", color: "#4f8ef7", fontSize: 11, cursor: "pointer", fontWeight: 500 }}>
                          +Объект
                        </motion.button>
                        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} 
                          onClick={() => { setRequestType("subscription"); setShowRequestModal(true); }}
                          style={{ flex: 1, background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.2)", borderRadius: 11, padding: "8px 6px", color: "#fbbf24", fontSize: 11, cursor: "pointer", fontWeight: 500 }}>
                          Оплатить
                        </motion.button>
                      </div>
                      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={onLogout}
                        style={{ width: "100%", background: "rgba(230,57,70,0.07)", border: "1px solid rgba(230,57,70,0.12)", borderRadius: 11, padding: "8px 6px", color: "#e63946", fontSize: 11, cursor: "pointer", fontWeight: 500 }}>
                        Выйти
                      </motion.button>
                    </div>
              </motion.div>
            )}
          </AnimatePresence>
        </aside>

        {/* ── MAIN ── */}
        <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "auto", minWidth: 0, height: "100%" }}>

          {/* Header */}
          <motion.header initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.4 }}
            style={{
              padding: "14px 24px", borderBottom: "1px solid rgba(255,255,255,0.04)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              background: "rgba(8,8,16,0.7)", backdropFilter: "blur(20px)",
              position: "sticky", top: 0, zIndex: 50,
            }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {activeItem && (
                <div style={{
                  width: 38, height: 38, borderRadius: 12, flexShrink: 0,
                  background: activeItem.bg,
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
                }}>{activeItem.icon}</div>
              )}
              <div>
                <h2 style={{ fontSize: 17, fontWeight: 700, color: "#f0f0fa", letterSpacing: "-0.2px" }}>
                  {activeItem?.fullLabel ?? "Главная"}
                </h2>
                  <p style={{ fontSize: 11, color: "#404058", marginTop: 1 }}>
                    📍 {cityLabel || CITY_LABELS[city] || city}
                    {company && <span style={{ color: "#4f8ef7", cursor: "pointer" }} onClick={() => setShowCompanyInfo(true)}> · {company.name}</span>}
                    {company?.subscriptionEndsAt && !currentUser.is_admin && (
                      <span style={{ color: daysLeft <= 1 ? "#ef4444" : "#34d399", fontWeight: 700 }}>
                        {" · "}
                        {daysLeft > 0 ? `Осталось ${daysLeft} ${daysLeft === 1 ? 'день' : (daysLeft < 5 ? 'дня' : 'дней')}` : "Подписка истекла"}
                      </span>
                    )}
                    {" · "}{new Date().toLocaleDateString("ru-RU", { weekday: "short", day: "numeric", month: "short" })}
                  </p>

              </div>
            </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <motion.button
                      whileHover={{ scale: 1.07 }} whileTap={{ scale: 0.9 }}
                      onClick={() => { setRequestType("connect"); setShowRequestModal(true); }}
                      style={{ width: 38, height: 38, borderRadius: 12, background: "rgba(52,211,153,0.15)", border: `1px solid rgba(52,211,153,0.4)`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
                      📝
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.07 }} whileTap={{ scale: 0.9 }}
                      onClick={() => { setRequestType("new_object"); setShowRequestModal(true); }}
                      style={{ width: 38, height: 38, borderRadius: 12, background: "rgba(79,142,247,0.15)", border: `1px solid rgba(79,142,247,0.4)`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
                      🏗️
                    </motion.button>
                    {/* Conference bell notification - only show when there are invites */}
                  {confInvites.length > 0 && (
                  <motion.button
                    whileHover={{ scale: 1.07 }} whileTap={{ scale: 0.9 }}
                    onClick={() => { setActive("conference"); setShowConfBanner(false); }}
                    style={{ position: "relative", width: 38, height: 38, borderRadius: 12, background: "rgba(124,58,237,0.15)", border: `1px solid rgba(124,58,237,0.4)`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
                    🎥
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1, repeat: Infinity }}
                      style={{ position: "absolute", top: -4, right: -4, width: 16, height: 16, borderRadius: "50%", background: "#7c3aed", border: "2px solid #080810", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "white", fontWeight: 800 }}>
                      {confInvites.length}
                    </motion.div>
                  </motion.button>
                  )}

                {!currentUser.is_admin && (
                <motion.button onClick={() => setEmConfirm(true)} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.95 }}
                  animate={emergencyAlert ? { boxShadow: ["0 0 0px rgba(239,68,68,0)", "0 0 20px rgba(239,68,68,0.7)", "0 0 0px rgba(239,68,68,0)"] } : {}}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  style={{
                    background: emergencyAlert ? "linear-gradient(135deg, #ef4444, #c1121f)" : "rgba(239,68,68,0.1)",
                    border: `1.5px solid ${emergencyAlert ? "#ef4444" : "rgba(239,68,68,0.3)"}`,
                    borderRadius: 12, padding: "8px 16px",
                    color: "white", fontSize: 13, cursor: "pointer", fontWeight: 700,
                  }}>🚨 ЧП</motion.button>
              )}
              {currentUser.is_admin && emergencyAlert && (
                <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }} onClick={resolveEmergency}
                  style={{ background: "rgba(239,68,68,0.12)", border: "1.5px solid rgba(239,68,68,0.3)", borderRadius: 12, padding: "8px 14px", color: "#f87171", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>
                  ✓ Снять тревогу
                </motion.button>
              )}
            </div>
          </motion.header>

          {/* ЧП баннер */}
          <AnimatePresence>
            {emergencyAlert && (
              <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
                style={{ background: "linear-gradient(135deg, rgba(239,68,68,0.95), rgba(185,28,28,0.95))", padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 22 }}>🚨</span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "white" }}>ЧП НА ОБЪЕКТЕ!</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }}>
                      {emergencyAlert.triggered_by} · {new Date(emergencyAlert.created_at).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                </div>
                {currentUser.is_admin && (
                  <motion.button whileTap={{ scale: 0.96 }} onClick={resolveEmergency}
                    style={{ background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.35)", borderRadius: 9, padding: "6px 14px", color: "white", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>
                    ✓ Снять
                  </motion.button>
                )}
              </motion.div>
            )}
            </AnimatePresence>

            {/* Conference invite banner */}
            <AnimatePresence>
              {showConfBanner && confInvites.length > 0 && (
                <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
                  style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.92), rgba(79,70,229,0.92))", padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <motion.span animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 1, repeat: Infinity }} style={{ fontSize: 22 }}>🎥</motion.span>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "white" }}>Вас приглашают на конференцию!</div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.75)" }}>
                        «{confInvites[0].title}» · {confInvites[0].created_by_name}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <motion.button whileTap={{ scale: 0.96 }}
                      onClick={() => { setActive("conference"); setShowConfBanner(false); }}
                      style={{ background: "rgba(255,255,255,0.25)", border: "1px solid rgba(255,255,255,0.4)", borderRadius: 9, padding: "6px 14px", color: "white", fontSize: 12, cursor: "pointer", fontWeight: 700 }}>
                      Войти
                    </motion.button>
                    <motion.button whileTap={{ scale: 0.96 }}
                      onClick={() => setShowConfBanner(false)}
                      style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.5)", fontSize: 18, cursor: "pointer" }}>
                      ×
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Content */}
          <div style={{ flex: 1, padding: "24px" }}>
            <AnimatePresence mode="wait">
              {active ? (
                <motion.div key={active}
                  initial={{ opacity: 0, y: 16, scale: 0.99 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -12, scale: 0.99 }}
                  transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}>
                  {sectionMap[active]}
                </motion.div>
              ) : (
                <div style={{ textAlign: "center", padding: 60, color: "#404058" }}>Выберите раздел</div>
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* ЧП диалог */}
      <AnimatePresence>
        {emConfirm && (
          <div style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => !emSending && setEmConfirm(false)}
              style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)" }} />
            <motion.div initial={{ opacity: 0, scale: 0.88 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.88 }}
              style={{ position: "relative", background: "#12121e", border: "2px solid rgba(239,68,68,0.4)", borderRadius: 24, padding: "32px 24px", width: "100%", maxWidth: 360, zIndex: 1, textAlign: "center", boxShadow: "0 0 60px rgba(239,68,68,0.25)" }}>
              <motion.div animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 0.9, repeat: Infinity }}>
                <div style={{ fontSize: 52, marginBottom: 14 }}>🚨</div>
              </motion.div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: "#f87171", marginBottom: 8 }}>ТРЕВОГА — ЧП!</h3>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 24 }}>Оповещение получат все администраторы.</p>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setEmConfirm(false)} disabled={emSending}
                  style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "14px", fontSize: 14, color: "#606078", cursor: "pointer" }}>Отмена</button>
                <motion.button whileTap={{ scale: 0.95 }} onClick={triggerEmergency} disabled={emSending}
                  style={{ flex: 1, background: "linear-gradient(135deg, #ef4444, #c1121f)", border: "none", borderRadius: 14, padding: "14px", fontSize: 14, fontWeight: 700, color: "white", cursor: "pointer", opacity: emSending ? 0.6 : 1 }}>
                  {emSending ? "Отправка..." : "🚨 ЧП!"}
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Инфо о компании */}
      <AnimatePresence>
        {showCompanyInfo && company && (
          <div style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowCompanyInfo(false)}
              style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(12px)" }} />
            <motion.div initial={{ opacity: 0, scale: 0.92, y: 24 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.92, y: 24 }}
              style={{ position: "relative", background: "#12121e", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 28, padding: "32px", width: "100%", maxWidth: 400, zIndex: 1, boxShadow: "0 40px 120px rgba(0,0,0,0.8)" }}>
              <div style={{ textAlign: "center", marginBottom: 24 }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🏢</div>
                <h3 style={{ fontSize: 20, fontWeight: 700, color: "#f0f0fa" }}>{company.name}</h3>
                <p style={{ fontSize: 12, color: "#404058" }}>📍 {cityLabel || city}</p>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
                <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 14, padding: "14px", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <div style={{ fontSize: 10, color: "#404058", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>О компании</div>
                  <p style={{ fontSize: 13, color: "#e0e0f0" }}>{company.description || "Описание не указано"}</p>
                </div>
                <div className="grid-cols-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div style={{ background: "rgba(79,142,247,0.08)", borderRadius: 14, padding: "14px", border: "1px solid rgba(79,142,247,0.15)" }}>
                    <div style={{ fontSize: 10, color: "#404058", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>Сотрудников</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: "#4f8ef7" }}>{company.employee_count || 0}</div>
                  </div>
                  <div style={{ background: "rgba(167,139,250,0.08)", borderRadius: 14, padding: "14px", border: "1px solid rgba(167,139,250,0.15)" }}>
                    <div style={{ fontSize: 10, color: "#404058", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>Профессии</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: "#a78bfa" }}>{company.professions_list?.split(",").length || 0}</div>
                  </div>
                </div>
              </div>
              <button onClick={() => setShowCompanyInfo(false)}
                style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "13px", color: "white", fontSize: 14, cursor: "pointer" }}>Закрыть</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

        <RequestModal 
          isOpen={showRequestModal} 
          onClose={() => setShowRequestModal(false)} 
          userId={currentUser.id}
          type={requestType}
          companyId={company?.id}
          defaultObjectName={company?.name}
        />

        {/* ── MODAL: Subscription Expired ── */}
        <AnimatePresence>
          {showSubscriptionModal && (
            <div style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 20 }}>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.9)", backdropFilter: "blur(20px)" }} />
              <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                style={{ position: "relative", background: "#12121e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 32, padding: "40px 32px", width: "100%", maxWidth: 420, zIndex: 1, textAlign: "center", boxShadow: "0 40px 120px rgba(0,0,0,0.8)" }}>
                <div style={{ fontSize: 64, marginBottom: 20 }}>💳</div>
                <h3 style={{ fontSize: 24, fontWeight: 800, color: "#f0f0fa", marginBottom: 12 }}>Подписка истекла</h3>
                <p style={{ fontSize: 15, color: "#808090", lineHeight: 1.6, marginBottom: 30 }}>
                  Бесплатный период 3 дня закончился. Для продолжения работы необходимо оплатить подписку (9900₽/мес).
                </p>
                
                  <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 20, padding: "20px", border: "1px solid rgba(255,255,255,0.06)", marginBottom: 30 }}>
                    <div style={{ fontSize: 11, color: "#55556a", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8, fontWeight: 700 }}>Связаться для продления:</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: "#4f8ef7", letterSpacing: "0.02em" }}>{subscriptionPhone}</div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                      onClick={() => { setShowSubscriptionModal(false); setRequestType("subscription"); setShowRequestModal(true); }}
                      style={{ width: "100%", background: "linear-gradient(135deg, #fbbf24, #d97706)", border: "none", borderRadius: 16, padding: "16px", color: "white", fontSize: 15, fontWeight: 700, cursor: "pointer", boxShadow: "0 8px 20px rgba(251,191,36,0.3)" }}>
                      Отправить заявку на оплату
                    </motion.button>
                    
                    <button onClick={onLogout}
                      style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: "16px", color: "#888", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
                      Выйти
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

        {/* ── MODAL: Change Credentials Prompt ── */}
        <AnimatePresence>
          {showCredentialsPrompt && (
            <div style={{ position: "fixed", bottom: 24, right: isMobile ? 12 : 24, zIndex: 1000, maxWidth: isMobile ? "calc(100% - 24px)" : 360 }}>
              <motion.div initial={{ opacity: 0, y: 40, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.9 }}
                style={{ background: "#1a1a2e", border: "1px solid rgba(79,142,247,0.3)", borderRadius: 20, padding: "20px", boxShadow: "0 20px 50px rgba(0,0,0,0.5)", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: 4, background: "linear-gradient(90deg, #4f8ef7, #a78bfa)" }} />
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <div style={{ fontSize: 24 }}>🛡️</div>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ fontSize: 14, fontWeight: 700, color: "#f0f0fa", marginBottom: 4 }}>Безопасность аккаунта</h4>
                    <p style={{ fontSize: 12, color: "#808090", lineHeight: 1.4, marginBottom: 12 }}>
                      Вы пользуетесь системой уже 3 дня. Для повышения безопасности рекомендуем сменить логин и пароль.
                    </p>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => { setShowCredentialsModal(true); setShowCredentialsPrompt(false); }}
                        style={{ background: "#4f8ef7", border: "none", borderRadius: 10, padding: "8px 12px", color: "white", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                        Сменить сейчас
                      </button>
                      <button onClick={() => { setShowCredentialsPrompt(false); localStorage.setItem(`dismissed_creds_prompt_${currentUser.id}`, "true"); }}
                        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "8px 12px", color: "#808090", fontSize: 12, cursor: "pointer" }}>
                        Позже
                      </button>
                    </div>
                  </div>
                  <button onClick={() => setShowCredentialsPrompt(false)} style={{ background: "none", border: "none", color: "#404058", cursor: "pointer", fontSize: 18, padding: 0 }}>×</button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ── MODAL: Change Credentials Form ── */}
        <CredentialsModal isOpen={showCredentialsModal} onClose={() => setShowCredentialsModal(false)} currentUser={currentUser} />
      </>
    );
  }

  function CredentialsModal({ isOpen, onClose, currentUser }: { isOpen: boolean; onClose: () => void; currentUser: AppUser }) {
    const [login, setLogin] = useState(currentUser.login);
    const [pass, setPass] = useState("");
    const [confirmPass, setPassConfirm] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    if (!isOpen) return null;

    const handleSave = async () => {
      if (!login.trim()) { setError("Введите логин"); return; }
      if (pass && pass !== confirmPass) { setError("Пароли не совпадают"); return; }
      
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/auth/me", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ login: login.trim(), password: pass || undefined }),
        });
        const d = await res.json();
        if (!res.ok) { setError(d.error || "Ошибка сохранения"); }
        else {
          setSuccess(true);
          localStorage.setItem(`dismissed_creds_prompt_${currentUser.id}`, "true");
          setTimeout(() => { setSuccess(false); onClose(); }, 2000);
        }
      } catch { setError("Ошибка соединения"); }
      finally { setLoading(false); }
    };

    return (
      <div style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10000, padding: 20 }}>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={onClose}
          style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(10px)" }} />
        <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
          style={{ position: "relative", background: "#12121e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 28, padding: "32px", width: "100%", maxWidth: 380, zIndex: 1, boxShadow: "0 40px 100px rgba(0,0,0,0.7)" }}>
          <h3 style={{ fontSize: 20, fontWeight: 800, color: "#f0f0fa", marginBottom: 8 }}>Смена данных входа</h3>
          <p style={{ fontSize: 13, color: "#606078", marginBottom: 24 }}>Вы можете обновить логин и пароль для входа.</p>
          
          {success ? (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#34d399" }}>Данные обновлены!</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 11, color: "#404058", marginBottom: 6, textTransform: "uppercase", fontWeight: 700 }}>Новый логин</label>
                <input type="text" value={login} onChange={e => setLogin(e.target.value)} style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1.5px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: "12px 16px", color: "white", outline: "none" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, color: "#404058", marginBottom: 6, textTransform: "uppercase", fontWeight: 700 }}>Новый пароль (оставьте пустым, если не меняете)</label>
                <input type="password" value={pass} onChange={e => setPass(e.target.value)} placeholder="••••••••" style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1.5px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: "12px 16px", color: "white", outline: "none" }} />
              </div>
              {pass && (
                <div>
                  <label style={{ display: "block", fontSize: 11, color: "#404058", marginBottom: 6, textTransform: "uppercase", fontWeight: 700 }}>Повторите пароль</label>
                  <input type="password" value={confirmPass} onChange={e => setPassConfirm(e.target.value)} placeholder="••••••••" style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1.5px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: "12px 16px", color: "white", outline: "none" }} />
                </div>
              )}
              
              {error && <div style={{ fontSize: 12, color: "#ef4444", padding: "8px 12px", background: "rgba(239,68,68,0.1)", borderRadius: 10 }}>{error}</div>}
              
              <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                <button onClick={onClose} style={{ flex: 1, background: "none", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: "14px", color: "#606078", cursor: "pointer", fontSize: 14 }}>Отмена</button>
                <button onClick={handleSave} disabled={loading} style={{ flex: 1, background: "linear-gradient(135deg, #4f8ef7, #2563eb)", border: "none", borderRadius: 14, padding: "14px", color: "white", fontWeight: 700, cursor: "pointer", fontSize: 14, opacity: loading ? 0.6 : 1 }}>
                  {loading ? "..." : "Сохранить"}
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    );
  }


/* ═══════════════════════════════════════════════════════
   MOBILE LAYOUT
═══════════════════════════════════════════════════════ */
function MobileLayout({
  active, setActive, sectionMap, city, onCityChange, menu, currentUser, onLogout,
  emergencyAlert, onEmergency, onResolve, emConfirm, setEmConfirm, emSending, triggerEmergency,
  onRequest,
}: {
  active: string | null; setActive: (id: string | null) => void;
  sectionMap: Record<string, React.ReactNode>; city: string;
  onCityChange: () => void; menu: typeof MENU; currentUser: AppUser; onLogout: () => void;
  emergencyAlert: EmergencyAlert | null; onEmergency: () => void; onResolve: () => void;
  emConfirm: boolean; setEmConfirm: (v: boolean) => void; emSending: boolean; triggerEmergency: () => void;
  onRequest: () => void;
}) {
  const activeItem = MENU.find(m => m.id === active);

  return (
    <>
      <div style={{ height: "100dvh", background: "#080810", display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Mobile Header */}
        <div style={{
          padding: "14px 16px",
          background: "rgba(8,8,16,0.95)", backdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          position: "sticky", top: 0, zIndex: 100,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {active && (
              <motion.button onClick={() => setActive(null)} whileTap={{ scale: 0.88 }}
                style={{ width: 34, height: 34, borderRadius: 11, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)", color: "#606078", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                ←
              </motion.button>
            )}
            <div style={{ width: 34, height: 34, borderRadius: 11, background: "linear-gradient(135deg, #e63946, #ff6b35)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2L4 6v6c0 5.5 3.5 10.7 8 12 4.5-1.3 8-6.5 8-12V6L12 2z" fill="white"/></svg>
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#f0f0fa" }}>{activeItem ? activeItem.fullLabel : "Глаза ЧОПа"}</div>
              <div style={{ fontSize: 9, color: "#404058", letterSpacing: "0.08em" }}>📍 {CITY_LABELS[city] ?? city}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
            {!currentUser.is_admin && (
              <motion.button onClick={onEmergency} whileTap={{ scale: 0.9 }}
                animate={emergencyAlert ? { boxShadow: ["0 0 0px rgba(239,68,68,0)", "0 0 16px rgba(239,68,68,0.7)", "0 0 0px rgba(239,68,68,0)"] } : {}}
                transition={{ duration: 1.5, repeat: Infinity }}
                style={{ background: emergencyAlert ? "linear-gradient(135deg, #ef4444, #c1121f)" : "rgba(239,68,68,0.12)", border: `1px solid ${emergencyAlert ? "#ef4444" : "rgba(239,68,68,0.3)"}`, borderRadius: 10, padding: "6px 11px", color: "white", fontSize: 11, cursor: "pointer", fontWeight: 700 }}>
                🚨 ЧП
              </motion.button>
            )}

          </div>
        </div>

        {/* ЧП баннер */}
        <AnimatePresence>
          {emergencyAlert && (
            <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
              style={{ background: "linear-gradient(135deg, rgba(239,68,68,0.95), rgba(185,28,28,0.95))", padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 18 }}>🚨</span>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "white" }}>ЧП НА ОБЪЕКТЕ!</div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.65)" }}>{emergencyAlert.triggered_by} · {new Date(emergencyAlert.created_at).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}</div>
                </div>
              </div>
              {currentUser.is_admin && (
                <button onClick={onResolve} style={{ background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.35)", borderRadius: 8, padding: "4px 10px", color: "white", fontSize: 11, cursor: "pointer" }}>Снять</button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", paddingBottom: 90 }}>
          <AnimatePresence mode="wait">
            {active ? (
              <motion.div key={active}
                initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                  style={{ padding: "20px" }}>
                  {sectionMap[active]}
              </motion.div>
              ) : (
                <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  style={{ padding: "20px 16px" }}>
                  <MobileHomeGrid setActive={setActive} menu={menu} currentUser={currentUser} onLogout={onLogout} onRequest={onRequest} />
                </motion.div>
              )}
          </AnimatePresence>
        </div>

        {/* Bottom Tab Bar */}
        <div style={{
          position: "fixed", bottom: 0, left: 0, right: 0,
          background: "rgba(8,8,16,0.97)", backdropFilter: "blur(24px)",
          borderTop: "1px solid rgba(255,255,255,0.05)",
          display: "flex", justifyContent: "space-around", alignItems: "center",
          padding: "8px 4px 16px", zIndex: 200,
        }}>
          {menu.slice(0, 5).map(item => {
            const isActive = active === item.id;
            return (
              <motion.button key={item.id} onClick={() => setActive(item.id)} whileTap={{ scale: 0.82 }}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                  padding: "6px 12px", borderRadius: 14, border: "none",
                  background: isActive ? item.bg : "transparent", cursor: "pointer", minWidth: 52,
                }}>
                <span style={{ fontSize: 22 }}>{item.icon}</span>
                <span style={{ fontSize: 9, fontWeight: isActive ? 700 : 400, color: isActive ? "#f0f0fa" : "#404058" }}>{item.label}</span>
                {isActive && <motion.div layoutId="mDot" style={{ width: 4, height: 4, borderRadius: "50%", background: item.color }} />}
              </motion.button>
            );
          })}
          <MoreMenu active={active} setActive={setActive} menu={menu} />
        </div>
      </div>

      {/* ЧП диалог мобильный */}
      <AnimatePresence>
        {emConfirm && (
          <div style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => !emSending && setEmConfirm(false)}
              style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.88)", backdropFilter: "blur(12px)" }} />
            <motion.div initial={{ opacity: 0, scale: 0.88 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.88 }}
              style={{ position: "relative", background: "#12121e", border: "2px solid rgba(239,68,68,0.4)", borderRadius: 24, padding: "32px 24px", width: "100%", maxWidth: 340, zIndex: 1, textAlign: "center" }}>
              <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 0.9, repeat: Infinity }}>
                <div style={{ fontSize: 52, marginBottom: 12 }}>🚨</div>
              </motion.div>
              <h3 style={{ fontSize: 17, fontWeight: 800, color: "#f87171", marginBottom: 8 }}>ТРЕВОГА — ЧП!</h3>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 22 }}>Оповещение получат администраторы.</p>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setEmConfirm(false)} disabled={emSending}
                  style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "13px", fontSize: 13, color: "#606078", cursor: "pointer" }}>Отмена</button>
                <motion.button whileTap={{ scale: 0.95 }} onClick={triggerEmergency} disabled={emSending}
                  style={{ flex: 1, background: "linear-gradient(135deg, #ef4444, #c1121f)", border: "none", borderRadius: 14, padding: "13px", fontSize: 13, fontWeight: 700, color: "white", cursor: "pointer", opacity: emSending ? 0.6 : 1 }}>
                  {emSending ? "..." : "🚨 ЧП!"}
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

/* ═══════════════════════════════════════════════════════
   MOBILE HOME GRID — стиль Family Bicycles
═══════════════════════════════════════════════════════ */
function MobileHomeGrid({ setActive, menu, currentUser, onLogout, onRequest }: {
  setActive: (id: string) => void; menu: typeof MENU; currentUser: AppUser; onLogout: () => void; onRequest: () => void;
}) {
  return (
    <div>
      {/* Шапка */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 900, color: "#f0f0fa", letterSpacing: "-0.5px", lineHeight: 1.15 }}>
              Глаза<br/>ЧОПа
            </h1>
            <p style={{ color: "#404058", fontSize: 12, marginTop: 4 }}>Система мониторинга объектов</p>
          </div>
          <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
            <motion.button whileTap={{ scale: 0.92 }} onClick={onRequest}
              style={{ background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.2)", borderRadius: 14, padding: "10px 14px", color: "#34d399", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>
              Заявка
            </motion.button>
            <motion.button whileTap={{ scale: 0.92 }} onClick={onLogout}
              style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 14, padding: "10px 14px", color: "#f87171", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>
              Выйти
            </motion.button>
          </div>
        </div>
        {/* User pill */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: "10px 14px" }}>
          <div style={{ width: 34, height: 34, borderRadius: 12, background: "linear-gradient(135deg, #4f8ef7, #a78bfa)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, color: "white", flexShrink: 0 }}>
            {currentUser.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#e0e0f0" }}>{currentUser.name}</div>
            <div style={{ fontSize: 11, color: "#404058" }}>{currentUser.role}</div>
          </div>
          {currentUser.is_admin && (
            <div style={{ marginLeft: "auto", background: "rgba(230,57,70,0.12)", border: "1px solid rgba(230,57,70,0.2)", borderRadius: 8, padding: "3px 8px", fontSize: 10, fontWeight: 700, color: "#e63946" }}>ADMIN</div>
          )}
        </div>
      </div>

      {/* Grid карточек */}
      <div className="grid-cols-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {menu.map((item, i) => (
          <motion.button key={item.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: i * 0.04, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            whileTap={{ scale: 0.94 }}
            onClick={() => setActive(item.id)}
            style={{
              background: item.bg,
              border: `1px solid ${item.color}22`,
              borderRadius: 22, padding: "20px 16px",
              cursor: "pointer", textAlign: "left",
              position: "relative", overflow: "hidden",
              minHeight: 110,
            }}>
            {/* Glow blob */}
            <div style={{
              position: "absolute", top: -20, right: -20, width: 80, height: 80, borderRadius: "50%",
              background: `radial-gradient(circle, ${item.color}30 0%, transparent 70%)`,
              pointerEvents: "none",
            }} />
            <div style={{ fontSize: 28, marginBottom: 12 }}>{item.icon}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#f0f0fa", lineHeight: 1.3, marginBottom: 8 }}>
              {item.fullLabel}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ height: 2, width: 20, borderRadius: 1, background: item.color }} />
              <span style={{ fontSize: 10, color: item.color, fontWeight: 600, opacity: 0.7 }}>открыть</span>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

/* ── More Menu ── */
function MoreMenu({ active, setActive, menu }: { active: string | null; setActive: (id: string | null) => void; menu: typeof MENU }) {
  const [open, setOpen] = useState(false);
  const extra = menu.slice(5);
  return (
    <div style={{ position: "relative" }}>
      <motion.button whileTap={{ scale: 0.82 }} onClick={() => setOpen(!open)}
        style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "6px 12px", borderRadius: 14, border: "none", background: extra.some(m => m.id === active) ? "rgba(255,255,255,0.06)" : "transparent", cursor: "pointer", minWidth: 52 }}>
        <span style={{ fontSize: 22 }}>⋯</span>
        <span style={{ fontSize: 9, color: "#404058" }}>Ещё</span>
      </motion.button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.94 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.94 }} transition={{ type: "spring", stiffness: 420, damping: 26 }}
            style={{ position: "absolute", bottom: "calc(100% + 10px)", right: 0, background: "rgba(12,12,22,0.98)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 20, padding: "8px", minWidth: 200, backdropFilter: "blur(24px)", zIndex: 300, boxShadow: "0 -8px 40px rgba(0,0,0,0.6)" }}>
            {extra.map(item => (
              <motion.button key={item.id} whileTap={{ scale: 0.96 }}
                onClick={() => { setActive(item.id); setOpen(false); }}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 14, border: "none", background: active === item.id ? item.bg : "transparent", cursor: "pointer", textAlign: "left" }}>
                <span style={{ fontSize: 20 }}>{item.icon}</span>
                <span style={{ fontSize: 13, color: active === item.id ? "#f0f0fa" : "#606078", fontWeight: active === item.id ? 600 : 400 }}>{item.fullLabel}</span>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      {open && <div style={{ position: "fixed", inset: 0, zIndex: 250 }} onClick={() => setOpen(false)} />}
    </div>
  );
}
