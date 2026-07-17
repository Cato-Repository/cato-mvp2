# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
