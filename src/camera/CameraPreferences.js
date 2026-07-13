const STORAGE_KEY = 'sleeping-citadel.camera.v1';

export const DEFAULT_CAMERA_SETTINGS = Object.freeze({
  rotateSensitivity: 1,
  panSensitivity: 1,
  zoomSensitivity: 1,
  invertY: false,
  edgeScroll: false,
  reducedMotion: false
});

export function loadCameraSettings(storage = globalThis.localStorage) {
  try {
    const parsed = JSON.parse(storage?.getItem?.(STORAGE_KEY) ?? 'null');
    return normalizeCameraSettings(parsed);
  } catch {
    return { ...DEFAULT_CAMERA_SETTINGS };
  }
}

export function saveCameraSettings(settings, storage = globalThis.localStorage) {
  const normalized = normalizeCameraSettings(settings);
  try { storage?.setItem?.(STORAGE_KEY, JSON.stringify(normalized)); }
  catch { /* Preferences are optional; camera input must continue. */ }
  return normalized;
}

export function normalizeCameraSettings(value = {}) {
  return {
    rotateSensitivity: clampNumber(value.rotateSensitivity, 0.45, 2.2, 1),
    panSensitivity: clampNumber(value.panSensitivity, 0.45, 2.2, 1),
    zoomSensitivity: clampNumber(value.zoomSensitivity, 0.45, 2.2, 1),
    invertY: Boolean(value.invertY),
    edgeScroll: Boolean(value.edgeScroll),
    reducedMotion: Boolean(value.reducedMotion)
  };
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : fallback;
}
