const LOCAL_HTTP_BASE = "http://127.0.0.1:8765";

const waitForApi = () => {
  try {
    if (window.pywebview?.api) return Promise.resolve(window.pywebview.api);
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
      setTimeout(onReady, 500);
    });
  } catch (err) {
    console.error("[API] Error resolving pywebview api:", err);
    return Promise.resolve(null);
  }
};

const getStoredItem = (key, fallback = []) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (err) {
    console.error("[API] Storage read error:", key, err);
    return fallback;
  }
};

const setStoredItem = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error("[API] Storage write error:", key, err);
  }
};

const fetchLocalApi = async (endpoint, options = {}) => {
  try {
    const url = `${LOCAL_HTTP_BASE}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {})
      }
    });
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    return await response.json();
  } catch (err) {
    console.warn(`[API] fetchLocalApi notice for ${endpoint}:`, err.message);
    return null;
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
        const folder = await api.choose_folder();
        if (folder) return folder;
      }
      if (window.showDirectoryPicker) {
        try {
          const dirHandle = await window.showDirectoryPicker();
          if (dirHandle?.name) {
            return `D:\\${dirHandle.name}`;
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
        if (Array.isArray(result) && result.length > 0) {
          setStoredItem("emris_projects", result);
          return result;
        }
      }
      const httpRes = await fetchLocalApi("/api/projects");
      if (Array.isArray(httpRes) && httpRes.length > 0) {
        setStoredItem("emris_projects", httpRes);
        return httpRes;
      }
      return getStoredItem("emris_projects", []);
    } catch (err) {
      console.error("[API] getProjects error:", err);
      return getStoredItem("emris_projects", []);
    }
  },

  async createProject(name, path) {
    try {
      const cleanName = name.trim();
      const cleanPath = path ? path.trim() : "";
      const api = await waitForApi();
      if (api?.create_project) {
        const result = await api.create_project(cleanName, cleanPath);
        if (result) {
          const list = getStoredItem("emris_projects", []);
          setStoredItem("emris_projects", [result, ...list.filter((p) => p.id !== result.id)]);
          return result;
        }
      }
      const httpRes = await fetchLocalApi("/api/projects", {
        method: "POST",
        body: JSON.stringify({ name: cleanName, path: cleanPath })
      });
      if (httpRes) {
        const list = getStoredItem("emris_projects", []);
        setStoredItem("emris_projects", [httpRes, ...list.filter((p) => p.id !== httpRes.id)]);
        return httpRes;
      }
      const fallback = {
        id: "proj_" + Date.now().toString(36),
        name: cleanName,
        path: cleanPath,
        created_at: new Date().toISOString()
      };
      const list = getStoredItem("emris_projects", []);
      setStoredItem("emris_projects", [fallback, ...list]);
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
      const list = getStoredItem("emris_projects", []);
      setStoredItem("emris_projects", list.filter((p) => String(p.id) !== String(id)));
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
        const result = await api.get_conversations(projectId);
        if (Array.isArray(result) && result.length > 0) {
          if (!projectId) setStoredItem("emris_conversations", result);
          return result;
        }
      }
      const query = projectId ? `?project_id=${encodeURIComponent(projectId)}` : "";
      const httpRes = await fetchLocalApi(`/api/conversations${query}`);
      if (Array.isArray(httpRes) && httpRes.length > 0) {
        if (!projectId) setStoredItem("emris_conversations", httpRes);
        return httpRes;
      }
      const stored = getStoredItem("emris_conversations", []);
      if (projectId) {
        return stored.filter((c) => String(c.project_id) === String(projectId));
      }
      return stored;
    } catch (err) {
      console.error("[API] getConversations error:", err);
      return [];
    }
  },

  async createConversation(title, projectId = null, model = "gemini-3.5-flash-lite") {
    try {
      const api = await waitForApi();
      if (api?.create_conversation) {
        const result = await api.create_conversation(title, projectId, model);
        if (result) {
          const list = getStoredItem("emris_conversations", []);
          setStoredItem("emris_conversations", [result, ...list.filter((c) => c.id !== result.id)]);
          return result;
        }
      }
      const httpRes = await fetchLocalApi("/api/conversations", {
        method: "POST",
        body: JSON.stringify({ title, project_id: projectId, model })
      });
      if (httpRes) {
        const list = getStoredItem("emris_conversations", []);
        setStoredItem("emris_conversations", [httpRes, ...list.filter((c) => c.id !== httpRes.id)]);
        return httpRes;
      }
      const fallback = {
        id: "conv_" + Date.now().toString(36),
        title: title || "New Conversation",
        project_id: projectId,
        model,
        created_at: new Date().toISOString()
      };
      const list = getStoredItem("emris_conversations", []);
      setStoredItem("emris_conversations", [fallback, ...list]);
      return fallback;
    } catch (err) {
      console.error("[API] createConversation error:", err);
      return null;
    }
  },

  async deleteConversation(id) {
    try {
      const api = await waitForApi();
      if (api?.delete_conversation) {
        await api.delete_conversation(id);
      }
      const list = getStoredItem("emris_conversations", []);
      setStoredItem("emris_conversations", list.filter((c) => String(c.id) !== String(id)));
      return true;
    } catch (err) {
      console.error("[API] deleteConversation error:", err);
      return false;
    }
  },

  async getMessages(conversationId) {
    try {
      if (!conversationId) return [];
      const api = await waitForApi();
      if (api?.get_messages) {
        const result = await api.get_messages(conversationId);
        if (Array.isArray(result) && result.length > 0) {
          setStoredItem(`emris_messages_${conversationId}`, result);
          return result;
        }
      }
      const httpRes = await fetchLocalApi(`/api/messages?conversation_id=${encodeURIComponent(conversationId)}`);
      if (Array.isArray(httpRes) && httpRes.length > 0) {
        setStoredItem(`emris_messages_${conversationId}`, httpRes);
        return httpRes;
      }
      return getStoredItem(`emris_messages_${conversationId}`, []);
    } catch (err) {
      console.error("[API] getMessages error:", err);
      return getStoredItem(`emris_messages_${conversationId}`, []);
    }
  },

  async addMessage(conversationId, role, content) {
    try {
      if (!conversationId) return null;
      const api = await waitForApi();
      let createdMsg = null;
      if (api?.add_message) {
        createdMsg = await api.add_message(conversationId, role, content);
      }
      if (!createdMsg) {
        createdMsg = await fetchLocalApi("/api/messages", {
          method: "POST",
          body: JSON.stringify({ conversation_id: conversationId, role, content })
        });
      }
      if (!createdMsg) {
        createdMsg = {
          id: String(Date.now()),
          conversation_id: conversationId,
          role,
          content,
          created_at: new Date().toISOString()
        };
      }
      const list = getStoredItem(`emris_messages_${conversationId}`, []);
      setStoredItem(`emris_messages_${conversationId}`, [...list, createdMsg]);
      return createdMsg;
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
      const httpRes = await fetchLocalApi("/api/run_command", {
        method: "POST",
        body: JSON.stringify({ command, cwd })
      });
      if (httpRes) return httpRes;
      return { success: false, stdout: "", stderr: "Backend bridge unavailable", exit_code: -1 };
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
      const httpRes = await fetchLocalApi("/api/health");
      return !!httpRes;
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

  async runAgentWorkflow(prompt, workspaceRoot = null, model = "gemini-3.5-flash-lite") {
    try {
      const api = await waitForApi();
      if (api?.run_agent_workflow) {
        const result = await api.run_agent_workflow(prompt, workspaceRoot, model);
        if (result && (result.success || result.steps?.length > 0)) {
          return result;
        }
      }
      const httpRes = await fetchLocalApi("/api/run_workflow", {
        method: "POST",
        body: JSON.stringify({ prompt, workspace_root: workspaceRoot, model })
      });
      if (httpRes) return httpRes;
      return {
        success: false,
        error: "Backend agent workflow unavailable",
        steps: [],
        actions: []
      };
    } catch (err) {
      console.error("[API] runAgentWorkflow error:", err);
      return { success: false, error: String(err), steps: [] };
    }
  },

  async listDirectoryFiles(folderPath) {
    try {
      const api = await waitForApi();
      if (api?.list_directory_files) {
        const result = await api.list_directory_files(folderPath);
        if (result?.success) return result;
      }
      const query = `?path=${encodeURIComponent(folderPath || "")}`;
      const httpRes = await fetchLocalApi(`/api/list_files${query}`);
      if (httpRes) return httpRes;
      return { success: false, tree: [] };
    } catch (err) {
      console.error("[API] listDirectoryFiles error:", err);
      return { success: false, tree: [], error: String(err) };
    }
  },

  async readFileContent(folderPath, relativePath) {
    try {
      const api = await waitForApi();
      if (api?.read_file_content) {
        const result = await api.read_file_content(folderPath, relativePath);
        if (result?.success) return result;
      }
      const query = `?path=${encodeURIComponent(folderPath || "")}&file=${encodeURIComponent(relativePath || "")}`;
      const httpRes = await fetchLocalApi(`/api/read_file${query}`);
      if (httpRes) return httpRes;
      return { success: false, content: "" };
    } catch (err) {
      console.error("[API] readFileContent error:", err);
      return { success: false, content: "", error: String(err) };
    }
  },

  async generateTitle(prompt) {
    try {
      const api = await waitForApi();
      if (api?.generate_title) {
        const res = await api.generate_title(prompt);
        if (res?.success) return res;
      }
      const httpRes = await fetchLocalApi("/api/generate_title", {
        method: "POST",
        body: JSON.stringify({ prompt })
      });
      if (httpRes?.success) return httpRes;
      const clean = (prompt || "").trim().split(/\s+/).slice(0, 5).join(" ");
      return { success: true, title: clean || "New Conversation" };
    } catch (err) {
      console.error("[API] generateTitle error:", err);
      return { success: true, title: "New Conversation", error: String(err) };
    }
  },

  async updateConversationTitle(conversationId, title) {
    try {
      const api = await waitForApi();
      if (api?.update_conversation_title) {
        await api.update_conversation_title(conversationId, title);
      }
      await fetchLocalApi("/api/update_title", {
        method: "POST",
        body: JSON.stringify({ conversation_id: conversationId, title })
      });
      const list = getStoredItem("emris_conversations", []);
      setStoredItem(
        "emris_conversations",
        list.map((c) => (String(c.id) === String(conversationId) ? { ...c, title } : c))
      );
      return true;
    } catch (err) {
      console.error("[API] updateConversationTitle error:", err);
      return false;
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
