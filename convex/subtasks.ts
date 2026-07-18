import { v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
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

export const updateSubtask = mutation({
  args: {
    subtaskId: v.id("subtasks"),
    title: v.string(),
    difficulty: v.string(),
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

    const currentMinutes = subtask.userEditedMinutes ?? subtask.estimatedMinutes;

    await ctx.db.patch(args.subtaskId, {
      title: args.title,
      difficulty: args.difficulty,
      ...(args.minutes !== currentMinutes
        ? { userEditedMinutes: args.minutes }
        : {}),
    });
  },
});

export const confirmSubtasks = mutation({
  args: {
    taskId: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (user === null) {
      throw new Error("Not authenticated");
    }

    const task = await ctx.db.get(args.taskId);
    if (task === null || task.userId !== user._id) {
      throw new Error("Not authorized");
    }

    const subtasks = await ctx.db
      .query("subtasks")
      .withIndex("by_taskId", (q) => q.eq("taskId", args.taskId))
      .collect();

    for (const subtask of subtasks) {
      if (!subtask.confirmed) {
        await ctx.db.patch(subtask._id, { confirmed: true });
      }
    }
  },
});

export const toggleSubtaskCompleted = mutation({
  args: {
    subtaskId: v.id("subtasks"),
    completed: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (user === null) {
      throw new Error("Not authenticated");
    }

    const subtask = await ctx.db.get("subtasks", args.subtaskId);
    if (subtask === null) {
      throw new Error("Subtask not found");
    }

    const task = await ctx.db.get("tasks", subtask.taskId);
    if (task === null || task.userId !== user._id) {
      throw new Error("Not authorized");
    }

    await ctx.db.patch("subtasks", args.subtaskId, { completed: args.completed });
  },
});

export const deleteSubtask = mutation({
  args: {
    subtaskId: v.id("subtasks"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (user === null) {
      throw new Error("Not authenticated");
    }

    const subtask = await ctx.db.get("subtasks", args.subtaskId);
    if (subtask === null) {
      throw new Error("Subtask not found");
    }

    const task = await ctx.db.get("tasks", subtask.taskId);
    if (task === null || task.userId !== user._id) {
      throw new Error("Not authorized");
    }

    await ctx.db.delete("subtasks", args.subtaskId);
  },
});

export const hasSubtasksInternal = internalQuery({
  args: {
    taskId: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("subtasks")
      .withIndex("by_taskId", (q) => q.eq("taskId", args.taskId))
      .first();
    return existing !== null;
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
        confirmed: false,
      });
    }
  },
});
