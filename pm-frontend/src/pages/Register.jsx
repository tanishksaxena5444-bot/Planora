import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Register() {
  const { register, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  const password = form.password;

  const hasMinLength = password.length >= 8;
  const hasNumber = /\d/.test(password);
  const hasSpecialCharacter = /[^A-Za-z0-9]/.test(password);

  const passwordValid =
    hasMinLength && hasNumber && hasSpecialCharacter;

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!passwordValid) {
      setError(
        "Password must be at least 8 characters and contain at least one number and one special character."
      );
      return;
    }

    setSubmitting(true);

    try {
      await register(form);
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogleSignIn() {
    setError("");
    setGoogleSubmitting(true);

    try {
      await loginWithGoogle();
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setGoogleSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="min-h-screen bg-panel text-paper flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm text-center">
          <p className="font-display text-3xl mb-3">
            Check your inbox
          </p>

          <p className="text-paper-dim text-sm mb-6">
            We sent a verification link to{" "}
            <span className="text-paper">{form.email}</span>.
            Verify your email, then sign in.
          </p>

          <button
            onClick={() => navigate("/login")}
            className="green-button font-medium rounded-lg px-5 py-2.5 transition-all"
          >
            Go to sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-panel text-paper flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <p className="font-display text-4xl mb-2 tracking-tight">
          Planora
        </p>

        <p className="text-paper-dim text-sm mb-8">
          Create your manifest.
        </p>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={googleSubmitting}
          className="w-full flex items-center justify-center gap-2 rounded-lg border border-paper-dim/30 py-3 font-medium transition-all disabled:opacity-50"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 18 18"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fill="#4285F4"
              d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62z"
            />

            <path
              fill="#34A853"
              d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.98v2.33A9 9 0 0 0 9 18z"
            />

            <path
              fill="#FBBC05"
              d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.98A9 9 0 0 0 0 9c0 1.45.35 2.83.98 4.03l2.97-2.33z"
            />

            <path
              fill="#EA4335"
              d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .98 4.97l2.97 2.33C4.66 5.17 6.65 3.58 9 3.58z"
            />
          </svg>

          {googleSubmitting
            ? "Signing in…"
            : "Continue with Google"}
        </button>

        <div className="flex items-center gap-3 my-6">
          <div className="h-px flex-1 bg-paper-dim/20" />

          <span className="text-paper-dim text-xs uppercase tracking-wide">
            or
          </span>

          <div className="h-px flex-1 bg-paper-dim/20" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="font-mono text-[11px] uppercase tracking-wide text-paper-dim">
              Full name
            </label>

            <input
              required
              value={form.fullName}
              onChange={update("fullName")}
              className="green-input mt-1 w-full rounded-lg px-3.5 py-3 text-paper"
            />
          </div>

          <div>
            <label className="font-mono text-[11px] uppercase tracking-wide text-paper-dim">
              Email
            </label>

            <input
              type="email"
              required
              value={form.email}
              onChange={update("email")}
              className="green-input mt-1 w-full rounded-lg px-3.5 py-3 text-paper"
            />
          </div>

          <div>
            <label className="font-mono text-[11px] uppercase tracking-wide text-paper-dim">
              Password
            </label>

            <div className="relative mt-1">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={form.password}
                onChange={update("password")}
                className="green-input w-full rounded-lg px-3.5 py-3 pr-12 text-paper"
                placeholder="••••••••"
              />

              <button
                type="button"
                onClick={() =>
                  setShowPassword((prev) => !prev)
                }
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-paper-dim hover:text-progress transition-colors"
                aria-label={
                  showPassword
                    ? "Hide password"
                    : "Show password"
                }
              >
                {showPassword ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
                    <circle cx="12" cy="12" r="2.5" />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 3l18 18" />
                    <path d="M10.6 6.2A10.5 10.5 0 0 1 12 6c6 0 9.5 6 9.5 6a17 17 0 0 1-3.1 3.7" />
                    <path d="M6.7 6.7C4 8.2 2.5 12 2.5 12s3.5 6 9.5 6c1.4 0 2.6-.3 3.7-.8" />
                  </svg>
                )}
              </button>
            </div>

            {/* Password requirements */}
            <div className="mt-2 space-y-1 text-xs">
              <p
                className={
                  hasMinLength
                    ? "text-done"
                    : "text-paper-dim"
                }
              >
                {hasMinLength ? "✓" : "○"} At least 8 characters
              </p>

              <p
                className={
                  hasNumber
                    ? "text-done"
                    : "text-paper-dim"
                }
              >
                {hasNumber ? "✓" : "○"} At least one number
              </p>

              <p
                className={
                  hasSpecialCharacter
                    ? "text-done"
                    : "text-paper-dim"
                }
              >
                {hasSpecialCharacter ? "✓" : "○"} At least one special character
              </p>
            </div>
          </div>

          {error && (
            <p className="text-sm text-blocked border border-blocked/40 bg-blocked/10 rounded-md px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full green-button font-medium rounded-lg py-3 transition-all disabled:opacity-50"
          >
            {submitting ? "Creating…" : "Create account"}
          </button>
        </form>

        <p className="text-sm text-paper-dim mt-6">
          Already have an account?{" "}
          <Link
            to="/login"
            className="text-paper underline underline-offset-2"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}