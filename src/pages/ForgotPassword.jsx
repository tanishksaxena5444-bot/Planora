import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ForgotPassword() {
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen bg-ink text-paper flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <p className="font-display text-3xl mb-3">Check your inbox</p>
          <p className="text-paper-dim text-sm mb-6">
            If an account exists for <span className="text-paper">{email}</span>, we sent a
            password reset link to it.
          </p>
          <Link
            to="/login"
            className="inline-block bg-progress text-ink font-medium rounded-md px-4 py-2 hover:opacity-90 transition-opacity"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink text-paper flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <p className="font-display text-4xl mb-1">Planora</p>
        <p className="text-paper-dim text-sm mb-8">
          Enter your email and we'll send you a reset link.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="font-mono text-[11px] uppercase tracking-wide text-paper-dim">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full bg-panel border border-line rounded-md px-3 py-2 text-paper focus:outline-none focus:ring-2 focus:ring-progress"
              placeholder="you@example.com"
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
            className="w-full bg-progress text-ink font-medium rounded-md py-2 hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {submitting ? "Sending…" : "Send reset link"}
          </button>
        </form>

        <p className="text-sm text-paper-dim mt-6">
          Remembered it?{" "}
          <Link to="/login" className="text-paper underline underline-offset-2">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
