import { ThreeScene } from '../engine/ThreeScene.js';
import { DungeonRendererPhase6 } from '../engine/DungeonRendererPhase6.js';
import { AssetRegistryPhase6 } from '../engine/AssetRegistryPhase6.js';
import { DungeonSim } from '../sim/DungeonSimPhase6.js';
import { expandScenario } from '../data/generateDungeon.js';
import { applyPhase2Facilities } from '../data/applyPhase2Facilities.js';
import { applyPhase5Ecology } from '../data/applyPhase5Ecology.js';
import { applyPhase6Ecology } from '../data/applyPhase6Ecology.js';

export class ObserveScreen {
  constructor({ scenario, state, onBack }) {
    this.baseScenario = scenario;
    const expanded = scenario.useGeneratedMap ? expandScenario(scenario) : scenario;
    const withFacilities = applyPhase2Facilities(expanded);
    const withBasicEcology = applyPhase5Ecology(withFacilities);
    this.scenario = applyPhase6Ecology(withBasicEcology);
    this.state = state;
    this.onBack = onBack;
    this.running = true;
    this.events = [];
    this.raf = null;
    this.selectedAgentId = null;
    this.pointerDown = null;
    this.cameraMode = 'fixed';
    this.mapCamera = { x: 0, y: 2.8, z: 0, distance: 52 };
  }

  mount(root) {
    const el = document.createElement('section');
    el.className = 'screen observe';
    el.innerHTML = `
      <div class="viewport">
        <div class="legend">
          <strong>${this.scenario.name}</strong>
          <span>Advanced infection, scavenging, faction territory and lair warfare are active.</span>
        </div>
        <div class="camera-strip" data-camera-strip>
          <button class="camera-btn is-active" data-camera-mode="fixed">고정</button>
          <button class="camera-btn" data-camera-mode="follow">추적</button>
          <button class="camera-btn" data-camera-mode="free">자유</button>
        </div>
      </div>
      <aside class="hud">
        <h2>Observation</h2>
        <p>${this.scenario.description}</p>
        <div class="metrics">
          <div class="metric"><b data-metric="party">0</b><span>party inside</span></div>
          <div class="metric"><b data-metric="dungeon">0</b><span>dungeon awake</span></div>
          <div class="metric"><b data-metric="hungry">0</b><span>hungry monsters</span></div>
          <div class="metric"><b data-metric="corpses">0</b><span>corpses</span></div>
          <div class="metric"><b data-metric="hosts">0</b><span>living hosts</span></div>
          <div class="metric"><b data-metric="births">0</b><span>basic births</span></div>
          <div class="metric"><b data-metric="advancedBirths">0</b><span>advanced births</span></div>
          <div class="metric"><b data-metric="infections">0</b><span>infections</span></div>
          <div class="metric"><b data-metric="attached">0</b><span>attached stirges</span></div>
          <div class="metric"><b data-metric="factionTraps">0</b><span>kobold traps</span></div>
          <div class="metric"><b data-metric="contested">0</b><span>contested rooms</span></div>
          <div class="metric"><b data-metric="waiting">0</b><span>waiting outside</span></div>
          <div class="metric"><b data-metric="orphaned">0</b><span>orphan members</span></div>
          <div class="metric"><b data-metric="downed">0</b><span>downed</span></div>
          <div class="metric"><b data-metric="projectiles">0</b><span>projectiles</span></div>
          <div class="metric"><b data-metric="loot">0</b><span>loot on floor</span></div>
          <div class="metric"><b data-metric="broken">0</b><span>broken loadouts</span></div>
          <div class="metric"><b data-metric="resurrectable">0</b><span>awaiting return</span></div>
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

    this.assets = new AssetRegistryPhase6();
    this.assets.loadManifest();
    this.three = new ThreeScene(this.viewport);
    this.fitCameraToScenario();
    this.renderer = new DungeonRendererPhase6(this.three, this.scenario, this.assets);
    this.sim = new DungeonSim(this.scenario, { onEvent: event => this.pushEvent(event.text) });

    el.querySelectorAll('[data-camera-mode]').forEach(button => button.addEventListener('click', () => this.setCameraMode(button.dataset.cameraMode)));
    el.querySelector('[data-action="pause"]').addEventListener('click', event => {
      this.running = !this.running;
      event.currentTarget.textContent = this.running ? '일시정지' : '재생';
    });
    el.querySelector('[data-action="noise"]').addEventListener('click', () => this.sim.makeNoise(this.pickRoom(['hall', 'crypt', 'lair', 'hatchery'])));
    el.querySelector('[data-action="coin"]').addEventListener('click', () => this.sim.dropCoin(this.pickRoom(['treasure', 'hall', 'lair', 'gate'])));
    el.querySelector('[data-action="back"]').addEventListener('click', this.onBack);

    this.viewport.addEventListener('pointerdown', event => {
      this.pointerDown = { x: event.clientX, y: event.clientY, t: performance.now() };
    });
    this.viewport.addEventListener('pointerup', event => {
      if (!this.pointerDown) return;
      const moved = Math.hypot(event.clientX - this.pointerDown.x, event.clientY - this.pointerDown.y);
      const elapsed = performance.now() - this.pointerDown.t;
      this.pointerDown = null;
      if (moved > 10 || elapsed > 450) return;
      const agentId = this.renderer.pickAgent(event.clientX, event.clientY);
      this.selectedAgentId = agentId;
      this.renderInspectPanel();
      if (agentId && this.cameraMode === 'follow') this.pushCameraToFollowTarget(true);
    });

    this.loop();
  }

  setCameraMode(mode) {
    this.cameraMode = mode;
    this.el.querySelectorAll('[data-camera-mode]').forEach(button => button.classList.toggle('is-active', button.dataset.cameraMode === mode));
    if (mode === 'fixed') this.three.setCameraTarget(this.mapCamera.x, this.mapCamera.y, this.mapCamera.z, this.mapCamera.distance, false);
    if (mode === 'follow') {
      this.ensureFollowTarget();
      this.pushCameraToFollowTarget(true);
    }
  }

  fitCameraToScenario() {
    const rooms = this.scenario.rooms;
    if (!rooms.length) return;
    const minX = Math.min(...rooms.map(room => room.x - room.w / 2));
    const maxX = Math.max(...rooms.map(room => room.x + room.w / 2));
    const minZ = Math.min(...rooms.map(room => room.z - room.d / 2));
    const maxZ = Math.max(...rooms.map(room => room.z + room.d / 2));
    const cx = (minX + maxX) / 2;
    const cz = (minZ + maxZ) / 2;
    const span = Math.max(maxX - minX, maxZ - minZ);
    const distance = Math.max(24, Math.min(88, span * 1.18));
    this.mapCamera = { x: cx, y: 2.8, z: cz, distance };
    this.three.setCameraTarget(cx, 2.8, cz, distance, true);
  }

  ensureFollowTarget() {
    const current = this.sim.agents.find(agent => agent.id === this.selectedAgentId && agent.alive && !agent.departed && !agent.hidden);
    if (current) return current;
    const fallback = this.sim.agents.find(agent => agent.alive && !agent.departed && agent.faction === 'party' && !agent.hidden)
      ?? this.sim.agents.find(agent => agent.alive && !agent.departed && !agent.hidden);
    this.selectedAgentId = fallback?.id ?? null;
    if (this.selectedAgentId) this.renderInspectPanel();
    return fallback;
  }

  pushCameraToFollowTarget(immediate = false) {
    const agent = this.ensureFollowTarget();
    if (!agent) return;
    const world = this.renderer.getAgentWorldPosition(agent.id);
    if (world) {
      this.three.setCameraTarget(world.x, world.y + 1.7, world.z, agent.role === 'ogre' ? 30 : 25, immediate);
      return;
    }
    const room = this.scenario.rooms.find(candidate => candidate.id === agent.roomId);
    if (room) this.three.setCameraTarget(room.x, (room.floor ?? 0) * 2.85 + 3, room.z, 26, immediate);
  }

  pickRoom(kinds) {
    return this.scenario.rooms.find(room => kinds.includes(room.kind))?.id ?? this.scenario.rooms[0].id;
  }

  pushEvent(text) {
    this.events.unshift(text);
    this.events = this.events.slice(0, 18);
    this.logEl.innerHTML = this.events.slice(0, 14).map(event => `<div class="log-entry">${escapeHtml(event)}</div>`).join('');
  }

  updateMetrics() {
    const metrics = this.sim.metrics();
    for (const [key, value] of Object.entries(metrics)) {
      const target = this.el.querySelector(`[data-metric="${key}"]`);
      if (target) target.textContent = value;
    }
  }

  renderInspectPanel() {
    const agent = this.sim.agents.find(candidate => candidate.id === this.selectedAgentId);
    if (!agent) {
      this.inspectEl.innerHTML = '<div class="inspect-empty">Tap a creature in the dungeon to inspect its tiny bad decisions.</div>';
      return;
    }
    const room = this.sim.rooms.find(candidate => candidate.id === agent.roomId);
    const destination = agent.travel ? this.sim.rooms.find(candidate => candidate.id === agent.travel.toRoomId) : null;
    const related = this.events.filter(event => event.includes(agent.name)).slice(0, 3);
    const status = agent.infected
      ? 'infected'
      : agent.attachedToId
        ? 'feeding attachment'
        : agent.sporeSleep > 0
          ? `spore sleep ${Math.ceil(agent.sporeSleep)}s`
          : agent.hosted
            ? 'living host'
            : agent.queued
              ? 'waiting outside'
              : agent.downed
                ? `downed ${Math.ceil(agent.bleedout)}s`
                : agent.departed
                  ? 'departed'
                  : !agent.alive
                    ? 'fallen'
                    : agent.combat
                      ? agent.combat.phase
                      : agent.travel
                        ? agent.travel.phase
                        : agent.partyState ?? agent.mood ?? 'active';
    const location = agent.queued
      ? 'Outside the expedition gate'
      : agent.travel
        ? `${agent.travel.phase === 'entering' ? 'Entering' : 'Corridor'}: ${room?.name ?? agent.roomId} → ${destination?.name ?? agent.travel.toRoomId}`
        : `Room: ${room?.name ?? agent.roomId}`;

    this.inspectEl.innerHTML = `
      <div class="inspect-head"><div><strong>${escapeHtml(agent.name)}</strong><span>${escapeHtml(agent.role)} · ${escapeHtml(agent.faction)} · ${escapeHtml(status)}</span></div><button class="mini-btn" data-clear-inspect>×</button></div>
      <div class="inspect-grid">
        <div><b>${Math.max(0, agent.hp)}/${agent.maxHp}</b><span>HP</span></div>
        <div><b>${agent.attack ?? 0}</b><span>attack</span></div>
        <div><b>${agent.defense ?? 0}</b><span>defense</span></div>
        <div><b>${agent.faction === 'dungeon' ? Math.round(agent.hunger ?? 0) : agent.gold ?? 0}</b><span>${agent.faction === 'dungeon' ? 'hunger' : 'gold'}</span></div>
        <div><b>${Math.round(agent.fatigue ?? 0)}</b><span>fatigue</span></div>
        <div><b>${agent.inventory?.length ?? 0}</b><span>inventory</span></div>
      </div>
      <div class="thought">“${escapeHtml(currentThought(agent, this.sim))}”</div>
      <div class="inspect-room">${escapeHtml(location)}</div>
      ${renderEcology(agent, this.sim)}
      ${renderEquipment(agent)}
      <div class="memory-list">${related.length ? related.map(event => `<div>${escapeHtml(event)}</div>`).join('') : '<div>No recent memorable mistakes.</div>'}</div>
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
    if (this.cameraMode === 'follow') this.pushCameraToFollowTarget(false);
    if (this.cameraMode === 'fixed') this.three.setCameraTarget(this.mapCamera.x, this.mapCamera.y, this.mapCamera.z, this.mapCamera.distance, false);
    this.three.updateCamera();
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

function renderEcology(agent, sim) {
  if (agent.faction !== 'dungeon' && !agent.hosted && !agent.infected) return '';
  const home = sim.rooms.find(room => room.id === agent.homeRoomId)?.name ?? agent.homeRoomId ?? 'none';
  const host = agent.carryingHostId ? sim.ecosystem.hosts.find(candidate => candidate.id === agent.carryingHostId) : null;
  const infection = sim.advancedEcology?.infections.find(candidate => candidate.targetId === agent.id);
  const attachmentCount = sim.advancedEcology?.attachments.filter(candidate => candidate.targetId === agent.id).length ?? 0;
  const territory = sim.advancedEcology?.territories.get(agent.roomId);
  return `
    <section class="equipment-panel ecology-panel">
      <strong>Ecology</strong>
      <div class="equipment-row"><span>home</span><b>${escapeHtml(home)}</b></div>
      ${agent.ecologyFaction ? `<div class="equipment-row"><span>faction</span><b>${escapeHtml(agent.ecologyFaction)}</b></div>` : ''}
      <div class="equipment-row"><span>hunger</span><b>${Math.round(agent.hunger ?? 0)}/100</b></div>
      <div class="equipment-row"><span>maturity</span><b>${Math.round((agent.maturity ?? 1) * 100)}%</b></div>
      ${territory?.ownerFaction ? `<div class="equipment-row"><span>territory</span><b>${escapeHtml(territory.ownerFaction)}${territory.contested ? ' · contested' : ''}</b></div>` : ''}
      ${infection ? `<div class="equipment-row"><span>infection</span><b>${Math.round(infection.elapsed / Math.max(0.01, infection.duration) * 100)}%</b></div>` : ''}
      ${attachmentCount ? `<div class="equipment-row"><span>stirges</span><b>${attachmentCount} attached</b></div>` : ''}
      ${agent.sporeSleep > 0 ? `<div class="equipment-row"><span>spores</span><b>${Math.ceil(agent.sporeSleep)}s sleep</b></div>` : ''}
      ${host ? `<div class="equipment-row"><span>carrying</span><b>${escapeHtml(host.targetName)}</b></div>` : ''}
      ${agent.hosted ? '<div class="equipment-row"><span>state</span><b>incubating host</b></div>' : ''}
    </section>`;
}

function renderEquipment(agent) {
  if (agent.faction !== 'party' || !agent.equipment) return '';
  const rows = Object.entries(agent.equipment).map(([slot, item]) => {
    if (!item) return `<div class="equipment-row"><span>${escapeHtml(slot)}</span><b>empty</b></div>`;
    const durability = item.maxDurability >= 90 ? 'stable' : `${Math.ceil(item.durability)}/${item.maxDurability}`;
    const state = item.broken ? ' · broken' : '';
    return `<div class="equipment-row"><span>${escapeHtml(slot)}</span><b>${escapeHtml(item.name)}</b><em>${escapeHtml(item.rarity)} · ${durability}${state}</em></div>`;
  }).join('');
  const bag = agent.inventory?.length
    ? agent.inventory.map(item => `<span class="inventory-chip">${escapeHtml(item.name)}</span>`).join('')
    : '<span class="inventory-chip is-empty">empty pack</span>';
  return `<section class="equipment-panel"><strong>Loadout</strong>${rows}<div class="inventory-line">${bag}</div></section>`;
}

function currentThought(agent, sim) {
  if (agent.infected) return 'There is something inside me with a schedule.';
  if (agent.attachedToId) return 'The blood is warm and the exit plan is excellent.';
  if (agent.sporeSleep > 0) return 'The mushrooms have made a persuasive argument for lying down.';
  if (agent.hosted) return 'The silk is warm. That is not reassuring.';
  if (agent.queued) return 'Everyone is here. Someone is still checking the rope.';
  if (agent.downed) return `I have about ${Math.ceil(agent.bleedout)} seconds of optimism left.`;
  if (!agent.alive && agent.resurrectable) return 'The statue has not forgotten my name yet.';
  if (!agent.alive) return 'I have become useful documentation.';
  if ((agent.webbed ?? 0) > 0) return 'The silk is tighter than the employment contract.';
  if (Object.values(agent.equipment ?? {}).some(item => item?.broken)) return 'Something important is making the wrong metal noise.';
  if ((agent.hunger ?? 0) >= 82) return 'Everything nearby has become a menu category.';
  if (agent.carryingHostId) return 'The brood chamber is this way. The package is still breathing.';
  if (agent.resurrectionSickness > 0) return 'Being alive again is more tiring than advertised.';
  if (agent.combat?.phase === 'windup') return 'This is the part where commitment becomes visible.';
  if (agent.travel) return `The corridor to ${sim.roomName(agent.travel.toRoomId)} is taking this personally.`;
  if ((agent.fatigue ?? 0) > 75) return 'A bench, a fountain, or a small administrative miracle would help.';
  if (agent.orphaned) return `I should be able to hear ${sim.agents.find(candidate => candidate.id === agent.partyLeaderId)?.name ?? 'the others'}.`;
  if (agent.role === 'zombie') return 'The dead are an underused recruitment pool.';
  if (agent.role === 'orc') return 'A border is just a fight that has not happened yet.';
  if (agent.role === 'myconid') return 'Everything becomes soil with enough patience.';
  if (agent.role === 'stirge') return 'One careful puncture solves several logistical problems.';
  if (agent.role === 'carrion') return 'Decay is a meal that prepares itself.';
  if (agent.role === 'kobold') return 'The corridor needs one more spring and somebody else’s ankle.';
  if (agent.role === 'wraith') return 'Names fade. Hunger does not.';
  if (agent.role === 'parasite') return 'The safest lair has a pulse.';
  if (agent.role === 'rat') return 'The grain belongs to whoever reaches it first.';
  if (agent.role === 'spider') return 'Stillness is a kind of hunting.';
  if (agent.role === 'rogue') return 'That chest is probably fine.';
  if (agent.role === 'cleric') return 'Everyone is temporarily acceptable.';
  if (agent.role === 'wizard') return 'This is academically survivable.';
  if (agent.role === 'archer') return 'The correct distance is somebody else’s problem.';
  if (agent.role === 'fighter') return 'If it moves, it may be a problem I can solve loudly.';
  if (agent.role === 'goblin') return 'I am brave in the plural.';
  if (agent.role === 'skeleton') return sim.lastNoiseRoom ? 'Something made a noise, which is legally my business.' : 'Waiting is also a profession.';
  if (agent.role === 'ogre') return 'This architecture is too small and therefore offensive.';
  if (agent.role === 'slime') return 'The floor understands me.';
  if (agent.role === 'mimic') return agent.hidden ? 'I am furniture. Trust me.' : 'Surprise is a dietary category.';
  return 'I am making a small decision badly.';
}

function escapeHtml(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}
