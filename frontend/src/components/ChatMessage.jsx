import React from "react";
import AgentActivityCard from "./AgentActivityCard";
import MarkdownRenderer from "./MarkdownRenderer";

export default function ChatMessage({ message, currentModelLabel }) {
  const [copied, setCopied] = React.useState(false);
  const isUser = message.role === "user";

  const handleCopy = async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(message.content);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = message.content;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error("[ChatMessage] Copy error:", e);
    }
  };

  if (isUser) {
    return (
      <div className="flex justify-end w-full group">
        <div className="max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 bg-[#27272a] border border-[#3f3f46]/50 text-[#F9F9FA] text-sm leading-relaxed shadow-sm select-text">
          <div className="flex items-center justify-between gap-3 mb-1.5 select-none">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-[#a1a1aa]">
              You
            </span>
            <button
              type="button"
              onClick={handleCopy}
              className="text-[#a1a1aa] hover:text-[#f4f4f5] p-1 rounded transition-colors text-xs flex items-center gap-1 cursor-pointer opacity-70 group-hover:opacity-100"
              title="Copy prompt"
            >
              {copied ? (
                <>
                  <i className="fa-solid fa-check text-[10px] text-[#10b981]"></i>
                  <span className="text-[10px] text-[#10b981] font-medium">Copied</span>
                </>
              ) : (
                <i className="fa-regular fa-copy text-[10px]"></i>
              )}
            </button>
          </div>
          <div className="whitespace-pre-wrap text-[13px] select-text cursor-text selection:bg-[#3b82f6]/50 selection:text-white">
            {message.content}
          </div>
        </div>
      </div>
    );
  }

  let workflow = message.workflow || null;
  let filesChanges = message.files_changes || null;
  let rawContent = message.content || "";

  if (rawContent.includes("<!--workflow:")) {
    const startIdx = rawContent.indexOf("<!--workflow:");
    const endIdx = rawContent.indexOf("-->", startIdx);
    if (endIdx !== -1) {
      try {
        workflow = JSON.parse(rawContent.slice(startIdx + 13, endIdx));
        rawContent = (rawContent.slice(0, startIdx) + rawContent.slice(endIdx + 3)).trim();
      } catch (e) {
        console.error("[ChatMessage] Workflow parse error:", e);
      }
    }
  }

  if (rawContent.includes("<!--files_changes:")) {
    const startIdx = rawContent.indexOf("<!--files_changes:");
    const endIdx = rawContent.indexOf("-->", startIdx);
    if (endIdx !== -1) {
      try {
        filesChanges = JSON.parse(rawContent.slice(startIdx + 18, endIdx));
        rawContent = (rawContent.slice(0, startIdx) + rawContent.slice(endIdx + 3)).trim();
      } catch (e) {
        console.error("[ChatMessage] Files changes parse error:", e);
      }
    }
  }

  const legacyHeaderIdx = rawContent.indexOf("### Files & Changes");
  if (legacyHeaderIdx !== -1) {
    rawContent = rawContent.slice(0, legacyHeaderIdx).trim();
  }

  rawContent = rawContent.replace(/<\/?(?:div|agent-summary|summary|response)[^>]*>/gi, "").trim();
  const trimmed = rawContent.trim();
  if (trimmed.startsWith("```") && trimmed.endsWith("```")) {
    const lines = trimmed.split("\n");
    if (lines.length >= 2 && lines[0].startsWith("```")) {
      const firstTag = lines[0].replace("```", "").trim().toLowerCase();
      if (["markdown", "md", "html", "text", "", "xml", "code"].includes(firstTag)) {
        rawContent = lines.slice(1, -1).join("\n").trim();
      }
    }
  }
  rawContent = rawContent.replace(/^```(?:xml|html|markdown|text|code)?\s*/i, "");
  rawContent = rawContent.replace(/\s*```$/i, "").trim();

  const hasFiles = Boolean(
    (filesChanges?.created && filesChanges.created.length > 0) ||
    (filesChanges?.changed && filesChanges.changed.length > 0) ||
    (filesChanges?.deleted && filesChanges.deleted.length > 0)
  );

  return (
    <div className="flex flex-col w-full space-y-2 group">
      {workflow && (
        <AgentActivityCard
          isRunning={false}
          currentStage="All workflow phases completed ✓"
          plan={workflow.plan || { steps: workflow.steps }}
          actions={workflow.actions || []}
        />
      )}

      <div className="flex justify-start w-full px-1">
        <div className="w-full text-[#f4f4f5] text-sm leading-relaxed select-text">
          <div className="text-[13.5px] sm:text-[14px] text-[#e4e4e7] leading-relaxed">
            <MarkdownRenderer content={rawContent} />
          </div>

          {hasFiles && (
            <div className="mt-4 pt-3 border-t border-[#26262a] space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#f8fafc]">
                <i className="fa-solid fa-folder-tree text-[#38bdf8] text-[11px]"></i>
                <span>Files & Changes</span>
              </div>
              <div className="space-y-1.5 pt-0.5">
                {filesChanges.created?.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/30 font-semibold">
                      + Created
                    </span>
                    {filesChanges.created.map((f, i) => (
                      <span key={i} className="font-mono text-[11px] px-2 py-0.5 rounded bg-[#1e1e24] text-[#e2e8f0] border border-[#2e2e34]">
                        {f}
                      </span>
                    ))}
                  </div>
                )}
                {filesChanges.changed?.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#3b82f6]/15 text-[#60a5fa] border border-[#3b82f6]/30 font-semibold">
                      ~ Changed
                    </span>
                    {filesChanges.changed.map((f, i) => (
                      <span key={i} className="font-mono text-[11px] px-2 py-0.5 rounded bg-[#1e1e24] text-[#e2e8f0] border border-[#2e2e34]">
                        {f}
                      </span>
                    ))}
                  </div>
                )}
                {filesChanges.deleted?.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#ef4444]/15 text-[#f87171] border border-[#ef4444]/30 font-semibold">
                      - Deleted
                    </span>
                    {filesChanges.deleted.map((f, i) => (
                      <span key={i} className="font-mono text-[11px] px-2 py-0.5 rounded bg-[#1e1e24] text-[#e2e8f0] border border-[#2e2e34]">
                        {f}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-2.5 mt-3 border-t border-[#222226]/50 text-xs text-[#71717a] opacity-50 group-hover:opacity-100 transition-opacity">
            <span className="text-[10px] text-[#a1a1aa] font-mono">
              {currentModelLabel || "Gemini 3.5 Flash Lite"}
            </span>
            <button
              type="button"
              onClick={handleCopy}
              className="text-[#a1a1aa] hover:text-[#f4f4f5] p-1 rounded transition-colors text-xs flex items-center gap-1 cursor-pointer"
              title="Copy response"
            >
              {copied ? (
                <>
                  <i className="fa-solid fa-check text-[10px] text-[#10b981]"></i>
                  <span className="text-[10px] text-[#10b981] font-medium">Copied</span>
                </>
              ) : (
                <i className="fa-regular fa-copy text-[10px]"></i>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}