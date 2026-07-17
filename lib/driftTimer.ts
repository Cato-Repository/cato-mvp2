/**
 * Generic sustained-state tracker shared by the webcam and screen signals.
 * Feed it a stream of "is currently a problem" booleans; it reports a
 * completed drift (start time + duration) only once the problem state
 * has ended AND it lasted longer than the threshold — never while the
 * drift is still ongoing.
 */
export function createDriftTracker(
  thresholdMs: number,
  onDriftEnd: (startTime: number, durationSeconds: number) => void
) {
  let problemSince: number | null = null;

  return {
    update(isProblem: boolean) {
      const now = Date.now();

      if (isProblem) {
        if (problemSince === null) {
          problemSince = now;
        }
        return;
      }

      if (problemSince !== null) {
        const durationMs = now - problemSince;
        if (durationMs > thresholdMs) {
          onDriftEnd(problemSince, Math.round(durationMs / 1000));
        }
        problemSince = null;
      }
    },
    reset() {
      problemSince = null;
    },
  };
}
