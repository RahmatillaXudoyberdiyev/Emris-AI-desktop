const waitForApi = () => {
  try {
    if (window.pywebview?.api) {
      return Promise.resolve(window.pywebview.api);
    }
    return new Promise((resolve) => {
      let resolved = false;
      const onReady = () => {
        if (!resolved) {
          resolved = true;
          window.removeEventListener("pywebviewready", onReady);
          resolve(window.pywebview?.api || null);
        }
      };
      window.addEventListener("pywebviewready", onReady);
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          window.removeEventListener("pywebviewready", onReady);
          resolve(window.pywebview?.api || null);
        }
      }, 500);
    });
  } catch (err) {
    console.error("[API] Error resolving pywebview api:", err);
    return Promise.resolve(null);
  }
};

export const desktopApi = {
  async openExternal(url) {
    try {
      const api = await waitForApi();
      if (api?.open_external) {
        return await api.open_external(url);
      }
      window.open(url, "_blank");
      return true;
    } catch (err) {
      console.error("[API] openExternal error:", err);
      return false;
    }
  },

  async chooseFolder() {
    try {
      const api = await waitForApi();
      if (api?.choose_folder) {
        return await api.choose_folder();
      }
      if (window.showDirectoryPicker) {
        try {
          const dirHandle = await window.showDirectoryPicker();
          if (dirHandle && dirHandle.name) {
            return `C:\\Projects\\${dirHandle.name}`;
          }
        } catch (pickerErr) {
          console.warn("[API] Directory picker dismissed:", pickerErr);
        }
      }
      return null;
    } catch (err) {
      console.error("[API] chooseFolder error:", err);
      return null;
    }
  },

  async getProjects() {
    try {
      const api = await waitForApi();
      if (api?.get_projects) {
        const result = await api.get_projects();
        if (Array.isArray(result)) return result;
      }
      const stored = localStorage.getItem("emris_projects");
      return stored ? JSON.parse(stored) : [];
    } catch (err) {
      console.error("[API] getProjects error:", err);
      return [];
    }
  },

  async createProject(name, path) {
    try {
      const api = await waitForApi();
      if (api?.create_project) {
        const res = await api.create_project(name, path);
        if (res) return res;
      }
      const fallback = { id: String(Date.now()), name, path, created_at: new Date().toISOString() };
      const stored = localStorage.getItem("emris_projects");
      const list = stored ? JSON.parse(stored) : [];
      localStorage.setItem("emris_projects", JSON.stringify([fallback, ...list]));
      return fallback;
    } catch (err) {
      console.error("[API] createProject error:", err);
      return null;
    }
  },

  async deleteProject(id) {
    try {
      const api = await waitForApi();
      if (api?.delete_project) {
        await api.delete_project(id);
      }
      const stored = localStorage.getItem("emris_projects");
      if (stored) {
        const list = JSON.parse(stored).filter((p) => p.id !== id);
        localStorage.setItem("emris_projects", JSON.stringify(list));
      }
      return true;
    } catch (err) {
      console.error("[API] deleteProject error:", err);
      return false;
    }
  },

  async getConversations(projectId = null) {
    try {
      const api = await waitForApi();
      if (api?.get_conversations) {
        return await api.get_conversations(projectId);
      }
      return [];
    } catch (err) {
      console.error("[API] getConversations error:", err);
      return [];
    }
  },

  async createConversation(title, projectId = null, model = "Gemini 3.5 Flash Lite") {
    try {
      const api = await waitForApi();
      if (api?.create_conversation) {
        return await api.create_conversation(title, projectId, model);
      }
      return {
        id: String(Date.now()),
        project_id: projectId,
        title,
        model,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    } catch (err) {
      console.error("[API] createConversation error:", err);
      return null;
    }
  },

  async deleteConversation(id) {
    try {
      const api = await waitForApi();
      if (api?.delete_conversation) {
        return await api.delete_conversation(id);
      }
      return true;
    } catch (err) {
      console.error("[API] deleteConversation error:", err);
      return false;
    }
  },

  async getMessages(conversationId) {
    try {
      const api = await waitForApi();
      if (api?.get_messages) {
        return await api.get_messages(conversationId);
      }
      return [];
    } catch (err) {
      console.error("[API] getMessages error:", err);
      return [];
    }
  },

  async addMessage(conversationId, role, content) {
    try {
      const api = await waitForApi();
      if (api?.add_message) {
        return await api.add_message(conversationId, role, content);
      }
      return { id: String(Date.now()), conversation_id: conversationId, role, content };
    } catch (err) {
      console.error("[API] addMessage error:", err);
      return null;
    }
  },

  async runCommand(command, cwd = null) {
    try {
      const api = await waitForApi();
      if (api?.run_command) {
        return await api.run_command(command, cwd);
      }
      return { success: false, stdout: "", stderr: "Desktop bridge unavailable", exit_code: -1 };
    } catch (err) {
      console.error("[API] runCommand error:", err);
      return { success: false, stdout: "", stderr: String(err), exit_code: -1 };
    }
  },

  async getQuota() {
    try {
      const api = await waitForApi();
      if (api?.get_quota) {
        return await api.get_quota();
      }
      return { used: 0, remaining: 50, limit: 50 };
    } catch (err) {
      console.error("[API] getQuota error:", err);
      return { used: 0, remaining: 50, limit: 50 };
    }
  },

  async checkGatewayHealth() {
    try {
      const api = await waitForApi();
      if (api?.check_gateway_health) {
        return await api.check_gateway_health();
      }
      return false;
    } catch (err) {
      console.error("[API] checkGatewayHealth error:", err);
      return false;
    }
  },

  async generateAi(prompt, model = "gemini-3.5-flash-lite", history = []) {
    try {
      const api = await waitForApi();
      if (api?.generate_ai) {
        return await api.generate_ai(prompt, model, history);
      }
      return { success: false, error: "Desktop bridge unavailable" };
    } catch (err) {
      console.error("[API] generateAi error:", err);
      return { success: false, error: String(err) };
    }
  },

  async runAgentWorkflow(prompt, workspaceRoot = null, model = "nemotron-3-ultra-550b") {
    try {
      const api = await waitForApi();
      if (api?.run_agent_workflow) {
        return await api.run_agent_workflow(prompt, workspaceRoot, model);
      }
      return { success: false, error: "Desktop bridge unavailable" };
    } catch (err) {
      console.error("[API] runAgentWorkflow error:", err);
      return { success: false, error: String(err) };
    }
  },

  async fetchKeys() {
    try {
      const api = await waitForApi();
      if (api?.fetch_keys) {
        return await api.fetch_keys();
      }
      return { success: false, error: "Desktop bridge unavailable" };
    } catch (err) {
      console.error("[API] fetchKeys error:", err);
      return { success: false, error: String(err) };
    }
  }
};
