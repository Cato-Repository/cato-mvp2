"use client";

import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useState } from "react";
import {
  CheckCheck,
  CheckSquare,
  Loader2,
  Sparkles,
  Timer,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { SubtaskRow } from "@/app/today/SubtaskRow";
import { formatTime } from "@/lib/formatTime";

const DELAY_MS = 10 * 60 * 1000;

export function TaskItem({
  task,
  index,
  sessionInProgress,
  onStartSession,
  schedule,
  delay,
  onStartDelay,
}: {
  task: { _id: Id<"tasks">; title: string };
  index: number;
  sessionInProgress: boolean;
  onStartSession: (
    sessionId: Id<"sessions">,
    subtaskTitle: string,
    estimatedMinutes: number
  ) => void;
  schedule: number | null | undefined;
  delay: { endsAt: number; now: number } | null;
  onStartDelay: (taskId: Id<"tasks">, endsAt: number) => void;
}) {
  const subtasks = useQuery(api.subtasks.getSubtasksForTask, {
    taskId: task._id,
  });
  const generateBreakdown = useAction(api.breakdown.generateBreakdown);
  const confirmSubtasks = useMutation(api.subtasks.confirmSubtasks);
  const deleteTask = useMutation(api.tasks.deleteTask);
  const deleteSubtasks = useMutation(api.subtasks.deleteSubtasks);

  const [isBreakingDown, setIsBreakingDown] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isDeletingTask, setIsDeletingTask] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<Id<"subtasks">>>(new Set());
  const [showLockIn, setShowLockIn] = useState(false);

  const hasSubtasks = subtasks !== undefined && subtasks.length > 0;
  const allConfirmed = hasSubtasks && subtasks.every((s) => s.confirmed);

  async function handleBreakDown() {
    setIsBreakingDown(true);
    try {
      await generateBreakdown({ taskId: task._id });
    } finally {
      setIsBreakingDown(false);
    }
  }

  async function handleConfirm() {
    setIsConfirming(true);
    try {
      await confirmSubtasks({ taskId: task._id });
      setShowLockIn(true);
    } finally {
      setIsConfirming(false);
    }
  }

  async function handleDeleteTask() {
    setIsDeletingTask(true);
    try {
      await deleteTask({ taskId: task._id });
    } finally {
      setIsDeletingTask(false);
    }
  }

  function toggleSelecting() {
    setIsSelecting((s) => !s);
    setSelectedIds(new Set());
  }

  function toggleSelected(subtaskId: Id<"subtasks">) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(subtaskId)) {
        next.delete(subtaskId);
      } else {
        next.add(subtaskId);
      }
      return next;
    });
  }

  async function handleDeleteSelected() {
    await deleteSubtasks({ subtaskIds: Array.from(selectedIds) });
    setSelectedIds(new Set());
    setIsSelecting(false);
  }

  function handleDelayStart() {
    onStartDelay(task._id, Date.now() + DELAY_MS);
    setShowLockIn(false);
  }

  const delayMinutesLeft = delay
    ? Math.max(0, Math.ceil((delay.endsAt - delay.now) / 60000))
    : null;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="h-6 w-6 justify-center rounded-full p-0">
            {index}
          </Badge>
          <CardTitle className="text-base font-normal">{task.title}</CardTitle>
          {delayMinutesLeft !== null && (
            <Badge variant="destructive">
              <Timer className="h-3 w-3" />
              {delayMinutesLeft} Min{delayMinutesLeft === 1 ? "" : "s"} Pause
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasSubtasks && !allConfirmed && (
            <Button
              type="button"
              size="sm"
              onClick={handleConfirm}
              disabled={isConfirming}
              className="bg-green-600 text-white hover:bg-green-700"
            >
              {isConfirming ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCheck className="h-4 w-4" />
              )}
              {isConfirming ? "Confirming…" : "Let's Begin!"}
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleBreakDown}
            disabled={isBreakingDown || hasSubtasks}
          >
            {isBreakingDown ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {isBreakingDown ? "Breaking down…" : "Break down"}
          </Button>
          {hasSubtasks && (
            <Button type="button" variant="outline" size="sm" onClick={toggleSelecting}>
              {isSelecting ? (
                <X className="h-4 w-4" />
              ) : (
                <CheckSquare className="h-4 w-4" />
              )}
              {isSelecting ? "Cancel" : "Select"}
            </Button>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="ghost" size="icon" disabled={isDeletingTask}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this task?</AlertDialogTitle>
                <AlertDialogDescription>
                  &ldquo;{task.title}&rdquo; and all of its sub-tasks will be
                  permanently deleted. This can&apos;t be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteTask}>
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardHeader>

      {isSelecting && (
        <div className="flex items-center justify-between px-6 pb-2">
          <span className="text-muted-foreground text-xs">
            {selectedIds.size} selected
          </span>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="destructive" size="sm" disabled={selectedIds.size === 0}>
                <Trash2 className="h-4 w-4" />
                Delete selected
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Delete {selectedIds.size} sub-task{selectedIds.size === 1 ? "" : "s"}?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This can&apos;t be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteSelected}>
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}

      {subtasks === undefined && (
        <CardContent className="flex flex-col gap-2">
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-3/4" />
        </CardContent>
      )}

      {hasSubtasks && (
        <CardContent className="flex flex-col divide-y">
          {subtasks.map((subtask) => (
            <SubtaskRow
              key={subtask._id}
              subtask={subtask}
              sessionInProgress={sessionInProgress}
              onStart={onStartSession}
              selectable={isSelecting}
              selected={selectedIds.has(subtask._id)}
              onToggleSelect={() => toggleSelected(subtask._id)}
            />
          ))}
        </CardContent>
      )}

      <Dialog open={showLockIn} onOpenChange={setShowLockIn}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {schedule != null
                ? `You can finish by ${formatTime(schedule)} if you start now and focus!`
                : "Ready to focus?"}
            </DialogTitle>
            <DialogDescription>Shall we lock in now?</DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center">
            <Button
              type="button"
              className="bg-primary text-primary-foreground"
              onClick={() => setShowLockIn(false)}
            >
              I&apos;m locking in
            </Button>
            <Button type="button" variant="secondary" onClick={handleDelayStart}>
              I&apos;ll start in 10 mins
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
