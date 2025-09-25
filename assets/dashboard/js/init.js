// Initialization and UI helpers extracted from dashboard.html

(function(){
  // Boot dashboard manager on DOM ready
  document.addEventListener('DOMContentLoaded', async function() {
    try {
      const initialized = await window.dashboardManager?.initialize?.();
      if (initialized) {
        await window.dashboardManager.loadSubscriptions();
        console.log('✅ تم تحميل لوحة التحكم بنجاح');
      } else {
        console.error('❌ فشل في تهيئة لوحة التحكم');
      }
    } catch (error) {
      console.error('❌ خطأ في تحميل لوحة التحكم:', error);
    }
  });

  // Compatibility helpers expected by legacy HTML
  window.loadSubscriptions = async function() {
    if (window.dashboardManager) return await window.dashboardManager.loadSubscriptions();
  };
  window.showErrorMessage = function(message){
    window.dashboardManager?.showErrorMessage?.(message);
  };
  window.showSuccessMessage = function(message){
    window.dashboardManager?.showSuccessMessage?.(message);
  };
  window.updateFilesTable = async function(fileSubscriptions){
    if (window.dashboardManager) return await window.dashboardManager.updateFilesTable(fileSubscriptions);
  };

  // Toggle views between table and cards (subscriptions)
  // قفل العرض بعد تحديده أول مرة
  window.viewLocked = window.viewLocked ?? false;

  window.toggleTableView = function(){
    const tableView = document.getElementById('tableView');
    const cardsView = document.getElementById('cardsView');
    const toggleIcon = document.getElementById('toggleViewIcon');
    const toggleText = document.getElementById('toggleViewText');
    if (!tableView || !cardsView) return;
    window.viewLocked = true;
    const toTable = tableView.classList.contains('hidden');
    tableView.classList.toggle('hidden', !toTable);
    cardsView.classList.toggle('hidden', toTable);
    if (toggleIcon && toggleText) {
      if (toTable) { toggleIcon.className = 'fas fa-th-large'; toggleText.textContent = 'عرض بطاقات'; }
      else { toggleIcon.className = 'fas fa-th-list'; toggleText.textContent = 'عرض جدول'; }
    }
  };

  window.toggleFilesTableView = function(){
    const tableView = document.getElementById('filesTableView');
    const cardsView = document.getElementById('filesCardsView');
    const toggleIcon = document.getElementById('toggleFilesViewIcon');
    const toggleText = document.getElementById('toggleFilesViewText');
    if (!tableView || !cardsView) return;
    window.viewLocked = true;
    const toTable = tableView.classList.contains('hidden');
    tableView.classList.toggle('hidden', !toTable);
    cardsView.classList.toggle('hidden', toTable);
    if (toggleIcon && toggleText) {
      if (toTable) { toggleIcon.className = 'fas fa-th-large'; toggleText.textContent = 'عرض بطاقات'; }
      else { toggleIcon.className = 'fas fa-th-list'; toggleText.textContent = 'عرض جدول'; }
    }
  };

  function applyResponsiveView(){
    if (window.viewLocked) return;
    const isMobile = window.innerWidth < 768;
    document.getElementById('tableView')?.classList.toggle('hidden', isMobile);
    document.getElementById('cardsView')?.classList.toggle('hidden', !isMobile);
    document.getElementById('filesTableView')?.classList.toggle('hidden', isMobile);
    document.getElementById('filesCardsView')?.classList.toggle('hidden', !isMobile);
    const toggleViewBtn = document.getElementById('toggleViewBtn');
    const toggleFilesViewBtn = document.getElementById('toggleFilesViewBtn');
    if (toggleViewBtn) toggleViewBtn.style.display = isMobile ? 'flex' : 'none';
    if (toggleFilesViewBtn) toggleFilesViewBtn.style.display = isMobile ? 'flex' : 'none';
  }

  window.addEventListener('resize', applyResponsiveView);
  document.addEventListener('DOMContentLoaded', function(){
    applyResponsiveView();
    window.viewLocked = true;
  });

  // Mobile optimizations
  function optimizeForMobile(){
    if (!document.querySelector('meta[name="viewport"]')){
      const viewport = document.createElement('meta');
      viewport.name = 'viewport';
      viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
      document.head.appendChild(viewport);
    }
    if ('ontouchstart' in window) {
      document.body.classList.add('touch-device');
      const touchCSS = document.createElement('style');
      touchCSS.textContent = `
        .touch-device button:hover { background-color: inherit; }
        .touch-device button:active { transform: scale(0.98); }
        .touch-device .subscription-card:active { transform: scale(0.99); }
      `;
      document.head.appendChild(touchCSS);
    }
  }
  document.addEventListener('DOMContentLoaded', optimizeForMobile);

  // Scroll performance
  function optimizeScrolling(){
    let ticking = false;
    function updateScrollElements(){ ticking = false; }
    function requestTick(){ if (!ticking){ requestAnimationFrame(updateScrollElements); ticking = true; } }
    window.addEventListener('scroll', requestTick, { passive: true });
  }
  document.addEventListener('DOMContentLoaded', optimizeScrolling);
})();

