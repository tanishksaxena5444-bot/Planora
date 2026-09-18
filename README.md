# Planora — AI Project Management (frontend)

A React frontend for the project-management backend.

## Setup

```bash
npm install
cp .env.sample .env      # edit VITE_API_URL if your backend isn't on localhost:3000
npm run dev
```

Runs on http://localhost:5173 by default. Make sure the backend's `CORS_ORIGIN`
in its `.env` includes this URL (comma-separated if multiple).

## Structure

- `src/api/client.js` — thin fetch wrapper for every backend endpoint, handles the
  bearer token
- `src/context/AuthContext.jsx` — login/register/logout + current-user bootstrap
- `src/pages/` — Login, Register, Dashboard, NewProject, ProjectDetail
- `src/components/` — Shell (sidebar), TaskRow (status + subtasks), StatusRail /
  StatusTag (the recurring status-color device used everywhere)

## Testing

```bash
npm test
```

Currently covers `src/lib/ai.js` (the shared AI JSON-parsing helper used by
every "AI copilot" feature). Add more `*.test.js` files alongside the code
they test — `vitest` picks them up automatically.

## Notes

- Auth token is stored in `localStorage` (this is a standalone app, not a
  claude.ai artifact, so browser storage is fine here).
- Register does not auto-login — your backend requires email verification
  before the account can log in.
- Only project admins / the org admin can create tasks, add members, or
  delete things; regular members get read + subtask-toggle access.
