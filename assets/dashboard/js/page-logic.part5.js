// جزء 5: نافذة خيارات الطباعة وإنشاء مستند الطباعة

function showPrintOptionsModal(subscription, type) {
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
  modal.id = 'printOptionsModal';

  const isFile = type === 'file';
  modal.innerHTML = `
    <div class="bg-[#2a2a2a] rounded-lg w-full max-w-md p-6">
      <h3 class="text-xl font-bold mb-4 text-center">خيارات الطباعة</h3>
      <form id="printOptionsForm" class="space-y-3">
        <div class="grid grid-cols-2 gap-2 text-sm">
          <label class="flex items-center"><input type="checkbox" name="printOptions" value="accountInfo" checked class="ml-2">معلومات الحساب</label>
          <label class="flex items-center"><input type="checkbox" name="printOptions" value="subscriptionType" checked class="ml-2">نوع الاشتراك</label>
          <label class="flex items-center"><input type="checkbox" name="printOptions" value="customerName" checked class="ml-2">اسم العميل</label>
          <label class="flex items-center"><input type="checkbox" name="printOptions" value="expiryDate" checked class="ml-2">تاريخ انتهاء الاشتراك</label>
          <label class="flex items-center"><input type="checkbox" name="printOptions" value="currency" checked class="ml-2">العملة</label>
          <label class="flex items-center"><input type="checkbox" name="printOptions" value="whatsapp" checked class="ml-2">رقم الواتساب</label>
          <label class="flex items-center"><input type="checkbox" name="printOptions" value="invoiceNumber" class="ml-2">رقم الفاتورة</label>
          <label class="flex items-center"><input type="checkbox" name="printOptions" value="orderDate" class="ml-2">تاريخ الطلب</label>
          <label class="flex items-center"><input type="checkbox" name="printOptions" value="notes" class="ml-2">الملاحظات</label>
          <label class="flex items-center"><input type="checkbox" name="printOptions" value="googlePlay" class="ml-2">حساب جوجل بلاي</label>
          <label class="flex items-center"><input type="checkbox" name="printOptions" value="issueDate" checked class="ml-2">تاريخ إصدار الفاتورة</label>
          ${isFile ? `
            <label class="flex items-center"><input type="checkbox" name="printOptions" value="fileType" checked class="ml-2">نوع الملف</label>
            <label class="flex items-center"><input type="checkbox" name="printOptions" value="category" class="ml-2">التصنيف</label>
          ` : ''}
        </div>
        <div class="flex justify-end gap-2 pt-4 border-t border-gray-700">
          <button type="button" onclick="closePrintOptionsModal()" class="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">إلغاء</button>
          <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">طباعة</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);
  const printForm = document.getElementById('printOptionsForm');
  if (printForm) {
    printForm.addEventListener('submit', function(e) {
      e.preventDefault();
      try {
        const formData = new FormData(e.target);
        const selectedOptions = formData.getAll('printOptions');
        closePrintOptionsModal();
        setTimeout(() => generatePrintDocument(subscription, type, selectedOptions), 100);
      } catch (error) {
        console.error('❌ خطأ في معالج الطباعة:', error);
        closePrintOptionsModal();
        alert('حدث خطأ أثناء الطباعة');
      }
    });
  }

  // إغلاق عند الضغط خارج النافذة
  modal.addEventListener('click', function(e) { if (e.target === modal) closePrintOptionsModal(); });
  // إغلاق عند الضغط على Escape
  const handleEscapeKey = function(e){ if (e.key === 'Escape') { closePrintOptionsModal(); document.removeEventListener('keydown', handleEscapeKey);} };
  document.addEventListener('keydown', handleEscapeKey);
}

function closePrintOptionsModal() {
  const modal = document.getElementById('printOptionsModal');
  if (modal) modal.remove();
}

function generatePrintDocument(subscription, type, selectedOptions) {
  try {
    const isFile = type === 'file';
    const today = new Date().toLocaleDateString('ar-SA');
    let content = `
      <div style="font-family: Arial, sans-serif; direction: rtl; padding: 20px; max-width: 600px; margin: 0 auto;">
        <div style="text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px;">
          <h1 style="color: #333; margin: 0;">فاتورة اشتراك</h1>
          <p style="color: #666; margin: 5px 0;">تاريخ الإصدار: ${today}</p>
        </div>
        <div style="background: #f9f9f9; padding: 20px; border-radius: 8px;">
    `;

    if (selectedOptions.includes('accountInfo')) content += `<p><strong>البريد الإلكتروني:</strong> ${subscription.email || 'غير محدد'}</p>`;
    if (selectedOptions.includes('subscriptionType')) {
      const typeName = isFile ? getFileTypeName(subscription.subscription_type || subscription.type, subscription.custom_subscription_name || subscription.customSubscriptionName)
                              : getSubscriptionTypeName(subscription.subscription_type || subscription.type);
      content += `<p><strong>نوع الاشتراك:</strong> ${typeName}</p>`;
    }
    if (selectedOptions.includes('customerName')) content += `<p><strong>اسم العميل:</strong> ${subscription.customer_name || subscription.customerName || 'غير محدد'}</p>`;
    if (selectedOptions.includes('expiryDate')) {
      const expiryDate = subscription.expiry_date || subscription.expiryDate;
      const formattedDate = expiryDate ? new Date(expiryDate).toLocaleDateString('ar-SA') : 'غير محدد';
      content += `<p><strong>تاريخ انتهاء الاشتراك:</strong> ${formattedDate}</p>`;
    }
    if (selectedOptions.includes('currency')) content += `<p><strong>العملة:</strong> ${getCurrencyName(subscription.currency)}</p>`;
    if (selectedOptions.includes('whatsapp')) content += `<p><strong>رقم الواتساب:</strong> ${subscription.whatsapp || 'غير محدد'}</p>`;
    if (selectedOptions.includes('invoiceNumber') && (subscription.invoice_number || subscription.invoiceNumber)) content += `<p><strong>رقم الفاتورة:</strong> ${subscription.invoice_number || subscription.invoiceNumber}</p>`;
    if (selectedOptions.includes('orderDate') && (subscription.order_date || subscription.orderDate)) content += `<p><strong>تاريخ الطلب:</strong> ${new Date(subscription.order_date || subscription.orderDate).toLocaleDateString('ar-SA')}</p>`;
    if (selectedOptions.includes('notes') && subscription.notes) content += `<p><strong>الملاحظات:</strong> ${subscription.notes}</p>`;
    if (selectedOptions.includes('googlePlay') && (subscription.google_play_email || subscription.googlePlayEmail)) content += `<p><strong>حساب جوجل بلاي:</strong> ${subscription.google_play_email || subscription.googlePlayEmail}</p>`;
    if (isFile && selectedOptions.includes('fileType')) content += `<p><strong>نوع الملف:</strong> ${subscription.file_name || subscription.fileName || 'غير محدد'}</p>`;
    if (isFile && selectedOptions.includes('category') && subscription.category) content += `<p><strong>التصنيف:</strong> ${subscription.category}</p>`;

    content += `</div><div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;"><p style="color: #666; font-size: 12px;">شكراً لاختياركم خدماتنا</p></div></div>`;

    const htmlContent = `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><title>فاتورة اشتراك</title><style>body{margin:0;padding:20px;font-family:Arial,sans-serif}@media print{body{margin:0}}</style></head><body>${content}</body></html>`;
    const blob = new Blob([htmlContent], { type: 'text/html; charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const printWindow = window.open(url, '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes,status=no,toolbar=no,menubar=no');
    if (!printWindow) { alert('فشل في فتح نافذة الطباعة. يرجى السماح بالنوافذ المنبثقة.'); URL.revokeObjectURL(url); return; }
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  } catch (error) {
    console.error('❌ خطأ في إنشاء مستند الطباعة:', error);
    alert('حدث خطأ أثناء إنشاء مستند الطباعة: ' + error.message);
  }
}

// expose
window.showPrintOptionsModal = showPrintOptionsModal;
window.closePrintOptionsModal = closePrintOptionsModal;
window.generatePrintDocument = generatePrintDocument;

