import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import TaskRow from "../components/TaskRow";
import ProjectAICopilot from "../components/ProjectAICopilot";
import AITaskPriorities from "../components/AITaskPriorities";
import ProjectShareButton from "../components/ProjectShareButton";
import GeminiIcon from "../components/GeminiIcon";

const TABS = ["Tasks", "Notes", "Members", "Activity"];

const STATUS_GROUPS = [
  { key: "todo", label: "Todo" },
  { key: "in_progress", label: "In progress" },
  { key: "done", label: "Done" },
];

export default function ProjectDetail() {
  const { projectId } = useParams();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const [tab, setTab] = useState("Tasks");
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [notes, setNotes] = useState([]);
  const [members, setMembers] = useState([]);
  const [activities, setActivities] = useState([]);
  const [myRole, setMyRole] = useState("member");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const canManage =
    myRole === "admin" || myRole === "project_admin";

  const canManageMembers = myRole === "admin";

  const loadAll = useCallback(async () => {
    setError("");

    try {
      const [projRes, taskRes, noteRes, memberRes, activityRes] =
        await Promise.all([
          api.getProject(projectId),
          api.getTasks(projectId),
          api.getNotes(projectId),
          api.getMembers(projectId),
          api.getProjectActivity(projectId),
        ]);

      setProject(projRes.data);
      setTasks(taskRes.data);
      setNotes(noteRes.data);
      setMembers(memberRes.data);
      setActivities(Array.isArray(activityRes?.data) ? activityRes.data : []);

      const mine = memberRes.data.find(
        (m) => m.user?._id === user?._id,
      );

      if (mine) {
        setMyRole(mine.role);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [projectId, user]);

  useEffect(() => {
    const requestedTab = searchParams.get("tab");

    if (TABS.includes(requestedTab)) {
      setTab(requestedTab);
    } else {
      setTab("Tasks");
    }
  }, [searchParams, projectId]);

  useEffect(() => {
    setLoading(true);
    loadAll();
  }, [loadAll]);

  if (loading) {
    return (
      <div className="p-10 text-paper-dim">
        Loading project…
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-10">
        <p className="text-blocked">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-10 max-w-5xl">
      <p className="font-mono text-[11px] uppercase tracking-widest text-paper-dim mb-1">
        Project
      </p>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-2">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="font-display text-4xl sm:text-5xl tracking-tight">
              {project?.name}
            </h1>
            <GeminiIcon size={38} />
          </div>

          {project?.description && (
            <p className="text-paper-dim mt-2 max-w-xl">
              {project.description}
            </p>
          )}
        </div>

        {canManage && project && (
          <ProjectShareButton
            projectId={projectId}
          />
        )}
      </div>

      {/* AI PROJECT COPILOT */}
      <ProjectAICopilot
        project={project}
        tasks={tasks}
        notes={notes}
        members={members}
        canManage={canManage}
        onChange={loadAll}
      />

      <AITaskPriorities
        project={project}
        tasks={tasks}
        onChange={loadAll}
        canManage={canManage}
      />

      <div className="flex gap-1 border-b border-line mb-7">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-mono uppercase tracking-wide -mb-px border-b-2 transition-colors ${
              tab === t
                ? "border-progress text-paper"
                : "border-transparent text-paper-dim hover:text-paper"
              }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Tasks" && (
        <TasksTab
          project={project}
          projectId={projectId}
          tasks={tasks}
          onChange={loadAll}
          canManage={canManage}
        />
      )}

      {tab === "Notes" && (
        <NotesTab
          projectId={projectId}
          notes={notes}
          onChange={loadAll}
          canManage={canManage}
        />
      )}

      {tab === "Members" && (
        <MembersTab
          projectId={projectId}
          members={members}
          onChange={loadAll}
          canManage={canManageMembers}
        />
      )}

      {tab === "Activity" && (
        <ActivityTab
          activities={activities}
          loading={false}
        />
      )}
    </div>
  );
}

function ActivityTab({ activities, loading }) {
  function actorName(activity) {
    return (
      activity?.actor?.fullName ||
      activity?.actor?.username ||
      activity?.actor?.email ||
      "Unknown user"
    );
  }

  function formatDate(value) {
    if (!value) return "";
    return new Date(value).toLocaleString(undefined, {
      month: "numeric",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  return (
    <div className="project-activity-feed">
      {loading && (
        <p className="px-1 py-8 text-sm text-paper-dim">Loading activity…</p>
      )}

      {!loading && activities.length === 0 && (
        <div className="rounded-xl border border-line bg-panel/40 px-5 py-8">
          <p className="font-mono text-[11px] uppercase tracking-widest text-paper-dim">
            No activity yet
          </p>
          <p className="mt-2 text-sm text-paper-dim">
            Project actions will appear here as your team works.
          </p>
        </div>
      )}

      {!loading && activities.length > 0 && (
        <div className="relative ml-1">
          <div className="absolute left-[7px] top-3 bottom-3 w-px bg-progress/40" aria-hidden="true" />

          <div className="space-y-1">
            {activities.map((activity) => (
              <article key={activity._id} className="relative flex gap-4 py-3 pl-0">
                <div className="relative z-10 mt-2 flex w-4 shrink-0 justify-center">
                  <span className="h-2 w-2 rounded-full bg-progress shadow-[0_0_0_4px_rgba(191,90,242,0.08)]" />
                </div>

                <div className="min-w-0">
                  <p className="text-[15px] font-medium leading-6 text-paper">
                    {activity.message}
                  </p>
                  <p className="mt-0.5 font-mono text-[10px] text-paper-dim">
                    {actorName(activity)} <span aria-hidden="true">·</span> {formatDate(activity.createdAt)}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TasksTab({
  project,
  projectId,
  tasks,
  onChange,
  canManage,
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");

  async function handleCreate(e) {
    e.preventDefault();
    setError("");

    try {
      await api.createTask(projectId, {
        title,
        description,
      });

      setTitle("");
      setDescription("");
      onChange();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      {canManage && (
        <form
          onSubmit={handleCreate}
          className="flex gap-2 mb-6"
        >
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="New task title…"
            className="green-input flex-1 rounded-lg px-3 py-2.5 text-sm"
          />

          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
            className="green-input flex-1 rounded-lg px-3 py-2.5 text-sm"
          />

          <button
            type="submit"
            className="green-button font-medium rounded-lg px-4 py-2.5 text-sm transition-all shrink-0"
          >
            Add task
          </button>
        </form>
      )}

      {error && (
        <p className="text-sm text-blocked mb-4">
          {error}
        </p>
      )}

      <div className="space-y-6">
        {STATUS_GROUPS.map((group) => {
          const rows = tasks.filter(
            (t) => t.status === group.key,
          );

          if (rows.length === 0) return null;

          return (
            <div key={group.key}>
              <p className="font-mono text-[11px] uppercase tracking-widest text-paper-dim mb-2">
                {group.label} — {rows.length}
              </p>

              <div className="space-y-2">
                {rows.map((t) => (
                  <TaskRow
                    key={t._id}
                    project={project}
                    task={t}
                    onChange={onChange}
                    canManage={canManage}
                  />
                ))}
              </div>
            </div>
          );
        })}

        {tasks.length === 0 && (
          <p className="text-paper-dim text-sm">
            No tasks logged yet.
          </p>
        )}
      </div>

    </div>
  );
}

function NotesTab({
  projectId,
  notes,
  onChange,
  canManage,
}) {
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [noteToDelete, setNoteToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  async function handleCreate(e) {
    e.preventDefault();
    setError("");

    try {
      await api.createNote(projectId, { content });
      setContent("");
      await onChange();
    } catch (err) {
      setError(err.message);
    }
  }

  function requestDelete(note) {
    setError("");
    setNoteToDelete(note);
  }

  async function handleDelete() {
    if (!noteToDelete?._id || deleting) return;

    setError("");
    setDeleting(true);

    try {
      await api.deleteNote(projectId, noteToDelete._id);
      setNoteToDelete(null);
      await onChange();
    } catch (err) {
      setError(err?.message || "Failed to delete this note.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="relative">
      {canManage && (
        <form
          onSubmit={handleCreate}
          className="flex gap-2 mb-6"
        >
          <input
            required
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Log a note…"
            className="green-input flex-1 rounded-lg px-3 py-2.5 text-sm"
          />

          <button
            type="submit"
            className="green-button font-medium rounded-lg px-4 py-2.5 text-sm transition-all shrink-0"
          >
            Add note
          </button>
        </form>
      )}

      {error && (
        <p className="text-sm text-blocked mb-4">
          {error}
        </p>
      )}

      <div className="space-y-2">
        {notes.map((n) => (
          <div
            key={n._id}
            className="app-card rounded-xl px-4 py-3.5 flex items-start justify-between gap-3"
          >
            <div>
              <p className="text-sm">{n.content}</p>

              <p className="font-mono text-[11px] text-paper-dim mt-1">
                {n.createdBy?.username} ·{" "}
                {new Date(n.createdAt).toLocaleString()}
              </p>
            </div>

            {canManage && (
              <button
                type="button"
                onClick={() => requestDelete(n)}
                className="font-mono text-[11px] text-paper-dim hover:text-blocked transition-colors shrink-0"
              >
                Delete
              </button>
            )}
          </div>
        ))}

        {notes.length === 0 && (
          <p className="text-paper-dim text-sm">
            No notes logged yet.
          </p>
        )}
      </div>

      {noteToDelete && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
          onClick={() => {
            if (!deleting) setNoteToDelete(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-note-title"
            className="w-full max-w-md rounded-2xl border border-line bg-panel p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="font-mono text-[10px] uppercase tracking-widest text-blocked">
              Confirm deletion
            </p>

            <h4
              id="delete-note-title"
              className="mt-2 font-display text-2xl text-paper"
            >
              Delete this note?
            </h4>

            <p className="mt-3 text-sm text-paper-dim">
              This will permanently delete this note.
            </p>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setNoteToDelete(null)}
                disabled={deleting}
                className="rounded-lg border border-line px-4 py-2 text-sm text-paper hover:bg-panel-raised disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete note"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MembersTab({
  projectId,
  members,
  onChange,
  canManage,
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [error, setError] = useState("");
  const [memberToRemove, setMemberToRemove] = useState(null);

  async function handleAdd(e) {
    e.preventDefault();
    setError("");

    try {
      await api.addMember(projectId, {
        email,
        role,
      });

      setEmail("");
      onChange();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleRoleChange(userId, newRole) {
    try {
      await api.updateMemberRole(projectId, userId, { newRole });

      onChange();
    } catch (error) {
      console.error("Failed to change member role:", error);
      alert(error.message || "Failed to change member role");
    }
  }

  function requestRemoveMember(member) {
    if (!member?.user?._id) {
      setError("Unable to identify this member.");
      return;
    }

    setError("");
    setMemberToRemove(member);
  }

  async function handleRemove() {
    if (!memberToRemove?.user?._id) {
      setError("Unable to identify this member.");
      return;
    }

    setError("");

    try {
      await api.removeMember(
        projectId,
        memberToRemove.user._id
      );

      setMemberToRemove(null);
      await onChange();
    } catch (error) {
      console.error("Failed to remove member:", error);

      setError(
        error?.message ||
          "Failed to remove this member. Please check your permissions."
      );
    }
  }

  return (
    <div>
      {canManage && (
        <form
          onSubmit={handleAdd}
          className="flex gap-2 mb-6"
        >
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Member email…"
            className="green-input flex-1 rounded-lg px-3 py-2.5 text-sm"
          />

          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="green-input rounded-lg px-3 py-2.5 text-sm"
          >
            <option value="member">Member</option>
            <option value="project_admin">
              Project admin
            </option>
          </select>

          <button
            type="submit"
            className="green-button font-medium rounded-lg px-4 py-2.5 text-sm transition-all shrink-0"
          >
            Add
          </button>
        </form>
      )}

      {error && (
        <p className="text-sm text-blocked mb-4">
          {error}
        </p>
      )}

      <div className="space-y-2">
        {members.map((m) => (
          <div
            key={m._id}
            className="app-card rounded-xl px-4 py-3.5 flex items-center justify-between gap-3"
          >
            <div className="min-w-0">
              <p className="text-sm truncate">
                {m.user?.fullName || m.user?.username}
              </p>

              <p className="font-mono text-[11px] text-paper-dim truncate">
                {m.user?.email}
              </p>
            </div>

            {canManage ? (
              <div className="flex items-center gap-2 shrink-0">
                <select
                  value={m.role}
                  onChange={(e) =>
                    handleRoleChange(
                      m.user._id,
                      e.target.value,
                    )
                  }
                  className="bg-ink border border-line rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-progress"
                >
                  <option value="admin">Admin</option>
                  <option value="project_admin">
                    Project admin
                  </option>
                  <option value="member">Member</option>
                </select>

                <button
                  type="button"
                  onClick={() => requestRemoveMember(m)}
                  className="font-mono text-[11px] text-paper-dim hover:text-blocked transition-colors"
                >
                  Remove
                </button>
              </div>
            ) : (
              <span className="font-mono text-[11px] text-paper-dim uppercase shrink-0">
                {m.role}
              </span>
            )}
          </div>
        ))}

      {memberToRemove && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
          onClick={() => setMemberToRemove(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="remove-member-title"
            className="w-full max-w-md rounded-2xl border border-line bg-panel p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="font-mono text-[10px] uppercase tracking-widest text-blocked">
              Confirm member removal
            </p>

            <h4
              id="remove-member-title"
              className="mt-2 font-display text-2xl text-paper"
            >
              Remove this member?
            </h4>

            <p className="mt-3 text-sm text-paper-dim">
              This will remove{" "}
              <span className="font-semibold text-paper">
                “{memberToRemove.user?.fullName ||
                  memberToRemove.user?.username ||
                  memberToRemove.user?.email ||
                  "this member"}”
              </span>{" "}
              from the project.
            </p>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setMemberToRemove(null)}
                className="rounded-lg border border-line px-4 py-2 text-sm text-paper hover:bg-panel-raised"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleRemove}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Remove member
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};