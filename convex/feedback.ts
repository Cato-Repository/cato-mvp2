import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";

// Once-in-a-lifetime prompt: shown until the user submits feedback, then
// never again. Tracked via a plain boolean rather than counting rows.
export const getFeedbackPromptStatus = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (user === null) {
      return { shouldPrompt: false };
    }

    return { shouldPrompt: !(user.hasSubmittedFeedback ?? false) };
  },
});

export const submitFeedback = mutation({
  args: {
    rating: v.number(),
    comment: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (user === null) {
      throw new Error("Not authenticated");
    }

    if (!Number.isInteger(args.rating) || args.rating < 1 || args.rating > 5) {
      throw new Error("Rating must be an integer between 1 and 5");
    }
    if (args.comment.trim().length === 0) {
      throw new Error("Comment is required");
    }

    await ctx.db.insert("feedback", {
      userId: user._id,
      rating: args.rating,
      comment: args.comment.trim(),
      createdAt: Date.now(),
    });

    await ctx.db.patch("users", user._id, { hasSubmittedFeedback: true });
  },
});
