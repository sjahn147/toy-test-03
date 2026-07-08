import { TitleScreen } from '../screens/TitleScreen.js';
import { BuildScreen } from '../screens/BuildScreen.js';
import { ObserveScreen } from '../screens/ObserveScreen.js';
import { SCENARIOS } from '../data/scenarios.js';

export class App {
  constructor(root) {
    this.root = root;
    this.currentScreen = null;
    this.state = {
      scenarioId: SCENARIOS[0].id,
      speed: 1,
      showDebug: false
    };
  }

  start() {
    this.root.className = 'app';
    this.showTitle();
  }

  setScreen(screen) {
    try {
      if (this.currentScreen?.destroy) this.currentScreen.destroy();
      this.currentScreen = screen;
      this.root.innerHTML = '';
      screen.mount(this.root);
    } catch (error) {
      console.error('[App] screen mount failed', error);
      this.showError(error);
    }
  }

  showError(error) {
    this.currentScreen = null;
    this.root.innerHTML = `
      <section class="screen">
        <div class="center-card error-card">
          <div class="eyebrow">Runtime error</div>
          <h1>던전 진입 실패</h1>
          <p>다음 화면을 여는 중 오류가 발생했습니다. 아래 메시지를 기준으로 바로 수정할 수 있습니다.</p>
          <pre>${escapeHtml(error?.message ?? String(error))}</pre>
          <div class="actions">
            <button class="btn primary" data-action="back-build">선택 화면으로</button>
            <button class="btn" data-action="back-title">처음으로</button>
          </div>
        </div>
      </section>
    `;
    this.root.querySelector('[data-action="back-build"]').addEventListener('click', () => this.showBuild());
    this.root.querySelector('[data-action="back-title"]').addEventListener('click', () => this.showTitle());
  }

  showTitle() {
    this.setScreen(new TitleScreen({
      onStart: () => this.showBuild()
    }));
  }

  showBuild() {
    this.setScreen(new BuildScreen({
      state: this.state,
      scenarios: SCENARIOS,
      onBack: () => this.showTitle(),
      onStart: (nextState) => {
        this.state = { ...this.state, ...nextState };
        this.showObserve();
      }
    }));
  }

  showObserve() {
    const scenario = SCENARIOS.find(s => s.id === this.state.scenarioId) ?? SCENARIOS[0];
    this.setScreen(new ObserveScreen({
      scenario,
      state: this.state,
      onBack: () => this.showBuild()
    }));
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
