"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface FaceCheckModalProps {
  userLogin: string;
  userName: string;
  userId?: string;
  city?: string;
  companyId?: string;
  checkType?: "login" | "periodic";
  onSuccess: (photoUrl: string) => void;
  onCancel?: () => void;
  canCancel?: boolean;
}

const FACE_CHECK_INTERVAL_MS = 3 * 60 * 60 * 1000; // 3 часа
const STORAGE_KEY = (login: string) => `face_check_last_${login}`;

export function shouldRequireFaceCheck(userLogin: string): boolean {
  if (typeof window === "undefined") return false;
  const raw = localStorage.getItem(STORAGE_KEY(userLogin));
  if (!raw) return true;
  const last = parseInt(raw, 10);
  if (isNaN(last)) return true;
  return Date.now() - last >= FACE_CHECK_INTERVAL_MS;
}

export function markFaceCheckDone(userLogin: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY(userLogin), String(Date.now()));
  }
}

export function FaceCheckModal({
  userLogin,
  userName,
  userId,
  city = "",
  companyId = "",
  checkType = "login",
  onSuccess,
  onCancel,
  canCancel = false,
}: FaceCheckModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [phase, setPhase] = useState<"camera" | "preview" | "uploading" | "done" | "error">("camera");
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [cameraError, setCameraError] = useState("");
  const [countdown, setCountdown] = useState<number | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [cameraReady, setCameraReady] = useState(false);

  const startCamera = useCallback(async (mode: "user" | "environment") => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      setCameraReady(false);
      setCameraError("");

      // Check HTTPS requirement (required by modern browsers, except localhost)
      if (typeof window !== "undefined") {
        const isSecure = window.isSecureContext || window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
        if (!isSecure) {
          setCameraError("Для доступа к камере требуется HTTPS. Обратитесь к администратору для настройки SSL.");
          return;
        }
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError("Ваш браузер не поддерживает доступ к камере. Используйте Chrome, Safari или Firefox.");
        return;
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: mode }, width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
      } catch (e) {
        // Fallback: any camera
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }

      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) return;

      video.srcObject = stream;
      video.setAttribute("playsinline", "true");
      video.setAttribute("webkit-playsinline", "true");
      video.muted = true;

      const onReady = () => {
        video.play().then(() => setCameraReady(true)).catch(() => {
          // Autoplay blocked — user gesture needed
          setCameraReady(true);
        });
      };

      if (video.readyState >= 2) {
        onReady();
      } else {
        video.oncanplay = onReady;
        video.onloadedmetadata = onReady;
      }
    } catch (err: any) {
      const msg = err?.name === "NotAllowedError"
        ? "Доступ к камере запрещён. Разрешите в настройках браузера."
        : err?.name === "NotFoundError"
        ? "Камера не найдена на устройстве."
        : err?.name === "NotReadableError"
        ? "Камера занята другим приложением."
        : "Не удалось открыть камеру. Попробуйте перезагрузить страницу.";
      setCameraError(msg);
    }
  }, []);

  useEffect(() => {
    startCamera(facingMode);
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, [facingMode, startCamera]);

  const takePhoto = () => {
    if (!videoRef.current || !canvasRef.current || !cameraReady) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // Mirror if front camera
    if (facingMode === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) return;
      setPhotoBlob(blob);
      setPhotoDataUrl(canvas.toDataURL("image/jpeg", 0.85));
      setPhase("preview");
      streamRef.current?.getTracks().forEach(t => t.stop());
    }, "image/jpeg", 0.85);
  };

  const startCountdown = () => {
    setCountdown(3);
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          setCountdown(null);
          takePhoto();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const retake = () => {
    setPhotoDataUrl(null);
    setPhotoBlob(null);
    setPhase("camera");
    startCamera(facingMode);
  };

  const submitPhoto = async () => {
    if (!photoBlob) return;
    setPhase("uploading");
    try {
      const formData = new FormData();
      formData.append("photo", photoBlob, `face_${Date.now()}.jpg`);
      formData.append("userLogin", userLogin);
      formData.append("userName", userName);
      if (userId) formData.append("userId", userId);
      formData.append("checkType", checkType);
      formData.append("city", city);
      formData.append("companyId", companyId);

      const res = await fetch("/api/face-check", { method: "POST", body: formData });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Ошибка загрузки");
      }
      const data = await res.json();
      markFaceCheckDone(userLogin);
      setPhase("done");
      setTimeout(() => onSuccess(data.photoUrl), 1200);
    } catch (err: any) {
      setErrorMsg(err.message || "Ошибка. Попробуйте ещё раз.");
      setPhase("error");
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)",
      backdropFilter: "blur(12px)", zIndex: 200,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 16,
    }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 280, damping: 26 }}
        style={{
          width: "100%", maxWidth: 420,
          background: "rgba(14,14,24,0.98)",
          border: "1px solid rgba(79,142,247,0.2)",
          borderRadius: 28,
          boxShadow: "0 32px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(79,142,247,0.08)",
          overflowY: "auto", maxHeight: "90dvh",
        }}
      >
        {/* Header */}
        <div style={{
          padding: "20px 24px 16px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          display: "flex", alignItems: "center", gap: 14,
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 14,
            background: "linear-gradient(145deg, #4f8ef7, #2563eb)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 22, flexShrink: 0,
            boxShadow: "0 6px 20px rgba(79,142,247,0.35)",
          }}>📷</div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#f0f0f8", letterSpacing: "-0.01em" }}>
              {checkType === "login" ? "Фото-верификация входа" : "Проверка присутствия"}
            </div>
            <div style={{ fontSize: 12, color: "#55556a", marginTop: 2 }}>
              {checkType === "login"
                ? `Привет, ${userName}! Сделайте селфи для входа`
                : `Каждые 3 часа требуется фото-подтверждение`}
            </div>
          </div>
          {canCancel && onCancel && (
            <button onClick={onCancel} style={{
              marginLeft: "auto", background: "none", border: "none",
              color: "#44445a", cursor: "pointer", fontSize: 22, lineHeight: 1,
            }}>×</button>
          )}
        </div>

        <div style={{ padding: "20px 24px 24px" }}>

          {/* === CAMERA PHASE === */}
          {(phase === "camera") && (
            <div>
              {cameraError ? (
                <div style={{
                  borderRadius: 18, background: "rgba(230,57,70,0.08)",
                  border: "1px solid rgba(230,57,70,0.22)",
                  padding: "24px", textAlign: "center", marginBottom: 16,
                }}>
                  <div style={{ fontSize: 36, marginBottom: 10 }}>📵</div>
                  <p style={{ fontSize: 14, color: "#f87171", margin: 0 }}>{cameraError}</p>
                </div>
              ) : (
                <div style={{ position: "relative", borderRadius: 18, overflow: "hidden", marginBottom: 16, background: "#000", aspectRatio: "4/3" }}>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{
                      width: "100%", height: "100%", objectFit: "cover",
                      transform: facingMode === "user" ? "scaleX(-1)" : "none",
                    }}
                  />
                  {/* Face guide overlay */}
                  <div style={{
                    position: "absolute", inset: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    pointerEvents: "none",
                  }}>
                    <div style={{
                      width: "55%", aspectRatio: "3/4",
                      border: "2px solid rgba(79,142,247,0.6)",
                      borderRadius: "50% / 45%",
                      boxShadow: "0 0 0 2000px rgba(0,0,0,0.35)",
                    }} />
                  </div>

                  {/* Countdown */}
                  <AnimatePresence>
                    {countdown !== null && (
                      <motion.div
                        key={countdown}
                        initial={{ scale: 1.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.5, opacity: 0 }}
                        style={{
                          position: "absolute", inset: 0,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 80, fontWeight: 900, color: "white",
                          textShadow: "0 4px 20px rgba(0,0,0,0.8)",
                          background: "rgba(0,0,0,0.3)",
                        }}
                      >{countdown}</motion.div>
                    )}
                  </AnimatePresence>

                  {!cameraReady && (
                    <div style={{
                      position: "absolute", inset: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: "rgba(0,0,0,0.6)",
                    }}>
                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        style={{ width: 32, height: 32, border: "3px solid rgba(79,142,247,0.3)", borderTopColor: "#4f8ef7", borderRadius: "50%" }} />
                    </div>
                  )}
                </div>
              )}

              <p style={{ fontSize: 12, color: "#44445a", textAlign: "center", marginBottom: 14 }}>
                Расположите лицо в овале и нажмите кнопку
              </p>

              <div style={{ display: "flex", gap: 10 }}>
                <motion.button
                  onClick={() => setFacingMode(m => m === "user" ? "environment" : "user")}
                  whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  style={{
                    width: 46, height: 46, borderRadius: 14, flexShrink: 0,
                    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                    cursor: "pointer", fontSize: 20, display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >🔄</motion.button>

                <motion.button
                  onClick={startCountdown}
                  disabled={!cameraReady || countdown !== null || !!cameraError}
                  whileHover={cameraReady ? { scale: 1.02, y: -2 } : {}}
                  whileTap={cameraReady ? { scale: 0.97 } : {}}
                  style={{
                    flex: 1, height: 46,
                    background: cameraReady && !cameraError
                      ? "linear-gradient(135deg, #4f8ef7, #2563eb)"
                      : "rgba(80,80,100,0.4)",
                    border: "none", borderRadius: 14,
                    color: "white", fontSize: 15, fontWeight: 700,
                    cursor: cameraReady && !cameraError ? "pointer" : "not-allowed",
                    boxShadow: cameraReady ? "0 6px 20px rgba(79,142,247,0.4)" : "none",
                  }}
                >
                  {countdown !== null ? `Съёмка через ${countdown}...` : "📸 Сделать фото"}
                </motion.button>
              </div>
            </div>
          )}

          {/* === PREVIEW PHASE === */}
          {phase === "preview" && photoDataUrl && (
            <div>
              <div style={{ position: "relative", borderRadius: 18, overflow: "hidden", marginBottom: 16, aspectRatio: "4/3" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photoDataUrl} alt="Фото" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                <div style={{
                  position: "absolute", bottom: 10, left: "50%", transform: "translateX(-50%)",
                  background: "rgba(14,14,24,0.8)", borderRadius: 20,
                  padding: "6px 14px", fontSize: 12, color: "#aaa",
                }}>Проверьте фото</div>
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <motion.button onClick={retake} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  style={{
                    flex: 1, padding: "13px",
                    background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 14, fontSize: 14, color: "#aaa", cursor: "pointer",
                  }}>
                  ↩ Переснять
                </motion.button>
                <motion.button onClick={submitPhoto} whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.97 }}
                  style={{
                    flex: 2, padding: "13px",
                    background: "linear-gradient(135deg, #22c55e, #16a34a)",
                    border: "none", borderRadius: 14,
                    fontSize: 14, fontWeight: 700, color: "white", cursor: "pointer",
                    boxShadow: "0 6px 20px rgba(34,197,94,0.35)",
                  }}>
                  ✓ Отправить фото
                </motion.button>
              </div>
            </div>
          )}

          {/* === UPLOADING === */}
          {phase === "uploading" && (
            <div style={{ textAlign: "center", padding: "32px 0" }}>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                style={{
                  width: 56, height: 56, margin: "0 auto 16px",
                  border: "4px solid rgba(79,142,247,0.2)", borderTopColor: "#4f8ef7",
                  borderRadius: "50%",
                }}
              />
              <p style={{ fontSize: 15, color: "#f0f0f8", fontWeight: 600 }}>Отправляем фото...</p>
              <p style={{ fontSize: 12, color: "#44445a", marginTop: 6 }}>Это займёт секунду</p>
            </div>
          )}

          {/* === DONE === */}
          {phase === "done" && (
            <div style={{ textAlign: "center", padding: "32px 0" }}>
              <motion.div
                initial={{ scale: 0 }} animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                style={{
                  width: 72, height: 72, borderRadius: "50%",
                  background: "linear-gradient(145deg, #22c55e, #16a34a)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 36, margin: "0 auto 16px",
                  boxShadow: "0 12px 36px rgba(34,197,94,0.4)",
                }}
              >✓</motion.div>
              <p style={{ fontSize: 16, color: "#f0f0f8", fontWeight: 700 }}>Верификация пройдена!</p>
              <p style={{ fontSize: 12, color: "#55556a", marginTop: 6 }}>Фото отправлено администратору</p>
            </div>
          )}

          {/* === ERROR === */}
          {phase === "error" && (
            <div style={{ textAlign: "center", padding: "24px 0" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
              <p style={{ fontSize: 15, color: "#f87171", fontWeight: 600, marginBottom: 6 }}>Ошибка</p>
              <p style={{ fontSize: 13, color: "#55556a", marginBottom: 20 }}>{errorMsg}</p>
              <motion.button onClick={() => { setPhase("camera"); startCamera(facingMode); }}
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                style={{
                  padding: "12px 28px",
                  background: "linear-gradient(135deg, #4f8ef7, #2563eb)",
                  border: "none", borderRadius: 14,
                  fontSize: 14, fontWeight: 700, color: "white", cursor: "pointer",
                }}>
                Попробовать снова
              </motion.button>
            </div>
          )}

        </div>
      </motion.div>

      {/* Hidden canvas for capture */}
      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  );
}
