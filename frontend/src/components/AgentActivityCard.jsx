import React, { useState, useEffect } from "react";
import { desktopApi } from "../services/api";

function AnimatedAgentOutput({ text, animate }) {
  const [displayed, setDisplayed] = useState(animate ? "" : text);

  useEffect(() => {
    try {
      if (!text) {
        setDisplayed("");
        return;
      }
      if (!animate) {
        setDisplayed(text);
        return;
      }
      setDisplayed("");
      let currentIdx = 0;
      const interval = setInterval(() => {
        currentIdx += 3;
        if (currentIdx >= text.length) {
          setDisplayed(text);
          clearInterval(interval);
        } else {
          setDisplayed(text.slice(0, currentIdx));
        }
      }, 20);
      return () => clearInterval(interval);
    } catch (err) {
      console.error("[AnimatedAgentOutput] Error:", err);
      setDisplayed(text || "");
    }
  }, [text, animate]);

  return (
    <div className="font-mono text-[11px] text-[#cbd5e1] leading-relaxed break-words whitespace-pre-wrap">
      <span>{displayed}</span>
      {animate && displayed.length < (text?.length || 0) && (
        <span className="inline-block w-1.5 h-3 ml-1 bg-[#3b82f6] animate-pulse align-middle" />
      )}
    </div>
  );
}

export default function AgentActivityCard({
  isRunning,
  isInterrupted,
  currentStage,
  plan,
  actions,
  onCancel,
  onDismiss,
  projectName,
  onApproveCommand,
  onRejectCommand,
  onContinueAnyway,
  approvingStepId
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    let timer = null;
    if (isRunning) {
      setIsExpanded(true);
      setElapsedSeconds(0);
      timer = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isRunning]);

  if (!isRunning && !isInterrupted && !plan && (!actions || actions.length === 0)) {
    return null;
  }

  const allSteps = plan?.steps || [];
  const hasError = allSteps.some((s) => s.status === "error");

  return (
    <div className="w-full rounded-2xl border border-[#27272a] bg-[#161619] sm:bg-[#18181b]/80 text-[#f4f4f5] overflow-hidden mb-3 select-none">
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-[#202025]/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="font-medium text-[13px] text-[#f4f4f5]">
            {isRunning ? "Thinking..." : "Thinking"}
          </span>
          {isRunning && (
            <span className="flex items-center gap-1.5 text-xs text-[#94a3b8] font-mono ml-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#3b82f6] animate-pulse"></span>
              <span className="text-[11px] text-[#71717a]">{elapsedSeconds}s</span>
            </span>
          )}
          {hasError && (
            <span className="text-[11px] font-medium text-[#f87171] ml-1">
              • Diagnostic
            </span>
          )}
          {isInterrupted && (
            <span className="text-[11px] font-medium text-[#fbbf24] ml-1">
              • Interrupted
            </span>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          {isRunning && onCancel && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onCancel();
              }}
              className="text-[11px] text-[#f87171] hover:text-[#ef4444] px-2.5 py-0.5 rounded border border-[#ef4444]/30 hover:bg-[#ef4444]/10 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <i className="fa-solid fa-square text-[8px]"></i>
              <span>Stop</span>
            </button>
          )}

          <button
            type="button"
            className="text-[#94a3b8] hover:text-[#f8fafc] p-1 transition-colors cursor-pointer"
            aria-label="Toggle thinking"
          >
            <i className={`fa-solid fa-chevron-up text-xs transition-transform duration-200 ${isExpanded ? "" : "rotate-180"}`}></i>
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="px-4 pb-4 pt-1 space-y-3.5">
          {allSteps.map((st, idx) => {
            const isRunningStep = st.status === "running";
            const isDoneStep = st.status === "done";
            const isInterruptedStep = st.status === "interrupted";
            const isErrorStep = st.status === "error";
            const cmdInfo = st.pending_command;

            return (
              <div key={st.id || idx} className="space-y-1.5">
                <div className="flex items-start gap-3">
                  <div className="w-4 pt-0.5 flex-shrink-0 flex items-center justify-center">
                    {isDoneStep ? (
                      <i className="fa-solid fa-check text-xs text-[#a1a1aa]"></i>
                    ) : isRunningStep ? (
                      <span className="w-2.5 h-2.5 rounded-full bg-[#3b82f6] shadow-[0_0_8px_rgba(59,130,246,0.8)] animate-pulse"></span>
                    ) : isErrorStep ? (
                      <i className="fa-solid fa-circle-exclamation text-xs text-[#ef4444]"></i>
                    ) : isInterruptedStep ? (
                      <i className="fa-solid fa-circle-pause text-xs text-[#f59e0b]"></i>
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-[#3f3f46]"></span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className={`text-[13px] font-medium leading-snug ${isDoneStep ? "text-[#f4f4f5]" : isRunningStep ? "text-[#f8fafc]" : isErrorStep ? "text-[#fca5a5]" : "text-[#71717a]"}`}>
                      {st.title || st.description}
                    </div>
                    {(st.subtitle || st.description) && (
                      <div className="text-xs text-[#94a3b8] leading-relaxed mt-0.5">
                        {st.subtitle || st.description}
                      </div>
                    )}

                    {isRunningStep && st.output && (
                      <div className="mt-1.5 p-2 rounded-lg bg-[#111114] border border-[#222226]">
                        <AnimatedAgentOutput text={st.output} animate={isRunningStep} />
                      </div>
                    )}
                  </div>
                </div>

                {cmdInfo && (
                  <div className="ml-7 mt-2 p-3 rounded-xl bg-[#0f0f13] border border-[#26262b] shadow-inner space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="flex items-center gap-1.5 text-[#eab308]">
                        <i className="fa-solid fa-shield-halved text-[9px]"></i>
                        <span>Terminal Command Approval</span>
                      </span>
                      {cmdInfo.display_cwd && (
                        <span className="px-1.5 py-0.5 rounded bg-[#18181c] border border-[#27272a] text-[#a1a1aa]">
                          cwd: {cmdInfo.display_cwd}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 p-2 rounded-lg bg-[#141417] border border-[#222226] font-mono text-[11px] text-[#38bdf8] select-text">
                      <span className="text-[#64748b]">$</span>
                      <span className="font-semibold">{cmdInfo.command}</span>
                    </div>

                    {cmdInfo.execution_output && (
                      <div className="p-2.5 rounded-lg bg-[#050506] border border-[#202024] font-mono text-[11px] text-[#a1a1aa] whitespace-pre-wrap max-h-40 overflow-y-auto custom-scrollbar">
                        {cmdInfo.execution_output}
                      </div>
                    )}

                    {st.inspector_diagnosis && (
                      <div className="w-full p-2.5 rounded-lg bg-[#181414] border border-[#ef4444]/40 text-[#fca5a5] text-[11px] space-y-1.5">
                        <div className="flex items-center gap-1.5 font-semibold text-[#f87171]">
                          <i className="fa-solid fa-user-shield text-[10px]"></i>
                          <span>Inspector Agent Diagnosis</span>
                        </div>
                        <p className="text-[#cbd5e1]">{st.inspector_diagnosis}</p>
                        {st.inspector_fix && (
                          <div className="mt-2 flex items-center justify-between gap-2 pt-1.5 border-t border-[#ef4444]/20">
                            <code className="text-[10px] text-[#38bdf8] font-mono truncate">{st.inspector_fix}</code>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onApproveCommand) {
                                  onApproveCommand({ ...cmdInfo, command: st.inspector_fix }, st.id);
                                }
                              }}
                              className="px-2.5 py-1 rounded bg-[#3b82f6] hover:bg-[#2563eb] text-white text-[10px] font-medium flex-shrink-0 transition-colors cursor-pointer"
                            >
                              Apply Inspector Fix
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {cmdInfo.exit_code !== undefined && !cmdInfo.pending_approval && (
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {cmdInfo.exit_code === 0 ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#10b981]/15 border border-[#10b981]/30 text-[#10b981] text-[10px] font-mono font-medium">
                            <i className="fa-solid fa-check text-[9px]"></i>
                            <span>Execution Verified (Exit 0)</span>
                          </span>
                        ) : (
                          <>
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#ef4444]/15 border border-[#ef4444]/30 text-[#f87171] text-[10px] font-mono font-medium">
                              <i className="fa-solid fa-triangle-exclamation text-[9px]"></i>
                              <span>Failed (Exit code: {cmdInfo.exit_code})</span>
                            </span>
                            {onContinueAnyway && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onContinueAnyway(st.id);
                                }}
                                className="px-2.5 py-1 rounded bg-[#3b82f6]/20 hover:bg-[#3b82f6]/30 border border-[#3b82f6]/40 text-[#60a5fa] text-[11px] font-medium transition-colors cursor-pointer"
                              >
                                <span>Proceed Anyway</span>
                              </button>
                            )}
                            {onApproveCommand && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onApproveCommand(cmdInfo, st.id);
                                }}
                                className="px-2.5 py-1 rounded bg-[#27272a] hover:bg-[#3f3f46] text-[#cbd5e1] text-[11px] font-medium transition-colors cursor-pointer"
                              >
                                <span>Retry</span>
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    )}

                    {cmdInfo.pending_approval && onApproveCommand && (
                      <div className="flex items-center gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
                        {approvingStepId === st.id ? (
                          <button
                            type="button"
                            onClick={async (e) => {
                              e.stopPropagation();
                              try {
                                await desktopApi.stopCommand();
                              } catch (err) {
                                console.error("[AgentActivityCard] Stop command error:", err);
                              }
                            }}
                            className="px-3.5 py-1.5 rounded-lg bg-[#ef4444] hover:bg-[#dc2626] text-white font-medium text-xs flex items-center gap-1.5 shadow transition-colors cursor-pointer"
                          >
                            <i className="fa-solid fa-stop text-[9px]"></i>
                            <span>Stop Execution</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={Boolean(approvingStepId)}
                            onClick={(e) => {
                              e.stopPropagation();
                              onApproveCommand(cmdInfo, st.id);
                            }}
                            className="px-3.5 py-1.5 rounded-lg bg-[#10b981] hover:bg-[#059669] text-white font-medium text-xs flex items-center gap-1.5 shadow transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <i className="fa-solid fa-play text-[9px]"></i>
                            <span>Approve & Run</span>
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={approvingStepId === st.id || Boolean(approvingStepId)}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onRejectCommand) onRejectCommand(cmdInfo, st.id);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-[#27272a] hover:bg-[#3f3f46] text-[#cbd5e1] text-xs font-medium transition-colors cursor-pointer disabled:opacity-40"
                        >
                          <span>Skip</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}