import * as THREE from 'https://unpkg.com/three@0.165.0/build/three.module.js';

export { THREE };

const AUTO_ORBIT_IDLE_SECONDS = 6;
const AUTO_ORBIT_SPEED = 0.06;

export class ThreeScene {
  constructor(container) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x080914, 0.026);

    this.camera = new THREE.PerspectiveCamera(48, 1, 0.1, 600);
    this.target = new THREE.Vector3(2, 3.2, 18);
    this.desiredTarget = this.target.clone();
    this.azimuth = 0.78;
    this.elevation = 0.72;
    this.distance = 52;
    this.desiredDistance = this.distance;
    this.minDistance = 18;
    this.maxDistance = 88;
    this.pointers = new Map();
    this.dragStart = null;
    this.pinchStart = null;
    this.interactionMode = 'orbit';
    this.idleSeconds = 0;
    this.autoOrbitEnabled = false;
    this.autoOrbitActive = false;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.domElement.style.touchAction = 'none';
    container.appendChild(this.renderer.domElement);

    this.clock = new THREE.Clock();
    this.disposables = [];
    this.makeLights();
    this.makeBackdrop();
    this.resize();
    this.setupControls();

    this.onResize = () => this.resize();
    window.addEventListener('resize', this.onResize);
  }

  makeLights() {
    this.scene.add(new THREE.AmbientLight(0xb8c4ff, 0.58));

    const key = new THREE.DirectionalLight(0xffedc2, 1.55);
    key.position.set(10, 30, 16);
    this.scene.add(key);

    const rim = new THREE.DirectionalLight(0x889cff, 0.72);
    rim.position.set(-22, 22, -12);
    this.scene.add(rim);
  }

  makeBackdrop() {
    const grid = new THREE.GridHelper(90, 90, 0x42384f, 0x201d2b);
    grid.position.y = -0.05;
    grid.position.z = 13;
    grid.material.transparent = true;
    grid.material.opacity = 0.36;
    this.scene.add(grid);
  }

  setupControls() {
    const el = this.renderer.domElement;

    this.onWheel = (e) => {
      e.preventDefault();
      this.noteInteraction();
      this.distance = clamp(this.distance + e.deltaY * 0.045, this.minDistance, this.maxDistance);
      this.desiredDistance = this.distance;
    };

    this.onPointerDown = (e) => {
      el.setPointerCapture(e.pointerId);
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      this.noteInteraction();
      if (this.pointers.size === 1) {
        const mode = this.interactionMode === 'pan' || e.button === 1 || e.button === 2 || e.shiftKey ? 'pan' : 'orbit';
        this.dragStart = {
          mode,
          x: e.clientX,
          y: e.clientY,
          azimuth: this.azimuth,
          elevation: this.elevation,
          targetX: this.desiredTarget.x,
          targetZ: this.desiredTarget.z,
          invert: e.pointerType === 'touch' ? -1 : 1
        };
      } else if (this.pointers.size === 2) {
        const [a, b] = [...this.pointers.values()];
        this.pinchStart = { distance: this.distance, span: Math.hypot(a.x - b.x, a.y - b.y) };
      }
    };

    this.onPointerMove = (e) => {
      if (!this.pointers.has(e.pointerId)) return;
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (this.pointers.size === 1 && this.dragStart) {
        const invert = this.dragStart.invert ?? 1;
        const dx = (e.clientX - this.dragStart.x) * invert;
        const dy = (e.clientY - this.dragStart.y) * invert;
        if (this.dragStart.mode === 'pan') {
          const scale = Math.max(0.08, this.distance * 0.0125);
          const rightX = Math.cos(this.azimuth + Math.PI / 2);
          const rightZ = Math.sin(this.azimuth + Math.PI / 2);
          const forwardX = Math.cos(this.azimuth);
          const forwardZ = Math.sin(this.azimuth);
          const targetX = this.dragStart.targetX - dx * scale * rightX + dy * scale * forwardX;
          const targetZ = this.dragStart.targetZ - dx * scale * rightZ + dy * scale * forwardZ;
          this.target.x = targetX;
          this.target.z = targetZ;
          this.desiredTarget.x = targetX;
          this.desiredTarget.z = targetZ;
        } else {
          this.azimuth = this.dragStart.azimuth - dx * 0.008;
          this.elevation = clamp(this.dragStart.elevation + dy * 0.004, 0.34, 1.16);
        }
      }

      if (this.pointers.size === 2 && this.pinchStart) {
        const [a, b] = [...this.pointers.values()];
        const span = Math.hypot(a.x - b.x, a.y - b.y);
        const ratio = this.pinchStart.span / Math.max(1, span);
        this.distance = clamp(this.pinchStart.distance * ratio, this.minDistance, this.maxDistance);
        this.desiredDistance = this.distance;
      }
    };

    this.onPointerUp = (e) => {
      this.pointers.delete(e.pointerId);
      if (this.pointers.size === 0) {
        this.dragStart = null;
        this.pinchStart = null;
      }
    };

    this.onContextMenu = (e) => e.preventDefault();
    el.addEventListener('wheel', this.onWheel, { passive: false });
    el.addEventListener('pointerdown', this.onPointerDown);
    el.addEventListener('pointermove', this.onPointerMove);
    el.addEventListener('pointerup', this.onPointerUp);
    el.addEventListener('pointercancel', this.onPointerUp);
    el.addEventListener('contextmenu', this.onContextMenu);
  }

  resize() {
    const rect = this.container.getBoundingClientRect();
    const w = Math.max(1, rect.width);
    const h = Math.max(1, rect.height);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  setCameraTarget(x, y, z, distance = null, immediate = false) {
    this.desiredTarget.set(x, y, z);
    if (distance !== null) this.desiredDistance = clamp(distance, this.minDistance, this.maxDistance);
    if (immediate) {
      this.target.copy(this.desiredTarget);
      this.distance = this.desiredDistance;
    }
  }

  setInteractionMode(mode = 'orbit') {
    this.interactionMode = mode === 'pan' ? 'pan' : 'orbit';
  }

  panTarget(dx, dz, immediate = false) {
    this.noteInteraction();
    this.desiredTarget.x += dx;
    this.desiredTarget.z += dz;
    if (immediate) {
      this.target.x = this.desiredTarget.x;
      this.target.z = this.desiredTarget.z;
    }
  }

  orbitBy(dAzimuth = 0, dElevation = 0) {
    this.noteInteraction();
    this.azimuth += dAzimuth;
    this.elevation = clamp(this.elevation + dElevation, 0.28, 1.26);
  }

  noteInteraction() {
    this.idleSeconds = 0;
    this.autoOrbitActive = false;
  }

  setAutoOrbitEnabled(enabled) {
    this.autoOrbitEnabled = Boolean(enabled);
    if (!this.autoOrbitEnabled) {
      this.autoOrbitActive = false;
      this.idleSeconds = 0;
    }
  }

  updateCamera(dt = 0) {
    if (this.autoOrbitEnabled) {
      this.idleSeconds += Math.max(0, dt);
      if (!this.autoOrbitActive && this.idleSeconds >= AUTO_ORBIT_IDLE_SECONDS) this.autoOrbitActive = true;
      if (this.autoOrbitActive) this.azimuth += Math.max(0, dt) * AUTO_ORBIT_SPEED;
    }
    this.target.lerp(this.desiredTarget, 0.11);
    this.distance += (this.desiredDistance - this.distance) * 0.11;
    const horizontal = Math.cos(this.elevation) * this.distance;
    const y = Math.sin(this.elevation) * this.distance;
    const x = Math.cos(this.azimuth) * horizontal;
    const z = Math.sin(this.azimuth) * horizontal;
    this.camera.position.set(this.target.x + x, this.target.y + y, this.target.z + z);
    this.camera.lookAt(this.target);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  destroy() {
    const el = this.renderer.domElement;
    el.removeEventListener('wheel', this.onWheel);
    el.removeEventListener('pointerdown', this.onPointerDown);
    el.removeEventListener('pointermove', this.onPointerMove);
    el.removeEventListener('pointerup', this.onPointerUp);
    el.removeEventListener('pointercancel', this.onPointerUp);
    el.removeEventListener('contextmenu', this.onContextMenu);
    window.removeEventListener('resize', this.onResize);
    this.container.innerHTML = '';
    this.renderer.dispose();
  }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
