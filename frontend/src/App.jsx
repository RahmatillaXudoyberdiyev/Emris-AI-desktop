import React, { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import CenterWorkspace from "./components/CenterWorkspace";
import RightPanel from "./components/RightPanel";
import ChooseFolderModal from "./components/ChooseFolderModal";
import { desktopApi } from "./services/api";
import { useAgentWorkflow } from "./hooks/useAgentWorkflow";

export default function App() {
  const [projects, setProjects] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [currentProject, setCurrentProject] = useState("No Project");
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
  const [fileRefreshTrigger, setFileRefreshTrigger] = useState(0);
  const [latestTerminalTask, setLatestTerminalTask] = useState(null);

  const loadData = async () => {
    try {
      const [pList, cList] = await Promise.all([desktopApi.getProjects(), desktopApi.getConversations()]);
      if (Array.isArray(pList)) setProjects(pList);
      if (Array.isArray(cList)) setConversations(cList);
    } catch (err) {
      console.error("[App] Error loading initial data:", err);
    }
  };

  const {
    agentState,
    approvingStepId,
    handleApproveCommand,
    handleRejectCommand,
    handleContinueAnyway,
    handleSubmitPrompt,
    handleCancelAgent,
    handleDismissWorkflow,
    updateAgentState
  } = useAgentWorkflow({
    activeConversation,
    projects,
    currentProject,
    messages,
    setMessages,
    setConversations,
    setActiveConversation,
    loadData,
    setFileRefreshTrigger,
    setLatestTerminalTask
  });

  useEffect(() => {
    loadData();
    const handleReady = () => loadData();
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
      const newConv = await desktopApi.createConversation("New chat", project.id, "gemini-3.5-flash-lite");
      if (newConv) {
        setConversations((prev) => [newConv, ...(prev || []).filter((c) => c.id !== newConv.id)]);
        setActiveConversation(newConv);
        setMessages([]);
        if (newConv.id) updateAgentState(newConv.id, null);
        await loadData();
      }
    } catch (err) {
      console.error("[App] New project conversation error:", err);
    }
  };

  const handleNewConversation = async () => {
    try {
      const targetProj = projects.find((p) => p.name === currentProject);
      const projId = targetProj ? targetProj.id : null;
      const newConv = await desktopApi.createConversation("New chat", projId, "gemini-3.5-flash-lite");
      if (newConv) {
        if (!targetProj) {
          setCurrentProject("No Project");
        }
        setConversations((prev) => [newConv, ...(prev || []).filter((c) => c.id !== newConv.id)]);
        setActiveConversation(newConv);
        setMessages([]);
        if (newConv.id) updateAgentState(newConv.id, null);
        await loadData();
      }
    } catch (error) {
      console.error("[App] New conversation error:", error);
    }
  };

  const handleNewStandaloneConversation = async () => {
    try {
      const newConv = await desktopApi.createConversation("New chat", null, "gemini-3.5-flash-lite");
      if (newConv) {
        setCurrentProject("No Project");
        setConversations((prev) => [newConv, ...(prev || []).filter((c) => c.id !== newConv.id)]);
        setActiveConversation(newConv);
        setMessages([]);
        if (newConv.id) updateAgentState(newConv.id, null);
        await loadData();
      }
    } catch (error) {
      console.error("[App] New standalone conversation error:", error);
    }
  };

  const handleSelectConversation = async (conv) => {
    try {
      if (!conv) return;
      setActiveConversation(conv);
      const found = conv.project_id ? projects.find((p) => String(p.id) === String(conv.project_id)) : null;
      setCurrentProject(found ? found.name : "No Project");
      const fetched = await desktopApi.getMessages(conv.id);
      setMessages(fetched || []);
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
        const initialChat = await desktopApi.createConversation("New chat", created.id, "gemini-3.5-flash-lite");
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
        const deleted = projects.find((p) => String(p.id) === String(projectId));
        if (deleted && deleted.name === currentProject) setCurrentProject("No Project");
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
      }
      updateAgentState(convId, null);
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
      setConversations((prev) => (prev || []).map((c) => String(c.id) === String(activeConversation.id) ? { ...c, title: newTitle } : c));
    } catch (err) {
      console.error("[App] Update title error:", err);
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
        onNewStandaloneConversation={handleNewStandaloneConversation}
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
          approvingStepId={approvingStepId}
          onCancelAgent={handleCancelAgent}
          onDismissWorkflow={handleDismissWorkflow}
          onApproveCommand={handleApproveCommand}
          onRejectCommand={handleRejectCommand}
          onContinueAnyway={handleContinueAnyway}
        />
      </main>
      <RightPanel
        isOpen={isRightPanelOpen}
        onClose={() => setIsRightPanelOpen(false)}
        activeProject={activeProjObj}
        activeConversation={activeConversation}
        refreshTrigger={fileRefreshTrigger}
        latestTerminalTask={latestTerminalTask}
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
