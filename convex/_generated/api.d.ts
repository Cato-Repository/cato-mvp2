/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as breakdown from "../breakdown.js";
import type * as driftEvents from "../driftEvents.js";
import type * as focusStreaks from "../focusStreaks.js";
import type * as schedule from "../schedule.js";
import type * as sessions from "../sessions.js";
import type * as subtasks from "../subtasks.js";
import type * as tasks from "../tasks.js";
import type * as timetable from "../timetable.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  breakdown: typeof breakdown;
  driftEvents: typeof driftEvents;
  focusStreaks: typeof focusStreaks;
  schedule: typeof schedule;
  sessions: typeof sessions;
  subtasks: typeof subtasks;
  tasks: typeof tasks;
  timetable: typeof timetable;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
