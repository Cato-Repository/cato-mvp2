"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  Loader2,
  MonitorCheck,
  MonitorOff,
  MonitorUp,
  Pause,
  Play,
  Square,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
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
import { ensureNotificationPermission, notifyAfk } from "@/lib/notifications";

const WEBCAM_AWAY_THRESHOLD_MS = 20_000;
const SCREEN_IDLE_THRESHOLD_MS = 45_000;
const FOCUS_STREAK_MS = 10 * 60 * 1000;

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
  estimatedMinutes,
  onEnded,
}: {
  sessionId: Id<"sessions">;
  subtaskTitle: string;
  estimatedMinutes: number;
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
  const [afkWarning, setAfkWarning] = useState<string | null>(null);
  const [showScreenShareInfo, setShowScreenShareInfo] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [isEnding, setIsEnding] = useState(false);

  // Refs mirror the latest state for use inside detector callbacks, which
  // are set up once (closures would otherwise see stale values).
  const statusRef = useRef(session?.status);
  const webcamStatusRef = useRef<WebcamStatus>("pending");
  const screenStatusRef = useRef<ScreenStatus>("not-shared");
  const webcamHandleRef = useRef<WebcamDetectionHandle | null>(null);
  const screenHandleRef = useRef<ScreenDetectionHandle | null>(null);

  const webcamDriftRef = useRef(
    createDriftTracker(
      WEBCAM_AWAY_THRESHOLD_MS,
      (startTime, durationSeconds) => {
        logDriftEvent({ sessionId, type: "webcam_away", startTime, durationSeconds });
      },
      () => {
        const message = "You've been away from the camera — still there?";
        setAfkWarning(message);
        notifyAfk(message);
      }
    )
  );
  const screenDriftRef = useRef(
    createDriftTracker(
      SCREEN_IDLE_THRESHOLD_MS,
      (startTime, durationSeconds) => {
        logDriftEvent({ sessionId, type: "screen_idle", startTime, durationSeconds });
      },
      () => {
        const message = "No screen activity for a while — still working?";
        setAfkWarning(message);
        notifyAfk(message);
      }
    )
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

  function updateFocusTracking() {
    const isDrifting =
      webcamStatusRef.current === "away" || screenStatusRef.current === "idle";
    const nowMs = Date.now();

    if (isDrifting) {
      focusRef.current.focusedSince = null;
      focusRef.current.loggedThroughMs = 0;
      return;
    }

    setAfkWarning(null);

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
      toast("🔥 Focused for 10 minutes!");
    }
  }

  // Webcam detection: requested once for the panel's lifetime. Signal
  // updates are ignored while the session is paused (tracked via
  // statusRef), rather than tearing down and re-requesting the camera on
  // every pause/resume.
  useEffect(() => {
    let cancelled = false;

    void ensureNotificationPermission();

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
    setShowScreenShareInfo(false);
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
    return (
      <Card>
        <CardContent className="py-6">
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }
  if (session === null) {
    return null;
  }

  const elapsedMs = now - session.startTime;
  const progressPercent = Math.min(
    100,
    (elapsedMs / 1000 / 60 / estimatedMinutes) * 100
  );

  return (
    <Card className="border-primary/30">
      <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-base font-normal">
          Working on: {subtaskTitle}
        </CardTitle>
        <span className="font-mono text-sm">{formatElapsed(elapsedMs)}</span>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Progress value={progressPercent} />

        <div className="flex items-center gap-2">
          <Badge variant={webcamStatus === "present" ? "secondary" : "outline"}>
            {webcamStatus === "pending" && (
              <Loader2 className="h-3 w-3 animate-spin" />
            )}
            {webcamStatus === "pending"
              ? "starting…"
              : webcamStatus === "unavailable"
                ? "unavailable"
                : webcamStatus}
          </Badge>
          <Badge variant={screenStatus === "active" ? "secondary" : "outline"}>
            {screenStatus === "active" ? (
              <MonitorCheck className="h-3 w-3" />
            ) : (
              <MonitorOff className="h-3 w-3" />
            )}
            {screenStatus === "not-shared" ? "not shared" : screenStatus}
          </Badge>
        </div>

        <Dialog open={showScreenShareInfo} onOpenChange={setShowScreenShareInfo}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Why share your screen?</DialogTitle>
              <DialogDescription>
                On top of your webcam, sharing your screen lets Cato notice if
                you&apos;ve gone idle there too — useful since you might look
                away from the camera for a second while still actively
                working, or vice versa. It&apos;s entirely optional: nothing
                is uploaded, only local pixel-level activity is checked
                on-device in your browser. You can decline and Cato will keep
                tracking via webcam alone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowScreenShareInfo(false)}
              >
                Not now
              </Button>
              <Button type="button" onClick={handleShareScreen}>
                Share my screen
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={afkWarning !== null} onOpenChange={(open) => !open && setAfkWarning(null)}>
          <DialogContent>
            <DialogHeader className="text-center sm:text-center">
              <DialogTitle>Are you still there?</DialogTitle>
              <DialogDescription>
                Let&apos;s continue – One small action is enough to get moving!
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="sm:justify-center">
              <Button
                type="button"
                onClick={() => setAfkWarning(null)}
              >
                I&apos;m still here!
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setAfkWarning(null);
                  void handlePause();
                }}
              >
                Let me rest for 10 mins
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className="flex items-center gap-2">
          {session.status === "active" && (
            <Button type="button" variant="outline" size="sm" onClick={handlePause}>
              <Pause className="h-4 w-4" />
              Pause
            </Button>
          )}
          {session.status === "paused" && (
            <Button type="button" variant="outline" size="sm" onClick={handleResume}>
              <Play className="h-4 w-4" />
              Resume
            </Button>
          )}
          {screenStatus === "not-shared" && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowScreenShareInfo(true)}
            >
              <MonitorUp className="h-4 w-4" />
              Share screen
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleEnd}
            disabled={isEnding}
            className="text-destructive hover:text-destructive ml-auto"
          >
            {isEnding ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Square className="h-4 w-4" />
            )}
            {isEnding ? "Ending…" : "End Session"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
