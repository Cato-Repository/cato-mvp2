# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.7.0] - 2026-07-17

### Added
- Delete and mark-complete for subtasks (delete behind an AlertDialog confirmation; completed subtasks strike through and drop out of the finish-by projection).
- Periodic in-app feedback prompt (5-star rating + required comment) every 5 completed sessions, tracked via denormalized counters on the user document.
- One-time, 3-step onboarding tour for new users, hand-rolled with Radix Popover — no new tour dependency.
- Clerk sign-in title overridden via `localization` prop ("Sign in to Cato" instead of the Clerk application's configured name).

### Removed
- Timetable feature entirely (schema table, backend, UI). The finish-by schedule projection no longer works around fixed commitments — it's just now + total confirmed/incomplete minutes.

### Fixed
- `getScheduleForToday` no longer reads the wall clock inside the query (a real bug per Convex's own guidelines — query results don't invalidate just because time passes). The client now owns and refreshes "now".

## [0.6.0] - 2026-07-17

### Added
- shadcn/ui adopted app-wide (Radix primitives, indigo/violet accent over a neutral base, Lucide icons).
- Homepage now redirects based on auth state instead of showing create-next-app boilerplate.
- Sign-in page branded with a heading/tagline and background treatment.
- `/today` restructured: a single "priority zone" (active session or schedule banner, never both), a responsive two-column Tasks/Timetable layout, Skeleton loading states, and a Dialog-based subtask editor replacing inline-row editing.
- `ActiveSessionPanel` gained a progress bar (elapsed vs. estimated minutes), icon status badges, and a persistent destructive `Alert` for AFK warnings.
- Focus-streak celebrations now use `sonner` toasts instead of hand-rolled toast state.

### Fixed
- Page `<title>`/description no longer say "Create Next App".
- A self-referential `--font-sans` CSS variable left by shadcn's init.

## [0.5.0] - 2026-07-17

### Added
- Session lifecycle: Start/Pause/Resume/End on confirmed subtasks (`convex/sessions.ts`), writing `pauseEvents` rows and computing `concentrationScore` on end.
- Client-side webcam presence detection (`lib/webcamDetection.ts`, MediaPipe FaceLandmarker) and screen activity detection (`lib/screenDetection.ts`, frame-diffing proxy for cursor activity — the Screen Capture API has no literal cursor-position API).
- Shared sustained-state drift timing (`lib/driftTimer.ts`), logging `driftEvents` (`webcam_away`, `screen_idle`) once a problem state ends and exceeded its threshold.
- Focus streak logging every 10 continuous minutes without drift, with a toast notification.
- `ActiveSessionPanel` on `/today`: elapsed time, Pause/Resume, End Session, optional screen sharing.
- `webcamAvailable` field on `sessions`, set when webcam permission is denied.

## [0.4.0] - 2026-07-17

### Added
- `confirmed` field on `subtasks` (optional, for schema compatibility with pre-existing rows; new rows always set it explicitly).
- `confirmSubtasks` mutation and a "Confirm" button per task; confirmed subtasks show a checkmark.
- `updateSubtask` mutation and an inline "Edit" form per subtask (title, difficulty, minutes), replacing the old minutes-only click-to-edit.
- `getScheduleForToday` query: deterministically fits confirmed, incomplete subtask work into today's free gaps between timetable commitments, returning a "finish by" timestamp. Shown as a banner on `/today`.
- Clerk's `<UserButton />` on `/today` for sign-out/account access.

### Changed
- `generateBreakdown` now rejects tasks that already have subtasks (server-side, backing the disabled "Break down" button) instead of allowing duplicate breakdowns.

## [0.3.0] - 2026-07-17

### Added
- LLM-powered task breakdown (Phase 2), using Google Vertex AI (Gemini 2.5 Flash).
- `lib/llm/decompose-task.ts`: isolates all Vertex-specific code behind a single `decomposeTask(title)` function, so the provider can be swapped later without touching callers.
- `convex/breakdown.ts`: `generateBreakdown` action (Node runtime) that looks up a task, calls `decomposeTask`, and bulk-inserts the result into `subtasks`.
- `convex/subtasks.ts`: `getSubtasksForTask` query and `updateSubtaskEstimate` mutation (writes to `userEditedMinutes`).
- `/today` page: a "Break down" button per task, with a loading state, a reactive subtask list (title, estimated minutes, difficulty), and click-to-edit estimated minutes.

## [0.2.0] - 2026-07-17

### Added
- Convex schema for the full Phase 1 data model (users, tasks, subtasks, timetableCommitments, sessions, driftEvents, focusStreaks, pauseEvents, events).
- Clerk authentication: `ClerkProvider`, route-protecting middleware, and a sign-in page using Clerk's prebuilt `<SignIn />`.
- Convex + Clerk integration following Convex's official pattern (`auth.config.ts`, `users.store` mutation, `ConvexProviderWithClerk`) — a matching `users` row is created automatically on first sign-in.
- `/today` page with minimal forms and live-updating lists for adding tasks and timetable commitments, backed by new `convex/tasks.ts` and `convex/timetable.ts` mutations/queries.
- Convex AI agent files (`.claude/skills`, `.agents/skills`) for coding-assistant guidance on this codebase.

### Changed
- `sessions` table no longer has `pomodoroLengthMinutes` or `breakLengthMinutes` — Cato is not building a pomodoro timer feature.

## [0.1.0] - 2026-07-17

### Added
- Initial Next.js 16 app scaffold (TypeScript, Tailwind CSS, App Router).
- Convex integration, wired to the existing `Cato-MVP2` project (deployment `jovial-porcupine-654`).
- AI agent guidance files (`AGENTS.md`, `CLAUDE.md`).
