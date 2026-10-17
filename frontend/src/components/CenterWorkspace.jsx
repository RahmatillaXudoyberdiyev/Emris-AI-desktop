import React, { useState, useEffect, useRef } from "react";
import ProjectDropdown from "./ProjectDropdown";
import AgentActivityCard from "./AgentActivityCard";
import ChatMessage from "./ChatMessage";
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
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    try {
      if (messages.length > 0 || agentState) {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    } catch (err) {
      console.error("[Workspace] Auto-scroll error:", err);
    }
  }, [messages, agentState]);

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
      if (e) e.preventDefault();
      if (!promptText.trim() || agentState?.isRunning) return;
      if (onSubmitPrompt) {
        onSubmitPrompt(promptText.trim(), selectedModel);
      }
      setPromptText("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    } catch (error) {
      console.error("[Workspace] Error submitting prompt:", error);
    }
  };

  const handleKeyDown = (e) => {
    try {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleFormSubmit();
      }
    } catch (error) {
      console.error("[Workspace] Keydown error:", error);
    }
  };

  const handleTextareaInput = (e) => {
    try {
      setPromptText(e.target.value);
      e.target.style.height = "auto";
      e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`;
    } catch (err) {
      console.error("[Workspace] Textarea input error:", err);
    }
  };

  const currentModelLabel = MODEL_OPTIONS.find((m) => m.value === selectedModel)?.label || "Gemini 3.5 Flash Lite";

  if (messages.length > 0 || agentState) {
    return (
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#131314] relative z-0">
        <div className="flex items-center justify-between px-6 py-2.5 border-b border-[#222226] bg-[#161618] text-xs text-[#a1a1aa] flex-shrink-0">
          <div className="flex items-center gap-2 truncate">
            <span className="font-medium text-[#e4e4e7] truncate">
              {activeConversation?.title || t("workspace.chat_mode")}
            </span>
            <span className="text-[#52525b]">•</span>
            <span className="px-2 py-0.5 rounded-md bg-[#222226] text-[#a1a1aa] text-[11px] font-mono">
              {currentProject}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenFolderModal}
              className="px-2.5 py-1 rounded-lg bg-[#222226] hover:bg-[#27272a] text-[#d4d4d8] text-[11px] transition-colors cursor-pointer"
            >
              <i className="fa-solid fa-folder-open text-[10px] mr-1.5 text-[#a1a1aa]"></i>
              <span>{t("workspace.choose_folder")}</span>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 custom-scrollbar">
          <div className="max-w-3xl w-full mx-auto space-y-4">
            {messages.map((msg, index) => {
              const isLastAssistant = msg.role === "assistant" && index === messages.length - 1;
              return (
                <React.Fragment key={msg.id}>
                  {isLastAssistant && agentState && (
                    <div className="w-full pt-1">
                      <AgentActivityCard
                        isRunning={agentState.isRunning}
                        currentStage={agentState.currentStage}
                        plan={agentState.plan}
                        actions={agentState.actions}
                        onCancel={onCancelAgent}
                        projectName={currentProject}
                      />
                    </div>
                  )}
                  <ChatMessage
                    message={msg}
                    currentModelLabel={currentModelLabel}
                  />
                </React.Fragment>
              );
            })}

            {agentState && (!messages.some((m) => m.role === "assistant") || messages[messages.length - 1]?.role === "user") && (
              <div className="w-full pt-1">
                <AgentActivityCard
                  isRunning={agentState.isRunning}
                  currentStage={agentState.currentStage}
                  plan={agentState.plan}
                  actions={agentState.actions}
                  onCancel={onCancelAgent}
                  projectName={currentProject}
                />
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="w-full border-t border-[#222226] bg-[#131314]/95 backdrop-blur px-4 py-3 flex-shrink-0">
          <div className="max-w-3xl w-full mx-auto">
            <form
              onSubmit={handleFormSubmit}
              className="relative flex items-center bg-[#1c1c1f] border border-[#2e2e32] focus-within:border-[#3f3f46] rounded-2xl p-2 shadow-lg transition-colors"
            >
              <button
                type="button"
                onClick={onOpenFolderModal}
                className="p-2 text-[#a1a1aa] hover:text-[#F9F9FA] rounded-xl hover:bg-[#27272a] transition-colors flex-shrink-0 cursor-pointer mr-1"
                title="Add context / choose folder"
              >
                <i className="fa-solid fa-plus text-xs"></i>
              </button>

              <textarea
                ref={textareaRef}
                rows={1}
                value={promptText}
                disabled={agentState?.isRunning}
                onChange={handleTextareaInput}
                onKeyDown={handleKeyDown}
                placeholder={agentState?.isRunning ? "Agent topshiriqni bajarmoqda..." : t("workspace.placeholder")}
                className="flex-1 bg-transparent border-0 text-xs sm:text-sm text-[#F9F9FA] placeholder-[#71717a] px-2 py-1.5 focus:outline-none resize-none max-h-36 disabled:opacity-50"
              />

              <div className="relative flex-shrink-0 ml-2">
                <button
                  type="button"
                  onClick={() => setIsModelMenuOpen(!isModelMenuOpen)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#222226] hover:bg-[#27272a] border border-[#2e2e32] text-[#e4e4e7] text-xs font-medium transition-colors cursor-pointer"
                >
                  <span className="truncate max-w-[130px]">{currentModelLabel}</span>
                  <i className="fa-solid fa-chevron-down text-[8px] text-[#a1a1aa]"></i>
                </button>

                {isModelMenuOpen && (
                  <div className="absolute right-0 bottom-full mb-2 w-56 bg-[#1c1c1f] border border-[#2e2e32] rounded-xl shadow-2xl py-1 z-50 text-xs">
                    {MODEL_OPTIONS.map((m) => (
                      <button
                        key={m.value}
                        type="button"
                        onClick={() => {
                          setSelectedModel(m.value);
                          setIsModelMenuOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 hover:bg-[#27272a] transition-colors ${
                          selectedModel === m.value ? "text-[#f4f4f5] font-medium bg-[#27272a]" : "text-[#a1a1aa]"
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={!promptText.trim() || agentState?.isRunning}
                className="ml-1.5 p-2 rounded-xl bg-[#27272a] hover:bg-[#3f3f46] text-[#F9F9FA] disabled:opacity-40 disabled:hover:bg-[#27272a] transition-colors cursor-pointer flex-shrink-0"
              >
                <i className="fa-solid fa-arrow-up text-xs"></i>
              </button>
            </form>

            <div className="text-[10px] text-center text-[#52525b] mt-2">
              {t("workspace.disclaimer")}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col justify-center items-center px-4 md:px-8 py-8 overflow-y-auto select-none custom-scrollbar bg-[#131314] relative z-0">
      <div className="w-full max-w-3xl flex flex-col justify-center space-y-3">
        <div className="w-full text-left">
          <ProjectDropdown
            projects={projects}
            selectedProject={currentProject}
            onSelectProject={onSelectProject}
            onOpenFolderModal={onOpenFolderModal}
          />

          <form
            onSubmit={handleFormSubmit}
            className="relative flex items-center bg-[#1c1c1f] border border-[#2e2e32] focus-within:border-[#3f3f46] rounded-2xl p-2 shadow-2xl transition-colors"
          >
            <button
              type="button"
              onClick={onOpenFolderModal}
              className="p-2 text-[#a1a1aa] hover:text-[#F9F9FA] rounded-xl hover:bg-[#27272a] transition-colors flex-shrink-0 cursor-pointer mr-1.5"
              title="Add context / choose folder"
            >
              <i className="fa-solid fa-plus text-xs"></i>
            </button>

            <div className="flex items-center bg-[#18181b] rounded-xl p-0.5 border border-[#27272a] flex-shrink-0 mr-2 text-xs">
              <button
                type="button"
                onClick={handleChatTabClick}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  selectedTab === "chat"
                    ? "bg-[#27272a] text-[#ffffff] font-medium shadow-sm"
                    : "text-[#a1a1aa] hover:text-[#F9F9FA]"
                }`}
                title="Opens suniyintellekt.uz in default browser"
              >
                <i className="fa-regular fa-comment-dots text-xs text-[#a1a1aa]"></i>
                <span>{t("workspace.chat_mode")}</span>
              </button>

              <button
                type="button"
                onClick={handleWorkTabClick}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  selectedTab === "work"
                    ? "bg-[#27272a] text-[#F9F9FA] font-medium shadow-sm border border-[#3f3f46]/40"
                    : "text-[#a1a1aa] hover:text-[#F9F9FA]"
                }`}
              >
                <i className="fa-solid fa-briefcase text-xs text-[#a1a1aa]"></i>
                <span>{t("workspace.work_mode")}</span>
              </button>
            </div>

            <input
              type="text"
              value={promptText}
              disabled={agentState?.isRunning}
              onChange={(e) => setPromptText(e.target.value)}
              placeholder={agentState?.isRunning ? "Agent topshiriqni bajarmoqda..." : t("workspace.placeholder")}
              className="flex-1 bg-transparent border-0 text-xs sm:text-sm text-[#F9F9FA] placeholder-[#71717a] px-2 py-2 focus:outline-none disabled:opacity-50"
            />

            <div className="relative flex-shrink-0 ml-2">
              <button
                type="button"
                onClick={() => setIsModelMenuOpen(!isModelMenuOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#222226] hover:bg-[#27272a] border border-[#2e2e32] text-[#e4e4e7] text-xs font-medium transition-colors cursor-pointer"
              >
                <span className="truncate max-w-[140px]">{currentModelLabel}</span>
                <i className="fa-solid fa-chevron-down text-[8px] text-[#a1a1aa]"></i>
              </button>

              {isModelMenuOpen && (
                <div className="absolute right-0 bottom-full mb-2 w-56 bg-[#1c1c1f] border border-[#2e2e32] rounded-xl shadow-2xl py-1 z-50 text-xs">
                  {MODEL_OPTIONS.map((m) => (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => {
                        setSelectedModel(m.value);
                        setIsModelMenuOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 hover:bg-[#27272a] transition-colors ${
                        selectedModel === m.value ? "text-[#f4f4f5] font-medium bg-[#27272a]" : "text-[#a1a1aa]"
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={!promptText.trim() || agentState?.isRunning}
              className="ml-1.5 p-2 rounded-xl bg-[#27272a] hover:bg-[#3f3f46] text-[#F9F9FA] disabled:opacity-40 disabled:hover:bg-[#27272a] transition-colors cursor-pointer flex-shrink-0"
            >
              <i className="fa-solid fa-arrow-up text-xs"></i>
            </button>
          </form>

          <div className="text-[10px] text-center text-[#52525b] mt-3 leading-relaxed">
            {t("workspace.legal_prefix")}{" "}
            <a
              href="https://www.suniyintellekt.uz/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#a1a1aa] hover:text-[#e4e4e7] hover:underline"
            >
              {t("workspace.terms")}
            </a>{" "}
            {t("workspace.and")}{" "}
            <a
              href="https://www.suniyintellekt.uz/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#a1a1aa] hover:text-[#e4e4e7] hover:underline"
            >
              {t("workspace.privacy")}
            </a>{" "}
            {t("workspace.legal_suffix")} • {t("workspace.founder")}{" "}
            <a
              href="https://rahmatilla.uz/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#a1a1aa] hover:underline"
            >
              Rahmatilla.uz
            </a>{" "}
            ({" "}
            <a
              href="https://t.me/rahmatilla_uz"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#a1a1aa] hover:underline"
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
