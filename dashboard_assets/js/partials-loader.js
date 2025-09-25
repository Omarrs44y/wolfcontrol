(function(){
  // Load an HTML partial into a container element. Returns a Promise that resolves when loaded.
  async function loadPartial(containerSelector, url){
    const el = document.querySelector(containerSelector);
    if (!el) return;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to load partial '+url+': '+res.status);
    const html = await res.text();
    el.innerHTML = html;
  }

  // Expose a function and a promise to wait on all partials
  const partialsLoaded = (async function(){
    try {
      await loadPartial('#sidebar nav', 'partials/sidebar-nav.html');
    } catch (e) {
      console.error('Error loading partials:', e);
    }
  })();

  window.Partials = { loadPartial, ready: partialsLoaded };
})();

