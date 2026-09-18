import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="p-10 max-w-2xl">
      <p className="font-mono text-[11px] uppercase tracking-widest text-paper-dim mb-1">404</p>
      <h1 className="font-display text-4xl mb-3 tracking-tight">Page not found</h1>
      <p className="text-paper-dim mb-6">
        That page doesn't exist, or you don't have access to it.
      </p>
      <Link to="/" className="btn-primary">Back to dashboard</Link>
    </div>
  );
}
