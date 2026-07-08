import { ThreeScene } from '../engine/ThreeScene.js';
import { DungeonRenderer } from '../engine/DungeonRenderer.js';
import { AssetRegistry } from '../engine/AssetRegistry.js';
import { DungeonSim } from '../sim/DungeonSim.js';
import { expandScenario } from '../data/generateDungeon.js';

export class ObserveScreen {
  constructor({ scenario, state, onBack }) {
    this.baseScenario = scenario;
    this.scenario = expandScenario(scenario);
    this.state = state;
    this.onBack = onBack;
    this.running = true;
    this.events = [];
    this.raf = null;
  }

  mount(root) {
    const el = document.createElement('section');
    el.className = 'screen observe';
    el.innerHTML = `
      <div class="viewport">
        <div class="legend">
          <strong>${this.scenario.name}</strong>
          <span>Drag to rotate. Wheel or pinch to zoom. Slow ant-farm mode.</span>
        </div>
      </div>
      <aside class="hud">
        <h2>Observation</h2>
        <p>${this.scenario.description}</p>
        <div class="metrics">
          <div class="metric"><b data-metric="party">0</b><span>party inside</span></div>
          <div class="metric"><b data-metric="dungeon">0</b><span>dungeon awake</span></div>
          <div class="metric"><b data-metric="cycles">1</b><span>return cycle</span></div>
          <div class="metric"><b data-metric="fallen">0</b><span>fallen mice</span></div>
        </div>
        <div class="actions">
          <button class="btn" data-action="pause">일시정지</button>
          <button class="btn" data-action="noise">유리 톡톡</button>
          <button class="btn" data-action="coin">동전 떨구기</button>
          <button class="btn warn" data-action="back">나가기</button>
        </div>
        <div class="log" data-log></div>
      </aside>
    `;

    root.appendChild(el);
    this.el = el;
    this.viewport = el.querySelector('.viewport');
    this.logEl = el.querySelector('[data-log]');

    this.assets = new AssetRegistry();
    this.assets.loadManifest();
    this.three = new ThreeScene(this.viewport);
    this.renderer = new DungeonRenderer(this.three, this.scenario, this.assets);
    this.sim = new DungeonSim(this.scenario, {
      onEvent: (event) => this.pushEvent(event.text)
    });

    el.querySelector('[data-action="pause"]').addEventListener('click', (e) => {
      this.running = !this.running;
      e.currentTarget.textContent = this.running ? '일시정지' : '재생';
    });
    el.querySelector('[data-action="noise"]').addEventListener('click', () => this.sim.makeNoise(this.pickRoom(['hall', 'crypt', 'lair', 'hatchery'])));
    el.querySelector('[data-action="coin"]').addEventListener('click', () => this.sim.dropCoin(this.pickRoom(['treasure', 'hall', 'lair', 'gate'])));
    el.querySelector('[data-action="back"]').addEventListener('click', this.onBack);

    this.loop();
  }

  pickRoom(kinds) {
    return this.scenario.rooms.find(r => kinds.includes(r.kind))?.id ?? this.scenario.rooms[0].id;
  }

  pushEvent(text) {
    this.events.unshift(text);
    this.events = this.events.slice(0, 14);
    this.logEl.innerHTML = this.events.map(e => `<div class="log-entry">${escapeHtml(e)}</div>`).join('');
  }

  updateMetrics() {
    const m = this.sim.metrics();
    for (const [key, value] of Object.entries(m)) {
      const el = this.el.querySelector(`[data-metric="${key}"]`);
      if (el) el.textContent = value;
    }
  }

  loop() {
    const dt = Math.min(this.three.clock.getDelta(), 0.045);
    if (this.running) this.sim.update(dt * 0.62);
    this.renderer.renderState(this.sim.snapshot());
    this.updateMetrics();
    this.three.updateCamera(this.sim.time);
    this.three.render();
    this.raf = requestAnimationFrame(() => this.loop());
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    this.renderer?.destroy();
    this.three?.destroy();
    this.el?.remove();
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
