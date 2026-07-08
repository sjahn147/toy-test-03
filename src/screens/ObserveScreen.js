import { ThreeScene } from '../engine/ThreeScene.js';
import { DungeonRenderer } from '../engine/DungeonRenderer.js';
import { AssetRegistry } from '../engine/AssetRegistry.js';
import { DungeonSim } from '../sim/DungeonSim.js';
import { expandScenario } from '../data/generateDungeon.js';

export class ObserveScreen {
  constructor({ scenario, state, onBack }) {
    this.baseScenario = scenario;
    this.scenario = scenario.useGeneratedMap ? expandScenario(scenario) : scenario;
    this.state = state;
    this.onBack = onBack;
    this.running = true;
    this.events = [];
    this.raf = null;
    this.selectedAgentId = null;
    this.pointerDown = null;
  }

  mount(root) {
    const el = document.createElement('section');
    el.className = 'screen observe';
    el.innerHTML = `
      <div class="viewport">
        <div class="legend">
          <strong>${this.scenario.name}</strong>
          <span>Drag to rotate. Wheel or pinch to zoom. Tap a creature to inspect.</span>
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
        <section class="inspect-card" data-inspect>
          <div class="inspect-empty">Tap a creature in the dungeon to inspect its tiny bad decisions.</div>
        </section>
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
    this.inspectEl = el.querySelector('[data-inspect]');

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

    this.viewport.addEventListener('pointerdown', (event) => {
      this.pointerDown = { x: event.clientX, y: event.clientY, t: performance.now() };
    });
    this.viewport.addEventListener('pointerup', (event) => {
      if (!this.pointerDown) return;
      const dx = event.clientX - this.pointerDown.x;
      const dy = event.clientY - this.pointerDown.y;
      const moved = Math.hypot(dx, dy);
      const elapsed = performance.now() - this.pointerDown.t;
      this.pointerDown = null;
      if (moved > 10 || elapsed > 450) return;
      const agentId = this.renderer.pickAgent(event.clientX, event.clientY);
      this.selectedAgentId = agentId;
      this.renderInspectPanel();
    });

    this.loop();
  }

  pickRoom(kinds) {
    return this.scenario.rooms.find(r => kinds.includes(r.kind))?.id ?? this.scenario.rooms[0].id;
  }

  pushEvent(text) {
    this.events.unshift(text);
    this.events = this.events.slice(0, 18);
    this.logEl.innerHTML = this.events.slice(0, 14).map(e => `<div class="log-entry">${escapeHtml(e)}</div>`).join('');
  }

  updateMetrics() {
    const m = this.sim.metrics();
    for (const [key, value] of Object.entries(m)) {
      const el = this.el.querySelector(`[data-metric="${key}"]`);
      if (el) el.textContent = value;
    }
  }

  renderInspectPanel() {
    const agent = this.sim.agents.find(a => a.id === this.selectedAgentId);
    if (!agent) {
      this.inspectEl.innerHTML = '<div class="inspect-empty">Tap a creature in the dungeon to inspect its tiny bad decisions.</div>';
      return;
    }

    const room = this.sim.rooms.find(r => r.id === agent.roomId);
    const related = this.events.filter(e => e.includes(agent.name)).slice(0, 3);
    const hp = `${Math.max(0, agent.hp)}/${agent.maxHp}`;
    const status = agent.departed ? 'departed' : agent.alive ? 'active' : 'fallen';
    const thought = currentThought(agent, this.sim);

    this.inspectEl.innerHTML = `
      <div class="inspect-head">
        <div>
          <strong>${escapeHtml(agent.name)}</strong>
          <span>${escapeHtml(agent.role)} · ${escapeHtml(agent.faction)} · ${status}</span>
        </div>
        <button class="mini-btn" data-clear-inspect>×</button>
      </div>
      <div class="inspect-grid">
        <div><b>${hp}</b><span>HP</span></div>
        <div><b>${agent.level ?? 1}</b><span>level</span></div>
        <div><b>${agent.gold ?? 0}</b><span>gold</span></div>
        <div><b>${agent.kills ?? 0}</b><span>kills</span></div>
      </div>
      <div class="thought">“${escapeHtml(thought)}”</div>
      <div class="inspect-room">Room: ${escapeHtml(room?.name ?? agent.roomId)}</div>
      <div class="memory-list">
        ${related.length ? related.map(e => `<div>${escapeHtml(e)}</div>`).join('') : '<div>No recent memorable mistakes.</div>'}
      </div>
    `;

    this.inspectEl.querySelector('[data-clear-inspect]').addEventListener('click', () => {
      this.selectedAgentId = null;
      this.renderInspectPanel();
    });
  }

  loop() {
    const dt = Math.min(this.three.clock.getDelta(), 0.045);
    if (this.running) this.sim.update(dt * 0.62);
    this.renderer.renderState(this.sim.snapshot());
    this.updateMetrics();
    if (this.selectedAgentId) this.renderInspectPanel();
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

function currentThought(agent, sim) {
  if (!agent.alive) return 'I have become useful documentation.';
  if (agent.departed) return 'The tavern version of this story will be much better.';
  if (agent.role === 'rogue') return 'That chest is probably fine.';
  if (agent.role === 'cleric') {
    const wounded = sim.agents.find(a => a.alive && a.faction === agent.faction && a.hp < a.maxHp * 0.55);
    return wounded ? `${wounded.name} is leaking again.` : 'Everyone is temporarily acceptable.';
  }
  if (agent.role === 'wizard') return agent.hp < agent.maxHp * 0.45 ? 'Distance is a form of wisdom.' : 'This is academically survivable.';
  if (agent.role === 'fighter') return 'If it moves, it may be a problem I can solve loudly.';
  if (agent.role === 'goblin') return 'I am brave in the plural.';
  if (agent.role === 'skeleton') return sim.lastNoiseRoom ? 'Something made a noise, which is legally my business.' : 'Waiting is also a profession.';
  if (agent.role === 'slime') return 'The floor understands me.';
  if (agent.role === 'mimic') return agent.hidden ? 'I am furniture. Trust me.' : 'Surprise is a dietary category.';
  return 'I am making a small decision badly.';
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
