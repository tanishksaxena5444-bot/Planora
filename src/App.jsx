import { useCallback, useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { api } from "./api/client";
import Shell from "./components/Shell";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import Dashboard from "./pages/Dashboard";
import NewProject from "./pages/NewProject";
import ProjectDetail from "./pages/ProjectDetail";
import Calendar from "./pages/Calendar";
import Analytics from "./pages/Analytics";
import NotFound from "./pages/NotFound";

function RequireAuth({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-ink text-paper flex items-center justify-center">
        <div className="loading-card">
          <span className="loading-dot" />
          Loading workspace…
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AppShellRoutes() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);

  const loadProjects = useCallback(async () => {
    if (!user) {
      setProjects([]);
      return;
    }

    try {
      const res = await api.getProjects();
      const entries = Array.isArray(res?.data) ? res.data : [];
      const flat = entries.map((entry) => ({
        ...(entry?.project || entry),
        ...(entry?.role ? { role: entry.role } : {}),
      }));
      setProjects(flat.filter((project) => project?._id));
    } catch (error) {
      console.error("Failed to load projects:", error);
      setProjects([]);
    }
  }, [user]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  return (
    <Shell projects={projects}>
      <Routes>
        <Route path="/" element={<Dashboard projects={projects} />} />
        <Route
          path="/projects/new"
          element={<NewProject onCreated={loadProjects} />}
        />
        <Route path="/projects/:projectId" element={<ProjectDetail />} />
        <Route path="/calendar" element={<Calendar projects={projects} />} />
        <Route path="/analytics" element={<Analytics projects={projects} />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Shell>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route
          path="/*"
          element={
            <RequireAuth>
              <AppShellRoutes />
            </RequireAuth>
          }
        />
      </Routes>
    </AuthProvider>
  );
}
