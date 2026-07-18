import { v } from "convex/values";
import { query } from "./_generated/server";
import { getCurrentUser } from "./users";

export const getScheduleForToday = query({
  args: {
    date: v.string(),
    now: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (user === null) {
      return null;
    }

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

    return args.now + totalRemainingMinutes * 60 * 1000;
  },
});
