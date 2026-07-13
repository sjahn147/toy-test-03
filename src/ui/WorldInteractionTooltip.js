export class WorldInteractionTooltip {
  constructor(viewport) {
    if (!viewport) throw new Error('WorldInteractionTooltip requires a viewport');
    this.viewport = viewport;
    this.element = document.createElement('div');
    this.element.className = 'world-interaction-tooltip';
    this.element.hidden = true;
    Object.assign(this.element.style, {
      position: 'absolute',
      zIndex: '12',
      pointerEvents: 'none',
      minWidth: '124px',
      maxWidth: '260px',
      padding: '7px 9px',
      border: '1px solid rgba(170, 215, 255, .72)',
      borderRadius: '7px',
      background: 'rgba(8, 12, 22, .92)',
      boxShadow: '0 8px 24px rgba(0, 0, 0, .36)',
      color: '#eef7ff',
      font: '12px/1.35 system-ui, sans-serif',
      transform: 'translate(14px, 14px)',
      backdropFilter: 'blur(5px)'
    });
    viewport.appendChild(this.element);
  }

  show(target, clientX, clientY) {
    if (!target) return this.hide();
    const rect = this.viewport.getBoundingClientRect();
    this.element.innerHTML = `<strong style="display:block;font-size:12px">${escapeHtml(target.label ?? target.id)}</strong><span style="display:block;opacity:.72;margin-top:2px">${escapeHtml(labelType(target.type))}${target.roomId ? ` · ${escapeHtml(target.roomId)}` : ''}</span>`;
    this.element.style.left = `${Math.max(0, clientX - rect.left)}px`;
    this.element.style.top = `${Math.max(0, clientY - rect.top)}px`;
    this.element.hidden = false;
  }

  hide() {
    this.element.hidden = true;
  }

  destroy() {
    this.element.remove();
  }
}

function labelType(type) {
  return String(type ?? 'target').replaceAll('-', ' ');
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
