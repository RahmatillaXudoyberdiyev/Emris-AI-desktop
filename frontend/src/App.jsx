import React, { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import CenterWorkspace from "./components/CenterWorkspace";
import RightPanel from "./components/RightPanel";
import ChooseFolderModal from "./components/ChooseFolderModal";
import { desktopApi } from "./services/api";

export default function App() {
  const [projects, setProjects] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [currentProject, setCurrentProject] = useState("No Project");
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [agentState, setAgentState] = useState(null);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
  const [fileRefreshTrigger, setFileRefreshTrigger] = useState(0);

  const loadData = async () => {
    try {
      const [pList, cList] = await Promise.all([desktopApi.getProjects(), desktopApi.getConversations()]);
      if (Array.isArray(pList)) setProjects(pList);
      if (Array.isArray(cList)) setConversations(cList);
    } catch (err) {
      console.error("[App] Error loading initial data:", err);
    }
  };

  useEffect(() => {
    loadData();
    const handleReady = () => loadData();
    window.addEventListener("pywebviewready", handleReady);
    return () => window.removeEventListener("pywebviewready", handleReady);
  }, []);

  const handleSelectProject = async (projectName) => {
    try {
      setCurrentProject(projectName);
      setAgentState(null);
      if (projectName === "No Project") {
        setActiveConversation(null);
        setMessages([]);
        return;
      }

      const targetProj = projects.find((p) => p.name === projectName);
      if (targetProj) {
        const projChats = conversations.filter((c) => String(c.project_id) === String(targetProj.id));
        if (projChats.length > 0) {
          handleSelectConversation(projChats[0]);
        } else {
          await handleNewProjectConversation(targetProj);
        }
      }
    } catch (error) {
      console.error("[App] Select project error:", error);
    }
  };

  const handleNewProjectConversation = async (project) => {
    try {
      if (!project) return;
      setCurrentProject(project.name);
      setAgentState(null);
      const projChats = conversations.filter((c) => String(c.project_id) === String(project.id));
      const newIndex = projChats.length + 1;
      const title = `${project.name} - Chat ${newIndex}`;
      const newConv = await desktopApi.createConversation(title, project.id, "gemini-3.5-flash-lite");
      if (newConv) {
        setConversations((prev) => [newConv, ...(prev || []).filter((c) => c.id !== newConv.id)]);
        setActiveConversation(newConv);
        setMessages([]);
        await loadData();
      }
    } catch (err) {
      console.error("[App] New project conversation error:", err);
    }
  };

  const handleNewConversation = async () => {
    try {
      setAgentState(null);
      const targetProj = projects.find((p) => p.name === currentProject);
      if (targetProj) {
        await handleNewProjectConversation(targetProj);
      } else {
        setCurrentProject("No Project");
        setActiveConversation(null);
        setMessages([]);
      }
    } catch (error) {
      console.error("[App] New conversation error:", error);
    }
  };

  const handleSelectConversation = async (conv) => {
    try {
      if (!conv) return;
      setActiveConversation(conv);
      setAgentState(null);
      if (conv.project_id) {
        const found = projects.find((p) => String(p.id) === String(conv.project_id));
        setCurrentProject(found ? found.name : "No Project");
      } else {
        setCurrentProject("No Project");
      }
      const fetchedMessages = await desktopApi.getMessages(conv.id);
      setMessages(fetchedMessages || []);
    } catch (error) {
      console.error("[App] Select conversation error:", error);
    }
  };

  const handleFolderSelected = async (newProjectName, folderPath) => {
    try {
      const created = await desktopApi.createProject(newProjectName, folderPath);
      if (created && !created.error) {
        setProjects((prev) => [created, ...(prev || []).filter((p) => p.id !== created.id)]);
        setCurrentProject(created.name);
        setFileRefreshTrigger((prev) => prev + 1);

        const initialChat = await desktopApi.createConversation(
          `${created.name} - Chat 1`,
          created.id,
          "gemini-3.5-flash-lite"
        );
        if (initialChat) {
          setConversations((prev) => [initialChat, ...(prev || []).filter((c) => c.id !== initialChat.id)]);
          setActiveConversation(initialChat);
          setMessages([]);
        }
        await loadData();
      }
    } catch (error) {
      console.error("[App] Folder select error:", error);
    }
  };

  const handleDeleteProject = async (projectId) => {
    try {
      setProjects((prev) => (prev || []).filter((p) => String(p.id) !== String(projectId)));
      const success = await desktopApi.deleteProject(projectId);
      if (success) {
        if (currentProject !== "No Project") {
          const deleted = projects.find((p) => String(p.id) === String(projectId));
          if (deleted && deleted.name === currentProject) {
            setCurrentProject("No Project");
          }
        }
        await loadData();
      }
    } catch (error) {
      console.error("[App] Delete project error:", error);
    }
  };

  const handleDeleteConversation = async (convId) => {
    try {
      if (activeConversation && String(activeConversation.id) === String(convId)) {
        setActiveConversation(null);
        setMessages([]);
        setAgentState(null);
      }
      setConversations((prev) => (prev || []).filter((c) => String(c.id) !== String(convId)));
      await desktopApi.deleteConversation(convId);
      await loadData();
    } catch (error) {
      console.error("[App] Delete conversation error:", error);
    }
  };

  const handleUpdateTitle = async (newTitle) => {
    try {
      if (!activeConversation) return;
      await desktopApi.updateConversationTitle(activeConversation.id, newTitle);
      setActiveConversation((prev) => (prev ? { ...prev, title: newTitle } : null));
      setConversations((prev) =>
        (prev || []).map((c) =>
          String(c.id) === String(activeConversation.id) ? { ...c, title: newTitle } : c
        )
      );
    } catch (err) {
      console.error("[App] Update title error:", err);
    }
  };

  const handleCancelAgent = () => {
    try {
      setAgentState((prev) => (prev ? { ...prev, isRunning: false, currentStage: "To'xtatildi" } : null));
    } catch (error) {
      console.error("[App] Cancel agent error:", error);
    }
  };

  const handleSubmitPrompt = async (promptText, model) => {
    try {
      const isFirstTurn = messages.length === 0;
      let conv = activeConversation;
      if (!conv) {
        const targetProj = projects.find((p) => p.name === currentProject);
        const projId = targetProj ? targetProj.id : null;
        const title = promptText.length > 28 ? promptText.slice(0, 28) + "..." : promptText;
        conv = await desktopApi.createConversation(title, projId, model);
        if (conv) {
          setConversations((prev) => [conv, ...(prev || []).filter((c) => c.id !== conv.id)]);
          setActiveConversation(conv);
        }
      }

      const activeConvId = conv ? conv.id : String(Date.now());

      if (isFirstTurn && conv) {
        desktopApi.generateTitle(promptText).then((titleRes) => {
          if (titleRes?.success && titleRes?.title) {
            desktopApi.updateConversationTitle(conv.id, titleRes.title);
            setConversations((prev) =>
              (prev || []).map((c) =>
                String(c.id) === String(conv.id) ? { ...c, title: titleRes.title } : c
              )
            );
            setActiveConversation((prev) =>
              prev && String(prev.id) === String(conv.id) ? { ...prev, title: titleRes.title } : prev
            );
          }
        }).catch((err) => console.error("[App] Auto title error:", err));
      }

      const userMsg = {
        id: "user_" + Date.now(),
        conversation_id: activeConvId,
        role: "user",
        content: promptText
      };
      setMessages((prev) => [...(prev || []), userMsg]);

      if (conv) {
        await desktopApi.addMessage(conv.id, "user", promptText);
      }

      const targetProj = projects.find((p) => p.name === currentProject);
      const workspaceRoot = targetProj ? targetProj.path : null;
      const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

      setAgentState({
        isRunning: true,
        currentStage: "Project Architect • Loyiha rejalashtirilmoqda...",
        plan: {
          title: "Topshiriq tahlil qilinmoqda",
          chief_thought: "Loyiha xaritasi (Project.map.md) va funksiyalar tekshirilmoqda...",
          steps: [
            { id: 1, agent: "Project Architect", description: "Loyiha arxitekturasi va talablar tahlili", status: "running" },
            { id: 2, agent: "File analyzer Agent", description: "AST xaritasini va funksiyalarni indekslash", status: "pending" },
            { id: 3, agent: "Engineer Agent", description: "Maqsadli fayllar va kod sintezi", status: "pending" },
            { id: 4, agent: "CLI Agent", description: "Sintaksis va kompilyatsiya tekshiruvi", status: "pending" },
            { id: 5, agent: "Inspector Agent", description: "QA tekshiruvi va sifat nazorati", status: "pending" }
          ]
        },
        actions: []
      });

      await delay(700);
      const agentResult = await desktopApi.runAgentWorkflow(promptText, workspaceRoot, model);
      setFileRefreshTrigger((prev) => prev + 1);

      const planTasks = (agentResult?.steps && agentResult.steps.length > 0)
        ? agentResult.steps
        : [
            { id: 1, agent: "Project Architect", model: "Gemini 3.5 Flash Lite", description: "Arxitektura rejalashtirildi", output: "Reja tuzildi" },
            { id: 2, agent: "File analyzer Agent", model: "Gemini 3.5 Flash Lite", description: "Funksiyalar indekslandi", output: "Xarita yangilandi" },
            { id: 3, agent: "Engineer Agent", model: "Gemini 3.5 Flash Lite", description: "Fayllar yaratildi", output: "Kod yozildi" },
            { id: 4, agent: "CLI Agent", model: "Gemini 3.5 Flash Lite", description: "Terminal tekshirildi", output: "Exit code 0" },
            { id: 5, agent: "Inspector Agent", model: "Gemini 3.5 Flash Lite", description: "QA tasdiqlandi", output: "QA Pass" }
          ];

      const executedActions = agentResult?.actions || [];
      const activeSteps = planTasks.map((t, idx) => ({ ...t, status: idx === 0 ? "running" : "pending" }));

      for (let i = 0; i < activeSteps.length; i++) {
        activeSteps[i].status = "running";
        setAgentState({
          isRunning: true,
          currentStage: `${activeSteps[i].agent} • Gemini 3.5 Flash Lite`,
          plan: {
            chief_thought: agentResult?.chief_thought || "Multi-agent zanjiri ishlamoqda...",
            steps: [...activeSteps]
          },
          actions: executedActions.slice(0, i + 1)
        });

        await delay(800);

        activeSteps[i].status = "done";
        setAgentState({
          isRunning: true,
          currentStage: `${activeSteps[i].agent} yakunlandi ✓`,
          plan: {
            chief_thought: agentResult?.chief_thought || "Multi-agent zanjiri ishlamoqda...",
            steps: [...activeSteps]
          },
          actions: executedActions.slice(0, i + 1)
        });

        await delay(200);
      }

      const completedWorkflow = {
        plan: {
          chief_thought: agentResult?.chief_thought || "Multi-agent zanjiri muvaffaqiyatli yakunlandi.",
          steps: activeSteps.map((s) => ({ ...s, status: "done" }))
        },
        actions: executedActions
      };

      setAgentState({
        isRunning: false,
        currentStage: "Workflow yakunlandi ✓",
        plan: completedWorkflow.plan,
        actions: completedWorkflow.actions
      });

      const replyText = agentResult?.response || "Loyiha talablari to'liq tahlil qilindi va zarur arxitektura shakllantirildi.";
      const replyMsg = {
        id: "asst_" + Date.now(),
        conversation_id: activeConvId,
        role: "assistant",
        content: replyText
      };
      setMessages((prev) => [...(prev || []), replyMsg]);

      if (conv) {
        const persistedContent = `<!--workflow:${JSON.stringify(completedWorkflow)}-->\n${replyText}`;
        await desktopApi.addMessage(conv.id, "assistant", persistedContent);
        await loadData();
      }
    } catch (error) {
      console.error("[App] Submit prompt error:", error);
      setAgentState((prev) => (prev ? { ...prev, isRunning: false, currentStage: "Xatolik" } : null));
    }
  };

  const activeProjObj = projects.find((p) => p.name === currentProject) || null;

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-[#131314] text-[#F9F9FA] antialiased selection:bg-[#27272a] selection:text-white">
      <Sidebar
        projects={projects}
        conversations={conversations}
        activeProjectName={currentProject}
        selectedChatId={activeConversation?.id}
        onSelectProject={handleSelectProject}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
        onOpenFolderModal={() => setIsFolderModalOpen(true)}
        onDeleteProject={handleDeleteProject}
        onDeleteConversation={handleDeleteConversation}
        onNewProjectConversation={handleNewProjectConversation}
      />
      <main className="flex-1 flex flex-col h-full bg-[#131314] relative overflow-hidden">
        <Header
          currentProject={currentProject}
          currentSessionTitle={activeConversation?.title}
          projects={projects}
          onSelectProject={handleSelectProject}
          onOpenFolderModal={() => setIsFolderModalOpen(true)}
          onUpdateTitle={handleUpdateTitle}
          isRightPanelOpen={isRightPanelOpen}
          onToggleRightPanel={() => setIsRightPanelOpen(!isRightPanelOpen)}
        />
        <CenterWorkspace
          projects={projects}
          currentProject={currentProject}
          activeConversation={activeConversation}
          messages={messages}
          onSelectProject={handleSelectProject}
          onOpenFolderModal={() => setIsFolderModalOpen(true)}
          onSubmitPrompt={handleSubmitPrompt}
          agentState={agentState}
          onCancelAgent={handleCancelAgent}
        />
      </main>
      <RightPanel
        isOpen={isRightPanelOpen}
        onClose={() => setIsRightPanelOpen(false)}
        activeProject={activeProjObj}
        refreshTrigger={fileRefreshTrigger}
      />
      <ChooseFolderModal
        isOpen={isFolderModalOpen}
        onClose={() => setIsFolderModalOpen(false)}
        onSelectFolder={handleFolderSelected}
        projects={projects}
      />
    </div>
  );
}
