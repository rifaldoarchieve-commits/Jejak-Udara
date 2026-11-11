/* The dashboard fills the viewport; small windows scale the complete canvas.
   Layout and typography reflow first. Scaling is only the small-screen fallback. */
'use strict';
(() => {
  const shell = document.querySelector('.app-shell');
  const notice = document.getElementById('globalNotice');
  const button = document.getElementById('toggleFullscreen');
  let frame;

  function fit() {
    const width = document.documentElement.clientWidth;
    const height = window.innerHeight;
    const minWidth = 1180;
    // Keep the analytical warning visible without taking room from the charts.
    const minHeight = 768 + (notice.hidden ? 0 : 32);
    const scale = Math.min(1, width / minWidth, height / minHeight);
    shell.style.width = `${width / scale}px`;
    shell.style.height = `${height / scale}px`;
    shell.style.setProperty('--canvas-height', `${height / scale}px`);
    shell.style.transform = `scale(${scale})`;
    shell.dataset.fit = scale < 1 ? 'scaled' : 'fluid';
  }

  function scheduleFit() {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(fit);
  }

  window.addEventListener('resize', scheduleFit);
  window.addEventListener('orientationchange', scheduleFit);
  new MutationObserver(scheduleFit).observe(notice, {
    attributes: true, attributeFilter: ['hidden'], childList: true
  });

  if (!document.fullscreenEnabled) button.hidden = true;
  button.addEventListener('click', async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch (_) {
      button.title = 'Gunakan F11 pada browser untuk mode layar penuh';
    }
  });
  document.addEventListener('fullscreenchange', () => {
    const active = Boolean(document.fullscreenElement);
    const label = active ? 'Keluar dari layar penuh' : 'Mode layar penuh';
    button.setAttribute('aria-pressed', String(active));
    button.setAttribute('aria-label', label);
    button.title = label;
    scheduleFit();
  });
  fit();
})();
