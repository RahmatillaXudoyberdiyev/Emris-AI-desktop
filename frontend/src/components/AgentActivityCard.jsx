import React, { useState, useEffect } from "react";

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

export default function AgentActivityCard({ isRunning, currentStage, plan, actions, onCancel, projectName }) {
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

  if (!isRunning && !plan && (!actions || actions.length === 0)) {
    return null;
  }

  const steps = plan?.steps || [];
  const activeAgent = steps.find((s) => s.status === "running")?.agent || "Project Architect";

  return (
    <div className="w-full rounded-2xl border border-[#242428] bg-[#141416] text-xs text-[#f8fafc] overflow-hidden shadow-xl mb-4 select-none">
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between px-4 py-3 bg-[#18181c] border-b border-[#222226] cursor-pointer hover:bg-[#1d1d22] transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="relative flex h-2.5 w-2.5">
            {isRunning && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10b981] opacity-75"></span>
            )}
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isRunning ? "bg-[#10b981]" : "bg-[#10b981]"}`}></span>
          </span>

          <span className="font-medium text-xs text-[#f8fafc]">
            {isRunning ? "Agent Workflow Active" : "Agent Workflow Completed"}
          </span>

          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#202026] border border-[#2c2c34] text-[11px] text-[#94a3b8]">
            <i className="fa-solid fa-magnifying-glass text-[9px]"></i>
            <span className="truncate max-w-[200px]">{projectName ? `Project Architect — ${projectName}` : "Project Architect"}</span>
            <i className="fa-solid fa-chevron-down text-[8px] ml-0.5"></i>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            className="text-[11px] text-[#94a3b8] hover:text-[#f8fafc] flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span>{isExpanded ? "Yashirish" : "Batafsil"}</span>
            <i className={`fa-solid fa-chevron-down text-[9px] transition-transform ${isExpanded ? "" : "-rotate-90"}`}></i>
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 bg-[#121214] space-y-4">
          <div className="rounded-xl bg-[#18181c] border border-[#26262a] p-3.5 space-y-3">
            <div className="flex items-center justify-between border-b border-[#242428] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#27272a] border border-[#3f3f46] flex items-center justify-center text-[#f8fafc]">
                  <img src="/favicon.ico" alt="Emris" className="w-4 h-4 object-contain" onError={(e) => { e.target.style.display = 'none'; }} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-[#f8fafc]">{activeAgent}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#222228] text-[#94a3b8] border border-[#2e2e36] font-mono">
                      Gemini 3.5 Flash Lite
                    </span>
                  </div>
                  <p className="text-[11px] text-[#94a3b8] mt-0.5">Designs, plans and builds your project step by step.</p>
                </div>
              </div>

              {isRunning && onCancel && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCancel();
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-[#f87171] hover:bg-[#ef4444]/10 border border-[#ef4444]/30 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <i className="fa-solid fa-square text-[9px]"></i>
                  <span>Stop</span>
                </button>
              )}
            </div>

            <div className="space-y-2 pt-1">
              {steps.map((st, idx) => {
                const isRunningStep = st.status === "running";
                const isDoneStep = st.status === "done";
                const isPending = !isRunningStep && !isDoneStep;

                return (
                  <div
                    key={st.id || idx}
                    className={`flex items-start justify-between p-2.5 rounded-xl border transition-all ${
                      isRunningStep
                        ? "bg-[#1c1c22] border-[#3b82f6]/40 shadow-sm"
                        : isDoneStep
                        ? "bg-[#161619] border-[#222226]"
                        : "bg-[#141416]/40 border-[#1f1f23] opacity-60"
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="mt-0.5 flex-shrink-0">
                        {isDoneStep ? (
                          <div className="w-5 h-5 rounded-full bg-[#10b981]/20 border border-[#10b981]/50 flex items-center justify-center text-[#10b981]">
                            <i className="fa-solid fa-check text-[10px]"></i>
                          </div>
                        ) : isRunningStep ? (
                          <div className="w-5 h-5 rounded-full border-2 border-[#3b82f6] border-t-transparent animate-spin"></div>
                        ) : (
                          <div className="w-5 h-5 rounded-full border border-[#3f3f46] flex items-center justify-center">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#3f3f46]"></div>
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-medium truncate ${isDoneStep || isRunningStep ? "text-[#f8fafc]" : "text-[#94a3b8]"}`}>
                            {st.agent ? `${st.agent} • ${st.description}` : st.description}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#64748b] mt-0.5 truncate">
                          {isDoneStep ? "Topshiriq bajarildi va tekshirildi" : isRunningStep ? "Jarayon faol ishlamoqda..." : "Kutilmoqda..."}
                        </p>

                        {(isRunningStep || isDoneStep) && st.output && (
                          <div className="mt-2 p-2 rounded-lg bg-[#0f0f12] border border-[#222226]">
                            <AnimatedAgentOutput text={st.output} animate={isRunningStep} />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex-shrink-0 ml-3 text-[11px] font-mono text-[#64748b]">
                      {isDoneStep ? (
                        <span>{`${12 + (idx * 16)}s`}</span>
                      ) : isRunningStep ? (
                        <span className="text-[#3b82f6] font-medium">{`${elapsedSeconds}s`}</span>
                      ) : (
                        <span>—</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {actions && actions.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[10px] font-mono uppercase tracking-wider text-[#64748b] px-1">
                Dispatched Actions
              </div>
              <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
                {actions.map((act, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-[#18181c] border border-[#242428] text-[11px]">
                    <div className="flex items-center gap-2 font-mono truncate mr-2">
                      <span className="text-[10px] text-[#3b82f6]">{act.agent || act.action}:</span>
                      <span className="text-[#cbd5e1] truncate">{act.target}</span>
                    </div>
                    <span className="text-[10px] text-[#10b981] font-mono flex-shrink-0">OK</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
