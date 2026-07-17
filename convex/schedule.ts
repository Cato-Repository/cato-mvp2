import { v } from "convex/values";
import { query } from "./_generated/server";
import { getCurrentUser } from "./users";

export const getScheduleForToday = query({
  args: {
    date: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (user === null) {
      return null;
    }

    const commitments = await ctx.db
      .query("timetableCommitments")
      .withIndex("by_userId_and_date", (q) =>
        q.eq("userId", user._id).eq("date", args.date)
      )
      .collect();

    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_userId_and_date", (q) =>
        q.eq("userId", user._id).eq("date", args.date)
      )
      .collect();

    let totalRemainingMinutes = 0;
    for (const task of tasks) {
      const subtasks = await ctx.db
        .query("subtasks")
        .withIndex("by_taskId", (q) => q.eq("taskId", task._id))
        .collect();

      for (const subtask of subtasks) {
        if (subtask.confirmed && !subtask.completed) {
          totalRemainingMinutes +=
            subtask.userEditedMinutes ?? subtask.estimatedMinutes;
        }
      }
    }

    if (totalRemainingMinutes === 0) {
      return null;
    }

    const now = Date.now();
    let remainingMs = totalRemainingMinutes * 60 * 1000;
    let cursor = now;

    // Only commitments that haven't fully passed yet can block remaining work.
    const busyBlocks = commitments
      .filter((commitment) => commitment.endTime > now)
      .sort((a, b) => a.startTime - b.startTime);

    for (const block of busyBlocks) {
      if (block.startTime > cursor) {
        const gapMs = block.startTime - cursor;
        if (gapMs >= remainingMs) {
          return cursor + remainingMs;
        }
        remainingMs -= gapMs;
      }
      cursor = Math.max(cursor, block.endTime);
    }

    return cursor + remainingMs;
  },
});
