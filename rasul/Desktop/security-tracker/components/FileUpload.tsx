"use client";
import { sanitizeUrl } from "@/lib/sanitizeUrl";
import { useState, useRef } from "react";
import { Upload, X, Image, Film, FileText, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type UploadedFile = {
  id: string;
  url: string;
  fileName: string;
  fileType: string;
  fileSize: number;
};

export default function FileUpload({
  recordId,
  files = [],
  onUpload,
}: {
  recordId?: string;
  files?: UploadedFile[];
  onUpload?: (file: UploadedFile) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [localFiles, setLocalFiles] = useState<UploadedFile[]>(files);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(fileList: FileList) {
    setUploading(true);
    for (const file of Array.from(fileList)) {
      const fd = new FormData();
      fd.append("file", file);
      if (recordId) fd.append("recordId", recordId);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (res.ok) {
        const data: UploadedFile = await res.json();
        setLocalFiles(prev => [...prev, data]);
        onUpload?.(data);
      }
    }
    setUploading(false);
  }

  function removeLocal(id: string) {
    setLocalFiles(prev => prev.filter(f => f.id !== id));
  }

  function icon(type: string) {
    if (type.startsWith("image/")) return <Image size={14} className="text-blue-400" />;
    if (type.startsWith("video/")) return <Film size={14} className="text-purple-400" />;
    return <FileText size={14} className="text-white/40" />;
  }

  function formatSize(bytes: number) {
    if (bytes < 1024) return bytes + " Б";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " КБ";
    return (bytes / (1024 * 1024)).toFixed(1) + " МБ";
  }

  return (
    <div className="space-y-2">
      <label className="text-[10px] text-white/40 uppercase tracking-widest font-medium">Фото / Видео</label>

      {/* Drop zone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
        className="flex flex-col items-center justify-center gap-2 border border-dashed border-white/10 hover:border-white/25 rounded-xl py-5 cursor-pointer transition-all group"
      >
        {uploading ? (
          <Loader2 size={20} className="text-white/30 animate-spin" />
        ) : (
          <Upload size={20} className="text-white/20 group-hover:text-white/40 transition-colors" />
        )}
        <span className="text-xs text-white/25 group-hover:text-white/40 transition-colors">
          {uploading ? "Загрузка..." : "Нажмите или перетащите файлы"}
        </span>
        <span className="text-[10px] text-white/15">JPG, PNG, MP4, MOV и др.</span>
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*,video/*"
        className="hidden"
        onChange={e => e.target.files && handleFiles(e.target.files)}
      />

      {/* File list */}
      <AnimatePresence>
        {localFiles.map(f => (
          <motion.div
            key={f.id}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-2.5 bg-white/3 border border-white/6 rounded-xl px-3 py-2.5">
              {f.fileType.startsWith("image/") ? (
                <img src={f.url} alt={f.fileName} className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
              ) : (
                <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                  {icon(f.fileType)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs text-white/70 truncate">{f.fileName}</p>
                <p className="text-[10px] text-white/25">{formatSize(f.fileSize)}</p>
              </div>
              <a href={sanitizeUrl(f.url)} target="_blank" rel="noreferrer" className="text-[10px] text-white/30 hover:text-white/60 transition-colors px-2 py-1 rounded-lg hover:bg-white/5">
                Открыть
              </a>
              <button onClick={() => removeLocal(f.id)} className="text-white/20 hover:text-red-400 transition-colors p-1">
                <X size={13} />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
