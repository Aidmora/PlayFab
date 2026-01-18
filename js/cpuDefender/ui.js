/* ==================================================
   CPU DEFENDER - UI helpers
   (Anuncios + loading overlay)
   ================================================== */

function cpuShowAnnouncement(title, subtitle, duration = 2000) {
  const a = document.getElementById('challenge-announcement');
  if (!a) return;

  const t = document.getElementById('announcement-title');
  const s = document.getElementById('announcement-subtitle');

  if (t) t.innerText = title;
  if (s) s.innerText = subtitle;

  a.style.display = 'flex';
  setTimeout(() => {
    // Protege por si el overlay ya se cerró
    const node = document.getElementById('challenge-announcement');
    if (node) node.style.display = 'none';
  }, duration);
}

function cpuSetLoading(show, text) {
  const l = document.getElementById('ai-loading');
  if (!l) return;

  if (text) {
    const p = document.getElementById('loading-text');
    if (p) p.innerText = text;
  }
  l.style.display = show ? 'flex' : 'none';
}

/* Exponer global */
window.cpuShowAnnouncement = cpuShowAnnouncement;
window.cpuSetLoading = cpuSetLoading;
