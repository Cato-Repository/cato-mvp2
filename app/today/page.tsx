"use client";

import { useMutation, useQuery } from "convex/react";
import { UserButton } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useState } from "react";
import { Clock, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ActiveSessionPanel } from "@/app/today/ActiveSessionPanel";
import { TaskItem } from "@/app/today/TaskItem";

function getTodayDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function timeStringToTimestamp(date: string, time: string) {
  return new Date(`${date}T${time}`).getTime();
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

  const commitments = useQuery(api.timetable.getTimetableForToday, {
    date: today,
  });
  const createCommitment = useMutation(api.timetable.createTimetableCommitment);
  const [commitmentTitle, setCommitmentTitle] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [commitmentError, setCommitmentError] = useState<string | null>(null);

  const schedule = useQuery(api.schedule.getScheduleForToday, { date: today });

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

  async function handleAddCommitment(e: React.FormEvent) {
    e.preventDefault();
    setCommitmentError(null);
    if (!commitmentTitle.trim() || !startTime || !endTime) return;

    const start = timeStringToTimestamp(today, startTime);
    const end = timeStringToTimestamp(today, endTime);
    if (end <= start) {
      setCommitmentError("End time must be after start time.");
      return;
    }

    try {
      await createCommitment({
        title: commitmentTitle.trim(),
        date: today,
        startTime: start,
        endTime: end,
      });
      setCommitmentTitle("");
      setStartTime("");
      setEndTime("");
    } catch (error) {
      setCommitmentError(
        error instanceof Error ? error.message : "Failed to add commitment."
      );
    }
  }

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Today — {today}</h1>
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[3fr_2fr]">
        <Card>
          <CardHeader>
            <CardTitle>Tasks</CardTitle>
            <form onSubmit={handleAddTask} className="flex gap-2 pt-2">
              <Label htmlFor="task-title" className="sr-only">
                Task title
              </Label>
              <Input
                id="task-title"
                placeholder="Task title"
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

        <Card>
          <CardHeader>
            <CardTitle>Timetable</CardTitle>
            <form
              onSubmit={handleAddCommitment}
              className="flex flex-wrap gap-2 pt-2"
            >
              <Label htmlFor="commitment-title" className="sr-only">
                Commitment title
              </Label>
              <Input
                id="commitment-title"
                placeholder="Commitment title"
                className="flex-1"
                value={commitmentTitle}
                onChange={(e) => setCommitmentTitle(e.target.value)}
              />
              <Label htmlFor="commitment-start" className="sr-only">
                Start time
              </Label>
              <Input
                id="commitment-start"
                type="time"
                className="w-fit"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
              <Label htmlFor="commitment-end" className="sr-only">
                End time
              </Label>
              <Input
                id="commitment-end"
                type="time"
                className="w-fit"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
              <Button type="submit" size="icon" aria-label="Add commitment">
                <Plus className="h-4 w-4" />
              </Button>
            </form>
            {commitmentError && (
              <p className="text-destructive text-sm">{commitmentError}</p>
            )}
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {commitments === undefined && (
              <>
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </>
            )}
            {commitments?.map((c) => (
              <div
                key={c._id}
                className="rounded-md border px-3 py-2 text-sm"
              >
                {formatTime(c.startTime)}–{formatTime(c.endTime)} {c.title}
              </div>
            ))}
            {commitments?.length === 0 && (
              <p className="text-muted-foreground py-4 text-center text-sm">
                No commitments yet.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
