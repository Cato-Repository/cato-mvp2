import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";

export const getSubtasksForTask = query({
  args: {
    taskId: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (user === null) {
      return [];
    }

    const task = await ctx.db.get(args.taskId);
    if (task === null || task.userId !== user._id) {
      return [];
    }

    const subtasks = await ctx.db
      .query("subtasks")
      .withIndex("by_taskId", (q) => q.eq("taskId", args.taskId))
      .collect();

    return subtasks.sort((a, b) => a.order - b.order);
  },
});

export const updateSubtaskEstimate = mutation({
  args: {
    subtaskId: v.id("subtasks"),
    minutes: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (user === null) {
      throw new Error("Not authenticated");
    }

    const subtask = await ctx.db.get(args.subtaskId);
    if (subtask === null) {
      throw new Error("Subtask not found");
    }

    const task = await ctx.db.get(subtask.taskId);
    if (task === null || task.userId !== user._id) {
      throw new Error("Not authorized");
    }

    await ctx.db.patch(args.subtaskId, { userEditedMinutes: args.minutes });
  },
});

export const insertGeneratedSubtasks = internalMutation({
  args: {
    taskId: v.id("tasks"),
    subtasks: v.array(
      v.object({
        title: v.string(),
        estimatedMinutes: v.number(),
        difficulty: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    for (let i = 0; i < args.subtasks.length; i++) {
      const subtask = args.subtasks[i];
      await ctx.db.insert("subtasks", {
        taskId: args.taskId,
        title: subtask.title,
        estimatedMinutes: subtask.estimatedMinutes,
        difficulty: subtask.difficulty,
        completed: false,
        order: i,
      });
    }
  },
});
