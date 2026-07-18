"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useState } from "react";
import { CheckCircle2, Pencil, Play, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type Subtask = {
  _id: Id<"subtasks">;
  title: string;
  estimatedMinutes: number;
  userEditedMinutes?: number;
  difficulty: string;
  completed: boolean;
  confirmed?: boolean;
};

function difficultyBadgeVariant(
  difficulty: string
): "secondary" | "outline" | "destructive" {
  if (difficulty === "easy") return "secondary";
  if (difficulty === "hard") return "destructive";
  return "outline";
}

export function SubtaskRow({
  subtask,
  sessionInProgress,
  onStart,
}: {
  subtask: Subtask;
  sessionInProgress: boolean;
  onStart: (
    sessionId: Id<"sessions">,
    subtaskTitle: string,
    estimatedMinutes: number
  ) => void;
}) {
  const updateSubtask = useMutation(api.subtasks.updateSubtask);
  const toggleCompleted = useMutation(api.subtasks.toggleSubtaskCompleted);
  const deleteSubtask = useMutation(api.subtasks.deleteSubtask);
  const startSession = useMutation(api.sessions.startSession);
  const [isEditing, setIsEditing] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [title, setTitle] = useState(subtask.title);
  const [difficulty, setDifficulty] = useState(subtask.difficulty);
  const [minutes, setMinutes] = useState(
    String(subtask.userEditedMinutes ?? subtask.estimatedMinutes)
  );

  function startEditing() {
    setTitle(subtask.title);
    setDifficulty(subtask.difficulty);
    setMinutes(String(subtask.userEditedMinutes ?? subtask.estimatedMinutes));
    setIsEditing(true);
  }

  async function saveEdit() {
    const parsedMinutes = Number(minutes);
    if (!title.trim() || Number.isNaN(parsedMinutes) || parsedMinutes <= 0) {
      return;
    }
    await updateSubtask({
      subtaskId: subtask._id,
      title: title.trim(),
      difficulty,
      minutes: parsedMinutes,
    });
    setIsEditing(false);
  }

  async function handleStart() {
    setIsStarting(true);
    try {
      const sessionId = await startSession({ subtaskId: subtask._id });
      onStart(
        sessionId,
        subtask.title,
        subtask.userEditedMinutes ?? subtask.estimatedMinutes
      );
    } finally {
      setIsStarting(false);
    }
  }

  const minutesDisplay = subtask.userEditedMinutes ?? subtask.estimatedMinutes;

  return (
    <div className="flex items-center gap-2 py-1.5 text-sm">
      <Checkbox
        checked={subtask.completed}
        onCheckedChange={(checked) =>
          toggleCompleted({ subtaskId: subtask._id, completed: checked === true })
        }
        aria-label="Mark subtask done"
      />
      {subtask.confirmed && (
        <CheckCircle2 className="text-primary h-4 w-4 shrink-0" aria-label="Confirmed" />
      )}
      <span
        className={cn(
          "flex-1",
          subtask.completed && "text-muted-foreground line-through"
        )}
      >
        {subtask.title}
      </span>
      <Badge variant="outline">{minutesDisplay} min</Badge>
      <Badge variant={difficultyBadgeVariant(subtask.difficulty)}>
        {subtask.difficulty}
      </Badge>

      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={startEditing}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </DialogTrigger>
          </TooltipTrigger>
          <TooltipContent>Edit subtask</TooltipContent>
        </Tooltip>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit subtask</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor={`title-${subtask._id}`}>Title</Label>
              <Input
                id={`title-${subtask._id}`}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`minutes-${subtask._id}`}>Estimated minutes</Label>
              <Input
                id={`minutes-${subtask._id}`}
                type="number"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Difficulty</Label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">easy</SelectItem>
                  <SelectItem value="medium">medium</SelectItem>
                  <SelectItem value="hard">hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={saveEdit}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog>
        <Tooltip>
          <TooltipTrigger asChild>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="ghost" size="icon">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
          </TooltipTrigger>
          <TooltipContent>Delete subtask</TooltipContent>
        </Tooltip>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this subtask?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{subtask.title}&rdquo; will be permanently removed. This
              can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteSubtask({ subtaskId: subtask._id })}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {subtask.confirmed && (
        <Button
          type="button"
          size="sm"
          onClick={handleStart}
          disabled={sessionInProgress || isStarting}
        >
          <Play className="h-4 w-4" />
          {isStarting ? "Starting…" : "Start"}
        </Button>
      )}
    </div>
  );
}
