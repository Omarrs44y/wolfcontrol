document.addEventListener('DOMContentLoaded', function () {
  try {
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    if (userData && userData.isAdmin) {
      const nav = document.querySelector('nav');
      if (nav) {
        nav.innerHTML += `
          <a href="manage-users.html" class="sidebar-item">
            <i class="fas fa-users-cog"></i>
            <span>إدارة الحسابات</span>
          </a>
        `;
      }
    }
  } catch (e) {
    console.error('admin-nav.js error:', e);
  }
});

