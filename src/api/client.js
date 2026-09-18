import { firebaseAuth } from "../firebase";

const BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3000/api/v1";

let accessToken = localStorage.getItem("accessToken") || null;

export function setAccessToken(token) {
  accessToken = token;

  if (token) {
    localStorage.setItem("accessToken", token);
  } else {
    localStorage.removeItem("accessToken");
  }
}

export function getAccessToken() {
  return accessToken;
}

async function getFreshToken(forceRefresh = false) {
  const firebaseUser = firebaseAuth.currentUser;

  if (!firebaseUser) {
    return accessToken;
  }

  try {
    const freshToken = await firebaseUser.getIdToken(forceRefresh);

    if (freshToken) {
      setAccessToken(freshToken);
    }

    return freshToken;
  } catch (error) {
    console.error("Failed to get Firebase token:", error);
    return null;
  }
}

async function request(
  path,
  { method = "GET", body, isForm = false, signal } = {}
) {
  let token = await getFreshToken(false);

  async function sendRequest(currentToken) {
    const headers = {};

    /*
     * For normal JSON requests, send JSON content type.
     * For FormData requests, DON'T set Content-Type manually.
     * Browser will automatically set multipart/form-data boundary.
     */
    if (!isForm) {
      headers["Content-Type"] = "application/json";
    }

    if (currentToken) {
      headers["Authorization"] = `Bearer ${currentToken}`;
    }

    return fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body
        ? isForm
          ? body
          : JSON.stringify(body)
        : undefined,
      signal,
    });
  }

  let res = await sendRequest(token);

  if (res.status === 401 && firebaseAuth.currentUser) {
    console.warn(
      "Authentication token rejected. Refreshing Firebase token..."
    );

    token = await getFreshToken(true);

    if (token) {
      res = await sendRequest(token);
    }
  }

  let data = null;

  try {
    data = await res.json();
  } catch {}

  if (!res.ok) {
    const message =
      data?.message || `Request failed with status ${res.status}`;

    const error = new Error(message);
    error.status = res.status;
    error.errors = data?.errors;

    throw error;
  }

  return data;
}

/*
 * Activity logging must never break the main action.
 */
async function logProjectActivity(
  projectId,
  message,
  action,
  metadata = {}
) {
  if (!projectId || !message) {
    return;
  }

  try {
    await request(`/project-activity/${projectId}`, {
      method: "POST",
      body: {
        message,
        action,
        metadata,
      },
    });
  } catch (error) {
    console.warn(
      "Project activity log skipped:",
      error?.message || error
    );
  }
}

export const api = {
  /* =========================
     AUTH
     ========================= */

  firebaseLogin: (idToken) =>
    request("/auth/firebase", {
      method: "POST",
      body: { idToken },
    }),

  checkEmail: (email) =>
    request("/auth/check-email", {
      method: "POST",
      body: { email },
    }),

  logout: () =>
    request("/auth/logout", {
      method: "POST",
    }),

  currentUser: () =>
    request("/auth/current-user", {
      method: "POST",
    }),

  /* =========================
     PROJECTS
     ========================= */

  getProjects: () =>
    request("/projects"),

  getProject: (projectId) =>
    request(`/projects/${projectId}`),

  createProject: async (payload) => {
    const result = await request("/projects", {
      method: "POST",
      body: payload,
    });

    const project = result?.data;

    if (project?._id) {
      await logProjectActivity(
        project._id,
        `Created project "${
          project.name ||
          payload?.name ||
          "Untitled project"
        }"`,
        "project_created"
      );
    }

    return result;
  },

  updateProject: async (projectId, payload) => {
    const result = await request(
      `/projects/${projectId}`,
      {
        method: "PUT",
        body: payload,
      }
    );

    await logProjectActivity(
      projectId,
      "Updated the project",
      "project_updated"
    );

    return result;
  },

  deleteProject: (projectId) =>
    request(`/projects/${projectId}`, {
      method: "DELETE",
    }),

  /* =========================
     MEMBERS
     ========================= */

  getMembers: (projectId) =>
    request(`/projects/${projectId}/members`),

  addMember: async (projectId, payload) => {
    const result = await request(
      `/projects/${projectId}/members`,
      {
        method: "POST",
        body: payload,
      }
    );

    await logProjectActivity(
      projectId,
      `Added ${
        payload?.email || "a member"
      } to the project`,
      "member_added",
      {
        email: payload?.email,
        role: payload?.role,
      }
    );

    return result;
  },

  /*
   * Accept either:
   *   "member"
   * or:
   *   { newRole: "member" }
   */
  updateMemberRole: async (
    projectId,
    userId,
    roleOrPayload
  ) => {
    const newRole =
      typeof roleOrPayload === "string"
        ? roleOrPayload
        : roleOrPayload?.newRole;

    const result = await request(
      `/projects/${projectId}/members/${userId}`,
      {
        method: "PUT",
        body: {
          newRole,
        },
      }
    );

    await logProjectActivity(
      projectId,
      `Changed a member role to ${
        newRole?.replaceAll("_", " ") ||
        "unknown"
      }`,
      "member_role_changed",
      {
        userId,
        newRole,
      }
    );

    return result;
  },

  removeMember: async (
    projectId,
    userId
  ) => {
    const result = await request(
      `/projects/${projectId}/members/${userId}`,
      {
        method: "DELETE",
      }
    );

    await logProjectActivity(
      projectId,
      "Removed a member from the project",
      "member_removed",
      {
        userId,
      }
    );

    return result;
  },

  /* =========================
     TASKS
     ========================= */

  getTasks: (
    projectId,
    options = {}
  ) =>
    request(`/projects/${projectId}/tasks`, {
      signal: options.signal,
    }),

  getTask: (
    projectId,
    taskId
  ) =>
    request(
      `/projects/${projectId}/tasks/${taskId}`
    ),

  createTask: async (
    projectId,
    payload
  ) => {
    /*
     * If payload is FormData, request() will
     * automatically send multipart/form-data.
     */
    const isForm = payload instanceof FormData;

    const result = await request(
      `/projects/${projectId}/tasks`,
      {
        method: "POST",
        body: payload,
        isForm,
      }
    );

    const title =
      result?.data?.title ||
      (
        isForm
          ? "Untitled task"
          : payload?.title
      ) ||
      "Untitled task";

    await logProjectActivity(
      projectId,
      `Created task "${title}"`,
      "task_created",
      {
        taskId: result?.data?._id,
      }
    );

    return result;
  },

  /*
   * updateTask supports BOTH:
   *
   * 1. Normal JSON:
   *
   * api.updateTask(projectId, taskId, {
   *   title: "New title"
   * });
   *
   * 2. File upload:
   *
   * const formData = new FormData();
   * formData.append("attachments", file);
   *
   * api.updateTask(projectId, taskId, formData);
   */
  updateTask: async (
    projectId,
    taskId,
    payload
  ) => {
    const isForm = payload instanceof FormData;

    const result = await request(
      `/projects/${projectId}/tasks/${taskId}`,
      {
        method: "PUT",
        body: payload,
        isForm,
      }
    );

    const title =
      result?.data?.title ||
      "Untitled task";

    await logProjectActivity(
      projectId,
      `Updated task "${title}"`,
      "task_updated",
      {
        taskId,
        changes: isForm
          ? ["attachments"]
          : Object.keys(payload || {}),
      }
    );

    return result;
  },

  /*
   * Dedicated helper for task attachments.
   *
   * Backend:
   * upload.array("attachments", 5)
   *
   * Therefore FormData must contain:
   * formData.append("attachments", file)
   */
  uploadTaskAttachments: (
    projectId,
    taskId,
    formData
  ) =>
    request(
      `/projects/${projectId}/tasks/${taskId}`,
      {
        method: "PUT",
        body: formData,
        isForm: true,
      }
    ),

  deleteTask: async (
    projectId,
    taskId
  ) => {
    const result = await request(
      `/projects/${projectId}/tasks/${taskId}`,
      {
        method: "DELETE",
      }
    );

    const title =
      result?.data?.title ||
      "Untitled task";

    await logProjectActivity(
      projectId,
      `Deleted task "${title}"`,
      "task_deleted",
      {
        taskId,
      }
    );

    return result;
  },
deleteTaskAttachment: async (
  projectId,
  taskId,
  attachmentId
) => {
  const result = await request(
    `/projects/${projectId}/tasks/${taskId}/attachments/${attachmentId}`,
    {
      method: "DELETE",
    }
  );

  return result;
},
  /* =========================
     SUBTASKS
     ========================= */

  createSubtask: async (
    projectId,
    taskId,
    payload
  ) => {
    const result = await request(
      `/projects/${projectId}/tasks/${taskId}/subtasks`,
      {
        method: "POST",
        body: payload,
      }
    );

    await logProjectActivity(
      projectId,
      `Added subtask "${
        result?.data?.title ||
        payload?.title ||
        "Untitled subtask"
      }"`,
      "subtask_created",
      {
        taskId,
        subTaskId: result?.data?._id,
      }
    );

    return result;
  },

  updateSubtask: (
    projectId,
    taskId,
    subTaskId,
    payload
  ) =>
    request(
      `/projects/${projectId}/tasks/${taskId}/subtasks/${subTaskId}`,
      {
        method: "PUT",
        body: payload,
      }
    ),

  deleteSubtask: async (
    projectId,
    taskId,
    subTaskId
  ) => {
    const result = await request(
      `/projects/${projectId}/tasks/${taskId}/subtasks/${subTaskId}`,
      {
        method: "DELETE",
      }
    );

    await logProjectActivity(
      projectId,
      "Deleted a subtask",
      "subtask_deleted",
      {
        taskId,
        subTaskId,
      }
    );

    return result;
  },

  /* =========================
     NOTES
     ========================= */

  getNotes: (projectId) =>
    request(`/projects/${projectId}/notes`),

  createNote: async (
    projectId,
    payload
  ) => {
    const result = await request(
      `/projects/${projectId}/notes`,
      {
        method: "POST",
        body: payload,
      }
    );

    await logProjectActivity(
      projectId,
      "Added a project note",
      "note_created",
      {
        noteId: result?.data?._id,
      }
    );

    return result;
  },

  updateNote: async (
    projectId,
    noteId,
    payload
  ) => {
    const result = await request(
      `/projects/${projectId}/notes/${noteId}`,
      {
        method: "PUT",
        body: payload,
      }
    );

    await logProjectActivity(
      projectId,
      "Updated a project note",
      "note_updated",
      {
        noteId,
      }
    );

    return result;
  },

  deleteNote: async (
    projectId,
    noteId
  ) => {
    const result = await request(
      `/projects/${projectId}/notes/${noteId}`,
      {
        method: "DELETE",
      }
    );

    await logProjectActivity(
      projectId,
      "Deleted a project note",
      "note_deleted",
      {
        noteId,
      }
    );

    return result;
  },

  /* =========================
     PROJECT ACTIVITY
     ========================= */

  getProjectActivity: (
    projectId
  ) =>
    request(
      `/project-activity/${projectId}`
    ),

  /* =========================
     AI
     ========================= */

  generateAI: (
    prompt,
    options = {}
  ) =>
    request("/ai/generate", {
      method: "POST",
      body: { prompt },
      signal: options.signal,
    }),

  /* =========================
     WORK ACTIVITY
     ========================= */

  startWork: () =>
    request("/activity/start", {
      method: "POST",
    }),

  stopWork: (sessionId) =>
    request(`/activity/stop/${sessionId}`, {
      method: "POST",
    }),

  getWeeklyActivity: () =>
    request("/activity/week"),

  /* =========================
     SEARCH
     ========================= */

  search: (query) =>
    request(
      `/search?q=${encodeURIComponent(query)}`
    ),

  /* =========================
     NOTIFICATIONS
     ========================= */

  getNotifications: () =>
    request("/notifications"),

  markNotificationRead: (
    notificationId
  ) =>
    request(
      `/notifications/${notificationId}/read`,
      {
        method: "PATCH",
      }
    ),
};