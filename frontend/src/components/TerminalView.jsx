import React, { useState, useEffect, useRef } from "react";
import { desktopApi } from "../services/api";

export default function TerminalView({
  terminals = [],
  activeTerminalId,
  onSelectTerminal,
  onAddTerminal,
  onCloseTerminal,
  activeProject,
  onExecuteCommand
}) {
  const [inputVal, setInputVal] = useState("");
  const [history, setHistory] = useState([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [bgProcesses, setBgProcesses] = useState([]);
  const [isTasksOpen, setIsTasksOpen] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  const currentTerm = terminals.find((t) => t.id === activeTerminalId) || terminals[0];

  const refreshBgProcesses = async () => {
    try {
      const list = await desktopApi.getActiveProcesses();
      setBgProcesses(Array.isArray(list) ? list : []);
    } catch (e) {
      console.error("[TerminalView] Load bg processes error:", e);
    }
  };

  useEffect(() => {
    refreshBgProcesses();
    const interval = setInterval(refreshBgProcesses, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleStopBgProcess = async (processId) => {
    try {
      await desktopApi.stopCommand(processId);
      await refreshBgProcesses();
    } catch (e) {
      console.error("[TerminalView] Stop bg process error:", e);
    }
  };

  useEffect(() => {
    try {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    } catch (err) {
      console.error("[TerminalView] Scroll error:", err);
    }
  }, [currentTerm?.logs?.length]);

  const handleKeyDown = async (e) => {
    try {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        const cmd = inputVal.trim();
        if (!cmd) return;

        setHistory((prev) => [cmd, ...prev.filter((c) => c !== cmd)]);
        setHistoryIdx(-1);
        setInputVal("");

        if (cmd === "clear" || cmd === "cls") {
          if (currentTerm) currentTerm.logs = [];
          return;
        }

        setIsExecuting(true);
        if (onExecuteCommand) {
          await onExecuteCommand(cmd, currentTerm?.id);
        } else {
          const cwd = currentTerm?.cwd || activeProject?.path || undefined;
          const res = await desktopApi.runCommand(cmd, cwd);
          if (currentTerm) {
            currentTerm.logs = currentTerm.logs || [];
            currentTerm.logs.push({
              type: "command",
              text: cmd,
              cwd: cwd || "."
            });
            if (res.stdout) {
              currentTerm.logs.push({ type: "stdout", text: res.stdout });
            }
            if (res.stderr) {
              currentTerm.logs.push({ type: "stderr", text: res.stderr });
            }
            currentTerm.logs.push({
              type: "status",
              text: `Process finished with exit code ${res.exit_code}`
            });
          }
        }
        setIsExecuting(false);
        setTimeout(() => inputRef.current?.focus(), 50);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (history.length > 0 && historyIdx + 1 < history.length) {
          const nextIdx = historyIdx + 1;
          setHistoryIdx(nextIdx);
          setInputVal(history[nextIdx]);
        }
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        if (historyIdx > 0) {
          const nextIdx = historyIdx - 1;
          setHistoryIdx(nextIdx);
          setInputVal(history[nextIdx]);
        } else if (historyIdx === 0) {
          setHistoryIdx(-1);
          setInputVal("");
        }
      }
    } catch (err) {
      console.error("[TerminalView] KeyDown error:", err);
      setIsExecuting(false);
    }
  };

  const handleStopProcess = async () => {
    try {
      setIsStopping(true);
      await desktopApi.stopCommand();
      if (currentTerm) {
        currentTerm.logs = currentTerm.logs || [];
        currentTerm.logs.push({
          type: "status",
          text: "Process stopped by user."
        });
      }
      setIsExecuting(false);
    } catch (err) {
      console.error("[TerminalView] Stop process error:", err);
    } finally {
      setIsStopping(false);
    }
  };

  const getCwdDisplay = () => {
    const raw = currentTerm?.cwd || activeProject?.path || "";
    if (!raw) return "terminal";
    const parts = raw.replace(/\\/g, "/").split("/").filter(Boolean);
    return parts[parts.length - 1] || "terminal";
  };

  return (
    <div className="h-full flex flex-col bg-[#0b0b0e] text-[#e2e8f0] font-mono text-xs select-none">
      <div className="h-9 bg-[#121216] border-b border-[#222226] px-2 flex items-center justify-between overflow-x-auto custom-scrollbar flex-shrink-0">
        <div className="flex items-center gap-1 min-w-0">
          {terminals.map((term) => {
            const isActive = term.id === (currentTerm?.id || activeTerminalId);
            return (
              <div
                key={term.id}
                onClick={() => onSelectTerminal && onSelectTerminal(term.id)}
                className={`group flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] cursor-pointer transition-colors ${
                  isActive
                    ? "bg-[#1f1f26] text-[#38bdf8] font-semibold border border-[#38bdf8]/30"
                    : "text-[#94a3b8] hover:text-[#f8fafc] hover:bg-[#18181e]"
                }`}
              >
                <i className="fa-solid fa-terminal text-[10px]"></i>
                <span className="truncate max-w-[90px]">{term.title || `Terminal #${term.id}`}</span>
                {terminals.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCloseTerminal && onCloseTerminal(term.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-[#f87171] transition-opacity ml-0.5"
                  >
                    <i className="fa-solid fa-xmark text-[9px]"></i>
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0 ml-1">
          <button
            type="button"
            onClick={() => setIsTasksOpen(!isTasksOpen)}
            className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-medium transition-colors cursor-pointer ${
              bgProcesses.length > 0
                ? "bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/30 hover:bg-[#10b981]/25"
                : "text-[#64748b] hover:text-[#94a3b8] hover:bg-[#1f1f26]"
            }`}
            title="Background Tasks"
          >
            {bgProcesses.length > 0 && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse"></span>
            )}
            <i className="fa-solid fa-list-check text-[9px]"></i>
            <span>Tasks ({bgProcesses.length})</span>
          </button>

          <button
            type="button"
            onClick={() => onAddTerminal && onAddTerminal()}
            className="p-1 px-1.5 rounded hover:bg-[#1f1f26] text-[#94a3b8] hover:text-[#38bdf8] transition-colors cursor-pointer"
            title="New Terminal"
          >
            <i className="fa-solid fa-plus text-[10px]"></i>
          </button>
        </div>
      </div>

      {isTasksOpen && (
        <div className="bg-[#101014] border-b border-[#222226] p-2.5 space-y-2 flex-shrink-0 max-h-48 overflow-y-auto custom-scrollbar">
          <div className="flex items-center justify-between text-[11px] font-semibold text-[#94a3b8] px-1">
            <span className="flex items-center gap-1.5 text-[#38bdf8]">
              <i className="fa-solid fa-server text-[10px]"></i>
              <span>Active Background Processes</span>
            </span>
            <span className="text-[10px] text-[#64748b] font-mono">{bgProcesses.length} running</span>
          </div>

          {bgProcesses.length === 0 ? (
            <div className="text-[11px] text-[#64748b] italic p-2 text-center">
              No background tasks currently running.
            </div>
          ) : (
            <div className="space-y-1.5">
              {bgProcesses.map((proc) => (
                <div
                  key={proc.process_id || proc.pid}
                  className="flex items-center justify-between p-2 rounded-lg bg-[#16161c] border border-[#26262e] gap-2 text-[11px]"
                >
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 rounded bg-[#22222a] border border-[#2c2c36] text-[10px] text-[#94a3b8] font-mono">
                        PID {proc.pid}
                      </span>
                      <span className="text-[#38bdf8] font-semibold truncate select-text">
                        {proc.command}
                      </span>
                    </div>
                    {proc.cwd && (
                      <p className="text-[10px] text-[#64748b] truncate select-text">
                        {proc.cwd}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleStopBgProcess(proc.process_id || proc.pid)}
                    className="px-2 py-1 rounded bg-[#ef4444]/20 hover:bg-[#ef4444]/30 border border-[#ef4444]/40 text-[#f87171] text-[10px] font-semibold transition-colors flex items-center gap-1 cursor-pointer flex-shrink-0"
                    title="Stop background process"
                  >
                    <i className="fa-solid fa-stop text-[8px]"></i>
                    <span>Stop</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div
        onClick={() => inputRef.current?.focus()}
        className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar select-text leading-relaxed"
      >
        {(!currentTerm?.logs || currentTerm.logs.length === 0) && (
          <div className="text-[#64748b] text-[11px] space-y-1 select-none">
            <p>Emris AI Interactive Terminal • Ready</p>
            <p>Working directory: <span className="text-[#cbd5e1]">{currentTerm?.cwd || activeProject?.path || "Root"}</span></p>
            <p className="text-[10px] text-[#475569]">Type commands below (e.g. npm run dev, ping, dir). Press Up/Down for command history.</p>
          </div>
        )}

        {currentTerm?.logs?.map((entry, idx) => {
          if (entry.type === "proposed") {
            return (
              <div key={idx} className="flex items-start gap-1.5 text-[#fbbf24] font-semibold pt-1">
                <span className="text-[#f59e0b] select-none">⚡</span>
                <span className="break-all">{entry.text}</span>
                <span className="text-[10px] text-[#71717a] font-normal italic ml-1 select-none">(proposed)</span>
              </div>
            );
          }
          if (entry.type === "command") {
            return (
              <div key={idx} className="flex items-start gap-1.5 text-[#38bdf8] font-semibold pt-1">
                <span className="text-[#10b981] select-none">$</span>
                <span className="break-all">{entry.text}</span>
              </div>
            );
          }
          if (entry.type === "stderr") {
            return (
              <div key={idx} className="text-[#f87171] whitespace-pre-wrap break-all text-[11px] pl-3">
                {entry.text}
              </div>
            );
          }
          if (entry.type === "status") {
            return (
              <div key={idx} className="text-[#64748b] text-[10px] italic pl-3">
                {entry.text}
              </div>
            );
          }
          return (
            <div key={idx} className="text-[#cbd5e1] whitespace-pre-wrap break-all text-[11px] pl-3">
              {entry.text}
            </div>
          );
        })}

        {isExecuting && (
          <div className="flex items-center gap-2 text-[#38bdf8] text-[11px] pl-3 animate-pulse">
            <i className="fa-solid fa-spinner fa-spin text-[10px]"></i>
            <span>Executing command in background...</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="p-2 border-t border-[#1e1e24] bg-[#0e0e12] flex items-center gap-2 flex-shrink-0">
        <div className="flex items-center gap-1 text-[11px] text-[#10b981] flex-shrink-0 select-none">
          <span className="text-[#64748b]">[{getCwdDisplay()}]</span>
          <span>$</span>
        </div>
        <input
          ref={inputRef}
          type="text"
          value={inputVal}
          disabled={isExecuting}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isExecuting ? "Command running..." : "Enter command..."}
          className="flex-1 bg-transparent text-xs text-[#f8fafc] placeholder-[#475569] outline-none font-mono"
        />
        {isExecuting ? (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleStopProcess}
              disabled={isStopping}
              className="px-2 py-0.5 rounded bg-[#ef4444]/20 hover:bg-[#ef4444]/30 border border-[#ef4444]/40 text-[#f87171] text-[10px] font-sans font-semibold transition-colors flex items-center gap-1 cursor-pointer"
              title="Stop background process"
            >
              <i className="fa-solid fa-stop text-[8px]"></i>
              <span>{isStopping ? "Stopping..." : "Stop"}</span>
            </button>
            <i className="fa-solid fa-circle-notch fa-spin text-xs text-[#38bdf8]"></i>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => handleKeyDown({ key: "Enter", preventDefault: () => {} })}
            className="text-[#64748b] hover:text-[#38bdf8] p-1 cursor-pointer transition-colors"
            title="Execute"
          >
            <i className="fa-solid fa-arrow-turn-down text-[10px] rotate-90"></i>
          </button>
        )}
      </div>
    </div>
  );
}
