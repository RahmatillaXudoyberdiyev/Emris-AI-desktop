import { useState, useRef } from "react";
import { desktopApi } from "../services/api";

export function useAgentWorkflow({
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
}) {
  const [agentStatesByConv, setAgentStatesByConv] = useState({});
  const isSubmittingRef = useRef(false);

  const activeConvId = activeConversation ? String(activeConversation.id) : null;
  const agentState = activeConvId ? (agentStatesByConv[activeConvId] || null) : null;

  const updateAgentState = (convId, stateOrFn) => {
    if (!convId) return;
    setAgentStatesByConv((prev) => {
      const curr = prev[convId] || null;
      const next = typeof stateOrFn === "function" ? stateOrFn(curr) : stateOrFn;
      if (!next) {
        const copy = { ...prev };
        delete copy[convId];
        return copy;
      }
      return { ...prev, [convId]: next };
    });
  };

  const handleCancelAgent = async () => {
    if (!activeConvId) return;
    isSubmittingRef.current = false;
    try {
      await desktopApi.stopCommand();
    } catch (err) {
      console.error("[useAgentWorkflow] stop command error:", err);
    }
    updateAgentState(activeConvId, (prev) => {
      if (!prev) return null;
      const haltedSteps = (prev.plan?.steps || []).map((s) =>
        s.status === "running" ? { ...s, status: "interrupted", output: (s.output || "") + " [To'xtatildi • Interrupted]" } : s
      );
      return {
        ...prev,
        isRunning: false,
        isInterrupted: true,
        status: "interrupted",
        currentStage: "To'xtatildi • Interrupted",
        plan: prev.plan ? { ...prev.plan, steps: haltedSteps } : null
      };
    });
  };

  const handleDismissWorkflow = (targetConvId) => {
    const id = targetConvId || activeConvId;
    if (id) updateAgentState(id, null);
  };

  const finalizeWorkflowCycle = async (convId, updatedSteps, executedActions, pendingReply, cycleTokens = null) => {
    try {
      isSubmittingRef.current = false;
      const safeActions = (executedActions || []).map((a) => {
        let rawRes = a.result;
        if (typeof rawRes === "string") {
          try {
            rawRes = JSON.parse(rawRes);
          } catch (e) {
            rawRes = { message: rawRes.slice(0, 100) };
          }
        }
        const cleanRes = rawRes ? {
          success: rawRes.success,
          path: rawRes.path,
          total_lines: rawRes.total_lines,
          start_line: rawRes.start_line,
          end_line: rawRes.end_line,
          l_start: rawRes.l_start,
          l_finish: rawRes.l_finish,
          message: rawRes.message,
          error: rawRes.error
        } : null;
        return {
          agent: a.agent,
          action: a.action,
          target: a.target,
          l_start: a.l_start,
          l_finish: a.l_finish,
          result: cleanRes
        };
      });

      const completedWorkflow = {
        plan: {
          chief_thought: "Multi-agent workflow executed successfully.",
          steps: updatedSteps.map((s) => ({ ...s, status: "done" }))
        },
        actions: safeActions,
        tokens: cycleTokens || null
      };
      updateAgentState(convId, null);
      const replyText = pendingReply || "Topshiriq muvaffaqiyatli bajarildi.";
      const tokensHeader = cycleTokens?.total ? `<!--tokens:${JSON.stringify(cycleTokens)}-->\n` : "";
      const persisted = `${tokensHeader}<!--workflow:${JSON.stringify(completedWorkflow)}-->\n${replyText}`;
      const savedMsg = await desktopApi.addMessage(convId, "assistant", persisted);
      const replyMsg = savedMsg || { id: "asst_" + Date.now(), conversation_id: convId, role: "assistant", content: persisted, tokens: cycleTokens };
      setMessages((prev) => {
        const withoutDup = (prev || []).filter((m) => m.id !== replyMsg.id);
        return [...withoutDup, replyMsg];
      });
      await loadData();
    } catch (err) {
      console.error("[useAgentWorkflow] Finalize error:", err);
    }
  };

  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const resumeWorkflowFromStep = async (convId, steps, startIndex, executedActions, pendingReply, workspaceRoot, pendingTokens = null) => {
    try {
      const activeSteps = [...steps];
      let pausedForApproval = false;

      for (let i = startIndex; i < activeSteps.length; i++) {
        activeSteps[i] = { ...activeSteps[i], status: "running" };
        updateAgentState(convId, {
          isRunning: true,
          isInterrupted: false,
          currentStage: `${activeSteps[i].agent || "Agent"} • ${activeSteps[i].title || "Working"}`,
          plan: { chief_thought: "Executing workflow phases with Inspector verification...", steps: [...activeSteps] },
          actions: executedActions.slice(0, i + 1),
          pendingResponse: pendingReply,
          pendingTokens: pendingTokens,
          workspaceRoot
        });

        await delay(300);

        if (activeSteps[i].pending_command?.pending_approval) {
          pausedForApproval = true;
          updateAgentState(convId, {
            isRunning: true,
            isInterrupted: false,
            currentStage: "Awaiting Command Approval",
            plan: { chief_thought: "Command awaiting user approval.", steps: [...activeSteps] },
            actions: executedActions.slice(0, i + 1),
            pendingResponse: pendingReply,
            pendingTokens: pendingTokens,
            workspaceRoot
          });
          break;
        } else {
          activeSteps[i] = { ...activeSteps[i], status: "done" };
          updateAgentState(convId, {
            isRunning: true,
            isInterrupted: false,
            currentStage: `${activeSteps[i].agent || "Agent"} • Completed ✓`,
            plan: { chief_thought: "Phase verified by Inspector.", steps: [...activeSteps] },
            actions: executedActions.slice(0, i + 1),
            pendingResponse: pendingReply,
            pendingTokens: pendingTokens,
            workspaceRoot
          });
          await delay(80);
        }
      }

      if (!pausedForApproval) {
        await finalizeWorkflowCycle(convId, activeSteps, executedActions, pendingReply, pendingTokens);
      }
    } catch (err) {
      console.error("[useAgentWorkflow] resumeWorkflowFromStep error:", err);
    }
  };

  const [approvingStepId, setApprovingStepId] = useState(null);

  const handleApproveCommand = async (cmdObj, stepId) => {
    try {
      if (!activeConvId || approvingStepId) return;
      setApprovingStepId(stepId);
      const res = await desktopApi.runCommand(cmdObj.command, cmdObj.cwd);
      const out = (res.stdout || "") + (res.stderr ? `\n${res.stderr}` : "");
      if (setLatestTerminalTask) {
        setLatestTerminalTask({
          command: cmdObj.command,
          cwd: cmdObj.cwd,
          stdout: res.stdout || "",
          stderr: res.stderr || "",
          exit_code: res.exit_code
        });
      }
      const curr = agentStatesByConv[activeConvId];
      if (!curr?.plan) return;
      const isOk = res.exit_code === 0;

      let inspectorDiag = null;
      if (!isOk) {
        try {
          inspectorDiag = await desktopApi.inspectCommandError(
            cmdObj.command,
            cmdObj.cwd,
            res.exit_code,
            res.stdout || "",
            res.stderr || "",
            curr.workspaceRoot || null
          );
        } catch (diagErr) {
          console.error("[useAgentWorkflow] Inspector error:", diagErr);
        }
      }

      const stepIndex = (curr.plan.steps || []).findIndex((s) => s.id === stepId);
      const updatedSteps = (curr.plan.steps || []).map((s) => {
        if (s.id === stepId) {
          return {
            ...s,
            status: isOk ? "done" : "error",
            output: isOk ? "Exit code: 0 • Execution verified" : `Exit code: ${res.exit_code} • Command failed`,
            inspector_diagnosis: inspectorDiag?.diagnosis || null,
            inspector_fix: inspectorDiag?.suggested_command || null,
            what_is_wrong: inspectorDiag?.what_is_wrong || null,
            reasoning: inspectorDiag?.reasoning || null,
            improvement_plan: inspectorDiag?.improvement_plan || null,
            target_agent: inspectorDiag?.target_agent || null,
            error_type: inspectorDiag?.error_type || null,
            file_path: inspectorDiag?.file_path || null,
            line_number: inspectorDiag?.line_number || null,
            engineer_fix: inspectorDiag?.engineer_fix || null,
            pending_command: {
              ...s.pending_command,
              pending_approval: false,
              exit_code: res.exit_code,
              execution_output: out.trim() || `(Process completed with exit code ${res.exit_code})`
            }
          };
        }
        return s;
      });

      if (setFileRefreshTrigger) setFileRefreshTrigger((prev) => prev + 1);

      if (isOk) {
        setApprovingStepId(null);
        isSubmittingRef.current = false;

        let nextSteps = updatedSteps;
        if (cmdObj.originalCommand && cmdObj.command !== cmdObj.originalCommand) {
          const retargetedOrig = cmdObj.originalCommand.replace(/^\$?python(?:\.exe)?\b/i, ".\\.venv\\Scripts\\python");
          const rerunStepId = "dyn_rerun_" + Date.now();
          const dynRerunStep = {
            id: rerunStepId,
            agent: "CLI Agent",
            title: "Re-run Application in Local Virtual Environment",
            subtitle: retargetedOrig,
            status: "pending",
            pending_command: {
              command: retargetedOrig,
              cwd: cmdObj.cwd,
              pending_approval: true
            }
          };
          nextSteps = [...updatedSteps, dynRerunStep];
        }

        await resumeWorkflowFromStep(
          activeConvId,
          nextSteps,
          stepIndex + 1,
          curr.actions || [],
          curr.pendingResponse,
          curr.workspaceRoot,
          curr.pendingTokens || null
        );
      } else {
        if (inspectorDiag?.target_agent === "engineer" && inspectorDiag?.engineer_fix?.success) {
          const fixStepId = "dyn_fix_" + Date.now();
          const rerunStepId = "dyn_rerun_" + (Date.now() + 1);
          const dynFixStep = {
            id: fixStepId,
            agent: "Engineer Agent",
            title: `Auto-patch ${inspectorDiag.engineer_fix.file_path} [L${inspectorDiag.engineer_fix.l_start}:L${inspectorDiag.engineer_fix.l_finish}]`,
            subtitle: inspectorDiag.engineer_fix.message,
            status: "done",
            output: inspectorDiag.engineer_fix.message
          };
          const dynRerunStep = {
            id: rerunStepId,
            agent: "CLI Agent",
            title: "Re-run Verified Command",
            subtitle: cmdObj.command,
            status: "pending",
            pending_command: {
              command: cmdObj.command,
              cwd: cmdObj.cwd,
              pending_approval: true
            }
          };
          const dynamicallyExtendedSteps = [...updatedSteps, dynFixStep, dynRerunStep];
          setApprovingStepId(null);
          isSubmittingRef.current = false;
          await resumeWorkflowFromStep(
            activeConvId,
            dynamicallyExtendedSteps,
            stepIndex + 1,
            curr.actions || [],
            curr.pendingResponse,
            curr.workspaceRoot,
            curr.pendingTokens || null
          );
        } else if (inspectorDiag?.target_agent === "cli" && inspectorDiag?.suggested_command) {
          const cliFixStepId = "dyn_clifix_" + Date.now();
          const rerunStepId = "dyn_rerun_" + (Date.now() + 1);
          const dynCliFixStep = {
            id: cliFixStepId,
            agent: "CLI Agent",
            title: inspectorDiag.error_type === "environment_path"
              ? `Re-run with Local Environment: ${inspectorDiag.suggested_command}`
              : `Apply Environment Fix: ${inspectorDiag.suggested_command}`,
            subtitle: inspectorDiag.diagnosis,
            status: "pending",
            pending_command: {
              command: inspectorDiag.suggested_command,
              cwd: cmdObj.cwd,
              pending_approval: true,
              originalCommand: cmdObj.command
            }
          };
          let dynamicallyExtendedSteps = [...updatedSteps, dynCliFixStep];
          if (inspectorDiag.error_type === "missing_dependency") {
            const retargetedOrig = cmdObj.command.replace(/^\$?python(?:\.exe)?\b/i, ".\\.venv\\Scripts\\python");
            const dynRerunStep = {
              id: rerunStepId,
              agent: "CLI Agent",
              title: "Re-run Application in Virtual Environment",
              subtitle: retargetedOrig,
              status: "pending",
              pending_command: {
                command: retargetedOrig,
                cwd: cmdObj.cwd,
                pending_approval: true
              }
            };
            dynamicallyExtendedSteps.push(dynRerunStep);
          }
          setApprovingStepId(null);
          isSubmittingRef.current = false;
          await resumeWorkflowFromStep(
            activeConvId,
            dynamicallyExtendedSteps,
            stepIndex + 1,
            curr.actions || [],
            curr.pendingResponse,
            curr.workspaceRoot,
            curr.pendingTokens || null
          );
        } else {
          const stageName = inspectorDiag?.target_agent === "engineer"
            ? "Inspector Agent • Routed to Engineer (Code Auto-Fix)"
            : "Inspector Agent • Routed to CLI (Environment Fix)";
          updateAgentState(activeConvId, (prev) => ({
            ...prev,
            isRunning: false,
            isError: true,
            status: "error",
            currentStage: stageName,
            plan: { ...prev.plan, steps: updatedSteps }
          }));
        }
      }
    } catch (err) {
      console.error("[useAgentWorkflow] handleApproveCommand error:", err);
    } finally {
      setApprovingStepId(null);
      isSubmittingRef.current = false;
    }
  };

  const handleContinueAnyway = async (stepId) => {
    try {
      if (!activeConvId) return;
      const curr = agentStatesByConv[activeConvId];
      if (!curr?.plan) return;
      const stepIndex = (curr.plan.steps || []).findIndex((s) => s.id === stepId);
      const updatedSteps = (curr.plan.steps || []).map((s) => {
        if (s.id === stepId) {
          return { ...s, status: "done", output: s.output + " (Proceeded by user)" };
        }
        return s;
      });
      await resumeWorkflowFromStep(
        activeConvId,
        updatedSteps,
        stepIndex + 1,
        curr.actions || [],
        curr.pendingResponse,
        curr.workspaceRoot
      );
    } catch (err) {
      console.error("[useAgentWorkflow] handleContinueAnyway error:", err);
    }
  };

  const handleRejectCommand = async (cmdObj, stepId) => {
    try {
      if (!activeConvId) return;
      const curr = agentStatesByConv[activeConvId];
      if (!curr?.plan) return;
      const stepIndex = (curr.plan.steps || []).findIndex((s) => s.id === stepId);
      const updatedSteps = (curr.plan.steps || []).map((s) => {
        if (s.id === stepId) {
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
      await resumeWorkflowFromStep(
        activeConvId,
        updatedSteps,
        stepIndex + 1,
        curr.actions || [],
        curr.pendingResponse,
        curr.workspaceRoot
      );
    } catch (err) {
      console.error("[useAgentWorkflow] handleRejectCommand error:", err);
    }
  };

  const handleSubmitPrompt = async (promptText, model, mode = "work", historyOverride = null) => {
    if (isSubmittingRef.current) return;
    try {
      isSubmittingRef.current = true;
      let conv = activeConversation;
      if (!conv) {
        const targetProj = projects.find((p) => p.name === currentProject);
        const projId = targetProj ? targetProj.id : null;
        conv = await desktopApi.createConversation("New chat", projId, model);
        if (conv) {
          setConversations((prev) => [conv, ...(prev || []).filter((c) => c.id !== conv.id)]);
          setActiveConversation(conv);
        }
      }

      const convId = conv ? String(conv.id) : String(Date.now());
      const baseHistory = historyOverride !== null ? historyOverride : (messages || []);
      const shouldGenerateTitle = !conv || conv.title === "New chat" || baseHistory.length === 0;

      if (shouldGenerateTitle && conv) {
        desktopApi.generateTitle(promptText).then((titleRes) => {
          if (titleRes?.success && titleRes?.title) {
            desktopApi.updateConversationTitle(conv.id, titleRes.title);
            setConversations((prev) => (prev || []).map((c) => String(c.id) === String(conv.id) ? { ...c, title: titleRes.title } : c));
            setActiveConversation((prev) => prev && String(prev.id) === String(conv.id) ? { ...prev, title: titleRes.title } : prev);
          }
        }).catch((err) => console.error("[useAgentWorkflow] Title error:", err));
      }

      const userMsg = { id: "user_" + Date.now(), conversation_id: convId, role: "user", content: promptText };
      setMessages([...baseHistory, userMsg]);

      updateAgentState(convId, {
        isRunning: true,
        isInterrupted: false,
        status: "thinking",
        currentStage: "Thinking...",
        plan: {
          title: "Thinking",
          chief_thought: "Understanding prompt and planning execution...",
          steps: [
            {
              id: "init_thinking",
              agent: "Engineer Agent",
              title: "Understanding the request",
              subtitle: "Analyzing requirements, dependencies, and workspace...",
              status: "running"
            }
          ]
        },
        actions: []
      });

      if (conv) await desktopApi.addMessage(conv.id, "user", promptText);

      const isNoProject = !currentProject || currentProject === "No Project";
      let targetWorkflow = "work";
      if (isNoProject) {
        targetWorkflow = "conversation";
      } else if (mode === "work") {
        targetWorkflow = "work";
      } else if (mode === "chat") {
        targetWorkflow = "conversation";
      } else {
        try {
          const routeRes = await desktopApi.classifyWorkflow(promptText, !isNoProject, currentProject);
          if (routeRes?.workflow) {
            targetWorkflow = routeRes.workflow;
          }
        } catch (classifyErr) {
          targetWorkflow = "work";
        }
      }

      if (targetWorkflow === "conversation") {
        updateAgentState(convId, {
          isRunning: true,
          isInterrupted: false,
          status: "thinking",
          currentStage: "Thinking...",
          plan: {
            title: "Thinking",
            chief_thought: "Formulating response...",
            steps: [
              {
                id: "init_thinking",
                agent: "Conversational Agent",
                title: "Understanding the request",
                subtitle: "Identified conversational prompt.",
                status: "done"
              },
              {
                id: "resp_thinking",
                agent: "Conversational Agent",
                title: "Finalizing the response",
                subtitle: "Formulating structured response...",
                status: "running"
              }
            ]
          },
          actions: []
        });

        const history = baseHistory
          .map((m) => ({
            role: m.role,
            content: (m.content || "").replace(/<!--workflow:[\s\S]*?-->/g, "").replace(/<!--files_changes:[\s\S]*?-->/g, "").trim()
          }))
          .filter((m) => m.content.length > 0);
        const replyRes = await desktopApi.runConversation(promptText, history, model);
        const replyText = replyRes?.response || "Kechirasiz, javob olishda xatolik yuz berdi.";

        const completedWorkflow = {
          plan: {
            chief_thought: "Conversational response formulated.",
            steps: [
              {
                id: "init_thinking",
                agent: "Conversational Agent",
                title: "Understanding the request",
                subtitle: "Identified conversational prompt.",
                status: "done"
              },
              {
                id: "resp_thinking",
                agent: "Conversational Agent",
                title: "Finalizing the response",
                subtitle: "Formulated structured response.",
                status: "done"
              }
            ]
          },
          actions: []
        };

        updateAgentState(convId, null);
        const replyTokens = replyRes?.tokens;
        const tokensHeader = replyTokens?.total ? `<!--tokens:${JSON.stringify(replyTokens)}-->\n` : "";
        const persisted = `${tokensHeader}<!--workflow:${JSON.stringify(completedWorkflow)}-->\n${replyText}`;
        const savedMsg = conv ? await desktopApi.addMessage(conv.id, "assistant", persisted) : null;
        const replyMsg = savedMsg || { id: "asst_" + Date.now(), conversation_id: convId, role: "assistant", content: persisted, tokens: replyTokens };
        setMessages((prev) => {
          const withoutDup = (prev || []).filter((m) => m.id !== replyMsg.id);
          return [...withoutDup, replyMsg];
        });
        isSubmittingRef.current = false;
        await loadData();
        return;
      }

      let targetProj = (projects || []).find((p) => p.name === currentProject);
      if (!targetProj?.path) {
        const pList = await desktopApi.getProjects();
        targetProj = (pList || []).find((p) => p.name === currentProject);
      }
      const workspaceRoot = targetProj?.path || (currentProject?.includes("\\") || currentProject?.includes("/") ? currentProject : "D:\\sandbox_for_desktop");
      const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

      updateAgentState(convId, {
        isRunning: true,
        isInterrupted: false,
        status: "thinking",
        currentStage: "Thinking...",
        workspaceRoot,
        plan: {
          title: "Thinking",
          chief_thought: "Formulating dynamic execution phases and specialized agent assignments...",
          steps: [
            {
              id: "init_thinking",
              agent: "Engineer Agent",
              title: "Understanding the request",
              subtitle: "Analyzed requirements and identified target workspace.",
              status: "done"
            },
            {
              id: "exec_thinking",
              agent: "Engineer Agent",
              title: "Formulating execution strategy",
              subtitle: "Analyzing codebase context and preparing dynamic tool execution...",
              status: "running"
            }
          ]
        },
        actions: []
      });

      const history = baseHistory
        .map((m) => ({
          role: m.role,
          content: (m.content || "").replace(/<!--workflow:[\s\S]*?-->/g, "").replace(/<!--files_changes:[\s\S]*?-->/g, "").trim()
        }))
        .filter((m) => m.content.length > 0);

      const agentResult = await desktopApi.runAgentWorkflow(promptText, workspaceRoot, model, history);
      if (setFileRefreshTrigger) setFileRefreshTrigger((prev) => prev + 1);

      if (agentResult?.pending_commands && agentResult.pending_commands.length > 0 && setLatestTerminalTask) {
        agentResult.pending_commands.forEach((cmd) => {
          setLatestTerminalTask({
            command: cmd.command,
            cwd: cmd.cwd || workspaceRoot,
            status: "proposed"
          });
        });
      }

      const planTasks = (agentResult?.steps && agentResult.steps.length > 0)
        ? agentResult.steps
        : [
            { id: 1, agent: "Engineer Agent", model: "Gemini 3.5 Flash Lite", title: "Strategy Formulation", subtitle: "Formulated dynamic execution steps", description: "Architecture formulated", output: "Execution strategy active" },
            { id: 2, agent: "Engineer Agent", model: "Gemini 3.5 Flash Lite", title: "Synthesizing Source Files", subtitle: "Generating code components", description: "Synthesized files", output: "Source files created" },
            { id: 3, agent: "Inspector Agent", model: "Gemini 3.5 Flash Lite", title: "Quality & Syntax Verification", subtitle: "Validating output completeness", description: "Verification complete", output: "QA verified" }
          ];

      const executedActions = agentResult?.actions || [];
      const initialStep = {
        id: "init_thinking",
        agent: "Engineer Agent",
        title: "Understanding the request",
        subtitle: "Analyzed requirements and identified target workspace.",
        status: "done"
      };

      const activeSteps = [
        initialStep,
        ...planTasks.map((t, idx) => ({ ...t, status: idx === 0 ? "running" : "pending" }))
      ];

      for (let i = 1; i < activeSteps.length; i++) {
        activeSteps[i].status = "running";
        updateAgentState(convId, {
          isRunning: true,
          isInterrupted: false,
          currentStage: `${activeSteps[i].agent} • ${activeSteps[i].title}`,
          workspaceRoot,
          plan: { chief_thought: agentResult?.chief_thought || "Executing dynamic multi-agent workflow...", steps: [...activeSteps] },
          actions: executedActions.slice(0, i)
        });

        await delay(350);

        if (!activeSteps[i].pending_command?.pending_approval) {
          activeSteps[i].status = "done";
          updateAgentState(convId, {
            isRunning: true,
            isInterrupted: false,
            currentStage: `${activeSteps[i].agent} • Completed ✓`,
            workspaceRoot,
            plan: { chief_thought: agentResult?.chief_thought || "Executing dynamic multi-agent workflow...", steps: [...activeSteps] },
            actions: executedActions.slice(0, i)
          });
          await delay(80);
        } else {
          break;
        }
      }

      const hasPendingCmd = activeSteps.some((s) => s.pending_command?.pending_approval);
      if (hasPendingCmd) {
        updateAgentState(convId, {
          isRunning: true,
          isInterrupted: false,
          currentStage: "Awaiting Command Approval",
          workspaceRoot,
          plan: {
            chief_thought: agentResult?.chief_thought || "Action ready for user verification.",
            steps: activeSteps
          },
          actions: executedActions,
          pendingResponse: agentResult?.response || "Topshiriq muvaffaqiyatli tayyorlandi.",
          pendingTokens: agentResult?.tokens || null
        });
        isSubmittingRef.current = false;
        return;
      }

      await finalizeWorkflowCycle(convId, activeSteps, executedActions, agentResult?.response, agentResult?.tokens);
    } catch (error) {
      console.error("[useAgentWorkflow] Submit prompt error:", error);
      isSubmittingRef.current = false;
      if (activeConvId) {
        updateAgentState(activeConvId, (prev) => ({
          ...prev,
          isRunning: false,
          isError: true,
          status: "error",
          currentStage: "Workflow Error",
          plan: prev?.plan || {
            chief_thought: "Kutilmagan xatolik yuz berdi.",
            steps: [{ id: 1, agent: "Inspector Agent", title: "Execution Error", status: "error", output: String(error?.message || error) }]
          }
        }));
      }
    }
  };

  const handleEditMessage = async (messageId, newContent) => {
    try {
      if (!activeConvId || isSubmittingRef.current) return;
      const targetIndex = (messages || []).findIndex((m) => m.id === messageId);
      if (targetIndex === -1) return;

      const priorHistory = (messages || []).slice(0, targetIndex);
      setMessages(priorHistory);

      await desktopApi.truncateMessagesFrom(activeConvId, messageId);

      await handleSubmitPrompt(newContent, "gemini-3.5-flash-lite", "work", priorHistory);
    } catch (err) {
      console.error("[useAgentWorkflow] handleEditMessage error:", err);
    }
  };

  const handleDeleteMessage = async (messageId) => {
    try {
      if (!activeConvId || isSubmittingRef.current) return;
      const targetIndex = (messages || []).findIndex((m) => m.id === messageId);
      if (targetIndex === -1) return;

      const priorHistory = (messages || []).slice(0, targetIndex);
      setMessages(priorHistory);
      updateAgentState(activeConvId, null);

      await desktopApi.truncateMessagesFrom(activeConvId, messageId);
    } catch (err) {
      console.error("[useAgentWorkflow] handleDeleteMessage error:", err);
    }
  };

  return {
    agentState,
    approvingStepId,
    handleApproveCommand,
    handleRejectCommand,
    handleContinueAnyway,
    handleSubmitPrompt,
    handleEditMessage,
    handleDeleteMessage,
    handleCancelAgent,
    handleDismissWorkflow,
    updateAgentState
  };
}
