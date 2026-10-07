# Candidate Hiring Pipeline System

A full-stack hiring pipeline app with JWT authentication and role-based access for **recruiters** and **interviewers**.

- **Backend:** Node.js, Express, MongoDB + Mongoose, Zod validation, JWT, bcrypt, Swagger UI
- **Frontend:** React 18 (Vite), Tailwind CSS, Zustand, React Router
- **DevOps:** Docker + docker-compose (MongoDB, API, nginx-served frontend)

## Quick start

### Option A: Docker (recommended)

```bash
docker compose up --build
docker compose exec backend npm run seed     # optional demo data
```

| Service      | URL                               |
| ------------ | --------------------------------- |
| App          | http://localhost:8080             |
| API          | http://localhost:5000/api         |
| Swagger docs | http://localhost:5000/api/docs    |

### Option B: Local development

Requires Node 18+ and a running MongoDB.

```bash
# terminal 1 - API
cd backend
cp .env.example .env        # already included; edit JWT_SECRET / MONGO_URI if needed
npm install
npm run seed                # optional demo data
npm run dev                 # http://localhost:5000

# terminal 2 - UI
cd frontend
npm install
npm run dev                 # http://localhost:5173 (proxies /api to :5000)
```

### Demo accounts (after `npm run seed`, password `Password123`)

| Role        | Email                    |
| ----------- | ------------------------ |
| Recruiter   | recruiter@demo.com       |
| Recruiter   | recruiter2@demo.com      |
| Interviewer | interviewer@demo.com     |
| Interviewer | interviewer2@demo.com    |

The login page has one-click buttons to fill these in.

## Requirements coverage

### Core MVP

| Requirement | Where it lives |
| --- | --- |
| Signup / login, JWT, password hashing, protected routes | `auth.controller.js`, `middleware/auth.js` (bcrypt, 12 rounds); `Protected` route guard in `App.jsx` |
| Role-based access | `authorize(...)` middleware on routes; role-scoped queries in controllers; role-aware UI |
| Candidate management (add, edit, change stage) | `candidates.controller.js`, `Candidates.jsx`, `CandidateDetail.jsx` |
| Pipeline: Applied, Screening, Technical Interview, HR Interview, Offered, Rejected, Hired | `constants.js` (single source of truth), stage history stored per candidate |
| Interview scheduling + upcoming interviews | `interviews.controller.js` (with overlap detection), `Interviews.jsx`, dashboard widget |
| Feedback flow (interviewer submits, recruiter views) | `feedback.controller.js`, `FeedbackForm.jsx`, `FeedbackPage.jsx` |
| Dashboard (candidate list, upcoming interviews) | `Dashboard.jsx` + `GET /api/dashboard` |
| CRUD APIs for candidates, interviews, feedback | `routes/index.js` |
| MongoDB + Mongoose | `models/` |
| React + Tailwind, responsive, loading/error handling | `frontend/src` (every data view has loading, error + retry, and empty states) |

### Additional features (all included)

- **Search, filters, sorting, pagination** on candidates (`q`, `stage`, `position`, `skill`, `minExp`, `from`, `to`, `sort`, `page`, `limit`)
- **Recruiter / interviewer notes** on every candidate
- **Status overview** cards + stage distribution chart on the dashboard
- **Recruiter activity summary** (last 30 days, per recruiter) + recent activity feed
- **Drag-and-drop pipeline board** (HTML5 DnD with optimistic update + rollback; a stage dropdown on each card works on touch devices)
- **Mock email service**: stage changes, interview scheduling/cancelling and feedback all "send" emails, printed to the console and stored in MongoDB; viewable under *Activity, Email outbox*
- **Activity logs**: every mutating action is recorded; viewable under *Activity*
- **State management:** Zustand (auth, theme, toasts)
- **API validation:** Zod schemas for bodies, params and query strings; field-level errors are shown inline in forms
- **Rate limiting:** 600 req / 15 min on the API, 30 / 15 min on login and signup
- **Centralised error handling:** consistent `{ message, errors[] }` shape; handles Mongoose cast/validation/duplicate-key and JWT errors
- **Reusable components:** shared `ui.jsx` plus form components reused between pages and modals
- **Docker setup, Swagger docs, dark mode, responsive layout**

## Role permissions

| Capability | Recruiter | Interviewer |
| --- | :-: | :-: |
| View candidates | all | only those assigned to them (have an interview with them) |
| Add / edit / delete candidates | yes | no |
| Change candidate stage | yes | no |
| Add notes | yes | yes (assigned candidates) |
| Schedule / edit / cancel / delete interviews | yes | no |
| View interviews | all | own |
| Submit / edit feedback | no | yes (own interviews only, one per interview) |
| View feedback | all | own |
| Activity log, email outbox, pipeline board | yes | no |

Permissions are enforced on the **server**; the UI only hides what a role cannot use.

## API overview

Interactive docs: `GET /api/docs` (Swagger UI, use **Authorize** with the token from `/auth/login`). Raw spec: `GET /api/docs.json`, which can be imported into Postman.

```
POST   /api/auth/signup | /api/auth/login        GET /api/auth/me
GET    /api/dashboard
GET    /api/users?role=interviewer               (recruiter)

GET|POST            /api/candidates
GET|PUT|PATCH|DELETE /api/candidates/:id
PATCH               /api/candidates/:id/stage
POST                /api/candidates/:id/notes
DELETE              /api/candidates/:id/notes/:noteId

GET|POST            /api/interviews              ?when=upcoming|past&status=&candidate=
GET|PUT|PATCH|DELETE /api/interviews/:id

GET|POST            /api/feedback
GET|PUT|PATCH|DELETE /api/feedback/:id

GET    /api/activity | /api/activity/emails      (recruiter)
```

List endpoints return `{ data: [...], meta: { total, page, limit, pages } }`.
Errors return `{ message, errors?: [{ field, message }] }`.

## Project structure

```
backend/src
  config/        env, db, swagger (OpenAPI spec)
  models/        User, Candidate, Interview, Feedback, ActivityLog, Notification
  validators/    Zod schemas
  middleware/    auth + role guard, validate, rate limit, error handler
  controllers/   business logic
  routes/        route table with role guards
  services/      access rules, activity logger, mock mailer
  seed.js        demo data
frontend/src
  pages/         Login, Signup, Dashboard, Candidates, CandidateDetail, Pipeline, Interviews, FeedbackPage, Activity
  components/    Layout, ui primitives, Candidate/Interview/Feedback forms
  store/         Zustand stores (auth, theme, toast)
  lib/           api client, constants, formatters, useFetch hook
```

## Design decisions and trade-offs

- **"Assigned candidate" = has an interview with that interviewer.** This avoids a separate assignment table; scheduling an interview is what grants access.
- **One feedback per interview** (unique index). Submitting feedback marks the interview `completed`.
- **Double-booking protection:** scheduling returns `409` if the interviewer has an overlapping scheduled interview.
- **Self-service role selection on signup** is kept so the app is easy to evaluate. In production, recruiter accounts should be invited/approved by an admin.
- **Token storage:** the JWT is kept in `localStorage` for simplicity. For stricter security, move it to an httpOnly cookie.
- **Mock email** lives behind a single `sendMail()` function; swap its body for Nodemailer/SES/SendGrid.

## Deployment notes

- Set a strong `JWT_SECRET` and a managed `MONGO_URI` (e.g. MongoDB Atlas).
- Set `CLIENT_ORIGIN` on the API to your frontend's origin.
- The frontend container proxies `/api` to the `backend` service. If you host the API separately, build the frontend with `VITE_API_URL=https://your-api/api`.
- Suitable targets: Render / Railway / Fly.io for the API, Vercel / Netlify for the static frontend (`npm run build`, output in `dist/`).

## Verification status

Everything was written to be run as-is, but note what has and has not been checked:

- Checked: all backend and frontend source files parse; all 178 relative imports and named exports resolve.
- **Not yet run end-to-end** (no network or MongoDB was available while building): `npm install`, `vite build`, and live API calls. Run through the quick-start and the Swagger docs once on your machine; if anything misbehaves, the console output will point to the exact file.
