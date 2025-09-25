// جزء 3: حفظ الاشتراك وحساب تاريخ الانتهاء

async function handleSubscriptionSubmit(event) {
  event.preventDefault();
  try {
    if (!dbManager) {
      alert('خطأ: قاعدة البيانات غير متاحة. يرجى إعادة تحميل الصفحة.');
      return;
    }

    const currentUser = JSON.parse(localStorage.getItem('userData') || '{}');
    if (!currentUser.id) {
      alert('خطأ: لم يتم العثور على معلومات المستخدم');
      return;
    }

    const customerName = document.getElementById('customerName')?.value || generateCustomerName();
    const email = document.getElementById('customerEmail')?.value;
    const whatsapp = document.getElementById('countryCode')?.value + document.getElementById('customerWhatsapp')?.value;
    const type = document.getElementById('subscriptionType')?.value;
    const currency = document.getElementById('currency')?.value;
    if (!email || !whatsapp || !type || !currency) {
      alert('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    const expiryDate = document.getElementById('expiryDate')?.value || calculateExpiryDate();

    const subscriptionData = {
      customer_name: customerName,
      email,
      whatsapp,
      subscription_type: type,
      currency,
      start_date: new Date().toISOString(),
      expiry_date: expiryDate,
      custom_subscription_name: type === 'other' ? document.getElementById('customSubscriptionName')?.value : null,
    };

    if (document.getElementById('addPassword')?.checked) {
      subscriptionData.subscription_password = document.getElementById('subscriptionPassword')?.value;
    }
    if (document.getElementById('addGooglePlay')?.checked) {
      subscriptionData.google_play_email = document.getElementById('googlePlayEmail')?.value;
      subscriptionData.google_play_password = document.getElementById('googlePlayPassword')?.value;
      if (document.getElementById('addGpaCode')?.checked) {
        subscriptionData.gpa_code = document.getElementById('gpaCode')?.value;
      }
    }
    if (document.getElementById('addNotes')?.checked) {
      const notesTextarea = document.querySelector('textarea[name="notes"]');
      if (notesTextarea && notesTextarea.value.trim()) subscriptionData.notes = notesTextarea.value.trim();
    }

    subscriptionData.created_by = currentUser.id;

    let result;
    if (window.currentSubscriptionId) {
      result = await dbManager.updateSubscription(window.currentSubscriptionId, subscriptionData);
    } else {
      result = await dbManager.createSubscription(subscriptionData);
    }

    if (result.success) {
      closeSubscriptionModal();
      await loadSubscriptions();
      await updateStatistics();
      alert(window.currentSubscriptionId ? 'تم تحديث الاشتراك بنجاح' : 'تم إضافة الاشتراك بنجاح');
      window.currentSubscriptionId = null;
    } else {
      console.error('❌ فشل حفظ الاشتراك:', result.error);
      alert(result.error || 'حدث خطأ أثناء حفظ الاشتراك');
    }
  } catch (error) {
    console.error('Error saving subscription:', error);
    alert('حدث خطأ أثناء حفظ الاشتراك');
  }
}

function calculateExpiryDate() {
  const duration = document.getElementById('subscriptionDuration').value;
  const date = new Date();
  switch (duration) {
    case '1': date.setMonth(date.getMonth() + 1); break;
    case '3': date.setMonth(date.getMonth() + 3); break;
    case '6': date.setMonth(date.getMonth() + 6); break;
    case '12': date.setFullYear(date.getFullYear() + 1); break;
  }
  return date.toISOString().split('T')[0];
}

// expose
window.handleSubscriptionSubmit = handleSubscriptionSubmit;
window.calculateExpiryDate = calculateExpiryDate;

