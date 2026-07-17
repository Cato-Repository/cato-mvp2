export type ScreenActivityState = "active" | "idle";

export type ScreenDetectionHandle = {
  stream: MediaStream;
  stop: () => void;
};

// Tunable in isolation from webcam detection / drift timing.
const SAMPLE_INTERVAL_MS = 2000;
const IDLE_THRESHOLD_MS = 45000;
// Downscaled canvas keeps per-frame diffing cheap; fraction of pixels that
// must change (0-1 of max per-channel delta) to count as "activity".
const CANVAS_WIDTH = 160;
const CANVAS_HEIGHT = 90;
const CHANGE_THRESHOLD = 0.02;

/**
 * The Screen Capture API exposes only a raw video MediaStream — there is
 * no browser API for literal cursor coordinates/movement events. This
 * requests `cursor: "always"` (so the cursor is burned into the captured
 * frames) and treats frame-to-frame pixel change as the practical proxy
 * for "activity happening on screen". It is intentionally shallow: no
 * pixel content is interpreted or classified, only how much changed.
 */
export async function startScreenActivityDetection(
  onStateChange: (state: ScreenActivityState) => void
): Promise<ScreenDetectionHandle> {
  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: { cursor: "always" } as MediaTrackConstraints,
  });

  const video = document.createElement("video");
  video.srcObject = stream;
  video.muted = true;
  video.playsInline = true;
  await video.play();

  const canvas = document.createElement("canvas");
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (ctx === null) {
    throw new Error("Could not create 2D canvas context");
  }

  let previousFrame: Uint8ClampedArray | null = null;
  let lastActivityAt = Date.now();
  let stopped = false;

  function sample() {
    if (stopped) return;

    ctx!.drawImage(video, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    const frame = ctx!.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT).data;

    if (previousFrame !== null) {
      let totalDelta = 0;
      for (let i = 0; i < frame.length; i += 4) {
        totalDelta += Math.abs(frame[i] - previousFrame[i]);
      }
      const avgDelta = totalDelta / (frame.length / 4) / 255;
      if (avgDelta > CHANGE_THRESHOLD) {
        lastActivityAt = Date.now();
      }
    }
    previousFrame = frame;

    const idleFor = Date.now() - lastActivityAt;
    onStateChange(idleFor > IDLE_THRESHOLD_MS ? "idle" : "active");
  }

  const intervalId = window.setInterval(sample, SAMPLE_INTERVAL_MS);

  // If the user stops sharing via the browser's own "Stop sharing" control,
  // treat that the same as calling stop() — but the caller still owns
  // tearing down anything else tied to the session.
  stream.getVideoTracks()[0]?.addEventListener("ended", () => {
    stopped = true;
    window.clearInterval(intervalId);
  });

  return {
    stream,
    stop: () => {
      stopped = true;
      window.clearInterval(intervalId);
      stream.getTracks().forEach((track) => track.stop());
    },
  };
}
