import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
import GlobalSearch from "./GlobalSearch";
import NotificationBell from "./NotificationBell";

function getInitialTheme() {
  if (typeof window === "undefined") return "light";

  const saved = localStorage.getItem("projectpilot-theme");

  if (saved === "dark" || saved === "light") {
    return saved;
  }

  return window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export default function Shell({ projects = [], children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [theme, setTheme] = useState(getInitialTheme);

  // Project menu
  const [openProjectMenu, setOpenProjectMenu] = useState(null);

  // Edit project
  const [editingProject, setEditingProject] = useState(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [savingProject, setSavingProject] = useState(false);

  // Delete project
  const [deletingProject, setDeletingProject] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [projectError, setProjectError] = useState("");

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("projectpilot-theme", theme);
  }, [theme]);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setOpenProjectMenu(null);
      }
    }

    function handleClickOutside(event) {
      if (!event.target.closest("[data-project-menu]")) {
        setOpenProjectMenu(null);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  const userInitial = (
    user?.fullName ||
    user?.email ||
    "U"
  )
    .charAt(0)
    .toUpperCase();

  function openEditProject(project) {
    setOpenProjectMenu(null);
    setProjectError("");

    setEditingProject(project);
    setEditName(project?.name || "");
    setEditDescription(project?.description || "");
  }

  function closeEditProject() {
    if (savingProject) return;

    setEditingProject(null);
    setEditName("");
    setEditDescription("");
    setProjectError("");
  }

  async function handleUpdateProject(e) {
    e.preventDefault();

    const name = editName.trim();
    const description = editDescription.trim();

    if (!name) {
      setProjectError("Project name is required.");
      return;
    }

    if (!editingProject?._id) {
      setProjectError("Project could not be found.");
      return;
    }

    setSavingProject(true);
    setProjectError("");

    try {
      await api.updateProject(editingProject._id, {
        name,
        description,
      });

      setEditingProject(null);
      setEditName("");
      setEditDescription("");

      // Reload so the sidebar and all project-related data are refreshed.
      window.location.reload();
    } catch (error) {
      console.error("Failed to update project:", error);

      setProjectError(
        error?.message || "Failed to update project. Please try again."
      );
    } finally {
      setSavingProject(false);
    }
  }

  function openDeleteProject(project) {
    setOpenProjectMenu(null);
    setProjectError("");
    setDeletingProject(project);
  }

  function closeDeleteProject() {
    if (deleting) return;

    setDeletingProject(null);
    setProjectError("");
  }

  async function handleDeleteProject() {
    if (!deletingProject?._id) {
      setProjectError("Project could not be found.");
      return;
    }

    setDeleting(true);
    setProjectError("");

    try {
      await api.deleteProject(deletingProject._id);

      const deletedProjectId = deletingProject._id;

      setDeletingProject(null);

      // If the user is currently inside the deleted project,
      // take them back to the dashboard.
      const currentPath = window.location.pathname;

      if (currentPath === `/projects/${deletedProjectId}`) {
        navigate("/");
      }

      // Refresh the projects list.
      window.location.reload();
    } catch (error) {
      console.error("Failed to delete project:", error);

      setProjectError(
        error?.message || "Failed to delete project. Please try again."
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="min-h-screen flex bg-ink text-paper app-shell">
      <aside className="sidebar w-64 shrink-0 border-r border-line bg-panel flex flex-col">
        <div className="px-5 py-6 border-b border-line brand-area">
          <div className="flex items-center justify-between gap-3">
            <NavLink to="/" className="block min-w-0">
              <p className="font-display text-2xl leading-none tracking-tight">
                Planora
              </p>

              <p className="font-mono text-[11px] text-paper-dim mt-1 tracking-wide">
                AI Project Management
              </p>
            </NavLink>

            <span className="brand-mark" aria-hidden="true">
              ✦
            </span>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-5">
          <div className="mb-5">
            <p className="font-mono text-[10px] uppercase tracking-widest text-paper-dim px-2 mb-2">
              Workspace
            </p>

            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `nav-item ${isActive ? "is-active" : ""}`
              }
            >
              <span>⌂</span> Dashboard
            </NavLink>

            <NavLink
              to="/calendar"
              className={({ isActive }) =>
                `nav-item ${isActive ? "is-active" : ""}`
              }
            >
              <span>◫</span> Calendar
            </NavLink>

            <NavLink
              to="/analytics"
              className={({ isActive }) =>
                `nav-item ${isActive ? "is-active" : ""}`
              }
            >
              <span>◔</span> Analytics
            </NavLink>
          </div>

          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-paper-dim px-2 mb-2">
              Projects — {projects.length}
            </p>

            <div className="space-y-1">
              {projects.map((p) => (
                <div
                  key={p._id}
                  className="relative flex items-center"
                  data-project-menu
                >
                  <NavLink
                    to={`/projects/${p._id}`}
                    className={({ isActive }) =>
                      `project-nav-item flex-1 min-w-0 pr-10 ${
                        isActive ? "is-active" : ""
                      }`
                    }
                  >
                    <span className="project-nav-dot" />

                    <span className="truncate">
                      {p.name}
                    </span>
                  </NavLink>

                  {/* Three-dot project menu */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();

                      setOpenProjectMenu((current) =>
                        current === p._id ? null : p._id
                      );
                    }}
                    className="
                      absolute
                      right-2
                      top-1/2
                      -translate-y-1/2
                      w-8
                      h-8
                      flex
                      items-center
                      justify-center
                      rounded-md
                      text-paper-dim
                      hover:text-paper
                      hover:bg-paper-dim/10
                      transition-all
                    "
                    aria-label={`Project options for ${p.name}`}
                    title="Project options"
                  >
                    <span className="text-lg leading-none">
                      ⋯
                    </span>
                  </button>

                  {/* Project dropdown */}
                  {openProjectMenu === p._id && (
                    <div
                      className="
                        absolute
                        right-0
                        top-full
                        mt-1
                        z-50
                        w-44
                        rounded-lg
                        border
                        border-line
                        bg-panel
                        shadow-xl
                        overflow-hidden
                      "
                    >
                      <button
                        type="button"
                        onClick={() => openEditProject(p)}
                        className="
                          w-full
                          flex
                          items-center
                          gap-3
                          px-3
                          py-2.5
                          text-left
                          text-sm
                          text-paper
                          hover:bg-paper-dim/10
                          transition-colors
                        "
                      >
                        <span>✎</span>
                        <span>Edit project</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => openDeleteProject(p)}
                        className="
                          w-full
                          flex
                          items-center
                          gap-3
                          px-3
                          py-2.5
                          text-left
                          text-sm
                          text-blocked
                          hover:bg-blocked/10
                          transition-colors
                        "
                      >
                        <span>⌫</span>
                        <span>Delete project</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {projects.length === 0 && (
                <p className="text-sm text-paper-dim px-2 py-2">
                  No projects yet.
                </p>
              )}
            </div>

            <NavLink
              to="/projects/new"
              className="new-project-link"
            >
              + New project
            </NavLink>
          </div>
        </nav>

        <div className="px-4 py-4 border-t border-line sidebar-footer">
          <button
            type="button"
            className="theme-toggle w-full mb-4"
            onClick={() =>
              setTheme((value) =>
                value === "light" ? "dark" : "light"
              )
            }
            aria-label={`Switch to ${
              theme === "light" ? "dark" : "light"
            } theme`}
          >
            <span>
              {theme === "light" ? "☾" : "☀"}
            </span>

            <span>
              {theme === "light"
                ? "Dark theme"
                : "Light theme"}
            </span>

            <span className="theme-toggle-arrow">
              ↔
            </span>
          </button>

          <div className="user-card">
            <div className="user-avatar">
              {userInitial}
            </div>

            <div className="min-w-0">
              <p className="text-sm truncate">
                {user?.fullName || "User"}
              </p>

              <p className="font-mono text-[10px] text-paper-dim truncate">
                {user?.email}
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="signout-button"
          >
            Sign out <span>→</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0 overflow-y-auto app-main">
        <div className="topbar">
          <div className="topbar-search">
            <GlobalSearch />
          </div>

          <div className="topbar-actions">
            <NotificationBell />
          </div>
        </div>

        {children}
      </main>

      {/* ============================================================
          EDIT PROJECT MODAL
          ============================================================ */}
      {editingProject && (
        <div
          className="
            fixed
            inset-0
            z-[100]
            flex
            items-center
            justify-center
            bg-black/40
            px-4
          "
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              closeEditProject();
            }
          }}
        >
          <div
            className="
              w-full
              max-w-md
              rounded-2xl
              border
              border-line
              bg-panel
              p-6
              shadow-2xl
            "
          >
            <div className="mb-5">
              <p className="font-display text-2xl">
                Edit project
              </p>

              <p className="text-sm text-paper-dim mt-1">
                Update your project details.
              </p>
            </div>

            <form
              onSubmit={handleUpdateProject}
              className="space-y-4"
            >
              <div>
                <label className="font-mono text-[11px] uppercase tracking-wide text-paper-dim">
                  Project name
                </label>

                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) =>
                    setEditName(e.target.value)
                  }
                  className="green-input mt-1 w-full rounded-lg px-3.5 py-3 text-paper"
                  placeholder="Project name"
                  autoFocus
                />
              </div>

              <div>
                <label className="font-mono text-[11px] uppercase tracking-wide text-paper-dim">
                  Description
                </label>

                <textarea
                  value={editDescription}
                  onChange={(e) =>
                    setEditDescription(e.target.value)
                  }
                  rows={4}
                  className="green-input mt-1 w-full rounded-lg px-3.5 py-3 text-paper resize-none"
                  placeholder="Project description"
                />
              </div>

              {projectError && (
                <p className="text-sm text-blocked border border-blocked/40 bg-blocked/10 rounded-md px-3 py-2">
                  {projectError}
                </p>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeEditProject}
                  disabled={savingProject}
                  className="
                    rounded-lg
                    border
                    border-line
                    px-4
                    py-2.5
                    text-sm
                    text-paper-dim
                    hover:text-paper
                    transition-colors
                    disabled:opacity-50
                  "
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={savingProject}
                  className="
                    green-button
                    rounded-lg
                    px-4
                    py-2.5
                    text-sm
                    font-medium
                    transition-all
                    disabled:opacity-50
                  "
                >
                  {savingProject
                    ? "Saving…"
                    : "Save changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================
          DELETE PROJECT CONFIRMATION
          ============================================================ */}
      {deletingProject && (
        <div
          className="
            fixed
            inset-0
            z-[100]
            flex
            items-center
            justify-center
            bg-black/40
            px-4
          "
        >
          <div
            className="
              w-full
              max-w-md
              rounded-2xl
              border
              border-line
              bg-panel
              p-6
              shadow-2xl
            "
          >
            <div className="mb-5">
              <p className="font-display text-2xl">
                Delete project?
              </p>

              <p className="text-sm text-paper-dim mt-2">
                Are you sure you want to delete{" "}
                <span className="text-paper font-medium">
                  "{deletingProject.name}"
                </span>
                ?
              </p>

              <p className="text-xs text-blocked mt-3">
                This action cannot be undone.
              </p>
            </div>

            {projectError && (
              <p className="text-sm text-blocked border border-blocked/40 bg-blocked/10 rounded-md px-3 py-2 mb-4">
                {projectError}
              </p>
            )}

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={closeDeleteProject}
                disabled={deleting}
                className="
                  rounded-lg
                  border
                  border-line
                  px-4
                  py-2.5
                  text-sm
                  text-paper-dim
                  hover:text-paper
                  transition-colors
                  disabled:opacity-50
                "
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDeleteProject}
                disabled={deleting}
                className="
                  rounded-lg
                  bg-blocked
                  px-4
                  py-2.5
                  text-sm
                  font-medium
                  text-white
                  transition-all
                  hover:opacity-90
                  disabled:opacity-50
                "
              >
                {deleting
                  ? "Deleting…"
                  : "Delete project"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}