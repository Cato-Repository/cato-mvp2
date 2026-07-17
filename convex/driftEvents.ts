import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { getCurrentUser } from "./users";

export const logDriftEvent = mutation({
  args: {
    sessionId: v.id("sessions"),
    type: v.string(),
    startTime: v.number(),
    durationSeconds: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (user === null) {
      throw new Error("Not authenticated");
    }

    const session = await ctx.db.get(args.sessionId);
    if (session === null || session.userId !== user._id) {
      throw new Error("Not authorized");
    }

    await ctx.db.insert("driftEvents", {
      sessionId: args.sessionId,
      type: args.type,
      startTime: args.startTime,
      durationSeconds: args.durationSeconds,
    });
  },
});
