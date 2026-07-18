import { mutation, query, QueryCtx, MutationCtx } from "./_generated/server";

export async function getCurrentUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (identity === null) {
    return null;
  }
  return await ctx.db
    .query("users")
    .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
    .unique();
}

export const store = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity === null) {
      throw new Error("Called store without authentication present");
    }

    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (existingUser !== null) {
      return existingUser._id;
    }

    return await ctx.db.insert("users", {
      clerkId: identity.subject,
      name: identity.name ?? "",
      email: identity.email ?? "",
      plan: "free",
      createdAt: Date.now(),
    });
  },
});

export const getOnboardingStatus = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (user === null) {
      return { hasSeenOnboarding: true };
    }
    return { hasSeenOnboarding: user.hasSeenOnboarding ?? false };
  },
});

export const markOnboardingSeen = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (user === null) {
      throw new Error("Not authenticated");
    }
    await ctx.db.patch("users", user._id, { hasSeenOnboarding: true });
  },
});
