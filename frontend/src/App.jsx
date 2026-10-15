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

  const loadData = async () => {
    try {
      const [fetchedProjects, fetchedConversations] = await Promise.all([
        desktopApi.getProjects(),
        desktopApi.getConversations()
      ]);
      setProjects(fetchedProjects || []);
      setConversations(fetchedConversations || []);
    } catch (err) {
      console.error("[App] Error loading initial data:", err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSelectProject = (projectName) => {
    try {
      setCurrentProject(projectName);
    } catch (error) {
      console.error("[App] Select project error:", error);
    }
  };

  const handleNewConversation = () => {
    try {
      setCurrentProject("No Project");
      setActiveConversation(null);
      setMessages([]);
    } catch (error) {
      console.error("[App] New conversation error:", error);
    }
  };

  const handleSelectConversation = async (conv) => {
    try {
      setActiveConversation(conv);
      if (conv.project_id) {
        const found = projects.find((p) => p.id === conv.project_id);
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
      if (created) {
        setCurrentProject(created.name);
        await loadData();
      }
    } catch (error) {
      console.error("[App] Folder select error:", error);
    }
  };

  const handleDeleteProject = async (projectId) => {
    try {
      const success = await desktopApi.deleteProject(projectId);
      if (success) {
        if (currentProject !== "No Project") {
          const deleted = projects.find((p) => p.id === projectId);
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
      const success = await desktopApi.deleteConversation(convId);
      if (success) {
        if (activeConversation && activeConversation.id === convId) {
          setActiveConversation(null);
          setMessages([]);
        }
        await loadData();
      }
    } catch (error) {
      console.error("[App] Delete conversation error:", error);
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
          setActiveConversation(conv);
          await loadData();
        }
      }

      if (conv) {
        await desktopApi.addMessage(conv.id, "user", promptText);
        const replyText = `[${model}] Qabul qilindi: "${promptText}". Tez orada agentik buyruqlar va tahlil boshlanadi.`;
        await desktopApi.addMessage(conv.id, "assistant", replyText);
        const updated = await desktopApi.getMessages(conv.id);
        setMessages(updated || []);
      }
    } catch (error) {
      console.error("[App] Submit prompt error:", error);
    }
  };

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-[#131314] text-[#F9F9FA] antialiased selection:bg-[#2563eb] selection:text-white">
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
      />
      <main className="flex-1 flex flex-col h-full bg-[#131314] relative overflow-hidden">
        <Header
          currentProject={currentProject}
          currentSessionTitle={activeConversation?.title}
        />
        <CenterWorkspace
          projects={projects}
          currentProject={currentProject}
          activeConversation={activeConversation}
          messages={messages}
          onSelectProject={handleSelectProject}
          onOpenFolderModal={() => setIsFolderModalOpen(true)}
          onSubmitPrompt={handleSubmitPrompt}
        />
      </main>
      <ChooseFolderModal
        isOpen={isFolderModalOpen}
        onClose={() => setIsFolderModalOpen(false)}
        onSelectFolder={handleFolderSelected}
      />
    </div>
  );
}
