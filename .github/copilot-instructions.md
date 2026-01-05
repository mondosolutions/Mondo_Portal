# Copilot Instructions — Mondo Portal

This file gives AI coding agents focused, actionable context for working in this repository.

1) Big picture
- The project is a single-repo Node + static frontend app. The backend is a small Express API (entry: [server/index.js](server/index.js)) that serves static HTML/CSS/JS from the project root and exposes API endpoints under `/api/*` implemented in [server/routes](server/routes/).
- Persistence is SQLite via `better-sqlite3`; DB code and schema lives in [server/config/database.js](server/config/database.js). The runtime DB file is `data/mondo.db` (created by the init script).

2) How to run (dev & init)
- Install deps: `npm install` (runs on macOS/Linux).
- Dev server: `npm run dev` (uses `nodemon` to reload [server/index.js](server/index.js)).
- Production start: `npm start` (runs `node server/index.js`).
- Initialize the SQLite DB and create demo data: `npm run init-db` — this runs [server/scripts/init-db.js](server/scripts/init-db.js). The script creates the `data/` folder and demo users (admin/client, password `password123`) if no users exist.

3) Environment and important variables
- `PORT` defaults to `8080` in [server/index.js](server/index.js) if unset.
- `JWT_SECRET` is read from env and falls back to a repository default in [server/middleware/auth.js](server/middleware/auth.js). For production, set `JWT_SECRET` in the environment.

4) Auth & sessions patterns (important)
- JWTs are generated on login and also stored in a `sessions` table; tokens are validated both by `jwt.verify()` and by querying `sessions` to ensure the token is still active. See [server/middleware/auth.js](server/middleware/auth.js).
- Routes that require auth call `authenticateToken`; some code uses `optionalAuth` for non-blocking auth checks.

5) API conventions and examples
- Route prefix: `/api/<resource>` (e.g., `/api/auth/login`, `/api/users/profile`). Routes are in [server/routes/*.js](server/routes/).
- Login example (HTTP): POST `/api/auth/login` with `{ email, password }`. If successful, response includes `token`. Use header `Authorization: Bearer <token>` for protected endpoints.

6) Frontend & assets
- Static HTML/JS/CSS live at repository root and under `assets/`. The server serves static files from the project root (see [server/index.js](server/index.js)).
- Theme toggling is handled in `assets/js/mondo.js` by swapping CSS link hrefs (dark/light mode). Prefer editing CSS files in `assets/css/`.

7) DB and schema notes agents should respect
- Primary schema and table DDL are created in [server/config/database.js](server/config/database.js). Modifying schema should be done via the init script or a migration strategy — avoid ad-hoc schema changes at runtime.
- The `init-db` script seeds demo data (useful for local testing). It will skip seeding if `users` exist.

8) Conventions & patterns to follow
- Prefer synchronous `better-sqlite3` APIs used throughout (prepare/run/get/all). Keep SQL parameterized as shown.
- Input validation uses `express-validator` at the route level — mirror the existing pattern for new endpoints.
- Error responses follow `{ success: false, message: '...' }` with appropriate HTTP status codes.

9) Files to open first for context
- [server/index.js](server/index.js)
- [server/config/database.js](server/config/database.js)
- [server/middleware/auth.js](server/middleware/auth.js)
- [server/scripts/init-db.js](server/scripts/init-db.js)
- [server/routes/](server/routes/)
- [assets/js/mondo.js](assets/js/mondo.js)

10) Quick tips for edits and PRs
- Do not commit the `data/` directory or `data/mondo.db` (local DB) to the repo.
- When adding new API routes, add them to `server/routes/` and mount in [server/index.js](server/index.js) using the `/api/<name>` prefix.
- For auth changes, respect both JWT handling and the `sessions` table logic.

If anything here is unclear or you'd like more examples (curl requests, sample tests, or a migration plan), tell me which section to expand.
