import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";

export default function GlobalSearch() {
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const closeSearch = () => {
    setOpen(false);
    setQuery("");
    setResults(null);
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === "k"
      ) {
        event.preventDefault();
        setOpen(true);
      }

      if (event.key === "Escape") {
        event.preventDefault();

        if (open) {
          closeSearch();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, navigate]);

  useEffect(() => {
    if (!open) return;

    const value = query.trim();

    if (!value) {
      setResults(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setLoading(true);

        const response = await api.search(value);

        setResults(
          response?.data || {
            projects: [],
            tasks: [],
            members: [],
            notes: [],
          }
        );
      } catch (error) {
        console.error("Search failed:", error);

        setResults({
          projects: [],
          tasks: [],
          members: [],
          notes: [],
        });
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, open]);

  const hasResults =
    results &&
    (
      results.projects?.length > 0 ||
      results.tasks?.length > 0 ||
      results.notes?.length > 0 ||
      results.members?.length > 0
    );

  const openCommand = (action) => {
    closeSearch();
    action();
  };

  return (
    <>
      {/* Search trigger */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="green-input w-full rounded-xl px-4 py-3 text-left text-sm outline-none ring-0 transition hover:border-line focus:outline-none focus:ring-0"
      >
        <span className="text-paper-dim">
          Search anything...
        </span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[999] flex items-start justify-center bg-black/60 px-4 pt-[65px] backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeSearch();
            }
          }}
        >
          <div className="app-card w-full max-w-4xl overflow-hidden rounded-2xl border border-line shadow-2xl">

            {/* SEARCH HEADER */}
            <div className="flex items-center px-6">
              <span className="mr-4 text-lg text-purple-400">
                ⌕
              </span>

              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search anything..."
                className="flex-1 !border-0 !outline-none !ring-0 !shadow-none bg-transparent py-5 text-base text-paper placeholder:text-paper-dim focus:!border-0 focus:!outline-none focus:!ring-0 focus:!shadow-none"
                style={{
                  border: "none",
                  outline: "none",
                  boxShadow: "none",
                }}
              />

              <button
                type="button"
                onClick={closeSearch}
                className="rounded-md border border-line px-3 py-1.5 text-xs text-paper-dim outline-none transition hover:text-paper focus:outline-none"
              >
                ESC
              </button>
            </div>

            {/* CONTENT */}
            <div className="max-h-[480px] overflow-y-auto px-2 pb-2">

              {/* DEFAULT COMMANDS */}
              {!query.trim() ? (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      openCommand(() =>
                        navigate("/projects/new")
                      )
                    }
                    className="flex w-full items-center justify-between rounded-xl px-5 py-5 text-left transition hover:bg-white/[0.04]"
                  >
                    <span className="text-lg text-paper">
                      Create new project
                    </span>

                    <span className="text-xs text-paper-dim">
                      Action
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      openCommand(() =>
                        navigate("/")
                      )
                    }
                    className="flex w-full items-center justify-between rounded-xl px-5 py-5 text-left transition hover:bg-white/[0.04]"
                  >
                    <span className="text-lg text-paper">
                      Open dashboard
                    </span>

                    <span className="text-xs text-paper-dim">
                      Navigate
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      openCommand(() =>
                        navigate("/analytics")
                      )
                    }
                    className="flex w-full items-center justify-between rounded-xl px-5 py-5 text-left transition hover:bg-white/[0.04]"
                  >
                    <span className="text-lg text-paper">
                      Open analytics
                    </span>

                    <span className="text-xs text-paper-dim">
                      Navigate
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      openCommand(() =>
                        navigate("/calendar")
                      )
                    }
                    className="flex w-full items-center justify-between rounded-xl px-5 py-5 text-left transition hover:bg-white/[0.04]"
                  >
                    <span className="text-lg text-paper">
                      Open calendar
                    </span>

                    <span className="text-xs text-paper-dim">
                      Navigate
                    </span>
                  </button>
                </>
              ) : (
                <>
                  {/* LOADING */}
                  {loading && (
                    <p className="px-5 py-8 text-sm text-paper-dim">
                      Searching…
                    </p>
                  )}

                  {/* NO RESULTS */}
                  {!loading && !hasResults && (
                    <p className="px-5 py-8 text-sm text-paper-dim">
                      No results found.
                    </p>
                  )}

                  {/* PROJECTS */}
                  {!loading &&
                    results?.projects?.length > 0 && (
                      <div className="px-2 pt-2 pb-3">
                        <p className="section-kicker px-3 pb-2">
                          Projects
                        </p>

                        {results.projects.map(
                          (project) => (
                            <Link
                              key={project._id}
                              to={`/projects/${project._id}`}
                              onClick={closeSearch}
                              className="flex items-center justify-between rounded-xl px-4 py-3 transition hover:bg-white/[0.04]"
                            >
                              <div className="min-w-0">
                                <p className="text-sm text-paper">
                                  {project.name}
                                </p>

                                {project.description && (
                                  <p className="mt-1 truncate text-xs text-paper-dim">
                                    {project.description}
                                  </p>
                                )}
                              </div>

                              <span className="ml-4 shrink-0 text-xs text-paper-dim">
                                Project
                              </span>
                            </Link>
                          )
                        )}
                      </div>
                    )}

                  {/* TASKS */}
                  {!loading &&
                    results?.tasks?.length > 0 && (
                      <div className="px-2 pt-2 pb-3">
                        <p className="section-kicker px-3 pb-2">
                          Tasks
                        </p>

                        {results.tasks.map((task) => {
                          const projectId =
                            typeof task.project === "object"
                              ? task.project?._id
                              : task.project;

                          return (
                            <Link
                              key={task._id}
                              to={
                                projectId
                                  ? `/projects/${projectId}`
                                  : "#"
                              }
                              onClick={(event) => {
                                if (!projectId) {
                                  event.preventDefault();
                                  return;
                                }

                                closeSearch();
                              }}
                              className="flex items-center justify-between rounded-xl px-4 py-3 transition hover:bg-white/[0.04]"
                            >
                              <div className="min-w-0">
                                <p className="text-sm text-paper">
                                  {task.title}
                                </p>

                                <p className="mt-1 text-xs text-paper-dim">
                                  {task.status || "Task"}

                                  {task.project?.name
                                    ? ` · ${task.project.name}`
                                    : ""}
                                </p>
                              </div>

                              <span className="ml-4 shrink-0 text-xs text-paper-dim">
                                Open
                              </span>
                            </Link>
                          );
                        })}
                      </div>
                    )}

                  {/* NOTES */}
                  {!loading &&
                    results?.notes?.length > 0 && (
                      <div className="px-2 pt-2 pb-3">
                        <p className="section-kicker px-3 pb-2">
                          Notes
                        </p>

                        {results.notes.map((note) => {
                          const projectId =
                            typeof note.project === "object"
                              ? note.project?._id
                              : note.project;

                          return (
                            <Link
                              key={note._id}
                              to={
                                projectId
                                  ? `/projects/${projectId}?tab=Notes`
                                  : "#"
                              }
                              onClick={(event) => {
                                if (!projectId) {
                                  event.preventDefault();
                                  return;
                                }

                                closeSearch();
                              }}
                              className="flex items-center justify-between rounded-xl px-4 py-3 transition hover:bg-white/[0.04]"
                            >
                              <div className="min-w-0">
                                <p className="truncate text-sm text-paper">
                                  {note.content}
                                </p>

                                <p className="mt-1 text-xs text-paper-dim">
                                  {note.project?.name
                                    ? `Note · ${note.project.name}`
                                    : "Note"}
                                </p>
                              </div>

                              <span className="ml-4 shrink-0 text-xs text-paper-dim">
                                Open
                              </span>
                            </Link>
                          );
                        })}
                      </div>
                    )}

                  {/* PEOPLE */}
                  {!loading &&
                    results?.members?.length > 0 && (
                      <div className="px-2 pt-2 pb-3">
                        <p className="section-kicker px-3 pb-2">
                          People
                        </p>

                        {results.members.map((member) => {
                          const user =
                            member.user || member;

                          const projectId =
                            typeof member.project ===
                            "object"
                              ? member.project?._id
                              : member.project;

                          return (
                            <Link
                              key={`${user._id}-${projectId || "user"}`}
                              to={
                                projectId
                                  ? `/projects/${projectId}?tab=Members`
                                  : "#"
                              }
                              onClick={(event) => {
                                if (!projectId) {
                                  event.preventDefault();
                                  return;
                                }

                                closeSearch();
                              }}
                              className="flex items-center justify-between rounded-xl px-4 py-3 transition hover:bg-white/[0.04]"
                            >
                              <div className="min-w-0">
                                <p className="text-sm text-paper">
                                  {user.fullName ||
                                    user.username}
                                </p>

                                <p className="mt-1 text-xs text-paper-dim">
                                  {user.email}
                                </p>
                              </div>

                              <span className="ml-4 shrink-0 text-xs text-paper-dim">
                                Open
                              </span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                </>
              )}
            </div>

            {/* FOOTER */}
            <div className="flex items-center justify-between border-t border-line px-6 py-3">
              <span className="text-[11px] font-medium tracking-[0.18em] text-paper-dim">
                SEARCH PROJECTS / TASKS / NOTES / PEOPLE
              </span>

              <span className="text-[11px] font-medium tracking-[0.18em] text-paper-dim">
                ESC CLOSE
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}