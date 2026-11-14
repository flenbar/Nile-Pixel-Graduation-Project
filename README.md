# NileTrack — Offline Field Issue Tracker

NileTrack is an offline-first field reporting application for infrastructure problems. Field workers can create reports without connectivity; the browser stores them in IndexedDB and synchronizes them with the Express API when the network returns. Coordinators can review reports and move them through a controlled workflow.

## Stack

- React + Vite
- Custom responsive CSS design system
- Node.js + Express REST API
- MongoDB Atlas + Mongoose
- IndexedDB for persistent offline queue
- Zod validation
- Vitest automated tests
- Vercel deployment

## Quick start

Requirements: Node.js 20+ and npm.

```bash
npm install
cp .env.example .env
# Add your MongoDB Atlas connection string to MONGODB_URI
npm run dev
```

The frontend runs at `http://localhost:5173`. For local API development in a second terminal:

```bash
npm run dev:api
```

Set `VITE_API_BASE_URL=http://localhost:5000/api` in `.env` for local API use. Restart Vite after changing environment variables.

## Environment variables

- `MONGODB_URI` — MongoDB Atlas connection string (required for server persistence).
- `CLIENT_ORIGIN` — allowed frontend origin(s), comma-separated.
- `VITE_API_BASE_URL` — API base URL; defaults to `/api`.

Never commit `.env`. Use Vercel Project Settings → Environment Variables for production values.

## API

- `GET /api/health` — database health.
- `GET /api/reports` — list reports.
- `POST /api/reports` — create report. `clientId` is a UUID idempotency key; retrying the same ID returns the existing report rather than creating a duplicate.
- `PATCH /api/reports/:id/status` — update status after validating the transition.

## Offline and synchronization strategy

1. Each report receives a UUID `clientId` before it is stored.
2. The report is written to IndexedDB before any network request; this makes local persistence the first step.
3. Its sync state is `Pending`; when online, the sync worker sends it to `POST /api/reports`.
4. The server enforces a unique index on `clientId` and treats duplicate retries as success.
5. Successful reports are marked `Synchronized`; failed attempts are marked `Failed` with an error and retry count.
6. The app retries failed and pending records on the `online` event and every 30 seconds while online.
7. Reports remain in IndexedDB after sync so the local device has a durable copy.

## Workflow assumptions

- `Draft → Submitted`
- `Submitted → Assigned` or `Rejected`
- `Assigned → In Progress` or `Rejected`
- `In Progress → Resolved` or `Rejected`
- `Resolved → In Progress` (reopen)
- `Rejected` is terminal.

Role selection is simulated in the UI; authentication is intentionally not included because it is optional in the project brief. Only coordinators should be granted status management in a production release.

## Testing

```bash
npm test
```

Current automated tests cover valid/invalid report workflow transitions and input validation. Before production, add API integration tests for MongoDB idempotency, authorization, sync retry behavior, and browser-level offline/online tests.

## Seed / demonstration data

The dashboard includes clearly illustrative demo records so the interface is populated on first launch. These are client-side sample rows and are not stored in MongoDB.

## Assumptions and limitations

- Browser IndexedDB is the offline persistence layer; clearing browser site data removes local unsynchronized reports.
- Synchronization is at-least-once from the client, made safe by server-side idempotency.
- Conflict policy: the server is authoritative for coordinator status changes; local client retries only create operations. A future version should add version fields and explicit conflict resolution for concurrent edits.
- Demo role switching is not authentication and must not be treated as access control.
- No geolocation or photo attachment is required by the provided brief.
- Vercel deployment is supported by the included serverless API entry point. MongoDB Atlas must be configured before API persistence works.

## Manual QA checklist

- [ ] Create a report while online and confirm it appears in the list.
- [ ] Turn off network, create a report, refresh, and confirm it remains.
- [ ] Restore network and confirm pending report becomes synchronized.
- [ ] Retry a sync and verify no duplicate server report is created.
- [ ] Test valid and invalid status transitions.
- [ ] Confirm validation messages appear for missing/short inputs.
- [ ] Check responsive layout on a narrow mobile viewport.
- [ ] Verify `/api/health` reports database connectivity after deployment.

## AI and development-tool disclosure

AI assistance was used to draft the initial application structure, UI implementation, API routes, tests, and documentation. The developer must review, understand, run, test, and modify the generated code before submission and disclose any additional tools used. Do not claim tests passed unless they were run successfully.

## Time spent and future improvements

Record actual time spent before submission. With more time: add real authentication and role-based authorization, server-side audit history for all events, robust conflict resolution, API integration tests, E2E offline tests, accessibility review, map/geolocation support, and a service worker for installability.
