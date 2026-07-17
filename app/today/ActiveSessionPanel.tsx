"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  startWebcamPresenceDetection,
  type WebcamDetectionHandle,
  type WebcamPresenceState,
} from "@/lib/webcamDetection";
import {
  startScreenActivityDetection,
  type ScreenDetectionHandle,
  type ScreenActivityState,
} from "@/lib/screenDetection";
import { createDriftTracker } from "@/lib/driftTimer";

const WEBCAM_AWAY_THRESHOLD_MS = 20_000;
const SCREEN_IDLE_THRESHOLD_MS = 45_000;
const FOCUS_STREAK_MS = 10 * 60 * 1000;
const TOAST_DURATION_MS = 4_000;

type WebcamStatus = WebcamPresenceState | "pending" | "unavailable";
type ScreenStatus = ScreenActivityState | "not-shared";

function formatElapsed(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function ActiveSessionPanel({
  sessionId,
  subtaskTitle,
  onEnded,
}: {
  sessionId: Id<"sessions">;
  subtaskTitle: string;
  onEnded: () => void;
}) {
  const session = useQuery(api.sessions.getSession, { sessionId });
  const pauseSession = useMutation(api.sessions.pauseSession);
  const resumeSession = useMutation(api.sessions.resumeSession);
  const endSession = useMutation(api.sessions.endSession);
  const setWebcamAvailability = useMutation(api.sessions.setWebcamAvailability);
  const logDriftEvent = useMutation(api.driftEvents.logDriftEvent);
  const logFocusStreak = useMutation(api.focusStreaks.logFocusStreak);

  const [webcamStatus, setWebcamStatus] = useState<WebcamStatus>("pending");
  const [screenStatus, setScreenStatus] = useState<ScreenStatus>("not-shared");
  const [toast, setToast] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [isEnding, setIsEnding] = useState(false);

  // Refs mirror the latest state for use inside detector callbacks, which
  // are set up once (closures would otherwise see stale values).
  const statusRef = useRef(session?.status);
  const webcamStatusRef = useRef<WebcamStatus>("pending");
  const screenStatusRef = useRef<ScreenStatus>("not-shared");
  const webcamHandleRef = useRef<WebcamDetectionHandle | null>(null);
  const screenHandleRef = useRef<ScreenDetectionHandle | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);

  const webcamDriftRef = useRef(
    createDriftTracker(WEBCAM_AWAY_THRESHOLD_MS, (startTime, durationSeconds) => {
      logDriftEvent({ sessionId, type: "webcam_away", startTime, durationSeconds });
    })
  );
  const screenDriftRef = useRef(
    createDriftTracker(SCREEN_IDLE_THRESHOLD_MS, (startTime, durationSeconds) => {
      logDriftEvent({ sessionId, type: "screen_idle", startTime, durationSeconds });
    })
  );
  const focusRef = useRef<{ focusedSince: number | null; loggedThroughMs: number }>({
    focusedSince: null,
    loggedThroughMs: 0,
  });

  useEffect(() => {
    statusRef.current = session?.status;
  }, [session?.status]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  function showToast(message: string) {
    setToast(message);
    if (toastTimeoutRef.current !== null) {
      window.clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = window.setTimeout(
      () => setToast(null),
      TOAST_DURATION_MS
    );
  }

  function updateFocusTracking() {
    const isDrifting =
      webcamStatusRef.current === "away" || screenStatusRef.current === "idle";
    const nowMs = Date.now();

    if (isDrifting) {
      focusRef.current.focusedSince = null;
      focusRef.current.loggedThroughMs = 0;
      return;
    }

    if (focusRef.current.focusedSince === null) {
      focusRef.current.focusedSince = nowMs;
      focusRef.current.loggedThroughMs = 0;
      return;
    }

    const elapsed = nowMs - focusRef.current.focusedSince;
    if (elapsed - focusRef.current.loggedThroughMs >= FOCUS_STREAK_MS) {
      const streakStart =
        focusRef.current.focusedSince + focusRef.current.loggedThroughMs;
      focusRef.current.loggedThroughMs += FOCUS_STREAK_MS;
      logFocusStreak({ sessionId, startTime: streakStart, durationSeconds: 600 });
      showToast("🔥 Focused for 10 minutes!");
    }
  }

  // Webcam detection: requested once for the panel's lifetime. Signal
  // updates are ignored while the session is paused (tracked via
  // statusRef), rather than tearing down and re-requesting the camera on
  // every pause/resume.
  useEffect(() => {
    let cancelled = false;

    startWebcamPresenceDetection((state) => {
      if (statusRef.current !== "active") return;
      setWebcamStatus(state);
      webcamStatusRef.current = state;
      webcamDriftRef.current.update(state === "away");
      updateFocusTracking();
    })
      .then((handle) => {
        if (cancelled) {
          handle.stop();
          return;
        }
        webcamHandleRef.current = handle;
      })
      .catch(() => {
        if (cancelled) return;
        setWebcamStatus("unavailable");
        webcamStatusRef.current = "unavailable";
        setWebcamAvailability({ sessionId, available: false });
      });

    return () => {
      cancelled = true;
      webcamHandleRef.current?.stop();
      webcamHandleRef.current = null;
      screenHandleRef.current?.stop();
      screenHandleRef.current = null;
    };
    // Intentionally only re-runs if the session identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  async function handleShareScreen() {
    try {
      const handle = await startScreenActivityDetection((state) => {
        if (statusRef.current !== "active") return;
        setScreenStatus(state);
        screenStatusRef.current = state;
        screenDriftRef.current.update(state === "idle");
        updateFocusTracking();
      });
      screenHandleRef.current = handle;
      setScreenStatus("active");
      screenStatusRef.current = "active";
    } catch {
      // User declined or it's unsupported — screen signal just stays off.
    }
  }

  async function handlePause() {
    await pauseSession({ sessionId });
  }

  async function handleResume() {
    await resumeSession({ sessionId });
  }

  async function handleEnd() {
    setIsEnding(true);
    try {
      webcamHandleRef.current?.stop();
      webcamHandleRef.current = null;
      screenHandleRef.current?.stop();
      screenHandleRef.current = null;
      await endSession({ sessionId });
      onEnded();
    } finally {
      setIsEnding(false);
    }
  }

  if (session === undefined) {
    return null;
  }
  if (session === null) {
    return null;
  }

  const elapsedMs = now - session.startTime;

  return (
    <div className="border rounded px-3 py-3 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="font-medium">Working on: {subtaskTitle}</span>
        <span className="text-sm">{formatElapsed(elapsedMs)}</span>
      </div>

      <div className="flex items-center gap-3 text-xs text-gray-500">
        <span>
          Webcam:{" "}
          {webcamStatus === "pending"
            ? "starting…"
            : webcamStatus === "unavailable"
              ? "unavailable"
              : webcamStatus}
        </span>
        <span>
          Screen:{" "}
          {screenStatus === "not-shared" ? "not shared" : screenStatus}
        </span>
      </div>

      {toast && (
        <div className="border rounded px-2 py-1 text-sm w-fit">{toast}</div>
      )}

      <div className="flex items-center gap-2">
        {session.status === "active" && (
          <button
            type="button"
            onClick={handlePause}
            className="border rounded px-3 py-1 text-sm"
          >
            Pause
          </button>
        )}
        {session.status === "paused" && (
          <button
            type="button"
            onClick={handleResume}
            className="border rounded px-3 py-1 text-sm"
          >
            Resume
          </button>
        )}
        {screenStatus === "not-shared" && (
          <button
            type="button"
            onClick={handleShareScreen}
            className="border rounded px-3 py-1 text-sm"
          >
            Share screen
          </button>
        )}
        <button
          type="button"
          onClick={handleEnd}
          disabled={isEnding}
          className="border rounded px-3 py-1 text-sm disabled:opacity-50"
        >
          {isEnding ? "Ending…" : "End Session"}
        </button>
      </div>
    </div>
  );
}
