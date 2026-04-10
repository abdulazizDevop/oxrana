"use client";
import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { AppUser, Company } from "@/lib/auth";
import { FaceCheckModal } from "@/components/FaceCheckModal";
import { RequestModal } from "@/components/RequestModal";

const Dashboard = dynamic(() => import("@/components/Dashboard"), {
  loading: () => <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#000", color: "white", fontSize: 14 }}>Загрузка...</div>
});
const AdminPanel = dynamic(() => import("@/components/AdminPanel"), {
  loading: () => <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#000", color: "white", fontSize: 14 }}>Загрузка...</div>
});
const InstructionsModal = dynamic(() => import("@/components/InstructionsComponents").then(m => m.InstructionsModal), { ssr: false });

const DEFAULT_CITIES = [
  { id: "moscow", label: "Москва", icon: "🏙️" },
  { id: "spb", label: "Санкт-Петербург", icon: "🌆" },
  { id: "novosibirsk", label: "Новосибирск", icon: "🏘️" },
  { id: "yekaterinburg", label: "Екатеринбург", icon: "🏗️" },
  { id: "kazan", label: "Казань", icon: "🏢" },
  { id: "krasnodar", label: "Краснодар", icon: "🏛️" },
];
const CITY_ICONS = ["🏙️","🌆","🏘️","🏗️","🏢","🏛️","🌇","🌃","🏰","🏯"];
type City = { id: string; label: string; icon: string; custom?: boolean };

// ----- Premium 3D Glass card (Behance style) -----
function GlassCard({ children, maxW = 420, accent = "#e63946", bgNode }: {
  children: React.ReactNode; maxW?: number; accent?: string; bgNode?: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ rotateX: 10, rotateY: -10, opacity: 0, scale: 0.95 }}
      animate={{ rotateX: 0, rotateY: 0, opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 100, damping: 20 }}
      whileHover={{ rotateX: 2, rotateY: -2, scale: 1.01 }}
      style={{
        width: "100%", maxWidth: maxW,
        background: "rgba(12,12,18,0.65)",
        border: `1px solid rgba(255,255,255,0.08)`,
        borderRadius: 36,
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        boxShadow: `0 30px 80px rgba(0,0,0,0.7), 0 0 0 1px ${accent}22, inset 0 2px 2px rgba(255,255,255,0.08), inset 0 -2px 10px rgba(0,0,0,0.5)`,
        padding: "44px 36px",
        position: "relative",
        overflow: "visible",
        zIndex: 10,
        transformPerspective: 1200,
        transformStyle: "preserve-3d",
      }}
    >
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: `radial-gradient(ellipse 80% 50% at 50% -20%, ${accent}28, transparent 70%)`,
        borderRadius: 36,
        transform: "translateZ(-1px)",
      }} />
      {bgNode}
      <div style={{ transform: "translateZ(30px)" }}>
        {children}
      </div>
    </motion.div>
  );
}

// ----- Floating background orbs (CSS-only, no framer-motion) -----
function Background() {
  return (
    <div style={{ position: "fixed", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 0, background: "#0c0c12" }}>
      <div style={{ position: "absolute", top: "10%", left: "15%", width: "40vw", height: "40vw", background: "#0039a6", filter: "blur(120px)", opacity: 0.15, borderRadius: "50%" }} />
      <div style={{ position: "absolute", bottom: "10%", right: "15%", width: "40vw", height: "40vw", background: "#d52b1e", filter: "blur(120px)", opacity: 0.15, borderRadius: "50%" }} />
      <div style={{ position: "absolute", top: "40%", left: "50%", width: "30vw", height: "30vw", background: "#ffffff", filter: "blur(100px)", opacity: 0.1, borderRadius: "50%", transform: "translate(-50%, -50%)" }} />
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
        backgroundSize: "64px 64px",
      }} />
    </div>
  );
}

// ----- Pill badge -----
const Badge = ({ children, color }: { children: React.ReactNode; color: string }) => (
  <span style={{
    fontSize: 10, padding: "3px 10px", borderRadius: 20,
    background: `${color}18`, color, border: `1px solid ${color}30`,
    fontWeight: 700, letterSpacing: "0.08em",
  }}>{children}</span>
);

// ----- iphone-style input -----
const iInput = (err?: boolean): React.CSSProperties => ({
  width: "100%",
  background: err ? "rgba(230,57,70,0.07)" : "rgba(255,255,255,0.055)",
  border: `1.5px solid ${err ? "rgba(230,57,70,0.5)" : "rgba(255,255,255,0.1)"}`,
  borderRadius: 16,
  padding: "15px 18px",
  fontSize: 16,
  color: "#f0f0f8",
  outline: "none",
  boxSizing: "border-box",
  transition: "all 0.2s",
  fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
});

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 11, color: "#66667a",
  marginBottom: 8, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 600,
};

// ----- Main gradient button -----
const GradBtn = ({ onClick, children, gradient, disabled, shadow }: {
  onClick?: () => void; children: React.ReactNode;
  gradient: string; disabled?: boolean; shadow: string;
}) => (
  <motion.button
    onClick={onClick} disabled={disabled}
    whileHover={disabled ? {} : { scale: 1.02, y: -2 }}
    whileTap={disabled ? {} : { scale: 0.97 }}
    style={{
      width: "100%", background: disabled ? "rgba(120,120,140,0.3)" : gradient,
      border: "none", borderRadius: 18, padding: "17px",
      fontSize: 15, fontWeight: 700, color: "white", cursor: disabled ? "not-allowed" : "pointer",
      boxShadow: disabled ? "none" : shadow,
      letterSpacing: "0.06em", fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
      transition: "background 0.2s",
    }}
  >{children}</motion.button>
);

export default function Home() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [adminCode, setAdminCode] = useState("");
  const [adminError, setAdminError] = useState(false);
  const [adminShake, setAdminShake] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showFaceCheck, setShowFaceCheck] = useState(false);
  const [pendingUser, setPendingUser] = useState<AppUser | null>(null);
  const [login, setLogin] = useState("");
  const [userPass, setUserPass] = useState("");
  const [userError, setUserError] = useState("");
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [step, setStep] = useState<"auth" | "city" | "company">("auth");
  const [city, setCity] = useState<{ id: string; label: string } | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [selectedCompanyForDetails, setSelectedCompanyForDetails] = useState<Company | null>(null);
  const [isEditingCompany, setIsEditingCompany] = useState(false);
  const [editCompanyData, setEditCompanyData] = useState({ description: "", professions_list: "", employee_count: 0 });
  const [search, setSearch] = useState("");
  const [companySearch, setCompanySearch] = useState("");
  const [cities, setCities] = useState<City[]>(DEFAULT_CITIES);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCityName, setNewCityName] = useState("");
  const [addError, setAddError] = useState("");
  const [showAddCompanyModal, setShowAddCompanyModal] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState("");
  const [addCompanyError, setAddCompanyError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [regLogin, setRegLogin] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regName, setRegName] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regPass, setRegPass] = useState("");
  const [regPassConfirm, setRegPassConfirm] = useState("");
  const [regError, setRegError] = useState("");
  const [objectSchedules, setObjectSchedules] = useState<any[]>([]);

  useEffect(() => {
    if (selectedCompanyForDetails) {
      fetch(`/api/records?section=schedule&companyId=${selectedCompanyForDetails.id}`)
        .then(r => r.json())
        .then(data => setObjectSchedules(Array.isArray(data) ? data : []))
        .catch(() => {});
    }
  }, [selectedCompanyForDetails]);

  useEffect(() => {
    if (!currentUser && !isAdmin) return;
    fetch("/api/cities").then(r => r.json()).then((rows: { id: string; name: string; is_default: boolean }[]) => {
      const loaded = rows.map(r => ({
        id: r.id, label: r.name,
        icon: CITY_ICONS[Math.floor(Math.random() * CITY_ICONS.length)],
        custom: !r.is_default,
      }));
      if (loaded.length > 0) setCities(loaded);
    }).catch(() => {});
  }, [currentUser, isAdmin]);

  const handleAdminLogin = () => {
    if (adminCode === "5051") { setIsAdmin(true); setAdminError(false); }
    else { setAdminError(true); setAdminShake(true); setTimeout(() => setAdminShake(false), 500); }
  };

  const handleUserLogin = async () => {
    if (!login.trim()) { setUserError("Введите логин"); return; }
    if (!userPass.trim()) { setUserError("Введите пароль"); return; }
    
    setIsLoggingIn(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login: login.trim(), password: userPass }),
      });
      if (!res.ok) { setUserError("Неверный логин или пароль"); setIsLoggingIn(false); return; }
      const d = await res.json();
      const user: AppUser = {
        id: d.id, name: d.name, role: d.role, profession: d.profession,
        login: d.login, password: "", is_admin: !!d.is_admin,
        allowedSections: d.allowed_sections || [],
        allowedCities: d.allowed_cities || [],
        allowedCompanies: d.allowed_companies || [],
        createdAt: d.created_at ? new Date(d.created_at).getTime() : undefined,
      };
      setUserError("");
      
      if (user.is_admin) { setIsAdmin(true); return; }
      if (user.role === "company_manager") {
        setCurrentUser(user); setShowInstructions(true);
      } else {
        setPendingUser(user);
        setShowFaceCheck(true);
      }
    } catch { setUserError("Ошибка соединения"); }
    finally { setIsLoggingIn(false); }
  };

  const checkPasswordStrength = (pass: string) => {
    let msg = "";
    if (pass.length < 8) msg = "Слишком короткий";
    else if (!/(?=.*[A-ZА-Я])/.test(pass)) msg = "Нужна заглавная буква";
    else if (!/(?=.*[a-zа-я])/.test(pass)) msg = "Нужна строчная буква";
    else if (!/(?=.*[^a-zA-Z0-9А-Яа-я])/.test(pass)) msg = "Нужен спецсимвол (!@#$ и т.д.)";
    else if ((pass.match(/\d/g) || []).length < 5) msg = "Нужно минимум 5 цифр";
    return msg;
  };

  const handleRegister = async () => {
    if (!regLogin || !regEmail || !regName || !regPhone || !regPass || !regPassConfirm) {
      setRegError("Заполните все поля"); return;
    }
    if (regPass !== regPassConfirm) {
      setRegError("Пароли не совпадают"); return;
    }
    const pwdErr = checkPasswordStrength(regPass);
    if (pwdErr) {
      setRegError(pwdErr); return;
    }
    setIsRegistering(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          login: regLogin, email: regEmail, name: regName, phone: regPhone, password: regPass
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRegError(data.error || "Ошибка регистрации");
        return;
      }
      const user: AppUser = {
        id: data.id, name: data.name, role: data.role, profession: data.profession,
        login: data.login, password: "", is_admin: !!data.is_admin,
        allowedSections: data.allowed_sections || [],
        allowedCities: data.allowed_cities || [],
        allowedCompanies: data.allowed_companies || [],
        createdAt: data.created_at ? new Date(data.created_at).getTime() : Date.now(),
      };
      setCurrentUser(user); setShowInstructions(true);
    } catch (e) {
      setRegError("Ошибка соединения");
    } finally {
      setIsRegistering(false);
    }
  };


  const handleSelectCity = async (c: City) => {
    setCity({ id: c.id, label: c.label });
    const res = await fetch(`/api/companies?cityId=${c.id}`);
    const cityCompanies: Company[] = await res.json();
    const allowed = currentUser && currentUser.allowedCompanies.length > 0
      ? cityCompanies.filter(co => currentUser.allowedCompanies.includes(co.id))
      : cityCompanies;
    setCompanies(allowed); setCompanySearch(""); setStep("company");
  };

  const handleAddCity = async () => {
    const name = newCityName.trim();
    if (!name) { setAddError("Введите название города"); return; }
    if (cities.find(c => c.label.toLowerCase() === name.toLowerCase())) { setAddError("Такой город уже есть"); return; }
    const newCity: City = { id: name.toLowerCase().replace(/\s+/g, "_") + "_" + Date.now(), label: name, icon: CITY_ICONS[Math.floor(Math.random() * CITY_ICONS.length)], custom: true };
    await fetch("/api/cities", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: newCity.id, name: newCity.label }) });
    setCities(prev => [...prev, newCity]); setNewCityName(""); setAddError(""); setShowAddModal(false);
  };

  const handleDeleteCity = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await fetch(`/api/cities?id=${id}`, { method: "DELETE" });
    setCities(prev => prev.filter(c => c.id !== id));
  };

  const handleAddCompany = async () => {
    const name = newCompanyName.trim();
    if (!name) { setAddCompanyError("Введите название компании"); return; }
    if (!city) return;
    const id = name.toLowerCase().replace(/\s+/g, "_") + "_" + Date.now();
    const res = await fetch("/api/companies", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, cityId: city.id, name, description: "", professions_list: "", employee_count: 0 }) });
    const newCo: Company = await res.json();
    setCompanies(prev => [...prev, newCo]); setNewCompanyName(""); setAddCompanyError(""); setShowAddCompanyModal(false);
  };

  const handleDeleteCompany = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await fetch(`/api/companies?id=${id}`, { method: "DELETE" });
    setCompanies(prev => prev.filter(c => c.id !== id));
  };

  const availableCities = currentUser && currentUser.allowedCities.length > 0
    ? cities.filter(c => currentUser.allowedCities.includes(c.id)) : cities;
  const filteredCities = availableCities.filter(c => c.label.toLowerCase().includes(search.toLowerCase()));
  const filteredCompanies = companies.filter(c => c.name.toLowerCase().includes(companySearch.toLowerCase()));

  const handleLogout = () => {
    setCity(null); setCompany(null); setCurrentUser(null);
    setStep("auth"); setMode("login"); setLogin(""); setUserPass(""); setCompanies([]);
  };

  if (isAdmin) return <AdminPanel onExit={() => { setIsAdmin(false); setAdminCode(""); setMode("login"); }} />;
  if (company && city && currentUser) return (
    <Dashboard city={city.id} cityLabel={city.label} company={company} currentUser={currentUser}
      onCityChange={() => { setCompany(null); setStep("company"); }} onLogout={handleLogout} />
  );

  return (
    <>
      <div style={{
        minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center",
        background: "transparent",
        padding: "20px", fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
        overflowX: "hidden", width: "100%"
      }}>
        <Background />

              {showFaceCheck && pendingUser && (
        <FaceCheckModal 
          userLogin={pendingUser.login}
          userName={pendingUser.name}
          userId={pendingUser.id}
          checkType="login"
          onSuccess={() => {
            setShowFaceCheck(false);
            setCurrentUser(pendingUser);
            setPendingUser(null);
            setShowInstructions(true);
          }}
          onCancel={() => {
            setShowFaceCheck(false);
            setPendingUser(null);
          }}
        />
      )}

        <AnimatePresence mode="wait">

          
            {/* ── ВХОД ── */}
            {mode === "login" && step === "auth" && (
              <motion.div key="user-login"
                initial={{ opacity: 0, y: 48, scale: 0.93 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -32, scale: 0.94 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                style={{ width: "100%", maxWidth: 420, position: "relative", zIndex: 10 }}
              >
                <GlassCard accent="#4f8ef7" bgNode={
                  <div style={{
                    position: "absolute", top: 0, left: 0, right: 0, height: 320,
                    background: "linear-gradient(to bottom, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.85) 33.33%, rgba(0,57,166,0.85) 33.33%, rgba(0,57,166,0.85) 66.66%, rgba(213,43,30,0.85) 66.66%, rgba(213,43,30,0.85) 100%)",
                    borderTopLeftRadius: 36, borderTopRightRadius: 36,
                    zIndex: -1, pointerEvents: "none",
                    WebkitMaskImage: "linear-gradient(to bottom, rgba(0,0,0,1) 75%, rgba(0,0,0,0) 100%)",
                    maskImage: "linear-gradient(to bottom, rgba(0,0,0,1) 75%, rgba(0,0,0,0) 100%)",
                  }} />
                }>
                  <div style={{ textAlign: "center", marginBottom: 30 }}>
                    <motion.img
                      src="/logo_soft.png"
                      alt="Logo"
                      initial={{ scale: 0.8, opacity: 0, rotateX: 15 }}
                      animate={{ scale: 1, opacity: 1, rotateX: 0 }}
                      transition={{ delay: 0.15, type: "spring", stiffness: 180, damping: 18 }}
                      style={{
                        width: "100%", maxWidth: 200, height: "auto",
                        margin: "0 auto 16px", display: "block",
                        filter: "drop-shadow(0 15px 25px rgba(0,0,0,0.7))",
                        transform: "translateZ(20px)", objectFit: "contain",
                      }}
                    />
                    <motion.h1
                      initial={{ opacity: 0, y: 15, rotateX: -20 }} 
                      animate={{ opacity: 1, y: 0, rotateX: 0 }} 
                      transition={{ delay: 0.25, type: "spring", stiffness: 200, damping: 20 }}
                      style={{ 
                        fontSize: 36, fontFamily: "Impact, 'Arial Black', sans-serif",
                        textTransform: "uppercase", color: "transparent",
                        background: "linear-gradient(180deg, #ffffff 0%, #9ca3af 100%)",
                        WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                        margin: "0 0 8px 0", letterSpacing: "0.02em",
                        transformStyle: "preserve-3d",
                        filter: "drop-shadow(0px 4px 6px rgba(0,0,0,0.8)) drop-shadow(0px 8px 12px rgba(0,0,0,0.6))",
                      }}
                    >ГЛАЗА ЧОПА</motion.h1>
                    <p style={{ fontSize: 13, color: "#55556a", marginTop: 12 }}>Введите ваши учётные данные</p>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <div>
                      <label style={labelStyle}>🗝️ &nbsp;Логин (или Email)</label>
                      <input type="text" value={login}
                        onChange={e => { setLogin(e.target.value); setUserError(""); }}
                        onKeyDown={e => e.key === "Enter" && handleUserLogin()}
                        placeholder="Ваш логин" style={iInput(!!userError)} />
                    </div>
                    <div>
                      <label style={labelStyle}>🔒 &nbsp;Пароль</label>
                      <input type="password" value={userPass}
                        onChange={e => { setUserPass(e.target.value); setUserError(""); }}
                        onKeyDown={e => e.key === "Enter" && handleUserLogin()}
                        placeholder="••••••" style={{ ...iInput(!!userError), letterSpacing: "0.2em" }} />
                    </div>

                    <AnimatePresence>
                      {userError && (
                        <motion.div initial={{ opacity: 0, y: -6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }}
                          style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(230,57,70,0.1)", border: "1px solid rgba(230,57,70,0.25)", borderRadius: 12, padding: "10px 14px" }}>
                          <span style={{ fontSize: 16 }}>⚠️</span>
                          <span style={{ fontSize: 13, color: "#f87171" }}>{userError}</span>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <GradBtn onClick={handleUserLogin} disabled={isLoggingIn}
                      gradient="linear-gradient(135deg, #4f8ef7 0%, #2563eb 100%)"
                      shadow="0 8px 28px rgba(79,142,247,0.45)">
                      {isLoggingIn ? "Вхожу..." : "Войти →"}
                    </GradBtn>
                    
                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
                      <button onClick={() => setMode("register")} style={{ background: "none", border: "none", color: "#4f8ef7", fontSize: 13, cursor: "pointer", fontWeight: 600 }}>
                        Зарегистрироваться
                      </button>
                    </div>
                  </div>
                </GlassCard>
                <div style={{ textAlign: "center", marginTop: 20 }}>
                  <button onClick={() => setMode(null)} style={{ background: "none", border: "none", color: "#44445a", fontSize: 12, cursor: "pointer", textDecoration: "underline" }}>Админ вход</button>
                </div>
              </motion.div>
            )}

            {/* ── АДМИН ВХОД ── */}
            {mode === null && step === "auth" && (
              <motion.div key="admin-auth"
                initial={{ opacity: 0, y: 48, scale: 0.93 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -32, scale: 0.94 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                style={{ width: "100%", maxWidth: 380, position: "relative", zIndex: 10 }}
              >
                <GlassCard accent="#e63946">
                  <div style={{ textAlign: "center", marginBottom: 30 }}>
                    <div style={{
                      width: 60, height: 60, borderRadius: 20,
                      background: "linear-gradient(145deg, #e63946, #c1121f)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      margin: "0 auto 16px", fontSize: 26,
                      boxShadow: "0 12px 32px rgba(230,57,70,0.35)",
                    }}>🛡️</div>
                    <h2 style={{ fontSize: 22, fontWeight: 800, color: "#f0f0f8", marginBottom: 4 }}>Админ Доступ</h2>
                    <p style={{ fontSize: 12, color: "#55556a" }}>Введите секретный код</p>
                  </div>
                  
                  <motion.div animate={adminShake ? { x: [-8, 8, -8, 8, 0] } : {}} transition={{ duration: 0.4 }}>
                    <input type="password" value={adminCode}
                      onChange={e => { setAdminCode(e.target.value); setAdminError(false); }}
                      onKeyDown={e => e.key === "Enter" && handleAdminLogin()}
                      placeholder="••••" style={{ ...iInput(adminError), textAlign: "center", fontSize: 24, letterSpacing: "0.5em" }} />
                  </motion.div>
                  
                  <div style={{ height: 20 }}>
                    {adminError && <p style={{ fontSize: 12, color: "#f87171", textAlign: "center", marginTop: 8 }}>❌ Код неверный</p>}
                  </div>

                  <GradBtn onClick={handleAdminLogin}
                    gradient="linear-gradient(135deg, #e63946 0%, #d62828 100%)"
                    shadow="0 8px 28px rgba(230,57,70,0.4)">
                    Подтвердить
                  </GradBtn>
                  
                  <button onClick={() => setMode("login")}
                    style={{ background: "none", border: "none", color: "#44445a", fontSize: 13, cursor: "pointer", width: "100%", marginTop: 20 }}>
                    ← Назад
                  </button>
                </GlassCard>
              </motion.div>
            )}

            {/* ── РЕГИСТРАЦИЯ ── */}
            {mode === "register" && step === "auth" && (
              <motion.div key="user-register"
                initial={{ opacity: 0, y: 48, scale: 0.93 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -32, scale: 0.94 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                style={{ width: "100%", maxWidth: 440, position: "relative", zIndex: 10 }}
              >
                <GlassCard accent="#a855f7" maxW={440}>
                  <div style={{ textAlign: "center", marginBottom: 24 }}>
                    <div style={{
                      width: 64, height: 64, borderRadius: 20,
                      background: "linear-gradient(145deg, #a855f7, #7e22ce)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      margin: "0 auto 12px", fontSize: 28,
                      boxShadow: "0 12px 36px rgba(168,85,247,0.4), inset 0 1px 0 rgba(255,255,255,0.2)",
                    }}>🏢</div>
                    <h2 style={{ fontSize: 22, fontWeight: 800, color: "#f0f0f8", marginBottom: 4 }}>Регистрация Офиса ЧОПа</h2>
                    <p style={{ fontSize: 12, color: "#55556a" }}>Создайте аккаунт руководителя</p>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <div>
                      <label style={labelStyle}>Имя / Название компании</label>
                      <input type="text" value={regName} onChange={e => { setRegName(e.target.value); setRegError(""); }} placeholder="ООО 'Безопасность'" style={{...iInput(!!regError), padding: "12px 16px"}} />
                    </div>
                    <div>
                      <label style={labelStyle}>Логин (короткий)</label>
                      <input type="text" value={regLogin} onChange={e => { setRegLogin(e.target.value); setRegError(""); }} placeholder="my_chop" style={{...iInput(!!regError), padding: "12px 16px"}} />
                    </div>
                    <div>
                      <label style={labelStyle}>Email (mail.ru, bk.ru, gmail.com...)</label>
                      <input type="email" value={regEmail} onChange={e => { setRegEmail(e.target.value); setRegError(""); }} placeholder="email@mail.ru" style={{...iInput(!!regError), padding: "12px 16px"}} />
                    </div>
                    <div>
                      <label style={labelStyle}>Телефон</label>
                      <input type="text" value={regPhone} onChange={e => { setRegPhone(e.target.value); setRegError(""); }} placeholder="+7 (999) 000-00-00" style={{...iInput(!!regError), padding: "12px 16px"}} />
                    </div>
                    <div>
                      <label style={labelStyle}>Пароль</label>
                      <input type="password" value={regPass} onChange={e => { setRegPass(e.target.value); setRegError(""); }} placeholder="••••••••" style={{...iInput(!!regError), padding: "12px 16px"}} />
                      <div style={{ fontSize: 10, color: "#55556a", marginTop: 4, lineHeight: 1.4 }}>
                        Сложность: минимум 1 заглавная, 1 строчная, 1 спецсимвол и 5 цифр.
                      </div>
                    </div>
                    <div>
                      <label style={labelStyle}>Повторите пароль</label>
                      <input type="password" value={regPassConfirm} onChange={e => { setRegPassConfirm(e.target.value); setRegError(""); }} placeholder="••••••••" style={{...iInput(!!regError), padding: "12px 16px"}} />
                    </div>

                    <AnimatePresence>
                      {regError && (
                        <motion.div initial={{ opacity: 0, y: -6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }}
                          style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(230,57,70,0.1)", border: "1px solid rgba(230,57,70,0.25)", borderRadius: 12, padding: "10px 14px" }}>
                          <span style={{ fontSize: 16 }}>⚠️</span>
                          <span style={{ fontSize: 13, color: "#f87171" }}>{regError}</span>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <GradBtn onClick={handleRegister} disabled={isRegistering}
                      gradient="linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)"
                      shadow="0 8px 28px rgba(168,85,247,0.45)">
                      {isRegistering ? "Создание..." : "Зарегистрироваться →"}
                    </GradBtn>

                    <button onClick={() => { setMode("login"); setRegError(""); }}
                      style={{ background: "none", border: "none", color: "#44445a", fontSize: 13, cursor: "pointer", padding: "4px", display: "flex", alignItems: "center", gap: 6, justifyContent: "center" }}>
                      ← Назад ко входу
                    </button>
                  </div>
                </GlassCard>
              </motion.div>
            )}

            {/* ── ВЫБОР ГОРОДА ── */}
          {step === "city" && currentUser && (
            <motion.div key="city"
              initial={{ opacity: 0, y: 48, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -30, scale: 0.95 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              style={{ width: "100%", maxWidth: 540, position: "relative", zIndex: 10 }}
            >
              <motion.div style={{
                background: "rgba(18,18,28,0.72)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 32,
                  backdropFilter: "blur(16px)",
                  WebkitBackdropFilter: "blur(16px)",
                  boxShadow: "0 24px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.07)",
                padding: "36px 30px",
                maxHeight: "88vh", display: "flex", flexDirection: "column",
              }}>
                  <div style={{ textAlign: "center", marginBottom: 22 }}>
                    <div style={{
                      width: 58, height: 58, borderRadius: 18,
                      background: "linear-gradient(145deg, #e63946, #ff6b35)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      margin: "0 auto 14px", fontSize: 26,
                      boxShadow: "0 10px 30px rgba(230,57,70,0.35)",
                    }}>📍</div>
                    <h2 style={{ fontSize: 22, fontWeight: 800, color: "#f0f0f8", marginBottom: 4, letterSpacing: "-0.02em" }}>Выберите город</h2>
                    <p style={{ fontSize: 12, color: "#55556a", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                      Привет, <span style={{ color: "#f0f0f8", fontWeight: 700 }}>{currentUser.name}</span>
                      <span style={{ opacity: 0.3 }}>·</span>
                      <Badge color="#4f8ef7">{currentUser.role}</Badge>
                    </p>
                  </div>

                <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
                  <div style={{ position: "relative", flex: 1 }}>
                    <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 16, opacity: 0.4 }}>🔍</span>
                    <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                      placeholder="Поиск города..."
                      style={{ width: "100%", background: "rgba(255,255,255,0.055)", border: "1.5px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: "12px 14px 12px 40px", fontSize: 14, color: "#f0f0f8", outline: "none", boxSizing: "border-box" }}
                    />
                  </div>
                  <motion.button onClick={() => setShowAddModal(true)} whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.93 }}
                    style={{ width: 46, height: 46, background: "linear-gradient(135deg, #e63946, #c1121f)", border: "none", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 6px 20px rgba(230,57,70,0.35)", flexShrink: 0, fontSize: 22 }}>
                    ＋
                  </motion.button>
                </div>

                <div style={{ overflowY: "auto", flex: 1, marginBottom: 10 }}>
                  {filteredCities.length === 0 ? (
                    <div style={{ textAlign: "center", color: "#44445a", padding: "40px 0", fontSize: 14 }}>🌐 &nbsp;Город не найден</div>
                  ) : (
                    <div className="grid-cols-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      {filteredCities.map((c, i) => (
                        <motion.button key={c.id}
                          initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.04 }}
                          whileHover={{ scale: 1.04, y: -3 }} whileTap={{ scale: 0.95 }}
                          onClick={() => handleSelectCity(c)}
                          style={{
                            background: "rgba(255,255,255,0.04)", border: "1.5px solid rgba(255,255,255,0.07)",
                            borderRadius: 20, padding: "18px 12px", cursor: "pointer", textAlign: "center", position: "relative",
                            boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
                          }}
                        >
                          {c.custom && (
                            <div onClick={e => handleDeleteCity(c.id, e)}
                              style={{ position: "absolute", top: 8, right: 9, width: 20, height: 20, borderRadius: "50%", background: "rgba(230,57,70,0.2)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 12, color: "#e63946" }}>×</div>
                          )}
                          <motion.div animate={{ y: [0, -4, 0] }} transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.3 }}
                            style={{ fontSize: 30, marginBottom: 8 }}>{c.icon}</motion.div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "#f0f0f8", lineHeight: 1.3 }}>{c.label}</div>
                          {c.custom && <div style={{ fontSize: 10, color: "#44445a", marginTop: 3 }}>добавлен</div>}
                        </motion.button>
                      ))}
                    </div>
                  )}
                </div>
                <button onClick={handleLogout}
                  style={{ background: "none", border: "none", color: "#44445a", fontSize: 13, cursor: "pointer", padding: "8px" }}>
                  ← Выйти
                </button>
              </motion.div>
            </motion.div>
          )}

          {/* ── ВЫБОР КОМПАНИИ ── */}
          {step === "company" && city && currentUser && (
            <motion.div key="company"
              initial={{ opacity: 0, x: 60, scale: 0.97 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -60, scale: 0.97 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              style={{ width: "100%", maxWidth: 540, position: "relative", zIndex: 10 }}
            >
              <motion.div style={{
                background: "rgba(18,18,28,0.72)",
                border: "1px solid rgba(79,142,247,0.15)",
                borderRadius: 32,
                  backdropFilter: "blur(16px)",
                  WebkitBackdropFilter: "blur(16px)",
                  boxShadow: "0 24px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(79,142,247,0.07), inset 0 1px 0 rgba(255,255,255,0.07)",
                padding: "36px 30px",
                maxHeight: "88vh", display: "flex", flexDirection: "column",
              }}>
                  <div style={{ textAlign: "center", marginBottom: 22 }}>
                    <div style={{
                      width: 58, height: 58, borderRadius: 18,
                      background: "linear-gradient(145deg, #4f8ef7, #2563eb)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      margin: "0 auto 14px", fontSize: 26,
                      boxShadow: "0 10px 30px rgba(79,142,247,0.35)",
                    }}>🏢</div>
                    <h2 style={{ fontSize: 22, fontWeight: 800, color: "#f0f0f8", marginBottom: 4, letterSpacing: "-0.02em" }}>Выберите объект</h2>
                    <p style={{ fontSize: 12, color: "#55556a", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                        📍 <span style={{ color: "#f0f0f8" }}>{city.label}</span>
                        <span style={{ opacity: 0.3 }}>·</span>
                        {currentUser.name}
                      </p>
                    </div>

                <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
                  <div style={{ position: "relative", flex: 1 }}>
                    <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 16, opacity: 0.4 }}>🔍</span>
                    <input type="text" value={companySearch} onChange={e => setCompanySearch(e.target.value)}
                      placeholder="Поиск компании..."
                      style={{ width: "100%", background: "rgba(255,255,255,0.055)", border: "1.5px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: "12px 14px 12px 40px", fontSize: 14, color: "#f0f0f8", outline: "none", boxSizing: "border-box" }}
                    />
                  </div>
                  <motion.button onClick={() => setShowAddCompanyModal(true)} whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.93 }}
                    style={{ width: 46, height: 46, background: "linear-gradient(135deg, #4f8ef7, #2563eb)", border: "none", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 6px 20px rgba(79,142,247,0.35)", flexShrink: 0, fontSize: 22 }}>
                    ＋
                  </motion.button>
                </div>

                <div style={{ overflowY: "auto", flex: 1, marginBottom: 10 }}>
                  {filteredCompanies.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "40px 20px" }}>
                      <div style={{ fontSize: 42, marginBottom: 12 }}>🏢</div>
                      <p style={{ color: "#44445a", fontSize: 14, marginBottom: 6 }}>
                        {companySearch ? "Компания не найдена" : "В этом городе пока нет объектов"}
                      </p>
                      {!companySearch && <p style={{ color: "#33334a", fontSize: 12 }}>Нажмите ＋ чтобы добавить</p>}
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {filteredCompanies.map((co, i) => (
                        <motion.button key={co.id}
                          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                          whileHover={{ scale: 1.02, x: 5 }} whileTap={{ scale: 0.97 }}
                          onClick={() => { setSelectedCompanyForDetails(co); setEditCompanyData({ description: co.description || "", professions_list: co.professions_list || "", employee_count: co.employee_count || 0 }); }}
                          style={{
                            background: "rgba(255,255,255,0.04)", border: "1.5px solid rgba(255,255,255,0.07)",
                            borderRadius: 20, padding: "18px 20px", cursor: "pointer",
                            textAlign: "left", display: "flex", alignItems: "center", gap: 16, position: "relative",
                            boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
                          }}
                        >
                          <div style={{
                            width: 50, height: 50, borderRadius: 15, flexShrink: 0,
                            background: "linear-gradient(135deg, rgba(79,142,247,0.18), rgba(37,99,235,0.1))",
                            border: "1px solid rgba(79,142,247,0.22)",
                            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
                          }}>🏗️</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 15, fontWeight: 700, color: "#f0f0f8", marginBottom: 3 }}>{co.name}</div>
                            <div style={{ fontSize: 11, color: "#55556a" }}>📍 {city.label}</div>
                          </div>
                          <span style={{ fontSize: 20, color: "#4f8ef7", opacity: 0.5 }}>›</span>
                          <div onClick={e => handleDeleteCompany(co.id, e)}
                            style={{ position: "absolute", top: 8, right: 8, width: 22, height: 22, borderRadius: "50%", background: "rgba(230,57,70,0.15)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 13, color: "#e63946", opacity: 0.7 }}>×</div>
                        </motion.button>
                      ))}
                    </div>
                  )}
                </div>

                <button onClick={() => { setStep("city"); setCity(null); setCompanies([]); }}
                  style={{ background: "none", border: "none", color: "#44445a", fontSize: 13, cursor: "pointer", padding: "8px" }}>
                  ← Назад к городам
                </button>
              </motion.div>
            </motion.div>
          )}

        </AnimatePresence>

        {/* ── МОДАЛКА: добавить город ── */}
        <AnimatePresence>
          {showAddModal && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => { setShowAddModal(false); setNewCityName(""); setAddError(""); }}
                style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)", zIndex: 50 }} />
              <motion.div initial={{ opacity: 0, scale: 0.88, x: "-50%", y: "-40%" }} animate={{ opacity: 1, scale: 1, x: "-50%", y: "-50%" }}
                exit={{ opacity: 0, scale: 0.88, x: "-50%", y: "-40%" }} transition={{ type: "spring", stiffness: 320, damping: 28 }}
                style={{ position: "fixed", top: "50%", left: "50%", background: "rgba(16,16,26,0.95)", border: "1px solid rgba(230,57,70,0.22)", borderRadius: 26, padding: "32px 28px", width: "90%", maxWidth: 360, zIndex: 51, boxShadow: "0 32px 80px rgba(0,0,0,0.65)" }}>
                <h3 style={{ fontSize: 20, fontWeight: 800, color: "#f0f0f8", marginBottom: 6 }}>🏙️ &nbsp;Добавить город</h3>
                <p style={{ fontSize: 13, color: "#55556a", marginBottom: 22 }}>Новый город получит все стандартные секции</p>
                <label style={labelStyle}>Название города</label>
                <input type="text" value={newCityName} onChange={e => { setNewCityName(e.target.value); setAddError(""); }}
                  onKeyDown={e => e.key === "Enter" && handleAddCity()} placeholder="Например: Самара" autoFocus
                  style={{ ...iInput(!!addError), marginBottom: 6 }} />
                {addError && <p style={{ fontSize: 12, color: "#f87171", marginBottom: 12 }}>{addError}</p>}
                {!addError && <div style={{ height: 16 }} />}
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={() => { setShowAddModal(false); setNewCityName(""); setAddError(""); }}
                    style={{ flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: "13px", fontSize: 14, color: "#888", cursor: "pointer" }}>Отмена</button>
                  <motion.button onClick={handleAddCity} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    style={{ flex: 1, background: "linear-gradient(135deg, #e63946, #c1121f)", border: "none", borderRadius: 14, padding: "13px", fontSize: 14, fontWeight: 700, color: "white", cursor: "pointer" }}>Добавить</motion.button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* ── МОДАЛКА: добавить компанию ── */}
        <AnimatePresence>
          {showAddCompanyModal && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => { setShowAddCompanyModal(false); setNewCompanyName(""); setAddCompanyError(""); }}
                style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)", zIndex: 50 }} />
              <motion.div initial={{ opacity: 0, scale: 0.88, x: "-50%", y: "-40%" }} animate={{ opacity: 1, scale: 1, x: "-50%", y: "-50%" }}
                exit={{ opacity: 0, scale: 0.88, x: "-50%", y: "-40%" }} transition={{ type: "spring", stiffness: 320, damping: 28 }}
                style={{ position: "fixed", top: "50%", left: "50%", background: "rgba(16,16,26,0.95)", border: "1px solid rgba(79,142,247,0.22)", borderRadius: 26, padding: "32px 28px", width: "90%", maxWidth: 360, zIndex: 51, boxShadow: "0 32px 80px rgba(0,0,0,0.65)" }}>
                <h3 style={{ fontSize: 20, fontWeight: 800, color: "#f0f0f8", marginBottom: 6 }}>🏗️ &nbsp;Добавить объект</h3>
                <p style={{ fontSize: 13, color: "#55556a", marginBottom: 22 }}>Объект будет добавлен в <span style={{ color: "#4f8ef7" }}>{city?.label}</span></p>
                <label style={labelStyle}>Название объекта</label>
                <input type="text" value={newCompanyName} onChange={e => { setNewCompanyName(e.target.value); setAddCompanyError(""); }}
                  onKeyDown={e => e.key === "Enter" && handleAddCompany()} placeholder="Например: ЖК Центральный" autoFocus
                  style={{ ...iInput(!!addCompanyError), marginBottom: 6 }} />
                {addCompanyError && <p style={{ fontSize: 12, color: "#f87171", marginBottom: 12 }}>{addCompanyError}</p>}
                {!addCompanyError && <div style={{ height: 16 }} />}
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={() => { setShowAddCompanyModal(false); setNewCompanyName(""); setAddCompanyError(""); }}
                    style={{ flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: "13px", fontSize: 14, color: "#888", cursor: "pointer" }}>Отмена</button>
                  <motion.button onClick={handleAddCompany} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    style={{ flex: 1, background: "linear-gradient(135deg, #4f8ef7, #2563eb)", border: "none", borderRadius: 14, padding: "13px", fontSize: 14, fontWeight: 700, color: "white", cursor: "pointer" }}>Добавить</motion.button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <RequestModal isOpen={showRequestModal} onClose={() => setShowRequestModal(false)} />
      </div>

      {/* ── МОДАЛКА: детали компании (вне flex-контейнера) ── */}
      <AnimatePresence>
        {selectedCompanyForDetails && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => { setSelectedCompanyForDetails(null); setIsEditingCompany(false); }}
              style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(10px)", zIndex: 100 }} />
            <motion.div initial={{ opacity: 0, scale: 0.88, x: "-50%", y: "-40%" }} animate={{ opacity: 1, scale: 1, x: "-50%", y: "-50%" }}
                exit={{ opacity: 0, scale: 0.88, x: "-50%", y: "-40%" }} transition={{ type: "spring", stiffness: 300, damping: 26 }}
              style={{ position: "fixed", top: "50%", left: "50%", background: "rgba(14,14,24,0.97)", border: "1px solid rgba(79,142,247,0.18)", borderRadius: 32, padding: "38px", width: "90%", maxWidth: 440, zIndex: 101, boxShadow: "0 48px 120px rgba(0,0,0,0.8)", maxHeight: "85vh", overflowY: "auto" }}>
              <div style={{ textAlign: "center", marginBottom: 28 }}>
                <div style={{ width: 66, height: 66, borderRadius: 20, background: "linear-gradient(145deg, #4f8ef7, #2563eb)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", boxShadow: "0 10px 36px rgba(79,142,247,0.35)", fontSize: 30 }}>🏗️</div>
                <h3 style={{ fontSize: 22, fontWeight: 800, color: "#f0f0f8", marginBottom: 6 }}>{selectedCompanyForDetails.name}</h3>
                <p style={{ fontSize: 13, color: "#55556a" }}>📍 {city?.label}</p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 28 }}>
                {!isEditingCompany ? (
                  <>
                      <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 18, padding: "16px", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <div style={{ fontSize: 10, color: "#44445a", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 8, fontWeight: 700 }}>📋 &nbsp;О компании</div>
                        <p style={{ fontSize: 14, color: "#f0f0f8", margin: 0, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
                          {selectedCompanyForDetails.description || "Описание не добавлено"}
                        </p>
                      </div>

                      {/* График дежурств (перевахтовки) */}
                      {objectSchedules.length > 0 && (
                        <div style={{ background: "rgba(96,165,250,0.08)", borderRadius: 18, padding: "16px", border: "1px solid rgba(96,165,250,0.15)" }}>
                          <div style={{ fontSize: 10, color: "#60a5fa", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 10, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                            <span>📅</span> График дежурств
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            {objectSchedules.slice(0, 3).map((r: any) => {
                              const isMyShift = pendingUser && r.data.guard?.toLowerCase().includes(pendingUser.name.toLowerCase());
                              return (
                                <div key={r.id} style={{ 
                                  display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
                                  padding: isMyShift ? "6px 10px" : "0",
                                  background: isMyShift ? "rgba(96,165,250,0.15)" : "transparent",
                                  borderRadius: 12,
                                  border: isMyShift ? "1px solid rgba(96,165,250,0.3)" : "none"
                                }}>
                                  <div style={{ minWidth: 0 }}>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: isMyShift ? "#60a5fa" : "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                      {r.data.guard} {isMyShift && " (Вы)"}
                                    </div>
                                    <div style={{ fontSize: 10, color: isMyShift ? "rgba(96,165,250,0.6)" : "#55556a" }}>{r.data.post_name}</div>
                                  </div>
                                  <div style={{ 
                                    fontSize: 11, fontWeight: 700, 
                                    color: isMyShift ? "#fff" : "#60a5fa", 
                                    background: isMyShift ? "#3b82f6" : "rgba(96,165,250,0.12)", 
                                    padding: "2px 8px", borderRadius: 8, whiteSpace: "nowrap" 
                                  }}>
                                    {r.data.date_start ? `${r.data.date_start.split('-').slice(1).reverse().join('.')} – ${r.data.date_end?.split('-').slice(1).reverse().join('.')}` : r.data.date}
                                  </div>
                                </div>
                              );
                            })}
                            {objectSchedules.length > 3 && <div style={{ fontSize: 10, color: "#44445a", textAlign: "center", marginTop: 4 }}>и ещё {objectSchedules.length - 3}...</div>}
                          </div>
                        </div>
                      )}

                      <div className="grid-cols-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>

                      <div style={{ background: "rgba(79,142,247,0.06)", borderRadius: 18, padding: "16px", border: "1px solid rgba(79,142,247,0.12)" }}>
                        <div style={{ fontSize: 10, color: "#44445a", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6, fontWeight: 700 }}>🔧 &nbsp;Сотрудников</div>
                        <div style={{ fontSize: 22, fontWeight: 800, color: "#4f8ef7" }}>{selectedCompanyForDetails.employee_count || 0}</div>
                      </div>
                      <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 18, padding: "16px", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <div style={{ fontSize: 10, color: "#44445a", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6, fontWeight: 700 }}>🗂️ &nbsp;Профессии</div>
                        <div style={{ fontSize: 22, fontWeight: 800, color: "#f0f0f8" }}>
                          {selectedCompanyForDetails.professions_list?.split(",").filter(Boolean).length || 0}
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label style={labelStyle}>Описание объекта</label>
                      <textarea value={editCompanyData.description}
                        onChange={e => setEditCompanyData(p => ({ ...p, description: e.target.value }))}
                        placeholder="Расскажите об объекте..." style={{ ...iInput(), height: 90, resize: "none" }} />
                    </div>
                    <div className="grid-cols-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <div>
                        <label style={labelStyle}>Кол-во сотрудников</label>
                        <input type="number" value={editCompanyData.employee_count}
                          onChange={e => setEditCompanyData(p => ({ ...p, employee_count: parseInt(e.target.value) || 0 }))}
                          style={iInput()} />
                      </div>
                      <div>
                        <label style={labelStyle}>Профессии (через запятую)</label>
                        <input type="text" value={editCompanyData.professions_list}
                          onChange={e => setEditCompanyData(p => ({ ...p, professions_list: e.target.value }))}
                          placeholder="Охранник, Диспетчер..." style={iInput()} />
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {!isEditingCompany ? (
                  <>
                    <GradBtn onClick={() => setCompany(selectedCompanyForDetails)}
                      gradient="linear-gradient(135deg, #4f8ef7, #2563eb)"
                      shadow="0 8px 28px rgba(79,142,247,0.4)">
                      Войти в панель →
                    </GradBtn>
                    {currentUser?.is_admin && (
                      <button onClick={() => setIsEditingCompany(true)}
                        style={{ background: "none", border: "none", color: "#44445a", fontSize: 13, cursor: "pointer", padding: "6px" }}>
                        ✏️ Редактировать информацию
                      </button>
                    )}
                    <button onClick={() => setSelectedCompanyForDetails(null)}
                      style={{ background: "none", border: "none", color: "#33334a", fontSize: 13, cursor: "pointer", padding: "6px" }}>
                      Закрыть
                    </button>
                  </>
                ) : (
                  <div style={{ display: "flex", gap: 10 }}>
                    <button onClick={() => setIsEditingCompany(false)}
                      style={{ flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: "14px", fontSize: 14, color: "#888", cursor: "pointer" }}>Отмена</button>
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                      onClick={async () => {
                        const res = await fetch("/api/companies", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: selectedCompanyForDetails.id, ...editCompanyData }) });
                        const updated = await res.json();
                        setCompanies(prev => prev.map(c => c.id === updated.id ? updated : c));
                        setSelectedCompanyForDetails(updated); setIsEditingCompany(false);
                      }}
                      style={{ flex: 1, background: "linear-gradient(135deg, #4f8ef7, #2563eb)", border: "none", borderRadius: 14, padding: "14px", fontSize: 14, fontWeight: 700, color: "white", cursor: "pointer" }}>
                      Сохранить
                    </motion.button>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showInstructions && currentUser && (
          <InstructionsModal role={currentUser.role}
            onClose={() => { setShowInstructions(false); setStep("city"); }} />
        )}
      </AnimatePresence>
    </>
  );
}
