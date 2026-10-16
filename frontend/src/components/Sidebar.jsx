import React, { useState } from "react";
import { useTranslation } from "../i18n/LanguageContext";
import ConfirmModal from "./ConfirmModal";

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
  onDeleteConversation,
  onNewProjectConversation
}) {
  const { t } = useTranslation();
  const [isProjectsSectionOpen, setIsProjectsSectionOpen] = useState(true);
  const [collapsedProjects, setCollapsedProjects] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);

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

  const handleConfirmDelete = () => {
    try {
      if (!deleteTarget) return;
      if (deleteTarget.type === "project" && onDeleteProject) {
        onDeleteProject(deleteTarget.id);
      } else if (deleteTarget.type === "conversation" && onDeleteConversation) {
        onDeleteConversation(deleteTarget.id);
      }
      setDeleteTarget(null);
    } catch (err) {
      console.error("[Sidebar] Confirm delete error:", err);
    }
  };

  const standaloneConversations = conversations.filter((c) => !c.project_id);

  return (
    <aside
      id="sidebar"
      className="w-64 h-full max-h-screen bg-[#151515] border-r border-[#26262a] flex flex-col flex-shrink-0 overflow-hidden z-40 select-none text-[#F9F9FA]"
    >
      <div className="p-3 border-b border-[#26262a] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#2563eb] to-[#3b82f6] flex items-center justify-center font-bold text-xs text-white shadow-sm">
            E
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-xs tracking-tight">{t("sidebar.brand")}</span>
            <span className="text-[10px] text-[#64748b] -mt-0.5">{t("sidebar.version")}</span>
          </div>
        </div>
      </div>

      <div className="p-3">
        <button
          type="button"
          onClick={onNewConversation}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-[#1e1e22] hover:bg-[#28282c] border border-[#2e2e32] text-xs font-medium text-[#F9F9FA] transition-colors cursor-pointer shadow-sm"
        >
          <i className="fa-solid fa-plus text-[#60a5fa] text-xs"></i>
          <span>{t("sidebar.new_chat")}</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 space-y-4 custom-scrollbar text-xs">
        <div>
          <div className="px-2 flex items-center justify-between text-xs font-semibold text-[#94a3b8] mb-1">
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
            <div className="space-y-1">
              {projects.length === 0 ? (
                <div className="px-3 py-2 text-[11px] text-[#64748b] italic">
                  {t("sidebar.no_projects")}
                </div>
              ) : (
                projects.map((project) => {
                  const isCurrentProject = activeProjectName === project.name;
                  const isCollapsed = Boolean(collapsedProjects[project.name]);
                  const projectChats = conversations.filter((c) => String(c.project_id) === String(project.id));

                  return (
                    <div key={project.id} className="space-y-0.5">
                      <div
                        onClick={() => {
                          setCollapsedProjects((prev) => ({ ...prev, [project.name]: false }));
                          if (onSelectProject) onSelectProject(project.name);
                        }}
                        className={`group flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors ${
                          isCurrentProject
                            ? "text-[#F9F9FA] font-medium bg-[#1e1e22]/50"
                            : "text-[#D1D1D6] hover:text-[#F9F9FA] hover:bg-[#1e1e22]"
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                          <svg className="w-3.5 h-3.5 text-[#94a3b8] flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 4h18v4H3z" />
                            <path d="M4 8v12a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V8" />
                            <path d="M10 12h4" />
                          </svg>
                          <span className="truncate">{project.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {onNewProjectConversation && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setCollapsedProjects((prev) => ({ ...prev, [project.name]: false }));
                                onNewProjectConversation(project);
                              }}
                              className="opacity-0 group-hover:opacity-100 hover:text-[#60a5fa] p-0.5 transition-opacity cursor-pointer"
                              title="New chat in this project"
                            >
                              <i className="fa-solid fa-plus text-[10px]"></i>
                            </button>
                          )}
                          {onDeleteProject && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteTarget({ type: "project", id: project.id, name: project.name });
                              }}
                              className="opacity-0 group-hover:opacity-100 hover:text-[#ef4444] p-0.5 transition-opacity cursor-pointer"
                              title="Delete project"
                            >
                              <i className="fa-regular fa-trash-can text-[10px]"></i>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleProjectCollapse(project.name);
                            }}
                            className="p-0.5 hover:text-[#F9F9FA] transition-colors"
                          >
                            <i className={`fa-solid fa-chevron-down text-[8px] text-[#64748b] transition-transform ${isCollapsed ? "-rotate-90" : ""}`}></i>
                          </button>
                        </div>
                      </div>

                      {!isCollapsed && (
                        <div className="pl-3 space-y-0.5 border-l border-[#26262a] ml-3 mt-0.5">
                          {projectChats.map((chat) => {
                            const isSelected = selectedChatId === chat.id;
                            return (
                              <div
                                key={chat.id}
                                onClick={() => {
                                  if (onSelectConversation) onSelectConversation(chat);
                                }}
                                className={`group flex items-center justify-between px-2 py-1.5 rounded-lg cursor-pointer transition-colors text-[11px] ${
                                  isSelected
                                    ? "bg-[#28282c] text-[#F9F9FA] font-medium shadow-sm"
                                    : "text-[#D1D1D6] hover:text-[#F9F9FA] hover:bg-[#222226]"
                                }`}
                              >
                                <div className="flex items-center gap-1.5 truncate flex-1 min-w-0">
                                  <svg className={`w-3 h-3 flex-shrink-0 ${isSelected ? "text-[#60a5fa]" : "text-[#64748b]"}`} viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 3c-4.97 0-9 3.58-9 8 0 1.68.59 3.24 1.61 4.52L3 21l5.72-1.52C9.8 19.8 10.87 20 12 20c4.97 0 9-3.58 9-8s-4.03-8-9-8z" />
                                  </svg>
                                  <span className="truncate">{chat.title}</span>
                                </div>
                                {onDeleteConversation && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDeleteTarget({ type: "conversation", id: chat.id, name: chat.title });
                                    }}
                                    className="opacity-0 group-hover:opacity-100 hover:text-[#ef4444] p-0.5 transition-opacity cursor-pointer"
                                    title="Delete chat"
                                  >
                                    <i className="fa-regular fa-trash-can text-[9px]"></i>
                                  </button>
                                )}
                              </div>
                            );
                          })}

                          {onNewProjectConversation && (
                            <button
                              type="button"
                              onClick={() => {
                                setCollapsedProjects((prev) => ({ ...prev, [project.name]: false }));
                                onNewProjectConversation(project);
                              }}
                              className="w-full flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] text-[#60a5fa] hover:text-[#93c5fd] hover:bg-[#222226] transition-colors cursor-pointer font-medium"
                            >
                              <i className="fa-solid fa-plus text-[8px]"></i>
                              <span>{t("sidebar.new_chat")}</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        <div>
          <div className="px-2 text-xs font-semibold text-[#94a3b8] mb-1">
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
                    className={`group flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors text-xs ${
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
                          setDeleteTarget({ type: "conversation", id: chat.id, name: chat.title });
                        }}
                        className="opacity-0 group-hover:opacity-100 hover:text-[#ef4444] p-0.5 transition-opacity cursor-pointer"
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

      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title={t("modal.confirm_title")}
        message={
          deleteTarget?.type === "project"
            ? t("modal.confirm_project")
            : t("modal.confirm_conversation")
        }
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </aside>
  );
}
