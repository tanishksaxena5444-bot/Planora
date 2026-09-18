import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";

export default function NewProject({ onCreated }) {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await api.createProject({ name, description });
      await onCreated();
      navigate(`/projects/${res.data._id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-6 sm:p-10 max-w-2xl">
      <p className="font-mono text-[11px] uppercase tracking-widest text-paper-dim mb-1">
        New entry
      </p>
      <h1 className="font-display text-4xl mb-8 tracking-tight">Start a project</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="font-mono text-[11px] uppercase tracking-wide text-paper-dim">
            Name
          </label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="green-input mt-1 w-full rounded-lg px-3.5 py-3 text-paper"
            placeholder="Q3 website relaunch"
          />
        </div>
        <div>
          <label className="font-mono text-[11px] uppercase tracking-wide text-paper-dim">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="green-input mt-1 w-full rounded-lg px-3.5 py-3 text-paper"
            placeholder="What is this project for?"
          />
        </div>

        {error && (
          <p className="text-sm text-blocked border border-blocked/40 bg-blocked/10 rounded-md px-3 py-2">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="green-button font-medium rounded-lg px-5 py-2.5 transition-all disabled:opacity-50"
        >
          {submitting ? "Creating…" : "Create project"}
        </button>
      </form>
    </div>
  );
}
