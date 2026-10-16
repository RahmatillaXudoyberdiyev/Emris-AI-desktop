import React, { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import CenterWorkspace from "./components/CenterWorkspace";
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

  const loadData = async () => {
    try {
      const [fetchedProjects, fetchedConversations] = await Promise.all([
        desktopApi.getProjects(),
        desktopApi.getConversations()
      ]);
      if (Array.isArray(fetchedProjects)) {
        setProjects(fetchedProjects);
      }
      if (Array.isArray(fetchedConversations)) {
        setConversations(fetchedConversations);
      }
    } catch (err) {
      console.error("[App] Error loading initial data:", err);
    }
  };

  useEffect(() => {
    loadData();
    const handleReady = () => {
      loadData();
    };
    window.addEventListener("pywebviewready", handleReady);
    return () => window.removeEventListener("pywebviewready", handleReady);
  }, []);

  const handleSelectProject = async (projectName) => {
    try {
      setCurrentProject(projectName);
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

  const handleCancelAgent = () => {
    try {
      setAgentState((prev) => (prev ? { ...prev, isRunning: false, currentStage: "To'xtatildi" } : null));
    } catch (error) {
      console.error("[App] Cancel agent error:", error);
    }
  };

  const handleSubmitPrompt = async (promptText, model) => {
    try {
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

      setAgentState({
        isRunning: true,
        currentStage: "Project Architect • plans.md rejalashtirilmoqda...",
        plan: {
          title: "Topshiriq tahlil qilinmoqda",
          chief_thought: "Loyiha xaritasi (Project.map.md) va funksiyalar (Functions.md) tekshirilmoqda...",
          steps: [
            { id: 1, agent: "Project Architect", description: "plans.md rejasini shakllantirish" },
            { id: 2, agent: "File analyzer Agent", description: "Fayllar va Functions.md tahlili" },
            { id: 3, agent: "Engineer Agent", description: "Kod va yechim sintezi (<write>)" },
            { id: 4, agent: "CLI Agent", description: "Buyruqlar va muhitni tekshirish (<cmd_command>)" }
          ]
        },
        actions: []
      });

      const agentResult = await desktopApi.runAgentWorkflow(promptText, workspaceRoot, model);

      let replyText = "";
      if (agentResult && (agentResult.success || agentResult.response)) {
        setAgentState({
          isRunning: false,
          currentStage: "Muvaffaqiyatli yakunlandi",
          plan: {
            chief_thought: agentResult.chief_thought || "Topshiriq tahlili yakunlandi",
            steps: (agentResult.steps || []).map((s) => ({
              id: s.id,
              agent: s.agent,
              description: s.description,
              status: "done"
            }))
          },
          actions: agentResult.actions || []
        });
        replyText = agentResult.response || "Vazifa muvaffaqiyatli bajarildi.";
      } else {
        setAgentState({
          isRunning: false,
          currentStage: "Xatolik yuz berdi",
          plan: null,
          actions: []
        });
        replyText = `[Agent xatoligi]: ${agentResult?.error || "Agent topshiriqni bajara olmadi."}`;
      }

      const assistantMsg = {
        id: "assistant_" + Date.now(),
        conversation_id: activeConvId,
        role: "assistant",
        content: replyText
      };
      setMessages((prev) => [...(prev || []), assistantMsg]);

      if (conv) {
        await desktopApi.addMessage(conv.id, "assistant", replyText);
        await loadData();
      }
    } catch (error) {
      console.error("[App] Submit prompt error:", error);
      setAgentState((prev) => (prev ? { ...prev, isRunning: false, currentStage: "Xatolik" } : null));
    }
  };

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
      <ChooseFolderModal
        isOpen={isFolderModalOpen}
        onClose={() => setIsFolderModalOpen(false)}
        onSelectFolder={handleFolderSelected}
        projects={projects}
      />
    </div>
  );
}
