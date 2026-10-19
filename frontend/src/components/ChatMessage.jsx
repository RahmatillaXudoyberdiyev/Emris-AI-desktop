import React from "react";
import AgentActivityCard from "./AgentActivityCard";
import MarkdownRenderer from "./MarkdownRenderer";

export default function ChatMessage({ message, currentModelLabel }) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end w-full">
        <div className="max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 bg-[#27272a] border border-[#3f3f46]/50 text-[#F9F9FA] text-sm leading-relaxed shadow-sm">
          <div className="text-[10px] uppercase tracking-wider font-semibold text-[#a1a1aa] mb-1">
            You
          </div>
          <div className="whitespace-pre-wrap text-[13px]">{message.content}</div>
        </div>
      </div>
    );
  }

  let workflow = message.workflow || null;
  let rawContent = message.content || "";

  if (rawContent.startsWith("<!--workflow:")) {
    const endIdx = rawContent.indexOf("-->");
    if (endIdx !== -1) {
      try {
        workflow = JSON.parse(rawContent.slice(13, endIdx));
        rawContent = rawContent.slice(endIdx + 3).trim();
      } catch (e) {
        console.error("[ChatMessage] Workflow parse error:", e);
      }
    }
  }

  return (
    <div className="flex flex-col w-full space-y-2">
      {workflow && (
        <AgentActivityCard
          isRunning={false}
          currentStage="All workflow phases completed ✓"
          plan={workflow.plan || { steps: workflow.steps }}
          actions={workflow.actions || []}
        />
      )}

      <div className="flex justify-start w-full">
        <div className="w-full rounded-2xl p-4 sm:p-5 bg-[#18181b] border border-[#27272a] text-[#f4f4f5] text-sm leading-relaxed shadow-sm">
          <div className="flex items-center justify-between border-b border-[#27272a] pb-2.5 mb-3 text-xs text-[#a1a1aa]">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-lg bg-[#27272a] text-[#d4d4d8]">
                <i className="fa-solid fa-cube text-[10px]"></i>
              </span>
              <span className="font-semibold text-[#e4e4e7] tracking-tight">Emris AI</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#222226] text-[#a1a1aa] border border-[#3f3f46]/40">
                {currentModelLabel || "Gemini 3.5 Flash Lite"}
              </span>
            </div>
          </div>
          <div className="text-[13px] text-[#e4e4e7]">
            <MarkdownRenderer content={rawContent} />
          </div>
        </div>
      </div>
    </div>
  );
}
