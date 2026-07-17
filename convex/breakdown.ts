"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { decomposeTask } from "../lib/llm/decompose-task";

export const generateBreakdown = action({
  args: {
    taskId: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    const task = await ctx.runQuery(internal.tasks.getTaskById, {
      taskId: args.taskId,
    });
    if (task === null) {
      throw new Error("Task not found");
    }

    const subtasks = await decomposeTask(task.title);

    await ctx.runMutation(internal.subtasks.insertGeneratedSubtasks, {
      taskId: args.taskId,
      subtasks,
    });

    console.log("breakdown_generated", {
      taskId: args.taskId,
      count: subtasks.length,
    });
  },
});
