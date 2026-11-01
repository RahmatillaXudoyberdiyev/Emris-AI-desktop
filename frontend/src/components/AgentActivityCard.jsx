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

function renderStepActionPill(title, st) {
  const t = title || "";
  const low = t.toLowerCase();

  if (low.startsWith("analyzed") || low.startsWith("read") || st.agent === "File analyzer Agent") {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#3b82f6]/15 border border-[#3b82f6]/30 text-[#60a5fa] text-[10px] font-mono font-medium">
        <i className="fa-solid fa-code text-[9px]"></i>
        <span>Analyzed</span>
      </span>
    );
  }
  if (low.startsWith("edited") || low.startsWith("auto-patch") || low.startsWith("fixed") || low.startsWith("sanitized") || low.startsWith("patch")) {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#10b981]/15 border border-[#10b981]/30 text-[#34d399] text-[10px] font-mono font-medium">
        <i className="fa-solid fa-pen text-[9px]"></i>
        <span>Edited</span>
      </span>
    );
  }
  if (low.startsWith("created") || low.startsWith("synthesize") || low.startsWith("write")) {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#06b6d4]/15 border border-[#06b6d4]/30 text-[#22d3ee] text-[10px] font-mono font-medium">
        <i className="fa-solid fa-file-circle-plus text-[9px]"></i>
        <span>Created</span>
      </span>
    );
  }
  if (low.startsWith("ran") || low.startsWith("re-run") || low.startsWith("execute") || st.pending_command) {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#8b5cf6]/15 border border-[#8b5cf6]/30 text-[#a78bfa] text-[10px] font-mono font-medium">
        <i className="fa-solid fa-terminal text-[9px]"></i>
        <span>Ran</span>
      </span>
    );
  }
  if (low.startsWith("thought") || low.startsWith("understanding") || low.startsWith("structuring")) {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#71717a]/15 border border-[#71717a]/30 text-[#a1a1aa] text-[10px] font-mono font-medium">
        <i className="fa-regular fa-lightbulb text-[9px]"></i>
        <span>Thought</span>
      </span>
    );
  }
  return null;
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
  const [isExpanded, setIsExpanded] = useState(Boolean(isRunning));
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const allSteps = plan?.steps || [];
  const hasError = allSteps.some((s) => s.status === "error");
  const hasPendingApproval = allSteps.some((s) => s.pending_command?.pending_approval);

  useEffect(() => {
    let timer = null;
    if (isRunning) {
      setIsExpanded(true);
      setElapsedSeconds(0);
      timer = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (!hasError && !hasPendingApproval) {
        setIsExpanded(false);
      }
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isRunning, hasError, hasPendingApproval]);

  if (!isRunning && !isInterrupted && !plan && (!actions || actions.length === 0)) {
    return null;
  }

  const visibleSteps = allSteps.filter((s) => s.status !== "pending");
  const renderSteps = visibleSteps.length > 0 ? visibleSteps : (allSteps.length > 0 ? [allSteps[0]] : []);

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
          {renderSteps.map((st, idx) => {
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
                    <div className={`text-[13px] font-medium leading-snug flex items-center gap-1.5 flex-wrap ${isDoneStep ? "text-[#f4f4f5]" : isRunningStep ? "text-[#f8fafc]" : isErrorStep ? "text-[#fca5a5]" : "text-[#71717a]"}`}>
                      {renderStepActionPill(st.title, st)}
                      <span>{st.title || st.description}</span>
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
                      <div className="w-full p-3 rounded-xl bg-[#181414] border border-[#ef4444]/40 text-[#fca5a5] text-[11px] space-y-2.5">
                        <div className="flex items-center justify-between border-b border-[#ef4444]/20 pb-2">
                          <div className="flex items-center gap-1.5 font-semibold text-[#f87171]">
                            <i className="fa-solid fa-user-shield text-[11px]"></i>
                            <span>Inspector Agent Diagnostic Dispatch</span>
                          </div>
                          {st.target_agent && (
                            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-[#27272a] text-[#38bdf8] border border-[#0284c7]/40">
                              Dispatched to: {st.target_agent === "engineer" ? "Engineer Agent" : "CLI Agent"}
                            </span>
                          )}
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-[#f87171] font-semibold text-[10px] uppercase tracking-wide">
                            <i className="fa-solid fa-circle-xmark text-[9px]"></i>
                            <span>Failure Detected</span>
                          </div>
                          <p className="text-[#fca5a5] pl-3.5 leading-relaxed font-sans">{st.what_is_wrong || st.inspector_diagnosis}</p>
                        </div>

                        {st.reasoning && (
                          <div className="space-y-1 pt-1.5 border-t border-[#ef4444]/15">
                            <div className="flex items-center gap-1.5 text-[#fbbf24] font-semibold text-[10px] uppercase tracking-wide">
                              <i className="fa-solid fa-brain text-[9px]"></i>
                              <span>Technical Root Cause</span>
                            </div>
                            <p className="text-[#cbd5e1] pl-3.5 leading-relaxed font-sans">{st.reasoning}</p>
                          </div>
                        )}

                        {st.improvement_plan && (
                          <div className="space-y-1 pt-1.5 border-t border-[#ef4444]/15">
                            <div className="flex items-center gap-1.5 text-[#38bdf8] font-semibold text-[10px] uppercase tracking-wide">
                              <i className="fa-solid fa-paper-plane text-[9px]"></i>
                              <span>Prompt Dispatched to {st.target_agent === "engineer" ? "Engineer Agent" : "CLI Agent"}</span>
                            </div>
                            <p className="text-[#94a3b8] pl-3.5 leading-relaxed font-sans">{st.improvement_plan}</p>
                          </div>
                        )}

                        {st.engineer_fix && (
                          <div className="mt-2.5 p-2.5 rounded-lg bg-[#0f172a] border border-[#38bdf8]/30 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5 text-[#38bdf8] font-semibold text-[10px]">
                                <i className="fa-solid fa-circle-check text-[9px] text-[#10b981]"></i>
                                <span>Engineer Agent • Auto-Fix Applied to Disk</span>
                              </div>
                              <span className="text-[#10b981] font-mono text-[10px]">Patched ✓</span>
                            </div>
                            <div className="text-[10px] text-[#94a3b8] font-mono">
                              <span>{st.engineer_fix.file_path || st.file_path} {st.engineer_fix.l_start !== undefined ? `[L${st.engineer_fix.l_start}:L${st.engineer_fix.l_finish}]` : ""}</span>
                            </div>
                            {st.engineer_fix.message && (
                              <p className="text-[10px] text-[#cbd5e1]">{st.engineer_fix.message}</p>
                            )}
                            <div className="pt-1 flex justify-end">
                              <button
                                type="button"
                                disabled={approvingStepId === st.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (onApproveCommand) {
                                    onApproveCommand(cmdInfo, st.id);
                                  }
                                }}
                                className="px-2.5 py-1 rounded bg-[#3b82f6] hover:bg-[#2563eb] text-white text-[10px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                              >
                                <i className="fa-solid fa-rotate-right text-[9px]"></i>
                                <span>Re-run Command</span>
                              </button>
                            </div>
                          </div>
                        )}

                        {!st.engineer_fix && st.inspector_fix && (
                          <div className="mt-2.5 p-2.5 rounded-lg bg-[#18181c] border border-[#3f3f46] space-y-1.5">
                            <div className="flex items-center gap-1.5 text-[#e2e8f0] font-semibold text-[10px]">
                              <i className="fa-solid fa-terminal text-[9px]"></i>
                              <span>CLI Agent • Suggested Environment Fix</span>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <code className="text-[10px] text-[#38bdf8] font-mono truncate">{st.inspector_fix}</code>
                              <button
                                type="button"
                                disabled={approvingStepId === st.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (onApproveCommand) {
                                    onApproveCommand({ ...cmdInfo, command: st.inspector_fix, originalCommand: cmdInfo.command }, st.id);
                                  }
                                }}
                                className="px-2.5 py-1 rounded bg-[#3b82f6] hover:bg-[#2563eb] text-white text-[10px] font-medium flex-shrink-0 transition-colors cursor-pointer disabled:opacity-50"
                              >
                                Apply & Run Fix
                              </button>
                            </div>
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
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#ef4444]/15 border border-[#ef4444]/30 text-[#f87171] text-[10px] font-mono font-medium">
                            <i className="fa-solid fa-triangle-exclamation text-[9px]"></i>
                            <span>Failed (Exit code: {cmdInfo.exit_code})</span>
                          </span>
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