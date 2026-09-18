import { useState } from "react";
import { api } from "../api/client";
import GeminiIcon from "./GeminiIcon";

export default function ProjectAICopilot({
  project,
  tasks,
  notes,
  members,
  canManage,
  onChange,
}) {
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");
  const [suggestedTasks, setSuggestedTasks] = useState([]);
  const [creatingTaskIndex, setCreatingTaskIndex] = useState(null);
  const [createdTaskIndexes, setCreatedTaskIndexes] = useState([]);

  const [planner, setPlanner] = useState(null);

  const [deadlineInput, setDeadlineInput] = useState("");
  const [deadlinePlan, setDeadlinePlan] = useState(null);

const [loading, setLoading] = useState(false);
const [creatingTasks, setCreatingTasks] = useState(false);
const [plannerLoading, setPlannerLoading] = useState(false);
const [deadlineLoading, setDeadlineLoading] = useState(false);
const [riskLoading, setRiskLoading] = useState(false);

const [riskAnalysis, setRiskAnalysis] = useState(null);

const [error, setError] = useState("");
const [success, setSuccess] = useState("");

  function buildProjectContext() {
    return `
PROJECT
Name: ${project?.name || "Unknown"}
Description: ${project?.description || "No description"}

TASKS
${
  tasks.length
    ? tasks
        .map(
  (task) =>
    `- ${task.title} | Status: ${task.status} | Priority: ${
      task.priority || "Not assigned"
    } | Due date: ${
      task.dueDate
        ? new Date(task.dueDate).toLocaleDateString()
        : "No due date"
    } | Description: ${
      task.description || "None"
    }`
)
        .join("\n")
    : "No tasks yet"
}

NOTES
${
  notes.length
    ? notes.map((note) => `- ${note.content}`).join("\n")
    : "No notes yet"
}

TEAM MEMBERS
${
  members.length
    ? members
        .map(
          (member) =>
            `- ${
              member.user?.fullName ||
              member.user?.username ||
              "Unknown"
            } | Role: ${member.role}`
        )
        .join("\n")
    : "No team members found"
}
`;
  }

  async function askAI(customPrompt) {
    const question = customPrompt || prompt;

    if (!question.trim()) return;

    setLoading(true);
    setError("");
    setSuccess("");
    setResponse("");
    setSuggestedTasks([]);
    setCreatedTaskIndexes([]);
    setPlanner(null);
    setDeadlinePlan(null);

    try {
      const projectContext = buildProjectContext();

      const isTaskRequest =
        question.toLowerCase().includes("create") &&
        question.toLowerCase().includes("task");

      const finalPrompt = `
You are an AI project-management copilot.

You are helping manage this project:

${projectContext}

USER REQUEST:
${question}

Give practical advice based ONLY on the project information above.

Do not invent existing project information.

${
  isTaskRequest
    ? `
The user wants task suggestions.

Return ONLY valid JSON.

Use exactly this format:

[
  {
    "title": "Task title",
    "description": "Short practical description"
  }
]

Generate between 3 and 7 useful tasks.

Do not include markdown.
Do not include backticks.
Do not include explanations outside the JSON.
`
    : `
Give a concise and useful answer.

If the user asks about finishing on time:
- Analyze the current work
- Identify blockers
- Identify risky work
- Recommend what should happen next

If the user asks about priorities:
- Rank the most important tasks
- Explain why

If the user asks for a summary:
- Give a short project health summary
- Mention completed, in-progress, and remaining work
- Mention important risks
`
}
`;

      const result = await api.generateAI(finalPrompt);

      const text = result.result || "No response generated.";

      setResponse(text);

      if (isTaskRequest) {
        try {
          let parsed;

          try {
            parsed = JSON.parse(text);
          } catch {
            const cleaned = text
              .replace(/```json/gi, "")
              .replace(/```/g, "")
              .trim();

            parsed = JSON.parse(cleaned);
          }

          if (!Array.isArray(parsed)) {
            throw new Error("Invalid task list.");
          }

          const validTasks = parsed.filter(
            (task) =>
              task &&
              typeof task.title === "string" &&
              task.title.trim()
          );

          if (validTasks.length === 0) {
            throw new Error("No valid tasks were generated.");
          }

          setSuggestedTasks(validTasks);
          setCreatedTaskIndexes([]);
        } catch (parseError) {
          console.error(
            "Could not parse AI task suggestions:",
            parseError
          );

          setError(
            "Gemini returned an unexpected format. Try asking again."
          );
        }
      }
    } catch (err) {
      console.error(err);

      setError(
        err.message || "Failed to contact AI."
      );
    } finally {
      setLoading(false);
    }
  }

  async function createSuggestedTask(task, index) {
    if (
      !canManage ||
      !task?.title ||
      creatingTaskIndex !== null ||
      creatingTasks
    ) {
      return;
    }

    setCreatingTaskIndex(index);
    setError("");
    setSuccess("");

    try {
      await api.createTask(project?._id, {
        title: task.title.trim(),
        description: task.description?.trim() || "",
      });

      setCreatedTaskIndexes((current) =>
        current.includes(index) ? current : [...current, index]
      );

      setSuccess(`"${task.title}" was added to the project.`);

      // Refresh the task list in ProjectDetail immediately.
      await onChange?.();
    } catch (err) {
      console.error("Failed to create suggested task:", err);

      setError(
        err.message || "Failed to create the selected AI task."
      );
    } finally {
      setCreatingTaskIndex(null);
    }
  }

  async function createSuggestedTasks() {
    if (!suggestedTasks.length || !canManage) return;

    setCreatingTasks(true);
    setError("");
    setSuccess("");

    try {
      let createdCount = 0;

      for (let index = 0; index < suggestedTasks.length; index += 1) {
        if (createdTaskIndexes.includes(index)) continue;

        const task = suggestedTasks[index];

        await api.createTask(project?._id, {
          title: task.title.trim(),
          description: task.description?.trim() || "",
        });

        createdCount += 1;
      }

      setSuccess(
        createdCount > 0
          ? `${createdCount} task${createdCount === 1 ? "" : "s"} added to the project.`
          : "All suggested tasks have already been created."
      );

      // Refresh the task list in ProjectDetail immediately.
      await onChange?.();

      setSuggestedTasks([]);
      setCreatedTaskIndexes([]);

      setResponse(
        "Done! The selected suggested tasks have been added to your project."
      );
    } catch (err) {
      console.error(err);

      setError(
        err.message || "Failed to create the suggested tasks."
      );
    } finally {
      setCreatingTasks(false);
    }
  }

  async function planProject() {
    setPlannerLoading(true);
    setError("");
    setSuccess("");
    setPlanner(null);
    setDeadlinePlan(null);
    setResponse("");
    setSuggestedTasks([]);

    try {
      const projectContext = buildProjectContext();

      const plannerPrompt = `
You are an expert AI project manager.

Analyze the project below and create a practical execution plan.

PROJECT DATA
${projectContext}

Your job is to understand the current state of the project and recommend what the team should do next.

IMPORTANT:
- Use ONLY information provided in the project data.
- Do not invent existing tasks, people, deadlines, or project facts.
- If a deadline was not provided, do not invent one.
- If information is missing, say so.
- Focus on actionable project-management advice.

Return ONLY valid JSON.

Use exactly this structure:

{
  "health": "Healthy",
  "summary": "Short explanation of the current project health.",
  "completed": 0,
  "inProgress": 0,
  "remaining": 0,
  "priorities": [
    {
      "task": "Task title",
      "reason": "Why this should be prioritized"
    }
  ],
  "risks": [
    {
      "risk": "Risk or blocker",
      "impact": "Why it matters",
      "mitigation": "What the team should do"
    }
  ],
  "plan": [
    {
      "phase": "Next step",
      "actions": [
        "Action 1",
        "Action 2"
      ]
    }
  ],
  "nextAction": "The single most important action the team should take next."
}

Rules:
- health must be one of: Healthy, At risk, Blocked
- completed, inProgress, and remaining must be numbers
- priorities should contain up to 5 items
- risks should contain up to 5 items
- plan should contain 2 to 5 phases
- Each phase should contain 1 to 4 actions
- nextAction must be one clear actionable sentence
- Return JSON only.
- No markdown.
- No backticks.
- No explanation outside the JSON.
`;

      const result = await api.generateAI(plannerPrompt);

      const text = result.result || "";

      let parsed;

      try {
        parsed = JSON.parse(text);
      } catch {
        const cleaned = text
          .replace(/```json/gi, "")
          .replace(/```/g, "")
          .trim();

        parsed = JSON.parse(cleaned);
      }

      if (!parsed || typeof parsed !== "object") {
        throw new Error(
          "Gemini returned an invalid project plan."
        );
      }

      setPlanner(parsed);
    } catch (err) {
      console.error("AI planner error:", err);

      setError(
        err.message || "Failed to generate the project plan."
      );
    } finally {
      setPlannerLoading(false);
    }
  }

  async function createDeadlinePlan() {
    if (!deadlineInput.trim()) return;

    setDeadlineLoading(true);
    setError("");
    setSuccess("");
    setPlanner(null);
    setDeadlinePlan(null);
    setResponse("");
    setSuggestedTasks([]);

    try {
      const projectContext = buildProjectContext();

      const deadlinePrompt = `
You are an expert AI project manager.

Create a realistic execution schedule for this project.

PROJECT DATA
${projectContext}

USER DEADLINE REQUEST
${deadlineInput}

Important rules:

- Use ONLY the project information provided.
- Do not invent existing tasks.
- Do not invent team members.
- Do not assume tasks are completed unless their status says so.
- Respect the user's requested deadline.
- Prioritize unfinished work.
- Put dependent or foundational work before later work.
- Leave room for testing, fixing problems, and final review.
- If the deadline seems unrealistic, clearly say so.
- Do not assign work to a person unless the project data provides enough information.

Return ONLY valid JSON.

Use exactly this structure:

{
  "feasibility": "Realistic",
  "summary": "Short explanation of whether the deadline is realistic.",
  "days": [
    {
      "day": "Day 1",
      "focus": "Main focus for the day",
      "tasks": [
        "Task or action 1",
        "Task or action 2"
      ]
    }
  ],
  "risks": [
    "Risk 1",
    "Risk 2"
  ],
  "buffer": "How much time should be reserved for testing, bugs, and unexpected work.",
  "finalAction": "What should happen immediately before the deadline."
}

Rules for feasibility:
- Use only: Realistic, Tight, Unrealistic

Rules for days:
- Create one entry for each day requested by the user when possible.
- Keep the workload realistic.
- Use existing task names whenever possible.
- Do not create unnecessary new tasks.

Return JSON only.
No markdown.
No backticks.
No explanation outside the JSON.
`;

      const result = await api.generateAI(deadlinePrompt);

      const text = result.result || "";

      let parsed;

      try {
        parsed = JSON.parse(text);
      } catch {
        const cleaned = text
          .replace(/```json/gi, "")
          .replace(/```/g, "")
          .trim();

        parsed = JSON.parse(cleaned);
      }

      if (!parsed || typeof parsed !== "object") {
        throw new Error(
          "Gemini returned an invalid deadline plan."
        );
      }

      setDeadlinePlan(parsed);
    } catch (err) {
      console.error(
        "AI deadline planning error:",
        err
      );

      setError(
        err.message ||
          "Failed to generate the deadline plan."
      );
    } finally {
      setDeadlineLoading(false);
    }
  }
  async function analyzeTaskRisks() {
    setRiskLoading(true);
    setError("");
    setSuccess("");
    setRiskAnalysis(null);
    setResponse("");
    setPlanner(null);
    setDeadlinePlan(null);
    setSuggestedTasks([]);

    try {
      const projectContext = buildProjectContext();

      const riskPrompt = `
You are an expert AI project risk manager.

Analyze the following project and identify tasks that may put the project at risk.

PROJECT DATA
${projectContext}

Your job is to identify:
- overdue tasks
- tasks approaching their due date
- high-priority unfinished tasks
- tasks that appear blocked
- tasks that may delay other work
- tasks that need immediate attention

IMPORTANT:
- Use ONLY the project information provided.
- Do not invent deadlines.
- Do not invent blockers.
- Do not assume a task is overdue if there is no due date.
- Do not mark completed tasks as risky unless there is a clear reason.
- Consider task status, priority, due date, and description together.
- If there are no meaningful risks, return an empty risks array.
- Give practical recommended actions.

Return ONLY valid JSON.

Use exactly this structure:

{
  "overallRisk": "Low",
  "summary": "Short explanation of the project's current task risk.",
  "risks": [
    {
      "task": "Exact existing task title",
      "level": "High",
      "reason": "Why this task is risky.",
      "action": "What the team should do next."
    }
  ]
}

Rules:
- overallRisk must be one of: Low, Medium, High
- level must be one of: Low, Medium, High
- Only include tasks that actually exist in the project data.
- risks should contain up to 7 items.
- Keep reasons concise.
- Keep actions practical.
- Return JSON only.
- No markdown.
- No backticks.
- No explanation outside the JSON.
`;

      const result = await api.generateAI(riskPrompt);

      const text = result.result || "";

      let parsed;

      try {
        parsed = JSON.parse(text);
      } catch {
        const cleaned = text
          .replace(/```json/gi, "")
          .replace(/```/g, "")
          .trim();

        parsed = JSON.parse(cleaned);
      }

      if (!parsed || typeof parsed !== "object") {
        throw new Error(
          "Gemini returned an invalid risk analysis."
        );
      }

      if (
        !["Low", "Medium", "High"].includes(
          parsed.overallRisk
        )
      ) {
        parsed.overallRisk = "Medium";
      }

      if (!Array.isArray(parsed.risks)) {
        parsed.risks = [];
      }

      parsed.risks = parsed.risks
        .filter(
          (risk) =>
            risk &&
            typeof risk.task === "string" &&
            typeof risk.reason === "string" &&
            typeof risk.action === "string"
        )
        .map((risk) => ({
          task: risk.task.trim(),
          level: ["Low", "Medium", "High"].includes(
            risk.level
          )
            ? risk.level
            : "Medium",
          reason: risk.reason.trim(),
          action: risk.action.trim(),
        }));

      setRiskAnalysis(parsed);
    } catch (err) {
      console.error("AI risk analysis error:", err);

      setError(
        err.message ||
          "Failed to analyze project risks."
      );
    } finally {
      setRiskLoading(false);
    }
  }
  return (
    <section className="app-card rounded-2xl p-5 mb-7 border border-line">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <p className="font-mono text-[10px] uppercase tracking-widest text-progress">
              AI Project Copilot
            </p>
            <GeminiIcon size={16} />
          </div>

          <h2 className="font-display text-2xl mt-1">
            Your project teammate
          </h2>
        </div>

        <div className="flex items-center gap-2 text-xs text-paper-dim">
          <GeminiIcon size={19} />
          <span>Powered by Gemini</span>
        </div>
      </div>

      {/* AI ACTION BUTTONS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 mb-4">
        <button
          onClick={() =>
            askAI(
              "Give me a concise summary of the current project and its health."
            )
          }
          disabled={loading}
          className="min-w-0 border border-line rounded-lg px-2 py-2 text-xs whitespace-nowrap hover:border-progress transition-colors disabled:opacity-50"
        >
          Project summary
        </button>

        <button
          onClick={() =>
            askAI(
              "Analyze whether this project is likely to finish on time. Tell me what we should do next."
            )
          }
          disabled={loading}
          className="min-w-0 border border-line rounded-lg px-2 py-2 text-xs whitespace-nowrap hover:border-progress transition-colors disabled:opacity-50"
        >
          Finish on time
        </button>

        <button
          onClick={() =>
            askAI(
              "Find the biggest risks and blockers in this project."
            )
          }
          disabled={loading}
          className="min-w-0 border border-line rounded-lg px-2 py-2 text-xs whitespace-nowrap hover:border-progress transition-colors disabled:opacity-50"
        >
          Find risks
        </button>

        <button
          onClick={() =>
            askAI(
              "Prioritize the current tasks. Tell me which tasks should be worked on first and why."
            )
          }
          disabled={loading}
          className="min-w-0 border border-line rounded-lg px-2 py-2 text-xs whitespace-nowrap hover:border-progress transition-colors disabled:opacity-50"
        >
          Prioritize
        </button>

        <button
          onClick={planProject}
          disabled={plannerLoading}
          className="min-w-0 border border-progress text-progress rounded-lg px-2 py-2 text-xs whitespace-nowrap hover:bg-progress hover:text-ink transition-colors disabled:opacity-50"
        >
          {plannerLoading
            ? "Planning..."
            : "Plan project"}
        </button>
<button
  onClick={analyzeTaskRisks}
  disabled={riskLoading}
  className="min-w-0 border border-blocked text-blocked rounded-lg px-2 py-2 text-xs whitespace-nowrap hover:bg-blocked hover:text-ink transition-colors disabled:opacity-50"
>
  {riskLoading
    ? "Analyzing..."
    : "Analyze risks"}
</button>
        {canManage && (
          <button
            onClick={() =>
              askAI(
                "Create the tasks needed to move this project forward and finish it successfully."
              )
            }
            disabled={loading}
            className="min-w-0 border border-progress text-progress rounded-lg px-2 py-2 text-xs whitespace-nowrap hover:bg-progress hover:text-ink transition-colors disabled:opacity-50"
          >
            Create tasks
          </button>
        )}
      </div>

      {/* CUSTOM AI QUESTION */}
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              askAI();
            }
          }}
          placeholder="Ask anything about this project..."
          className="green-input flex-1 rounded-lg px-3 py-2.5 text-sm"
        />

        <button
          onClick={() => askAI()}
          disabled={loading || !prompt.trim()}
          className="green-button rounded-lg px-4 py-2.5 text-sm font-medium disabled:opacity-50 whitespace-nowrap flex items-center justify-center gap-2"
        >
          <GeminiIcon size={17} />
          {loading ? "Thinking..." : "Ask Gemini"}
        </button>
      </div>

      {/* DEADLINE PLANNER */}
      <div className="mt-5 border-t border-line pt-5">
        <div className="mb-3">
          <div className="flex items-center gap-2">
            <p className="font-mono text-[10px] uppercase tracking-widest text-progress">
              AI Deadline Planner
            </p>
            <GeminiIcon size={18} />
          </div>

          <p className="text-sm text-paper-dim mt-1">
            Tell Gemini when you need to finish the project.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <input
            value={deadlineInput}
            onChange={(e) =>
              setDeadlineInput(e.target.value)
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                createDeadlinePlan();
              }
            }}
            placeholder="e.g. I need to finish this project in 14 days"
            className="green-input flex-1 min-w-0 rounded-lg px-3 py-2.5 text-sm"
          />

          <button
            onClick={createDeadlinePlan}
            disabled={
              deadlineLoading ||
              !deadlineInput.trim()
            }
            className="green-button rounded-lg px-4 py-2.5 text-sm font-medium disabled:opacity-50 whitespace-nowrap flex items-center justify-center gap-2"
          >
            <GeminiIcon size={17} />
            {deadlineLoading
              ? "Planning..."
              : "Plan deadline"}
          </button>
        </div>
      </div>

      {/* ERROR */}
      {error && (
        <p className="text-sm text-blocked mt-4">
          {error}
        </p>
      )}

      {/* SUCCESS */}
      {success && (
        <p className="text-sm text-progress mt-4">
          {success}
        </p>
      )}

      {/* PROJECT PLANNER */}
      {planner && (
        <div className="mt-5 border-t border-line pt-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <p className="font-mono text-[10px] uppercase tracking-widest text-progress">
                  AI Project Planner
                </p>
                <GeminiIcon size={16} />
              </div>

              <p className="text-sm text-paper-dim mt-1">
                Gemini analyzed the current state
                of your project.
              </p>
            </div>

            <span
              className={`text-xs font-mono px-2.5 py-1 rounded-full border ${
                planner.health === "Blocked"
                  ? "border-blocked text-blocked"
                  : planner.health === "At risk"
                  ? "border-yellow-500 text-yellow-500"
                  : "border-progress text-progress"
              }`}
            >
              {planner.health || "Unknown"}
            </span>
          </div>

          {/* HEALTH SUMMARY */}
          <div className="border border-line rounded-xl p-4 mb-4">
            <p className="font-mono text-[10px] uppercase tracking-widest text-paper-dim">
              Project health
            </p>

            <p className="text-sm leading-6 mt-2">
              {planner.summary ||
                "No summary available."}
            </p>

            <div className="grid grid-cols-3 gap-3 mt-4">
              <div className="border border-line rounded-lg p-3">
                <p className="text-xs text-paper-dim">
                  Completed
                </p>

                <p className="text-xl font-display mt-1">
                  {planner.completed ?? 0}
                </p>
              </div>

              <div className="border border-line rounded-lg p-3">
                <p className="text-xs text-paper-dim">
                  In progress
                </p>

                <p className="text-xl font-display mt-1">
                  {planner.inProgress ?? 0}
                </p>
              </div>

              <div className="border border-line rounded-lg p-3">
                <p className="text-xs text-paper-dim">
                  Remaining
                </p>

                <p className="text-xl font-display mt-1">
                  {planner.remaining ?? 0}
                </p>
              </div>
            </div>
          </div>

          {/* NEXT ACTION */}
          {planner.nextAction && (
            <div className="border border-progress rounded-xl p-4 mb-4">
              <p className="font-mono text-[10px] uppercase tracking-widest text-progress">
                Next best action
              </p>

              <p className="text-sm leading-6 mt-2">
                {planner.nextAction}
              </p>
            </div>
          )}

          {/* PRIORITIES */}
          {planner.priorities?.length > 0 && (
            <div className="mb-4">
              <p className="font-mono text-[10px] uppercase tracking-widest text-progress mb-3">
                Top priorities
              </p>

              <div className="space-y-2">
                {planner.priorities.map(
                  (item, index) => (
                    <div
                      key={`${item.task}-${index}`}
                      className="border border-line rounded-xl p-3"
                    >
                      <p className="text-sm font-medium">
                        {index + 1}. {item.task}
                      </p>

                      <p className="text-xs text-paper-dim mt-1 leading-5">
                        {item.reason}
                      </p>
                    </div>
                  )
                )}
              </div>
            </div>
          )}

          {/* RISKS */}
          {planner.risks?.length > 0 && (
            <div className="mb-4">
              <p className="font-mono text-[10px] uppercase tracking-widest text-blocked mb-3">
                Risks & blockers
              </p>

              <div className="space-y-2">
                {planner.risks.map(
                  (item, index) => (
                    <div
                      key={`${item.risk}-${index}`}
                      className="border border-line rounded-xl p-3"
                    >
                      <p className="text-sm font-medium">
                        ⚠️ {item.risk}
                      </p>

                      <p className="text-xs text-paper-dim mt-1">
                        <span className="font-medium">
                          Impact:
                        </span>{" "}
                        {item.impact}
                      </p>

                      <p className="text-xs text-paper-dim mt-1">
                        <span className="font-medium">
                          Mitigation:
                        </span>{" "}
                        {item.mitigation}
                      </p>
                    </div>
                  )
                )}
              </div>
            </div>
          )}

          {/* EXECUTION PLAN */}
          {planner.plan?.length > 0 && (
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-progress mb-3">
                Execution plan
              </p>

              <div className="space-y-3">
                {planner.plan.map(
                  (phase, index) => (
                    <div
                      key={`${phase.phase}-${index}`}
                      className="border border-line rounded-xl p-4"
                    >
                      <p className="text-sm font-medium">
                        {index + 1}. {phase.phase}
                      </p>

                      <div className="mt-2 space-y-1">
                        {phase.actions?.map(
                          (action, actionIndex) => (
                            <p
                              key={`${action}-${actionIndex}`}
                              className="text-xs text-paper-dim leading-5"
                            >
                              • {action}
                            </p>
                          )
                        )}
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* DEADLINE PLAN */}
      {deadlinePlan && (
        <div className="mt-5 border-t border-line pt-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <p className="font-mono text-[10px] uppercase tracking-widest text-progress">
                  AI Execution Schedule
                </p>
                <GeminiIcon size={16} />
              </div>

              <p className="text-sm text-paper-dim mt-1">
                Gemini created a schedule using
                your current project state.
              </p>
            </div>

            <span
              className={`text-xs font-mono px-2.5 py-1 rounded-full border ${
                deadlinePlan.feasibility ===
                "Unrealistic"
                  ? "border-blocked text-blocked"
                  : deadlinePlan.feasibility ===
                    "Tight"
                  ? "border-yellow-500 text-yellow-500"
                  : "border-progress text-progress"
              }`}
            >
              {deadlinePlan.feasibility ||
                "Unknown"}
            </span>
          </div>

          {/* DEADLINE SUMMARY */}
          {deadlinePlan.summary && (
            <div className="border border-line rounded-xl p-4 mb-4">
              <p className="font-mono text-[10px] uppercase tracking-widest text-paper-dim">
                Deadline assessment
              </p>

              <p className="text-sm leading-6 mt-2">
                {deadlinePlan.summary}
              </p>
            </div>
          )}

          {/* DAY BY DAY PLAN */}
          {deadlinePlan.days?.length > 0 && (
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-progress mb-3">
                Day-by-day plan
              </p>

              <div className="space-y-3">
                {deadlinePlan.days.map(
                  (day, index) => (
                    <div
                      key={`${day.day}-${index}`}
                      className="border border-line rounded-xl p-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mb-2">
                        <span className="font-mono text-xs text-progress">
                          {day.day}
                        </span>

                        <span className="text-sm font-medium">
                          {day.focus}
                        </span>
                      </div>

                      <div className="space-y-1">
                        {day.tasks?.map(
                          (task, taskIndex) => (
                            <p
                              key={`${task}-${taskIndex}`}
                              className="text-xs text-paper-dim leading-5"
                            >
                              • {task}
                            </p>
                          )
                        )}
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          )}

          {/* DEADLINE RISKS */}
          {deadlinePlan.risks?.length > 0 && (
            <div className="mt-5">
              <p className="font-mono text-[10px] uppercase tracking-widest text-blocked mb-3">
                Deadline risks
              </p>

              <div className="border border-line rounded-xl p-4 space-y-2">
                {deadlinePlan.risks.map(
                  (risk, index) => (
                    <p
                      key={`${risk}-${index}`}
                      className="text-xs text-paper-dim leading-5"
                    >
                      ⚠️ {risk}
                    </p>
                  )
                )}
              </div>
            </div>
          )}

          {/* BUFFER */}
          {deadlinePlan.buffer && (
            <div className="mt-4 border border-line rounded-xl p-4">
              <p className="font-mono text-[10px] uppercase tracking-widest text-paper-dim">
                Safety buffer
              </p>

              <p className="text-sm leading-6 mt-2">
                {deadlinePlan.buffer}
              </p>
            </div>
          )}

          {/* FINAL ACTION */}
          {deadlinePlan.finalAction && (
            <div className="mt-4 border border-progress rounded-xl p-4">
              <p className="font-mono text-[10px] uppercase tracking-widest text-progress">
                Final action
              </p>

              <p className="text-sm leading-6 mt-2">
                {deadlinePlan.finalAction}
              </p>
            </div>
          )}
        </div>
      )}
            {/* AI RISK ANALYSIS */}
      {riskAnalysis && (
        <div className="mt-5 border-t border-line pt-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <p className="font-mono text-[10px] uppercase tracking-widest text-blocked">
                  AI Risk Analysis
                </p>
                <GeminiIcon size={16} />
              </div>

              <p className="text-sm text-paper-dim mt-1">
                Gemini analyzed the current tasks for possible project risks.
              </p>
            </div>

            <span
              className={`text-xs font-mono px-2.5 py-1 rounded-full border ${
                riskAnalysis.overallRisk === "High"
                  ? "border-blocked text-blocked"
                  : riskAnalysis.overallRisk === "Medium"
                  ? "border-yellow-500 text-yellow-500"
                  : "border-progress text-progress"
              }`}
            >
              {riskAnalysis.overallRisk} Risk
            </span>
          </div>

          <div className="border border-line rounded-xl p-4 mb-4">
            <p className="font-mono text-[10px] uppercase tracking-widest text-paper-dim">
              Risk summary
            </p>

            <p className="text-sm leading-6 mt-2">
              {riskAnalysis.summary ||
                "No risk summary available."}
            </p>
          </div>

          {riskAnalysis.risks?.length > 0 ? (
            <div className="space-y-3">
              {riskAnalysis.risks.map((risk, index) => (
                <div
                  key={`${risk.task}-${index}`}
                  className="border border-line rounded-xl p-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                    <p className="text-sm font-medium">
                      ⚠️ {risk.task}
                    </p>

                    <span
                      className={`shrink-0 text-[10px] font-mono uppercase px-2 py-1 rounded-full border ${
                        risk.level === "High"
                          ? "border-blocked text-blocked"
                          : risk.level === "Medium"
                          ? "border-yellow-500 text-yellow-500"
                          : "border-progress text-progress"
                      }`}
                    >
                      {risk.level}
                    </span>
                  </div>

                  <p className="text-xs text-paper-dim mt-2 leading-5">
                    <span className="font-medium text-paper">
                      Why:
                    </span>{" "}
                    {risk.reason}
                  </p>

                  <p className="text-xs text-paper-dim mt-2 leading-5">
                    <span className="font-medium text-paper">
                      Recommended action:
                    </span>{" "}
                    {risk.action}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="border border-progress rounded-xl p-4">
              <p className="text-sm text-progress">
                ✓ No significant task risks were detected.
              </p>
            </div>
          )}
        </div>
      )}
      {/* AI TASK PLAN */}
      {suggestedTasks.length > 0 && (
        <div className="mt-5 border-t border-line pt-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-progress">
                AI Task Plan
              </p>

              <p className="text-sm text-paper-dim mt-1">
                Gemini suggests these tasks for your project.
              </p>
            </div>

            {canManage && (
              <button
                onClick={createSuggestedTasks}
                disabled={
                  creatingTasks ||
                  creatingTaskIndex !== null ||
                  createdTaskIndexes.length === suggestedTasks.length
                }
                className="green-button rounded-lg px-4 py-2 text-xs font-medium disabled:opacity-50 whitespace-nowrap"
              >
                {creatingTasks
                  ? "Creating..."
                  : createdTaskIndexes.length > 0
                    ? `Create remaining (${suggestedTasks.length - createdTaskIndexes.length})`
                    : `Create all (${suggestedTasks.length})`}
              </button>
            )}
          </div>

          <div className="space-y-2">
            {suggestedTasks.map((task, index) => {
              const isCreated = createdTaskIndexes.includes(index);
              const isCreating = creatingTaskIndex === index;

              return (
                <div
                  key={`${task.title}-${index}`}
                  className="border border-line rounded-xl p-3"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        {index + 1}. {task.title}
                      </p>

                      {task.description && (
                        <p className="text-xs text-paper-dim mt-1 leading-5">
                          {task.description}
                        </p>
                      )}
                    </div>

                    {canManage && (
                      <button
                        type="button"
                        onClick={() => createSuggestedTask(task, index)}
                        disabled={
                          creatingTasks ||
                          creatingTaskIndex !== null ||
                          isCreated
                        }
                        className={`shrink-0 rounded-lg px-3 py-2 text-xs font-medium disabled:opacity-60 ${
                          isCreated
                            ? "bg-green-100 text-green-700"
                            : "bg-progress text-ink hover:opacity-90"
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
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* NORMAL AI RESPONSE */}
      {response &&
        suggestedTasks.length === 0 &&
        !planner &&
        !deadlinePlan && (
          <div className="mt-5 border-t border-line pt-5">
            <div className="flex items-center gap-2 mb-2">
              <p className="font-mono text-[10px] uppercase tracking-widest text-paper-dim">
                Gemini
              </p>
              <GeminiIcon size={16} />
            </div>

            <div className="text-sm leading-6 whitespace-pre-wrap text-paper">
              {response}
            </div>
          </div>
        )}
    </section>
  );
}