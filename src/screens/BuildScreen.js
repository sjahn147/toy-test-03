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
      <div class="center-card">
        <div class="eyebrow">Build screen</div>
        <h1>던전 표본 선택</h1>
        <p>아직 맵 에디터는 아닙니다. 먼저 던전 표본 하나를 고르고, 안에서 작은 규칙들이 어떻게 사건을 만드는지 봅니다.</p>
        <div class="option-grid">
          ${this.scenarios.map(s => `
            <article class="option-card ${s.id === this.selectedId ? 'is-selected' : ''}" data-id="${s.id}">
              <h3>${s.name}</h3>
              <small>${s.description}</small>
            </article>
          `).join('')}
        </div>
        <div class="actions">
          <button class="btn" data-action="back">뒤로</button>
          <button class="btn primary" data-action="observe">관찰 시작</button>
        </div>
      </div>
    `;

    el.querySelectorAll('.option-card').forEach(card => {
      bindPress(card, () => {
        this.selectedId = card.dataset.id;
        el.querySelectorAll('.option-card').forEach(c => c.classList.remove('is-selected'));
        card.classList.add('is-selected');
      });
    });

    bindPress(el.querySelector('[data-action="back"]'), this.onBack);
    bindPress(el.querySelector('[data-action="observe"]'), () => {
      this.onStart({ scenarioId: this.selectedId });
    });

    root.appendChild(el);
    this.el = el;
  }

  destroy() {
    this.el?.remove();
  }
}
