import { bindPress } from '../app/bindPress.js';

export class BuildScreen {
  constructor({ state, scenarios, onBack, onStart }) {
    this.state = state;
    this.scenarios = scenarios;
    this.onBack = onBack;
    this.onStart = onStart;
    this.selectedId = state.scenarioId;
  }

  mount(root) {
    const el = document.createElement('section');
    el.className = 'screen build-layout';
    el.innerHTML = `
      <div class="build-card">
        <div class="build-header">
          <div>
            <div class="eyebrow">Theme select</div>
            <h1>던전 표본 선택</h1>
          </div>
        </div>
        <p>표본을 하나 고른 뒤 아래의 시작 버튼을 누르세요. 기존 세 맵은 작게 유지하고, 확장형 개미집 맵은 별도 테마로 분리했습니다.</p>
        <div class="selected-banner" data-selected-banner></div>
        <div class="option-grid">
          ${this.scenarios.map(s => `
            <article class="option-card ${s.id === this.selectedId ? 'is-selected' : ''}" data-id="${s.id}">
              <h3>${s.name}</h3>
              <small>${s.description}</small>
            </article>
          `).join('')}
        </div>
        <div class="build-footer">
          <button class="btn" data-action="back">뒤로</button>
          <button class="btn primary" data-action="observe">선택한 던전 시작</button>
        </div>
      </div>
    `;

    const startSelected = () => {
      this.onStart({ scenarioId: this.selectedId });
    };

    const updateSelected = () => {
      const selected = this.scenarios.find(s => s.id === this.selectedId) ?? this.scenarios[0];
      el.querySelector('[data-selected-banner]').textContent = `선택됨: ${selected.name}`;
      el.querySelectorAll('.option-card').forEach(c => c.classList.toggle('is-selected', c.dataset.id === this.selectedId));
    };

    el.querySelectorAll('.option-card').forEach(card => {
      bindPress(card, () => {
        this.selectedId = card.dataset.id;
        updateSelected();
      });
    });

    bindPress(el.querySelector('[data-action="back"]'), this.onBack);
    bindPress(el.querySelector('[data-action="observe"]'), startSelected);

    updateSelected();
    root.appendChild(el);
    this.el = el;
  }

  destroy() {
    this.el?.remove();
  }
}
