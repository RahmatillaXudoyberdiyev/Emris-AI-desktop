import React, { useState } from "react";

export default function AgentActivityCard({ isRunning, currentStage, plan, actions, onCancel }) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!isRunning && !plan && (!actions || actions.length === 0)) {
    return null;
  }

  return (
    <div className="w-full bg-[#1c1c1f] border border-[#2e2e32] rounded-2xl p-4 shadow-xl space-y-3 select-none text-xs text-[#F9F9FA] transition-all">
      <div className="flex items-center justify-between border-b border-[#26262a] pb-2.5">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            {isRunning && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#60a5fa] opacity-75"></span>
            )}
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isRunning ? "bg-[#2563eb]" : "bg-[#10b981]"}`}></span>
          </span>

          <div className="flex items-center gap-2">
            <span className="font-semibold text-xs tracking-tight text-[#F9F9FA]">
              {isRunning ? "Hierarchical Agent Running" : "Hierarchical Execution Finished"}
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#2563eb]/20 text-[#60a5fa] border border-[#2563eb]/30">
              {currentStage || (isRunning ? "Chief Planning" : "Completed")}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isRunning && onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-2 py-1 rounded-lg text-[10px] text-[#f43f5e] hover:bg-[#ef4444]/10 border border-[#ef4444]/30 transition-colors cursor-pointer"
            >
              <i className="fa-solid fa-stop text-[8px] mr-1"></i>
              To'xtatish
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-[#94a3b8] hover:text-[#F9F9FA] p-1 transition-colors"
          >
            <i className={`fa-solid fa-chevron-down text-[10px] transition-transform ${isExpanded ? "" : "-rotate-90"}`}></i>
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="space-y-3 pt-1">
          {plan?.chief_thought && (
            <div className="p-2.5 rounded-xl bg-[#141416] border border-[#26262a] text-[#cbd5e1] text-[11px] leading-relaxed">
              <span className="font-semibold text-[#60a5fa] block mb-1">
                <i className="fa-solid fa-crown text-[10px] mr-1 text-[#f59e0b]"></i>
                Chief Agent (Nemotron 3 Ultra 550B):
              </span>
              {plan.chief_thought}
            </div>
          )}

          {plan?.steps && plan.steps.length > 0 && (
            <div className="space-y-1">
              <div className="text-[10px] font-semibold text-[#94a3b8] uppercase tracking-wider px-1">
                Execution Pipeline
              </div>
              <div className="space-y-1">
                {plan.steps.map((st, idx) => (
                  <div
                    key={st.id || idx}
                    className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-[#141416] border border-[#222226] text-[11px]"
                  >
                    <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                      <i className={`fa-solid ${isRunning ? "fa-circle-notch animate-spin text-[#60a5fa]" : "fa-check text-[#10b981]"} text-[10px] flex-shrink-0`}></i>
                      <span className="truncate text-[#D1D1D6]">{st.description || st.action}</span>
                    </div>
                    <span className="text-[10px] text-[#64748b] ml-2 flex-shrink-0 uppercase">
                      {st.agent || "Worker"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {actions && actions.length > 0 && (
            <div className="space-y-1 pt-1">
              <div className="text-[10px] font-semibold text-[#94a3b8] uppercase tracking-wider px-1">
                Executed Tools & Commands
              </div>
              <div className="space-y-1 max-h-36 overflow-y-auto custom-scrollbar">
                {actions.map((act, i) => (
                  <div
                    key={i}
                    className="px-2.5 py-2 rounded-xl bg-[#141416] border border-[#222226] space-y-1 text-[11px]"
                  >
                    <div className="flex items-center justify-between text-[#94a3b8]">
                      <div className="flex items-center gap-1.5 font-mono">
                        {act.action === "run_command" ? (
                          <span className="text-[#60a5fa]">&gt;_ {act.target}</span>
                        ) : (
                          <span className="text-[#10b981]">📄 {act.action}: {act.target}</span>
                        )}
                      </div>
                      <span className="text-[10px] text-[#64748b]">
                        {act.result?.success ? "✓ Success" : "✕ Notice"}
                      </span>
                    </div>

                    {act.result?.stdout && (
                      <pre className="p-2 rounded-lg bg-[#030712] border border-[#1e1e22] text-[#cbd5e1] font-mono text-[10px] max-h-24 overflow-y-auto whitespace-pre-wrap">
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
