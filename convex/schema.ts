import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    name: v.string(),
    email: v.string(),
    plan: v.string(),
    createdAt: v.number(),
  }).index("by_clerkId", ["clerkId"]),

  tasks: defineTable({
    userId: v.id("users"),
    title: v.string(),
    date: v.string(),
    createdAt: v.number(),
  }).index("by_userId_and_date", ["userId", "date"]),

  subtasks: defineTable({
    taskId: v.id("tasks"),
    title: v.string(),
    estimatedMinutes: v.number(),
    userEditedMinutes: v.optional(v.number()),
    difficulty: v.string(),
    completed: v.boolean(),
    order: v.number(),
    confirmed: v.optional(v.boolean()),
  }).index("by_taskId", ["taskId"]),

  timetableCommitments: defineTable({
    userId: v.id("users"),
    date: v.string(),
    title: v.string(),
    startTime: v.number(),
    endTime: v.number(),
  }).index("by_userId_and_date", ["userId", "date"]),

  sessions: defineTable({
    userId: v.id("users"),
    subtaskId: v.optional(v.id("subtasks")),
    startTime: v.number(),
    endTime: v.optional(v.number()),
    concentrationScore: v.optional(v.number()),
    status: v.string(),
    webcamAvailable: v.optional(v.boolean()),
  }).index("by_userId", ["userId"]),

  driftEvents: defineTable({
    sessionId: v.id("sessions"),
    type: v.string(),
    startTime: v.number(),
    durationSeconds: v.number(),
  }).index("by_sessionId", ["sessionId"]),

  focusStreaks: defineTable({
    sessionId: v.id("sessions"),
    startTime: v.number(),
    durationSeconds: v.number(),
  }).index("by_sessionId", ["sessionId"]),

  pauseEvents: defineTable({
    sessionId: v.id("sessions"),
    startTime: v.number(),
    endTime: v.optional(v.number()),
  }).index("by_sessionId", ["sessionId"]),

  events: defineTable({
    userId: v.id("users"),
    name: v.string(),
    properties: v.optional(v.any()),
    timestamp: v.number(),
  }).index("by_userId_and_name", ["userId", "name"]),
});
