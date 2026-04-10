"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

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

export function RequestModal({ isOpen, onClose, userId, type = "connect", companyId, defaultObjectName }: { 
  isOpen: boolean; onClose: () => void; userId?: string; type?: "connect" | "new_object" | "subscription"; companyId?: string; defaultObjectName?: string;
}) {
  const [reqName, setReqName] = useState("");
  const [reqPhone, setReqPhone] = useState("");
  const [reqObject, setReqObject] = useState(defaultObjectName || "");
  const [reqAddress, setReqAddress] = useState("");
  const [reqError, setReqError] = useState("");
  const [reqSuccess, setReqSuccess] = useState(false);
  const [isSubmittingReq, setIsSubmittingReq] = useState(false);

  const handleSubmitRequest = async () => {
    if (type === "connect" || type === "new_object") {
      if (!reqName.trim() || !reqPhone.trim() || !reqObject.trim() || !reqAddress.trim()) {
        setReqError("Заполните все поля");
        return;
      }
    } else if (type === "subscription") {
      if (!reqName.trim() || !reqPhone.trim()) {
        setReqError("Заполните имя и телефон");
        return;
      }
    }

    setIsSubmittingReq(true);
    setReqError("");
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name: reqName, 
          phone: reqPhone, 
          object_name: reqObject || defaultObjectName || "Продление подписки", 
          address: reqAddress,
          userId,
          type,
          companyId
        }),
      });
      if (!res.ok) throw new Error();
      setReqSuccess(true);
      setTimeout(() => {
        setReqSuccess(false);
        setReqName(""); setReqPhone(""); setReqObject(""); setReqAddress("");
        onClose();
      }, 3000);
    } catch {
      setReqError("Ошибка отправки заявки");
    } finally {
      setIsSubmittingReq(false);
    }
  };

  if (!isOpen) return null;

  const titles = {
    connect: "Заявка на подключение",
    new_object: "Добавить новый объект",
    subscription: "Продление подписки"
  };

  const icons = {
    connect: "📝",
    new_object: "🏗️",
    subscription: "💳"
  };

  const accents = {
    connect: "#34d399",
    new_object: "#4f8ef7",
    subscription: "#fbbf24"
  };

  return (
    <div style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(10px)" }} />
      
      <motion.div 
        initial={{ opacity: 0, y: 48, scale: 0.93 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -32, scale: 0.94 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        style={{ width: "100%", maxWidth: 420, position: "relative", zIndex: 10 }}
      >
        <GlassCard accent={accents[type]}>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <motion.div
              initial={{ scale: 0 }} animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              style={{
                width: 64, height: 64, borderRadius: 20,
                background: `linear-gradient(145deg, ${accents[type]}, ${accents[type]}dd)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 12px", fontSize: 28,
                boxShadow: `0 12px 36px ${accents[type]}40, inset 0 1px 0 rgba(255,255,255,0.2)`,
              }}
            >{icons[type]}</motion.div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: "#f0f0f8", marginBottom: 4, letterSpacing: "-0.02em" }}>{titles[type]}</h2>
            <p style={{ fontSize: 12, color: "#55556a" }}>
              {type === "subscription" ? "Оставьте заявку на продление объекта" : "Заполните данные вашего объекта"}
            </p>
          </div>

          {reqSuccess ? (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
              <div style={{ fontSize: 16, color: "#f0f0f8", fontWeight: 700 }}>Заявка отправлена!</div>
              <div style={{ fontSize: 13, color: "#55556a", marginTop: 8 }}>Администратор скоро рассмотрит её</div>
            </motion.div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={labelStyle}>👤 &nbsp;Контактное лицо</label>
                <input type="text" value={reqName} onChange={e => { setReqName(e.target.value); setReqError(""); }} placeholder="Иван Иванов" style={{...iInput(!!reqError), padding: "12px 16px"}} />
              </div>
              <div>
                <label style={labelStyle}>📞 &nbsp;Телефон</label>
                <input type="text" value={reqPhone} onChange={e => { setReqPhone(e.target.value); setReqError(""); }} placeholder="+7 (999) 000-00-00" style={{...iInput(!!reqError), padding: "12px 16px"}} />
              </div>
              
              {type !== "subscription" && (
                <>
                  <div>
                    <label style={labelStyle}>🏢 &nbsp;Название объекта</label>
                    <input type="text" value={reqObject} onChange={e => { setReqObject(e.target.value); setReqError(""); }} placeholder="ЖК Центральный" style={{...iInput(!!reqError), padding: "12px 16px"}} />
                  </div>
                  <div>
                    <label style={labelStyle}>📍 &nbsp;Адрес</label>
                    <input type="text" value={reqAddress} onChange={e => { setReqAddress(e.target.value); setReqError(""); }} placeholder="ул. Пушкина, д. 1" style={{...iInput(!!reqError), padding: "12px 16px"}} />
                  </div>
                </>
              )}
              
              {type === "subscription" && defaultObjectName && (
                <div style={{ background: "rgba(255,255,255,0.03)", padding: "12px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <div style={{ fontSize: 10, color: "#44445a", textTransform: "uppercase", marginBottom: 4 }}>Продлеваемый объект:</div>
                  <div style={{ fontSize: 14, color: "#f0f0f8", fontWeight: 600 }}>{defaultObjectName}</div>
                </div>
              )}

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
                gradient={`linear-gradient(135deg, ${accents[type]} 0%, ${accents[type]}cc 100%)`}
                shadow={`0 8px 28px ${accents[type]}35`}>
                {isSubmittingReq ? "Отправка..." : "Отправить заявку →"}
              </GradBtn>

              <button onClick={onClose}
                style={{ background: "none", border: "none", color: "#44445a", fontSize: 13, cursor: "pointer", padding: "4px", display: "flex", alignItems: "center", gap: 6, justifyContent: "center" }}>
                ← Назад
              </button>
            </div>
          )}
        </GlassCard>
      </motion.div>
    </div>
  );
}
