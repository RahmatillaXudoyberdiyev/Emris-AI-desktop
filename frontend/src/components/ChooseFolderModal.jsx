import React, { useState, useEffect } from "react";
import { useTranslation } from "../i18n/LanguageContext";
import { desktopApi } from "../services/api";

export default function ChooseFolderModal({ isOpen, onClose, onSelectFolder }) {
  const { t } = useTranslation();
  const [projectName, setProjectName] = useState("");
  const [folderPath, setFolderPath] = useState("");
  const [hasUserTypedName, setHasUserTypedName] = useState(false);
  const [isBrowsing, setIsBrowsing] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      try {
        if (e.key === "Escape") {
          onClose();
        }
      } catch (err) {
        console.error("[Modal] Escape key error:", err);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleBrowse = async () => {
    try {
      setIsBrowsing(true);
      const selected = await desktopApi.chooseFolder();
      if (selected) {
        setFolderPath(selected);
        if (!hasUserTypedName || !projectName.trim()) {
          const cleanPath = selected.replace(/[\\/]+$/, "");
          const parts = cleanPath.replace(/\\/g, "/").split("/");
          const folderBaseName = parts[parts.length - 1] || "My Project";
          setProjectName(folderBaseName);
        }
      }
    } catch (err) {
      console.error("[Modal] Browse folder error:", err);
    } finally {
      setIsBrowsing(false);
    }
  };

  const handleConfirm = () => {
    try {
      const finalName = projectName.trim() || "New Project";
      const finalPath = folderPath.trim() || "D:\\Projects\\" + finalName;
      if (onSelectFolder) {
        onSelectFolder(finalName, finalPath);
      }
      setProjectName("");
      setFolderPath("");
      setHasUserTypedName(false);
      onClose();
    } catch (error) {
      console.error("[Modal] Confirm error:", error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="bg-[#1c1c1f] border border-[#2e2e32] rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 text-[#F9F9FA]">
        <div className="flex items-center justify-between border-b border-[#26262a] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#2563eb]/20 border border-[#2563eb]/30 flex items-center justify-center text-[#60a5fa]">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 4h18v4H3z" />
                <path d="M4 8v12a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V8" />
                <path d="M10 12h4" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#F9F9FA]">{t("folder_modal.title")}</h3>
              <p className="text-[11px] text-[#94a3b8]">{t("folder_modal.privacy_note")}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#94a3b8] hover:text-[#F9F9FA] p-1.5 rounded-lg hover:bg-[#222226] transition-colors cursor-pointer"
          >
            <i className="fa-solid fa-xmark text-sm"></i>
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <label className="block text-[11px] font-semibold text-[#D1D1D6] mb-1">
              {t("folder_modal.project_name")}
            </label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => {
                setProjectName(e.target.value);
                setHasUserTypedName(true);
              }}
              placeholder={t("folder_modal.project_name_placeholder")}
              className="w-full bg-[#141416] border border-[#2e2e32] rounded-xl px-3 py-2 text-[#F9F9FA] placeholder-[#64748b] focus:outline-none focus:border-[#2563eb]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#D1D1D6] mb-1">
              {t("folder_modal.folder_path")}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={folderPath}
                onChange={(e) => setFolderPath(e.target.value)}
                placeholder={t("folder_modal.folder_path_placeholder")}
                className="flex-1 bg-[#141416] border border-[#2e2e32] rounded-xl px-3 py-2 text-[#F9F9FA] text-xs focus:outline-none focus:border-[#2563eb]"
              />
              <button
                type="button"
                onClick={handleBrowse}
                disabled={isBrowsing}
                className="px-3 py-2 rounded-xl bg-[#1e1e22] hover:bg-[#28282c] border border-[#2e2e32] text-[#F9F9FA] text-xs font-medium transition-colors cursor-pointer flex-shrink-0 disabled:opacity-50 flex items-center gap-1.5"
              >
                {isBrowsing && <i className="fa-solid fa-spinner fa-spin text-xs text-[#2563eb]"></i>}
                <span>{isBrowsing ? "..." : t("folder_modal.browse")}</span>
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#26262a]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#1e1e22] hover:bg-[#28282c] text-[#D1D1D6] hover:text-[#F9F9FA] text-xs font-medium transition-colors cursor-pointer"
          >
            {t("folder_modal.cancel")}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-4 py-2 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-[#ffffff] text-xs font-semibold shadow-md transition-colors cursor-pointer"
          >
            {t("folder_modal.create")}
          </button>
        </div>
      </div>
    </div>
  );
}
