(function(){
  async function replaceWithPartial(selector, url){
    const el = document.querySelector(selector);
    if (!el) return;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed '+url);
    el.outerHTML = await res.text();
  }
  async function loadMore(){
    try{
      await replaceWithPartial('#subscription-modal-placeholder', 'partials/modals/subscription-modal.html');
      await replaceWithPartial('#linked-users-modal-placeholder', 'partials/modals/linked-users-modal.html');
      await replaceWithPartial('#categories-modal-placeholder', 'partials/modals/categories-modal.html');
    }catch(e){ console.error('Error loading additional modal partials:', e); }
  }
  if (document.readyState !== 'loading') loadMore();
  else document.addEventListener('DOMContentLoaded', loadMore);

  async function replaceWithPartial(placeholderSelector, url){
    const el = document.querySelector(placeholderSelector);
    if (!el) return;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to load '+url);
    const html = await res.text();
    el.outerHTML = html;
  }
  async function load(){
    try {
      await replaceWithPartial('#profile-modal-placeholder', 'partials/modals/profile-modal.html');
      await replaceWithPartial('#delete-modal-placeholder', 'partials/modals/delete-modal.html');
      // يمكن لاحقًا إضافة بقية المودالات هنا بنفس الأسلوب
    } catch(e){ console.error('Error loading modal partials:', e); }
  }
  if (document.readyState !== 'loading') load();
  else document.addEventListener('DOMContentLoaded', load);
})();

