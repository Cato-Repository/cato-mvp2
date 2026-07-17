import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";

export const createTimetableCommitment = mutation({
  args: {
    title: v.string(),
    date: v.string(),
    startTime: v.number(),
    endTime: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (user === null) {
      throw new Error("Not authenticated");
    }

    if (args.endTime <= args.startTime) {
      throw new Error("End time must be after start time");
    }

    return await ctx.db.insert("timetableCommitments", {
      userId: user._id,
      title: args.title,
      date: args.date,
      startTime: args.startTime,
      endTime: args.endTime,
    });
  },
});

export const getTimetableForToday = query({
  args: {
    date: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (user === null) {
      return [];
    }

    return await ctx.db
      .query("timetableCommitments")
      .withIndex("by_userId_and_date", (q) =>
        q.eq("userId", user._id).eq("date", args.date)
      )
      .collect();
  },
});
