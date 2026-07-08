export function bindPress(element, handler) {
  let lastPressAt = 0;

  const run = (event) => {
    const now = Date.now();
    if (now - lastPressAt < 350) return;
    lastPressAt = now;
    event.preventDefault?.();
    handler(event);
  };

  element.addEventListener('pointerup', run, { passive: false });
  element.addEventListener('touchend', run, { passive: false });
  element.addEventListener('click', run);
  element.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') run(event);
  });
}
