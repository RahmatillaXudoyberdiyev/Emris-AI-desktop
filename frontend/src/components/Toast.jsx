import React, { useEffect } from "react";

export default function Toast({ message, type = "info", onClose }) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      try {
        if (onClose) onClose();
      } catch (err) {
        console.error("[Toast] Auto dismiss error:", err);
      }
    }, 3200);
    return () => clearTimeout(timer);
  }, [message, onClose]);

  if (!message) return null;

  const isError = type === "error";
  const isSuccess = type === "success";

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl bg-[#1c1c1f] border border-[#2e2e32] shadow-2xl text-xs text-[#F9F9FA] select-none transition-all animate-in fade-in slide-in-from-bottom-2">
      <div className="flex-shrink-0">
        {isError && <i className="fa-solid fa-circle-exclamation text-[#ef4444] text-sm"></i>}
        {isSuccess && <i className="fa-solid fa-circle-check text-[#10b981] text-sm"></i>}
        {!isError && !isSuccess && <i className="fa-solid fa-circle-info text-[#60a5fa] text-sm"></i>}
      </div>
      <span className="font-medium max-w-xs">{message}</span>
      <button
        type="button"
        onClick={onClose}
        className="text-[#64748b] hover:text-[#F9F9FA] p-1 rounded-lg transition-colors cursor-pointer ml-1"
      >
        <i className="fa-solid fa-xmark text-xs"></i>
      </button>
    </div>
  );
}
