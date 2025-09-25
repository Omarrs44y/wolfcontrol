// File subscriptions management

async function updateFilesTable(customSubscriptions = null) {
  try {
    console.log('🔄 تحديث جدول اشتراكات الملفات...');
    let fileSubscriptions = customSubscriptions;
    
    if (!fileSubscriptions) {
      console.log('📡 جلب اشتراكات الملفات من قاعدة البيانات...');
      if (window.dbManager) {
        const result = await window.dbManager.getAllFileSubscriptions();
        console.log('📋 نتيجة جلب اشتراكات الملفات:', result);
        if (result.success) {
          fileSubscriptions = result.subscriptions || [];
          console.log('✅ تم جلب', fileSubscriptions.length, 'اشتراك ملف من قاعدة البيانات');
        } else {
          console.error('❌ فشل جلب اشتراكات الملفات:', result.error);
          fileSubscriptions = JSON.parse(localStorage.getItem('fileSubscriptions') || '[]');
          console.log('📦 تم جلب', fileSubscriptions.length, 'اشتراك ملف من localStorage');
        }
      } else {
        console.error('❌ dbManager غير متوفر');
        fileSubscriptions = JSON.parse(localStorage.getItem('fileSubscriptions') || '[]');
        console.log('📦 تم جلب', fileSubscriptions.length, 'اشتراك ملف من localStorage');
      }
    }
    
    const categories = JSON.parse(localStorage.getItem('fileCategories') || '[]');
    const tableBody = document.getElementById('filesTableBody');
    const now = new Date();
    
    // تحديث الجدول
    if (tableBody) {
      tableBody.innerHTML = '';
      fileSubscriptions.forEach(sub => {
        const expiryDate = new Date(sub.expiry_date || sub.expiryDate);
        const isExpired = expiryDate < now;
        const daysLeft = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
        const category = categories.find(cat => cat.id === (sub.categoryId || sub.category));
        const categoryBadge = category ? 
          `<span class="px-2 py-1 rounded text-xs" style="background-color: ${category.color}20; color: ${category.color}">${category.name}</span>` : '';
        
        const row = document.createElement('tr');
        row.className = 'hover:bg-[#3a3a3a] transition-colors';
        row.innerHTML = `
          <td class="px-6 py-4">${sub.email}</td>
          <td class="px-6 py-4">${getFileTypeName(sub.subscription_type || sub.type, sub.custom_subscription_name || sub.customSubscriptionName)}</td>
          <td class="px-6 py-4">${sub.file_name || sub.fileName}</td>
          <td class="px-6 py-4">${(sub.account_type || sub.accountType) === 'subscriber' ? 'مشترك' : 'خاص'}</td>
          <td class="px-6 py-4">
            <a href="https://wa.me/${sub.whatsapp}" target="_blank" class="text-green-500 hover:text-green-400">
              <i class="fab fa-whatsapp ml-1"></i>${sub.whatsapp}
            </a>
          </td>
          <td class="px-6 py-4">
            <div class="space-y-1">
              <div>${formatDate(sub.expiry_date || sub.expiryDate)}</div>
              <div class="text-sm ${daysLeft <= 7 ? 'text-yellow-500' : 'text-green-500'}">
                متبقي ${daysLeft} يوم
              </div>
            </div>
          </td>
          <td class="px-6 py-4">
            <span class="px-2 py-1 rounded text-sm ${getStatusClass(isExpired, daysLeft <= 7)}">
              ${getStatusText(isExpired, daysLeft <= 7)}
            </span>
          </td>
          <td class="px-6 py-4">${categoryBadge}</td>
          <td class="px-6 py-4">${updateTableActionButtons(sub, 'file')}</td>
        `;
        tableBody.appendChild(row);
      });
    }
    
    // إضافة كود إنشاء البطاقات للجوال
    const cardsContainer = document.getElementById('filesCardsContainer');
    if (cardsContainer) {
      cardsContainer.innerHTML = '';
      fileSubscriptions.forEach(sub => {
        const expiryDate = new Date(sub.expiry_date || sub.expiryDate);
        const isExpired = expiryDate < now;
        const daysLeft = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
        const category = categories.find(cat => cat.id === (sub.categoryId || sub.category));
        
        const card = document.createElement('div');
        card.className = 'subscription-card';
        card.innerHTML = `
          <div class="card-header">
            <div class="card-title">${sub.email}</div>
            <div class="card-subtitle">${getFileTypeName(sub.subscription_type || sub.type, sub.custom_subscription_name || sub.customSubscriptionName)}</div>
          </div>
          <div class="card-body">
            <div class="card-field">
              <div class="card-field-label">اسم الملف</div>
              <div class="card-field-value">${sub.file_name || sub.fileName}</div>
            </div>
            <div class="card-field">
              <div class="card-field-label">نوع الحساب</div>
              <div class="card-field-value">${(sub.account_type || sub.accountType) === 'subscriber' ? 'مشترك' : 'خاص'}</div>
            </div>
            <div class="card-field">
              <div class="card-field-label">رقم الواتساب</div>
              <div class="card-field-value">
                <a href="https://wa.me/${sub.whatsapp}" target="_blank" class="text-green-500 hover:text-green-400">
                  <i class="fab fa-whatsapp ml-1"></i>${sub.whatsapp}
                </a>
              </div>
            </div>
            <div class="card-field">
              <div class="card-field-label">تاريخ الانتهاء</div>
              <div class="card-field-value">
                <div>${formatDate(sub.expiry_date || sub.expiryDate)}</div>
                <div class="text-sm ${daysLeft <= 7 ? 'text-yellow-500' : 'text-green-500'}">
                  متبقي ${daysLeft} يوم
                </div>
              </div>
            </div>
            <div class="card-field">
              <div class="card-field-label">الحالة</div>
              <div class="card-field-value">
                <span class="px-2 py-1 rounded text-sm ${getStatusClass(isExpired, daysLeft <= 7)}">
                  ${getStatusText(isExpired, daysLeft <= 7)}
                </span>
              </div>
            </div>
            ${category ? `
            <div class="card-field">
              <div class="card-field-label">التصنيف</div>
              <div class="card-field-value">
                <span class="px-2 py-1 rounded text-xs" style="background-color: ${category.color}20; color: ${category.color}">
                  ${category.name}
                </span>
              </div>
            </div>
            ` : ''}
          </div>
          <div class="card-actions">
            ${updateTableActionButtons(sub, 'file')}
          </div>
        `;
        cardsContainer.appendChild(card);
      });
    }
    
  } catch (error) {
    console.error('Error updating files table:', error);
  }
}

function getFileTypeName(type, customName = null) {
  const types = {
    'shahid_sports': 'شاهد رياضي',
    'netflix': 'نتفلكس',
    'osn_plus': 'OSN+',
    'amazon_prime': 'امازون برايم',
    'shahid_series': 'شاهد مسلسلات',
    'shahid_full': 'شاهد شامل',
    'disney_plus': 'ديزني بلس',
    'other': customName || 'اشتراك آخر'
  };
  return types[type] || type;
}

// تعريض الدوال
window.updateFilesTable = updateFilesTable;
window.getFileTypeName = getFileTypeName;

