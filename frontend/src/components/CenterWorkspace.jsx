import React, { useState } from "react";
import ProjectDropdown from "./ProjectDropdown";
import AgentActivityCard from "./AgentActivityCard";
import { MODEL_OPTIONS } from "../constants/uiData";
import { useTranslation } from "../i18n/LanguageContext";
import { desktopApi } from "../services/api";

export default function CenterWorkspace({
  projects = [],
  currentProject,
  activeConversation,
  messages = [],
  agentState = null,
  onCancelAgent,
  onSelectProject,
  onOpenFolderModal,
  onSubmitPrompt
}) {
  const { t } = useTranslation();
  const [promptText, setPromptText] = useState("");
  const [selectedTab, setSelectedTab] = useState("work");
  const [selectedModel, setSelectedModel] = useState("gemini-3.5-flash-lite");
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);

  const handleChatTabClick = async () => {
    try {
      await desktopApi.openExternal("https://suniyintellekt.uz");
    } catch (error) {
      console.error("[Workspace] Failed to open external browser:", error);
    }
  };

  const handleWorkTabClick = () => {
    try {
      setSelectedTab("work");
    } catch (error) {
      console.error("[Workspace] Error setting work tab:", error);
    }
  };

  const handleFormSubmit = (e) => {
    try {
      e.preventDefault();
      if (!promptText.trim() || agentState?.isRunning) return;
      if (onSubmitPrompt) {
        onSubmitPrompt(promptText.trim(), selectedModel);
      }
      setPromptText("");
    } catch (error) {
      console.error("[Workspace] Error submitting prompt:", error);
    }
  };

  const currentModelLabel = MODEL_OPTIONS.find((m) => m.value === selectedModel)?.label || "Gemini 3.5 Flash Lite";

  return (
    <div className="flex-1 flex flex-col justify-center items-center px-4 md:px-8 py-8 overflow-y-auto select-none custom-scrollbar bg-[#131314]">
      <div className="w-full max-w-3xl flex flex-col justify-center space-y-3">
        {messages.length > 0 && (
          <div className="w-full max-h-[45vh] overflow-y-auto space-y-3 mb-2 custom-scrollbar pr-2">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                  msg.role === "user"
                    ? "bg-[#1e1e22] text-[#F9F9FA] ml-auto max-w-[85%] border border-[#2e2e32]"
                    : "bg-[#1c1c1f] text-[#cbd5e1] mr-auto max-w-[90%] border border-[#26262a]"
                }`}
              >
                <div className="font-semibold text-[10px] text-[#94a3b8] mb-1">
                  {msg.role === "user" ? "You" : "Emris AI"}
                </div>
                <div className="whitespace-pre-wrap">{msg.content}</div>
              </div>
            ))}
          </div>
        )}

        {agentState && (
          <AgentActivityCard
            isRunning={agentState.isRunning}
            currentStage={agentState.currentStage}
            plan={agentState.plan}
            actions={agentState.actions}
            onCancel={onCancelAgent}
          />
        )}

        <div className="w-full text-left">
          <ProjectDropdown
            projects={projects}
            selectedProject={currentProject}
            onSelectProject={onSelectProject}
            onOpenFolderModal={onOpenFolderModal}
          />

          <form
            onSubmit={handleFormSubmit}
            className="relative flex items-center bg-[#1c1c1f] border border-[#2e2e32] focus-within:border-[#2563eb] rounded-2xl p-2 shadow-2xl transition-colors"
          >
            <button
              type="button"
              onClick={onOpenFolderModal}
              className="p-2 text-[#94a3b8] hover:text-[#F9F9FA] rounded-xl hover:bg-[#222226] transition-colors flex-shrink-0 cursor-pointer mr-1.5"
              title="Add context / choose folder"
            >
              <i className="fa-solid fa-plus text-xs"></i>
            </button>

            <div className="flex items-center bg-[#1e1e22] rounded-xl p-0.5 border border-[#2e2e32] flex-shrink-0 mr-2 text-xs">
              <button
                type="button"
                onClick={handleChatTabClick}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  selectedTab === "chat"
                    ? "bg-[#2563eb] text-[#ffffff] font-medium shadow-sm"
                    : "text-[#94a3b8] hover:text-[#F9F9FA]"
                }`}
                title="Opens suniyintellekt.uz in default browser"
              >
                <i className="fa-regular fa-comment-dots text-[#60a5fa] text-xs"></i>
                <span>{t("workspace.chat_mode")}</span>
              </button>

              <button
                type="button"
                onClick={handleWorkTabClick}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  selectedTab === "work"
                    ? "bg-[#28282c] text-[#F9F9FA] font-medium shadow-sm border border-[#2e2e32]"
                    : "text-[#94a3b8] hover:text-[#F9F9FA]"
                }`}
              >
                <i className="fa-solid fa-briefcase text-[#f59e0b] text-xs"></i>
                <span>{t("workspace.work_mode")}</span>
              </button>
            </div>

            <input
              type="text"
              value={promptText}
              disabled={agentState?.isRunning}
              onChange={(e) => setPromptText(e.target.value)}
              placeholder={agentState?.isRunning ? "Agent topshiriqni bajarmoqda..." : t("workspace.placeholder")}
              className="flex-1 bg-transparent border-0 text-xs sm:text-sm text-[#F9F9FA] placeholder-[#64748b] px-2 py-2 focus:outline-none disabled:opacity-50"
            />

            <div className="relative flex-shrink-0 ml-2">
              <button
                type="button"
                onClick={() => setIsModelMenuOpen(!isModelMenuOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#1e1e22] hover:bg-[#28282c] border border-[#2e2e32] text-[#F9F9FA] text-xs font-medium transition-colors cursor-pointer"
              >
                <span className="truncate max-w-[140px]">{currentModelLabel}</span>
                <i className="fa-solid fa-chevron-down text-[8px] text-[#94a3b8]"></i>
              </button>

              {isModelMenuOpen && (
                <div className="absolute right-0 bottom-full mb-2 w-52 bg-[#1c1c1f] border border-[#2e2e32] rounded-xl shadow-2xl py-1 z-50 text-xs">
                  {MODEL_OPTIONS.map((m) => (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => {
                        setSelectedModel(m.value);
                        setIsModelMenuOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 hover:bg-[#222226] transition-colors ${
                        selectedModel === m.value ? "text-[#60a5fa] font-medium bg-[#28282c]" : "text-[#D1D1D6]"
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </form>

          <div className="text-[10px] text-center text-[#64748b] mt-3 leading-relaxed">
            {t("workspace.legal_prefix")}{" "}
            <a
              href="https://www.suniyintellekt.uz/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#94a3b8] hover:text-[#60a5fa] hover:underline"
            >
              {t("workspace.terms")}
            </a>{" "}
            {t("workspace.and")}{" "}
            <a
              href="https://www.suniyintellekt.uz/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#94a3b8] hover:text-[#60a5fa] hover:underline"
            >
              {t("workspace.privacy")}
            </a>{" "}
            {t("workspace.legal_suffix")} • {t("workspace.founder")}{" "}
            <a
              href="https://rahmatilla.uz/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#60a5fa] hover:underline"
            >
              Rahmatilla.uz
            </a>{" "}
            ({" "}
            <a
              href="https://t.me/rahmatilla_uz"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#60a5fa] hover:underline"
            >
              @rahmatilla_uz
            </a>{" "}
            ). {t("workspace.disclaimer")} • © 2026
          </div>
        </div>
      </div>
    </div>
  );
}
