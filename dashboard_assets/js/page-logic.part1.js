// جزء 1: متغيرات عامة ودوال أساسية للواجهة
var subscriptions = [];
var currentSubscriptionId = null;
var currentSubscriptionType = null;
var nextCustomerId = 1;
var regularSubscriptions = [];
var fileSubscriptions = [];

// دالة تحميل الاشتراكات (تعكس السلوك الأصلي)
async function loadSubscriptions() {
  try {
    console.log('جاري تحميل الاشتراكات...');
    if (!dbManager) {
      console.error('خطأ: dbManager غير متوفر');
      return;
    }

    const result = await dbManager.getAllSubscriptions();
    if (result.success) {
      console.log('تم تحميل الاشتراكات بنجاح:', result.data);
      await updateSubscriptionsTable(result.data);
    } else {
      console.error('فشل تحميل الاشتراكات:', result.error);
    }
  } catch (error) {
    console.error('حدث خطأ أثناء تحميل الاشتراكات:', error);
  }
}

// دالة معالجة تغيير مدة الاشتراك
function handleDurationChange() {
  const duration = document.getElementById('subscriptionDuration').value;
  const expiryDateInput = document.getElementById('expiryDate');

  if (duration && expiryDateInput) {
    const date = new Date();
    switch (duration) {
      case '1':
        date.setMonth(date.getMonth() + 1);
        break;
      case '3':
        date.setMonth(date.getMonth() + 3);
        break;
      case '6':
        date.setMonth(date.getMonth() + 6);
        break;
      case '12':
        date.setFullYear(date.getFullYear() + 1);
        break;
    }
    expiryDateInput.value = date.toISOString().split('T')[0];
  }
}

// التحقق من حالة تسجيل الدخول
function checkAuth() {
  const isLoggedIn = localStorage.getItem('isLoggedIn');
  const userData = JSON.parse(localStorage.getItem('userData') || '{}');

  if (!isLoggedIn || isLoggedIn !== 'true' || !userData.email) {
    console.log('User not logged in, redirecting to login page');
    window.location.href = 'login.html';
    return false;
  }

  if (!userData.isAdmin && userData.expiryDate && new Date(userData.expiryDate) < new Date()) {
    localStorage.removeItem('isLoggedIn');
    window.location.href = 'subscription-expired.html';
    return false;
  }

  return true;
}

// تسجيل الخروج
function logout() {
  localStorage.removeItem('isLoggedIn');
  localStorage.removeItem('userData');
  window.location.href = 'login.html';
}

// دالة إنشاء اسم عميل تلقائي
function generateCustomerName() {
  const name = `عميل ${nextCustomerId}`;
  nextCustomerId++;
  return name;
}

// تعريض الدوال للعالمية كما في السلوك الأصلي
window.loadSubscriptions = loadSubscriptions;
window.handleDurationChange = handleDurationChange;
window.checkAuth = checkAuth;
window.logout = logout;
window.generateCustomerName = generateCustomerName;

