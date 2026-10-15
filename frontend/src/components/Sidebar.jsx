import React, { useState } from "react";
import { useTranslation } from "../i18n/LanguageContext";

export default function Sidebar({
  projects = [],
  conversations = [],
  activeProjectName,
  selectedChatId,
  onSelectProject,
  onSelectConversation,
  onNewConversation,
  onOpenFolderModal,
  onDeleteProject,
  onDeleteConversation
}) {
  const { t } = useTranslation();
  const [isProjectsSectionOpen, setIsProjectsSectionOpen] = useState(true);
  const [collapsedProjects, setCollapsedProjects] = useState({});

  const toggleProjectCollapse = (projectName) => {
    try {
      setCollapsedProjects((prev) => ({
        ...prev,
        [projectName]: !prev[projectName]
      }));
    } catch (error) {
      console.error("[Sidebar] Error toggling project collapse:", error);
    }
  };

  const toggleAllProjectsSection = () => {
    try {
      setIsProjectsSectionOpen((prev) => !prev);
    } catch (error) {
      console.error("[Sidebar] Error toggling Projects section:", error);
    }
  };

  const standaloneConversations = conversations.filter((c) => !c.project_id);

  return (
    <aside
      id="sidebar"
      className="w-64 h-full max-h-screen bg-[#151515] border-r border-[#26262a] flex flex-col flex-shrink-0 overflow-hidden z-30 select-none text-[#F9F9FA]"
    >
      <div className="p-3 border-b border-[#26262a] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img
            src="/favicon-32x32.png"
            alt="Emris AI"
            className="w-7 h-7 rounded-lg object-contain shadow-sm"
          />
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-sm tracking-tight text-[#F9F9FA]">
              {t("sidebar.brand")}
            </span>
            <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-[#2563eb]/20 text-[#60a5fa] border border-[#2563eb]/30">
              {t("sidebar.version")}
            </span>
          </div>
        </div>
      </div>

      <div className="p-3 pb-2">
        <button
          type="button"
          onClick={onNewConversation}
          className="w-full py-2.5 px-3 rounded-xl bg-[#1e1e22] hover:bg-[#28282c] text-[#F9F9FA] border border-[#2e2e32] transition-colors flex items-center gap-2 text-xs font-medium cursor-pointer shadow-sm"
        >
          <i className="fa-solid fa-plus text-[#60a5fa] text-xs"></i>
          <span>{t("sidebar.new_chat")}</span>
        </button>
      </div>

      <div
        id="sessions-list"
        className="flex-1 min-h-0 overflow-y-auto px-2 space-y-4 py-2 custom-scrollbar text-xs"
      >
        <div className="space-y-1.5">
          <div className="px-2 flex items-center justify-between text-xs font-semibold text-[#94a3b8]">
            <button
              type="button"
              onClick={toggleAllProjectsSection}
              className="flex items-center gap-1.5 cursor-pointer hover:text-[#F9F9FA] transition-colors"
              title="Toggle all projects"
            >
              <span>{t("sidebar.projects")}</span>
              <i className={`fa-solid fa-chevron-down text-[8px] text-[#64748b] transition-transform ${isProjectsSectionOpen ? "" : "-rotate-90"}`}></i>
            </button>
            <div className="flex items-center gap-2 text-[#64748b]">
              <button
                type="button"
                onClick={onOpenFolderModal}
                className="hover:text-[#F9F9FA] p-0.5 cursor-pointer"
                title="New Project"
              >
                <i className="fa-solid fa-plus text-xs"></i>
              </button>
            </div>
          </div>

          {isProjectsSectionOpen && (
            <div className="space-y-2">
              {projects.length === 0 ? (
                <div className="px-3 py-2 text-[11px] text-[#64748b] italic">
                  {t("sidebar.no_projects")}
                </div>
              ) : (
                projects.map((project) => {
                  const isCurrentProject = activeProjectName === project.name;
                  const isCollapsed = Boolean(collapsedProjects[project.name]);
                  const projectChats = conversations.filter((c) => c.project_id === project.id);

                  return (
                    <div key={project.id} className="space-y-1">
                      <div
                        onClick={() => {
                          toggleProjectCollapse(project.name);
                          if (onSelectProject) onSelectProject(project.name);
                        }}
                        className={`group flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors ${
                          isCurrentProject
                            ? "text-[#F9F9FA] font-medium"
                            : "text-[#D1D1D6] hover:text-[#F9F9FA] hover:bg-[#1e1e22]"
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <svg className="w-3.5 h-3.5 text-[#94a3b8] flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 4h18v4H3z" />
                            <path d="M4 8v12a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V8" />
                            <path d="M10 12h4" />
                          </svg>
                          <span className="truncate">{project.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {onDeleteProject && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm(t("sidebar.confirm_delete"))) {
                                  onDeleteProject(project.id);
                                }
                              }}
                              className="opacity-0 group-hover:opacity-100 hover:text-[#ef4444] p-0.5 transition-opacity"
                              title="Delete project"
                            >
                              <i className="fa-regular fa-trash-can text-[10px]"></i>
                            </button>
                          )}
                          <i className={`fa-solid fa-chevron-down text-[8px] text-[#64748b] transition-transform ${isCollapsed ? "-rotate-90" : ""}`}></i>
                        </div>
                      </div>

                      {!isCollapsed && (
                        <div className="pl-3 space-y-0.5">
                          {projectChats.map((chat) => {
                            const isSelected = selectedChatId === chat.id;
                            return (
                              <div
                                key={chat.id}
                                onClick={() => {
                                  if (onSelectConversation) onSelectConversation(chat);
                                }}
                                className={`group flex items-center justify-between px-2.5 py-2 rounded-xl cursor-pointer transition-colors text-xs ${
                                  isSelected
                                    ? "bg-[#28282c] text-[#F9F9FA] font-medium shadow-sm"
                                    : "text-[#D1D1D6] hover:text-[#F9F9FA] hover:bg-[#222226]"
                                }`}
                              >
                                <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                                  <svg className={`w-3.5 h-3.5 flex-shrink-0 ${isSelected ? "text-[#60a5fa]" : "text-[#64748b]"}`} viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 3c-4.97 0-9 3.58-9 8 0 1.68.59 3.24 1.61 4.52L3 21l5.72-1.52C9.8 19.8 10.87 20 12 20c4.97 0 9-3.58 9-8s-4.03-8-9-8z" />
                                  </svg>
                                  <span className="truncate">{chat.title}</span>
                                </div>
                                {onDeleteConversation && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (window.confirm(t("sidebar.confirm_delete"))) {
                                        onDeleteConversation(chat.id);
                                      }
                                    }}
                                    className="opacity-0 group-hover:opacity-100 hover:text-[#ef4444] p-0.5 transition-opacity"
                                    title="Delete chat"
                                  >
                                    <i className="fa-regular fa-trash-can text-[10px]"></i>
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        <div className="space-y-1.5 pt-2 border-t border-[#222226]">
          <div className="px-2 text-xs font-semibold text-[#94a3b8]">
            <span>{t("sidebar.conversations")}</span>
          </div>

          <div className="space-y-0.5">
            {standaloneConversations.length === 0 ? (
              <div className="px-3 py-2 text-[11px] text-[#64748b] italic">
                {t("sidebar.no_conversations")}
              </div>
            ) : (
              standaloneConversations.map((chat) => {
                const isSelected = selectedChatId === chat.id;
                return (
                  <div
                    key={chat.id}
                    onClick={() => {
                      if (onSelectConversation) onSelectConversation(chat);
                    }}
                    className={`group flex items-center justify-between px-2.5 py-2 rounded-xl cursor-pointer transition-colors text-xs ${
                      isSelected
                        ? "bg-[#28282c] text-[#F9F9FA] font-medium shadow-sm"
                        : "text-[#D1D1D6] hover:text-[#F9F9FA] hover:bg-[#222226]"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                      <svg className={`w-3.5 h-3.5 flex-shrink-0 ${isSelected ? "text-[#60a5fa]" : "text-[#64748b]"}`} viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 3c-4.97 0-9 3.58-9 8 0 1.68.59 3.24 1.61 4.52L3 21l5.72-1.52C9.8 19.8 10.87 20 12 20c4.97 0 9-3.58 9-8s-4.03-8-9-8z" />
                      </svg>
                      <span className="truncate">{chat.title}</span>
                    </div>
                    {onDeleteConversation && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(t("sidebar.confirm_delete"))) {
                            onDeleteConversation(chat.id);
                          }
                        }}
                        className="opacity-0 group-hover:opacity-100 hover:text-[#ef4444] p-0.5 transition-opacity"
                        title="Delete chat"
                      >
                        <i className="fa-regular fa-trash-can text-[10px]"></i>
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
