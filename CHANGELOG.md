# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.10.1] - 2026-07-17

### Changed
- Webcam status badge is text-only now (camera icon removed).
- "Share screen" opens an explanation dialog first ("Why share your screen?") instead of triggering the native picker directly — replaces the easy-to-miss passive caption from the previous change.

## [0.10.0] - 2026-07-17

### Added
- Public landing page at "/" — hero + a 9-card feature grid covering everything currently built (AI breakdown, finish-by projection, focus sessions, webcam/screen detection, AFK check-ins, streaks/concentration score, task CRUD, onboarding tour). "/" is now an exact-match public route in `proxy.ts`; signed-in users still skip straight to `/today`.

## [0.9.3] - 2026-07-17

### Fixed
- Empty-state welcome card was still capped by the page's outer max-w-3xl wrapper, so it could never actually reach its own max-width. Restructured so the empty state breaks out of that constraint; card widened to max-w-4xl with larger padding/type/input/button.
- Sign-in page still showed "Sign in to Cato-MVP2" in the single-step ("last used" method) screen state, which reads Clerk's `titleCombined` key rather than `title` — both are now overridden.

## [0.9.2] - 2026-07-17

### Removed
- Eye-tracking (eyes-closed detection) from webcam presence detection — "away" is now based on face presence and head-pose tilt only.

### Changed
- Empty-state welcome card enlarged (more padding, bigger heading/input/button) — was reading as a small box lost in empty page space.
- "Share screen" now has a persistent caption explaining what it's for.

## [0.9.1] - 2026-07-17

### Changed
- Tutorial content rewritten to match the current UI (task numbering, colored difficulty badges, "Let's Begin!" wording) and extended with steps for the lock-in dialog and pause/AFK handling — previously still showed the old "Confirm" mock.
- Tutorial replay button enlarged again (icon-lg -> custom size-11/44px).

## [0.9.0] - 2026-07-17

### Added
- Centered empty-state welcome screen ("Hey there, {username}!") shown when a user has zero tasks, reverting to the normal layout once a task exists.
- Task numbering (1, 2, 3...) on each task card.
- Lock-in dialog after confirming a task, showing the deterministic finish-by time and offering "I'm locking in" or a 10-minute delay (shown as a per-task badge + a page-bottom countdown bar).
- "Are you still there?" dialog replacing the inline AFK alert, with "I'm still here!" / "Let me rest for 10 mins" (reuses the existing pause mutation).

### Changed
- Difficulty badges are now solid green/amber/red, aligned to a fixed width alongside the minutes badge.
- "Confirm" renamed to "Let's Begin!".
- Date heading changed from "Today — YYYY-MM-DD" to "Weekday – D Month YYYY".
- Task input placeholder changed to an example prompt.

## [0.8.2] - 2026-07-17

### Changed
- Tutorial replay button enlarged (icon-lg) with a "Tutorial" hover tooltip.

## [0.8.1] - 2026-07-17

### Changed
- Onboarding tour redesigned from small popovers anchored to live page elements into a single larger illustrated dialog with a self-contained mock task card and mock finish-by banner, ring+arrow highlights on the relevant control per step, and a Back button. Fixes a real gap where the old "Confirm" step anchored to a button that doesn't exist yet for brand-new users.

## [0.8.0] - 2026-07-17

### Added
- Bulk-select and delete for subtasks ("Select" toggle → checkboxes → "Delete N selected").
- Delete a task entirely, cascading to all of its subtasks.
- Onboarding tour replay button (question-mark icon in the header) — the tour can now be manually re-triggered anytime, not just shown once automatically.

### Changed
- "Confirm" button is now green, visually distinct from "Break down"'s neutral outline style.

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
