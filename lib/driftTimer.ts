/**
 * Generic sustained-state tracker shared by the webcam and screen signals.
 * Feed it a stream of "is currently a problem" booleans.
 *
 * - onThresholdCrossed fires once, the moment a continuous problem state
 *   first exceeds the threshold, WHILE IT IS STILL ONGOING — meant for
 *   nudging the user in real time (e.g. an AFK notification).
 * - onDriftEnd fires once the problem state has ENDED, only if it lasted
 *   longer than the threshold — this is the completed-drift record for
 *   logging, never fired while the drift is still ongoing.
 */
export function createDriftTracker(
  thresholdMs: number,
  onDriftEnd: (startTime: number, durationSeconds: number) => void,
  onThresholdCrossed?: () => void
) {
  let problemSince: number | null = null;
  let thresholdNotified = false;

  return {
    update(isProblem: boolean) {
      const now = Date.now();

      if (isProblem) {
        if (problemSince === null) {
          problemSince = now;
          thresholdNotified = false;
        } else if (!thresholdNotified && now - problemSince > thresholdMs) {
          thresholdNotified = true;
          onThresholdCrossed?.();
        }
        return;
      }

      if (problemSince !== null) {
        const durationMs = now - problemSince;
        if (durationMs > thresholdMs) {
          onDriftEnd(problemSince, Math.round(durationMs / 1000));
        }
        problemSince = null;
        thresholdNotified = false;
      }
    },
    reset() {
      problemSince = null;
      thresholdNotified = false;
    },
  };
}
