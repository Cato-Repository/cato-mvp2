"use client";

import { useMutation, useQuery } from "convex/react";
import { UserButton, useUser } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useEffect, useState } from "react";
import { ArrowUp, Clock, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ActiveSessionPanel } from "@/app/today/ActiveSessionPanel";
import { TaskItem } from "@/app/today/TaskItem";
import { FeedbackPrompt } from "@/app/today/FeedbackPrompt";
import {
  OnboardingProvider,
  OnboardingReplayButton,
} from "@/app/today/OnboardingTour";
import { formatTime } from "@/lib/formatTime";

// How often the "now" used for the finish-by projection refreshes. Convex
// queries shouldn't read the wall clock internally (results wouldn't
// invalidate as time passes), so the client owns and refreshes "now" and
// passes it in as an argument instead.
const NOW_REFRESH_INTERVAL_MS = 60_000;
const TASK_PLACEHOLDER = "E.g. Write a 500 word essay on butterflies";

function getTodayDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateHeading(dateStr: string) {
  const date = new Date(`${dateStr}T00:00:00`);
  const weekday = date.toLocaleDateString([], { weekday: "long" });
  const rest = date.toLocaleDateString([], {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return `${weekday} – ${rest}`;
}

export default function TodayPage() {
  const { user } = useUser();
  const today = getTodayDateString();

  const tasks = useQuery(api.tasks.getTasksForToday, { date: today });
  const createTask = useMutation(api.tasks.createTask);
  const [taskTitle, setTaskTitle] = useState("");

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), NOW_REFRESH_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, []);
  const schedule = useQuery(api.schedule.getScheduleForToday, { date: today, now });

  const [activeSession, setActiveSession] = useState<{
    sessionId: Id<"sessions">;
    subtaskTitle: string;
    estimatedMinutes: number;
  } | null>(null);

  // "Lock in" delay: set when a user picks "I'll start in 10 mins" on a
  // task's lock-in dialog. Purely a client-side UI nudge (not persisted) —
  // ticks every second only while active, separate from the coarser `now`
  // used for the schedule query above.
  const [delay, setDelay] = useState<{
    taskId: Id<"tasks">;
    endsAt: number;
  } | null>(null);
  const [delayNow, setDelayNow] = useState(() => Date.now());
  useEffect(() => {
    if (delay === null) return;
    const id = window.setInterval(() => {
      const nowMs = Date.now();
      setDelayNow(nowMs);
      if (nowMs >= delay.endsAt) {
        setDelay(null);
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [delay]);

  async function handleAddTask(e: React.FormEvent) {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    await createTask({ title: taskTitle.trim(), date: today });
    setTaskTitle("");
  }

  const greetingName = user?.username ?? user?.firstName ?? "there";
  const hasNoTasks = tasks !== undefined && tasks.length === 0;

  const delayProgressPercent =
    delay !== null
      ? Math.max(
          0,
          Math.min(100, ((delay.endsAt - delayNow) / (10 * 60 * 1000)) * 100)
        )
      : null;

  return (
    <OnboardingProvider>
      <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 p-6">
        <div className="flex items-center justify-between">
          {!hasNoTasks && (
            <h1 className="text-xl font-semibold">{formatDateHeading(today)}</h1>
          )}
          <div className="ml-auto flex items-center gap-1">
            <OnboardingReplayButton />
            <UserButton />
          </div>
        </div>

        {hasNoTasks ? (
          <div className="flex flex-1 items-center justify-center">
            <Card className="w-full max-w-md">
              <CardContent className="flex flex-col gap-4 py-8 text-center">
                <div>
                  <h2 className="text-xl font-semibold">Hey there, {greetingName}!</h2>
                  <p className="text-muted-foreground mt-1 text-sm">
                    What would you like to get started with?
                  </p>
                </div>
                <form onSubmit={handleAddTask} className="flex gap-2">
                  <Label htmlFor="task-title" className="sr-only">
                    Task title
                  </Label>
                  <Input
                    id="task-title"
                    placeholder={TASK_PLACEHOLDER}
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                  />
                  <Button
                    type="submit"
                    size="icon"
                    className="bg-primary rounded-full"
                    aria-label="Add task"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        ) : (
          <>
            {activeSession ? (
              <ActiveSessionPanel
                sessionId={activeSession.sessionId}
                subtaskTitle={activeSession.subtaskTitle}
                estimatedMinutes={activeSession.estimatedMinutes}
                onEnded={() => setActiveSession(null)}
              />
            ) : (
              schedule != null && (
                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="flex items-center gap-2 py-4">
                    <Clock className="text-primary h-4 w-4" />
                    <span className="text-sm">
                      If you start now, you can finish by{" "}
                      <strong>{formatTime(schedule)}</strong>.
                    </span>
                  </CardContent>
                </Card>
              )
            )}

            <Card>
              <CardHeader>
                <CardTitle>Tasks</CardTitle>
                <form onSubmit={handleAddTask} className="flex gap-2 pt-2">
                  <Label htmlFor="task-title" className="sr-only">
                    Task title
                  </Label>
                  <Input
                    id="task-title"
                    placeholder={TASK_PLACEHOLDER}
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                  />
                  <Button type="submit" size="icon" aria-label="Add task">
                    <Plus className="h-4 w-4" />
                  </Button>
                </form>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {tasks === undefined && (
                  <>
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                  </>
                )}
                {tasks?.map((task, index) => (
                  <TaskItem
                    key={task._id}
                    task={task}
                    index={index + 1}
                    sessionInProgress={activeSession !== null}
                    onStartSession={(sessionId, subtaskTitle, estimatedMinutes) =>
                      setActiveSession({ sessionId, subtaskTitle, estimatedMinutes })
                    }
                    schedule={schedule}
                    delay={
                      delay !== null && delay.taskId === task._id
                        ? { endsAt: delay.endsAt, now: delayNow }
                        : null
                    }
                    onStartDelay={(taskId, endsAt) => setDelay({ taskId, endsAt })}
                  />
                ))}
              </CardContent>
            </Card>
          </>
        )}
      </main>
      <FeedbackPrompt />

      {delayProgressPercent !== null && (
        <div className="bg-muted fixed right-0 bottom-0 left-0 h-1">
          <div
            className="h-full bg-orange-500 transition-all"
            style={{ width: `${delayProgressPercent}%` }}
          />
        </div>
      )}
    </OnboardingProvider>
  );
}
