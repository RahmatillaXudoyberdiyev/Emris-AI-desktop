import React, { useState } from "react";
import AgentActivityCard from "./AgentActivityCard";

export default function ChatMessage({ message, currentModelLabel }) {
  const [copiedIndex, setCopiedIndex] = useState(null);

  const handleCopyCode = async (codeText, index) => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(codeText);
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 1800);
      }
    } catch (err) {
      console.error("[ChatMessage] Copy error:", err);
    }
  };

  const renderContent = (content) => {
    try {
      if (!content) return null;
      const parts = content.split(/(```[\s\S]*?```)/g);

      return parts.map((part, idx) => {
        if (part.startsWith("```") && part.endsWith("```")) {
          const lines = part.slice(3, -3).trim().split("\n");
          let language = "code";
          let codeBody = "";

          if (lines.length > 0 && lines[0].trim() && !lines[0].includes(" ") && lines[0].length < 20) {
            language = lines[0].trim();
            codeBody = lines.slice(1).join("\n");
          } else {
            codeBody = lines.join("\n");
          }

          const isCopied = copiedIndex === idx;

          return (
            <div
              key={idx}
              className="my-3 rounded-xl overflow-hidden border border-[#27272a] bg-[#09090b] text-[#f4f4f5]"
            >
              <div className="flex items-center justify-between px-3.5 py-1.5 bg-[#18181b] border-b border-[#27272a] text-[11px] text-[#a1a1aa] font-mono">
                <span className="uppercase tracking-wider font-medium">{language}</span>
                <button
                  type="button"
                  onClick={() => handleCopyCode(codeBody, idx)}
                  className="flex items-center gap-1.5 px-2 py-0.5 rounded hover:bg-[#27272a] text-[#a1a1aa] hover:text-[#f4f4f5] transition-colors cursor-pointer"
                  title="Copy code"
                >
                  <i className={`fa-solid ${isCopied ? "fa-check text-[#a1a1aa]" : "fa-copy"} text-[10px]`}></i>
                  <span>{isCopied ? "Copied" : "Copy"}</span>
                </button>
              </div>
              <pre className="p-3.5 overflow-x-auto font-mono text-xs leading-relaxed text-[#e4e4e7] selection:bg-[#27272a]">
                <code>{codeBody}</code>
              </pre>
            </div>
          );
        }

        return (
          <div key={idx} className="whitespace-pre-wrap leading-relaxed space-y-1">
            {part}
          </div>
        );
      });
    } catch (err) {
      console.error("[ChatMessage] Render content error:", err);
      return <div className="whitespace-pre-wrap">{content}</div>;
    }
  };

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
          currentStage="Barcha vazifalar muvaffaqiyatli bajarildi ✓"
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
                {currentModelLabel || "Nemotron 3 Ultra 550B"}
              </span>
            </div>
          </div>
          <div className="text-[13px] text-[#e4e4e7] space-y-2">
            {renderContent(rawContent)}
          </div>
        </div>
      </div>
    </div>
  );
}
