import assert from 'node:assert/strict';
import { DEFAULT_CAMERA_SETTINGS, loadCameraSettings, normalizeCameraSettings, saveCameraSettings } from '../src/camera/CameraPreferences.js';

const memory = new Map();
const storage = { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value) };
assert.deepEqual(loadCameraSettings(storage), DEFAULT_CAMERA_SETTINGS);
const saved = saveCameraSettings({ rotateSensitivity: 9, panSensitivity: 0, zoomSensitivity: 1.4, invertY: true, edgeScroll: true }, storage);
assert.equal(saved.rotateSensitivity, 2.2);
assert.equal(saved.panSensitivity, 0.45);
assert.equal(saved.zoomSensitivity, 1.4);
assert.equal(saved.invertY, true);
assert.deepEqual(loadCameraSettings(storage), saved);
assert.equal(normalizeCameraSettings({ reducedMotion: 1 }).reducedMotion, true);
console.log('WP10 camera preferences smoke passed');
