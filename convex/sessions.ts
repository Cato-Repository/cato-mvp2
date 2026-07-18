import { v } from "convex/values";
import { mutation, query, QueryCtx, MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { getCurrentUser } from "./users";

async function getOwnedSession(
  ctx: QueryCtx | MutationCtx,
  sessionId: Id<"sessions">,
  userId: Id<"users">
) {
  const session = await ctx.db.get(sessionId);
  if (session === null || session.userId !== userId) {
    throw new Error("Not authorized");
  }
  return session;
}

export const startSession = mutation({
  args: {
    subtaskId: v.id("subtasks"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (user === null) {
      throw new Error("Not authenticated");
    }

    return await ctx.db.insert("sessions", {
      userId: user._id,
      subtaskId: args.subtaskId,
      startTime: Date.now(),
      status: "active",
    });
  },
});

export const pauseSession = mutation({
  args: {
    sessionId: v.id("sessions"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (user === null) {
      throw new Error("Not authenticated");
    }
    await getOwnedSession(ctx, args.sessionId, user._id);

    await ctx.db.insert("pauseEvents", {
      sessionId: args.sessionId,
      startTime: Date.now(),
    });
    await ctx.db.patch(args.sessionId, { status: "paused" });
  },
});

export const resumeSession = mutation({
  args: {
    sessionId: v.id("sessions"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (user === null) {
      throw new Error("Not authenticated");
    }
    await getOwnedSession(ctx, args.sessionId, user._id);

    const pauseRows = await ctx.db
      .query("pauseEvents")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .collect();
    const openPause = pauseRows.find((row) => row.endTime === undefined);
    if (openPause !== undefined) {
      await ctx.db.patch(openPause._id, { endTime: Date.now() });
    }

    await ctx.db.patch(args.sessionId, { status: "active" });
  },
});

export const endSession = mutation({
  args: {
    sessionId: v.id("sessions"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (user === null) {
      throw new Error("Not authenticated");
    }
    await getOwnedSession(ctx, args.sessionId, user._id);

    // Defensively close any still-open pause row (e.g. session ended while paused).
    const pauseRows = await ctx.db
      .query("pauseEvents")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .collect();
    const openPause = pauseRows.find((row) => row.endTime === undefined);
    if (openPause !== undefined) {
      await ctx.db.patch(openPause._id, { endTime: Date.now() });
    }

    const drifts = await ctx.db
      .query("driftEvents")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .collect();
    const streaks = await ctx.db
      .query("focusStreaks")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    let concentrationScore = 100;
    for (const drift of drifts) {
      const durationMinutes = drift.durationSeconds / 60;
      concentrationScore -=
        durationMinutes * (drift.type === "webcam_away" ? 2 : 1);
    }
    concentrationScore += streaks.length * 2;
    concentrationScore = Math.max(0, concentrationScore);

    await ctx.db.patch(args.sessionId, {
      endTime: Date.now(),
      status: "completed",
      concentrationScore,
    });

    await ctx.db.patch("users", user._id, {
      completedSessionCount: (user.completedSessionCount ?? 0) + 1,
    });
  },
});

export const setWebcamAvailability = mutation({
  args: {
    sessionId: v.id("sessions"),
    available: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (user === null) {
      throw new Error("Not authenticated");
    }
    await getOwnedSession(ctx, args.sessionId, user._id);

    await ctx.db.patch(args.sessionId, { webcamAvailable: args.available });
  },
});

export const getSession = query({
  args: {
    sessionId: v.id("sessions"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (user === null) {
      return null;
    }

    const session = await ctx.db.get(args.sessionId);
    if (session === null || session.userId !== user._id) {
      return null;
    }

    return session;
  },
});
