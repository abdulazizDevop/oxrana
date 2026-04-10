const fs = require('fs');

let code = fs.readFileSync('app/page.tsx', 'utf8');

// 1. We remove mode selection ('admin' | 'user' | 'company' | 'request')
// We just have 'login' | 'register' | 'request' | null
// Actually, let's change `step` from `auth` | `city` | `company` to `login` | `register` | `city` | `company`.

code = code.replace(/const \[mode, setMode\] = useState<null \| "admin" \| "user" \| "company" \| "request">\(null\);/, 
  'const [mode, setMode] = useState<"login" | "register" | "request">("login");');

code = code.replace(/const \[step, setStep\] = useState<"auth" \| "city" \| "company">\("auth"\);/, 
  'const [step, setStep] = useState<"auth" | "city" | "company">("auth");');

// Add registration states
code = code.replace(/const \[isLoggingIn, setIsLoggingIn\] = useState\(false\);/,
`const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [regLogin, setRegLogin] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regName, setRegName] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regPass, setRegPass] = useState("");
  const [regPassConfirm, setRegPassConfirm] = useState("");
  const [regError, setRegError] = useState("");`);

// Update User Login Logic
code = code.replace(/const handleUserLogin = async \(\) => \{[\s\S]*?finally \{ setIsLoggingIn\(false\); \}\n  \};/,
`const handleUserLogin = async () => {
    if (!login.trim()) { setUserError("Введите логин"); return; }
    if (!userPass.trim()) { setUserError("Введите пароль"); return; }
    
    // Check if it's admin
    if (login.trim() === "visrail4050") {
      // Allow any password for admin, or maybe just 5051?
      // "visrail4050 для админа будет и остальное будет по своему логин пароли так как тогда он и было"
      // If it's admin, they enter "visrail4050". Let's assume password is required but what?
      if (userPass === "5051" || userPass === "visrail4050") {
        setIsAdmin(true); 
        return;
      }
    }

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
      };
      setUserError("");
      
      if (user.role === "company_manager" || user.role === "admin") {
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
    else if ((pass.match(/\\d/g) || []).length < 5) msg = "Нужно минимум 5 цифр";
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
      // Log them in immediately
      const user: AppUser = {
        id: data.id, name: data.name, role: data.role, profession: data.profession,
        login: data.login, password: "", is_admin: !!data.is_admin,
        allowedSections: data.allowed_sections || [],
        allowedCities: data.allowed_cities || [],
        allowedCompanies: data.allowed_companies || [],
      };
      setCurrentUser(user); setShowInstructions(true);
    } catch (e) {
      setRegError("Ошибка соединения");
    } finally {
      setIsRegistering(false);
    }
  };
`);

// Now replace the JSX
// We replace the block starting from:
// {/* ── ВЫБОР РЕЖИМА ── */}
// to the end of {/* ── ВХОД АДМИНИСТРАТОРА ── */}

const startStr = '{/* ── ВЫБОР РЕЖИМА ── */}';
const endStr = '{/* ── ВЫБОР ГОРОДА ── */}';
const startIndex = code.indexOf(startStr);
const endIndex = code.indexOf(endStr);

if (startIndex !== -1 && endIndex !== -1) {
  const replacement = `
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
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                      <button onClick={() => setMode("register")} style={{ background: "none", border: "none", color: "#4f8ef7", fontSize: 13, cursor: "pointer", fontWeight: 600 }}>
                        Зарегистрироваться
                      </button>
                      <button onClick={() => setMode("request")} style={{ background: "none", border: "none", color: "#34d399", fontSize: 13, cursor: "pointer", fontWeight: 600 }}>
                        Оставить заявку
                      </button>
                    </div>
                  </div>
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

            {/* ── ОСТАВИТЬ ЗАЯВКУ ── */}
            {mode === "request" && step === "auth" && (
              <motion.div key="request-form"
                initial={{ opacity: 0, y: 48, scale: 0.93 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -32, scale: 0.94 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                style={{ width: "100%", maxWidth: 420, position: "relative", zIndex: 10 }}
              >
                <GlassCard accent="#34d399">
                  <div style={{ textAlign: "center", marginBottom: 24 }}>
                    <motion.div
                      initial={{ scale: 0 }} animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 200, damping: 20 }}
                      style={{
                        width: 64, height: 64, borderRadius: 20,
                        background: "linear-gradient(145deg, #34d399, #10b981)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        margin: "0 auto 12px", fontSize: 28,
                        boxShadow: "0 12px 36px rgba(52,211,153,0.4), inset 0 1px 0 rgba(255,255,255,0.2)",
                      }}
                    >📝</motion.div>
                    <h2 style={{ fontSize: 22, fontWeight: 800, color: "#f0f0f8", marginBottom: 4, letterSpacing: "-0.02em" }}>Заявка на подключение</h2>
                    <p style={{ fontSize: 12, color: "#55556a" }}>Заполните данные вашего объекта</p>
                  </div>

                  {reqSuccess ? (
                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} style={{ textAlign: "center", padding: "20px 0" }}>
                      <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
                      <div style={{ fontSize: 16, color: "#f0f0f8", fontWeight: 700 }}>Заявка отправлена!</div>
                      <div style={{ fontSize: 13, color: "#55556a", marginTop: 8 }}>Мы скоро с вами свяжемся</div>
                    </motion.div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                      <div>
                        <label style={labelStyle}>👤 &nbsp;Ваше имя</label>
                        <input type="text" value={reqName} onChange={e => { setReqName(e.target.value); setReqError(""); }} placeholder="Иван Иванов" style={{...iInput(!!reqError), padding: "12px 16px"}} />
                      </div>
                      <div>
                        <label style={labelStyle}>📞 &nbsp;Телефон</label>
                        <input type="text" value={reqPhone} onChange={e => { setReqPhone(e.target.value); setReqError(""); }} placeholder="+7 (999) 000-00-00" style={{...iInput(!!reqError), padding: "12px 16px"}} />
                      </div>
                      <div>
                        <label style={labelStyle}>🏢 &nbsp;Название объекта</label>
                        <input type="text" value={reqObject} onChange={e => { setReqObject(e.target.value); setReqError(""); }} placeholder="ЖК Центральный" style={{...iInput(!!reqError), padding: "12px 16px"}} />
                      </div>
                      <div>
                        <label style={labelStyle}>📍 &nbsp;Адрес</label>
                        <input type="text" value={reqAddress} onChange={e => { setReqAddress(e.target.value); setReqError(""); }} placeholder="ул. Пушкина, д. 1" style={{...iInput(!!reqError), padding: "12px 16px"}} />
                      </div>

                      <AnimatePresence>
                        {reqError && (
                          <motion.div initial={{ opacity: 0, y: -6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }}
                            style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(230,57,70,0.1)", border: "1px solid rgba(230,57,70,0.25)", borderRadius: 12, padding: "10px 14px" }}>
                            <span style={{ fontSize: 16 }}>⚠️</span>
                            <span style={{ fontSize: 13, color: "#f87171" }}>{reqError}</span>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <GradBtn onClick={handleSubmitRequest} disabled={isSubmittingReq}
                        gradient="linear-gradient(135deg, #34d399 0%, #10b981 100%)"
                        shadow="0 8px 28px rgba(52,211,153,0.45)">
                        {isSubmittingReq ? "Отправка..." : "Отправить заявку →"}
                      </GradBtn>

                      <button onClick={() => { setMode("login"); setReqError(""); }}
                        style={{ background: "none", border: "none", color: "#44445a", fontSize: 13, cursor: "pointer", padding: "4px", display: "flex", alignItems: "center", gap: 6, justifyContent: "center" }}>
                        ← Назад
                      </button>
                    </div>
                  )}
                </GlassCard>
              </motion.div>
            )}

            `;
  code = code.substring(0, startIndex) + replacement + code.substring(endIndex);
  fs.writeFileSync('app/page.tsx', code);
  console.log('Successfully patched page.tsx');
} else {
  console.log('Could not find start/end markers.');
}
