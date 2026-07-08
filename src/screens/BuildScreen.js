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
          <button class="btn primary build-top-start" data-action="observe-top">선택한 던전 시작</button>
        </div>
        <p>표본을 하나 고른 뒤 시작하세요. 모바일에서는 카드가 길어져도 시작 버튼이 항상 보이도록 고정했습니다.</p>
        <div class="selected-banner" data-selected-banner></div>
        <div class="option-grid">
          ${this.scenarios.map(s => `
            <article class="option-card ${s.id === this.selectedId ? 'is-selected' : ''}" data-id="${s.id}">
              <h3>${s.name}</h3>
              <small>${s.description}</small>
              <button class="btn primary card-start" data-card-start="${s.id}">이 던전 시작</button>
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
      bindPress(card, (event) => {
        if (event.target?.matches?.('[data-card-start]')) return;
        this.selectedId = card.dataset.id;
        updateSelected();
      });
    });

    el.querySelectorAll('[data-card-start]').forEach(button => {
      bindPress(button, (event) => {
        event.stopPropagation?.();
        this.selectedId = button.dataset.cardStart;
        updateSelected();
        startSelected();
      });
    });

    bindPress(el.querySelector('[data-action="back"]'), this.onBack);
    bindPress(el.querySelector('[data-action="observe"]'), startSelected);
    bindPress(el.querySelector('[data-action="observe-top"]'), startSelected);

    updateSelected();
    root.appendChild(el);
    this.el = el;
  }

  destroy() {
    this.el?.remove();
  }
}
