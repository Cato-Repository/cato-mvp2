"use client";

import { useMutation, useQuery } from "convex/react";
import { UserButton } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useEffect, useState } from "react";
import { Clock, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ActiveSessionPanel } from "@/app/today/ActiveSessionPanel";
import { TaskItem } from "@/app/today/TaskItem";
import { FeedbackPrompt } from "@/app/today/FeedbackPrompt";
import { OnboardingProvider, TourStep } from "@/app/today/OnboardingTour";

// How often the "now" used for the finish-by projection refreshes. Convex
// queries shouldn't read the wall clock internally (results wouldn't
// invalidate as time passes), so the client owns and refreshes "now" and
// passes it in as an argument instead.
const NOW_REFRESH_INTERVAL_MS = 60_000;

function getTodayDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function TodayPage() {
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

  async function handleAddTask(e: React.FormEvent) {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    await createTask({ title: taskTitle.trim(), date: today });
    setTaskTitle("");
  }

  return (
    <OnboardingProvider>
      <main className="mx-auto flex max-w-3xl flex-col gap-6 p-6">
        <div className="flex items-center justify-between">
          <TourStep
            step={3}
            title="Start focusing"
            description="Once a sub-task is confirmed, hit Start to begin a tracked session — you'll see live progress and a finish-by projection right here."
          >
            <h1 className="text-xl font-semibold">Today — {today}</h1>
          </TourStep>
          <UserButton />
        </div>

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
            <TourStep
              step={2}
              title="Break it down"
              description="Click 'Break down' on any task to get AI-generated sub-tasks with time estimates, then 'Confirm' to lock them in."
            >
              <CardTitle>Tasks</CardTitle>
            </TourStep>
            <form onSubmit={handleAddTask} className="flex gap-2 pt-2">
              <Label htmlFor="task-title" className="sr-only">
                Task title
              </Label>
              <TourStep
                step={1}
                title="Add your tasks"
                description="Type a task title and hit + to add it to today's list."
              >
                <Input
                  id="task-title"
                  placeholder="Task title"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                />
              </TourStep>
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
            {tasks?.map((task) => (
              <TaskItem
                key={task._id}
                task={task}
                sessionInProgress={activeSession !== null}
                onStartSession={(sessionId, subtaskTitle, estimatedMinutes) =>
                  setActiveSession({ sessionId, subtaskTitle, estimatedMinutes })
                }
              />
            ))}
            {tasks?.length === 0 && (
              <p className="text-muted-foreground py-4 text-center text-sm">
                No tasks yet.
              </p>
            )}
          </CardContent>
        </Card>
      </main>
      <FeedbackPrompt />
    </OnboardingProvider>
  );
}
