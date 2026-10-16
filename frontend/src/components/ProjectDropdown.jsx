import React, { useState, useRef, useEffect } from "react";
import { useTranslation } from "../i18n/LanguageContext";

export default function ProjectDropdown({ projects = [], selectedProject, onSelectProject, onOpenFolderModal }) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      try {
        if (containerRef.current && !containerRef.current.contains(e.target)) {
          setIsOpen(false);
        }
      } catch (err) {
        console.error("[Dropdown] Click outside error:", err);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (projectName) => {
    try {
      if (onSelectProject) {
        onSelectProject(projectName);
      }
      setIsOpen(false);
    } catch (error) {
      console.error("[Dropdown] Select error:", error);
    }
  };

  const handleNewProjectClick = () => {
    try {
      setIsOpen(false);
      if (onOpenFolderModal) {
        onOpenFolderModal();
      }
    } catch (error) {
      console.error("[Dropdown] New project click error:", error);
    }
  };

  const isChosen = selectedProject && selectedProject !== "No Project" && selectedProject !== t("workspace.choose_project");
  const displayLabel = isChosen ? selectedProject : t("workspace.choose_project");

  return (
    <div ref={containerRef} className="relative inline-block text-left mb-2 select-none z-10">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#1c1c1f] hover:bg-[#222226] border border-[#2e2e32] text-[#F9F9FA] text-xs font-medium transition-colors cursor-pointer shadow-sm"
      >
        <svg className="w-3.5 h-3.5 text-[#94a3b8]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 4h18v4H3z" />
          <path d="M4 8v12a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V8" />
          <path d="M10 12h4" />
        </svg>
        <span>{displayLabel}</span>
      </button>

      {isOpen && (
        <div className="absolute left-0 bottom-full mb-2 w-56 bg-[#1c1c1f] border border-[#2e2e32] rounded-2xl shadow-2xl p-1.5 z-20 text-xs text-[#F9F9FA] space-y-0.5">
          <div className="max-h-48 overflow-y-auto space-y-0.5 custom-scrollbar py-0.5">
            <button
              type="button"
              onClick={() => handleSelect("No Project")}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-colors cursor-pointer ${
                !isChosen ? "bg-[#28282c] text-[#F9F9FA] font-medium" : "hover:bg-[#222226] text-[#D1D1D6] hover:text-[#F9F9FA]"
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <i className="fa-regular fa-circle-xmark text-[#94a3b8] text-xs"></i>
                <span>{t("workspace.no_project") || "No Project"}</span>
              </div>
              {!isChosen && <i className="fa-solid fa-check text-[#60a5fa] text-[10px]"></i>}
            </button>

            {projects.map((project) => {
              const isSelected = selectedProject === project.name;
              return (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => handleSelect(project.name)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-colors cursor-pointer ${
                    isSelected ? "bg-[#28282c] text-[#F9F9FA] font-medium" : "hover:bg-[#222226] text-[#D1D1D6] hover:text-[#F9F9FA]"
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <svg className="w-3.5 h-3.5 text-[#94a3b8] flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 4h18v4H3z" />
                      <path d="M4 8v12a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V8" />
                      <path d="M10 12h4" />
                    </svg>
                    <span className="truncate">{project.name}</span>
                  </div>
                  {isSelected && <i className="fa-solid fa-check text-[#60a5fa] text-[10px]"></i>}
                </button>
              );
            })}
          </div>

          <div className="border-t border-[#26262a] pt-1">
            <button
              type="button"
              onClick={handleNewProjectClick}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-[#F9F9FA] hover:bg-[#28282c] transition-colors text-left cursor-pointer font-medium"
            >
              <i className="fa-solid fa-plus text-[#60a5fa] text-xs"></i>
              <span>{t("workspace.new_project")}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
