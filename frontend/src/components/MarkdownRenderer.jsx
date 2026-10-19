import React, { useState } from "react";
import { desktopApi } from "../services/api";

const renderInline = (text) => {
  try {
    if (!text) return "";
    const tokens = [];
    let remaining = text;
    let key = 0;

    while (remaining) {
      const codeMatch = remaining.match(/^`([^`]+)`/);
      if (codeMatch) {
        tokens.push(
          <code key={key++} className="px-1.5 py-0.5 mx-0.5 rounded bg-[#202026] text-[#38bdf8] font-mono text-[11px] border border-[#2e2e38]">
            {codeMatch[1]}
          </code>
        );
        remaining = remaining.slice(codeMatch[0].length);
        continue;
      }

      const boldMatch = remaining.match(/^\*\*([^*]+)\*\*/);
      if (boldMatch) {
        tokens.push(<strong key={key++} className="font-semibold text-[#f8fafc]">{boldMatch[1]}</strong>);
        remaining = remaining.slice(boldMatch[0].length);
        continue;
      }

      const italicMatch = remaining.match(/^\*([^*]+)\*/);
      if (italicMatch) {
        tokens.push(<em key={key++} className="italic text-[#cbd5e1]">{italicMatch[1]}</em>);
        remaining = remaining.slice(italicMatch[0].length);
        continue;
      }

      const linkMatch = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/);
      if (linkMatch) {
        const label = linkMatch[1];
        const url = linkMatch[2];
        tokens.push(
          <a
            key={key++}
            href={url}
            onClick={(e) => {
              e.preventDefault();
              desktopApi.openExternal(url);
            }}
            className="text-[#38bdf8] hover:text-[#60a5fa] underline underline-offset-2 transition-colors cursor-pointer"
          >
            {label}
          </a>
        );
        remaining = remaining.slice(linkMatch[0].length);
        continue;
      }

      const nextSpecial = remaining.search(/[`*\[]/);
      if (nextSpecial === -1) {
        tokens.push(remaining);
        break;
      } else if (nextSpecial === 0) {
        tokens.push(remaining[0]);
        remaining = remaining.slice(1);
      } else {
        tokens.push(remaining.slice(0, nextSpecial));
        remaining = remaining.slice(nextSpecial);
      }
    }
    return tokens;
  } catch (err) {
    console.error("[Markdown] Inline parse error:", err);
    return text;
  }
};

export default function MarkdownRenderer({ content = "" }) {
  const [copiedIdx, setCopiedIdx] = useState(null);

  const handleCopy = async (codeText, idx) => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(codeText);
        setCopiedIdx(idx);
        setTimeout(() => setCopiedIdx(null), 1800);
      }
    } catch (err) {
      console.error("[Markdown] Copy error:", err);
    }
  };

  try {
    if (!content) return null;

    const blocks = [];
    const rawLines = content.split("\n");
    let i = 0;

    while (i < rawLines.length) {
      const line = rawLines[i];

      if (line.trim().startsWith("```")) {
        const langMatch = line.trim().match(/^```([a-zA-Z0-9_\-]+)?/);
        const lang = (langMatch && langMatch[1]) ? langMatch[1] : "code";
        const codeLines = [];
        i++;
        while (i < rawLines.length && !rawLines[i].trim().startsWith("```")) {
          codeLines.push(rawLines[i]);
          i++;
        }
        if (i < rawLines.length) i++;
        blocks.push({ type: "code", language: lang, body: codeLines.join("\n") });
        continue;
      }

      if (line.startsWith("#")) {
        const match = line.match(/^(#{1,4})\s+(.+)$/);
        if (match) {
          const level = match[1].length;
          blocks.push({ type: "heading", level, text: match[2] });
          i++;
          continue;
        }
      }

      if (line.trim().startsWith(">")) {
        const quoteLines = [line.replace(/^>\s?/, "")];
        i++;
        while (i < rawLines.length && rawLines[i].trim().startsWith(">")) {
          quoteLines.push(rawLines[i].replace(/^>\s?/, ""));
          i++;
        }
        blocks.push({ type: "blockquote", text: quoteLines.join("\n") });
        continue;
      }

      if (line.trim().startsWith("|") && line.trim().endsWith("|")) {
        const tableLines = [line];
        i++;
        while (i < rawLines.length && rawLines[i].trim().startsWith("|") && rawLines[i].trim().endsWith("|")) {
          tableLines.push(rawLines[i]);
          i++;
        }
        blocks.push({ type: "table", lines: tableLines });
        continue;
      }

      if (/^\s*[-*]\s+/.test(line)) {
        const listItems = [];
        while (i < rawLines.length && /^\s*[-*]\s+/.test(rawLines[i])) {
          listItems.push(rawLines[i].replace(/^\s*[-*]\s+/, ""));
          i++;
        }
        blocks.push({ type: "unordered_list", items: listItems });
        continue;
      }

      if (/^\s*\d+\.\s+/.test(line)) {
        const listItems = [];
        while (i < rawLines.length && /^\s*\d+\.\s+/.test(rawLines[i])) {
          listItems.push(rawLines[i].replace(/^\s*\d+\.\s+/, ""));
          i++;
        }
        blocks.push({ type: "ordered_list", items: listItems });
        continue;
      }

      if (!line.trim()) {
        i++;
        continue;
      }

      const paraLines = [line];
      i++;
      while (
        i < rawLines.length &&
        rawLines[i].trim() &&
        !rawLines[i].startsWith("#") &&
        !rawLines[i].trim().startsWith("```") &&
        !rawLines[i].trim().startsWith(">") &&
        !/^\s*[-*]\s+/.test(rawLines[i]) &&
        !/^\s*\d+\.\s+/.test(rawLines[i]) &&
        !(rawLines[i].trim().startsWith("|") && rawLines[i].trim().endsWith("|"))
      ) {
        paraLines.push(rawLines[i]);
        i++;
      }
      blocks.push({ type: "paragraph", text: paraLines.join(" ") });
    }

    return (
      <div className="space-y-3 text-xs sm:text-[13px] text-[#e2e8f0] leading-relaxed">
        {blocks.map((block, idx) => {
          if (block.type === "code") {
            const isCopied = copiedIdx === idx;
            return (
              <div key={idx} className="my-2.5 rounded-xl border border-[#27272a] bg-[#0c0c0e] overflow-hidden">
                <div className="flex items-center justify-between px-3 py-1.5 bg-[#161619] border-b border-[#242428] text-[10px] text-[#94a3b8] font-mono">
                  <span className="uppercase tracking-wider">{block.language}</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(block.body, idx)}
                    className="flex items-center gap-1.5 px-2 py-0.5 rounded hover:bg-[#202026] text-[#94a3b8] hover:text-[#f8fafc] transition-colors cursor-pointer"
                  >
                    <i className={`fa-solid ${isCopied ? "fa-check text-[#10b981]" : "fa-copy"} text-[9px]`}></i>
                    <span>{isCopied ? "Copied" : "Copy"}</span>
                  </button>
                </div>
                <pre className="p-3 overflow-x-auto font-mono text-[11px] leading-relaxed text-[#e2e8f0]">
                  <code>{block.body}</code>
                </pre>
              </div>
            );
          }

          if (block.type === "heading") {
            if (block.level === 1) {
              return <h1 key={idx} className="text-base sm:text-lg font-bold text-[#f8fafc] pt-2 pb-1 border-b border-[#27272a]">{renderInline(block.text)}</h1>;
            }
            if (block.level === 2) {
              return <h2 key={idx} className="text-sm sm:text-base font-semibold text-[#f8fafc] pt-2">{renderInline(block.text)}</h2>;
            }
            if (block.level === 3) {
              return <h3 key={idx} className="text-xs sm:text-sm font-semibold text-[#f1f5f9] pt-1.5">{renderInline(block.text)}</h3>;
            }
            return <h4 key={idx} className="text-xs font-semibold text-[#cbd5e1]">{renderInline(block.text)}</h4>;
          }

          if (block.type === "blockquote") {
            return (
              <blockquote key={idx} className="border-l-2 border-[#3b82f6] pl-3 py-1 bg-[#18181c]/60 rounded-r text-[#94a3b8] italic">
                {renderInline(block.text)}
              </blockquote>
            );
          }

          if (block.type === "table") {
            const rows = block.lines
              .filter((l) => !l.includes("---"))
              .map((l) => l.split("|").slice(1, -1).map((c) => c.trim()));
            if (rows.length === 0) return null;
            const headers = rows[0];
            const dataRows = rows.slice(1);

            return (
              <div key={idx} className="my-2 overflow-x-auto rounded-xl border border-[#27272a]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[#1c1c20] text-[#f8fafc] border-b border-[#27272a]">
                    <tr>
                      {headers.map((h, hIdx) => (
                        <th key={hIdx} className="px-3 py-2 font-semibold">{renderInline(h)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#202024]">
                    {dataRows.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-[#18181c]/50 transition-colors">
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} className="px-3 py-1.5 text-[#cbd5e1]">{renderInline(cell)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          }

          if (block.type === "unordered_list") {
            return (
              <ul key={idx} className="space-y-1 my-1 pl-4 list-disc marker:text-[#64748b]">
                {block.items.map((item, iIdx) => (
                  <li key={iIdx} className="pl-1 text-[#cbd5e1]">{renderInline(item)}</li>
                ))}
              </ul>
            );
          }

          if (block.type === "ordered_list") {
            return (
              <ol key={idx} className="space-y-1 my-1 pl-4 list-decimal marker:text-[#64748b] font-mono">
                {block.items.map((item, iIdx) => (
                  <li key={iIdx} className="pl-1 text-[#cbd5e1] font-sans">{renderInline(item)}</li>
                ))}
              </ol>
            );
          }

          return <p key={idx} className="leading-relaxed text-[#cbd5e1]">{renderInline(block.text)}</p>;
        })}
      </div>
    );
  } catch (err) {
    console.error("[MarkdownRenderer] Render error:", err);
    return <div className="whitespace-pre-wrap">{content}</div>;
  }
}
