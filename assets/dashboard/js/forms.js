// دالة حساب تاريخ انتهاء الاشتراك
function calculateEndDate(durationType, customDate) {
  try {
    const today = new Date();
    let endDate = new Date(today);

    if (durationType === 'custom' && customDate) {
      endDate = new Date(customDate);
    } else {
      switch (durationType) {
        case '1':
          endDate.setMonth(endDate.getMonth() + 1);
          break;
        case '3':
          endDate.setMonth(endDate.getMonth() + 3);
          break;
        case '6':
          endDate.setMonth(endDate.getMonth() + 6);
          break;
        case '12':
          endDate.setFullYear(endDate.getFullYear() + 1);
          break;
        default:
          const customInputDate = document.getElementById('expiryDate')?.value;
          if (customInputDate) endDate = new Date(customInputDate);
      }
    }

    if (isNaN(endDate.getTime())) throw new Error('تاريخ غير صالح');
    return endDate.toISOString();
  } catch (error) {
    console.error('خطأ في حساب تاريخ الانتهاء:', error);
    const defaultDate = new Date();
    defaultDate.setMonth(defaultDate.getMonth() + 1);
    return defaultDate.toISOString();
  }
}

// معالجات نموذج اشتراك الملفات
async function loadFileSubscriptions() {
  try {
    console.log('جاري تحميل اشتراكات الملفات...');
    if (!window.dbManager) {
      console.error('خطأ: dbManager غير متوفر');
      return;
    }
    const result = await window.dbManager.getAllFileSubscriptions();
    if (result.success) {
      console.log('تم تحميل اشتراكات الملفات بنجاح:', result.data);
      if (window.dashboardManager) await window.dashboardManager.updateFilesTable(result.data);
    } else {
      console.error('فشل تحميل اشتراكات الملفات:', result.error);
    }
  } catch (error) {
    console.error('حدث خطأ أثناء تحميل اشتراكات الملفات:', error);
  }
}

async function handleFileSubscriptionSubmit(event) {
  event.preventDefault();
  try {
    if (!window.dbManager) {
      alert('خطأ: قاعدة البيانات غير متاحة. يرجى إعادة تحميل الصفحة.');
      return;
    }
    const currentUser = JSON.parse(localStorage.getItem('userData') || '{}');
    if (!currentUser.id) {
      alert('خطأ: لم يتم العثور على معلومات المستخدم');
      return;
    }
    const form = document.getElementById('newFileSubscriptionForm');
    const formData = new FormData(form);
    const fileSubscriptionData = {
      email: formData.get('email'),
      type: formData.get('type'),
      filename: formData.get('fileName'),
      subscription_type: document.querySelector('input[name="accountType"]:checked')?.value || 'basic',
      whatsapp: formData.get('countryCode') + formData.get('whatsapp'),
      currency: formData.get('currency'),
      start_date: new Date().toISOString(),
      expiry_date: calculateEndDate(formData.get('durationType')),
      category_id: formData.get('category'),
      created_by: currentUser.id,
      status: 'active',
      notes: formData.get('notes'),
      ...(document.getElementById('showPasswordField')?.checked ? { password: formData.get('password') } : {})
    };

    console.log('➕ إضافة اشتراك ملفات جديد');
    const result = await window.dbManager.createFileSubscription(fileSubscriptionData);

    if (result.success) {
      closeNewFileSubscriptionModal();
      await loadFileSubscriptions();
      if (window.dashboardManager?.updateStatistics) await window.dashboardManager.updateStatistics();
      alert('تم حفظ اشتراك الملفات بنجاح!');
    } else {
      console.error('❌ فشل حفظ الاشتراك:', result.error);
      alert('حدث خطأ أثناء حفظ الاشتراك. يرجى المحاولة مرة أخرى.');
    }
  } catch (error) {
    console.error('❌ خطأ غير متوقع:', error);
    alert('حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.');
  }
}

function closeNewFileSubscriptionModal() {
  const modal = document.getElementById('newFileSubscriptionModal');
  if (modal) {
    modal.classList.add('hidden');
    document.getElementById('newFileSubscriptionForm')?.reset();
  }
}

// تعريض الدوال للعالمية للحفاظ على السلوك السابق
window.calculateEndDate = calculateEndDate;
window.loadFileSubscriptions = loadFileSubscriptions;
window.handleFileSubscriptionSubmit = handleFileSubscriptionSubmit;
window.closeNewFileSubscriptionModal = closeNewFileSubscriptionModal;

