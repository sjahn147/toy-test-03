import * as THREE from 'https://unpkg.com/three@0.165.0/build/three.module.js';

export { THREE };

export class ThreeScene {
  constructor(container) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x080914, 0.026);

    this.camera = new THREE.PerspectiveCamera(48, 1, 0.1, 600);
    this.target = new THREE.Vector3(2, 3.2, 18);
    this.azimuth = 0.78;
    this.elevation = 0.72;
    this.distance = 52;
    this.minDistance = 18;
    this.maxDistance = 88;
    this.pointers = new Map();
    this.dragStart = null;
    this.pinchStart = null;

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
    const grid = new THREE.GridHelper(70, 70, 0x42384f, 0x201d2b);
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
      this.distance = clamp(this.distance + e.deltaY * 0.045, this.minDistance, this.maxDistance);
    };

    this.onPointerDown = (e) => {
      el.setPointerCapture(e.pointerId);
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (this.pointers.size === 1) {
        this.dragStart = { x: e.clientX, y: e.clientY, azimuth: this.azimuth, elevation: this.elevation };
      } else if (this.pointers.size === 2) {
        const [a, b] = [...this.pointers.values()];
        this.pinchStart = { distance: this.distance, span: Math.hypot(a.x - b.x, a.y - b.y) };
      }
    };

    this.onPointerMove = (e) => {
      if (!this.pointers.has(e.pointerId)) return;
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (this.pointers.size === 1 && this.dragStart) {
        const dx = e.clientX - this.dragStart.x;
        const dy = e.clientY - this.dragStart.y;
        this.azimuth = this.dragStart.azimuth - dx * 0.008;
        this.elevation = clamp(this.dragStart.elevation + dy * 0.004, 0.34, 1.16);
      }

      if (this.pointers.size === 2 && this.pinchStart) {
        const [a, b] = [...this.pointers.values()];
        const span = Math.hypot(a.x - b.x, a.y - b.y);
        const ratio = this.pinchStart.span / Math.max(1, span);
        this.distance = clamp(this.pinchStart.distance * ratio, this.minDistance, this.maxDistance);
      }
    };

    this.onPointerUp = (e) => {
      this.pointers.delete(e.pointerId);
      if (this.pointers.size === 0) {
        this.dragStart = null;
        this.pinchStart = null;
      }
    };

    el.addEventListener('wheel', this.onWheel, { passive: false });
    el.addEventListener('pointerdown', this.onPointerDown);
    el.addEventListener('pointermove', this.onPointerMove);
    el.addEventListener('pointerup', this.onPointerUp);
    el.addEventListener('pointercancel', this.onPointerUp);
  }

  resize() {
    const rect = this.container.getBoundingClientRect();
    const w = Math.max(1, rect.width);
    const h = Math.max(1, rect.height);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  updateCamera() {
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
    window.removeEventListener('resize', this.onResize);
    this.container.innerHTML = '';
    this.renderer.dispose();
  }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
