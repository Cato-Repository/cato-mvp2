"use client";

import { useAction, useMutation, useQuery } from "convex/react";
import { UserButton } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useState } from "react";
import { ActiveSessionPanel } from "@/app/today/ActiveSessionPanel";

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

type Subtask = {
  _id: Id<"subtasks">;
  title: string;
  estimatedMinutes: number;
  userEditedMinutes?: number;
  difficulty: string;
  completed: boolean;
  confirmed?: boolean;
};

function SubtaskRow({
  subtask,
  sessionInProgress,
  onStart,
}: {
  subtask: Subtask;
  sessionInProgress: boolean;
  onStart: (sessionId: Id<"sessions">, subtaskTitle: string) => void;
}) {
  const updateSubtask = useMutation(api.subtasks.updateSubtask);
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
      onStart(sessionId, subtask.title);
    } finally {
      setIsStarting(false);
    }
  }

  if (isEditing) {
    return (
      <li className="flex items-center gap-2">
        <input
          className="border rounded px-1 flex-1"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <input
          type="number"
          className="border rounded px-1 w-16"
          value={minutes}
          onChange={(e) => setMinutes(e.target.value)}
        />
        <select
          className="border rounded px-1"
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value)}
        >
          <option value="easy">easy</option>
          <option value="medium">medium</option>
          <option value="hard">hard</option>
        </select>
        <button type="button" className="underline" onClick={saveEdit}>
          Save
        </button>
        <button
          type="button"
          className="underline"
          onClick={() => setIsEditing(false)}
        >
          Cancel
        </button>
      </li>
    );
  }

  const minutesDisplay = subtask.userEditedMinutes ?? subtask.estimatedMinutes;

  return (
    <li className="flex items-center gap-2">
      {subtask.confirmed && <span title="Confirmed">✓</span>}
      <span className="flex-1">{subtask.title}</span>
      <span>{minutesDisplay} min</span>
      <span className="text-gray-500">{subtask.difficulty}</span>
      <button type="button" className="underline" onClick={startEditing}>
        Edit
      </button>
      {subtask.confirmed && (
        <button
          type="button"
          onClick={handleStart}
          disabled={sessionInProgress || isStarting}
          className="border rounded px-2 py-0.5 disabled:opacity-50"
        >
          {isStarting ? "Starting…" : "Start"}
        </button>
      )}
    </li>
  );
}

function TaskItem({
  task,
  sessionInProgress,
  onStartSession,
}: {
  task: { _id: Id<"tasks">; title: string };
  sessionInProgress: boolean;
  onStartSession: (sessionId: Id<"sessions">, subtaskTitle: string) => void;
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
    <li className="border rounded px-2 py-1 flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span>{task.title}</span>
        <div className="flex items-center gap-2">
          {hasSubtasks && !allConfirmed && (
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isConfirming}
              className="border rounded px-2 py-0.5 text-sm disabled:opacity-50"
            >
              {isConfirming ? "Confirming..." : "Confirm"}
            </button>
          )}
          <button
            type="button"
            onClick={handleBreakDown}
            disabled={isBreakingDown || hasSubtasks}
            className="border rounded px-2 py-0.5 text-sm disabled:opacity-50"
          >
            {isBreakingDown ? "Breaking down..." : "Break down"}
          </button>
        </div>
      </div>

      {hasSubtasks && (
        <ul className="flex flex-col gap-1 pl-4 text-sm">
          {subtasks.map((subtask) => (
            <SubtaskRow
              key={subtask._id}
              subtask={subtask}
              sessionInProgress={sessionInProgress}
              onStart={onStartSession}
            />
          ))}
        </ul>
      )}
    </li>
  );
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
    <main className="mx-auto max-w-xl p-6 flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Today — {today}</h1>
        <UserButton />
      </div>

      {schedule != null && (
        <div className="border rounded px-3 py-2 text-sm">
          If you start now, you can finish by {formatTime(schedule)}.
        </div>
      )}

      {activeSession && (
        <ActiveSessionPanel
          sessionId={activeSession.sessionId}
          subtaskTitle={activeSession.subtaskTitle}
          onEnded={() => setActiveSession(null)}
        />
      )}

      <section className="flex flex-col gap-3">
        <h2 className="font-medium">Tasks</h2>
        <form onSubmit={handleAddTask} className="flex gap-2">
          <input
            className="border rounded px-2 py-1 flex-1"
            placeholder="Task title"
            value={taskTitle}
            onChange={(e) => setTaskTitle(e.target.value)}
          />
          <button type="submit" className="border rounded px-3 py-1">
            Add
          </button>
        </form>
        <ul className="flex flex-col gap-1">
          {tasks?.map((task) => (
            <TaskItem
              key={task._id}
              task={task}
              sessionInProgress={activeSession !== null}
              onStartSession={(sessionId, subtaskTitle) =>
                setActiveSession({ sessionId, subtaskTitle })
              }
            />
          ))}
          {tasks?.length === 0 && (
            <li className="text-sm text-gray-500">No tasks yet.</li>
          )}
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-medium">Timetable</h2>
        <form onSubmit={handleAddCommitment} className="flex flex-wrap gap-2">
          <input
            className="border rounded px-2 py-1 flex-1"
            placeholder="Commitment title"
            value={commitmentTitle}
            onChange={(e) => setCommitmentTitle(e.target.value)}
          />
          <input
            type="time"
            className="border rounded px-2 py-1"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
          <input
            type="time"
            className="border rounded px-2 py-1"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
          />
          <button type="submit" className="border rounded px-3 py-1">
            Add
          </button>
        </form>
        {commitmentError && (
          <p className="text-sm text-red-600">{commitmentError}</p>
        )}
        <ul className="flex flex-col gap-1">
          {commitments?.map((c) => (
            <li key={c._id} className="border rounded px-2 py-1">
              {formatTime(c.startTime)}–{formatTime(c.endTime)} {c.title}
            </li>
          ))}
          {commitments?.length === 0 && (
            <li className="text-sm text-gray-500">No commitments yet.</li>
          )}
        </ul>
      </section>
    </main>
  );
}
