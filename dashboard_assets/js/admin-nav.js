(function(){
  async function run(){
    try {
      const userData = JSON.parse(localStorage.getItem('userData') || '{}');
      if (userData && userData.isAdmin) {
        // Ensure sidebar nav exists (after partials load if applicable)
        if (window.Partials?.ready) { try { await window.Partials.ready; } catch(_){} }
        const nav = document.querySelector('.sidebar nav');
        if (nav && !nav.querySelector('a[href="manage-users.html"]')) {
          nav.insertAdjacentHTML('beforeend', `
            <a href="manage-users.html" class="sidebar-item">
              <i class="fas fa-users-cog"></i>
              <span>إدارة الحسابات</span>
            </a>
          `);
        }
      }
    } catch (e) {
      console.error('admin-nav.js error:', e);
    }
  }
  if (document.readyState !== 'loading') run();
  else document.addEventListener('DOMContentLoaded', run);
})();
