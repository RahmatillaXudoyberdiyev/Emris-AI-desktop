import React, { useState, useEffect } from "react";
import { desktopApi } from "../services/api";
import TerminalView from "./TerminalView";

const ICONS = {
  js: { icon: "fa-brands fa-js", color: "text-[#f59e0b]" },
  jsx: { icon: "fa-brands fa-js", color: "text-[#f59e0b]" },
  ts: { icon: "fa-solid fa-code", color: "text-[#3b82f6]" },
  tsx: { icon: "fa-solid fa-code", color: "text-[#3b82f6]" },
  html: { icon: "fa-brands fa-html5", color: "text-[#ef4444]" },
  css: { icon: "fa-brands fa-css3-alt", color: "text-[#06b6d4]" },
  json: { icon: "fa-solid fa-brackets-curly", color: "text-[#eab308]" },
  py: { icon: "fa-brands fa-python", color: "text-[#38bdf8]" },
  md: { icon: "fa-solid fa-file-lines", color: "text-[#94a3b8]" }
};
const getFileIcon = (fileName) => {
  const ext = (fileName || "").split(".").pop().toLowerCase();
  return ICONS[ext] || { icon: "fa-solid fa-file", color: "text-[#64748b]" };
};

export default function RightPanel({
  isOpen,
  onClose,
  activeProject,
  activeConversation,
  refreshTrigger,
  latestTerminalTask
}) {
  const [activeTab, setActiveTab] = useState("files");
  const [fileTree, setFileTree] = useState([]);
  const [rootName, setRootName] = useState("");
  const [collapsedPaths, setCollapsedPaths] = useState({});
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const [panelWidth, setPanelWidth] = useState(() => {
    try {
      const saved = localStorage.getItem("emris_right_panel_width");
      return saved ? parseInt(saved, 10) : 340;
    } catch {
      return 340;
    }
  });

  const getChatId = (conv) => (conv ? String(conv.id) : "global");

  const loadTerminalsForChat = (cId, defaultCwd) => {
    try {
      const raw = localStorage.getItem(`emris_terminals_${cId}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [{ id: 1, title: "Terminal #1", logs: [], cwd: defaultCwd || "" }];
  };

  const [currentChatId, setCurrentChatId] = useState(() => getChatId(activeConversation));
  const [terminals, setTerminals] = useState(() =>
    loadTerminalsForChat(getChatId(activeConversation), activeProject?.path || "")
  );
  const [activeTerminalId, setActiveTerminalId] = useState(1);

  useEffect(() => {
    const nextChatId = getChatId(activeConversation);
    if (nextChatId !== currentChatId) {
      try {
        localStorage.setItem(`emris_terminals_${currentChatId}`, JSON.stringify(terminals));
      } catch {}
      const loaded = loadTerminalsForChat(nextChatId, activeProject?.path || "");
      setCurrentChatId(nextChatId);
      setTerminals(loaded);
      setActiveTerminalId(loaded[0]?.id || 1);
    }
  }, [activeConversation]);

  useEffect(() => {
    try {
      localStorage.setItem(`emris_terminals_${currentChatId}`, JSON.stringify(terminals));
    } catch {}
  }, [terminals, currentChatId]);

  const handleMouseDown = (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = panelWidth;
    const onMove = (ev) => {
      const nextW = Math.max(260, Math.min(window.innerWidth - 300, startW + (startX - ev.clientX)));
      setPanelWidth(nextW);
      try { localStorage.setItem("emris_right_panel_width", String(nextW)); } catch {}
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  useEffect(() => {
    try {
      if (activeProject && activeProject.path) {
        loadDirectory(activeProject.path);
        setTerminals((prev) => prev.map((t) => (t.cwd ? t : { ...t, cwd: activeProject.path })));
      } else if (activeProject?.name && activeProject.name !== "No Project") {
        desktopApi.getProjects().then((pList) => {
          const found = (pList || []).find((p) => p.name === activeProject.name);
          if (found && found.path) loadDirectory(found.path);
        }).catch((e) => console.error("[RightPanel] Fetch project fallback error:", e));
      } else {
        setFileTree([]);
        setRootName("");
        setSelectedFile(null);
        setFileContent("");
      }
    } catch (err) {
      console.error("[RightPanel] Project effect error:", err);
    }
  }, [activeProject, refreshTrigger]);

  useEffect(() => {
    try {
      if (!latestTerminalTask) return;
      setActiveTab("terminal");
      setTerminals((prev) => {
        const targetId = activeTerminalId || (prev[0] ? prev[0].id : 1);
        return prev.map((t) => {
          if (t.id === targetId) {
            const currentLogs = [...(t.logs || [])];
            if (latestTerminalTask.status === "proposed") {
              currentLogs.push({ type: "proposed", text: latestTerminalTask.command, cwd: latestTerminalTask.cwd || "." });
            } else {
              currentLogs.push({ type: "command", text: latestTerminalTask.command, cwd: latestTerminalTask.cwd || "." });
              if (latestTerminalTask.stdout) currentLogs.push({ type: "stdout", text: latestTerminalTask.stdout });
              if (latestTerminalTask.stderr) currentLogs.push({ type: "stderr", text: latestTerminalTask.stderr });
              if (latestTerminalTask.exit_code !== undefined) {
                currentLogs.push({ type: "status", text: `Process finished with exit code ${latestTerminalTask.exit_code}` });
              }
            }
            return { ...t, logs: currentLogs };
          }
          return t;
        });
      });
    } catch (err) {
      console.error("[RightPanel] Terminal task event error:", err);
    }
  }, [latestTerminalTask]);

  const handleAddTerminal = () => {
    try {
      const nextId = Math.max(0, ...terminals.map((t) => t.id)) + 1;
      setTerminals((prev) => [...prev, { id: nextId, title: `Terminal #${nextId}`, logs: [], cwd: activeProject?.path || "" }]);
      setActiveTerminalId(nextId);
    } catch (err) {
      console.error("[RightPanel] Add terminal error:", err);
    }
  };

  const handleCloseTerminal = (id) => {
    try {
      const remaining = terminals.filter((t) => t.id !== id);
      if (remaining.length === 0) {
        setTerminals([{ id: 1, title: "Terminal #1", logs: [], cwd: activeProject?.path || "" }]);
        setActiveTerminalId(1);
      } else {
        setTerminals(remaining);
        if (activeTerminalId === id) setActiveTerminalId(remaining[0].id);
      }
    } catch (err) {
      console.error("[RightPanel] Close terminal error:", err);
    }
  };

  const loadDirectory = async (folderPath) => {
    try {
      setIsLoading(true);
      const res = await desktopApi.listDirectoryFiles(folderPath);
      if (res && res.success) {
        setFileTree(res.tree || []);
        setRootName(res.root_name || activeProject?.name || "Project");
      } else {
        setFileTree([]);
        setRootName(activeProject?.name || "Project");
      }
    } catch (err) {
      console.error("[RightPanel] loadDirectory error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectFile = async (item) => {
    try {
      if (item.is_dir) {
        toggleFolder(item.path);
        return;
      }
      setSelectedFile(item);
      setActiveTab("code");
      if (activeProject?.path) {
        const res = await desktopApi.readFileContent(activeProject.path, item.path);
        setFileContent(res?.success ? (res.content || "") : `Unable to read file: ${res?.error || "Error"}`);
      }
    } catch (err) {
      console.error("[RightPanel] handleSelectFile error:", err);
    }
  };

  const toggleFolder = (path) => setCollapsedPaths((prev) => ({ ...prev, [path]: !prev[path] }));

  const handleCopyCode = () => {
    try {
      if (!fileContent) return;
      navigator.clipboard.writeText(fileContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("[RightPanel] copy code error:", err);
    }
  };

  const renderTree = (items, depth = 0) => {
    if (!items || items.length === 0) return null;
    return items.map((item) => {
      if (searchQuery.trim() && !item.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        if (!item.is_dir) return null;
      }
      const isCollapsed = Boolean(collapsedPaths[item.path]);
      const isSelected = selectedFile && selectedFile.path === item.path;
      const { icon, color } = getFileIcon(item.name);

      if (item.is_dir) {
        return (
          <div key={item.path} className="select-none">
            <div
              onClick={() => toggleFolder(item.path)}
              style={{ paddingLeft: `${depth * 14 + 10}px` }}
              className="flex items-center gap-1.5 py-1 px-2 rounded-md hover:bg-[#1f1f23] cursor-pointer text-[#94a3b8] hover:text-[#f8fafc] text-xs transition-colors"
            >
              <i className={`fa-solid fa-chevron-down text-[9px] transition-transform ${isCollapsed ? "-rotate-90" : ""}`}></i>
              <i className="fa-solid fa-folder text-[#38bdf8] text-xs"></i>
              <span className="truncate">{item.name}</span>
            </div>
            {!isCollapsed && item.children && <div>{renderTree(item.children, depth + 1)}</div>}
          </div>
        );
      }

      return (
        <div
          key={item.path}
          onClick={() => handleSelectFile(item)}
          style={{ paddingLeft: `${depth * 14 + 20}px` }}
          className={`flex items-center gap-2 py-1 px-2 rounded-md cursor-pointer text-xs transition-colors ${
            isSelected ? "bg-[#2563eb]/20 text-[#60a5fa] font-medium" : "text-[#cbd5e1] hover:text-[#f8fafc] hover:bg-[#1f1f23]"
          }`}
        >
          <i className={`${icon} ${color} text-xs flex-shrink-0`}></i>
          <span className="truncate flex-1">{item.name}</span>
        </div>
      );
    });
  };

  if (!isOpen) return null;

  return (
    <aside
      style={{ width: `${panelWidth}px` }}
      className="relative h-full bg-[#131316] border-l border-[#222226] flex flex-col flex-shrink-0 select-none z-20"
    >
      <div
        onMouseDown={handleMouseDown}
        className="absolute -left-1.5 top-0 w-3 h-full cursor-col-resize hover:bg-[#38bdf8]/40 active:bg-[#38bdf8] z-30 transition-colors"
        title="Drag to resize panel"
      />

      <div className="h-12 border-b border-[#222226] px-3 flex items-center justify-between">
        <div className="flex items-center gap-1 bg-[#1a1a1e] p-0.5 rounded-lg border border-[#27272a]">
          <button
            type="button"
            onClick={() => setActiveTab("files")}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              activeTab === "files" ? "bg-[#27272a] text-[#f8fafc] shadow-sm" : "text-[#94a3b8] hover:text-[#f8fafc]"
            }`}
          >
            Files
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("code")}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              activeTab === "code" ? "bg-[#27272a] text-[#f8fafc] shadow-sm" : "text-[#94a3b8] hover:text-[#f8fafc]"
            }`}
          >
            Code
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("terminal")}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === "terminal" ? "bg-[#27272a] text-[#38bdf8] shadow-sm" : "text-[#94a3b8] hover:text-[#f8fafc]"
            }`}
          >
            <i className="fa-solid fa-terminal text-[10px]"></i>
            <span>Terminal</span>
          </button>
        </div>

        <div className="flex items-center gap-2 text-[#94a3b8]">
          {activeTab === "files" && (
            <button
              type="button"
              onClick={() => setIsSearching(!isSearching)}
              className="p-1 hover:text-[#f8fafc] transition-colors cursor-pointer"
              title="Search files"
            >
              <i className="fa-solid fa-magnifying-glass text-xs"></i>
            </button>
          )}
          {activeTab === "files" && (
            <button
              type="button"
              onClick={() => activeProject?.path && loadDirectory(activeProject.path)}
              className="p-1 hover:text-[#f8fafc] transition-colors cursor-pointer"
              title="Refresh files"
            >
              <i className={`fa-solid fa-arrows-rotate text-xs ${isLoading ? "animate-spin" : ""}`}></i>
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:text-[#f8fafc] transition-colors cursor-pointer"
            title="Close panel"
          >
            <i className="fa-solid fa-xmark text-xs"></i>
          </button>
        </div>
      </div>

      {isSearching && activeTab === "files" && (
        <div className="p-2 border-b border-[#222226] bg-[#161619]">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search files..."
              className="w-full bg-[#1e1e22] text-[#f8fafc] placeholder-[#64748b] text-xs rounded-md pl-7 pr-3 py-1.5 border border-[#2e2e34] focus:outline-none focus:border-[#3b82f6]"
            />
            <i className="fa-solid fa-magnifying-glass text-[#64748b] text-[10px] absolute left-2.5 top-2.5"></i>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        {activeTab === "files" && (
          <div className="h-full overflow-y-auto custom-scrollbar p-2">
            {!activeProject || !activeProject.path ? (
              <div className="h-full flex flex-col items-center justify-center p-6 text-center text-[#64748b]">
                <i className="fa-solid fa-folder-open text-2xl mb-2"></i>
                <p className="text-xs">No active project folder selected.</p>
              </div>
            ) : fileTree.length === 0 ? (
              <div className="p-4 text-center text-[#64748b] text-xs">
                {isLoading ? "Loading files..." : "Empty project directory."}
              </div>
            ) : (
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 py-1 px-2 text-[#94a3b8] font-medium text-xs mb-1">
                  <i className="fa-solid fa-folder-open text-[#38bdf8]"></i>
                  <span className="truncate">{rootName}</span>
                </div>
                {renderTree(fileTree)}
              </div>
            )}
          </div>
        )}

        {activeTab === "code" && (
          <div className="h-full flex flex-col text-xs p-2">
            {selectedFile ? (
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#222226] text-[#94a3b8]">
                  <span className="truncate font-mono text-[11px] text-[#cbd5e1]">{selectedFile.name}</span>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="hover:text-[#f8fafc] flex items-center gap-1 text-[11px] cursor-pointer"
                  >
                    <i className={copied ? "fa-solid fa-check text-[#22c55e]" : "fa-regular fa-copy"}></i>
                    <span>{copied ? "Copied" : "Copy"}</span>
                  </button>
                </div>
                <div className="flex-1 overflow-auto bg-[#0f0f11] rounded-lg p-2.5 font-mono text-[11px] text-[#e2e8f0] leading-relaxed border border-[#222226]">
                  <pre className="whitespace-pre overflow-x-auto">{fileContent}</pre>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-[#64748b] text-center p-4">
                <i className="fa-solid fa-code text-2xl mb-2"></i>
                <p>Select a file from the Files tab to inspect its code.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "terminal" && (
          <div className="h-full">
            <TerminalView
              terminals={terminals}
              activeTerminalId={activeTerminalId}
              onSelectTerminal={setActiveTerminalId}
              onAddTerminal={handleAddTerminal}
              onCloseTerminal={handleCloseTerminal}
              activeProject={activeProject}
            />
          </div>
        )}
      </div>
    </aside>
  );
}
