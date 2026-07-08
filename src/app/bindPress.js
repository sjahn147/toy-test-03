export function bindPress(element, handler) {
  let lastPointerAt = 0;

  const run = (event) => {
    event.preventDefault?.();
    lastPointerAt = Date.now();
    handler(event);
  };

  element.addEventListener('pointerup', run);
  element.addEventListener('click', (event) => {
    if (Date.now() - lastPointerAt < 500) return;
    handler(event);
  });
}
