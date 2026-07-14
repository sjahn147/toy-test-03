import { THREE } from '../engine/ThreeScene.js';
import { roomStatusCopy } from '../presentation/selectors/RoomStatePolicy.js';

const COLLISION_OFFSETS = [0, -15, 15, -30, 30, -45, 45];

export class RoomStatusLayer {
  constructor({ viewport, three, onSelectRoom = () => {}, onFocusRoom = () => {}, localeProvider = () => 'en' } = {}) {
    if (!viewport || !three) throw new Error('RoomStatusLayer requires viewport and ThreeScene');
    this.viewport = viewport;
    this.three = three;
    this.onSelectRoom = onSelectRoom;
    this.onFocusRoom = onFocusRoom;
    this.localeProvider = localeProvider;
    this.roomStates = {};
    this.overlayMode = 'world';
    this.selectedRoomId = null;
    this.badges = new Map();
    this.frame = null;
    this.destroyed = false;
    this.vector = new THREE.Vector3();
    this.cameraVector = new THREE.Vector3();
    this.mount();
  }

  mount() {
    this.root = document.createElement('div');
    this.root.className = 'wp11-room-status-layer';
    this.root.setAttribute('aria-label', 'Room status map');
    this.root.addEventListener('click', event => this.handleClick(event));
    this.root.addEventListener('dblclick', event => this.handleDoubleClick(event));
    this.root.addEventListener('pointerover', event => this.handlePointerOver(event));
    this.root.addEventListener('pointerout', event => this.handlePointerOut(event));
    this.tooltip = document.createElement('div');
    this.tooltip.className = 'wp11-room-hover-card';
    this.tooltip.hidden = true;
    this.root.appendChild(this.tooltip);
    const computed = globalThis.getComputedStyle?.(this.viewport);
    if (computed?.position === 'static') this.viewport.style.position = 'relative';
    this.viewport.appendChild(this.root);
    this.frame = requestAnimationFrame(() => this.updateFrame());
  }

  render(roomStates = {}, { overlayMode = this.overlayMode, selectedRoomId = this.selectedRoomId } = {}) {
    this.roomStates = roomStates && typeof roomStates === 'object' ? roomStates : {};
    this.overlayMode = overlayMode ?? 'world';
    this.selectedRoomId = selectedRoomId ?? null;
    const live = new Set();
    for (const state of Object.values(this.roomStates)) {
      if (!state?.roomId || !state.discovered) continue;
      live.add(state.roomId);
      let badge = this.badges.get(state.roomId);
      if (!badge) {
        badge = document.createElement('button');
        badge.type = 'button';
        badge.className = 'wp11-room-badge';
        badge.dataset.roomId = state.roomId;
        this.root.insertBefore(badge, this.tooltip);
        this.badges.set(state.roomId, badge);
      }
      this.renderBadge(badge, state);
    }
    for (const [roomId, badge] of this.badges) {
      if (live.has(roomId)) continue;
      badge.remove();
      this.badges.delete(roomId);
    }
  }

  renderBadge(badge, state) {
    const locale = this.localeProvider?.() === 'ko' ? 'ko' : 'en';
    const copy = roomStatusCopy(locale);
    const owner = state.ownership?.ownerFactionId ?? copy.noOwner;
    const control = Math.round(state.ownership?.control ?? 0);
    const current = state.population?.current ?? 0;
    const capacity = state.population?.capacity ?? 0;
    const statuses = state.presentation?.statuses ?? [];
    const statusMarkup = statuses.slice(0, 3).map(status => `<i class="wp11-room-status-icon status-${escapeHtml(status.id)}" data-status="${escapeHtml(status.id)}" title="${escapeHtml(copy[status.id] ?? status.id)}" aria-label="${escapeHtml(copy[status.id] ?? status.id)}">${escapeHtml(status.glyph ?? '·')}</i>`).join('');
    const challenger = state.ownership?.challengerFactionId;
    const trend = state.ownership?.controlTrend ?? 'steady';
    const trendGlyph = trend === 'rising' ? '↑' : trend === 'falling' ? '↓' : '–';
    const tier = state.settlement?.tier ? `<span class="wp11-room-tier">T${escapeHtml(state.settlement.tier)}</span>` : '';
    const showPopulation = ['world', 'population'].includes(this.overlayMode);
    const showDanger = this.overlayMode === 'danger';
    const compactValue = showDanger ? `${Math.round((state.danger?.score ?? 0) * 100)}` : showPopulation ? `${current}${capacity > 0 ? `/${capacity}` : ''}` : `${control}%`;
    badge.style.setProperty('--owner-color', state.ownership?.ownerColor ?? '#9aa2ad');
    badge.style.setProperty('--challenger-color', challenger ? state.ownership?.challengerColor ?? '#d36a62' : state.ownership?.ownerColor ?? '#9aa2ad');
    badge.style.setProperty('--control-angle', `${Math.max(0, Math.min(100, control)) * 3.6}deg`);
    badge.style.setProperty('--danger', String(state.danger?.score ?? 0));
    badge.classList.toggle('is-selected', state.roomId === this.selectedRoomId);
    badge.classList.toggle('is-contested', Boolean(state.ownership?.contested));
    badge.classList.toggle('is-critical', (state.presentation?.severity ?? 0) >= 4);
    badge.dataset.overlayMode = this.overlayMode;
    badge.dataset.severity = String(state.presentation?.severity ?? 0);
    badge.innerHTML = `
      <span class="wp11-room-control-ring"><span>${escapeHtml(compactValue)}</span></span>
      <span class="wp11-room-badge-body">
        <b class="wp11-room-badge-name">${escapeHtml(state.name)}</b>
        <span class="wp11-room-badge-meta"><em>${escapeHtml(shortFaction(owner))}</em>${tier}<strong class="wp11-room-trend trend-${escapeHtml(trend)}">${trendGlyph}</strong></span>
        <span class="wp11-room-badge-icons">${statusMarkup}</span>
      </span>`;
    badge.setAttribute('aria-label', `${state.name}. ${copy.control} ${control}%. ${copy.population} ${current}${capacity ? ` of ${capacity}` : ''}. ${(statuses.map(item => copy[item.id] ?? item.id)).join(', ')}.`);
  }

  updateFrame() {
    if (this.destroyed) return;
    this.positionBadges();
    this.frame = requestAnimationFrame(() => this.updateFrame());
  }

  positionBadges() {
    const rect = this.three.renderer?.domElement?.getBoundingClientRect?.();
    const camera = this.three.camera;
    if (!rect || !camera || !rect.width || !rect.height) return;
    const buckets = new Map();
    const cameraPosition = camera.getWorldPosition?.(this.cameraVector) ?? camera.position;
    for (const [roomId, badge] of this.badges) {
      const state = this.roomStates[roomId];
      if (!state?.position) { badge.hidden = true; continue; }
      this.vector.set(state.position.x, state.position.y + badgeHeightOffset(state), state.position.z);
      const distance = cameraPosition?.distanceTo?.(this.vector) ?? 0;
      this.vector.project(camera);
      if (this.vector.z < -1 || this.vector.z > 1) { badge.hidden = true; continue; }
      const x = (this.vector.x * 0.5 + 0.5) * rect.width;
      const y = (-this.vector.y * 0.5 + 0.5) * rect.height;
      const outside = x < -60 || x > rect.width + 60 || y < -50 || y > rect.height + 50;
      badge.hidden = outside;
      if (outside) continue;
      badge.dataset.lod = distance > 68 ? 'far' : distance > 35 ? 'mid' : 'near';
      const bucketKey = `${Math.round(x / 72)}:${Math.round(y / 42)}`;
      const count = buckets.get(bucketKey) ?? 0;
      buckets.set(bucketKey, count + 1);
      const collisionOffset = COLLISION_OFFSETS[Math.min(count, COLLISION_OFFSETS.length - 1)];
      badge.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y + collisionOffset)}px, 0) translate(-50%, -100%)`;
      badge.style.zIndex = String(2000 + Math.round((1 - this.vector.z) * 100) + (state.roomId === this.selectedRoomId ? 500 : 0));
    }
  }

  handleClick(event) {
    const badge = event.target.closest?.('[data-room-id]');
    if (!badge) return;
    event.stopPropagation();
    this.onSelectRoom(badge.dataset.roomId);
  }

  handleDoubleClick(event) {
    const badge = event.target.closest?.('[data-room-id]');
    if (!badge) return;
    event.preventDefault();
    event.stopPropagation();
    this.onFocusRoom(badge.dataset.roomId);
  }

  handlePointerOver(event) {
    const badge = event.target.closest?.('[data-room-id]');
    if (!badge || badge.contains(event.relatedTarget)) return;
    this.showTooltip(badge.dataset.roomId, badge);
  }

  handlePointerOut(event) {
    const badge = event.target.closest?.('[data-room-id]');
    if (!badge || badge.contains(event.relatedTarget)) return;
    this.tooltip.hidden = true;
  }

  showTooltip(roomId, badge) {
    const state = this.roomStates[roomId];
    if (!state) return;
    const locale = this.localeProvider?.() === 'ko' ? 'ko' : 'en';
    const copy = roomStatusCopy(locale);
    const statuses = state.presentation?.statuses ?? [];
    const work = state.activity?.construction?.[0] ?? state.activity?.workOrders?.[0] ?? null;
    this.tooltip.innerHTML = `
      <header><b>${escapeHtml(state.name)}</b><span>${escapeHtml(state.roomId)}${state.zoneId ? ` · ${escapeHtml(state.zoneId)}` : ''}</span></header>
      <dl>
        <div><dt>${copy.control}</dt><dd>${Math.round(state.ownership?.control ?? 0)}% ${trendGlyph(state.ownership?.controlTrend)}</dd></div>
        <div><dt>${copy.population}</dt><dd>${state.population?.current ?? 0}${state.population?.capacity ? ` / ${state.population.capacity}` : ''}</dd></div>
        <div><dt>${copy.supply}</dt><dd>${escapeHtml(state.settlement?.supplyStatus ?? 'open')}</dd></div>
        <div><dt>${copy.danger}</dt><dd>${escapeHtml(state.danger?.level ?? 'low')}</dd></div>
        ${state.settlement ? `<div><dt>${copy.integrity}</dt><dd>${Math.round(state.settlement.integrity ?? 0)}%</dd></div>` : ''}
        ${state.spatial ? `<div><dt>${copy.physicalSpace}</dt><dd>${state.spatial.walkableCells}/${state.spatial.totalCells}</dd></div>` : ''}
      </dl>
      <p>${statuses.map(item => escapeHtml(copy[item.id] ?? item.id)).join(' · ')}</p>
      ${work ? `<small>${escapeHtml(work.type ?? work.label ?? 'work')} · ${Math.round((work.progress ?? 0) * 100)}%</small>` : ''}`;
    const badgeRect = badge.getBoundingClientRect();
    const rootRect = this.root.getBoundingClientRect();
    this.tooltip.style.left = `${Math.max(8, Math.min(rootRect.width - 240, badgeRect.left - rootRect.left + badgeRect.width / 2 - 110))}px`;
    this.tooltip.style.top = `${Math.max(8, badgeRect.top - rootRect.top - 150)}px`;
    this.tooltip.hidden = false;
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    if (this.frame !== null) cancelAnimationFrame(this.frame);
    this.frame = null;
    this.badges.clear();
    this.root?.remove();
    this.root = null;
    this.tooltip = null;
  }
}

function badgeHeightOffset(state) {
  if (state.settlement?.tier >= 3) return 3.2;
  if (state.population?.heroes > 0) return 2.8;
  return 2.2;
}

function shortFaction(value) {
  return String(value ?? 'unclaimed').replace(/^adventurer-/, '').replace(/-(tribe|host|clan|market|colony|communion|brood)$/, '').replaceAll('-', ' ').slice(0, 18);
}
function trendGlyph(value) { return value === 'rising' ? '↑' : value === 'falling' ? '↓' : '–'; }
function escapeHtml(value) { return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;'); }
