"use client";

import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useState } from "react";

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

function TaskItem({ task }: { task: { _id: Id<"tasks">; title: string } }) {
  const subtasks = useQuery(api.subtasks.getSubtasksForTask, {
    taskId: task._id,
  });
  const generateBreakdown = useAction(api.breakdown.generateBreakdown);
  const updateEstimate = useMutation(api.subtasks.updateSubtaskEstimate);

  const [isBreakingDown, setIsBreakingDown] = useState(false);
  const [editingId, setEditingId] = useState<Id<"subtasks"> | null>(null);
  const [editValue, setEditValue] = useState("");

  async function handleBreakDown() {
    setIsBreakingDown(true);
    try {
      await generateBreakdown({ taskId: task._id });
    } finally {
      setIsBreakingDown(false);
    }
  }

  function startEditing(subtaskId: Id<"subtasks">, currentMinutes: number) {
    setEditingId(subtaskId);
    setEditValue(String(currentMinutes));
  }

  async function commitEdit(subtaskId: Id<"subtasks">) {
    const minutes = Number(editValue);
    if (!Number.isNaN(minutes) && minutes > 0) {
      await updateEstimate({ subtaskId, minutes });
    }
    setEditingId(null);
  }

  return (
    <li className="border rounded px-2 py-1 flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span>{task.title}</span>
        <button
          type="button"
          onClick={handleBreakDown}
          disabled={isBreakingDown}
          className="border rounded px-2 py-0.5 text-sm disabled:opacity-50"
        >
          {isBreakingDown ? "Breaking down..." : "Break down"}
        </button>
      </div>

      {subtasks !== undefined && subtasks.length > 0 && (
        <ul className="flex flex-col gap-1 pl-4 text-sm">
          {subtasks.map((subtask) => {
            const minutes = subtask.userEditedMinutes ?? subtask.estimatedMinutes;
            return (
              <li key={subtask._id} className="flex items-center gap-2">
                <span className="flex-1">{subtask.title}</span>
                {editingId === subtask._id ? (
                  <input
                    type="number"
                    autoFocus
                    className="border rounded px-1 w-16"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={() => commitEdit(subtask._id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitEdit(subtask._id);
                    }}
                  />
                ) : (
                  <button
                    type="button"
                    className="underline decoration-dotted"
                    onClick={() => startEditing(subtask._id, minutes)}
                  >
                    {minutes} min
                  </button>
                )}
                <span className="text-gray-500">{subtask.difficulty}</span>
              </li>
            );
          })}
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

  async function handleAddTask(e: React.FormEvent) {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    await createTask({ title: taskTitle.trim(), date: today });
    setTaskTitle("");
  }

  async function handleAddCommitment(e: React.FormEvent) {
    e.preventDefault();
    if (!commitmentTitle.trim() || !startTime || !endTime) return;
    await createCommitment({
      title: commitmentTitle.trim(),
      date: today,
      startTime: timeStringToTimestamp(today, startTime),
      endTime: timeStringToTimestamp(today, endTime),
    });
    setCommitmentTitle("");
    setStartTime("");
    setEndTime("");
  }

  return (
    <main className="mx-auto max-w-xl p-6 flex flex-col gap-8">
      <h1 className="text-xl font-semibold">Today — {today}</h1>

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
            <TaskItem key={task._id} task={task} />
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
