import React, { useState, useEffect } from "react";
import { desktopApi } from "../services/api";

const getFileIcon = (fileName) => {
  const ext = (fileName || "").split(".").pop().toLowerCase();
  switch (ext) {
    case "js":
    case "jsx":
      return { icon: "fa-brands fa-js", color: "text-[#f59e0b]" };
    case "ts":
    case "tsx":
      return { icon: "fa-solid fa-code", color: "text-[#3b82f6]" };
    case "html":
      return { icon: "fa-brands fa-html5", color: "text-[#ef4444]" };
    case "css":
      return { icon: "fa-brands fa-css3-alt", color: "text-[#06b6d4]" };
    case "json":
      return { icon: "fa-solid fa-brackets-curly", color: "text-[#eab308]" };
    case "py":
      return { icon: "fa-brands fa-python", color: "text-[#38bdf8]" };
    case "md":
      return { icon: "fa-solid fa-file-lines", color: "text-[#94a3b8]" };
    case "png":
    case "jpg":
    case "jpeg":
    case "svg":
    case "ico":
      return { icon: "fa-solid fa-image", color: "text-[#a855f7]" };
    default:
      return { icon: "fa-solid fa-file", color: "text-[#64748b]" };
  }
};

export default function RightPanel({ isOpen, onClose, activeProject, refreshTrigger }) {
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

  useEffect(() => {
    try {
      if (activeProject && activeProject.path) {
        loadDirectory(activeProject.path);
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
        if (res && res.success) {
          setFileContent(res.content || "");
        } else {
          setFileContent(`Unable to read file content: ${res?.error || "Unknown error"}`);
        }
      }
    } catch (err) {
      console.error("[RightPanel] handleSelectFile error:", err);
    }
  };

  const toggleFolder = (path) => {
    setCollapsedPaths((prev) => ({ ...prev, [path]: !prev[path] }));
  };

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
            {!isCollapsed && item.children && (
              <div>{renderTree(item.children, depth + 1)}</div>
            )}
          </div>
        );
      }

      return (
        <div
          key={item.path}
          onClick={() => handleSelectFile(item)}
          style={{ paddingLeft: `${depth * 14 + 20}px` }}
          className={`flex items-center gap-2 py-1 px-2 rounded-md cursor-pointer text-xs transition-colors ${
            isSelected
              ? "bg-[#2563eb]/20 text-[#60a5fa] font-medium"
              : "text-[#cbd5e1] hover:text-[#f8fafc] hover:bg-[#1f1f23]"
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
    <aside className="w-80 h-full bg-[#131316] border-l border-[#222226] flex flex-col flex-shrink-0 select-none z-20">
      <div className="h-12 border-b border-[#222226] px-4 flex items-center justify-between">
        <div className="flex items-center gap-1 bg-[#1a1a1e] p-0.5 rounded-lg border border-[#27272a]">
          <button
            type="button"
            onClick={() => setActiveTab("files")}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              activeTab === "files"
                ? "bg-[#27272a] text-[#f8fafc] shadow-sm"
                : "text-[#94a3b8] hover:text-[#f8fafc]"
            }`}
          >
            Files
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("code")}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              activeTab === "code"
                ? "bg-[#27272a] text-[#f8fafc] shadow-sm"
                : "text-[#94a3b8] hover:text-[#f8fafc]"
            }`}
          >
            Code
          </button>
        </div>

        <div className="flex items-center gap-2 text-[#94a3b8]">
          <button
            type="button"
            onClick={() => setIsSearching(!isSearching)}
            className="p-1 hover:text-[#f8fafc] transition-colors cursor-pointer"
            title="Search files"
          >
            <i className="fa-solid fa-magnifying-glass text-xs"></i>
          </button>
          <button
            type="button"
            onClick={() => activeProject?.path && loadDirectory(activeProject.path)}
            className="p-1 hover:text-[#f8fafc] transition-colors cursor-pointer"
            title="Refresh files"
          >
            <i className={`fa-solid fa-arrows-rotate text-xs ${isLoading ? "animate-spin" : ""}`}></i>
          </button>
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

      <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
        {activeTab === "files" ? (
          <div>
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
        ) : (
          <div className="h-full flex flex-col text-xs">
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
      </div>
    </aside>
  );
}
