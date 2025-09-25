// جزء 2: إحصائيات، تحديث الجدول، ودوال مساعدة

function calculateStats(subscriptions, now) {
  const threeDaysFromNow = new Date();
  threeDaysFromNow.setDate(now.getDate() + 3);
  return {
    total: subscriptions.length,
    active: subscriptions.filter(sub => new Date(sub.expiry_date || sub.expiryDate) > now).length,
    expiring: subscriptions.filter(sub => {
      const expiryDate = new Date(sub.expiry_date || sub.expiryDate);
      return expiryDate > now && expiryDate <= threeDaysFromNow;
    }).length,
    expired: subscriptions.filter(sub => new Date(sub.expiry_date || sub.expiryDate) <= now).length,
  };
}

async function updateStatistics() {
  try {
    const result = await dbManager.getStatistics();
    if (result.success) {
      const stats = result.stats;
      document.getElementById('totalSubscriptions').textContent = stats.total;
      document.getElementById('activeSubscriptions').textContent = stats.active;
      document.getElementById('expiringSubscriptions').textContent = stats.expiring;
      document.getElementById('expiredSubscriptions').textContent = stats.expired;
    } else {
      console.error('Error loading statistics:', result.error);
      const regularSubs = JSON.parse(localStorage.getItem('regularSubscriptions') || '[]');
      const fileSubs = JSON.parse(localStorage.getItem('fileSubscriptions') || '[]');
      const now = new Date();
      const stats = calculateStats(regularSubs.concat(fileSubs), now);
      document.getElementById('totalSubscriptions').textContent = stats.total;
      document.getElementById('activeSubscriptions').textContent = stats.active;
      document.getElementById('expiringSubscriptions').textContent = stats.expiring;
      document.getElementById('expiredSubscriptions').textContent = stats.expired;
    }
  } catch (error) {
    console.error('Error updating statistics:', error);
  }
}

async function updateSubscriptionsTable(subscriptions = null) {
  try {
    console.log('🔄 تحديث جدول الاشتراكات...');
    if (!subscriptions) {
      console.log('📡 جلب الاشتراكات من قاعدة البيانات...');
      if (window.dbManager) {
        const result = await window.dbManager.getAllSubscriptions();
        console.log('📋 نتيجة جلب الاشتراكات:', result);
        if (result.success) {
          subscriptions = result.subscriptions || result.data || [];
          console.log('✅ تم جلب', subscriptions.length, 'اشتراك من قاعدة البيانات');
        } else {
          console.error('❌ فشل جلب الاشتراكات من قاعدة البيانات:', result.error);
          subscriptions = JSON.parse(localStorage.getItem('regularSubscriptions') || '[]');
          console.log('📦 تم جلب', subscriptions.length, 'اشتراك من localStorage');
        }
      } else {
        console.error('❌ dbManager غير متوفر');
        subscriptions = JSON.parse(localStorage.getItem('regularSubscriptions') || '[]');
        console.log('📦 تم جلب', subscriptions.length, 'اشتراك من localStorage');
      }
    }

    const tableBody = document.getElementById('subscriptionsTableBody');
    const filterStatus = document.getElementById('filterStatus').value;
    const sortBy = document.getElementById('sortBy').value;

    let filteredSubscriptions = subscriptions;
    const now = new Date();
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(now.getDate() + 3);

    if (filterStatus !== 'all') {
      filteredSubscriptions = subscriptions.filter(sub => {
        const expiryDate = new Date(sub.expiry_date || sub.expiryDate);
        switch (filterStatus) {
          case 'active': return expiryDate > now;
          case 'expiring': return expiryDate > now && expiryDate <= threeDaysFromNow;
          case 'expired': return expiryDate <= now;
          default: return true;
        }
      });
    }

    filteredSubscriptions.sort((a, b) => {
      switch (sortBy) {
        case 'newest': return new Date(b.start_date || b.startDate) - new Date(a.start_date || a.startDate);
        case 'oldest': return new Date(a.start_date || a.startDate) - new Date(b.start_date || b.startDate);
        case 'expiring': return new Date(a.expiry_date || a.expiryDate) - new Date(b.expiry_date || b.expiryDate);
        case 'name': return (a.customer_name || a.customerName || '').localeCompare(b.customer_name || b.customerName || '');
        default: return 0;
      }
    });

    tableBody.innerHTML = '';
    filteredSubscriptions.forEach(sub => {
      const expiryDate = new Date(sub.expiry_date || sub.expiryDate);
      const isExpired = expiryDate <= now;
      const isExpiring = !isExpired && expiryDate <= threeDaysFromNow;
      const daysLeft = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
      const row = document.createElement('tr');
      row.className = 'hover:bg-[#3a3a3a] transition-colors';
      row.innerHTML = `
        <td class="px-6 py-4"><div class="flex items-center gap-2"><span class="font-medium">${sub.customer_name || sub.customerName || 'غير محدد'}</span></div></td>
        <td class="px-6 py-4">${sub.email}</td>
        <td class="px-6 py-4"><div class="flex items-center gap-2"><i class="fab fa-whatsapp text-green-500"></i><a href="https://wa.me/${sub.whatsapp}" target="_blank" class="text-green-500 hover:text-green-400 transition-colors">${sub.whatsapp}</a></div></td>
        <td class="px-6 py-4">${getSubscriptionTypeName(sub.subscription_type || sub.type)}</td>
        <td class="px-6 py-4">${getCurrencyName(sub.currency)}</td>
        <td class="px-6 py-4"><div class="space-y-1"><div>${formatDate(sub.expiry_date || sub.expiryDate)}</div><div class="text-sm ${daysLeft <= 7 ? 'text-yellow-500' : 'text-green-500'}">متبقي ${daysLeft} يوم</div></div></td>
        <td class="px-6 py-4"><span class="px-2 py-1 rounded text-sm ${getStatusClass(isExpired, isExpiring)}">${getStatusText(isExpired, isExpiring)}</span></td>
        <td class="px-6 py-4"><div class="max-w-32 truncate" title="${sub.notes || ''}">${sub.notes ? `<i class="fas fa-sticky-note text-yellow-500 ml-1"></i>${sub.notes}` : '<span class="text-gray-500">-</span>'}</div></td>
        <td class="px-6 py-4">${updateTableActionButtons(sub, 'regular')}</td>
      `;
      tableBody.appendChild(row);
    });

    await updateStatistics();
  } catch (error) {
    console.error('Error updating subscriptions table:', error);
  }
}

function getSubscriptionTypeName(type) {
  const types = { netflix: 'نتفلكس', shahid_vip: 'شاهد مسلسلات', shahid_sport: 'شاهد رياضي', shahid_year: 'شاهد سنة', shahid_full: 'شاهد شامل', use_pro: 'يوز برو', canva_pro: 'كانفا برو', canva_500: 'كانفا ٥٠٠ دعوة', digital_sim: 'شريحة رقمية', youtube_premium: 'يوتيوب بريميوم', amazon_prime: 'امازون برايم', bein_sports: 'بي ان سبورت', osn_plus: 'OSN+', disney_plus: 'ديزني بلس', other: 'اشتراك آخر' };
  return types[type] || type;
}

function getCurrencyName(currency) {
  const currencies = { sar: 'ريال سعودي', aed: 'درهم إماراتي', qar: 'ريال قطري', kwd: 'دينار كويتي', bhd: 'دينار بحريني', omr: 'ريال عماني', egp: 'جنيه مصري', try: 'ليرة تركية', inr: 'روبية هندية', ngn: 'نايرا نيجيري' };
  return currencies[currency] || currency;
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function getStatusClass(isExpired, isExpiring) {
  if (isExpired) return 'bg-red-500/20 text-red-500';
  if (isExpiring) return 'bg-yellow-500/20 text-yellow-500';
  return 'bg-green-500/20 text-green-500';
}

function getStatusText(isExpired, isExpiring) {
  if (isExpired) return 'منتهي';
  if (isExpiring) return 'ينتهي خلال 3 أيام';
  return 'نشط';
}

// تعريض الدوال
window.calculateStats = calculateStats;
window.updateStatistics = updateStatistics;
window.updateSubscriptionsTable = updateSubscriptionsTable;
window.getSubscriptionTypeName = getSubscriptionTypeName;
window.getCurrencyName = getCurrencyName;
window.formatDate = formatDate;
window.getStatusClass = getStatusClass;
window.getStatusText = getStatusText;

