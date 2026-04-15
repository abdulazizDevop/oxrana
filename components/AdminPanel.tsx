"use client";
import { sanitizeUrl } from "@/lib/sanitizeUrl";
import { formatPhone as formatPhoneNum } from "@/lib/formatPhone";
import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AppUser, SectionId, ALL_SECTIONS, Company } from "@/lib/auth";
import { InstructionsEditor } from "@/components/InstructionsComponents";
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
import WorkScheduleSection from "./sections/WorkScheduleSection";
import AdminLogSection from "./sections/AdminLogSection";
import ConferenceSection from "./sections/ConferenceSection";
import RequestsSection from "./sections/RequestsSection";

const SECTION_LABELS: Record<string, string> = {
  patrol: "Обходы", shift: "Смены", posts: "Посты", photo: "Фото отчёт",
  apartment: "Квартира", inventory: "Имущество", transport: "Транспорт",
  schedule: "График", fines: "Штрафы",
  expenses: "Расходы", work_schedule: "Вахта", admin_log: "Журнал",
};
const SECTION_ICONS: Record<string, string> = {
  patrol: "🔦", shift: "🔄", posts: "🏢", photo: "📷",
  apartment: "🏠", inventory: "📦", transport: "🚗",
  schedule: "📅", fines: "⚠️",
  expenses: "💰", work_schedule: "🗓️", admin_log: "🗂️",
};

const DEFAULT_CITIES = [
  { id: "moscow", label: "Москва" }, { id: "spb", label: "Санкт-Петербург" },
  { id: "novosibirsk", label: "Новосибирск" }, { id: "yekaterinburg", label: "Екатеринбург" },
  { id: "kazan", label: "Казань" }, { id: "krasnodar", label: "Краснодар" },
];

interface Props { onExit: () => void; }
type Tab = "users" | "companies" | "cameras" | "transport_log" | "instructions" | "logins" | "applications" | "subscriptions"
  | "patrol" | "shift" | "posts" | "photo" | "apartment" | "inventory" | "transport" | "schedule" | "fines" | "expenses" | "work_schedule" | "admin_log" | "conference";

const inp: React.CSSProperties = {
  width: "100%", background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14,
  padding: "13px 16px", fontSize: 15, color: "#e8e8f0", outline: "none", boxSizing: "border-box"
};

type LogEntry = {
  id: string; plate_number: string; driver_name: string;
  list_type: string; action: string; logged_by: string;
  logged_by_role: string; note: string; logged_at: string;
  city_id: string; company_id: string; vehicle_id?: string;
};
type Camera = {
  id: string; city_id: string; company_id: string;
  name: string; url: string; type: string; created_at: string;
};

function usePersistedState<T>(key: string, defaultValue: T): [T, (v: T | ((prev: T) => T)) => void] {
  const [state, _setState] = useState<T>(() => {
    if (typeof window === 'undefined') return defaultValue;
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : defaultValue;
    } catch { return defaultValue; }
  });
  const setState = (v: T | ((prev: T) => T)) => {
    _setState(prev => {
      const next = typeof v === 'function' ? (v as (p: T) => T)(prev) : v;
      try { localStorage.setItem(key, JSON.stringify(next)); } catch {}
      return next;
    });
  };
  return [state, setState];
}

export default function AdminPanel({ onExit }: Props) {
  const [tab, setTab] = usePersistedState<Tab>("admin_tab", "users");
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [openGroups, setOpenGroups] = usePersistedState<Record<string, boolean>>("admin_sidebar_groups", { plan: true, management: true });

  const adminUser: AppUser = {
    id: "admin_global",
    name: "Администратор",
    role: "admin",
    is_admin: true,
    allowedSections: [],
    allowedCities: [],
    allowedCompanies: [],
    login: "admin",
    password: "",
    profession: "Администратор"
  };

  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) setSidebarOpen(false);
      else setSidebarOpen(true);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Users
  const [users, setUsers] = useState<AppUser[]>([]);
  const [search, setSearch] = useState("");
  const filteredUsers = useMemo(() => {
    return users.filter(u => 
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.login.toLowerCase().includes(search.toLowerCase()) ||
      u.role.toLowerCase().includes(search.toLowerCase()) ||
      (u.profession && u.profession.toLowerCase().includes(search.toLowerCase()))
    );
  }, [users, search]);
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState<AppUser | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "", profession: "", role: "", login: "", password: "",
    allowedSections: [] as SectionId[], allowedCities: [] as string[], allowedCompanies: [] as string[],
  });
  const [formError, setFormError] = useState("");

  // Password reveal on double-click
  const [credModal, setCredModal] = useState<{ name: string; login: string; password: string } | null>(null);
  const [credLoading, setCredLoading] = useState(false);

  // Карточка нового сотрудника (показывается после создания)
  const [newUserCard, setNewUserCard] = useState<{ name: string; login: string; password: string; role: string; cities: string[]; companies: string[] } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    });
  };

  const generatePassword = () => {
    const chars = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let pass = "";
    for (let i = 0; i < 8; i++) pass += chars[Math.floor(Math.random() * chars.length)];
    return pass;
  };

  // Extra logins management
  type UserLogin = { id: string; user_id: string; login: string; plain_password: string; label: string; created_at: string };
  const [userLogins, setUserLogins] = useState<UserLogin[]>([]);
  const [loginsLoading, setLoginsLoading] = useState(false);
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [newLogin, setNewLogin] = useState({ login: "", password: "", label: "" });
  const [loginError, setLoginError] = useState("");
  const [revealedLogins, setRevealedLogins] = useState<Record<string, boolean>>({});

  // Logins tab — all users with all their logins
  type AllUserCreds = { user: AppUser; plain_password: string; extraLogins: UserLogin[] };
  const [allCreds, setAllCreds] = useState<AllUserCreds[]>([]);
  const [allCredsLoading, setAllCredsLoading] = useState(false);
  const [allCredsRevealed, setAllCredsRevealed] = useState<Record<string, boolean>>({});
  const [allExtraRevealed, setAllExtraRevealed] = useState<Record<string, boolean>>({});
  const [loginsTabSearch, setLoginsTabSearch] = useState("");
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [addLoginForUser, setAddLoginForUser] = useState<string | null>(null);
  const [newTabLogin, setNewTabLogin] = useState({ login: "", password: "", label: "" });
  const [tabLoginError, setTabLoginError] = useState("");

  const loadAllCreds = async () => {
    setAllCredsLoading(true);
    const usersRes = await fetch("/api/users?withPassword=1");
    const usersData = await usersRes.json();
    const rows: AppUser[] = (Array.isArray(usersData) ? usersData : []).map((u: any) => ({
      id: u.id, name: u.name, role: u.role, profession: u.profession,
      login: u.login, password: u.plain_password || "",
      allowedSections: u.allowed_sections || [],
      allowedCities: u.allowed_cities || [],
      allowedCompanies: u.allowed_companies || [],
      is_admin: u.is_admin,
    }));
    const credsArr: AllUserCreds[] = await Promise.all(rows.map(async (u) => {
      const lRes = await fetch(`/api/users/logins?userId=${u.id}`);
      const lData = await lRes.json();
      return { user: u, plain_password: u.password || "", extraLogins: Array.isArray(lData) ? lData : [] };
    }));
    setAllCreds(credsArr);
    setAllCredsLoading(false);
  };

  const handleTabAddLogin = async (userId: string) => {
    if (!newTabLogin.login.trim() || !newTabLogin.password.trim()) { setTabLoginError("Заполните логин и пароль"); return; }
    const res = await fetch("/api/users/logins", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, login: newTabLogin.login.trim(), password: newTabLogin.password.trim(), label: newTabLogin.label.trim() }),
    });
    if (!res.ok) { const d = await res.json(); setTabLoginError(d.error || "Ошибка"); return; }
    setNewTabLogin({ login: "", password: "", label: "" }); setTabLoginError(""); setAddLoginForUser(null);
    loadAllCreds();
  };

  const handleTabDeleteLogin = async (loginId: string) => {
    await fetch(`/api/users/logins?id=${loginId}`, { method: "DELETE" });
    loadAllCreds();
  };

  const loadUserLogins = async (userId: string) => {
    setLoginsLoading(true);
    const res = await fetch(`/api/users/logins?userId=${userId}`);
    const data = await res.json();
    setUserLogins(Array.isArray(data) ? data : []);
    setLoginsLoading(false);
  };

  const handleAddLogin = async () => {
    if (!selectedUser) return;
    if (!newLogin.login.trim() || !newLogin.password.trim()) { setLoginError("Заполните логин и пароль"); return; }
    const res = await fetch("/api/users/logins", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: selectedUser.id, login: newLogin.login.trim(), password: newLogin.password.trim(), label: newLogin.label.trim() }),
    });
    if (!res.ok) { const d = await res.json(); setLoginError(d.error || "Ошибка"); return; }
    setNewLogin({ login: "", password: "", label: "" }); setLoginError(""); setShowLoginForm(false);
    loadUserLogins(selectedUser.id);
  };

  const handleDeleteLogin = async (loginId: string) => {
    await fetch(`/api/users/logins?id=${loginId}`, { method: "DELETE" });
    if (selectedUser) loadUserLogins(selectedUser.id);
  };

  // Companies
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCity, setSelectedCity] = useState<string>(DEFAULT_CITIES[0].id);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [newCoName, setNewCoName] = useState("");
  const [newCoDesc, setNewCoDesc] = useState("");
  const [coError, setCoError] = useState("");
  const [deleteCoConfirm, setDeleteCoConfirm] = useState<string | null>(null);
  const [allCities, setAllCities] = useState(DEFAULT_CITIES);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [companySearch, setCompanySearch] = useState("");
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [editCoForm, setEditCoForm] = useState({ name: "", description: "" });
  const [editCoError, setEditCoError] = useState("");

  // Transport log
  const [transportLog, setTransportLog] = useState<LogEntry[]>([]);
  const [logLoading, setLogLoading] = useState(false);
  const [logCityFilter, setLogCityFilter] = useState("");
  const [exitConfirm, setExitConfirm] = useState<LogEntry | null>(null);
  const [exitLoading, setExitLoading] = useState(false);

    // Cameras

  const [cameras, setCameras] = useState<Camera[]>([]);
  const [camLoading, setCamLoading] = useState(false);
  const [camCity, setCamCity] = useState("");
  const [camCompany, setCamCompany] = useState("");
  const [showCamForm, setShowCamForm] = useState(false);
  const [camForm, setCamForm] = useState({ name: "", url: "", type: "iframe" });
  const [camError, setCamError] = useState("");
  const [fullscreenCam, setFullscreenCam] = useState<Camera | null>(null);

  // Subscriptions
  const [adminSettings, setAdminSettings] = useState<Record<string, string>>({});
  const [subPhoneEdit, setSubPhoneEdit] = useState("");
  const [subCardEdit, setSubCardEdit] = useState("");
  const [subPriceEdit, setSubPriceEdit] = useState("9 990 ₽");
  const [storagePriceEdit, setStoragePriceEdit] = useState("0.07");
  const [subLoading, setSubLoading] = useState(false);
  const [allCompanies, setAllCompanies] = useState<Company[]>([]);
  const [extendingCompany, setExtendingCompany] = useState<string | null>(null);
  const [extensionMonths, setExtensionMonths] = useState(1);

  useEffect(() => {
    if (tab === "subscriptions") {
      setSubLoading(true);
      fetch("/api/admin/settings").then(r => r.json()).then(data => {
        setAdminSettings(data);
        setSubPhoneEdit(data.subscription_phone || "");
        setSubCardEdit(data.subscription_card || "");
        setSubPriceEdit(data.subscription_price || "9 990 ₽");
        setStoragePriceEdit(data.storage_price_per_gb || "0.07");
      }).catch(() => {});
      
      fetch("/api/companies").then(r => r.json()).then(data => {
        setAllCompanies(Array.isArray(data) ? data : []);
        setSubLoading(false);
      }).catch(() => setSubLoading(false));
    }
  }, [tab]);

  const handleSavePaymentSettings = async () => {
    const h = { "Content-Type": "application/json" };
    await Promise.all([
      fetch("/api/admin/settings", { method: "POST", headers: h, body: JSON.stringify({ id: "subscription_phone", value: subPhoneEdit }) }),
      fetch("/api/admin/settings", { method: "POST", headers: h, body: JSON.stringify({ id: "subscription_card", value: subCardEdit }) }),
      fetch("/api/admin/settings", { method: "POST", headers: h, body: JSON.stringify({ id: "subscription_price", value: subPriceEdit }) }),
      fetch("/api/admin/settings", { method: "POST", headers: h, body: JSON.stringify({ id: "storage_price_per_gb", value: storagePriceEdit }) }),
    ]);
    setAdminSettings(prev => ({ ...prev, subscription_phone: subPhoneEdit, subscription_card: subCardEdit, subscription_price: subPriceEdit, storage_price_per_gb: storagePriceEdit }));
  };

  const handleExtendSubscription = async (companyId: string, months: number) => {
    const company = allCompanies.find(c => c.id === companyId);
    if (!company) return;
    
    let currentEnd = company.subscriptionEndsAt ? new Date(company.subscriptionEndsAt) : new Date();
    if (currentEnd.getTime() < Date.now()) currentEnd = new Date();
    
    const newEnd = new Date(currentEnd);
    if (months >= 120) { // 10 years special case
      newEnd.setFullYear(newEnd.getFullYear() + 10);
    } else {
      newEnd.setMonth(newEnd.getMonth() + months);
    }
    
    const res = await fetch("/api/companies", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: companyId, subscriptionEndsAt: newEnd.toISOString() }),
    });
    
    if (res.ok) {
      const updated = await res.json();
      setAllCompanies(prev => prev.map(c => c.id === updated.id ? { ...c, subscriptionEndsAt: updated.subscriptionEndsAt } : c));
      setExtendingCompany(null);
    }
  };

  useEffect(() => {
    if (selectedUser) {
      loadUserLogins(selectedUser.id);
      setShowLoginForm(false);
      setNewLogin({ login: "", password: "", label: "" });
      setLoginError("");
      setRevealedLogins({});
    } else {
      setUserLogins([]);
    }
  }, [selectedUser?.id]);

  useEffect(() => {
    refreshUsers(); refreshCompanies();
    fetch("/api/cities").then(r => r.json()).then((rows: { id: string; name: string }[]) => {
      setAllCities(rows.map(r => ({ id: r.id, label: r.name })));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (companies.length > 0 && !selectedCompanyId) {
      const cityCo = companies.find(c => c.cityId === selectedCity);
      if (cityCo) setSelectedCompanyId(cityCo.id);
    }
  }, [companies, selectedCity]);

  useEffect(() => { if (tab === "logins") { loadAllCreds(); } }, [tab]);
  useEffect(() => { if (tab === "transport_log") loadTransportLog(); }, [tab, logCityFilter]);
  useEffect(() => {
    if (tab === "cameras") loadCameras();
  }, [tab, camCity, camCompany]);

  const loadCameras = () => {
    setCamLoading(true);
    const q = new URLSearchParams();
    if (camCity) q.set("cityId", camCity);
    if (camCompany) q.set("companyId", camCompany);
    fetch(`/api/cameras?${q}`).then(r => r.json())
      .then(data => { setCameras(Array.isArray(data) ? data : []); setCamLoading(false); })
      .catch(() => setCamLoading(false));
  };

  const loadTransportLog = () => {
    setLogLoading(true);
    const q = logCityFilter ? `?cityId=${logCityFilter}` : "";
    fetch(`/api/transport/log${q}`).then(r => r.json())
      .then(data => { setTransportLog(Array.isArray(data) ? data : []); setLogLoading(false); })
      .catch(() => setLogLoading(false));
  };

  const refreshUsers = () => {
    fetch("/api/users").then(r => r.json()).then((rows: any[]) => {
      setUsers(rows.map(u => ({
        id: u.id, name: u.name, role: u.role, profession: u.profession,
        login: u.login, password: "",
        allowedSections: u.allowed_sections || [],
        allowedCities: u.allowed_cities || [],
        allowedCompanies: u.allowed_companies || [],
        is_admin: u.is_admin,
      })));
    }).catch(() => {});
  };

  const refreshCompanies = () => {
    fetch("/api/companies").then(r => r.json()).then((rows: any[]) => {
      setCompanies(rows.map(r => ({ id: r.id, cityId: r.cityId || r.city_id, name: r.name, description: r.description, professions_list: r.professions_list, employee_count: r.employee_count, subscriptionEndsAt: r.subscriptionEndsAt, ownerId: r.ownerId })));
    }).catch(() => {});
  };

  // Double-click to reveal credentials
  const handleDoubleClick = async (u: AppUser) => {
    setCredLoading(true);
    const res = await fetch(`/api/users?withPassword=1&id=${u.id}`);
    const data = await res.json();
    setCredLoading(false);
    setCredModal({
      name: data?.name || u.name,
      login: data?.login || u.login,
      password: data?.plain_password || "(пароль не сохранён в открытом виде)",
    });
  };

  const openCreate = () => {
    setEditUser(null);
    setForm({ name: "", profession: "", role: "", login: "", password: "", allowedSections: [], allowedCities: [], allowedCompanies: [] });
    setFormError(""); setShowForm(true); setSelectedUser(null);
  };
  const openEdit = (u: AppUser) => {
    setEditUser(u);
    setForm({
      name: u.name, profession: u.profession, role: u.role, login: u.login, password: "",
      allowedSections: [...u.allowedSections],
      allowedCities: [...u.allowedCities],
      allowedCompanies: [...(u.allowedCompanies || [])],
    });
    setFormError(""); setShowForm(true); setSelectedUser(null);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setFormError("Введите имя"); return; }
    if (!form.login.trim()) { setFormError("Введите логин"); return; }
    if (!editUser && !form.password.trim()) { setFormError("Введите пароль"); return; }
    if (form.allowedSections.length === 0) { setFormError("Выберите хотя бы одну секцию"); return; }
    if (form.allowedCities.length === 0) { setFormError("Выберите хотя бы один город"); return; }
    if (form.allowedCompanies.length === 0) { setFormError("Выберите хотя бы одну компанию"); return; }
    try {
       if (editUser) {
         await fetch("/api/users", {
           method: "PUT", headers: { "Content-Type": "application/json" },
           body: JSON.stringify({ id: editUser.id, name: form.name, role: form.role, profession: form.profession, login: form.login, password: form.password || undefined, allowedSections: form.allowedSections, allowedCities: form.allowedCities, allowedCompanies: form.allowedCompanies }),
         });
         refreshUsers(); setShowForm(false);
       } else {
         await fetch("/api/users", {
           method: "POST", headers: { "Content-Type": "application/json" },
           body: JSON.stringify({ id: "user_" + Date.now(), name: form.name, role: form.role, profession: form.profession, login: form.login, password: form.password, allowedSections: form.allowedSections, allowedCities: form.allowedCities, allowedCompanies: form.allowedCompanies }),
         });
         refreshUsers(); setShowForm(false);
           setNewUserCard({ name: form.name, login: form.login, password: form.password, role: form.role, cities: form.allowedCities, companies: form.allowedCompanies });
       }
     } catch { setFormError("Ошибка сохранения"); }
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/users?id=${id}`, { method: "DELETE" });
    refreshUsers(); setDeleteConfirm(null); setSelectedUser(null);
  };

  const toggleSection = (s: SectionId) => setForm(f => ({ ...f, allowedSections: f.allowedSections.includes(s) ? f.allowedSections.filter(x => x !== s) : [...f.allowedSections, s] }));
  const toggleCity = (id: string) => setForm(f => ({ ...f, allowedCities: f.allowedCities.includes(id) ? f.allowedCities.filter(x => x !== id) : [...f.allowedCities, id] }));
  const toggleCompany = (id: string) => setForm(f => ({ ...f, allowedCompanies: f.allowedCompanies.includes(id) ? f.allowedCompanies.filter(x => x !== id) : [...f.allowedCompanies, id] }));

  const cityCompanies = selectedCity ? companies.filter(c => c.cityId === selectedCity) : [];
    const handleAddCompany = async () => {
      const name = newCoName.trim();
      if (!name) { setCoError("Введите название"); return; }
      if (!selectedCity) { setCoError("Выберите город"); return; }
      const id = name.toLowerCase().replace(/\s+/g, "_") + "_" + Date.now();
      const res = await fetch("/api/companies", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, cityId: selectedCity, name, description: newCoDesc.trim() }) });
      if (!res.ok) { setCoError("Ошибка при добавлении"); return; }
      const newCo = await res.json();
      setCompanies(prev => [...prev, { id: newCo.id, cityId: newCo.cityId || newCo.city_id || selectedCity, name: newCo.name, description: newCo.description }]);
      setNewCoName(""); setNewCoDesc(""); setCoError("");
    };
  const handleDeleteCompany = async (id: string) => {
    await fetch(`/api/companies?id=${id}`, { method: "DELETE" });
    refreshCompanies(); setDeleteCoConfirm(null);
    if (selectedCompany?.id === id) setSelectedCompany(null);
  };

  const handleEditCompany = async () => {
    if (!editingCompany) return;
    if (!editCoForm.name.trim()) { setEditCoError("Введите название"); return; }
    const res = await fetch("/api/companies", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editingCompany.id, name: editCoForm.name.trim(), description: editCoForm.description.trim() }),
    });
    if (!res.ok) { setEditCoError("Ошибка сохранения"); return; }
    refreshCompanies(); setEditingCompany(null); setEditCoError("");
    if (selectedCompany?.id === editingCompany.id) {
      setSelectedCompany(prev => prev ? { ...prev, name: editCoForm.name.trim() } : null);
    }
  };

  const filteredCompanies = useMemo(() => {
    const byCity = companies.filter(c => !selectedCity || c.cityId === selectedCity);
    if (!companySearch.trim()) return byCity;
    return byCity.filter(c => c.name.toLowerCase().includes(companySearch.toLowerCase()));
  }, [companies, selectedCity, companySearch]);
  const cityLabel = (id: string) => allCities.find(c => c.id === id)?.label || id;

  const todayStr = new Date().toISOString().slice(0, 10);
  const vehicleLastAction: Record<string, LogEntry> = {};
  for (const entry of transportLog) {
    if (entry.logged_at.slice(0, 10) === todayStr) {
      const key = entry.plate_number + "_" + entry.city_id;
      if (!vehicleLastAction[key] || entry.logged_at > vehicleLastAction[key].logged_at) vehicleLastAction[key] = entry;
    }
  }
  const insideToday = Object.values(vehicleLastAction).filter(e => e.action === "entry");

  const handleConfirmExit = async () => {
    if (!exitConfirm) return;
    setExitLoading(true);
    await fetch("/api/transport/log", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cityId: exitConfirm.city_id, companyId: exitConfirm.company_id,
        vehicleId: exitConfirm.vehicle_id || "", plateNumber: exitConfirm.plate_number,
        driverName: exitConfirm.driver_name, listType: exitConfirm.list_type,
        action: "exit", loggedBy: "Администратор", loggedByRole: "admin",
        note: "Выезд подтверждён из журнала",
      }),
    });
    setExitLoading(false); setExitConfirm(null); loadTransportLog();
  };

  const handleAddCamera = async () => {
    if (!camForm.name.trim() || !camForm.url.trim()) { setCamError("Заполните название и URL"); return; }
    await fetch("/api/cameras", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cityId: camCity || "all", companyId: camCompany || "all", name: camForm.name, url: camForm.url, type: camForm.type }),
    });
    setCamForm({ name: "", url: "", type: "iframe" }); setCamError(""); setShowCamForm(false); loadCameras();
  };

  const PLAN_TABS: { id: Tab; label: string; icon: string }[] = [
    { id: "patrol", label: "Обходы по территории", icon: "🔦" },
    { id: "shift", label: "Приём и сдача смен", icon: "🔄" },
    { id: "posts", label: "Порядок на постах", icon: "🏢" },
    { id: "photo", label: "Фото отчёт / Нарушение", icon: "📷" },
    { id: "apartment", label: "Служебная квартира", icon: "🏠" },
    { id: "inventory", label: "Учёт имущества ЧОП", icon: "📦" },
    { id: "transport", label: "Регистрация транспорта", icon: "🚗" },
    { id: "schedule", label: "График перевахтовки", icon: "📅" },
    { id: "fines", label: "Штрафы за нарушение", icon: "⚠️" },
  ];

  const MGMT_TABS: { id: Tab; label: string; icon: string }[] = [
    { id: "users", label: "Сотрудники", icon: "👥" },
    { id: "logins", label: "Логины и пароли", icon: "🔑" },
    { id: "companies", label: "Компании", icon: "🏢" },
    { id: "cameras", label: "Камеры", icon: "📹" },
    { id: "expenses", label: "Расходы", icon: "💰" },
    { id: "work_schedule", label: "Вахта", icon: "🗓️" },
    { id: "transport_log", label: "Журнал транспорта", icon: "🚗" },
    { id: "applications", label: "Журнал заявок", icon: "📋" },
      { id: "admin_log", label: "Журнал логов", icon: "🗂️" },
      { id: "instructions", label: "Инструкции", icon: "📖" },
      { id: "conference", label: "Конференция", icon: "🎥" },
      { id: "subscriptions", label: "Подписки", icon: "💳" },
    ];

  const currentTabLabel = [...PLAN_TABS, ...MGMT_TABS].find(t => t.id === tab)?.label || tab;

  // Mobile bottom nav tabs (6 main ones)
  const MOBILE_BOTTOM: { id: Tab; icon: string; label: string }[] = [
    { id: "users", icon: "👥", label: "Люди" },
    { id: "companies", icon: "🏢", label: "Компании" },
    { id: "transport_log", icon: "🚗", label: "Транспорт" },
    { id: "patrol", icon: "🔦", label: "Обходы" },
    { id: "instructions", icon: "📖", label: "Ещё" },
  ];

  return (
    <div style={{ display: "flex", height: "100dvh", background: "#080810", color: "#f0f0fa", overflow: "hidden", width: "100%" }}>

      {/* ── SIDEBAR (desktop + mobile drawer) ── */}
      <AnimatePresence>
        {(sidebarOpen) && (
          <>
            {/* Backdrop on mobile */}
            {isMobile && (
              <motion.div
                key="backdrop"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setSidebarOpen(false)}
                style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 199, backdropFilter: "blur(6px)" }}
              />
            )}
            <motion.aside
              key="sidebar"
              initial={{ x: -280, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -280, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              style={{
                width: 272,
                background: "rgba(10,10,18,0.98)",
                borderRight: "1px solid rgba(255,255,255,0.06)",
                display: "flex",
                flexDirection: "column",
                flexShrink: 0,
                height: "100vh",
                position: isMobile ? "fixed" : "sticky",
                top: 0,
                left: 0,
                zIndex: 200,
                overflowY: "auto",
              }}
            >
              {/* Logo */}
              <div style={{ padding: "20px 20px 16px", display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <div style={{ width: 40, height: 40, borderRadius: 13, background: "linear-gradient(135deg, #e63946, #ff6b35)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 16px rgba(230,57,70,0.35)", fontSize: 18, flexShrink: 0 }}>🛡️</div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "#f0f0fa", letterSpacing: "-0.3px" }}>Панель админа</div>
                  <div style={{ fontSize: 9, color: "#383850", letterSpacing: "0.12em", textTransform: "uppercase" }}>SECURITY TRACKER</div>
                </div>
                {isMobile && (
                  <button onClick={() => setSidebarOpen(false)} style={{ marginLeft: "auto", background: "rgba(255,255,255,0.05)", border: "none", borderRadius: 10, width: 32, height: 32, color: "#606070", cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
                )}
              </div>

              <nav style={{ flex: 1, padding: "10px 10px", overflowY: "auto" }}>
                {/* ПЛАН */}
                <div style={{ marginBottom: 4 }}>
                  <div onClick={() => setOpenGroups(prev => ({ ...prev, plan: !prev.plan }))}
                    style={{ fontSize: 10, color: "#383850", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", padding: "10px 12px 6px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span>План</span>
                    <motion.span animate={{ rotate: openGroups.plan ? 0 : -90 }} style={{ fontSize: 12, color: "#38385a" }}>▾</motion.span>
                  </div>
                  <AnimatePresence initial={false}>
                    {openGroups.plan && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.15 }} style={{ overflow: "hidden" }}>
                        {PLAN_TABS.map((t, i) => (
                          <motion.button key={t.id}
                            initial={{ opacity: 0, x: -12 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.02, duration: 0.15 }}
                            whileHover={{ x: 4, backgroundColor: tab === t.id ? "rgba(230,57,70,0.15)" : "rgba(255,255,255,0.04)" }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => { setTab(t.id); setSelectedUser(null); if (isMobile) setSidebarOpen(false); }}
                            style={{ width: "100%", display: "flex", alignItems: "center", gap: 11, padding: "12px 14px", borderRadius: 13, border: "none", cursor: "pointer", marginBottom: 2, background: tab === t.id ? "rgba(230,57,70,0.1)" : "transparent", borderLeft: `3px solid ${tab === t.id ? "#e63946" : "transparent"}`, textAlign: "left", transition: "background 0.18s" }}>
                            <span style={{ fontSize: 18, filter: tab === t.id ? "none" : "grayscale(0.5)", transition: "filter 0.2s" }}>{t.icon}</span>
                            <span style={{ fontSize: 14, fontWeight: tab === t.id ? 700 : 400, color: tab === t.id ? "#f0f0fa" : "#606078", transition: "color 0.2s" }}>{t.label}</span>
                          </motion.button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* УПРАВЛЕНИЕ */}
                <div style={{ marginBottom: 4 }}>
                  <div onClick={() => setOpenGroups(prev => ({ ...prev, management: !prev.management }))}
                    style={{ fontSize: 10, color: "#383850", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", padding: "10px 12px 6px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span>Управление</span>
                    <motion.span animate={{ rotate: openGroups.management ? 0 : -90 }} style={{ fontSize: 12, color: "#38385a" }}>▾</motion.span>
                  </div>
                  <AnimatePresence initial={false}>
                    {openGroups.management && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.15 }} style={{ overflow: "hidden" }}>
                        {MGMT_TABS.map((t, i) => (
                          <motion.button key={t.id}
                            initial={{ opacity: 0, x: -12 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.02, duration: 0.15 }}
                            whileHover={{ x: 4, backgroundColor: tab === t.id ? "rgba(79,142,247,0.15)" : "rgba(255,255,255,0.04)" }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => { setTab(t.id); setSelectedUser(null); if (t.id === "companies") { setSelectedCity(""); setSelectedCompany(null); } if (isMobile) setSidebarOpen(false); }}
                            style={{ width: "100%", display: "flex", alignItems: "center", gap: 11, padding: "12px 14px", borderRadius: 13, border: "none", cursor: "pointer", marginBottom: 2, background: tab === t.id ? "rgba(79,142,247,0.1)" : "transparent", borderLeft: `3px solid ${tab === t.id ? "#4f8ef7" : "transparent"}`, textAlign: "left", transition: "background 0.18s" }}>
                            <span style={{ fontSize: 18, filter: tab === t.id ? "none" : "grayscale(0.5)", transition: "filter 0.2s" }}>{t.icon}</span>
                            <span style={{ fontSize: 14, fontWeight: tab === t.id ? 700 : 400, color: tab === t.id ? "#f0f0fa" : "#606078", transition: "color 0.2s" }}>{t.label}</span>
                          </motion.button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </nav>

              {/* Выход */}
              <div style={{ padding: "16px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={onExit}
                  style={{ width: "100%", background: "rgba(230,57,70,0.08)", border: "1px solid rgba(230,57,70,0.15)", borderRadius: 13, padding: "12px", color: "#e63946", fontSize: 14, cursor: "pointer", fontWeight: 600 }}>
                  Выход из панели
                </motion.button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── MAIN ── */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "auto", minWidth: 0, height: "100%" }}>

        {/* ── TOP HEADER ── */}
        <header style={{ padding: isMobile ? "14px 16px" : "16px 24px", borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(8,8,16,0.97)", backdropFilter: "blur(20px)", position: "sticky", top: 0, zIndex: 100 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <motion.button whileTap={{ scale: 0.88 }} onClick={() => setSidebarOpen(!sidebarOpen)}
              style={{ width: 42, height: 42, borderRadius: 13, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", color: "#f0f0fa", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
              ☰
            </motion.button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 style={{ fontSize: isMobile ? 17 : 18, fontWeight: 700, color: "#f0f0fa", letterSpacing: "-0.2px" }}>{currentTabLabel}</h1>
              {!isMobile && PLAN_TABS.some(t => t.id === tab) && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, flexWrap: "wrap", position: "relative", zIndex: 110 }}>
                  <select value={selectedCity} onChange={e => setSelectedCity(e.target.value)}
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "10px 32px 10px 14px", fontSize: 14, color: "#f0f0fa", outline: "none", cursor: "pointer", minWidth: 140, position: "relative", zIndex: 111 }}>
                    {allCities.map(c => <option key={c.id} value={c.id} style={{ background: "#0a0a14" }}>{c.label}</option>)}
                  </select>
                  <select value={selectedCompanyId} onChange={e => setSelectedCompanyId(e.target.value)}
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "10px 32px 10px 14px", fontSize: 14, color: "#f0f0fa", outline: "none", cursor: "pointer", minWidth: 140, position: "relative", zIndex: 111 }}>
                    {companies.filter(c => c.cityId === selectedCity).map(c => <option key={c.id} value={c.id} style={{ background: "#0a0a14" }}>{c.name}</option>)}
                  </select>
                </div>
              )}
            </div>
              {!isMobile && (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#f0f0fa" }}>Администратор</div>
                    <div style={{ fontSize: 11, color: "#404058" }}>Полный доступ</div>
                  </div>
                  <div style={{ width: 40, height: 40, borderRadius: 13, background: "linear-gradient(135deg, #e63946, #ff6b35)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, color: "white", fontWeight: 700 }}>А</div>
                </div>
              )}
          </div>
        </header>

        {/* ── Mobile city/company selector (shown below header on mobile for plan tabs) ── */}
        {isMobile && PLAN_TABS.some(t => t.id === tab) && (
          <div style={{ padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", gap: 8, background: "rgba(8,8,16,0.97)", position: "sticky", top: 0, zIndex: 90 }}>
            <select value={selectedCity} onChange={e => setSelectedCity(e.target.value)}
              style={{ flex: 1, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "10px 14px", fontSize: 14, color: "#f0f0fa", outline: "none", cursor: "pointer" }}>
              {allCities.map(c => <option key={c.id} value={c.id} style={{ background: "#0a0a14" }}>{c.label}</option>)}
            </select>
            <select value={selectedCompanyId} onChange={e => setSelectedCompanyId(e.target.value)}
              style={{ flex: 1, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "10px 14px", fontSize: 14, color: "#f0f0fa", outline: "none", cursor: "pointer" }}>
              {companies.filter(c => c.cityId === selectedCity).map(c => <option key={c.id} value={c.id} style={{ background: "#0a0a14" }}>{c.name}</option>)}
            </select>
          </div>
        )}

        <div style={{ flex: 1, padding: isMobile ? "16px 14px" : "24px 28px", maxWidth: 1200, margin: "0 auto", width: "100%", paddingBottom: isMobile ? 90 : undefined }}>
          {/* Stats Bar */}
          {!PLAN_TABS.some(t => t.id === tab) && (
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(auto-fill, minmax(140px, 1fr))", gap: 10, marginBottom: 24 }}>
              {[
                { label: "Сотрудников", value: users.length, icon: "👥", color: "#4f8ef7", bg: "rgba(79,142,247,0.08)" },
                { label: "Компаний", value: companies.length, icon: "🏢", color: "#43b89c", bg: "rgba(67,184,156,0.08)" },
                { label: "Городов", value: allCities.length, icon: "🏙️", color: "#fb923c", bg: "rgba(251,146,60,0.08)" },
                { label: "На объекте", value: insideToday.length, icon: "🚗", color: "#4ade80", bg: "rgba(74,222,128,0.08)" },
              ].map(stat => (
                <div key={stat.label} style={{ background: stat.bg, border: `1px solid ${stat.color}22`, borderRadius: 18, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ fontSize: 20 }}>{stat.icon}</div>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: stat.color, letterSpacing: "-0.3px" }}>{stat.value}</div>
                    <div style={{ fontSize: 11, color: "#505065", marginTop: 1 }}>{stat.label}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

            <AnimatePresence mode="wait">
              <motion.div
                key={tab}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
              >
                {/* === ПЛАН СЕКЦИИ === */}
                {tab === "patrol" && <PatrolSection city={selectedCity} companyId={selectedCompanyId} />}
                {tab === "shift" && <ShiftSection city={selectedCity} companyId={selectedCompanyId} />}
                {tab === "posts" && <PostsSection city={selectedCity} companyId={selectedCompanyId} />}
                {tab === "photo" && <PhotoReportSection city={selectedCity} companyId={selectedCompanyId} />}
                {tab === "apartment" && <ApartmentSection city={selectedCity} companyId={selectedCompanyId} />}
                  {tab === "inventory" && <InventorySection city={selectedCity} companyId={selectedCompanyId} currentUser={adminUser} />}
                {tab === "transport" && <TransportSection city={selectedCity} companyId={selectedCompanyId} currentUser={adminUser} />}
                {tab === "schedule" && <ScheduleSection city={selectedCity} companyId={selectedCompanyId} />}
                {tab === "fines" && <FinesSection city={selectedCity} companyId={selectedCompanyId} />}
                {tab === "expenses" && <ExpensesSection city={selectedCity} companyId={selectedCompanyId} currentUser={adminUser} />}
                {tab === "work_schedule" && <WorkScheduleSection city={selectedCity} companyId={selectedCompanyId} />}
                  {tab === "admin_log" && <AdminLogSection city={selectedCity} companyId={selectedCompanyId} />}
                  {tab === "conference" && <ConferenceSection city={selectedCity} companyId={selectedCompanyId} currentUser={adminUser} isAdmin={true} allCities={allCities} companies={companies} />}
                    {tab === "applications" && <RequestsSection city={selectedCity} companyId={selectedCompanyId} />}
                    {tab === "subscriptions" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                        {/* Settings */}
                        <div style={{ background: "rgba(19,19,26,0.8)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 20, padding: "24px" }}>
                          <h3 style={{ fontSize: 16, fontWeight: 700, color: "#e8e8f0", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                            <span>⚙️</span> Настройки подписки
                          </h3>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, maxWidth: 600, marginBottom: 16 }}>
                            <div>
                              <label style={{ fontSize: 10, color: "#55556a", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>Телефон для связи</label>
                              <input type="tel" inputMode="tel" value={subPhoneEdit} onChange={e => setSubPhoneEdit(formatPhoneNum(e.target.value))} style={inp} placeholder="+7 (999) 000-00-00" maxLength={18} />
                            </div>
                            <div>
                              <label style={{ fontSize: 10, color: "#55556a", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>Номер карты для оплаты</label>
                              <input type="text" inputMode="numeric" value={subCardEdit} onChange={e => { const d = e.target.value.replace(/\D/g, '').slice(0, 16); setSubCardEdit(d.replace(/(.{4})/g, '$1 ').trim()); }} style={inp} placeholder="2200 0000 0000 0000" maxLength={19} />
                            </div>
                            <div>
                              <label style={{ fontSize: 10, color: "#55556a", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>Стоимость за 1 объект</label>
                              <input type="text" inputMode="numeric" value={subPriceEdit} onChange={e => setSubPriceEdit(e.target.value.replace(/[^\d\s₽.]/g, ''))} style={inp} placeholder="9 990 ₽" />
                            </div>
                            <div>
                              <label style={{ fontSize: 10, color: "#55556a", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>Тариф хранилища (₽ за 1 ГБ)</label>
                              <input type="text" inputMode="decimal" value={storagePriceEdit} onChange={e => setStoragePriceEdit(e.target.value.replace(/[^\d.]/g, ''))} style={inp} placeholder="0.07" />
                            </div>
                          </div>
                          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={handleSavePaymentSettings}
                            style={{ background: "linear-gradient(135deg, #4f8ef7, #2563eb)", border: "none", borderRadius: 14, padding: "13px 28px", color: "white", fontSize: 15, fontWeight: 600, cursor: "pointer", boxShadow: "0 4px 14px rgba(79,142,247,0.3)" }}>
                            💾 Сохранить реквизиты
                          </motion.button>
                        </div>

                        {/* Company List */}
                        <div style={{ background: "rgba(19,19,26,0.8)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 20, padding: "24px" }}>
                          <h3 style={{ fontSize: 16, fontWeight: 700, color: "#e8e8f0", marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
                            <span>🏢</span> Управление подписками компаний
                          </h3>
                          
                          {subLoading ? (
                            <div style={{ padding: "40px", textAlign: "center", color: "#55556a" }}>Загрузка данных...</div>
                          ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                              {allCompanies.map((co, i) => {
                                const isExpired = co.subscriptionEndsAt ? new Date(co.subscriptionEndsAt).getTime() < Date.now() : true;
                                const endDate = co.subscriptionEndsAt ? new Date(co.subscriptionEndsAt).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" }) : "Нет данных";
                                
                                return (
                                  <motion.div key={co.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                                    style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 16, padding: "16px 20px", display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
                                    
                                    <div style={{ flex: 1, minWidth: 200 }}>
                                      <div style={{ fontSize: 15, fontWeight: 700, color: "#f0f0fa", marginBottom: 4 }}>{co.name}</div>
                                      <div style={{ fontSize: 12, color: "#55556a" }}>📍 {cityLabel(co.cityId)}</div>
                                    </div>

                                    <div style={{ minWidth: 180 }}>
                                      <div style={{ fontSize: 10, color: "#55556a", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Статус подписки</div>
                                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: isExpired ? "#ef4444" : "#22c55e" }} />
                                        <span style={{ fontSize: 13, fontWeight: 600, color: isExpired ? "#f87171" : "#4ade80" }}>
                                          {isExpired ? "Истекла" : "Активна"}
                                        </span>
                                        <span style={{ fontSize: 12, color: "#44445a" }}>· до {endDate}</span>
                                      </div>
                                    </div>

                                    <div style={{ minWidth: 140 }}>
                                      <div style={{ fontSize: 10, color: "#55556a", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Хранилище</div>
                                      {(() => {
                                        const bytes = Number((co as any).usedStorageBytes) || 0;
                                        const gb = bytes / (1024 * 1024 * 1024);
                                        const pricePerGb = parseFloat(adminSettings.storage_price_per_gb || storagePriceEdit || "0.07");
                                        const cost = gb * pricePerGb;
                                        const sizeStr = bytes < 1024 ? bytes + ' B' : bytes < 1024*1024 ? (bytes/1024).toFixed(1) + ' KB' : bytes < 1024*1024*1024 ? (bytes/(1024*1024)).toFixed(1) + ' MB' : gb.toFixed(2) + ' GB';
                                        return (
                                          <div>
                                            <span style={{ fontSize: 14, fontWeight: 700, color: "#e0e0f0" }}>{sizeStr}</span>
                                            {bytes > 0 && <div style={{ fontSize: 11, color: "#fbbf24", marginTop: 2 }}>{cost.toFixed(2)} ₽</div>}
                                          </div>
                                        );
                                      })()}
                                    </div>

                                    <div style={{ display: "flex", gap: 8 }}>
                                      {extendingCompany === co.id ? (
                                        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(79,142,247,0.05)", padding: "4px 8px", borderRadius: 12, border: "1px solid rgba(79,142,247,0.15)" }}>
                                          <select value={extensionMonths} onChange={e => setExtensionMonths(parseInt(e.target.value))}
                                            style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "6px 10px", fontSize: 12, color: "white", outline: "none" }}>
                                            <option value={1}>1 месяц</option>
                                            <option value={3}>3 месяца</option>
                                            <option value={6}>6 месяцев</option>
                                            <option value={12}>1 год</option>
                                            <option value={36}>3 года</option>
                                            <option value={120}>10 лет</option>
                                          </select>
                                          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                            onClick={() => handleExtendSubscription(co.id, extensionMonths)}
                                            style={{ background: "#4f8ef7", border: "none", borderRadius: 8, padding: "7px 14px", color: "white", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                                            OK
                                          </motion.button>
                                          <button onClick={() => setExtendingCompany(null)} style={{ background: "none", border: "none", color: "#55556a", cursor: "pointer", fontSize: 18 }}>×</button>
                                        </div>
                                      ) : (
                                        <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                                          onClick={() => { setExtendingCompany(co.id); setExtensionMonths(1); }}
                                          style={{ background: "rgba(79,142,247,0.1)", border: "1px solid rgba(79,142,247,0.25)", borderRadius: 10, padding: "8px 16px", color: "#4f8ef7", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                                          ➕ Продлить
                                        </motion.button>
                                      )}
                                    </div>
                                  </motion.div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    )}


                  {/* === УПРАВЛЕНИЕ === */}
                {tab === "users" && (

                  <div style={{ display: isMobile ? "flex" : "grid", flexDirection: "column", gridTemplateColumns: selectedUser ? "minmax(0,1fr) minmax(0,380px)" : "1fr", gap: 16, minWidth: 0 }}>
                  <div>
                    <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
                      <div style={{ flex: 1, position: "relative" }}>
                        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: "#55556a" }}>🔍</span>
                        <input type="text" placeholder="Поиск..." value={search} onChange={e => setSearch(e.target.value)} style={{ ...inp, paddingLeft: 36, fontSize: 13 }} />
                      </div>
                      <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={openCreate}
                        style={{ background: "linear-gradient(135deg, #e63946, #c1121f)", border: "none", borderRadius: 14, padding: "13px 30px", fontSize: 15, fontWeight: 600, color: "white", cursor: "pointer", boxShadow: "0 4px 14px rgba(230,57,70,0.3)", display: "flex", alignItems: "center", gap: 8, flexShrink: 0, whiteSpace: "nowrap" as const }}>
                        <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> Добавить
                      </motion.button>
                    </div>

                    <p style={{ fontSize: 11, color: "#44444e", marginBottom: 10 }}>💡 Дважды нажмите на сотрудника, чтобы увидеть логин и пароль</p>

                    {filteredUsers.length === 0 ? (
                      <div style={{ background: "rgba(19,19,26,0.6)", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 18, padding: "48px", textAlign: "center", color: "#55556a" }}>
                        <div style={{ fontSize: 40, marginBottom: 12 }}>👥</div>
                        <div style={{ fontSize: 15, marginBottom: 8 }}>{search ? "Не найдено" : "Нет сотрудников"}</div>
                        <div style={{ fontSize: 13 }}>{search ? "Попробуйте другой запрос" : "Нажмите «Добавить»"}</div>
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {filteredUsers.map((u, i) => (
                          <motion.div key={u.id}
                            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                            onClick={() => setSelectedUser(selectedUser?.id === u.id ? null : u)}
                            onDoubleClick={() => handleDoubleClick(u)}
                            whileHover={{ x: 2 }}
                            style={{
                              background: selectedUser?.id === u.id ? "rgba(79,142,247,0.1)" : "rgba(19,19,26,0.85)",
                              border: selectedUser?.id === u.id ? "1px solid rgba(79,142,247,0.35)" : "1px solid rgba(255,255,255,0.05)",
                              borderRadius: 14, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", transition: "all 0.15s", userSelect: "none"
                            }}>
                            <div style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0, background: u.is_admin ? "linear-gradient(135deg, #e63946, #ff6b35)" : "linear-gradient(135deg, #4f8ef7, #2563eb)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, fontWeight: 700, color: "white" }}>
                              {u.name.charAt(0).toUpperCase()}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <span style={{ fontSize: 14, fontWeight: 600, color: "#e8e8f0" }}>{u.name}</span>
                                {u.is_admin && <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 5, background: "rgba(230,57,70,0.15)", color: "#e63946", fontWeight: 700, border: "1px solid rgba(230,57,70,0.2)" }}>ADMIN</span>}
                              </div>
                              <div style={{ fontSize: 11, color: "#6b6b80", marginTop: 1 }}>{u.role}{u.profession ? ` · ${u.profession}` : ""}</div>
                              <div style={{ display: "flex", gap: 3, marginTop: 4, flexWrap: "wrap" }}>
                                {u.allowedSections.slice(0, 4).map(s => (
                                  <span key={s} style={{ fontSize: 9, padding: "2px 5px", borderRadius: 4, background: "rgba(79,142,247,0.1)", color: "#6899d4" }}>{SECTION_ICONS[s]} {SECTION_LABELS[s]}</span>
                                ))}
                                {u.allowedSections.length > 4 && <span style={{ fontSize: 9, color: "#55556a" }}>+{u.allowedSections.length - 4}</span>}
                                {u.allowedSections.length === 0 && <span style={{ fontSize: 9, color: "#e63946" }}>Нет доступа</span>}
                              </div>
                            </div>
                            <span style={{ fontSize: 16, color: selectedUser?.id === u.id ? "#4f8ef7" : "#33333d", flexShrink: 0 }}>{selectedUser?.id === u.id ? "✕" : "›"}</span>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>

                    {/* Карточка сотрудника */}
                    <AnimatePresence>
                      {selectedUser && (
                        <motion.div key={selectedUser.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.25 }}
                          style={{ background: "rgba(19,19,26,0.95)", border: "1px solid rgba(79,142,247,0.2)", borderRadius: 22, padding: "0", alignSelf: "start", overflow: "hidden", maxHeight: isMobile ? "unset" : "calc(100vh - 120px)", overflowY: "auto" }}>

                          {/* Шапка карточки */}
                          <div style={{ background: "linear-gradient(135deg, rgba(79,142,247,0.08), rgba(37,99,235,0.04))", borderBottom: "1px solid rgba(79,142,247,0.12)", padding: "22px 22px 18px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                              <div style={{ width: 56, height: 56, borderRadius: 18, flexShrink: 0, background: selectedUser.is_admin ? "linear-gradient(135deg, #e63946, #ff6b35)" : "linear-gradient(135deg, #4f8ef7, #2563eb)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 700, color: "white", boxShadow: selectedUser.is_admin ? "0 4px 16px rgba(230,57,70,0.3)" : "0 4px 16px rgba(79,142,247,0.3)" }}>
                                {selectedUser.name.charAt(0).toUpperCase()}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                  <span style={{ fontSize: 17, fontWeight: 700, color: "#e8e8f0" }}>{selectedUser.name}</span>
                                  {selectedUser.is_admin && <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 6, background: "rgba(230,57,70,0.2)", color: "#e63946", fontWeight: 700, border: "1px solid rgba(230,57,70,0.3)", letterSpacing: "0.06em" }}>ADMIN</span>}
                                </div>
                                <div style={{ fontSize: 12, color: "#7878a0", marginTop: 3 }}>{selectedUser.role}{selectedUser.profession ? ` · ${selectedUser.profession}` : ""}</div>
                                <div style={{ fontSize: 11, color: "#55556a", marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
                                  <span style={{ color: "#44444e" }}>@</span>
                                  <span style={{ color: "#6b6b90", fontFamily: "monospace" }}>{selectedUser.login}</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Тело карточки */}
                          <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 0 }}>

                            {/* Секция: Доступные секции */}
                            <div style={{ paddingBottom: 18, marginBottom: 18, borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                              <div style={{ fontSize: 10, color: "#55556a", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700, marginBottom: 10 }}>Доступные секции</div>
                              {selectedUser.allowedSections.length === 0 ? (
                                <span style={{ fontSize: 12, color: "#e63946" }}>Нет доступа</span>
                              ) : (
                                <div className="grid-cols-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                                  {selectedUser.allowedSections.map(s => (
                                    <div key={s} style={{ fontSize: 11, padding: "7px 10px", borderRadius: 9, background: "rgba(79,142,247,0.07)", border: "1px solid rgba(79,142,247,0.14)", color: "#7aaef7", display: "flex", alignItems: "center", gap: 5 }}>
                                      <span style={{ fontSize: 13 }}>{SECTION_ICONS[s]}</span>
                                      <span style={{ lineHeight: 1.2 }}>{SECTION_LABELS[s]}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Секция: Города */}
                            {selectedUser.allowedCities.length > 0 && (
                              <div style={{ paddingBottom: 18, marginBottom: 18, borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                                <div style={{ fontSize: 10, color: "#55556a", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700, marginBottom: 10 }}>Города</div>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                  {selectedUser.allowedCities.map(cid => (
                                    <span key={cid} style={{ fontSize: 11, padding: "5px 11px", borderRadius: 8, background: "rgba(67,184,156,0.08)", border: "1px solid rgba(67,184,156,0.18)", color: "#43b89c", display: "flex", alignItems: "center", gap: 4 }}>
                                      <span>📍</span> {cityLabel(cid)}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Секция: Логины */}
                            <div style={{ paddingBottom: 18, marginBottom: 18, borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                                <div style={{ fontSize: 10, color: "#55556a", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                                  <span>🔑</span> Логины
                                  {userLogins.length > 0 && (
                                    <span style={{ fontSize: 10, padding: "1px 7px", borderRadius: 20, background: "rgba(79,142,247,0.12)", color: "#4f8ef7", fontWeight: 600 }}>{userLogins.length}</span>
                                  )}
                                </div>
                                <motion.button
                                  whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                                  onClick={() => { setShowLoginForm(v => !v); setLoginError(""); }}
                                  style={{ fontSize: 11, padding: "5px 12px", borderRadius: 8, border: showLoginForm ? "1px solid rgba(230,57,70,0.3)" : "1px solid rgba(79,142,247,0.3)", background: showLoginForm ? "rgba(230,57,70,0.08)" : "rgba(79,142,247,0.07)", color: showLoginForm ? "#e63946" : "#4f8ef7", cursor: "pointer", fontWeight: 600, transition: "all 0.15s" }}>
                                  {showLoginForm ? "✕ Отмена" : "+ Новый"}
                                </motion.button>
                              </div>

                              {/* Форма нового логина */}
                              <AnimatePresence>
                                {showLoginForm && (
                                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} style={{ overflow: "hidden", marginBottom: 12 }}>
                                    <div style={{ background: "rgba(79,142,247,0.04)", border: "1px solid rgba(79,142,247,0.18)", borderRadius: 14, padding: "16px", display: "flex", flexDirection: "column", gap: 10 }}>
                                      <div>
                                        <label style={{ fontSize: 10, color: "#55556a", display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.08em" }}>Метка <span style={{ color: "#44444e" }}>(необязательно)</span></label>
                                        <input type="text" placeholder="напр. Телефон 2, Рабочий..." value={newLogin.label} onChange={e => setNewLogin(f => ({ ...f, label: e.target.value }))} style={{ ...inp, fontSize: 12, padding: "9px 12px" }} />
                                      </div>
                                      <div>
                                        <label style={{ fontSize: 10, color: "#55556a", display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.08em" }}>Логин <span style={{ color: "#e63946" }}>*</span></label>
                                        <input type="text" placeholder="новый_логин" value={newLogin.login} onChange={e => { setNewLogin(f => ({ ...f, login: e.target.value })); setLoginError(""); }} style={{ ...inp, fontSize: 12, padding: "9px 12px" }} />
                                      </div>
                                      <div>
                                        <label style={{ fontSize: 10, color: "#55556a", display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.08em" }}>Пароль <span style={{ color: "#e63946" }}>*</span></label>
                                        <input type="text" placeholder="пароль" value={newLogin.password} onChange={e => { setNewLogin(f => ({ ...f, password: e.target.value })); setLoginError(""); }} style={{ ...inp, fontSize: 12, padding: "9px 12px" }} />
                                      </div>
                                      {loginError && <p style={{ fontSize: 11, color: "#e63946", margin: 0 }}>⚠️ {loginError}</p>}
                                      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={handleAddLogin}
                                        style={{ width: "100%", background: "linear-gradient(135deg, #4f8ef7, #2563eb)", border: "none", borderRadius: 10, padding: "11px", fontSize: 12, fontWeight: 700, color: "white", cursor: "pointer", boxShadow: "0 3px 12px rgba(79,142,247,0.25)" }}>
                                        Создать логин
                                      </motion.button>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>

                              {/* Список логинов */}
                              {loginsLoading ? (
                                <div style={{ fontSize: 11, color: "#55556a", padding: "10px 0", textAlign: "center" }}>Загрузка...</div>
                              ) : userLogins.length === 0 ? (
                                <div style={{ fontSize: 12, color: "#44444e", padding: "12px 16px", borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.07)", textAlign: "center" }}>
                                  Нет дополнительных логинов
                                </div>
                              ) : (
                                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                  {userLogins.map((ul, i) => (
                                    <motion.div key={ul.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                                      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(79,142,247,0.12)", borderRadius: 11, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                                      <div style={{ flex: 1, minWidth: 0 }}>
                                        {ul.label && <div style={{ fontSize: 10, color: "#6b6b80", marginBottom: 4, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{ul.label}</div>}
                                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                          <span style={{ fontSize: 13, fontWeight: 700, color: "#4f8ef7", fontFamily: "monospace" }}>{ul.login}</span>
                                          <span style={{ fontSize: 9, color: "#33333d" }}>|</span>
                                          <span
                                            onClick={() => setRevealedLogins(r => ({ ...r, [ul.id]: !r[ul.id] }))}
                                            style={{ fontSize: 12, color: revealedLogins[ul.id] ? "#4ade80" : "#55556a", fontFamily: "monospace", cursor: "pointer", userSelect: "none", background: revealedLogins[ul.id] ? "rgba(74,222,128,0.08)" : "rgba(255,255,255,0.04)", padding: "2px 8px", borderRadius: 6, border: "1px solid " + (revealedLogins[ul.id] ? "rgba(74,222,128,0.2)" : "rgba(255,255,255,0.07)"), transition: "all 0.15s" }}>
                                            {revealedLogins[ul.id] ? ul.plain_password : "••••••"}
                                          </span>
                                        </div>
                                      </div>
                                      <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                                        onClick={() => handleDeleteLogin(ul.id)}
                                        style={{ background: "rgba(230,57,70,0.07)", border: "1px solid rgba(230,57,70,0.18)", borderRadius: 8, padding: "6px 9px", fontSize: 13, color: "#e63946", cursor: "pointer", flexShrink: 0 }}>
                                        🗑️
                                      </motion.button>
                                    </motion.div>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Подсказка */}
                            <div style={{ marginBottom: 16, padding: "10px 14px", borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ fontSize: 14 }}>💡</span>
                              <div style={{ fontSize: 10, color: "#44444e", lineHeight: 1.4 }}>Дважды нажмите на имя в списке, чтобы увидеть основной пароль</div>
                            </div>

                            {/* Кнопки действий */}
                            <div style={{ display: "flex", gap: 8 }}>
                              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={() => openEdit(selectedUser)}
                                style={{ flex: 1, background: "rgba(79,142,247,0.1)", border: "1px solid rgba(79,142,247,0.22)", borderRadius: 12, padding: "11px", fontSize: 13, color: "#4f8ef7", cursor: "pointer", fontWeight: 600 }}>
                                ✏️ Изменить
                              </motion.button>
                              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={() => setDeleteConfirm(selectedUser.id)}
                                style={{ background: "rgba(230,57,70,0.07)", border: "1px solid rgba(230,57,70,0.18)", borderRadius: 12, padding: "11px 16px", fontSize: 13, color: "#e63946", cursor: "pointer" }}>
                                🗑️
                              </motion.button>
                            </div>

                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                </div>
              )}

                {/* === ЛОГИНЫ И ПАРОЛИ === */}
                {tab === "logins" && (
                  <div>
                    {/* Header */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
                      <div>
                        <h2 style={{ fontSize: 18, fontWeight: 700, color: "#e8e8f0", margin: 0 }}>Логины и пароли</h2>
                        <p style={{ fontSize: 12, color: "#55556a", marginTop: 4 }}>Все учётные записи сотрудников</p>
                      </div>
                      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", width: "100%" }}>
                        <div style={{ position: "relative", flex: "1 1 220px", minWidth: 180 }}>
                          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: "#55556a" }}>🔍</span>
                          <input type="text" placeholder="Поиск сотрудника..." value={loginsTabSearch} onChange={e => setLoginsTabSearch(e.target.value)}
                            style={{ ...inp, paddingLeft: 36, fontSize: 13, width: "100%" }} />
                        </div>
                        <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={loadAllCreds}
                          style={{ background: "rgba(79,142,247,0.1)", border: "1px solid rgba(79,142,247,0.22)", borderRadius: 11, padding: "10px 16px", fontSize: 12, color: "#4f8ef7", cursor: "pointer", fontWeight: 600, flexShrink: 0 }}>
                          ↻ Обновить
                        </motion.button>
                        <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                          onClick={() => { setFormError(""); setShowForm(true); setSelectedUser(null); }}
                          style={{ background: "linear-gradient(135deg, #4f8ef7 0%, #6c5ce7 100%)", border: "none", borderRadius: 14, padding: "13px 24px", fontSize: 14, color: "#fff", cursor: "pointer", fontWeight: 700, display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap" as const, flexShrink: 0 }}>
                          <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> Добавить сотрудника
                        </motion.button>
                      </div>
                    </div>

                    {allCredsLoading ? (
                      <div style={{ padding: "60px", textAlign: "center", color: "#55556a", fontSize: 14 }}>Загрузка...</div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {allCreds
                          .filter(c => c.user.name.toLowerCase().includes(loginsTabSearch.toLowerCase()) || c.user.login.toLowerCase().includes(loginsTabSearch.toLowerCase()))
                          .map((c, i) => (
                          <motion.div key={c.user.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                            style={{ background: "rgba(19,19,26,0.9)", border: expandedUser === c.user.id ? "1px solid rgba(79,142,247,0.3)" : "1px solid rgba(255,255,255,0.06)", borderRadius: 18, overflow: "hidden", transition: "border-color 0.2s" }}>

                            {/* Строка сотрудника */}
                            <div
                              onClick={() => setExpandedUser(expandedUser === c.user.id ? null : c.user.id)}
                              style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 14, cursor: "pointer" }}
                            >
                              {/* Аватар */}
                              <div style={{ width: 44, height: 44, borderRadius: 14, flexShrink: 0, background: c.user.is_admin ? "linear-gradient(135deg,#e63946,#ff6b35)" : "linear-gradient(135deg,#4f8ef7,#2563eb)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19, fontWeight: 700, color: "white" }}>
                                {c.user.name.charAt(0).toUpperCase()}
                              </div>

                              {/* Имя + роль */}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                  <span style={{ fontSize: 15, fontWeight: 700, color: "#e8e8f0" }}>{c.user.name}</span>
                                  {c.user.is_admin && <span style={{ fontSize: 9, padding: "2px 7px", borderRadius: 5, background: "rgba(230,57,70,0.15)", color: "#e63946", fontWeight: 700, border: "1px solid rgba(230,57,70,0.25)" }}>ADMIN</span>}
                                  {c.extraLogins.length > 0 && (
                                    <span style={{ fontSize: 9, padding: "2px 7px", borderRadius: 5, background: "rgba(79,142,247,0.12)", color: "#4f8ef7", fontWeight: 600, border: "1px solid rgba(79,142,247,0.22)" }}>+{c.extraLogins.length} логин{c.extraLogins.length > 1 ? "а" : ""}</span>
                                  )}
                                </div>
                                <div style={{ fontSize: 11, color: "#6b6b80", marginTop: 2 }}>{c.user.role}{c.user.profession ? ` · ${c.user.profession}` : ""}</div>
                              </div>

                              {/* Основной логин — всегда виден */}
                              <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                                <div style={{ textAlign: "right" }}>
                                  <div style={{ fontSize: 12, fontFamily: "monospace", color: "#4f8ef7", fontWeight: 700 }}>{c.user.login}</div>
                                  <div
                                    onClick={e => { e.stopPropagation(); setAllCredsRevealed(r => ({ ...r, [c.user.id]: !r[c.user.id] })); }}
                                    style={{ fontSize: 11, fontFamily: "monospace", color: allCredsRevealed[c.user.id] ? "#4ade80" : "#55556a", cursor: "pointer", background: allCredsRevealed[c.user.id] ? "rgba(74,222,128,0.08)" : "rgba(255,255,255,0.04)", padding: "2px 8px", borderRadius: 6, border: "1px solid " + (allCredsRevealed[c.user.id] ? "rgba(74,222,128,0.2)" : "rgba(255,255,255,0.07)"), marginTop: 3, transition: "all 0.15s", display: "inline-block" }}>
                                    {allCredsRevealed[c.user.id] ? (c.plain_password || "—") : "••••••"}
                                  </div>
                                </div>
                                <span style={{ fontSize: 16, color: expandedUser === c.user.id ? "#4f8ef7" : "#33333d", transition: "transform 0.2s", display: "inline-block", transform: expandedUser === c.user.id ? "rotate(90deg)" : "rotate(0deg)" }}>›</span>
                              </div>
                            </div>

                            {/* Раскрытая панель: доп логины */}
                            <AnimatePresence>
                              {expandedUser === c.user.id && (
                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: "hidden" }}>
                                  <div style={{ borderTop: "1px solid rgba(79,142,247,0.12)", padding: "16px 20px 20px", background: "rgba(79,142,247,0.03)" }}>

                                    {/* Заголовок доп логинов */}
                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                                      <span style={{ fontSize: 11, color: "#55556a", textTransform: "uppercase", letterSpacing: "0.09em", fontWeight: 700 }}>Дополнительные логины</span>
                                      <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                                        onClick={() => { setAddLoginForUser(addLoginForUser === c.user.id ? null : c.user.id); setNewTabLogin({ login: "", password: "", label: "" }); setTabLoginError(""); }}
                                        style={{ fontSize: 11, padding: "5px 12px", borderRadius: 8, border: addLoginForUser === c.user.id ? "1px solid rgba(230,57,70,0.3)" : "1px solid rgba(79,142,247,0.3)", background: addLoginForUser === c.user.id ? "rgba(230,57,70,0.08)" : "rgba(79,142,247,0.07)", color: addLoginForUser === c.user.id ? "#e63946" : "#4f8ef7", cursor: "pointer", fontWeight: 600 }}>
                                        {addLoginForUser === c.user.id ? "✕ Отмена" : "+ Новый логин"}
                                      </motion.button>
                                    </div>

                                    {/* Форма нового логина */}
                                    <AnimatePresence>
                                      {addLoginForUser === c.user.id && (
                                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} style={{ overflow: "hidden", marginBottom: 12 }}>
                                          <div style={{ background: "rgba(79,142,247,0.05)", border: "1px solid rgba(79,142,247,0.2)", borderRadius: 14, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
                                            <div className="grid-cols-3" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                                              <div>
                                                <label style={{ fontSize: 10, color: "#55556a", display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.08em" }}>Метка</label>
                                                <input type="text" placeholder="напр. Рабочий" value={newTabLogin.label} onChange={e => setNewTabLogin(f => ({ ...f, label: e.target.value }))} style={{ ...inp, fontSize: 12, padding: "9px 11px" }} />
                                              </div>
                                              <div>
                                                <label style={{ fontSize: 10, color: "#55556a", display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.08em" }}>Логин *</label>
                                                <input type="text" placeholder="логин" value={newTabLogin.login} onChange={e => { setNewTabLogin(f => ({ ...f, login: e.target.value })); setTabLoginError(""); }} style={{ ...inp, fontSize: 12, padding: "9px 11px" }} />
                                              </div>
                                              <div>
                                                <label style={{ fontSize: 10, color: "#55556a", display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.08em" }}>Пароль *</label>
                                                <input type="text" placeholder="пароль" value={newTabLogin.password} onChange={e => { setNewTabLogin(f => ({ ...f, password: e.target.value })); setTabLoginError(""); }} style={{ ...inp, fontSize: 12, padding: "9px 11px" }} />
                                              </div>
                                            </div>
                                            {tabLoginError && <p style={{ fontSize: 11, color: "#e63946", margin: 0 }}>⚠️ {tabLoginError}</p>}
                                            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={() => handleTabAddLogin(c.user.id)}
                                              style={{ background: "linear-gradient(135deg,#4f8ef7,#2563eb)", border: "none", borderRadius: 10, padding: "10px", fontSize: 12, fontWeight: 700, color: "white", cursor: "pointer", boxShadow: "0 3px 12px rgba(79,142,247,0.25)" }}>
                                              Создать логин
                                            </motion.button>
                                          </div>
                                        </motion.div>
                                      )}
                                    </AnimatePresence>

                                    {/* Список доп логинов */}
                                    {c.extraLogins.length === 0 ? (
                                      <div style={{ fontSize: 12, color: "#44444e", padding: "10px 14px", borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.07)", textAlign: "center" }}>
                                        Нет дополнительных логинов
                                      </div>
                                    ) : (
                                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                        {c.extraLogins.map((ul, li) => (
                                          <motion.div key={ul.id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: li * 0.05 }}
                                            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(79,142,247,0.12)", borderRadius: 12, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                                            {ul.label && (
                                              <span style={{ fontSize: 10, padding: "3px 8px", borderRadius: 6, background: "rgba(255,255,255,0.05)", color: "#6b6b80", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", flexShrink: 0 }}>
                                                {ul.label}
                                              </span>
                                            )}
                                            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", minWidth: 0 }}>
                                              <span style={{ fontSize: 13, fontWeight: 700, color: "#4f8ef7", fontFamily: "monospace" }}>{ul.login}</span>
                                              <span style={{ fontSize: 11, color: "#33333d" }}>|</span>
                                              <span
                                                onClick={() => setAllExtraRevealed(r => ({ ...r, [ul.id]: !r[ul.id] }))}
                                                style={{ fontSize: 12, fontFamily: "monospace", color: allExtraRevealed[ul.id] ? "#4ade80" : "#55556a", cursor: "pointer", background: allExtraRevealed[ul.id] ? "rgba(74,222,128,0.08)" : "rgba(255,255,255,0.04)", padding: "2px 9px", borderRadius: 6, border: "1px solid " + (allExtraRevealed[ul.id] ? "rgba(74,222,128,0.2)" : "rgba(255,255,255,0.07)"), transition: "all 0.15s" }}>
                                                {allExtraRevealed[ul.id] ? ul.plain_password : "••••••"}
                                              </span>
                                            </div>
                                            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => handleTabDeleteLogin(ul.id)}
                                              style={{ background: "rgba(230,57,70,0.07)", border: "1px solid rgba(230,57,70,0.18)", borderRadius: 8, padding: "6px 10px", fontSize: 13, color: "#e63946", cursor: "pointer", flexShrink: 0 }}>
                                              🗑️
                                            </motion.button>
                                          </motion.div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                  {/* === КОМПАНИИ === */}
                  {tab === "companies" && (
                  <div style={{ display: "grid", gridTemplateColumns: selectedCompany ? "minmax(300px,1fr) minmax(280px,400px)" : "1fr", gap: 20 }}>

                    {/* Левая колонка — список */}
                    <div>
                      {/* Заголовок + кнопка добавить */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, paddingBottom: 16, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                        <div>
                          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#e8e8f0", margin: 0 }}>Компании</h2>
                          <p style={{ fontSize: 12, color: "#55556a", marginTop: 4 }}>
                            {filteredCompanies.length} {filteredCompanies.length === 1 ? "компания" : "компаний"} · {cityLabel(selectedCity)}
                          </p>
                        </div>
                        <motion.button
                          whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                          onClick={() => { setSelectedCompany(null); }}
                          style={{ background: "linear-gradient(135deg, #4f8ef7, #2563eb)", border: "none", borderRadius: 12, padding: "10px 18px", fontSize: 13, fontWeight: 600, color: "white", cursor: "pointer", boxShadow: "0 4px 14px rgba(79,142,247,0.3)", display: "flex", alignItems: "center", gap: 6 }}>
                          🏢 Управление
                        </motion.button>
                      </div>

                      {/* Фильтр по городам */}
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
                        <button onClick={() => { setSelectedCity(""); setSelectedCompany(null); }}
                          style={{ padding: "7px 14px", borderRadius: 20, fontSize: 12, cursor: "pointer", border: "none", fontWeight: !selectedCity ? 600 : 400, background: !selectedCity ? "rgba(79,142,247,0.2)" : "rgba(255,255,255,0.04)", color: !selectedCity ? "#4f8ef7" : "#6b6b80", transition: "all 0.15s" }}>
                          Все города
                        </button>
                        {allCities.map(c => (
                          <button key={c.id} onClick={() => { setSelectedCity(c.id); setSelectedCompany(null); }}
                            style={{ padding: "7px 14px", borderRadius: 20, fontSize: 12, cursor: "pointer", border: "none", fontWeight: selectedCity === c.id ? 600 : 400, background: selectedCity === c.id ? "rgba(79,142,247,0.2)" : "rgba(255,255,255,0.04)", color: selectedCity === c.id ? "#4f8ef7" : "#6b6b80", transition: "all 0.15s" }}>
                            📍 {c.label} <span style={{ fontSize: 10, opacity: 0.7 }}>({companies.filter(co => co.cityId === c.id).length})</span>
                          </button>
                        ))}
                      </div>

                      {/* Поиск */}
                      <div style={{ position: "relative", marginBottom: 16 }}>
                        <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: "#55556a" }}>🔍</span>
                        <input type="text" placeholder="Поиск по названию..." value={companySearch} onChange={e => setCompanySearch(e.target.value)}
                          style={{ ...inp, paddingLeft: 42, fontSize: 13, borderRadius: 14 }} />
                      </div>

                        {/* Форма добавления */}
                        <div style={{ background: "rgba(79,142,247,0.04)", border: "1px solid rgba(79,142,247,0.12)", borderRadius: 20, padding: "20px 22px", marginBottom: 20 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                            <div style={{ width: 32, height: 32, borderRadius: 10, background: "rgba(79,142,247,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>🏢</div>
                            <div>
                              <div style={{ fontSize: 14, fontWeight: 700, color: "#e0e0f0" }}>Новая компания</div>
                              <div style={{ fontSize: 11, color: "#55556a" }}>Заполните данные объекта</div>
                            </div>
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                            <div>
                              <label style={{ fontSize: 10, color: "#55556a", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, display: "block", marginBottom: 6 }}>Город</label>
                              <select value={selectedCity} onChange={e => setSelectedCity(e.target.value)}
                                style={{ ...inp, color: selectedCity ? "#e0e0f0" : "#6b6b80" }}>
                                <option value="">— Выберите —</option>
                                {allCities.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                              </select>
                            </div>
                            <div>
                              <label style={{ fontSize: 10, color: "#55556a", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, display: "block", marginBottom: 6 }}>Название</label>
                              <input type="text" value={newCoName} onChange={e => { setNewCoName(e.target.value); setCoError(""); }}
                                onKeyDown={e => e.key === "Enter" && handleAddCompany()}
                                placeholder="ЧОП «Безопасность»" style={{ ...inp }} />
                            </div>
                          </div>
                          <div style={{ marginBottom: 14 }}>
                            <label style={{ fontSize: 10, color: "#55556a", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, display: "block", marginBottom: 6 }}>Описание</label>
                            <input type="text" value={newCoDesc} onChange={e => setNewCoDesc(e.target.value)}
                              onKeyDown={e => e.key === "Enter" && handleAddCompany()}
                              placeholder="Адрес, контакты, примечания..." style={{ ...inp }} />
                          </div>
                          {coError && <div style={{ fontSize: 13, color: "#e63946", marginBottom: 12, padding: "10px 14px", background: "rgba(230,57,70,0.08)", borderRadius: 12, border: "1px solid rgba(230,57,70,0.15)" }}>⚠️ {coError}</div>}
                          <motion.button onClick={handleAddCompany} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                            style={{ background: "linear-gradient(135deg, #4f8ef7, #2563eb)", border: "none", borderRadius: 14, padding: "13px 28px", fontSize: 15, fontWeight: 600, color: "white", cursor: "pointer", boxShadow: "0 4px 14px rgba(79,142,247,0.3)", display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> Добавить компанию
                          </motion.button>
                        </div>

                      {/* Список компаний */}
                      {filteredCompanies.length === 0 ? (
                        <div style={{ background: "rgba(19,19,26,0.4)", border: "1px dashed rgba(255,255,255,0.08)", borderRadius: 16, padding: "48px", textAlign: "center", color: "#55556a" }}>
                          <div style={{ fontSize: 40, marginBottom: 12 }}>🏢</div>
                          <div style={{ fontSize: 15, marginBottom: 6 }}>{companySearch ? "Не найдено" : "Нет компаний"}</div>
                          <div style={{ fontSize: 12 }}>{companySearch ? "Попробуйте другой запрос" : "Добавьте первую компанию выше"}</div>
                        </div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {filteredCompanies.map((co, i) => {
                            const staffCount = users.filter(u => u.allowedCompanies?.includes(co.id)).length;
                            const isSelected = selectedCompany?.id === co.id;
                            return (
                              <motion.div key={co.id}
                                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                                onClick={() => setSelectedCompany(isSelected ? null : co)}
                                whileHover={{ x: 2 }}
                                style={{ background: isSelected ? "rgba(79,142,247,0.09)" : "rgba(19,19,26,0.85)", border: isSelected ? "1px solid rgba(79,142,247,0.35)" : "1px solid rgba(255,255,255,0.05)", borderRadius: 16, padding: "14px 18px", display: "flex", alignItems: "center", gap: 14, cursor: "pointer", transition: "all 0.15s" }}>

                                {/* Иконка */}
                                <div style={{ width: 46, height: 46, borderRadius: 14, flexShrink: 0, background: isSelected ? "rgba(79,142,247,0.2)" : "rgba(79,142,247,0.1)", border: isSelected ? "1px solid rgba(79,142,247,0.35)" : "1px solid rgba(79,142,247,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, transition: "all 0.15s" }}>
                                  🏢
                                </div>

                                {/* Инфо */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: 14, fontWeight: 600, color: "#e8e8f0", marginBottom: 4 }}>{co.name}</div>
                                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                    <span style={{ fontSize: 11, color: "#55556a" }}>📍 {cityLabel(co.cityId)}</span>
                                    {staffCount > 0 && (
                                      <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 6, background: "rgba(67,184,156,0.1)", color: "#43b89c", border: "1px solid rgba(67,184,156,0.2)", fontWeight: 600 }}>
                                        👤 {staffCount} сотр.
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Стрелка */}
                                <span style={{ fontSize: 16, color: isSelected ? "#4f8ef7" : "#33333d", transition: "all 0.15s", transform: isSelected ? "rotate(90deg)" : "none", display: "inline-block" }}>›</span>
                              </motion.div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Правая колонка — карточка компании */}
                    <AnimatePresence>
                      {selectedCompany && (
                        <motion.div key={selectedCompany.id}
                          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.25 }}
                          style={{ background: "rgba(19,19,26,0.95)", border: "1px solid rgba(79,142,247,0.2)", borderRadius: 22, overflow: "hidden", position: "sticky", top: 80, alignSelf: "start" }}>

                          {/* Шапка */}
                          <div style={{ background: "linear-gradient(135deg, rgba(79,142,247,0.08), rgba(37,99,235,0.04))", borderBottom: "1px solid rgba(79,142,247,0.12)", padding: "22px 22px 18px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                              <div style={{ width: 56, height: 56, borderRadius: 18, flexShrink: 0, background: "linear-gradient(135deg, #4f8ef7, #2563eb)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, boxShadow: "0 4px 16px rgba(79,142,247,0.3)" }}>
                                🏢
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 17, fontWeight: 700, color: "#e8e8f0", marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selectedCompany.name}</div>
                                <div style={{ fontSize: 12, color: "#7878a0", display: "flex", alignItems: "center", gap: 6 }}>
                                  <span>📍</span> {cityLabel(selectedCompany.cityId)}
                                </div>
                              </div>
                              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                                onClick={() => setSelectedCompany(null)}
                                style={{ width: 32, height: 32, borderRadius: 9, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", color: "#55556a", cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                ✕
                              </motion.button>
                            </div>
                          </div>

                          {/* Тело */}
                          <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 0 }}>

                            {/* Статистика */}
                            <div style={{ paddingBottom: 18, marginBottom: 18, borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                              <div style={{ fontSize: 10, color: "#55556a", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700, marginBottom: 12 }}>Статистика</div>
                              <div className="grid-cols-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                                {[
                                  { label: "Сотрудников", value: users.filter(u => u.allowedCompanies?.includes(selectedCompany.id)).length, icon: "👤", color: "#4f8ef7" },
                                  { label: "Всего секций", value: users.filter(u => u.allowedCompanies?.includes(selectedCompany.id)).flatMap(u => u.allowedSections).filter((v, i, a) => a.indexOf(v) === i).length, icon: "📋", color: "#43b89c" },
                                ].map(stat => (
                                  <div key={stat.label} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "12px 14px" }}>
                                    <div style={{ fontSize: 10, color: "#55556a", marginBottom: 6 }}>{stat.label}</div>
                                    <div style={{ fontSize: 22, fontWeight: 700, color: stat.color }}>{stat.value}</div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Сотрудники компании */}
                            {(() => {
                              const coUsers = users.filter(u => u.allowedCompanies?.includes(selectedCompany.id));
                              return coUsers.length > 0 ? (
                                <div style={{ paddingBottom: 18, marginBottom: 18, borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                                  <div style={{ fontSize: 10, color: "#55556a", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700, marginBottom: 12 }}>Сотрудники</div>
                                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                    {coUsers.slice(0, 5).map(u => (
                                      <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                                        <div style={{ width: 32, height: 32, borderRadius: 9, flexShrink: 0, background: u.is_admin ? "linear-gradient(135deg,#e63946,#ff6b35)" : "linear-gradient(135deg,#4f8ef7,#2563eb)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "white" }}>
                                          {u.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                          <div style={{ fontSize: 13, fontWeight: 600, color: "#e8e8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.name}</div>
                                          <div style={{ fontSize: 10, color: "#55556a" }}>{u.role}</div>
                                        </div>
                                        {u.is_admin && <span style={{ fontSize: 8, padding: "2px 6px", borderRadius: 4, background: "rgba(230,57,70,0.15)", color: "#e63946", fontWeight: 700, border: "1px solid rgba(230,57,70,0.25)" }}>ADMIN</span>}
                                      </div>
                                    ))}
                                    {coUsers.length > 5 && (
                                      <div style={{ fontSize: 11, color: "#55556a", textAlign: "center", padding: "6px 0" }}>+{coUsers.length - 5} ещё</div>
                                    )}
                                  </div>
                                </div>
                              ) : null;
                            })()}

                            {/* Редактирование */}
                            {editingCompany?.id === selectedCompany.id ? (
                              <div style={{ paddingBottom: 18, marginBottom: 18, borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                                <div style={{ fontSize: 10, color: "#55556a", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700, marginBottom: 12 }}>Редактирование</div>
                                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                  <div>
                                    <label style={{ fontSize: 10, color: "#55556a", display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.08em" }}>Название *</label>
                                    <input type="text" value={editCoForm.name} onChange={e => { setEditCoForm(f => ({ ...f, name: e.target.value })); setEditCoError(""); }}
                                      style={{ ...inp, fontSize: 13 }} />
                                  </div>
                                  <div>
                                    <label style={{ fontSize: 10, color: "#55556a", display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.08em" }}>Описание</label>
                                    <input type="text" value={editCoForm.description} onChange={e => setEditCoForm(f => ({ ...f, description: e.target.value }))}
                                      placeholder="Необязательно..." style={{ ...inp, fontSize: 13 }} />
                                  </div>
                                  {editCoError && <p style={{ fontSize: 11, color: "#e63946", margin: 0 }}>⚠️ {editCoError}</p>}
                                  <div style={{ display: "flex", gap: 8 }}>
                                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={handleEditCompany}
                                      style={{ flex: 1, background: "linear-gradient(135deg,#4f8ef7,#2563eb)", border: "none", borderRadius: 11, padding: "11px", fontSize: 13, fontWeight: 600, color: "white", cursor: "pointer" }}>
                                      Сохранить
                                    </motion.button>
                                    <button onClick={() => { setEditingCompany(null); setEditCoError(""); }}
                                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 11, padding: "11px 16px", fontSize: 13, color: "#6b6b80", cursor: "pointer" }}>
                                      Отмена
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ) : null}

                            {/* Подтверждение удаления */}
                            {deleteCoConfirm === selectedCompany.id ? (
                              <div style={{ padding: "14px 16px", borderRadius: 14, background: "rgba(230,57,70,0.06)", border: "1px solid rgba(230,57,70,0.2)", marginBottom: 14 }}>
                                <div style={{ fontSize: 13, color: "#f87171", fontWeight: 600, marginBottom: 10 }}>Удалить компанию «{selectedCompany.name}»?</div>
                                <div style={{ fontSize: 11, color: "#55556a", marginBottom: 12 }}>Это действие нельзя отменить. Данные всех разделов по компании будут недоступны.</div>
                                <div style={{ display: "flex", gap: 8 }}>
                                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={() => handleDeleteCompany(selectedCompany.id)}
                                    style={{ flex: 1, background: "rgba(230,57,70,0.15)", border: "1px solid rgba(230,57,70,0.3)", borderRadius: 10, padding: "10px", fontSize: 12, fontWeight: 700, color: "#e63946", cursor: "pointer" }}>
                                    Да, удалить
                                  </motion.button>
                                  <button onClick={() => setDeleteCoConfirm(null)}
                                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "10px 16px", fontSize: 12, color: "#6b6b80", cursor: "pointer" }}>
                                    Нет
                                  </button>
                                </div>
                              </div>
                            ) : null}

                            {/* Кнопки */}
                            {editingCompany?.id !== selectedCompany.id && deleteCoConfirm !== selectedCompany.id && (
                              <div style={{ display: "flex", gap: 8 }}>
                                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                                  onClick={() => { setEditingCompany(selectedCompany); setEditCoForm({ name: selectedCompany.name, description: "" }); setEditCoError(""); }}
                                  style={{ flex: 1, background: "rgba(79,142,247,0.1)", border: "1px solid rgba(79,142,247,0.22)", borderRadius: 12, padding: "11px", fontSize: 13, color: "#4f8ef7", cursor: "pointer", fontWeight: 600 }}>
                                  ✏️ Изменить
                                </motion.button>
                                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={() => setDeleteCoConfirm(selectedCompany.id)}
                                  style={{ background: "rgba(230,57,70,0.07)", border: "1px solid rgba(230,57,70,0.18)", borderRadius: 12, padding: "11px 16px", fontSize: 13, color: "#e63946", cursor: "pointer" }}>
                                  🗑️
                                </motion.button>
                              </div>
                            )}

                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                  </div>
                )}

              {/* === КАМЕРЫ === */}
              {tab === "cameras" && (
                <>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
                    <div>
                      <h2 style={{ fontSize: 17, fontWeight: 700 }}>Камеры видеонаблюдения</h2>
                      <p style={{ fontSize: 12, color: "#6b6b80", marginTop: 2 }}>Только администратор может добавлять и просматривать камеры</p>
                    </div>
                    <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={() => setShowCamForm(v => !v)}
                      style={{ background: "linear-gradient(135deg, #8e44ad, #6c3483)", border: "none", borderRadius: 14, padding: "13px 30px", fontSize: 15, fontWeight: 600, color: "white", cursor: "pointer", boxShadow: "0 4px 14px rgba(142,68,173,0.3)", whiteSpace: "nowrap" }}>
                      + Добавить камеру
                    </motion.button>
                  </div>

                  {/* Фильтры */}
                  <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
                    <select value={camCity} onChange={e => setCamCity(e.target.value)}
                      style={{ ...inp, width: "auto", fontSize: 12, padding: "8px 12px", cursor: "pointer" }}>
                      <option value="">Все города</option>
                      {allCities.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                    </select>
                    <select value={camCompany} onChange={e => setCamCompany(e.target.value)}
                      style={{ ...inp, width: "auto", fontSize: 12, padding: "8px 12px", cursor: "pointer" }}>
                      <option value="">Все компании</option>
                      {companies.filter(c => !camCity || c.cityId === camCity).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>

                  {/* Форма добавления */}
                  <AnimatePresence>
                    {showCamForm && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                        style={{ overflow: "hidden", marginBottom: 16 }}>
                        <div style={{ background: "rgba(142,68,173,0.06)", border: "1px solid rgba(142,68,173,0.2)", borderRadius: 16, padding: "18px" }}>
                          <div className="grid-cols-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                            <div>
                              <label style={{ display: "block", fontSize: 10, color: "#6b6b80", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.08em" }}>Название камеры</label>
                              <input type="text" value={camForm.name} onChange={e => setCamForm(f => ({ ...f, name: e.target.value }))} placeholder="Камера 1 — Въезд" style={inp} />
                            </div>
                            <div>
                              <label style={{ display: "block", fontSize: 10, color: "#6b6b80", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.08em" }}>Тип подключения</label>
                              <select value={camForm.type} onChange={e => setCamForm(f => ({ ...f, type: e.target.value }))} style={{ ...inp, cursor: "pointer" }}>
                                <option value="iframe">Веб-интерфейс (iframe)</option>
                                <option value="img">MJPEG поток (img)</option>
                                <option value="hls">HLS поток (.m3u8)</option>
                              </select>
                            </div>
                          </div>
                          <div style={{ marginBottom: 12 }}>
                            <label style={{ display: "block", fontSize: 10, color: "#6b6b80", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.08em" }}>URL камеры / веб-интерфейса</label>
                            <input type="text" value={camForm.url} onChange={e => setCamForm(f => ({ ...f, url: e.target.value }))} placeholder="http://192.168.1.100 или https://..." style={inp} />
                          </div>
                          {camError && <p style={{ fontSize: 12, color: "#e63946", marginBottom: 10 }}>{camError}</p>}
                          <div style={{ display: "flex", gap: 10 }}>
                            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={handleAddCamera}
                              style={{ flex: 1, background: "linear-gradient(135deg, #8e44ad, #6c3483)", border: "none", borderRadius: 11, padding: "12px", fontSize: 13, fontWeight: 600, color: "white", cursor: "pointer" }}>
                              Сохранить камеру
                            </motion.button>
                            <button onClick={() => setShowCamForm(false)} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 11, padding: "12px 18px", fontSize: 13, color: "#888", cursor: "pointer" }}>Отмена</button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {camLoading ? (
                    <div style={{ textAlign: "center", padding: "48px", color: "#55556a" }}>Загрузка...</div>
                  ) : cameras.length === 0 ? (
                    <div style={{ background: "rgba(19,19,26,0.4)", border: "1px dashed rgba(255,255,255,0.08)", borderRadius: 16, padding: "48px", textAlign: "center", color: "#55556a" }}>
                      <div style={{ fontSize: 40, marginBottom: 12 }}>📹</div>
                      <div style={{ fontSize: 15, marginBottom: 6 }}>Камер нет</div>
                      <div style={{ fontSize: 12 }}>Добавьте первую камеру нажав кнопку выше</div>
                    </div>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
                      {cameras.map((cam, i) => (
                        <motion.div key={cam.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                          style={{ background: "rgba(19,19,26,0.9)", border: "1px solid rgba(142,68,173,0.2)", borderRadius: 16, overflow: "hidden" }}>
                          {/* Camera view */}
                          <div style={{ position: "relative", width: "100%", paddingBottom: "56.25%", background: "#0a0a12", cursor: "pointer" }}
                            onClick={() => setFullscreenCam(cam)}>
                            {cam.type === "iframe" ? (
                              <iframe src={cam.url} title={cam.name} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none" }} allowFullScreen sandbox="allow-same-origin allow-scripts allow-forms" />
                            ) : cam.type === "img" ? (
                              <img src={cam.url} alt={cam.name} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                            ) : (
                              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
                                <div style={{ fontSize: 32 }}>📡</div>
                                <div style={{ fontSize: 11, color: "#6b6b80" }}>HLS поток</div>
                                <a href={sanitizeUrl(cam.url)} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "#8e44ad", textDecoration: "underline" }}>Открыть поток</a>
                              </div>
                            )}
                            <div style={{ position: "absolute", top: 8, right: 8, width: 8, height: 8, borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 6px #4ade80" }} />
                            <div style={{ position: "absolute", bottom: 8, right: 8, background: "rgba(0,0,0,0.6)", borderRadius: 6, padding: "3px 8px", fontSize: 10, color: "rgba(255,255,255,0.7)" }}>
                              ⛶ на весь экран
                            </div>
                          </div>
                          {/* Camera info */}
                          <div style={{ padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 600, color: "#e8e8f0" }}>{cam.name}</div>
                              <div style={{ fontSize: 10, color: "#55556a", marginTop: 2 }}>
                                {cam.type === "iframe" ? "Веб-интерфейс" : cam.type === "img" ? "MJPEG" : "HLS"}
                                {" · "}{cityLabel(cam.city_id)}
                              </div>
                            </div>
                            <button onClick={() => { if (confirm("Удалить камеру?")) fetch(`/api/cameras?id=${cam.id}`, { method: "DELETE" }).then(loadCameras); }}
                              style={{ background: "rgba(230,57,70,0.08)", border: "1px solid rgba(230,57,70,0.18)", borderRadius: 8, padding: "5px 10px", fontSize: 11, color: "#e63946", cursor: "pointer" }}>
                              🗑️
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* === ЖУРНАЛ ТРАНСПОРТА === */}
              {tab === "transport_log" && (
                <>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                    <div>
                      <h2 style={{ fontSize: 17, fontWeight: 700 }}>Журнал транспорта</h2>
                      {insideToday.length > 0 && <div style={{ fontSize: 12, color: "#4ade80", marginTop: 2 }}>🟢 Сейчас на объектах: {insideToday.length} авто</div>}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ fontSize: 12, color: "#6b6b80" }}>{transportLog.length} записей</div>
                      <button onClick={loadTransportLog} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "7px 14px", fontSize: 12, color: "#8888a0", cursor: "pointer" }}>↻ Обновить</button>
                    </div>
                  </div>

                  {insideToday.length > 0 && (
                    <div style={{ background: "rgba(74,222,128,0.04)", border: "1px solid rgba(74,222,128,0.15)", borderRadius: 14, padding: "14px 16px", marginBottom: 16 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#4ade80", marginBottom: 10 }}>🟢 На объекте — нажмите «← Выезд» для подтверждения</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {insideToday.map(entry => (
                          <div key={entry.plate_number + entry.city_id} style={{ display: "flex", alignItems: "center", gap: 12, background: "rgba(74,222,128,0.06)", borderRadius: 10, padding: "10px 14px" }}>
                            <span style={{ fontSize: 16 }}>🚗</span>
                            <div style={{ flex: 1 }}>
                              <span style={{ fontSize: 14, fontWeight: 700, color: "#e8e8f0" }}>{entry.plate_number}</span>
                              {entry.driver_name && <span style={{ fontSize: 12, color: "#6b6b80", marginLeft: 6 }}>{entry.driver_name}</span>}
                              <div style={{ fontSize: 11, color: "#44444e", marginTop: 1 }}>
                                въехал в {new Date(entry.logged_at).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })} · {allCities.find(c => c.id === entry.city_id)?.label || entry.city_id}
                              </div>
                            </div>
                            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setExitConfirm(entry)}
                              style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10, padding: "7px 14px", fontSize: 12, color: "#f87171", cursor: "pointer", fontWeight: 600 }}>
                              ← Выезд
                            </motion.button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
                    <button onClick={() => setLogCityFilter("")} style={{ padding: "7px 14px", borderRadius: 10, fontSize: 12, cursor: "pointer", border: "none", background: !logCityFilter ? "rgba(230,57,70,0.2)" : "rgba(255,255,255,0.05)", color: !logCityFilter ? "#e63946" : "#6b6b80", fontWeight: !logCityFilter ? 600 : 400 }}>Все города</button>
                    {allCities.map(c => <button key={c.id} onClick={() => setLogCityFilter(c.id)} style={{ padding: "7px 14px", borderRadius: 10, fontSize: 12, cursor: "pointer", border: "none", background: logCityFilter === c.id ? "rgba(79,142,247,0.2)" : "rgba(255,255,255,0.05)", color: logCityFilter === c.id ? "#4f8ef7" : "#6b6b80", fontWeight: logCityFilter === c.id ? 600 : 400 }}>{c.label}</button>)}
                  </div>

                  {logLoading ? (
                    <div style={{ textAlign: "center", padding: "48px", color: "#55556a" }}>Загрузка...</div>
                  ) : transportLog.length === 0 ? (
                    <div style={{ background: "rgba(19,19,26,0.4)", border: "1px dashed rgba(255,255,255,0.08)", borderRadius: 16, padding: "48px", textAlign: "center", color: "#55556a" }}>
                      <div style={{ fontSize: 36, marginBottom: 10 }}>🚗</div>
                      <div style={{ fontSize: 14 }}>Журнал пуст</div>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                      {transportLog.map((entry, i) => {
                        const key = entry.plate_number + "_" + entry.city_id;
                        const isCurrentlyInside = vehicleLastAction[key]?.id === entry.id && entry.action === "entry";
                        return (
                          <motion.div key={entry.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                            style={{ background: entry.action === "entry" ? "rgba(74,222,128,0.03)" : "rgba(239,68,68,0.03)", border: `1px solid ${isCurrentlyInside ? "rgba(74,222,128,0.25)" : entry.action === "entry" ? "rgba(74,222,128,0.1)" : "rgba(239,68,68,0.1)"}`, borderRadius: 12, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
                            <div style={{ width: 34, height: 34, borderRadius: 9, flexShrink: 0, background: entry.action === "entry" ? "rgba(74,222,128,0.1)" : "rgba(239,68,68,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>
                              {entry.action === "entry" ? "➡️" : "⬅️"}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                                <span style={{ fontSize: 13, fontWeight: 700, color: "#e8e8f0" }}>{entry.plate_number}</span>
                                <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 7px", borderRadius: 5, background: entry.action === "entry" ? "rgba(74,222,128,0.12)" : "rgba(239,68,68,0.12)", color: entry.action === "entry" ? "#4ade80" : "#f87171" }}>
                                  {entry.action === "entry" ? "въезд" : "выезд"}
                                </span>
                                {isCurrentlyInside && <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 4, background: "rgba(74,222,128,0.15)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.2)" }}>на объекте</span>}
                              </div>
                              <div style={{ fontSize: 11, color: "#6b6b80", marginTop: 2 }}>
                                {entry.driver_name && <span>{entry.driver_name} · </span>}
                                <span style={{ color: "#8888a0" }}>{entry.logged_by}</span>
                                {entry.logged_by_role && <span style={{ color: "#55556a" }}> ({entry.logged_by_role})</span>}
                                <span style={{ color: "#44444e" }}> · {allCities.find(c => c.id === entry.city_id)?.label || entry.city_id}</span>
                              </div>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                              {isCurrentlyInside && (
                                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setExitConfirm(entry)}
                                  style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 9, padding: "5px 12px", fontSize: 11, color: "#f87171", cursor: "pointer", fontWeight: 600 }}>
                                  ← Выезд
                                </motion.button>
                              )}
                              <div style={{ textAlign: "right" }}>
                                <div style={{ fontSize: 11, color: "#6b6b80" }}>{new Date(entry.logged_at).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" })}</div>
                                <div style={{ fontSize: 10, color: "#44444e" }}>{new Date(entry.logged_at).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}</div>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

                {/* === ИНСТРУКЦИИ ПО РОЛЯМ === */}

              {tab === "instructions" && (
                <div className="py-2">
                  <InstructionsEditor />
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* ── MOBILE BOTTOM NAV ── */}
      {isMobile && (
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "rgba(8,8,16,0.97)", backdropFilter: "blur(24px)", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-around", alignItems: "center", padding: "8px 4px max(16px, env(safe-area-inset-bottom, 16px))", zIndex: 150 }}>
          {MOBILE_BOTTOM.slice(0, 4).map(item => {
            const isActive = tab === item.id || (item.id === "instructions" && !["users","companies","transport_log","patrol"].includes(tab));
            return (
              <motion.button key={item.id} whileTap={{ scale: 0.84 }}
                onClick={() => { setTab(item.id); setSelectedUser(null); if (item.id === "companies") { setSelectedCity(""); setSelectedCompany(null); } }}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "6px 10px", borderRadius: 14, border: "none", background: isActive ? "rgba(255,255,255,0.07)" : "transparent", cursor: "pointer", minWidth: 56 }}>
                <span style={{ fontSize: 22 }}>{item.icon}</span>
                <span style={{ fontSize: 10, fontWeight: isActive ? 700 : 400, color: isActive ? "#f0f0fa" : "#404058" }}>{item.label}</span>
                {isActive && <motion.div layoutId="mAdminDot" style={{ width: 4, height: 4, borderRadius: "50%", background: "#4f8ef7" }} />}
              </motion.button>
            );
          })}
          {/* Кнопка "Ещё" */}
          <AdminMoreMenu tab={tab} setTab={(t) => { setTab(t as Tab); setSelectedUser(null); if (t === "companies") { setSelectedCity(""); setSelectedCompany(null); } }} allTabs={[...PLAN_TABS, ...MGMT_TABS]} excludeIds={["users","companies","transport_log","patrol"]} />
        </div>
      )}

      {/* === МОДАЛКА ЛОГИН/ПАРОЛЬ === */}
      <AnimatePresence>
        {credModal && (
          <div style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 400, padding: 20 }}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setCredModal(null)}
              style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)" }} />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
              style={{ position: "relative", background: "#14141e", border: "1px solid rgba(230,57,70,0.3)", borderRadius: 20, padding: "28px 24px", width: "100%", maxWidth: 360, zIndex: 1 }}>
              <div style={{ textAlign: "center", marginBottom: 20 }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>🔑</div>
                <h3 style={{ fontSize: 16, fontWeight: 700 }}>Данные сотрудника</h3>
                <p style={{ fontSize: 12, color: "#6b6b80", marginTop: 4 }}>{credModal.name}</p>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "12px 16px" }}>
                  <div style={{ fontSize: 10, color: "#6b6b80", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Логин</div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "#4f8ef7", fontFamily: "monospace" }}>{credModal.login}</div>
                </div>
                <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "12px 16px" }}>
                  <div style={{ fontSize: 10, color: "#6b6b80", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Пароль</div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "#4ade80", fontFamily: "monospace" }}>{credModal.password}</div>
                </div>
              </div>
              <button onClick={() => setCredModal(null)} style={{ marginTop: 18, width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "12px", fontSize: 14, color: "#888", cursor: "pointer" }}>Закрыть</button>
            </motion.div>
          </div>
        )}
        </AnimatePresence>

        {/* === КАРТОЧКА НОВОГО СОТРУДНИКА === */}
        <AnimatePresence>
          {newUserCard && (
            <div style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 450, padding: 20 }}>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)" }} />
              <motion.div initial={{ opacity: 0, scale: 0.88, y: 24 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.88, y: 24 }}
                transition={{ type: "spring", stiffness: 340, damping: 28 }}
                style={{ position: "relative", background: "#12121e", border: "1px solid rgba(67,184,156,0.35)", borderRadius: 24, padding: "32px 28px", width: "100%", maxWidth: 400, zIndex: 1, boxShadow: "0 32px 80px rgba(0,0,0,0.7), 0 0 40px rgba(67,184,156,0.1)" }}>

                {/* Иконка успеха */}
                <div style={{ textAlign: "center", marginBottom: 24 }}>
                  <motion.div
                    initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
                    style={{ width: 68, height: 68, borderRadius: 22, background: "linear-gradient(135deg, #43b89c, #10b981)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 30, boxShadow: "0 10px 30px rgba(67,184,156,0.4)" }}>
                    ✓
                  </motion.div>
                  <h3 style={{ fontSize: 20, fontWeight: 800, color: "#f0f0fa", marginBottom: 4 }}>Сотрудник создан!</h3>
                  <p style={{ fontSize: 13, color: "#55556a" }}>Передайте данные сотруднику для входа</p>
                </div>

                {/* Имя */}
                <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "12px 16px", marginBottom: 10 }}>
                  <div style={{ fontSize: 10, color: "#55556a", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>Сотрудник</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#f0f0fa" }}>{newUserCard.name}</div>
                  <div style={{ fontSize: 11, color: "#6b6b80", marginTop: 2 }}>{newUserCard.role}</div>
                </div>

                {/* Логин */}
                <div style={{ background: "rgba(79,142,247,0.07)", border: "1px solid rgba(79,142,247,0.2)", borderRadius: 14, padding: "14px 16px", marginBottom: 10, cursor: "pointer" }}
                  onClick={() => copyToClipboard(newUserCard.login, "login")}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ fontSize: 10, color: "#4f8ef7", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Логин</div>
                    <span style={{ fontSize: 11, color: copiedField === "login" ? "#4ade80" : "#4f8ef7", fontWeight: 600 }}>
                      {copiedField === "login" ? "✓ Скопировано" : "Нажмите для копирования"}
                    </span>
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: "#4f8ef7", fontFamily: "monospace", letterSpacing: "0.05em" }}>{newUserCard.login}</div>
                </div>

                {/* Пароль */}
                <div style={{ background: "rgba(74,222,128,0.07)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: 14, padding: "14px 16px", marginBottom: 20, cursor: "pointer" }}
                  onClick={() => copyToClipboard(newUserCard.password, "password")}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ fontSize: 10, color: "#4ade80", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Пароль</div>
                    <span style={{ fontSize: 11, color: copiedField === "password" ? "#4ade80" : "#43b89c", fontWeight: 600 }}>
                      {copiedField === "password" ? "✓ Скопировано" : "Нажмите для копирования"}
                    </span>
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: "#4ade80", fontFamily: "monospace", letterSpacing: "0.1em" }}>{newUserCard.password}</div>
                </div>

                  {/* Города и компании */}
                  {(newUserCard.cities.length > 0 || newUserCard.companies.length > 0) && (
                    <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "12px 16px", marginBottom: 10 }}>
                      {newUserCard.cities.length > 0 && (
                        <div style={{ marginBottom: newUserCard.companies.length > 0 ? 10 : 0 }}>
                          <div style={{ fontSize: 10, color: "#55556a", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Города</div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                            {newUserCard.cities.map(cid => (
                              <span key={cid} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 7, background: "rgba(67,184,156,0.1)", border: "1px solid rgba(67,184,156,0.2)", color: "#43b89c", fontWeight: 600 }}>
                                📍 {allCities.find(c => c.id === cid)?.label || cid}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {newUserCard.companies.length > 0 && (
                        <div>
                          <div style={{ fontSize: 10, color: "#55556a", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Компании / Объекты</div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                            {newUserCard.companies.map(cid => (
                              <span key={cid} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 7, background: "rgba(230,126,34,0.1)", border: "1px solid rgba(230,126,34,0.2)", color: "#e67e22", fontWeight: 600 }}>
                                🏢 {companies.find(c => c.id === cid)?.name || cid}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Кнопка копировать всё */}
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                    onClick={() => copyToClipboard(`Сотрудник: ${newUserCard.name}\nРоль: ${newUserCard.role}\nЛогин: ${newUserCard.login}\nПароль: ${newUserCard.password}${newUserCard.cities.length > 0 ? "\nГорода: " + newUserCard.cities.map(cid => allCities.find(c => c.id === cid)?.label || cid).join(", ") : ""}${newUserCard.companies.length > 0 ? "\nОбъекты: " + newUserCard.companies.map(cid => companies.find(c => c.id === cid)?.name || cid).join(", ") : ""}`, "all")}
                  style={{ width: "100%", background: copiedField === "all" ? "rgba(74,222,128,0.15)" : "rgba(79,142,247,0.1)", border: `1px solid ${copiedField === "all" ? "rgba(74,222,128,0.35)" : "rgba(79,142,247,0.25)"}`, borderRadius: 14, padding: "13px", fontSize: 14, fontWeight: 700, color: copiedField === "all" ? "#4ade80" : "#4f8ef7", cursor: "pointer", marginBottom: 10, transition: "all 0.2s" }}>
                  {copiedField === "all" ? "✓ Скопировано!" : "📋 Скопировать логин и пароль"}
                </motion.button>

                <button onClick={() => { setNewUserCard(null); setCopiedField(null); }}
                  style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "12px", fontSize: 13, color: "#606078", cursor: "pointer" }}>
                  Закрыть
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* === ПОЛНОЭКРАННАЯ КАМЕРА === */}
      <AnimatePresence>
        {fullscreenCam && (
          <div style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 500, padding: "2%" }}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setFullscreenCam(null)}
              style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.95)", backdropFilter: "blur(4px)" }} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              style={{ position: "relative", width: "100%", height: "100%", zIndex: 1, display: "flex", flexDirection: "column", borderRadius: 16, overflow: "hidden", background: "#0a0a12", border: "1px solid rgba(142,68,173,0.3)" }}>
              <div style={{ padding: "12px 16px", background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{fullscreenCam.name}</span>
                  <span style={{ fontSize: 11, color: "#6b6b80", marginLeft: 10 }}>{fullscreenCam.url}</span>
                </div>
                <button onClick={() => setFullscreenCam(null)} style={{ background: "rgba(230,57,70,0.15)", border: "1px solid rgba(230,57,70,0.3)", borderRadius: 8, padding: "6px 14px", color: "#e63946", fontSize: 13, cursor: "pointer" }}>✕ Закрыть</button>
              </div>
              <div style={{ flex: 1, position: "relative" }}>
                {fullscreenCam.type === "iframe" ? (
                  <iframe src={fullscreenCam.url} title={fullscreenCam.name} style={{ width: "100%", height: "100%", border: "none" }} allowFullScreen sandbox="allow-same-origin allow-scripts allow-forms" />
                ) : fullscreenCam.type === "img" ? (
                  <img src={fullscreenCam.url} alt={fullscreenCam.name} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 12 }}>
                    <div style={{ fontSize: 48 }}>📡</div>
                    <a href={sanitizeUrl(fullscreenCam.url)} target="_blank" rel="noopener noreferrer" style={{ color: "#8e44ad", fontSize: 14 }}>Открыть HLS поток</a>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* === ФОРМА СОЗДАНИЯ/РЕДАКТИРОВАНИЯ === */}
      <AnimatePresence>
        {showForm && (
          <div style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 20 }}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowForm(false)}
              style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }} />
            <motion.div initial={{ opacity: 0, y: 30, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 30, scale: 0.95 }} transition={{ type: "spring", stiffness: 300, damping: 28 }}
              style={{ position: "relative", background: "#14141e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 22, padding: "26px 22px", width: "100%", maxWidth: 540, maxHeight: "92vh", overflowY: "auto", zIndex: 1, boxShadow: "0 32px 100px rgba(0,0,0,0.8)" }}>
              <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>{editUser ? "Редактировать сотрудника" : "Новый сотрудник"}</h3>
              <p style={{ fontSize: 12, color: "#6b6b80", marginBottom: 20 }}>{editUser ? "Измените данные и нажмите «Сохранить»" : "Заполните данные. Выбор секций обязателен."}</p>

                <div className="grid-cols-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                  {[
                    { key: "name", label: "Имя", placeholder: "Иван Петров" },
                    { key: "profession", label: "Профессия", placeholder: "Старший смены" },
                    { key: "login", label: "Логин", placeholder: "ivan123" },
                  ].map(field => (
                    <div key={field.key}>
                      <label style={{ display: "block", fontSize: 10, color: "#6b6b80", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.08em" }}>{field.label}</label>
                      <input type="text" value={(form as any)[field.key]} onChange={e => { setForm(f => ({ ...f, [field.key]: e.target.value })); setFormError(""); }} placeholder={field.placeholder} style={{ ...inp, fontSize: 13 }} />
                    </div>
                  ))}
                  <div>
                    <label style={{ display: "block", fontSize: 10, color: "#6b6b80", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.08em" }}>Роль <span style={{ color: "#e63946" }}>*</span></label>
                    <select value={form.role} onChange={e => { setForm(f => ({ ...f, role: e.target.value })); setFormError(""); }}
                      style={{ ...inp, fontSize: 13, cursor: "pointer", color: form.role ? "#e8e8f0" : "#6b6b80" }}>
                      <option value="" style={{ background: "#0a0a14" }}>— Выберите роль —</option>
                      <option value="Охранник" style={{ background: "#0a0a14" }}>Охранник</option>
                      <option value="Старший охранник" style={{ background: "#0a0a14" }}>Старший охранник</option>
                      <option value="Начальник смены" style={{ background: "#0a0a14" }}>Начальник смены</option>
                      <option value="Инспектор" style={{ background: "#0a0a14" }}>Инспектор</option>
                      <option value="Оперативный дежурный" style={{ background: "#0a0a14" }}>Оперативный дежурный</option>
                      <option value="Менеджер объекта" style={{ background: "#0a0a14" }}>Менеджер объекта</option>
                      <option value="Администратор" style={{ background: "#0a0a14" }}>Администратор</option>
                    </select>
                  </div>
                </div>

                <div style={{ marginBottom: 18 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
                    <label style={{ fontSize: 10, color: "#6b6b80", textTransform: "uppercase", letterSpacing: "0.08em" }}>Пароль{editUser ? " (оставьте пустым если не менять)" : " *"}</label>
                    {!editUser && (
                      <motion.button type="button" whileTap={{ scale: 0.95 }}
                        onClick={() => setForm(f => ({ ...f, password: generatePassword() }))}
                        style={{ fontSize: 11, color: "#43b89c", background: "rgba(67,184,156,0.1)", border: "1px solid rgba(67,184,156,0.25)", borderRadius: 7, padding: "3px 10px", cursor: "pointer", fontWeight: 600 }}>
                        ⚡ Сгенерировать
                      </motion.button>
                    )}
                  </div>
                  <input type="text" value={form.password} onChange={e => { setForm(f => ({ ...f, password: e.target.value })); setFormError(""); }} placeholder="Пароль" style={{ ...inp, fontSize: 13, fontFamily: "monospace" }} />
                </div>

              {/* Секции */}
              <div style={{ marginBottom: 18 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <label style={{ fontSize: 12, color: "#e8e8f0", fontWeight: 600 }}>
                    Доступные секции <span style={{ color: "#e63946" }}>*</span>
                    <span style={{ fontSize: 10, color: "#6b6b80", fontWeight: 400, marginLeft: 6 }}>({form.allowedSections.length} выбрано)</span>
                  </label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => setForm(f => ({ ...f, allowedSections: [...ALL_SECTIONS] }))} style={{ fontSize: 11, color: "#4f8ef7", background: "none", border: "none", cursor: "pointer" }}>Все</button>
                    <button onClick={() => setForm(f => ({ ...f, allowedSections: [] }))} style={{ fontSize: 11, color: "#e63946", background: "none", border: "none", cursor: "pointer" }}>Сбросить</button>
                  </div>
                </div>
                <div className="grid-cols-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                  {ALL_SECTIONS.map(s => {
                    const on = form.allowedSections.includes(s);
                    return (
                      <motion.button key={s} whileTap={{ scale: 0.95 }} onClick={() => toggleSection(s)}
                        style={{ padding: "9px 10px", borderRadius: 10, border: `1px solid ${on ? "rgba(79,142,247,0.45)" : "rgba(255,255,255,0.07)"}`, background: on ? "rgba(79,142,247,0.14)" : "rgba(255,255,255,0.03)", cursor: "pointer", fontSize: 12, color: on ? "#7aaef7" : "#55556a", fontWeight: on ? 600 : 400, transition: "all 0.15s", textAlign: "left", display: "flex", alignItems: "center", gap: 6 }}>
                        <span>{SECTION_ICONS[s]}</span><span style={{ flex: 1 }}>{SECTION_LABELS[s]}</span>
                        {on && <span style={{ fontSize: 10, color: "#4f8ef7" }}>✓</span>}
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Города */}
              <div style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <label style={{ fontSize: 10, color: "#6b6b80", textTransform: "uppercase", letterSpacing: "0.08em" }}>Города <span style={{ color: "#e63946" }}>*</span></label>
                    <button onClick={() => setForm(f => ({ ...f, allowedCities: [] }))} style={{ fontSize: 11, color: "#e63946", background: "none", border: "none", cursor: "pointer" }}>Сбросить</button>
                  </div>
                <div className="grid-cols-3" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 5 }}>
                  {allCities.map(c => {
                    const on = form.allowedCities.includes(c.id);
                    return (
                      <motion.button key={c.id} whileTap={{ scale: 0.95 }} onClick={() => toggleCity(c.id)}
                        style={{ padding: "7px 6px", borderRadius: 9, border: `1px solid ${on ? "rgba(67,184,156,0.4)" : "rgba(255,255,255,0.07)"}`, background: on ? "rgba(67,184,156,0.1)" : "rgba(255,255,255,0.03)", cursor: "pointer", fontSize: 11, color: on ? "#43b89c" : "#55556a", fontWeight: on ? 600 : 400, transition: "all 0.15s", textAlign: "center" }}>
                        {c.label}
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Компании */}
              {companies.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <label style={{ fontSize: 10, color: "#6b6b80", textTransform: "uppercase", letterSpacing: "0.08em" }}>Компании <span style={{ color: "#e63946" }}>*</span></label>
                    <button onClick={() => setForm(f => ({ ...f, allowedCompanies: [] }))} style={{ fontSize: 11, color: "#e63946", background: "none", border: "none", cursor: "pointer" }}>Сбросить</button>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    {allCities.map(city => {
                      const ccos = companies.filter(co => co.cityId === city.id);
                      if (ccos.length === 0) return null;
                      return (
                        <div key={city.id}>
                          <div style={{ fontSize: 10, color: "#44444e", marginBottom: 4, paddingLeft: 2 }}>📍 {city.label}</div>
                          <div className="grid-cols-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5, paddingLeft: 6 }}>
                            {ccos.map(co => {
                              const on = form.allowedCompanies.includes(co.id);
                              return (
                                <motion.button key={co.id} whileTap={{ scale: 0.95 }} onClick={() => toggleCompany(co.id)}
                                  style={{ padding: "7px 10px", borderRadius: 9, border: `1px solid ${on ? "rgba(230,126,34,0.4)" : "rgba(255,255,255,0.07)"}`, background: on ? "rgba(230,126,34,0.1)" : "rgba(255,255,255,0.03)", cursor: "pointer", fontSize: 11, textAlign: "left", color: on ? "#e67e22" : "#55556a", fontWeight: on ? 600 : 400, transition: "all 0.15s" }}>
                                  🏢 {co.name}
                                </motion.button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {formError && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ fontSize: 12, color: "#e63946", marginBottom: 12, padding: "8px 12px", background: "rgba(230,57,70,0.08)", borderRadius: 8 }}>⚠️ {formError}</motion.p>
              )}
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setShowForm(false)} style={{ flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "13px", fontSize: 14, color: "#888", cursor: "pointer" }}>Отмена</button>
                <motion.button onClick={handleSave} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  style={{ flex: 2, background: "linear-gradient(135deg, #e63946, #c1121f)", border: "none", borderRadius: 12, padding: "13px", fontSize: 14, fontWeight: 600, color: "white", cursor: "pointer", boxShadow: "0 4px 16px rgba(230,57,70,0.3)" }}>
                  {editUser ? "Сохранить изменения" : "Создать сотрудника"}
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* === ПОДТВЕРЖДЕНИЕ ВЫЕЗДА === */}
      <AnimatePresence>
        {exitConfirm && (
          <div style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300, padding: 20 }}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => !exitLoading && setExitConfirm(null)}
              style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }} />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              style={{ position: "relative", background: "#14141e", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 18, padding: "28px 24px", width: "100%", maxWidth: 360, zIndex: 1, textAlign: "center" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🚗</div>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Подтвердить выезд?</h3>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#e8e8f0", marginBottom: 4 }}>{exitConfirm.plate_number}</div>
              {exitConfirm.driver_name && <div style={{ fontSize: 13, color: "#6b6b80", marginBottom: 4 }}>{exitConfirm.driver_name}</div>}
              <div style={{ fontSize: 12, color: "#44444e", marginBottom: 22 }}>Въехал в {new Date(exitConfirm.logged_at).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}</div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setExitConfirm(null)} disabled={exitLoading} style={{ flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "12px", fontSize: 14, color: "#888", cursor: "pointer" }}>Отмена</button>
                <motion.button whileTap={{ scale: 0.96 }} onClick={handleConfirmExit} disabled={exitLoading}
                  style={{ flex: 1, background: "linear-gradient(135deg, #e63946, #c1121f)", border: "none", borderRadius: 12, padding: "12px", fontSize: 14, fontWeight: 600, color: "white", cursor: "pointer", opacity: exitLoading ? 0.6 : 1 }}>
                  {exitLoading ? "..." : "← Выезд"}
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Удаление сотрудника */}
      <AnimatePresence>
        {deleteConfirm && (
          <div style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300, padding: 20 }}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDeleteConfirm(null)}
              style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }} />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              style={{ position: "relative", background: "#14141e", border: "1px solid rgba(230,57,70,0.3)", borderRadius: 18, padding: "28px 24px", width: "100%", maxWidth: 340, zIndex: 1, textAlign: "center" }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Удалить сотрудника?</h3>
              <p style={{ fontSize: 13, color: "#6b6b80", marginBottom: 22 }}>Это действие нельзя отменить</p>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setDeleteConfirm(null)} style={{ flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "12px", fontSize: 14, color: "#888", cursor: "pointer" }}>Отмена</button>
                <motion.button whileTap={{ scale: 0.96 }} onClick={() => handleDelete(deleteConfirm)} style={{ flex: 1, background: "linear-gradient(135deg, #e63946, #c1121f)", border: "none", borderRadius: 12, padding: "12px", fontSize: 14, fontWeight: 600, color: "white", cursor: "pointer" }}>Удалить</motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Удаление компании */}
      <AnimatePresence>
        {deleteCoConfirm && (
          <div style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300, padding: 20 }}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDeleteCoConfirm(null)}
              style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }} />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              style={{ position: "relative", background: "#14141e", border: "1px solid rgba(230,57,70,0.3)", borderRadius: 18, padding: "28px 24px", width: "100%", maxWidth: 340, zIndex: 1, textAlign: "center" }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>🏢</div>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Удалить компанию?</h3>
              <p style={{ fontSize: 13, color: "#6b6b80", marginBottom: 22 }}>Это действие нельзя отменить</p>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setDeleteCoConfirm(null)} style={{ flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "12px", fontSize: 14, color: "#888", cursor: "pointer" }}>Отмена</button>
                <motion.button whileTap={{ scale: 0.96 }} onClick={() => handleDeleteCompany(deleteCoConfirm)} style={{ flex: 1, background: "linear-gradient(135deg, #e63946, #c1121f)", border: "none", borderRadius: 12, padding: "12px", fontSize: 14, fontWeight: 600, color: "white", cursor: "pointer" }}>Удалить</motion.button>
              </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
}

/* ── Mobile More Menu for AdminPanel ── */
function AdminMoreMenu({ tab, setTab, allTabs, excludeIds }: {
  tab: string;
  setTab: (t: string) => void;
  allTabs: { id: string; icon: string; label: string }[];
  excludeIds: string[];
}) {
  const [open, setOpen] = useState(false);
  const extra = allTabs.filter(t => !excludeIds.includes(t.id));
  const isExtraActive = extra.some(t => t.id === tab);
  return (
    <div style={{ position: "relative" }}>
      <motion.button whileTap={{ scale: 0.84 }} onClick={() => setOpen(!open)}
        style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "6px 10px", borderRadius: 14, border: "none", background: isExtraActive ? "rgba(255,255,255,0.07)" : "transparent", cursor: "pointer", minWidth: 56 }}>
        <span style={{ fontSize: 22 }}>⋯</span>
        <span style={{ fontSize: 10, color: isExtraActive ? "#f0f0fa" : "#404058", fontWeight: isExtraActive ? 700 : 400 }}>Ещё</span>
      </motion.button>
      <AnimatePresence>
        {open && (
          <>
            <div style={{ position: "fixed", inset: 0, zIndex: 290 }} onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.94 }} animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.94 }} transition={{ type: "spring", stiffness: 400, damping: 28 }}
              style={{ position: "absolute", bottom: "calc(100% + 12px)", right: 0, background: "rgba(12,12,22,0.99)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 22, padding: "8px", minWidth: 220, backdropFilter: "blur(28px)", zIndex: 300, boxShadow: "0 -12px 50px rgba(0,0,0,0.7)", maxHeight: "60vh", overflowY: "auto" }}>
              {extra.map(item => (
                <motion.button key={item.id} whileTap={{ scale: 0.96 }}
                  onClick={() => { setTab(item.id); setOpen(false); }}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 11, padding: "11px 14px", borderRadius: 14, border: "none", background: tab === item.id ? "rgba(79,142,247,0.12)" : "transparent", cursor: "pointer", textAlign: "left" }}>
                  <span style={{ fontSize: 20 }}>{item.icon}</span>
                  <span style={{ fontSize: 14, color: tab === item.id ? "#f0f0fa" : "#606078", fontWeight: tab === item.id ? 600 : 400 }}>{item.label}</span>
                </motion.button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

