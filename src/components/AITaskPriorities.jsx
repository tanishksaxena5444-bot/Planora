import { useEffect, useRef, useState } from "react";
import { api } from "../api/client";
import { askAIForJSON, isAbortError } from "../lib/ai";
import GeminiIcon from "./GeminiIcon";

function buildPrompt(project, tasks) {
  const taskContext = tasks
    .map(
      (task, index) => `
TASK ${index + 1}
ID: ${task._id}
Title: ${task.title}
Status: ${task.status}
Current Priority: ${task.priority || "medium"}
Description: ${task.description || "No description"}
Due Date: ${task.dueDate ? new Date(task.dueDate).toISOString().split("T")[0] : "No due date"}
`
    )
    .join("\n");

  return `
You are an AI project-management copilot.

Analyze the tasks for this project and recommend a practical priority for each task.

PROJECT
Name: ${project?.name || "Unknown"}
Description: ${project?.description || "No description"}

CURRENT TASKS
${taskContext}

RULES:
- Only prioritize tasks that actually exist above.
- Never invent tasks.
- Never invent task IDs.
- Return exactly one result for every existing task.
- A completed task should normally be LOW priority.
- Tasks that unblock other work should receive higher priority.
- Tasks with urgent or near due dates should receive higher priority.
- Tasks that are important for project completion should receive higher priority.
- Consider the current status, description, due date, and project context.
- Use practical project-management reasoning.

Return ONLY valid JSON.

Use exactly this format:

[
  { "taskId": "existing task ID", "priority": "high", "reason": "Short practical explanation" }
]

Priority must be exactly one of:
- high
- medium
- low

Do not include markdown.
Do not include backticks.
Do not include explanation outside the JSON.
`;
}

function normalizePriorities(parsed, tasks) {
  if (!Array.isArray(parsed)) {
    throw new Error("Gemini returned an invalid priority list.");
  }

  const taskMap = new Map(tasks.map((task) => [String(task._id), task]));

  const validPriorities = parsed
    .filter(
      (item) =>
        item &&
        typeof item.taskId === "string" &&
        ["high", "medium", "low"].includes(item.priority) &&
        typeof item.reason === "string"
    )
    .filter((item) => taskMap.has(String(item.taskId)))
    .map((item) => ({ ...item, task: taskMap.get(String(item.taskId)) }));

  if (!validPriorities.length) {
    throw new Error("Gemini did not return valid priorities for the current tasks.");
  }

  const priorityOrder = { high: 0, medium: 1, low: 2 };
  validPriorities.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  return validPriorities;
}

export default function AITaskPriorities({ project, tasks = [], onChange, canManage = false }) {
  const [priorities, setPriorities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const abortRef = useRef(null);
  useEffect(() => () => abortRef.current?.abort(), []);

  async function analyzePriorities() {
    if (!tasks.length) {
      setError("There are no tasks to prioritize yet.");
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError("");
    setSuccess("");
    setPriorities([]);

    try {
      const parsed = await askAIForJSON(buildPrompt(project, tasks), { signal: controller.signal });
      setPriorities(normalizePriorities(parsed, tasks));
    } catch (err) {
      if (isAbortError(err)) return;
      console.error("AI priority analysis failed:", err);
      setError(err.message || "Gemini could not analyze task priorities. Please try again.");
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }

  async function applyPriorities() {
    if (!priorities.length) return;
    if (!canManage) {
      setError("Only project admins can apply AI priorities to tasks.");
      return;
    }

    setApplying(true);
    setError("");
    setSuccess("");

    try {
      let updatedCount = 0;
      for (const item of priorities) {
        await api.updateTask(project._id, item.taskId, { priority: item.priority });
        updatedCount += 1;
      }
      setSuccess(`AI priorities applied to ${updatedCount} task${updatedCount === 1 ? "" : "s"}.`);
      if (onChange) await onChange();
    } catch (err) {
      console.error("Failed to apply AI priorities:", err);
      setError(err.message || "Could not save the AI priorities. Please try again.");
    } finally {
      setApplying(false);
    }
  }

  function getPriorityLabel(priority) {
    if (priority === "high") return "HIGH";
    if (priority === "medium") return "MEDIUM";
    return "LOW";
  }

  function getPriorityClasses(priority) {
    if (priority === "high") return "border-blocked";
    if (priority === "medium") return "border-progress";
    return "border-line";
  }

  function getPriorityTextClass(priority) {
    if (priority === "high") return "text-blocked";
    if (priority === "medium") return "text-progress";
    return "text-paper-dim";
  }

  return (
    <section className="app-card rounded-2xl p-5 mb-7 border border-line">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <p className="font-mono text-[10px] uppercase tracking-widest text-progress">
              AI Task Priorities
            </p>
            <GeminiIcon size={18} />
          </div>
          <h2 className="font-display text-2xl mt-1">What should we work on first?</h2>
          <p className="text-sm text-paper-dim mt-1">
            Gemini analyzes your current tasks and ranks them by importance.
          </p>
        </div>

        <button
          type="button"
          onClick={analyzePriorities}
          disabled={loading || applying || !tasks.length}
          className="green-button flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium disabled:opacity-50 whitespace-nowrap"
        >
          <GeminiIcon size={18} />
          <span>{loading ? "Analyzing..." : "Prioritize with AI"}</span>
        </button>
      </div>

      {error && <p className="text-sm text-blocked mt-4">{error}</p>}
      {success && <p className="text-sm text-progress mt-4">{success}</p>}

      {priorities.length > 0 && (
        <div className="mt-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-line pt-5 mb-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-progress">
                AI Priority Plan
              </p>
              <p className="text-xs text-paper-dim mt-1">
                Review Gemini's recommendations before saving them.
              </p>
            </div>

            {canManage && (
              <button
                type="button"
                onClick={applyPriorities}
                disabled={applying}
                className="green-button rounded-lg px-4 py-2 text-xs font-medium disabled:opacity-50 whitespace-nowrap"
              >
                {applying ? "Applying..." : "Apply AI Priorities"}
              </button>
            )}
          </div>

          <div className="space-y-2">
            {priorities.map((item, index) => (
              <div
                key={item.taskId}
                className={`border rounded-xl p-4 ${getPriorityClasses(item.priority)}`}
              >
                <div className="flex items-start gap-3">
                  <div className="font-mono text-xs text-paper-dim pt-1">{index + 1}.</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`font-mono text-[10px] tracking-widest ${getPriorityTextClass(
                          item.priority
                        )}`}
                      >
                        {getPriorityLabel(item.priority)}
                      </span>
                      <span className="text-xs text-paper-dim capitalize">
                        {item.task?.status?.replace("_", " ")}
                      </span>
                    </div>
                    <p className="text-sm font-medium mt-1">{item.task?.title}</p>
                    <p className="text-xs text-paper-dim mt-1 leading-5">{item.reason}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!priorities.length && !loading && !error && !success && (
        <div className="border border-line rounded-xl p-4 mt-4">
          <p className="text-sm text-paper-dim">
            Click <span className="text-paper">Prioritize with AI</span> to analyze the current project tasks.
          </p>
        </div>
      )}
    </section>
  );
}
