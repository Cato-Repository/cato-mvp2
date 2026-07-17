import {
  FaceLandmarker,
  FilesetResolver,
  type Category,
  type Matrix,
} from "@mediapipe/tasks-vision";

export type WebcamPresenceState = "present" | "away";

export type WebcamDetectionHandle = {
  stream: MediaStream;
  stop: () => void;
};

// Tunable in isolation from screen detection / drift timing.
const SAMPLE_INTERVAL_MS = 2500;
const EYE_CLOSED_BLENDSHAPE_THRESHOLD = 0.5;
// Sustained downward/away head tilt (e.g. looking down at a phone in the
// lap) beyond this many degrees of pitch counts as "away", even though a
// face is still detected and eyes are open. NOT empirically verified
// against a live camera — see startWebcamPresenceDetection's docstring.
const HEAD_DOWN_PITCH_THRESHOLD_DEGREES = 25;

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
        outputFacialTransformationMatrixes: true,
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
 * Extracts pitch (rotation about the X axis, i.e. nodding up/down) in
 * degrees from MediaPipe's facial transformation matrix. Assumes the
 * matrix is column-major, matching MediaPipe's own Three.js face-effects
 * sample (which feeds this array directly into THREE.Matrix4.fromArray).
 * Sign/axis convention is NOT verified against a live camera.
 */
function getPitchDegrees(matrix: Matrix): number {
  const m = matrix.data;
  const r21 = m[6]; // row 2, col 1 (column-major: col*4 + row)
  const r22 = m[10]; // row 2, col 2
  const pitchRad = Math.atan2(-r21, r22);
  return (pitchRad * 180) / Math.PI;
}

function isHeadTiltedAway(matrices: Matrix[] | undefined) {
  const matrix = matrices?.[0];
  if (!matrix) return false;
  return Math.abs(getPitchDegrees(matrix)) > HEAD_DOWN_PITCH_THRESHOLD_DEGREES;
}

/**
 * Requests webcam access and samples face presence roughly every
 * SAMPLE_INTERVAL_MS. Calls onStateChange with "present" or "away" —
 * "away" covers no-face-detected, sustained eyes-closed, AND a sustained
 * downward/away head tilt (e.g. looking down at a phone in the lap while
 * still technically in frame with eyes open). The head-tilt check is the
 * least certain of the three: it depends on correctly decoding MediaPipe's
 * facial transformation matrix, which has not been verified against a
 * live camera — HEAD_DOWN_PITCH_THRESHOLD_DEGREES and the sign of the
 * pitch calculation in getPitchDegrees are the first things to check if
 * this doesn't behave as expected.
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
    const headTiltedAway =
      hasFace && isHeadTiltedAway(result.facialTransformationMatrixes);

    onStateChange(hasFace && !eyesClosed && !headTiltedAway ? "present" : "away");
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
