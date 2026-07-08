import * as THREE from 'https://unpkg.com/three@0.165.0/build/three.module.js';

export { THREE };

export class ThreeScene {
  constructor(container) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x080914, 0.035);

    this.camera = new THREE.PerspectiveCamera(48, 1, 0.1, 500);
    this.camera.position.set(14, 24, 24);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(this.renderer.domElement);

    this.clock = new THREE.Clock();
    this.disposables = [];
    this.makeLights();
    this.makeBackdrop();
    this.resize();

    this.onResize = () => this.resize();
    window.addEventListener('resize', this.onResize);
  }

  makeLights() {
    this.scene.add(new THREE.AmbientLight(0xb8c4ff, 0.55));

    const key = new THREE.DirectionalLight(0xffedc2, 1.45);
    key.position.set(10, 24, 16);
    this.scene.add(key);

    const rim = new THREE.DirectionalLight(0x889cff, 0.55);
    rim.position.set(-18, 20, -10);
    this.scene.add(rim);
  }

  makeBackdrop() {
    const grid = new THREE.GridHelper(48, 48, 0x42384f, 0x201d2b);
    grid.position.y = -0.05;
    grid.material.transparent = true;
    grid.material.opacity = 0.42;
    this.scene.add(grid);
  }

  resize() {
    const rect = this.container.getBoundingClientRect();
    const w = Math.max(1, rect.width);
    const h = Math.max(1, rect.height);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  updateCamera(t) {
    const r = 34;
    const a = 0.18 + Math.sin(t * 0.04) * 0.05;
    this.camera.position.set(Math.cos(a) * r, 24, Math.sin(a) * r + 22);
    this.camera.lookAt(0, 0, 0);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  destroy() {
    window.removeEventListener('resize', this.onResize);
    this.container.innerHTML = '';
    this.renderer.dispose();
  }
}
