import { useState } from "react";
import { api } from "../api/client";

const STATUS_STYLES = {
  todo: {
    label: "To Do",
    className: "bg-panel-raised text-paper",
  },
  in_progress: {
    label: "In Progress",
    className: "bg-blue-100 text-blue-700",
  },
  done: {
    label: "Done",
    className: "bg-green-100 text-green-700",
  },
};

const PRIORITY_STYLES = {
  high: {
    label: "High",
    className: "bg-red-100 text-red-700",
  },
  medium: {
    label: "Medium",
    className: "bg-yellow-100 text-yellow-700",
  },
  low: {
    label: "Low",
    className: "bg-green-100 text-green-700",
  },
};

export default function TaskRow({
  task,
  project,
  onChange,
  canManage = false,
}) {
  const [open, setOpen] = useState(false);
  const [subtaskTitle, setSubtaskTitle] = useState("");
  const [saving, setSaving] = useState(false);

  // File upload state
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState("");

  // Attachment delete confirmation modal state
  const [attachmentToDelete, setAttachmentToDelete] = useState(null);
  const [deletingAttachment, setDeletingAttachment] = useState(false);

  const [aiLoading, setAiLoading] = useState(false);
  const [aiCreating, setAiCreating] = useState(false);
  const [aiCreatingIndex, setAiCreatingIndex] = useState(null);
  const [aiSubtasks, setAiSubtasks] = useState([]);
  const [aiCreatedIndexes, setAiCreatedIndexes] = useState([]);
  const [aiError, setAiError] = useState("");
  const [aiSuccess, setAiSuccess] = useState("");

  const status = STATUS_STYLES[task.status] || STATUS_STYLES.todo;

  const priority = task.priority
    ? PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.medium
    : null;

  const subtasks = task.subtasks || [];
  const attachments = task.attachments || [];

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    setUploadError("");
    setUploadSuccess("");

    // Keep this in sync with Multer's 1 MB limit.
    if (file.size > 1 * 1000 * 1000) {
      setSelectedFile(null);
      setUploadError("File size must be less than 1 MB.");
      event.target.value = "";
      return;
    }

    setSelectedFile(file);
  };

  const askDeleteAttachment = (attachment) => {
    if (!attachment?._id) {
      setUploadError("Unable to remove this attachment.");
      return;
    }

    setAttachmentToDelete(attachment);
    setUploadError("");
    setUploadSuccess("");
  };

  const handleDeleteAttachment = async () => {
    if (!attachmentToDelete?._id) return;

    try {
      setDeletingAttachment(true);
      setUploadError("");
      setUploadSuccess("");

      await api.deleteTaskAttachment(
        project._id,
        task._id,
        attachmentToDelete._id
      );

      setAttachmentToDelete(null);
      setUploadSuccess("Attachment removed successfully.");

      await onChange?.();
    } catch (error) {
      console.error("Failed to remove attachment:", error);
      setUploadError(
        error?.message || "Failed to remove attachment."
      );
    } finally {
      setDeletingAttachment(false);
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile) {
      setUploadError("Please select a file first.");
      return;
    }

    try {
      setUploading(true);
      setUploadError("");
      setUploadSuccess("");

      const formData = new FormData();
      formData.append("attachments", selectedFile);

      await api.uploadTaskAttachments(
  project._id,
  task._id,
  formData
);

      setSelectedFile(null);
      setUploadSuccess("File uploaded successfully.");

      await onChange?.();
    } catch (error) {
      console.error("Failed to upload file:", error);
      setUploadError(error?.message || "Failed to upload file.");
    } finally {
      setUploading(false);
    }
  };

  const cycleStatus = async (event) => {
    event.stopPropagation();

    if (!canManage) return;

    const nextStatus = {
      todo: "in_progress",
      in_progress: "done",
      done: "todo",
    };

    try {
      setSaving(true);

      await api.updateTask(project._id, task._id, {
        status: nextStatus[task.status] || "todo",
      });

      onChange?.();
    } catch (error) {
      console.error("Failed to update task status:", error);
    } finally {
      setSaving(false);
    }
  };

  const changePriority = async (event) => {
    event.stopPropagation();

    if (!canManage) return;

    const newPriority = event.target.value;

    try {
      setSaving(true);

      await api.updateTask(project._id, task._id, {
        priority: newPriority,
      });

      onChange?.();
    } catch (error) {
      console.error("Failed to update task priority:", error);
    } finally {
      setSaving(false);
    }
  };

  const changeDueDate = async (event) => {
    event.stopPropagation();

    if (!canManage) return;

    const newDueDate = event.target.value;

    try {
      setSaving(true);

      await api.updateTask(project._id, task._id, {
        dueDate: newDueDate || null,
      });

      onChange?.();
    } catch (error) {
      console.error("Failed to update task deadline:", error);
    } finally {
      setSaving(false);
    }
  };

  const deleteTask = async (event) => {
    event.stopPropagation();

    if (!canManage) return;

    const confirmed = window.confirm(
      `Delete "${task.title}"?`
    );

    if (!confirmed) return;

    try {
      setSaving(true);

      await api.deleteTask(project._id, task._id);

      onChange?.();
    } catch (error) {
      console.error("Failed to delete task:", error);
    } finally {
      setSaving(false);
    }
  };

  const addSubtask = async (event) => {
    event.preventDefault();

    if (!subtaskTitle.trim()) return;

    try {
      setSaving(true);

      await api.createSubtask(
        project._id,
        task._id,
        {
          title: subtaskTitle.trim(),
        }
      );

      setSubtaskTitle("");
      onChange?.();
    } catch (error) {
      console.error("Failed to create subtask:", error);
    } finally {
      setSaving(false);
    }
  };

  const toggleSubtask = async (subtask) => {
    if (!subtask?._id || saving) return;

    try {
      setSaving(true);

      await api.updateSubtask(
        project._id,
        task._id,
        subtask._id,
        {
          isCompleted: !subtask.isCompleted,
        }
      );

      await onChange?.();
    } catch (error) {
      console.error("Failed to update subtask:", error);
    } finally {
      setSaving(false);
    }
  };

  const deleteSubtask = async (subtaskId) => {
    try {
      setSaving(true);

      await api.deleteSubtask(
        project._id,
        task._id,
        subtaskId
      );

      onChange?.();
    } catch (error) {
      console.error("Failed to delete subtask:", error);
    } finally {
      setSaving(false);
    }
  };

  const generateAISubtasks = async () => {
    setAiError("");
    setAiSuccess("");
    setAiLoading(true);

    try {
      const prompt = `
You are an AI project management assistant.

Break the following project task into practical, small subtasks.

Project:
${project?.name || "Unknown project"}

Task title:
${task.title}

Task description:
${task.description || "No description provided"}

Task status:
${task.status || "todo"}

Existing subtasks:
${
  subtasks.length
    ? subtasks.map((item) => `- ${item.title}`).join("\n")
    : "None"
}

Return ONLY valid JSON.

Format:
[
  {
    "title": "Short subtask title"
  }
]

Rules:
- Return 3 to 7 useful subtasks.
- Do not repeat existing subtasks.
- Keep each title short and actionable.
- Do not include markdown.
`;

      const response = await api.generateAI(prompt);

      let raw = response?.result || "";

      raw = raw
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();

      const parsed = JSON.parse(raw);

      if (!Array.isArray(parsed)) {
        throw new Error("AI returned an invalid subtask plan.");
      }

      const cleaned = parsed
        .filter((item) => item?.title)
        .map((item) => ({
          title: String(item.title).trim(),
        }))
        .filter((item) => item.title);

      if (!cleaned.length) {
        throw new Error("AI did not generate any subtasks.");
      }

      setAiSubtasks(cleaned);
      setAiCreatedIndexes([]);
    } catch (error) {
      console.error("AI subtask generation failed:", error);

      setAiError(
        error?.message ||
          "Failed to generate AI subtasks."
      );
    } finally {
      setAiLoading(false);
    }
  };

  const createAISubtask = async (subtask, index) => {
    if (!subtask?.title || aiCreating || aiCreatingIndex !== null) return;

    setAiError("");
    setAiSuccess("");
    setAiCreatingIndex(index);

    try {
      await api.createSubtask(project._id, task._id, {
        title: subtask.title,
      });

      setAiCreatedIndexes((current) => [...current, index]);
      setAiSuccess(`"${subtask.title}" was added as a subtask.`);
      onChange?.();
    } catch (error) {
      console.error("Failed to create AI subtask:", error);
      setAiError(
        error?.message || "Failed to create the selected AI subtask."
      );
    } finally {
      setAiCreatingIndex(null);
    }
  };

  return (
    <div className="border rounded-xl bg-panel shadow-sm">
      {/* Task header */}
      <div
        className="p-4 cursor-pointer"
        onClick={() => setOpen((value) => !value)}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h3 className="font-semibold text-paper break-words">
              {task.title}
            </h3>

            {task.description && (
              <p className="mt-1 text-sm text-paper-dim line-clamp-2">
                {task.description}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Priority */}
            {canManage ? (
              <select
                value={task.priority || "medium"}
                onChange={changePriority}
                disabled={saving}
                onClick={(event) => event.stopPropagation()}
                className={`px-2.5 py-1 rounded-full text-xs font-semibold border-0 outline-none cursor-pointer ${priority?.className || PRIORITY_STYLES.medium.className}`}
                aria-label="Change task priority"
              >
                <option value="high">High Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="low">Low Priority</option>
              </select>
            ) : (
              priority && (
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold ${priority.className}`}
                >
                  {priority.label} Priority
                </span>
              )
            )}

            {/* Deadline */}
            {task.dueDate && (
              <span
                className="px-2.5 py-1 rounded-full text-xs font-semibold bg-panel-raised text-paper-dim"
                title="Task deadline"
              >
                📅 {new Date(task.dueDate).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            )}

            {/* Status */}
            <button
              type="button"
              onClick={cycleStatus}
              disabled={!canManage || saving}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold ${status.className} ${
                canManage
                  ? "cursor-pointer hover:opacity-80"
                  : "cursor-default"
              }`}
            >
              {status.label}
            </button>

            {canManage && (
              <button
                type="button"
                onClick={deleteTask}
                disabled={saving}
                className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100"
              >
                Delete
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Expanded task details */}
      {open && (
        <div className="border-t px-4 py-4 space-y-5">
          {/* Priority + deadline */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Priority information */}
            <div>
              <h4 className="text-sm font-semibold text-paper">
                Priority
              </h4>

              <div className="mt-2">
                {canManage ? (
                  <select
                    value={task.priority || "medium"}
                    onChange={changePriority}
                    disabled={saving}
                    className="w-full rounded-lg border px-3 py-2 text-sm bg-panel text-paper outline-none focus:ring-2 focus:ring-blue-200 disabled:opacity-50"
                    aria-label="Change task priority"
                  >
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                ) : priority ? (
                  <span
                    className={`inline-flex px-3 py-1.5 rounded-lg text-sm font-semibold ${priority.className}`}
                  >
                    {priority.label}
                  </span>
                ) : (
                  <p className="text-sm text-paper-dim">
                    No priority has been assigned yet.
                  </p>
                )}

                {canManage && (
                  <p className="mt-2 text-xs text-paper-dim">
                    Choose a priority to update it immediately.
                  </p>
                )}
              </div>
            </div>

            {/* Task deadline */}
            <div>
              <h4 className="text-sm font-semibold text-paper">
                Deadline
              </h4>

              <div className="mt-2">
                {canManage ? (
                  <input
                    type="date"
                    value={
                      task.dueDate
                        ? new Date(task.dueDate).toISOString().slice(0, 10)
                        : ""
                    }
                    onChange={changeDueDate}
                    disabled={saving}
                    className="w-full rounded-lg border px-3 py-2 text-sm bg-panel text-paper outline-none focus:ring-2 focus:ring-blue-200 disabled:opacity-50"
                    aria-label="Change task deadline"
                  />
                ) : task.dueDate ? (
                  <span className="inline-flex px-3 py-1.5 rounded-lg text-sm font-semibold bg-panel-raised text-paper">
                    {new Date(task.dueDate).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                ) : (
                  <p className="text-sm text-paper-dim">
                    No deadline has been assigned.
                  </p>
                )}

                {canManage && (
                  <p className="mt-2 text-xs text-paper-dim">
                    Choose a deadline to add this task to the Calendar.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* File attachments */}
          <div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h4 className="text-sm font-semibold text-paper">
                  Attachments
                </h4>
                <p className="mt-1 text-xs text-paper-dim">
                  Upload files related to this task. Maximum size: 1 MB.
                </p>
              </div>

              {canManage && (
                <div className="flex flex-wrap items-center gap-2">
                  <label
                    htmlFor={`task-file-${task._id}`}
                    className="cursor-pointer rounded-lg border px-4 py-2 text-sm font-medium hover:bg-panel-raised"
                  >
                    Choose file
                  </label>

                  <input
                    id={`task-file-${task._id}`}
                    type="file"
                    onChange={handleFileChange}
                    className="hidden"
                    disabled={uploading}
                  />

                  {selectedFile && (
                    <button
                      type="button"
                      onClick={handleFileUpload}
                      disabled={uploading}
                      className="rounded-lg green-button px-4 py-2 text-sm font-medium disabled:opacity-50"
                    >
                      {uploading ? "Uploading..." : "Upload"}
                    </button>
                  )}
                </div>
              )}
            </div>

            {selectedFile && (
              <div className="mt-3 flex items-center gap-3 rounded-lg border bg-panel-raised p-3">
                <span className="text-lg">📎</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-paper break-all">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-paper-dim">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedFile(null)}
                  disabled={uploading}
                  className="text-xs text-red-500 hover:text-red-700"
                >
                  Remove
                </button>
              </div>
            )}

            {uploadError && (
              <p className="mt-3 rounded-lg bg-red-100 px-3 py-2 text-sm text-red-700">
                {uploadError}
              </p>
            )}

            {uploadSuccess && (
              <p className="mt-3 rounded-lg bg-green-100 px-3 py-2 text-sm text-green-700">
                {uploadSuccess}
              </p>
            )}

            <div className="mt-3 space-y-2">
              {attachments.length === 0 ? (
                <p className="text-sm text-paper-dim">
                  No files attached to this task.
                </p>
              ) : (
                attachments.map((file, index) => (
                  <div
                    key={file._id || file.path || `${file.name}-${index}`}
                    className="flex items-center gap-3 rounded-lg border p-3"
                  >
                    <span className="text-lg">📎</span>

                    <div className="min-w-0 flex-1">
                      {file.url ? (
                        <a
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-blue-600 hover:underline break-all"
                        >
                          {file.name || "Attached file"}
                        </a>
                      ) : (
                        <p className="text-sm font-medium text-paper break-all">
                          {file.name || "Attached file"}
                        </p>
                      )}
                    </div>

                    {canManage && file._id && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          askDeleteAttachment(file);
                        }}
                        disabled={uploading}
                        className="shrink-0 text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Existing subtasks */}
          <div>
            <h4 className="text-sm font-semibold text-paper">
              Subtasks
            </h4>

            <div className="mt-2 space-y-2">
              {subtasks.length === 0 ? (
                <p className="text-sm text-paper-dim">
                  No subtasks yet.
                </p>
              ) : (
                subtasks.map((subtask) => (
                  <div
                    key={subtask._id}
                    className="flex items-center gap-2 rounded-lg border p-2"
                  >
                    <button
                      type="button"
                      aria-label={
                        subtask.isCompleted
                          ? `Mark ${subtask.title} incomplete`
                          : `Mark ${subtask.title} complete`
                      }
                      onClick={(event) => {
                        event.stopPropagation();
                        toggleSubtask(subtask);
                      }}
                      disabled={saving}
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs font-semibold transition-colors ${
                        subtask.isCompleted
                          ? "border-green-500 bg-green-500 text-white"
                          : "border-line bg-transparent text-transparent hover:border-green-400"
                      } disabled:opacity-50`}
                    >
                      ✓
                    </button>

                    <span className="flex-1 text-sm text-paper">
                      {subtask.title}
                    </span>

                    {canManage && (
                      <button
                        type="button"
                        onClick={() =>
                          deleteSubtask(subtask._id)
                        }
                        className="text-xs text-red-500 hover:text-red-700"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Manual subtask creation */}
            {canManage && (
              <form
                onSubmit={addSubtask}
                className="mt-3 flex flex-col gap-2 sm:flex-row"
              >
                <input
                  value={subtaskTitle}
                  onChange={(event) =>
                    setSubtaskTitle(event.target.value)
                  }
                  placeholder="Add a subtask..."
                  className="flex-1 rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                />

                <button
                  type="submit"
                  disabled={
                    saving || !subtaskTitle.trim()
                  }
                  className="rounded-lg green-button px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  Add
                </button>
              </form>
            )}
          </div>

          {/* AI subtasks */}
          <div className="rounded-xl border border-purple-200 bg-purple-50 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h4 className="font-semibold text-paper">
                  🤖 AI Subtask Assistant
                </h4>

                <p className="mt-1 text-xs text-paper-dim">
                  Let Gemini break this task into smaller actionable steps.
                </p>
              </div>

              <button
                type="button"
                onClick={generateAISubtasks}
                disabled={aiLoading}
                className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
              >
                {aiLoading
                  ? "Generating..."
                  : "Break down with AI"}
              </button>
            </div>

            {aiError && (
              <div className="mt-3 rounded-lg bg-red-100 px-3 py-2 text-sm text-red-700">
                {aiError}
              </div>
            )}

            {aiSuccess && (
              <div className="mt-3 rounded-lg bg-green-100 px-3 py-2 text-sm text-green-700">
                {aiSuccess}
              </div>
            )}

            {aiSubtasks.length > 0 && (
              <div className="mt-4">
                <h5 className="text-sm font-semibold text-paper">
                  AI Subtask Plan
                </h5>

                <div className="mt-2 space-y-2">
                  {aiSubtasks.map((subtask, index) => {
                    const isCreated = aiCreatedIndexes.includes(index);
                    const isCreating = aiCreatingIndex === index;

                    return (
                      <div
                        key={`${subtask.title}-${index}`}
                        className="flex flex-col gap-3 rounded-lg bg-panel border p-3 text-sm text-paper sm:flex-row sm:items-center"
                      >
                        <div className="flex-1 min-w-0">
                          <span className="mr-2 font-semibold text-purple-600">
                            {index + 1}.
                          </span>
                          {subtask.title}
                        </div>

                        {canManage && (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              createAISubtask(subtask, index);
                            }}
                            disabled={
                              aiCreating ||
                              isCreated ||
                              aiCreatingIndex !== null
                            }
                            className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-60 ${
                              isCreated
                                ? "bg-green-100 text-green-700"
                                : "bg-purple-100 text-purple-700 hover:bg-purple-200"
                            }`}
                          >
                            {isCreating
                              ? "Creating..."
                              : isCreated
                                ? "Created ✓"
                                : "Create"}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

              </div>
            )}
          </div>
        </div>
      )}


      {/* Attachment delete confirmation modal */}
      {attachmentToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => {
            if (!deletingAttachment) {
              setAttachmentToDelete(null);
            }
          }}
        >
          <div
            className="w-full max-w-md rounded-xl border bg-panel p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-paper">
              Remove attachment
            </h3>

            <p className="mt-3 text-sm text-paper-dim">
              Are you sure you want to remove this attachment?
            </p>

            <p className="mt-2 break-all text-sm font-medium text-paper">
              {attachmentToDelete.name || "Attached file"}
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setAttachmentToDelete(null)}
                disabled={deletingAttachment}
                className="rounded-lg border px-4 py-2 text-sm font-medium text-paper hover:bg-panel-raised disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDeleteAttachment}
                disabled={deletingAttachment}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deletingAttachment ? "Removing..." : "Remove"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
