import React, { useState } from "react";

export default function AgentActivityCard({ isRunning, currentStage, plan, actions, onCancel }) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!isRunning && !plan && (!actions || actions.length === 0)) {
    return null;
  }

  return (
    <div className="w-full bg-[#18181b] border border-[#27272a] rounded-xl p-3.5 shadow-sm space-y-3 select-none text-xs text-[#F9F9FA] transition-all">
      <div className="flex items-center justify-between border-b border-[#27272a] pb-2">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2 w-2">
            {isRunning && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#3b82f6] opacity-75"></span>
            )}
            <span className={`relative inline-flex rounded-full h-2 w-2 ${isRunning ? "bg-[#3b82f6]" : "bg-[#71717a]"}`}></span>
          </span>

          <div className="flex items-center gap-2">
            <span className="font-medium text-xs text-[#e4e4e7]">
              {isRunning ? "Orchestrator Executing" : "Execution Finished"}
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#27272a] text-[#a1a1aa] border border-[#3f3f46]/40">
              {currentStage || (isRunning ? "Chief Planning" : "Completed")}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isRunning && onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-2 py-0.5 rounded text-[10px] text-[#a1a1aa] hover:text-[#f87171] hover:bg-[#27272a] border border-[#3f3f46]/40 transition-colors cursor-pointer"
            >
              <i className="fa-solid fa-stop text-[8px] mr-1"></i>
              To'xtatish
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-[#a1a1aa] hover:text-[#f4f4f5] p-1 transition-colors"
          >
            <i className={`fa-solid fa-chevron-down text-[10px] transition-transform ${isExpanded ? "" : "-rotate-90"}`}></i>
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="space-y-2.5 pt-0.5">
          {plan?.chief_thought && (
            <div className="p-2.5 rounded-lg bg-[#131314] border border-[#27272a] text-[#d4d4d8] text-[11px] leading-relaxed">
              <span className="font-medium text-[#a1a1aa] flex items-center gap-1.5 mb-1">
                <i className="fa-solid fa-layer-group text-[10px] text-[#71717a]"></i>
                Chief Architect (Nemotron 3 Ultra 550B):
              </span>
              {plan.chief_thought}
            </div>
          )}

          {plan?.steps && plan.steps.length > 0 && (
            <div className="space-y-1">
              <div className="text-[10px] font-medium text-[#71717a] uppercase tracking-wider px-0.5">
                Pipeline
              </div>
              <div className="space-y-1">
                {plan.steps.map((st, idx) => (
                  <div
                    key={st.id || idx}
                    className="flex items-center justify-between px-2.5 py-1.5 rounded-md bg-[#131314] border border-[#222226] text-[11px]"
                  >
                    <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                      <i className={`fa-solid ${isRunning ? "fa-circle-notch animate-spin text-[#3b82f6]" : "fa-check text-[#71717a]"} text-[10px] flex-shrink-0`}></i>
                      <span className="truncate text-[#d4d4d8]">{st.description || st.action}</span>
                    </div>
                    <span className="text-[9px] text-[#71717a] ml-2 flex-shrink-0 uppercase font-mono">
                      {st.agent || "Worker"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {actions && actions.length > 0 && (
            <div className="space-y-1 pt-0.5">
              <div className="text-[10px] font-medium text-[#71717a] uppercase tracking-wider px-0.5">
                Tools & Commands
              </div>
              <div className="space-y-1 max-h-36 overflow-y-auto custom-scrollbar">
                {actions.map((act, i) => (
                  <div
                    key={i}
                    className="px-2.5 py-1.5 rounded-md bg-[#131314] border border-[#222226] space-y-1 text-[11px]"
                  >
                    <div className="flex items-center justify-between text-[#a1a1aa]">
                      <div className="flex items-center gap-1.5 font-mono truncate mr-2">
                        <span className="text-[#e4e4e7] truncate">
                          {act.action === "run_command" ? `>_ ${act.target}` : `${act.action}: ${act.target}`}
                        </span>
                      </div>
                      <span className="text-[9px] text-[#71717a] flex-shrink-0">
                        {act.result?.success ? "OK" : "Notice"}
                      </span>
                    </div>

                    {act.result?.stdout && (
                      <pre className="p-2 rounded bg-[#09090b] border border-[#1e1e22] text-[#a1a1aa] font-mono text-[10px] max-h-20 overflow-y-auto whitespace-pre-wrap">
                        {act.result.stdout.slice(0, 500)}
                      </pre>
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
