"use client";

import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useState } from "react";
import { CheckCheck, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SubtaskRow } from "@/app/today/SubtaskRow";

export function TaskItem({
  task,
  sessionInProgress,
  onStartSession,
}: {
  task: { _id: Id<"tasks">; title: string };
  sessionInProgress: boolean;
  onStartSession: (
    sessionId: Id<"sessions">,
    subtaskTitle: string,
    estimatedMinutes: number
  ) => void;
}) {
  const subtasks = useQuery(api.subtasks.getSubtasksForTask, {
    taskId: task._id,
  });
  const generateBreakdown = useAction(api.breakdown.generateBreakdown);
  const confirmSubtasks = useMutation(api.subtasks.confirmSubtasks);

  const [isBreakingDown, setIsBreakingDown] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

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
    } finally {
      setIsConfirming(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-base font-normal">{task.title}</CardTitle>
        <div className="flex items-center gap-2">
          {hasSubtasks && !allConfirmed && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleConfirm}
              disabled={isConfirming}
            >
              {isConfirming ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCheck className="h-4 w-4" />
              )}
              {isConfirming ? "Confirming…" : "Confirm"}
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
        </div>
      </CardHeader>

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
            />
          ))}
        </CardContent>
      )}
    </Card>
  );
}
