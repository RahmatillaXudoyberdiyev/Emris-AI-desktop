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
      }, 24);

      return () => clearInterval(interval);
    } catch (err) {
      console.error("[AnimatedAgentOutput] Error:", err);
      setDisplayed(text || "");
    }
  }, [text, animate]);

  return (
    <div className="font-mono text-[11px] text-[#d4d4d8] leading-relaxed break-words whitespace-pre-wrap">
      <span>{displayed}</span>
      {animate && displayed.length < (text?.length || 0) && (
        <span className="inline-block w-1.5 h-3 ml-1 bg-[#3b82f6] animate-pulse align-middle" />
      )}
    </div>
  );
}

export default function AgentActivityCard({ isRunning, currentStage, plan, actions, onCancel }) {
  const [isExpanded, setIsExpanded] = useState(isRunning);

  useEffect(() => {
    if (isRunning) {
      setIsExpanded(true);
    }
  }, [isRunning]);

  if (!isRunning && !plan && (!actions || actions.length === 0)) {
    return null;
  }

  const steps = plan?.steps || [];
  const actionList = actions || [];

  return (
    <div className="w-full rounded-xl border border-[#27272a] bg-[#161618] text-xs text-[#F9F9FA] transition-all overflow-hidden shadow-xs mb-3">
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between px-3.5 py-2.5 bg-[#18181b] border-b border-[#222226] cursor-pointer hover:bg-[#1f1f23] transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2 w-2">
            {isRunning && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#3b82f6] opacity-75"></span>
            )}
            <span className={`relative inline-flex rounded-full h-2 w-2 ${isRunning ? "bg-[#3b82f6]" : "bg-[#10b981]"}`}></span>
          </span>

          <div className="flex items-center gap-2">
            <span className="font-medium text-xs text-[#e4e4e7]">
              {isRunning ? "Agent Workflow Running" : "Agent Workflow Completed"}
            </span>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono text-[#a1a1aa] bg-[#222226] border border-[#2e2e32]">
              {currentStage || (isRunning ? "Project Architect • Nemotron 3 Ultra 550B" : `${steps.length} tasks`)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isRunning && onCancel && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onCancel();
              }}
              className="px-2 py-0.5 rounded text-[10px] text-[#a1a1aa] hover:text-[#f87171] hover:bg-[#27272a] border border-[#3f3f46]/40 transition-colors cursor-pointer"
            >
              <i className="fa-solid fa-stop text-[8px] mr-1"></i>
              To'xtatish
            </button>
          )}

          <span className="text-[10px] text-[#71717a] flex items-center gap-1">
            <span>{isExpanded ? "Yashirish" : "Batafsil"}</span>
            <i className={`fa-solid fa-chevron-down text-[8px] transition-transform ${isExpanded ? "" : "-rotate-90"}`}></i>
          </span>
        </div>
      </div>

      {isExpanded && (
        <div className="p-3 space-y-3 bg-[#141416]/70">
          {plan?.chief_thought && (
            <div className="p-2.5 rounded-lg bg-[#18181b] border border-[#26262a] text-[#d4d4d8] text-[11px] leading-relaxed">
              <div className="text-[10px] font-mono uppercase tracking-wider text-[#71717a] mb-1 flex items-center gap-1.5">
                <i className="fa-solid fa-compass-drafting text-[10px] text-[#3b82f6]"></i>
                <span>Project Architect Strategy (`plans.md`)</span>
              </div>
              <div className="text-[#d4d4d8]">{plan.chief_thought}</div>
            </div>
          )}

          {steps.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[9px] font-mono uppercase tracking-wider text-[#71717a] px-1">
                Hierarchical Multi-Agent Execution Plan
              </div>
              <div className="space-y-2">
                {steps.map((st, idx) => {
                  const isRunningStep = st.status === "running";
                  const isDoneStep = st.status === "done";
                  const modelBadge = st.model || (st.agent?.includes("Architect") ? "Nemotron 3 Ultra 550B" : st.agent?.includes("Engineer") ? "Nemotron 3 Super 120B" : "Gemini 3.5 Flash Lite");

                  return (
                    <div
                      key={st.id || idx}
                      className={`rounded-lg p-2.5 border transition-all ${
                        isRunningStep
                          ? "bg-[#18181c] border-[#3b82f6]/50 shadow-xs"
                          : isDoneStep
                          ? "bg-[#161619] border-[#27272a]"
                          : "bg-[#141416]/50 border-[#222226] opacity-65"
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <i
                            className={`fa-solid ${
                              isRunningStep
                                ? "fa-circle-notch animate-spin text-[#3b82f6]"
                                : isDoneStep
                                ? "fa-circle-check text-[#10b981]"
                                : "fa-circle-dot text-[#52525b]"
                            } text-[11px] flex-shrink-0`}
                          />
                          <span className="font-medium text-[#e4e4e7] truncate">{st.agent}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#222226] text-[#a1a1aa] font-mono border border-[#2e2e32] flex-shrink-0">
                            {modelBadge}
                          </span>
                        </div>
                        <span
                          className={`text-[9px] font-mono uppercase tracking-wider flex-shrink-0 ml-2 ${
                            isRunningStep
                              ? "text-[#3b82f6]"
                              : isDoneStep
                              ? "text-[#10b981]"
                              : "text-[#52525b]"
                          }`}
                        >
                          {isRunningStep ? "Running" : isDoneStep ? "Done" : "Pending"}
                        </span>
                      </div>

                      <div className="text-[11px] text-[#a1a1aa] mb-1 pl-5">
                        {st.description}
                      </div>

                      {(isRunningStep || isDoneStep) && st.output && (
                        <div className="ml-5 mt-1.5 p-2 rounded-md bg-[#0d0d0f] border border-[#222226]">
                          <AnimatedAgentOutput text={st.output} animate={isRunningStep} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {actionList.length > 0 && (
            <div className="space-y-1 pt-1">
              <div className="text-[9px] font-mono uppercase tracking-wider text-[#71717a] px-1">
                Actions & Tool Dispatches
              </div>
              <div className="space-y-1 max-h-36 overflow-y-auto custom-scrollbar">
                {actionList.map((act, i) => (
                  <div
                    key={i}
                    className="px-2.5 py-1.5 rounded-md bg-[#18181b] border border-[#222226] text-[11px] space-y-1"
                  >
                    <div className="flex items-center justify-between text-[#a1a1aa]">
                      <div className="flex items-center gap-1.5 font-mono truncate mr-2">
                        <span className="text-[9px] text-[#71717a] uppercase">{act.agent || act.action}:</span>
                        <span className="text-[#e4e4e7] truncate">{act.target}</span>
                      </div>
                      <span className="text-[9px] text-[#71717a] font-mono flex-shrink-0">
                        {act.result?.success !== false ? "OK" : "Notice"}
                      </span>
                    </div>

                    {act.result?.stdout && (
                      <pre className="p-2 rounded bg-[#09090b] border border-[#1e1e22] text-[#a1a1aa] font-mono text-[10px] max-h-20 overflow-y-auto whitespace-pre-wrap">
                        {act.result.stdout.slice(0, 500)}
                      </pre>
                    )}
                    {act.result?.diagnosis && (
                      <div className="text-[10px] text-[#f87171] font-mono bg-[#2a1215] p-1.5 rounded border border-[#451218]">
                        {act.result.diagnosis}
                      </div>
                    )}
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
