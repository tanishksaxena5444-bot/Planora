import { useEffect, useMemo, useRef, useState } from "react";
import { askAI, isAbortError } from "../lib/ai";

export default function DashboardAICopilot({ projects = [] }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(null);
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  const abortRef = useRef(null);
  useEffect(() => () => abortRef.current?.abort(), []);

  const stats = useMemo(() => {
    const total = projects.reduce((n, p) => n + (p.totalTasks ?? 0), 0);
    const done = projects.reduce((n, p) => n + (p.completedTasks ?? 0), 0);
    const overdue = projects.reduce((n, p) => n + (p.overdueTasks ?? 0), 0);
    return {
      total,
      done,
      overdue,
      open: Math.max(0, total - done),
      pct: total ? Math.round((done / total) * 100) : 0,
    };
  }, [projects]);

  async function runAI(key) {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setActive(key);
    setResult("");
    setLoading(true);

    const projectData = projects.map((p) => ({
      name: p.name,
      totalTasks: p.totalTasks || 0,
      completedTasks: p.completedTasks || 0,
      overdueTasks: p.overdueTasks || 0,
    }));

    const prompts = {
      priority: `You are Planora Copilot. Given this project portfolio JSON, identify the top 3 things the user should do next. Rank them by impact and urgency. Be concise.\n${JSON.stringify(projectData)}`,
      risk: `You are Planora Copilot. Analyze this project portfolio for deadline, execution, or delivery risks. Return 3 concise risk signals and one action for each. Do not invent facts.\n${JSON.stringify(projectData)}`,
      workload: `You are Planora Copilot. Analyze this project portfolio and suggest a practical work plan for today. Group similar work and suggest what to defer. Keep it concise.\n${JSON.stringify(projectData)}`,
    };

    try {
      const text = await askAI(
        prompts[key],
        "Only use the supplied project data. Do not claim access to information not provided.",
        { signal: controller.signal }
      );
      if (!controller.signal.aborted) setResult(text);
    } catch (e) {
      if (isAbortError(e)) return;
      setResult(`AI unavailable: ${e.message}`);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className="copilot-launcher"
        onClick={() => setOpen(true)}
        aria-label="Open Project Copilot"
      >
        <span className="copilot-launcher-icon">✦</span>
        <span>
          <small>AI PROJECT COPILOT</small>
          <strong>Project Copilot</strong>
        </span>
        <span className="copilot-launcher-arrow">←</span>
      </button>

      {open && (
        <div
          className="copilot-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <aside
            className="copilot-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="copilot-title"
          >
            <div className="copilot-drawer-header">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-flex w-8 h-8 rounded-lg bg-progress/15 border border-progress/30 items-center justify-center text-progress">
                    ✦
                  </span>
                  <p className="section-kicker text-progress">AI Project Copilot</p>
                  <span className="ai-online-dot" />
                </div>
                <h2 id="copilot-title" className="font-display text-3xl">
                  Your project teammate
                </h2>
                <p className="text-sm text-paper-dim mt-1">
                  Powered by Gemini · {projects.length} project{projects.length === 1 ? "" : "s"}
                </p>
              </div>

              <button
                type="button"
                className="copilot-close"
                onClick={() => setOpen(false)}
                aria-label="Close Project Copilot"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-6">
              <div className="ai-stat"><span>Open work</span><strong>{stats.open}</strong></div>
              <div className="ai-stat"><span>Completion</span><strong>{stats.pct}%</strong></div>
              <div className="ai-stat"><span>Risk flags</span><strong className={stats.overdue ? "text-blocked" : "text-done"}>{stats.overdue}</strong></div>
            </div>

            <div className="copilot-action-grid mt-6">
              {[
                ["🎯", "Prioritize work", "What should I do first?", "priority"],
                ["⚠", "Find risks", "What needs attention?", "risk"],
                ["◈", "Plan my workload", "How should I organize today?", "workload"],
              ].map(([icon, title, subtitle, key]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => runAI(key)}
                  className={`ai-action copilot-action ${active === key ? "is-selected" : ""}`}
                >
                  <span className="text-progress text-lg">{icon}</span>
                  <p className="font-medium text-sm mt-2">{title}</p>
                  <p className="text-xs text-paper-dim mt-1">{subtitle}</p>
                </button>
              ))}
            </div>

            <div className="copilot-divider" />

            <div>
              <p className="section-kicker mb-2">Ask Gemini</p>
              <div className="flex gap-2">
                <input
                  id="dashboard-copilot-input"
                  className="app-input flex-1"
                  placeholder="Ask anything about your workspace..."
                  onKeyDown={async (event) => {
                    if (event.key !== "Enter" || !event.currentTarget.value.trim()) return;

                    abortRef.current?.abort();
                    const controller = new AbortController();
                    abortRef.current = controller;

                    setActive("chat");
                    setLoading(true);
                    setResult("");
                    try {
                      const value = event.currentTarget.value.trim();
                      const text = await askAI(
                        value,
                        "Only use the supplied workspace data when relevant. Be concise and practical.",
                        { signal: controller.signal }
                      );
                      if (!controller.signal.aborted) {
                        setResult(text);
                        event.currentTarget.value = "";
                      }
                    } catch (e) {
                      if (isAbortError(e)) return;
                      setResult(`AI unavailable: ${e.message}`);
                    } finally {
                      if (!controller.signal.aborted) setLoading(false);
                    }
                  }}
                />
                <button
                  type="button"
                  className="btn-primary shrink-0"
                  onClick={() => document.getElementById("dashboard-copilot-input")?.focus()}
                >
                  Ask
                </button>
              </div>
              <p className="text-[11px] text-paper-dim mt-2">Press Enter to send your question.</p>
            </div>

            {(active || loading) && (
              <div className="border border-progress/25 bg-progress/5 rounded-xl p-4 mt-5 animate-in">
                <p className="section-kicker text-progress mb-2">Gemini insight</p>
                {loading ? (
                  <p className="text-sm text-paper-dim">Analyzing your workspace…</p>
                ) : (
                  <p className="text-sm leading-6 whitespace-pre-wrap">{result}</p>
                )}
              </div>
            )}
          </aside>
        </div>
      )}
    </>
  );
}
