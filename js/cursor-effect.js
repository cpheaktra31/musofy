const cursorGlow = document.getElementById('cursorGlow');
const canShowCursorGlow = window.matchMedia('(pointer: fine)').matches &&
  !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (cursorGlow && canShowCursorGlow) {
  let cursorX = -200;
  let cursorY = -200;
  let cursorFrame = null;

  const renderCursorGlow = () => {
    cursorGlow.style.transform =
      `translate3d(${cursorX}px, ${cursorY}px, 0) translate(-50%, -50%)`;
    cursorFrame = null;
  };

  window.addEventListener('pointermove', (event) => {
    if (event.pointerType && event.pointerType !== 'mouse') return;

    cursorX = event.clientX;
    cursorY = event.clientY;
    cursorGlow.classList.add('is-visible');

    if (cursorFrame === null) {
      cursorFrame = requestAnimationFrame(renderCursorGlow);
    }
  }, { passive: true });

  document.documentElement.addEventListener('mouseleave', () => {
    cursorGlow.classList.remove('is-visible');
  });

  window.addEventListener('blur', () => {
    cursorGlow.classList.remove('is-visible');
  });
}
