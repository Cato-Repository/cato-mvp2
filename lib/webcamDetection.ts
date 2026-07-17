import {
  FaceLandmarker,
  FilesetResolver,
  type Category,
} from "@mediapipe/tasks-vision";

export type WebcamPresenceState = "present" | "away";

export type WebcamDetectionHandle = {
  stream: MediaStream;
  stop: () => void;
};

// Tunable in isolation from screen detection / drift timing.
const SAMPLE_INTERVAL_MS = 2500;
const EYE_CLOSED_BLENDSHAPE_THRESHOLD = 0.5;

const WASM_BASE_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm";
const MODEL_ASSET_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

let landmarkerPromise: Promise<FaceLandmarker> | null = null;

function loadLandmarker(): Promise<FaceLandmarker> {
  if (landmarkerPromise === null) {
    landmarkerPromise = (async () => {
      const fileset = await FilesetResolver.forVisionTasks(WASM_BASE_URL);
      return FaceLandmarker.createFromOptions(fileset, {
        baseOptions: {
          modelAssetPath: MODEL_ASSET_URL,
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numFaces: 1,
        outputFaceBlendshapes: true,
      });
    })();
  }
  return landmarkerPromise;
}

function isEyesClosed(blendshapes: Category[] | undefined) {
  if (!blendshapes) return false;
  const left =
    blendshapes.find((c) => c.categoryName === "eyeBlinkLeft")?.score ?? 0;
  const right =
    blendshapes.find((c) => c.categoryName === "eyeBlinkRight")?.score ?? 0;
  return (left + right) / 2 > EYE_CLOSED_BLENDSHAPE_THRESHOLD;
}

/**
 * Requests webcam access and samples face presence roughly every
 * SAMPLE_INTERVAL_MS. Calls onStateChange with "present" or "away"
 * ("away" covers both no-face-detected and sustained eyes-closed).
 * Throws if getUserMedia is denied/unavailable — caller decides how to
 * handle that (this module never silently swallows permission errors).
 */
export async function startWebcamPresenceDetection(
  onStateChange: (state: WebcamPresenceState) => void
): Promise<WebcamDetectionHandle> {
  const stream = await navigator.mediaDevices.getUserMedia({ video: true });

  const video = document.createElement("video");
  video.srcObject = stream;
  video.muted = true;
  video.playsInline = true;
  await video.play();

  const landmarker = await loadLandmarker();

  let stopped = false;

  function sample() {
    if (stopped) return;
    const result = landmarker.detectForVideo(video, performance.now());

    const hasFace = result.faceLandmarks.length > 0;
    const eyesClosed = hasFace && isEyesClosed(result.faceBlendshapes[0]?.categories);

    onStateChange(hasFace && !eyesClosed ? "present" : "away");
  }

  const intervalId = window.setInterval(sample, SAMPLE_INTERVAL_MS);
  sample();

  return {
    stream,
    stop: () => {
      stopped = true;
      window.clearInterval(intervalId);
      stream.getTracks().forEach((track) => track.stop());
    },
  };
}
