import { bindPress } from '../app/bindPress.js';

export class TitleScreen {
  constructor({ onStart }) {
    this.onStart = onStart;
  }

  mount(root) {
    const el = document.createElement('section');
    el.className = 'screen';
    el.innerHTML = `
      <div class="center-card">
        <div class="eyebrow">Dungeon ant farm prototype</div>
        <h1>The Little Dungeon<br/>That Could</h1>
        <p>
          모험가를 조종하지 마세요. 작은 던전을 만들고, 생쥐 같은 영웅과 몬스터들이
          욕심, 공포, 소리, 상처, 보물에 반응하며 스스로 일을 망치는 장면을 관찰하세요.
        </p>
        <div class="actions">
          <button class="btn primary" data-action="start">관찰장 열기</button>
        </div>
      </div>
    `;
    bindPress(el.querySelector('[data-action="start"]'), this.onStart);
    root.appendChild(el);
    this.el = el;
  }

  destroy() {
    this.el?.remove();
  }
}
