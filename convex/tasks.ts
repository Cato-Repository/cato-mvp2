import { v } from "convex/values";
import { internalQuery, mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";

export const createTask = mutation({
  args: {
    title: v.string(),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (user === null) {
      throw new Error("Not authenticated");
    }

    return await ctx.db.insert("tasks", {
      userId: user._id,
      title: args.title,
      date: args.date,
      createdAt: Date.now(),
    });
  },
});

export const getTasksForToday = query({
  args: {
    date: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (user === null) {
      return [];
    }

    return await ctx.db
      .query("tasks")
      .withIndex("by_userId_and_date", (q) =>
        q.eq("userId", user._id).eq("date", args.date)
      )
      .collect();
  },
});

export const getTaskById = internalQuery({
  args: {
    taskId: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (user === null) {
      return null;
    }

    const task = await ctx.db.get(args.taskId);
    if (task === null || task.userId !== user._id) {
      return null;
    }

    return task;
  },
});
