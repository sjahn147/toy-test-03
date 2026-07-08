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
    if (this.currentScreen?.destroy) this.currentScreen.destroy();
    this.currentScreen = screen;
    this.root.innerHTML = '';
    screen.mount(this.root);
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
