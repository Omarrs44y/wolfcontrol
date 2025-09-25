(function(){
  async function inject(selector, url){
    const el = document.querySelector(selector);
    if (!el) return;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed '+url);
    el.outerHTML = await res.text();
  }
  const ready = (async function(){
    try {
      await inject('#actions-bar-placeholder', 'partials/actions-bar.html');
      await inject('#tabs-header-placeholder', 'partials/tabs-header.html');
      await inject('#subscriptions-section-placeholder', 'partials/section-subscriptions.html');
      await inject('#files-section-placeholder', 'partials/section-files.html');
      await inject('#customers-section-placeholder', 'partials/section-customers.html');
    } catch(e){ console.error('Error loading main partials:', e); }
  })();
  window.MainPartials = { ready };
})();

