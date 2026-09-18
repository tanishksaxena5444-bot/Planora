import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import ActivityStatistics from "../components/ActivityStatistics";
function isDone(task) {
  return task?.status === "done" || task?.status === "completed" || task?.completed === true;
}

function isOverdue(task) {
  if (!task?.dueDate || isDone(task)) return false;
  const due = new Date(task.dueDate);
  if (Number.isNaN(due.getTime())) return false;
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return due < today;
}

function formatDate(value) {
  if (!value) return "No deadline";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No deadline";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function Analytics({ projects = [] }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!projects.length) {
        setTasks([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      const results = await Promise.allSettled(
        projects.map(async (project) => {
          const response = await api.getTasks(project._id);
          const list = Array.isArray(response?.data) ? response.data : [];
          return list.map((task) => ({ ...task, __project: project }));
        }),
      );

      if (cancelled) return;

      setTasks(
        results.flatMap((result) =>
          result.status === "fulfilled" ? result.value : [],
        ),
      );
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [projects]);

  const stats = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter(isDone).length;
    const overdue = tasks.filter(isOverdue).length;
    const open = total - done;
    const completion = total ? Math.round((done / total) * 100) : 0;

    const priority = tasks.reduce(
      (acc, task) => {
        const key = String(task.priority || "medium").toLowerCase();
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      },
      { low: 0, medium: 0, high: 0, urgent: 0 },
    );

    return { total, done, open, overdue, completion, priority };
  }, [tasks]);

  const projectStats = useMemo(
    () =>
      projects
        .map((project) => {
          const projectTasks = tasks.filter((task) => task.__project?._id === project._id);
          const total = projectTasks.length;
          const done = projectTasks.filter(isDone).length;
          const overdue = projectTasks.filter(isOverdue).length;
          const completion = total ? Math.round((done / total) * 100) : 0;
          return { project, total, done, overdue, completion };
        })
        .sort((a, b) => b.completion - a.completion),
    [projects, tasks],
  );

  const attentionTasks = useMemo(
    () =>
      tasks
        .filter((task) => isOverdue(task) || String(task.priority).toLowerCase() === "urgent")
        .sort((a, b) => {
          const overdueDiff = Number(isOverdue(b)) - Number(isOverdue(a));
          if (overdueDiff) return overdueDiff;
          return new Date(a.dueDate || 0) - new Date(b.dueDate || 0);
        })
        .slice(0, 8),
    [tasks],
  );

  return (
    <div className="p-10 max-w-7xl mobile-page-padding">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
        <div>
          <p className="section-kicker mb-1">Workspace intelligence</p>
          <h1 className="font-display text-4xl md:text-5xl tracking-tight">Analytics</h1>
          <p className="text-paper-dim mt-2 max-w-2xl">
            Understand delivery progress, workload, deadlines and the projects that need attention.
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/" className="btn-secondary">← Dashboard</Link>
          <Link to="/calendar" className="btn-primary">Open calendar →</Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        <StatCard label="Total tasks" value={stats.total} note={`${projects.length} project${projects.length === 1 ? "" : "s"}`} />
        <StatCard label="Completed" value={`${stats.completion}%`} note={`${stats.done} delivered`} />
        <StatCard label="Open work" value={stats.open} note="still in progress" />
        <StatCard label="Overdue" value={stats.overdue} note={stats.overdue ? "needs attention" : "all clear"} danger={stats.overdue > 0} />
      </div>

      <ActivityStatistics />

      <div className="grid xl:grid-cols-[1.15fr_.85fr] gap-4">
        <section className="glass-panel rounded-2xl p-5">
          <div className="flex items-end justify-between gap-3 mb-5">
            <div>
              <p className="section-kicker">Delivery performance</p>
              <h2 className="font-display text-2xl">Project health</h2>
            </div>
            {loading && <span className="text-xs text-paper-dim">Updating…</span>}
          </div>

          <div className="space-y-3">
            {projectStats.map(({ project, total, done, overdue, completion }) => (
              <Link key={project._id} to={`/projects/${project._id}`} className="dashboard-detail-row block">
                <div className="flex justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{project.name}</p>
                    <p className="text-xs text-paper-dim mt-1">
                      {done}/{total} complete{overdue ? ` · ${overdue} overdue` : ""}
                    </p>
                  </div>
                  <span className={`font-mono text-xs ${overdue ? "text-blocked" : "text-progress"}`}>
                    {completion}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-line overflow-hidden">
                  <div className="h-full rounded-full bg-progress transition-all duration-500" style={{ width: `${completion}%` }} />
                </div>
              </Link>
            ))}
            {!projectStats.length && !loading && (
              <p className="text-sm text-paper-dim">Create a project to start seeing analytics.</p>
            )}
          </div>
        </section>

        <section className="glass-panel rounded-2xl p-5">
          <p className="section-kicker">Workload mix</p>
          <h2 className="font-display text-2xl mb-5">Task priority</h2>
          <div className="space-y-4">
            <PriorityRow label="High" value={stats.priority.high} total={stats.total} />
            <PriorityRow label="Medium" value={stats.priority.medium} total={stats.total} />
            <PriorityRow label="Low" value={stats.priority.low} total={stats.total} />
          </div>
          <div className="border-t border-line mt-6 pt-5">
            <p className="text-xs text-paper-dim">
              Use the Calendar to turn these workload signals into a concrete schedule.
            </p>
            <Link to="/calendar" className="dashboard-modal-action inline-block mt-3">Plan deadlines →</Link>
          </div>
        </section>
      </div>

      <section className="glass-panel rounded-2xl p-5 mt-4">
        <div className="flex items-end justify-between gap-3 mb-4">
          <div>
            <p className="section-kicker">Attention queue</p>
            <h2 className="font-display text-2xl">Risks to review</h2>
          </div>
          <span className="font-mono text-[10px] uppercase tracking-widest text-paper-dim">
            {attentionTasks.length} shown
          </span>
        </div>

        {attentionTasks.length ? (
          <div className="grid md:grid-cols-2 gap-2">
            {attentionTasks.map((task) => (
              <Link key={task._id} to={`/projects/${task.__project._id}`} className="dashboard-detail-row block">
                <div className="flex justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm truncate">{task.title}</p>
                    <p className="text-xs text-paper-dim mt-1">
                      {task.__project.name} · {isOverdue(task) ? "Overdue" : "Urgent"} · {formatDate(task.dueDate)}
                    </p>
                  </div>
                  <span className="text-blocked">!</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="dashboard-clear-state">
            <span>✓</span>
            <h3>Nothing urgent</h3>
            <p>No overdue or urgent tasks are currently detected.</p>
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({ label, value, note, danger = false }) {
  return (
    <div className="metric-card">
      <div className="flex items-center justify-between">
        <span className="section-kicker">{label}</span>
        <span className={danger ? "text-blocked" : "text-progress"}>●</span>
      </div>
      <p className="font-display text-3xl mt-3">{value}</p>
      <p className={`text-xs mt-1 ${danger ? "text-blocked" : "text-paper-dim"}`}>{note}</p>
    </div>
  );
}

function PriorityRow({ label, value, total, danger = false }) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between gap-3 text-sm mb-1.5">
        <span>{label}</span>
        <span className={danger ? "text-blocked font-mono text-xs" : "text-paper-dim font-mono text-xs"}>
          {value} · {pct}%
        </span>
      </div>
      <div className="h-2 rounded-full bg-line overflow-hidden">
        <div className={`h-full rounded-full ${danger ? "bg-blocked" : "bg-progress"} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
