// جزء 4: إظهار/إخفاء الأقسام + إغلاق/إعادة تعيين المودالات + تبديل التبويبات

function toggleGooglePlaySection(checkbox) {
  const section = document.getElementById('googlePlaySection');
  if (!section) return;
  section.classList.toggle('hidden', !checkbox.checked);
}

function toggleGpaSection(checkbox) {
  const section = document.getElementById('gpaSection');
  if (!section) return;
  section.classList.toggle('hidden', !checkbox.checked);
}

function toggleNotesSection(checkbox) {
  const section = document.getElementById('notesSection');
  if (!section) return;
  section.classList.toggle('hidden', !checkbox.checked);
}

function toggleFileNotesSection(checkbox) {
  const section = document.getElementById('fileNotesSection');
  if (!section) return;
  section.classList.toggle('hidden', !checkbox.checked);
}

function toggleInvoiceSection(checkbox) {
  const section = document.getElementById('invoiceSection');
  if (!section) return;
  section.classList.toggle('hidden', !checkbox.checked);
}

function toggleOrderDateSection(checkbox) {
  const section = document.getElementById('orderDateSection');
  if (!section) return;
  section.classList.toggle('hidden', !checkbox.checked);
}

function togglePasswordSection(checkbox) {
  const section = document.getElementById('passwordSection');
  if (!section) return;
  section.classList.toggle('hidden', !checkbox.checked);
}

function toggleFileInvoiceSection(checkbox) {
  const section = document.getElementById('fileInvoiceSection');
  if (!section) return;
  section.classList.toggle('hidden', !checkbox.checked);
}

function toggleFileOrderDateSection(checkbox) {
  const section = document.getElementById('fileOrderDateSection');
  if (!section) return;
  section.classList.toggle('hidden', !checkbox.checked);
}

function toggleCustomFileSubscriptionField(selectElement) {
  const customDiv = document.getElementById('customFileSubscriptionDiv');
  const customInput = document.querySelector('[name="customSubscriptionName"]');
  if (!customDiv || !customInput) return;
  const isOther = selectElement.value === 'other';
  customDiv.classList.toggle('hidden', !isOther);
  customInput.required = isOther;
  if (!isOther) customInput.value = '';
}

function closeSubscriptionModal() {
  const modal = document.getElementById('subscriptionModal');
  const form = document.getElementById('subscriptionForm');
  if (modal) modal.classList.add('hidden');
  if (form) form.reset();
  ['passwordFields','googlePlaySection','gpaSection','notesSection']
    .forEach(id => document.getElementById(id)?.classList.add('hidden'));
  ['addPassword','addGooglePlay','addGpaCode','addNotes']
    .forEach(id => { const el = document.getElementById(id); if (el) el.checked = false; });
  if (typeof currentSubscriptionId !== 'undefined') currentSubscriptionId = null;
}

function closeNewFileSubscriptionModal() {
  const modal = document.getElementById('newFileSubscriptionModal');
  if (modal) { modal.classList.remove('flex'); modal.classList.add('hidden'); }
  const form = document.getElementById('newFileSubscriptionForm');
  if (form) form.reset();
  const notesSection = document.getElementById('fileNotesSection');
  if (notesSection) notesSection.classList.add('hidden');
  const notesCheckbox = document.getElementById('addFileNotes');
  if (notesCheckbox) notesCheckbox.checked = false;
}

function openNewFileSubscriptionModal() {
  const modal = document.getElementById('newFileSubscriptionModal');
  if (modal) { modal.classList.remove('hidden'); modal.classList.add('flex'); }
}

function switchTab(tabName) {
  // إزالة active من جميع الأزرار
  document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));

  // إضافة active للزر المحدد
  const activeTab = document.getElementById(`${tabName}Tab`);
  if (activeTab) activeTab.classList.add('active');

  // تحديث القائمة المنسدلة للجوال
  const mobileSelect = document.getElementById('mobileTabSelect');
  if (mobileSelect) mobileSelect.value = tabName;

  // إخفاء جميع الجداول
  ['subscriptionsTable','filesTable','customersTable'].forEach(id => {
    const table = document.getElementById(id);
    if (table) table.classList.add('hidden');
  });

  // إظهار الجدول المحدد
  const targetTable = document.getElementById(`${tabName}Table`);
  if (targetTable) targetTable.classList.remove('hidden');

  // إظهار/إخفاء زر إدارة التصنيفات
  const categoriesButton = document.querySelector('button[onclick="openCategoriesModal()"]');
  if (categoriesButton) categoriesButton.classList.toggle('hidden', tabName !== 'files');

  // تحديث محتوى الجداول
  if (tabName === 'subscriptions') {
    window.updateSubscriptionsTable?.();
  } else if (tabName === 'files') {
    window.updateFilesTable?.();
  } else if (tabName === 'customers') {
    window.loadCustomersList?.();
  }
}

// expose على النطاق العام
window.toggleGooglePlaySection = toggleGooglePlaySection;
window.toggleGpaSection = toggleGpaSection;
window.toggleNotesSection = toggleNotesSection;
window.toggleFileNotesSection = toggleFileNotesSection;
window.toggleInvoiceSection = toggleInvoiceSection;
window.toggleOrderDateSection = toggleOrderDateSection;
window.togglePasswordSection = togglePasswordSection;
window.toggleFileInvoiceSection = toggleFileInvoiceSection;
window.toggleFileOrderDateSection = toggleFileOrderDateSection;
window.toggleCustomFileSubscriptionField = toggleCustomFileSubscriptionField;
window.closeSubscriptionModal = closeSubscriptionModal;
window.closeNewFileSubscriptionModal = closeNewFileSubscriptionModal;
window.openNewFileSubscriptionModal = openNewFileSubscriptionModal;
window.switchTab = switchTab;

