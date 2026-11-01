import React from "react";
import AgentActivityCard from "./AgentActivityCard";
import MarkdownRenderer from "./MarkdownRenderer";

export default function ChatMessage({ message, currentModelLabel, onEditMessage, onDeleteMessage }) {
  const [copied, setCopied] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [editContent, setEditContent] = React.useState(message.content || "");
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

  const handleSaveEdit = () => {
    const trimmed = editContent.trim();
    if (!trimmed) return;
    if (onEditMessage) {
      onEditMessage(message.id, trimmed);
    }
    setIsEditing(false);
  };

  if (isUser) {
    return (
      <div className="flex justify-end w-full group">
        <div className="max-w-[85%] sm:max-w-[75%] w-full sm:w-auto rounded-2xl px-4 py-3 bg-[#27272a] border border-[#3f3f46]/50 text-[#F9F9FA] text-sm leading-relaxed shadow-sm select-text">
          <div className="flex items-center justify-between gap-3 mb-1.5 select-none">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-[#a1a1aa]">
              You
            </span>
            <div className="flex items-center gap-1">
              {!isEditing && onEditMessage && (
                <button
                  type="button"
                  onClick={() => {
                    setEditContent(message.content);
                    setIsEditing(true);
                  }}
                  className="text-[#a1a1aa] hover:text-[#f4f4f5] p-1 rounded transition-colors text-xs flex items-center gap-1 cursor-pointer opacity-70 group-hover:opacity-100"
                  title="Edit prompt"
                >
                  <i className="fa-regular fa-pen-to-square text-[10px]"></i>
                </button>
              )}
              {!isEditing && onDeleteMessage && (
                <button
                  type="button"
                  onClick={() => onDeleteMessage(message.id)}
                  className="text-[#a1a1aa] hover:text-[#ef4444] p-1 rounded transition-colors text-xs flex items-center gap-1 cursor-pointer opacity-70 group-hover:opacity-100"
                  title="Delete message and revert history"
                >
                  <i className="fa-regular fa-trash-can text-[10px]"></i>
                </button>
              )}
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
          </div>
          {isEditing ? (
            <div className="space-y-2 mt-1">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSaveEdit();
                  } else if (e.key === "Escape") {
                    setIsEditing(false);
                    setEditContent(message.content);
                  }
                }}
                rows={Math.min(8, Math.max(2, editContent.split("\n").length))}
                className="w-full bg-[#18181b] border border-[#3f3f46] rounded-lg p-2 text-[13px] text-white focus:outline-none focus:border-[#3b82f6] resize-none"
                autoFocus
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setEditContent(message.content);
                  }}
                  className="px-2.5 py-1 rounded bg-[#18181b] hover:bg-[#27272a] text-[#a1a1aa] text-[11px] font-medium transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  className="px-3 py-1 rounded bg-[#3b82f6] hover:bg-[#2563eb] text-white text-[11px] font-medium transition-colors cursor-pointer"
                >
                  Save & Resend
                </button>
              </div>
            </div>
          ) : (
            <div className="whitespace-pre-wrap text-[13px] select-text cursor-text selection:bg-[#3b82f6]/50 selection:text-white">
              {message.content}
            </div>
          )}
        </div>
      </div>
    );
  }

  let workflow = message.workflow || null;
  let filesChanges = message.files_changes || null;
  let tokens = message.tokens || null;
  let rawContent = message.content || "";

  if (rawContent.includes("<!--tokens:")) {
    const startIdx = rawContent.indexOf("<!--tokens:");
    const endIdx = rawContent.indexOf("-->", startIdx);
    if (endIdx !== -1) {
      try {
        tokens = JSON.parse(rawContent.slice(startIdx + 11, endIdx));
      } catch (e) {
        console.error("[ChatMessage] Tokens parse notice:", e);
      }
      rawContent = (rawContent.slice(0, startIdx) + rawContent.slice(endIdx + 3)).trim();
    }
  }
  rawContent = rawContent.replace(/<!--tokens:[\s\S]*?(?:-->|$)/g, "").trim();

  if (rawContent.includes("<!--workflow:")) {
    const startIdx = rawContent.indexOf("<!--workflow:");
    let endIdx = -1;
    let candidateEnd = rawContent.indexOf("-->", startIdx);
    while (candidateEnd !== -1) {
      try {
        const testSub = rawContent.slice(startIdx + 13, candidateEnd);
        workflow = JSON.parse(testSub);
        endIdx = candidateEnd;
        break;
      } catch (e) {
        candidateEnd = rawContent.indexOf("-->", candidateEnd + 3);
      }
    }

    if (endIdx !== -1) {
      rawContent = (rawContent.slice(0, startIdx) + rawContent.slice(endIdx + 3)).trim();
    } else {
      const lastArrow = rawContent.lastIndexOf("-->");
      if (lastArrow > startIdx) {
        try {
          workflow = JSON.parse(rawContent.slice(startIdx + 13, lastArrow));
        } catch (e) {
          console.error("[ChatMessage] Workflow fallback parse notice:", e);
        }
        rawContent = (rawContent.slice(0, startIdx) + rawContent.slice(lastArrow + 3)).trim();
      } else {
        const m = rawContent.slice(startIdx).match(/(?:-->|→)\s*([\s\S]*)$/);
        if (m) {
          rawContent = (rawContent.slice(0, startIdx) + m[1]).trim();
        } else {
          rawContent = rawContent.slice(0, startIdx).trim();
        }
      }
    }
    rawContent = rawContent.replace(/<!--workflow:[\s\S]*?(?:-->|→|$)/g, "").trim();
  }

  if (!tokens && workflow?.tokens) {
    tokens = workflow.tokens;
  }

  if (rawContent.includes("<!--files_changes:")) {
    const startIdx = rawContent.indexOf("<!--files_changes:");
    const endIdx = rawContent.indexOf("-->", startIdx);
    if (endIdx !== -1) {
      try {
        filesChanges = JSON.parse(rawContent.slice(startIdx + 18, endIdx));
      } catch (e) {
        console.error("[ChatMessage] Files changes parse error:", e);
      }
      rawContent = (rawContent.slice(0, startIdx) + rawContent.slice(endIdx + 3)).trim();
    } else {
      const m = rawContent.slice(startIdx).match(/(?:-->|→)\s*([\s\S]*)$/);
      rawContent = m ? (rawContent.slice(0, startIdx) + m[1]).trim() : rawContent.slice(0, startIdx).trim();
    }
  }

  rawContent = rawContent.replace(/<!--workflow:[\s\S]*?(?:-->|→|$)/g, "").trim();
  rawContent = rawContent.replace(/<!--files_changes:[\s\S]*?(?:-->|→|$)/g, "").trim();

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
            <div className="flex items-center gap-1.5 text-[10px] text-[#a1a1aa] font-mono">
              <span>{currentModelLabel || "Gemini 3.5 Flash Lite"}</span>
              {tokens && (tokens.total || (tokens.prompt && tokens.completion) || typeof tokens === "number") ? (
                <>
                  <span className="text-[#52525b]">•</span>
                  <span
                    className="text-[#71717a] hover:text-[#a1a1aa] transition-colors cursor-help"
                    title={tokens.prompt ? `Prompt: ${tokens.prompt.toLocaleString()} | Completion: ${tokens.completion.toLocaleString()}` : "Total tokens used"}
                  >
                    {(typeof tokens === "number" ? tokens : (tokens.total || (tokens.prompt + tokens.completion))).toLocaleString()} tokens
                  </span>
                </>
              ) : null}
            </div>
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