import React, { useState, useEffect } from "react";
import { useTranslation } from "../i18n/LanguageContext";
import { desktopApi } from "../services/api";

export default function LocalHistoryDrawer({ isOpen, onClose, workspaceRoot, onWorkspaceMutated }) {
  const { t } = useTranslation();
  const [checkpoints, setCheckpoints] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [notice, setNotice] = useState(null);

  const fetchCheckpoints = async () => {
    if (!workspaceRoot) {
      setCheckpoints([]);
      return;
    }
    setLoading(true);
    try {
      const list = await desktopApi.getCheckpoints(workspaceRoot);
      setCheckpoints(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error("[LocalHistoryDrawer] fetchCheckpoints error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchCheckpoints();
      setNotice(null);
    }
  }, [isOpen, workspaceRoot]);

  const handleRevert = async (chkId) => {
    if (!workspaceRoot || !chkId || actionLoading) return;
    setActionLoading(chkId);
    try {
      const res = await desktopApi.revertCheckpoint(workspaceRoot, chkId);
      if (res?.success) {
        setNotice(t("history.restored_notice") || "Workspace files restored!");
        await fetchCheckpoints();
        if (onWorkspaceMutated) onWorkspaceMutated();
      } else {
        setNotice(`Error: ${res?.error || "Revert failed"}`);
      }
    } catch (err) {
      console.error("[LocalHistoryDrawer] handleRevert error:", err);
      setNotice(`Error: ${String(err)}`);
    } finally {
      setActionLoading(null);
      setTimeout(() => setNotice(null), 4000);
    }
  };

  const handleRedo = async (chkId) => {
    if (!workspaceRoot || !chkId || actionLoading) return;
    setActionLoading(chkId);
    try {
      const res = await desktopApi.redoCheckpoint(workspaceRoot, chkId);
      if (res?.success) {
        setNotice(t("history.redo_notice") || "Redo applied successfully!");
        await fetchCheckpoints();
        if (onWorkspaceMutated) onWorkspaceMutated();
      } else {
        setNotice(`Error: ${res?.error || "Redo failed"}`);
      }
    } catch (err) {
      console.error("[LocalHistoryDrawer] handleRedo error:", err);
      setNotice(`Error: ${String(err)}`);
    } finally {
      setActionLoading(null);
      setTimeout(() => setNotice(null), 4000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-md h-full bg-[#121215] border-l border-[#27272a] shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-200">
        <div className="px-5 py-4 border-b border-[#27272a] flex items-center justify-between bg-[#18181b]/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#3b82f6]/10 border border-[#3b82f6]/20 flex items-center justify-center text-[#3b82f6]">
              <i className="fa-solid fa-clock-rotate-left text-sm"></i>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[#f4f4f5]">
                {t("history.title")}
              </h2>
              <p className="text-[11px] text-[#71717a]">
                {t("history.subtitle")}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-md hover:bg-[#27272a] text-[#71717a] hover:text-[#f4f4f5] flex items-center justify-center transition-colors cursor-pointer"
            title={t("history.close")}
          >
            <i className="fa-solid fa-xmark text-sm"></i>
          </button>
        </div>

        {notice && (
          <div className={`mx-4 mt-3 px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 border ${
            notice.startsWith("Error")
              ? "bg-[#ef4444]/10 text-[#f87171] border-[#ef4444]/20"
              : "bg-[#10b981]/10 text-[#34d399] border-[#10b981]/20"
          }`}>
            <i className={notice.startsWith("Error") ? "fa-solid fa-triangle-exclamation" : "fa-solid fa-circle-check"}></i>
            <span className="flex-1">{notice}</span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 custom-scrollbar">
          {loading ? (
            <div className="h-40 flex items-center justify-center text-xs text-[#71717a] gap-2">
              <i className="fa-solid fa-spinner animate-spin text-[#3b82f6]"></i>
              <span>Loading checkpoints...</span>
            </div>
          ) : checkpoints.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center px-4">
              <div className="w-12 h-12 rounded-full bg-[#1e1e24] flex items-center justify-center text-[#52525b] mb-3">
                <i className="fa-solid fa-clock-rotate-left text-lg"></i>
              </div>
              <p className="text-xs font-medium text-[#a1a1aa] mb-1">
                {t("history.empty")}
              </p>
              <p className="text-[11px] text-[#71717a] max-w-[240px]">
                Pre-mutation shadow snapshots are automatically captured whenever the agent modifies files.
              </p>
            </div>
          ) : (
            checkpoints.map((chk, idx) => {
              const fileEntries = Object.entries(chk.files || {});
              const isReverted = Boolean(chk.is_reverted);
              const hasRedo = Boolean(chk.redo_state?.files);
              const isLoadingThis = actionLoading === chk.id;

              return (
                <div
                  key={chk.id || idx}
                  className={`p-3.5 rounded-xl border transition-all ${
                    isReverted
                      ? "bg-[#18181b]/40 border-[#3f3f46]/40 opacity-80"
                      : "bg-[#18181b] border-[#27272a] hover:border-[#3f3f46]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-mono text-[#71717a]">
                      {chk.created_at || "Recent"}
                    </span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-medium ${
                      isReverted
                        ? "bg-[#f59e0b]/10 text-[#fbbf24] border-[#f59e0b]/20"
                        : "bg-[#3b82f6]/10 text-[#60a5fa] border-[#3b82f6]/20"
                    }`}>
                      {isReverted ? t("history.reverted_tag") : t("history.active_tag")}
                    </span>
                  </div>

                  <p className="text-xs font-medium text-[#f4f4f5] line-clamp-2 mb-2.5">
                    {chk.prompt || "Workspace mutation"}
                  </p>

                  {fileEntries.length > 0 && (
                    <div className="space-y-1 mb-3">
                      <div className="text-[10px] uppercase font-semibold tracking-wider text-[#71717a]">
                        {fileEntries.length} {t("history.files_affected")}
                      </div>
                      <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                        {fileEntries.map(([fpath, meta], fidx) => (
                          <span
                            key={fidx}
                            className={`text-[10px] font-mono px-1.5 py-0.5 rounded border flex items-center gap-1 ${
                              meta.action === "create"
                                ? "bg-[#10b981]/10 text-[#34d399] border-[#10b981]/25"
                                : "bg-[#3b82f6]/10 text-[#93c5fd] border-[#3b82f6]/25"
                            }`}
                          >
                            <span>{meta.action === "create" ? "+" : "~"}</span>
                            <span>{fpath}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-2 border-t border-[#27272a]/60">
                    <button
                      type="button"
                      disabled={isLoadingThis || isReverted}
                      onClick={() => handleRevert(chk.id)}
                      className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                        isReverted
                          ? "bg-[#27272a]/40 text-[#71717a] cursor-not-allowed"
                          : "bg-[#27272a] hover:bg-[#3f3f46] text-[#f4f4f5]"
                      }`}
                    >
                      {isLoadingThis ? (
                        <i className="fa-solid fa-spinner animate-spin text-[10px]"></i>
                      ) : (
                        <i className="fa-solid fa-rotate-left text-[10px]"></i>
                      )}
                      <span>{t("history.revert")}</span>
                    </button>

                    {hasRedo && (
                      <button
                        type="button"
                        disabled={isLoadingThis || !isReverted}
                        onClick={() => handleRedo(chk.id)}
                        className={`py-1.5 px-3 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                          !isReverted
                            ? "bg-[#27272a]/40 text-[#71717a] cursor-not-allowed"
                            : "bg-[#3b82f6] hover:bg-[#2563eb] text-white"
                        }`}
                      >
                        {isLoadingThis ? (
                          <i className="fa-solid fa-spinner animate-spin text-[10px]"></i>
                        ) : (
                          <i className="fa-solid fa-rotate-right text-[10px]"></i>
                        )}
                        <span>{t("history.redo")}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
