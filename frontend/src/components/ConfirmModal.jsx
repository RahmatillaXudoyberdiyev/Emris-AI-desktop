import React, { useEffect } from "react";
import { useTranslation } from "../i18n/LanguageContext";

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel
}) {
  const { t } = useTranslation();

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      try {
        if (e.key === "Escape") {
          onCancel();
        }
      } catch (err) {
        console.error("[ConfirmModal] Escape error:", err);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-in fade-in">
      <div className="bg-[#1c1c1f] border border-[#2e2e32] w-full max-w-sm rounded-2xl shadow-2xl p-5 space-y-4 text-xs text-[#F9F9FA]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#ef4444]/15 border border-[#ef4444]/30 flex items-center justify-center flex-shrink-0 text-[#ef4444]">
            <i className="fa-solid fa-trash-can text-sm"></i>
          </div>
          <div>
            <h3 className="font-semibold text-sm text-[#F9F9FA]">
              {title || t("modal.confirm_title")}
            </h3>
            <p className="text-[#94a3b8] text-[11px] mt-0.5 leading-relaxed">
              {message}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#26262a]">
          <button
            type="button"
            onClick={onCancel}
            className="px-3.5 py-1.5 rounded-xl bg-[#1e1e22] hover:bg-[#28282c] text-[#D1D1D6] hover:text-[#F9F9FA] text-xs font-medium transition-colors cursor-pointer"
          >
            {cancelLabel || t("modal.cancel")}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-3.5 py-1.5 rounded-xl bg-[#ef4444] hover:bg-[#dc2626] text-white text-xs font-semibold shadow-md transition-colors cursor-pointer"
          >
            {confirmLabel || t("modal.delete")}
          </button>
        </div>
      </div>
    </div>
  );
}
