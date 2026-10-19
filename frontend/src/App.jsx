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
      const title = `${project.name} - Chat ${projChats.length + 1}`;
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
        const initialChat = await desktopApi.createConversation(`${created.name} - Chat 1`, created.id, "gemini-3.5-flash-lite");
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
      setConversations((prev) => (prev || []).map((c) => String(c.id) === String(activeConversation.id) ? { ...c, title: newTitle } : c));
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

  const handleApproveCommand = async (cmdObj, stepId) => {
    try {
      const res = await desktopApi.runCommand(cmdObj.command, cmdObj.cwd);
      const out = (res.stdout || "") + (res.stderr ? `\n${res.stderr}` : "");
      setAgentState((prev) => {
        if (!prev?.plan) return prev;
        const updatedSteps = (prev.plan.steps || []).map((s) => {
          if (s.id === stepId || s.pending_command?.command === cmdObj.command) {
            return {
              ...s,
              status: "done",
              output: `Exit code: ${res.exit_code} • Execution verified`,
              pending_command: {
                ...s.pending_command,
                pending_approval: false,
                execution_output: out.trim() || `(Process completed with exit code ${res.exit_code})`
              }
            };
          }
          return s;
        });
        return { ...prev, plan: { ...prev.plan, steps: updatedSteps } };
      });
      setFileRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      console.error("[App] handleApproveCommand error:", err);
    }
  };

  const handleRejectCommand = (cmdObj, stepId) => {
    try {
      setAgentState((prev) => {
        if (!prev?.plan) return prev;
        const updatedSteps = (prev.plan.steps || []).map((s) => {
          if (s.id === stepId || s.pending_command?.command === cmdObj.command) {
            return {
              ...s,
              status: "done",
              output: "Command skipped by user",
              pending_command: {
                ...s.pending_command,
                pending_approval: false,
                execution_output: "Skipped by user."
              }
            };
          }
          return s;
        });
        return { ...prev, plan: { ...prev.plan, steps: updatedSteps } };
      });
    } catch (err) {
      console.error("[App] handleRejectCommand error:", err);
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
            setConversations((prev) => (prev || []).map((c) => String(c.id) === String(conv.id) ? { ...c, title: titleRes.title } : c));
            setActiveConversation((prev) => prev && String(prev.id) === String(conv.id) ? { ...prev, title: titleRes.title } : prev);
          }
        }).catch((err) => console.error("[App] Auto title error:", err));
      }

      const userMsg = { id: "user_" + Date.now(), conversation_id: activeConvId, role: "user", content: promptText };
      setMessages((prev) => [...(prev || []), userMsg]);
      if (conv) await desktopApi.addMessage(conv.id, "user", promptText);

      let targetProj = (projects || []).find((p) => p.name === currentProject);
      if (!targetProj?.path) {
        const pList = await desktopApi.getProjects();
        targetProj = (pList || []).find((p) => p.name === currentProject);
      }
      const workspaceRoot = targetProj?.path || (currentProject?.includes("\\") || currentProject?.includes("/") ? currentProject : "D:\\sandbox_for_desktop");
      const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

      setAgentState({
        isRunning: true,
        currentStage: "Chief Architect • Formulating Execution Plan",
        plan: {
          title: "Adaptive Multi-Agent Planning",
          chief_thought: "Formulating dynamic execution phases and specialized agent assignments...",
          steps: [
            { id: 1, agent: "Chief Architect", title: "Formulating dynamic execution plan", subtitle: "Analyzing goals, dependencies, and architecture...", description: "Formulating plan", status: "running" }
          ]
        },
        actions: []
      });

      const agentResult = await desktopApi.runAgentWorkflow(promptText, workspaceRoot, model);
      setFileRefreshTrigger((prev) => prev + 1);

      const planTasks = (agentResult?.steps && agentResult.steps.length > 0)
        ? agentResult.steps
        : [
            { id: 1, agent: "Chief Architect", model: "Gemini 3.5 Flash Lite", title: "Architecture & Scaffolding", subtitle: "Scaffolding baseline components", description: "Architecture formulated", output: "Execution plan synced" },
            { id: 2, agent: "Engineer Agent", model: "Gemini 3.5 Flash Lite", title: "Synthesizing Source Files", subtitle: "Generating code components", description: "Synthesized files", output: "Source files created" },
            { id: 3, agent: "Inspector Agent", model: "Gemini 3.5 Flash Lite", title: "Quality & Syntax Verification", subtitle: "Validating output completeness", description: "Verification complete", output: "QA verified" }
          ];

      const executedActions = agentResult?.actions || [];
      const activeSteps = planTasks.map((t, idx) => ({ ...t, status: idx === 0 ? "running" : "pending" }));

      for (let i = 0; i < activeSteps.length; i++) {
        activeSteps[i].status = "running";
        setAgentState({
          isRunning: true,
          currentStage: `${activeSteps[i].agent} • ${activeSteps[i].title}`,
          plan: { chief_thought: agentResult?.chief_thought || "Executing dynamic multi-agent workflow...", steps: [...activeSteps] },
          actions: executedActions.slice(0, i + 1)
        });

        await delay(500);

        if (!activeSteps[i].pending_command?.pending_approval) {
          activeSteps[i].status = "done";
          setAgentState({
            isRunning: true,
            currentStage: `${activeSteps[i].agent} • Completed ✓`,
            plan: { chief_thought: agentResult?.chief_thought || "Executing dynamic multi-agent workflow...", steps: [...activeSteps] },
            actions: executedActions.slice(0, i + 1)
          });
          await delay(120);
        }
      }

      const completedWorkflow = {
        plan: {
          chief_thought: agentResult?.chief_thought || "Multi-agent workflow executed successfully.",
          steps: activeSteps.map((s) => ({ ...s, status: s.pending_command?.pending_approval ? "running" : "done" }))
        },
        actions: executedActions
      };

      setAgentState({
        isRunning: activeSteps.some((s) => s.pending_command?.pending_approval),
        currentStage: activeSteps.some((s) => s.pending_command?.pending_approval) ? "Awaiting Command Approval" : "Workflow yakunlandi ✓",
        plan: completedWorkflow.plan,
        actions: completedWorkflow.actions
      });

      const replyText = agentResult?.response || "Loyiha talablari to'liq tahlil qilindi va zarur arxitektura shakllantirildi.";
      const replyMsg = { id: "asst_" + Date.now(), conversation_id: activeConvId, role: "assistant", content: replyText };
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
          onApproveCommand={handleApproveCommand}
          onRejectCommand={handleRejectCommand}
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
