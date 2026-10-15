const getApi = () => {
  try {
    return window.pywebview?.api || null;
  } catch (err) {
    console.error("[API] Error resolving pywebview api:", err);
    return null;
  }
};

export const desktopApi = {
  async openExternal(url) {
    try {
      const api = getApi();
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
      const api = getApi();
      if (api?.choose_folder) {
        return await api.choose_folder();
      }
      return null;
    } catch (err) {
      console.error("[API] chooseFolder error:", err);
      return null;
    }
  },

  async getProjects() {
    try {
      const api = getApi();
      if (api?.get_projects) {
        return await api.get_projects();
      }
      return [];
    } catch (err) {
      console.error("[API] getProjects error:", err);
      return [];
    }
  },

  async createProject(name, path) {
    try {
      const api = getApi();
      if (api?.create_project) {
        return await api.create_project(name, path);
      }
      return { id: String(Date.now()), name, path, created_at: new Date().toISOString() };
    } catch (err) {
      console.error("[API] createProject error:", err);
      return null;
    }
  },

  async deleteProject(id) {
    try {
      const api = getApi();
      if (api?.delete_project) {
        return await api.delete_project(id);
      }
      return true;
    } catch (err) {
      console.error("[API] deleteProject error:", err);
      return false;
    }
  },

  async getConversations(projectId = null) {
    try {
      const api = getApi();
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
      const api = getApi();
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
      const api = getApi();
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
      const api = getApi();
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
      const api = getApi();
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
      const api = getApi();
      if (api?.run_command) {
        return await api.run_command(command, cwd);
      }
      return { success: false, stdout: "", stderr: "Desktop bridge unavailable", exit_code: -1 };
    } catch (err) {
      console.error("[API] runCommand error:", err);
      return { success: false, stdout: "", stderr: String(err), exit_code: -1 };
    }
  }
};
