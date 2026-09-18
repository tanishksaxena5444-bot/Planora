import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import DashboardAICopilot from "../components/DashboardAICopilot";
export default function Dashboard({ projects = [] }) {
  const [activeMetric, setActiveMetric] = useState(null);
  const [activityTasks, setActivityTasks] = useState([]);
  const [activityLoading, setActivityLoading] = useState(false);

  const stats = useMemo(() => {
    const total = projects.reduce((n, p) => n + (p.totalTasks ?? 0), 0);
    const done = projects.reduce((n, p) => n + (p.completedTasks ?? 0), 0);
    const overdue = projects.reduce((n, p) => n + (p.overdueTasks ?? 0), 0);
    return {
      total,
      done,
      open: Math.max(0, total - done),
      overdue,
      pct: total ? Math.round((done / total) * 100) : 0,
    };
  }, [projects]);

  // Recent-activity feed needs one task fetch per project. That's fine at a
  // handful of projects but doesn't scale — cap the fan-out here, and move
  // this to a dedicated backend /activity endpoint if workspaces regularly
  // exceed this size.
  const ACTIVITY_PROJECT_LIMIT = 15;

  useEffect(() => {
    const controller = new AbortController();
    if (!projects.length) {
      setActivityTasks([]);
      return;
    }
    setActivityLoading(true);
    const targets = projects.slice(0, ACTIVITY_PROJECT_LIMIT);
    Promise.allSettled(
      targets.map(async (p) => {
        const res = await api.getTasks(p._id, { signal: controller.signal });
        return (Array.isArray(res.data) ? res.data : []).map((t) => ({ ...t, __project: p }));
      })
    )
      .then((results) => {
        if (controller.signal.aborted) return;
        setActivityTasks(
          results
            .flatMap((r) => (r.status === "fulfilled" ? r.value : []))
            .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0))
            .slice(0, 12)
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setActivityLoading(false);
      });
    return () => controller.abort();
  }, [projects]);

  const health = useMemo(() => {
    if (!projects.length) return 0;
    const scores = projects.map((p) => {
      const total = p.totalTasks ?? 0, done = p.completedTasks ?? 0, overdue = p.overdueTasks ?? 0;
      const completion = total ? (done / total) * 70 : 35;
      const riskPenalty = Math.min(30, overdue * 10);
      return Math.max(0, Math.min(100, Math.round(completion + 30 - riskPenalty)));
    });
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  }, [projects]);

  return (
    <div className="p-10 max-w-7xl mobile-page-padding">
      <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-5 mb-8">
        <div>
          <p className="section-kicker mb-2">Project command center</p>
          <h1 className="font-display text-4xl md:text-5xl tracking-tight">
            Welcome back. <span className="text-progress">✦</span>
          </h1>
          <p className="text-paper-dim mt-2 max-w-2xl">
            A focused view of your projects, delivery health and the work that deserves attention next.
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/analytics" className="btn-secondary">Analytics</Link>
          <Link to="/projects/new" className="btn-primary">+ New project</Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-8">
        <Metric icon="◫" label="Projects" value={projects.length} note="active workspace" onClick={() => setActiveMetric("projects")} />
        <Metric icon="✓" label="Tasks" value={stats.total} note={`${stats.open} open`} onClick={() => setActiveMetric("tasks")} />
        <Metric icon="◔" label="Completion" value={`${stats.pct}%`} note={stats.total ? `${stats.done} delivered` : "no tasks yet"} onClick={() => setActiveMetric("completion")} />
        <Metric icon="!" label="Attention" value={stats.overdue} note={stats.overdue ? "overdue tasks" : "all clear"} danger={stats.overdue > 0} onClick={() => setActiveMetric("attention")} />
        <Metric icon="♥" label="Health" value={`${health}/100`} note={health >= 75 ? "healthy workspace" : health >= 50 ? "watch workload" : "needs attention"} onClick={() => setActiveMetric("health")} />
      </div>

      <DashboardAICopilot projects={projects} />
      <div className="mt-4">

      </div>
      <div className="flex items-end justify-between gap-4 mb-4">
        <div><p className="section-kicker">Workspace</p><h2 className="font-display text-2xl">Your projects</h2></div>
        <span className="font-mono text-[10px] uppercase tracking-widest text-paper-dim">{projects.length} total</span>
      </div>

      {projects.length === 0 ? <EmptyState /> : <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">{projects.map((p, i) => <ProjectCard key={p._id} project={p} index={i} />)}</div>}

      {projects.length > 0 && <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-4 mt-8 items-start w-full">
        <section className="glass-panel rounded-2xl p-5 h-[178px] overflow-hidden self-start">
          <div className="flex items-end justify-between gap-3 mb-4"><div><p className="section-kicker">Workspace health</p><h2 className="font-display text-2xl">Delivery health</h2></div><span className={`font-mono text-xl ${health >= 75 ? "text-done" : health >= 50 ? "text-progress" : "text-blocked"}`}>{health}/100</span></div>
          <div className="h-3 rounded-full bg-line overflow-hidden"><div className="h-full rounded-full bg-progress" style={{ width: `${health}%` }} /></div>
          <p className="text-xs text-paper-dim mt-3">Calculated from completion and overdue-task pressure across your workspace.</p>
        </section>
        <section className="glass-panel rounded-2xl p-5 h-[178px] overflow-hidden self-start">
          <div className="flex items-end justify-between gap-3 mb-4"><div><p className="section-kicker">Live activity</p><h2 className="font-display text-2xl">Recent updates</h2></div><span className="text-[10px] text-paper-dim">{activityLoading ? "Updating…" : "Latest task activity"}</span></div>
          <div className="space-y-2">{activityTasks.slice(0, 1).map((t) => <Link key={t._id} to={`/projects/${t.__project._id}`} className="dashboard-detail-row block"><div className="flex justify-between gap-3"><div className="min-w-0"><p className="text-sm truncate">{t.title}</p><p className="text-[10px] text-paper-dim">{t.__project.name} · {t.status?.replaceAll("_", " ")}</p></div><span className="text-progress">→</span></div></Link>)}{!activityTasks.length && !activityLoading && <p className="text-sm text-paper-dim">No activity yet.</p>}</div>
        </section>
      </div>}

      {projects.length > 0 && <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-8 items-start w-full">
        <Quick title="Create a task" text="Break your next milestone into actionable work." to={projects[0] ? `/projects/${projects[0]._id}` : "/"} />
        <Quick title="Review analytics" text="See where your delivery momentum is strongest." to="/analytics" />
        <Quick title="Open calendar" text="Plan the month and keep deadlines visible." to="/calendar" />
      </div>}

      {activeMetric && <MetricModal type={activeMetric} projects={projects} stats={stats} onClose={() => setActiveMetric(null)} />}
    </div>
  );
}

function Metric({ icon, label, value, note, danger, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="metric-card metric-card-interactive text-left w-full"
      aria-label={`Open ${label} details`}
    >
      <div className="flex items-center justify-between">
        <span className="w-8 h-8 rounded-lg bg-progress/10 border border-progress/20 text-progress flex items-center justify-center text-sm">{icon}</span>
        <span className="section-kicker">{label}</span>
      </div>
      <p className="font-display text-3xl mt-3">{value}</p>
      <p className={`text-xs mt-1 ${danger ? "text-blocked" : "text-paper-dim"}`}>{note}</p>
      <div className="metric-card-hint">Tap to view details <span>→</span></div>
    </button>
  );
}

function MetricModal({ type, projects, stats, onClose }) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);
  const titles = { projects: "Projects", tasks: "All Tasks", completion: "Completion Overview", attention: "Alerts & Attention", health: "Project Health" };
  return (
    <div className="dashboard-modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <section className="dashboard-modal" role="dialog" aria-modal="true" aria-labelledby="metric-modal-title">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <p className="section-kicker">Home overview</p>
            <h2 id="metric-modal-title" className="font-display text-2xl">{titles[type]}</h2>
          </div>
          <button type="button" className="dashboard-modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        {type === "projects" && <ProjectsPanel projects={projects} />}
        {type === "tasks" && <TasksPanel projects={projects} stats={stats} />}
        {type === "completion" && <CompletionPanel projects={projects} stats={stats} />}
        {type === "attention" && <AttentionPanel projects={projects} stats={stats} />}
        {type === "health" && <HealthPanel projects={projects} />}
      </section>
    </div>
  );
}

function ProjectsPanel({ projects }) {
  return <div className="space-y-3">
    {projects.length ? projects.map((p) => <Link key={p._id} to={`/projects/${p._id}`} className="dashboard-detail-row block">
      <div className="flex items-center justify-between gap-3"><div className="min-w-0"><p className="font-medium truncate">{p.name}</p><p className="text-xs text-paper-dim mt-1">{p.totalTasks ?? 0} tasks · {p.completedTasks ?? 0} completed</p></div><span className="text-progress">→</span></div>
    </Link>) : <EmptyPanel text="No projects yet." to="/projects/new" action="Create a project" />}
    {projects.length > 0 && <Link to="/projects" className="dashboard-modal-action">View all projects →</Link>}
  </div>;
}

function TasksPanel({ projects, stats }) {
  return <div>
    <div className="grid grid-cols-2 gap-3 mb-4">
      <MiniStat label="Total" value={stats.total} />
      <MiniStat label="Open" value={stats.open} />
    </div>
    <div className="dashboard-detail-list">
      {projects.map((p) => <Link key={p._id} to={`/projects/${p._id}`} className="dashboard-detail-row block">
        <div className="flex justify-between gap-3"><span className="truncate">{p.name}</span><span className="font-mono text-xs text-paper-dim">{Math.max(0, (p.totalTasks ?? 0) - (p.completedTasks ?? 0))} open</span></div>
      </Link>)}
      {!projects.length && <p className="text-sm text-paper-dim">No tasks yet.</p>}
    </div>
    <Link to="/projects" className="dashboard-modal-action mt-4">Open project tasks →</Link>
  </div>;
}

function CompletionPanel({ projects, stats }) {
  return <div>
    <div className="completion-big"><span>{stats.pct}%</span><p>{stats.done} of {stats.total} tasks completed</p></div>
    <div className="space-y-3 mt-5">
      {projects.map((p) => {
        const total = p.totalTasks ?? 0;
        const done = p.completedTasks ?? 0;
        const pct = total ? Math.round(done / total * 100) : 0;
        return <Link key={p._id} to={`/projects/${p._id}`} className="dashboard-detail-row block">
          <div className="flex justify-between gap-3 mb-2"><span className="truncate">{p.name}</span><span className="font-mono text-xs text-paper-dim">{pct}%</span></div>
          <div className="h-2 rounded-full bg-line overflow-hidden"><div className="h-full rounded-full bg-progress" style={{ width: `${pct}%` }} /></div>
        </Link>;
      })}
    </div>
    <Link to="/analytics" className="dashboard-modal-action mt-4">Open full analytics →</Link>
  </div>;
}

function AttentionPanel({ projects, stats }) {
  const atRisk = projects.filter((p) => (p.overdueTasks ?? 0) > 0);
  if (!stats.overdue) return <div className="dashboard-clear-state"><span>✓</span><h3>All clear!</h3><p>No overdue tasks or attention items are currently reported.</p><Link to="/analytics" className="dashboard-modal-action">Review analytics →</Link></div>;
  return <div className="space-y-3">
    {atRisk.map((p) => <Link key={p._id} to={`/projects/${p._id}`} className="dashboard-detail-row dashboard-risk-row block">
      <div><p className="font-medium">{p.name}</p><p className="text-xs text-blocked mt-1">{p.overdueTasks} overdue task{p.overdueTasks === 1 ? "" : "s"}</p></div><span className="text-blocked">→</span>
    </Link>)}
    <Link to="/analytics" className="dashboard-modal-action">Open risk analysis →</Link>
  </div>;
}

function HealthPanel({ projects }) {
  return <div className="space-y-3">{projects.map((p) => {
    const total = p.totalTasks ?? 0, done = p.completedTasks ?? 0, overdue = p.overdueTasks ?? 0;
    const score = Math.max(0, Math.min(100, Math.round((total ? (done / total) * 70 : 35) + 30 - Math.min(30, overdue * 10))));
    const label = score >= 75 ? "Healthy" : score >= 50 ? "Watch" : "At risk";
    return <Link key={p._id} to={`/projects/${p._id}`} className="dashboard-detail-row block"><div className="flex justify-between gap-3 mb-2"><span className="truncate">{p.name}</span><span className="font-mono text-xs">{score}/100 · {label}</span></div><div className="h-2 bg-line rounded-full overflow-hidden"><div className="h-full bg-progress rounded-full" style={{ width: `${score}%` }} /></div></Link>;
  })}</div>;
}
function MiniStat({ label, value }) { return <div className="metric-mini"><p className="section-kicker">{label}</p><p className="font-display text-2xl mt-1">{value}</p></div>; }
function EmptyPanel({ text, to, action }) { return <div className="text-center py-8"><p className="text-sm text-paper-dim mb-4">{text}</p><Link to={to} className="dashboard-modal-action">{action} →</Link></div>; }

function ProjectCard({ project: p, index = 0 }) {
  const total = p.totalTasks ?? 0, done = p.completedTasks ?? 0, pct = total ? Math.round(done / total * 100) : 0;
  const health = p.overdueTasks > 0 ? "At risk" : pct >= 70 ? "Healthy" : "In progress";
  const healthClass = p.overdueTasks > 0 ? "text-blocked bg-blocked/10 border-blocked/25" : "text-done bg-done/10 border-done/25";
  return <Link to={`/projects/${p._id}`} className="card-hover project-card block relative border border-line bg-panel rounded-2xl p-5" style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}>
    <div className="flex items-start justify-between gap-3"><div className="flex items-center gap-2 min-w-0"><span className="w-9 h-9 shrink-0 rounded-lg bg-progress/10 border border-progress/20 flex items-center justify-center text-progress">✦</span><p className="font-display text-xl truncate">{p.name}</p></div><span className={`status-health border ${healthClass}`}>{health}</span></div>
    <p className="text-sm text-paper-dim line-clamp-2 my-4 min-h-10">{p.description || "No description yet. Add context to keep your team aligned."}</p>
    <div className="flex justify-between font-mono text-[10px] uppercase tracking-widest text-paper-dim mb-1.5"><span>{done}/{total} complete</span><span>{pct}%</span></div>
    <div className="h-2 rounded-full bg-line overflow-hidden"><div className="h-full rounded-full bg-progress" style={{ width: `${pct}%` }} /></div>
    <div className="flex items-center justify-between mt-4"><span className="font-mono text-[10px] uppercase tracking-widest text-paper-dim">{p.members ?? 1} member{(p.members ?? 1) === 1 ? "" : "s"}</span><span className="project-arrow">→</span></div>
  </Link>;
}
function Quick({ title, text, to }) { return <Link to={to} className="quick-action block card-hover"><p className="text-sm font-medium">{title} <span className="text-progress">→</span></p><p className="text-xs text-paper-dim mt-1">{text}</p></Link>; }
function EmptyState() { return <div className="glass-panel rounded-2xl p-14 text-center"><div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-progress/10 border border-progress/25 flex items-center justify-center text-progress text-2xl">✦</div><p className="font-display text-2xl">Build your first project</p><p className="text-paper-dim mb-6 mt-1 text-sm">Create a workspace and let ProjectPilot help you turn ideas into delivery.</p><Link to="/projects/new" className="btn-primary">Create project →</Link></div>; }