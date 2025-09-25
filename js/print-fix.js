// إصلاح مشكلة الطباعة - حل بسيط وفعال
console.log('📂 تحميل إصلاح الطباعة...');

// دالة طباعة محسنة لتجنب التعليق
function printTableFixed(tableId) {
    try {
        console.log('🖨️ بدء عملية الطباعة المحسنة للجدول:', tableId);
        
        const tableContainer = document.getElementById(tableId);
        if (!tableContainer) {
            console.error('❌ لم يتم العثور على الحاوي:', tableId);
            alert('لم يتم العثور على الجدول للطباعة');
            return;
        }

        // البحث عن الجدول الفعلي داخل الحاوي
        let actualTable;
        if (tableId === 'subscriptionsTable') {
            actualTable = document.querySelector('#tableView table');
        } else if (tableId === 'filesTable') {
            actualTable = document.querySelector('#filesTableView table');
        } else {
            actualTable = tableContainer.querySelector('table');
        }

        if (!actualTable) {
            console.error('❌ لم يتم العثور على الجدول للطباعة');
            alert('لم يتم العثور على بيانات للطباعة');
            return;
        }

        // إنشاء نسخة من الجدول للطباعة
        const tableClone = actualTable.cloneNode(true);
        
        // إزالة أعمدة الإجراءات
        const actionHeaders = tableClone.querySelectorAll('th:last-child');
        const actionCells = tableClone.querySelectorAll('td:last-child');
        actionHeaders.forEach(header => header.remove());
        actionCells.forEach(cell => cell.remove());

        // إنشاء محتوى HTML للطباعة
        const htmlContent = [
            '<!DOCTYPE html>',
            '<html dir="rtl" lang="ar">',
            '<head>',
            '<meta charset="UTF-8">',
            '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
            '<title>طباعة الجدول</title>',
            '<style>',
            'body { font-family: Arial, sans-serif; direction: rtl; margin: 20px; background: white; }',
            'table { width: 100%; border-collapse: collapse; margin: 20px 0; }',
            'th, td { border: 1px solid #333; padding: 8px; text-align: right; font-size: 12px; }',
            'th { background-color: #f5f5f5; font-weight: bold; }',
            'h2 { text-align: center; margin-bottom: 20px; color: #333; }',
            '@media print {',
            '  body { margin: 0; padding: 10px; }',
            '  table { page-break-inside: auto; }',
            '  tr { page-break-inside: avoid; page-break-after: auto; }',
            '}',
            '</style>',
            '</head>',
            '<body>',
            '<h2>تقرير الاشتراكات</h2>',
            tableClone.outerHTML,
            '<script>',
            'window.onload = function() {',
            '  setTimeout(function() {',
            '    window.print();',
            '    setTimeout(function() {',
            '      window.close();',
            '    }, 500);',
            '  }, 1000);',
            '};',
            '</script>',
            '</body>',
            '</html>'
        ].join('\n');

        // إنشاء Blob وفتحه في نافذة جديدة
        const blob = new Blob([htmlContent], { type: 'text/html; charset=utf-8' });
        const url = URL.createObjectURL(blob);
        
        // فتح النافذة مع معاملات محددة
        const printWindow = window.open(url, '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes,status=no,toolbar=no,menubar=no');
        
        if (!printWindow) {
            console.error('❌ فشل في فتح نافذة الطباعة');
            alert('فشل في فتح نافذة الطباعة. يرجى السماح بالنوافذ المنبثقة وإعادة المحاولة.');
            URL.revokeObjectURL(url);
            return;
        }

        // تنظيف URL بعد فترة
        setTimeout(() => {
            URL.revokeObjectURL(url);
            console.log('🧹 تم تنظيف URL');
        }, 10000);

        console.log('✅ تم إنشاء نافذة الطباعة بنجاح');

    } catch (error) {
        console.error('❌ خطأ في عملية الطباعة:', error);
        alert('حدث خطأ أثناء الطباعة: ' + error.message);
    }
}

// استبدال دالة الطباعة الأصلية
if (typeof window !== 'undefined') {
    // حفظ الدالة الأصلية كنسخة احتياطية
    window.printTableOriginal = window.printTable;
    
    // استبدال الدالة بالنسخة المحسنة
    window.printTable = printTableFixed;
    
    console.log('✅ تم استبدال دالة الطباعة بالنسخة المحسنة');
}

// دالة طباعة اشتراك واحد - بدون نوافذ نهائياً
async function printSingleSubscription(subscriptionId, type = 'regular') {
    try {
        console.log('🖨️ طباعة اشتراك واحد بدون نوافذ:', subscriptionId, type);

        // البحث عن الاشتراك في قاعدة البيانات
        let subscription = null;

        if (window.dbManager) {
            let result;
            if (type === 'regular') {
                result = await window.dbManager.getAllSubscriptions();
                if (result.success) {
                    subscription = result.subscriptions.find(sub => sub.id == subscriptionId);
                }
            } else if (type === 'file') {
                result = await window.dbManager.getAllFileSubscriptions();
                if (result.success) {
                    subscription = result.subscriptions.find(sub => sub.id == subscriptionId);
                }
            }
        }

        if (!subscription) {
            alert('لم يتم العثور على بيانات الاشتراك');
            return;
        }

        // طباعة مباشرة في نفس الصفحة بدون نوافذ
        printInvoiceDirectly(subscription, type);

        console.log('✅ تم تحضير الطباعة المباشرة');

    } catch (error) {
        console.error('❌ خطأ في طباعة الاشتراك:', error);
        alert('حدث خطأ أثناء طباعة الاشتراك: ' + error.message);
    }
}

// دالة طباعة مباشرة بدون نوافذ - تستخدم iframe مخفي
function printInvoiceDirectly(subscription, type) {
    try {
        console.log('🖨️ طباعة مباشرة بدون نوافذ');

        // إنشاء iframe مخفي للطباعة
        const iframe = document.createElement('iframe');
        iframe.style.position = 'absolute';
        iframe.style.left = '-9999px';
        iframe.style.top = '-9999px';
        iframe.style.width = '1px';
        iframe.style.height = '1px';
        iframe.style.border = 'none';

        document.body.appendChild(iframe);

        // إنشاء محتوى الفاتورة
        const today = new Date().toLocaleDateString('ar-SA');
        const expiryDate = subscription.expiry_date || subscription.expiryDate;
        const formattedExpiryDate = expiryDate ? new Date(expiryDate).toLocaleDateString('ar-SA') : 'غير محدد';

        let subscriptionTypeName;
        if (type === 'file') {
            subscriptionTypeName = getFileTypeName(subscription.subscription_type || subscription.type, subscription.custom_subscription_name || subscription.customSubscriptionName);
        } else {
            subscriptionTypeName = getSubscriptionTypeName(subscription.subscription_type || subscription.type);
        }

        // كتابة المحتوى في الـ iframe
        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;

        iframeDoc.open();
        iframeDoc.write('<!DOCTYPE html>');
        iframeDoc.write('<html dir="rtl" lang="ar">');
        iframeDoc.write('<head>');
        iframeDoc.write('<meta charset="UTF-8">');
        iframeDoc.write('<title>فاتورة اشتراك</title>');
        iframeDoc.write('<style>');
        iframeDoc.write('body { font-family: Arial, sans-serif; direction: rtl; margin: 20px; background: white; }');
        iframeDoc.write('.invoice { max-width: 600px; margin: 0 auto; border: 2px solid #333; padding: 20px; }');
        iframeDoc.write('.header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }');
        iframeDoc.write('.header h1 { color: #333; margin: 0; font-size: 24px; }');
        iframeDoc.write('.header p { color: #666; margin: 5px 0; }');
        iframeDoc.write('.content { background: #f9f9f9; padding: 20px; border-radius: 8px; }');
        iframeDoc.write('.field { margin-bottom: 15px; padding: 10px; background: white; border-radius: 4px; border-right: 4px solid #007bff; }');
        iframeDoc.write('.field strong { color: #333; display: inline-block; min-width: 150px; }');
        iframeDoc.write('.footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; }');
        iframeDoc.write('</style>');
        iframeDoc.write('</head>');
        iframeDoc.write('<body>');
        iframeDoc.write('<div class="invoice">');
        iframeDoc.write('<div class="header">');
        iframeDoc.write('<h1>' + (type === 'file' ? 'فاتورة اشتراك ملف' : 'فاتورة اشتراك') + '</h1>');
        iframeDoc.write('<p>تاريخ الإصدار: ' + today + '</p>');
        iframeDoc.write('</div>');
        iframeDoc.write('<div class="content">');
        iframeDoc.write('<div class="field"><strong>البريد الإلكتروني:</strong> ' + (subscription.email || 'غير محدد') + '</div>');
        iframeDoc.write('<div class="field"><strong>نوع الاشتراك:</strong> ' + subscriptionTypeName + '</div>');

        if (type === 'file') {
            iframeDoc.write('<div class="field"><strong>اسم الملف:</strong> ' + (subscription.file_name || subscription.fileName || 'غير محدد') + '</div>');
            iframeDoc.write('<div class="field"><strong>نوع الحساب:</strong> ' + ((subscription.account_type || subscription.accountType) === 'subscriber' ? 'مشترك' : 'خاص') + '</div>');
        } else {
            iframeDoc.write('<div class="field"><strong>اسم العميل:</strong> ' + (subscription.customer_name || subscription.customerName || 'غير محدد') + '</div>');
            iframeDoc.write('<div class="field"><strong>العملة:</strong> ' + getCurrencyName(subscription.currency) + '</div>');
        }

        iframeDoc.write('<div class="field"><strong>تاريخ انتهاء الاشتراك:</strong> ' + formattedExpiryDate + '</div>');
        iframeDoc.write('<div class="field"><strong>رقم الواتساب:</strong> ' + (subscription.whatsapp || 'غير محدد') + '</div>');

        if (subscription.notes) {
            iframeDoc.write('<div class="field"><strong>ملاحظات:</strong> ' + subscription.notes + '</div>');
        }

        iframeDoc.write('</div>');
        iframeDoc.write('<div class="footer">');
        iframeDoc.write('<p style="color: #666; font-size: 12px;">شكراً لاختياركم خدماتنا</p>');
        iframeDoc.write('</div>');
        iframeDoc.write('</div>');
        iframeDoc.write('</body>');
        iframeDoc.write('</html>');
        iframeDoc.close();

        // انتظار تحميل المحتوى ثم الطباعة
        setTimeout(() => {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();

            // حذف الـ iframe بعد الطباعة
            setTimeout(() => {
                document.body.removeChild(iframe);
                console.log('✅ تم حذف iframe وانتهاء الطباعة');
            }, 2000);
        }, 1000);

        console.log('✅ تم إنشاء iframe للطباعة');

    } catch (error) {
        console.error('❌ خطأ في الطباعة المباشرة:', error);
        alert('حدث خطأ أثناء الطباعة');
    }
}

// دالة إنشاء HTML بسيط للفاتورة (للطباعة في نفس الصفحة)
function createSimpleInvoiceHTML(subscription, type) {
    const today = new Date().toLocaleDateString('ar-SA');
    const expiryDate = subscription.expiry_date || subscription.expiryDate;
    const formattedExpiryDate = expiryDate ? new Date(expiryDate).toLocaleDateString('ar-SA') : 'غير محدد';

    // تحديد نوع الاشتراك
    let subscriptionTypeName;
    if (type === 'file') {
        subscriptionTypeName = getFileTypeName(subscription.subscription_type || subscription.type, subscription.custom_subscription_name || subscription.customSubscriptionName);
    } else {
        subscriptionTypeName = getSubscriptionTypeName(subscription.subscription_type || subscription.type);
    }

    return `
        <div style="font-family: Arial, sans-serif; direction: rtl; max-width: 600px; margin: 20px auto; border: 2px solid #333; padding: 20px; background: white;">
            <div style="text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px;">
                <h1 style="color: #333; margin: 0; font-size: 24px;">${type === 'file' ? 'فاتورة اشتراك ملف' : 'فاتورة اشتراك'}</h1>
                <p style="color: #666; margin: 5px 0;">تاريخ الإصدار: ${today}</p>
            </div>
            <div style="background: #f9f9f9; padding: 20px; border-radius: 8px;">
                <div style="margin-bottom: 15px; padding: 10px; background: white; border-radius: 4px; border-right: 4px solid #007bff;">
                    <strong style="color: #333; display: inline-block; min-width: 150px;">البريد الإلكتروني:</strong> ${subscription.email || 'غير محدد'}
                </div>
                <div style="margin-bottom: 15px; padding: 10px; background: white; border-radius: 4px; border-right: 4px solid #007bff;">
                    <strong style="color: #333; display: inline-block; min-width: 150px;">نوع الاشتراك:</strong> ${subscriptionTypeName}
                </div>
                ${type === 'file' ? `
                <div style="margin-bottom: 15px; padding: 10px; background: white; border-radius: 4px; border-right: 4px solid #007bff;">
                    <strong style="color: #333; display: inline-block; min-width: 150px;">اسم الملف:</strong> ${subscription.file_name || subscription.fileName || 'غير محدد'}
                </div>
                <div style="margin-bottom: 15px; padding: 10px; background: white; border-radius: 4px; border-right: 4px solid #007bff;">
                    <strong style="color: #333; display: inline-block; min-width: 150px;">نوع الحساب:</strong> ${(subscription.account_type || subscription.accountType) === 'subscriber' ? 'مشترك' : 'خاص'}
                </div>
                ` : `
                <div style="margin-bottom: 15px; padding: 10px; background: white; border-radius: 4px; border-right: 4px solid #007bff;">
                    <strong style="color: #333; display: inline-block; min-width: 150px;">اسم العميل:</strong> ${subscription.customer_name || subscription.customerName || 'غير محدد'}
                </div>
                <div style="margin-bottom: 15px; padding: 10px; background: white; border-radius: 4px; border-right: 4px solid #007bff;">
                    <strong style="color: #333; display: inline-block; min-width: 150px;">العملة:</strong> ${getCurrencyName(subscription.currency)}
                </div>
                `}
                <div style="margin-bottom: 15px; padding: 10px; background: white; border-radius: 4px; border-right: 4px solid #007bff;">
                    <strong style="color: #333; display: inline-block; min-width: 150px;">تاريخ انتهاء الاشتراك:</strong> ${formattedExpiryDate}
                </div>
                <div style="margin-bottom: 15px; padding: 10px; background: white; border-radius: 4px; border-right: 4px solid #007bff;">
                    <strong style="color: #333; display: inline-block; min-width: 150px;">رقم الواتساب:</strong> ${subscription.whatsapp || 'غير محدد'}
                </div>
                ${subscription.notes ? `
                <div style="margin-bottom: 15px; padding: 10px; background: white; border-radius: 4px; border-right: 4px solid #007bff;">
                    <strong style="color: #333; display: inline-block; min-width: 150px;">ملاحظات:</strong> ${subscription.notes}
                </div>
                ` : ''}
            </div>
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
                <p style="color: #666; font-size: 12px;">شكراً لاختياركم خدماتنا</p>
            </div>
        </div>
        <script>
            function getSubscriptionTypeName(type) {
                const types = {
                    'netflix': 'نتفلكس',
                    'shahid_vip': 'شاهد مسلسلات',
                    'shahid_sport': 'شاهد رياضي',
                    'shahid_year': 'شاهد سنة',
                    'shahid_full': 'شاهد شامل',
                    'use_pro': 'يوز برو',
                    'canva_pro': 'كانفا برو'
                };
                return types[type] || type || 'غير محدد';
            }

            function getFileTypeName(type, customName) {
                if (type === 'other' && customName) {
                    return customName;
                }
                const types = {
                    'shahid_sports': 'ملف شاهد رياضي',
                    'shahid_vip': 'ملف شاهد مسلسلات',
                    'netflix': 'ملف نتفلكس',
                    'disney': 'ملف ديزني',
                    'amazon_prime': 'ملف أمازون برايم',
                    'youtube_premium': 'ملف يوتيوب بريميوم',
                    'spotify': 'ملف سبوتيفاي',
                    'other': 'ملف مخصص'
                };
                return types[type] || type || 'غير محدد';
            }

            function getCurrencyName(currency) {
                const currencies = {
                    'USD': 'دولار أمريكي',
                    'EUR': 'يورو',
                    'SAR': 'ريال سعودي',
                    'AED': 'درهم إماراتي',
                    'EGP': 'جنيه مصري',
                    'JOD': 'دينار أردني',
                    'KWD': 'دينار كويتي',
                    'QAR': 'ريال قطري',
                    'BHD': 'دينار بحريني',
                    'OMR': 'ريال عماني',
                    'LBP': 'ليرة لبنانية',
                    'SYP': 'ليرة سورية',
                    'IQD': 'دينار عراقي',
                    'YER': 'ريال يمني',
                    'LYD': 'دينار ليبي',
                    'TND': 'دينار تونسي',
                    'DZD': 'دينار جزائري',
                    'MAD': 'درهم مغربي',
                    'SDG': 'جنيه سوداني'
                };
                return currencies[currency] || currency || 'غير محدد';
            }
        </script>
    `;
}

// دالة إنشاء HTML للفاتورة - محسنة لدعم جميع أنواع الاشتراكات (للنوافذ المنبثقة)
function createInvoiceHTML(subscription, type) {
    const today = new Date().toLocaleDateString('ar-SA');
    const expiryDate = subscription.expiry_date || subscription.expiryDate;
    const formattedExpiryDate = expiryDate ? new Date(expiryDate).toLocaleDateString('ar-SA') : 'غير محدد';

    // تحديد نوع الاشتراك
    let subscriptionTypeName;
    if (type === 'file') {
        subscriptionTypeName = getFileTypeName(subscription.subscription_type || subscription.type, subscription.custom_subscription_name || subscription.customSubscriptionName);
    } else {
        subscriptionTypeName = getSubscriptionTypeName(subscription.subscription_type || subscription.type);
    }

    return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>فاتورة اشتراك</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            direction: rtl;
            margin: 0;
            padding: 20px;
            background: white;
        }
        .invoice-container {
            max-width: 600px;
            margin: 0 auto;
            border: 2px solid #333;
            padding: 20px;
        }
        .header {
            text-align: center;
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .header h1 {
            color: #333;
            margin: 0;
            font-size: 24px;
        }
        .header p {
            color: #666;
            margin: 5px 0;
        }
        .content {
            background: #f9f9f9;
            padding: 20px;
            border-radius: 8px;
        }
        .field {
            margin-bottom: 15px;
            padding: 10px;
            background: white;
            border-radius: 4px;
            border-right: 4px solid #007bff;
        }
        .field strong {
            color: #333;
            display: inline-block;
            min-width: 150px;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
        }
        @media print {
            body { margin: 0; padding: 10px; }
            .invoice-container { border: 1px solid #333; }
        }
    </style>
</head>
<body>
    <div class="invoice-container">
        <div class="header">
            <h1>${type === 'file' ? 'فاتورة اشتراك ملف' : 'فاتورة اشتراك'}</h1>
            <p>تاريخ الإصدار: ${today}</p>
        </div>
        <div class="content">
            <div class="field">
                <strong>البريد الإلكتروني:</strong> ${subscription.email || 'غير محدد'}
            </div>
            <div class="field">
                <strong>نوع الاشتراك:</strong> ${subscriptionTypeName}
            </div>
            ${type === 'file' ? `
            <div class="field">
                <strong>اسم الملف:</strong> ${subscription.file_name || subscription.fileName || 'غير محدد'}
            </div>
            <div class="field">
                <strong>نوع الحساب:</strong> ${(subscription.account_type || subscription.accountType) === 'subscriber' ? 'مشترك' : 'خاص'}
            </div>
            ` : `
            <div class="field">
                <strong>اسم العميل:</strong> ${subscription.customer_name || subscription.customerName || 'غير محدد'}
            </div>
            <div class="field">
                <strong>العملة:</strong> ${getCurrencyName(subscription.currency)}
            </div>
            `}
            <div class="field">
                <strong>تاريخ انتهاء الاشتراك:</strong> ${formattedExpiryDate}
            </div>
            <div class="field">
                <strong>رقم الواتساب:</strong> ${subscription.whatsapp || 'غير محدد'}
            </div>
            ${subscription.notes ? `
            <div class="field">
                <strong>ملاحظات:</strong> ${subscription.notes}
            </div>
            ` : ''}
        </div>
        <div class="footer">
            <p style="color: #666; font-size: 12px;">شكراً لاختياركم خدماتنا</p>
        </div>
    </div>
    <script>
        function getSubscriptionTypeName(type) {
            const types = {
                'netflix': 'نتفلكس',
                'shahid_vip': 'شاهد مسلسلات',
                'shahid_sport': 'شاهد رياضي',
                'shahid_year': 'شاهد سنة',
                'shahid_full': 'شاهد شامل',
                'use_pro': 'يوز برو',
                'canva_pro': 'كانفا برو'
            };
            return types[type] || type || 'غير محدد';
        }

        function getFileTypeName(type, customName) {
            if (type === 'other' && customName) {
                return customName;
            }
            const types = {
                'shahid_sports': 'ملف شاهد رياضي',
                'shahid_vip': 'ملف شاهد مسلسلات',
                'netflix': 'ملف نتفلكس',
                'disney': 'ملف ديزني',
                'amazon_prime': 'ملف أمازون برايم',
                'youtube_premium': 'ملف يوتيوب بريميوم',
                'spotify': 'ملف سبوتيفاي',
                'other': 'ملف مخصص'
            };
            return types[type] || type || 'غير محدد';
        }

        function getCurrencyName(currency) {
            const currencies = {
                'USD': 'دولار أمريكي',
                'EUR': 'يورو',
                'SAR': 'ريال سعودي',
                'AED': 'درهم إماراتي',
                'EGP': 'جنيه مصري',
                'JOD': 'دينار أردني',
                'KWD': 'دينار كويتي',
                'QAR': 'ريال قطري',
                'BHD': 'دينار بحريني',
                'OMR': 'ريال عماني',
                'LBP': 'ليرة لبنانية',
                'SYP': 'ليرة سورية',
                'IQD': 'دينار عراقي',
                'YER': 'ريال يمني',
                'LYD': 'دينار ليبي',
                'TND': 'دينار تونسي',
                'DZD': 'دينار جزائري',
                'MAD': 'درهم مغربي',
                'SDG': 'جنيه سوداني'
            };
            return currencies[currency] || currency || 'غير محدد';
        }

        window.onload = function() {
            setTimeout(function() {
                window.print();
                setTimeout(function() {
                    window.close();
                }, 500);
            }, 1000);
        };
    </script>
</body>
</html>`;
}

// استبدال دالة طباعة الاشتراك الواحد أيضاً
if (typeof window !== 'undefined') {
    window.printSubscription = printSingleSubscription;
    console.log('✅ تم تعيين دالة طباعة الاشتراك الواحد');
}



// دوال مساعدة للحصول على أسماء الأنواع والعملات
function getSubscriptionTypeName(type) {
    const types = {
        'netflix': 'نتفلكس',
        'shahid_vip': 'شاهد مسلسلات',
        'shahid_sport': 'شاهد رياضي',
        'shahid_year': 'شاهد سنة',
        'shahid_full': 'شاهد شامل',
        'use_pro': 'يوز برو',
        'canva_pro': 'كانفا برو'
    };
    return types[type] || type || 'غير محدد';
}

function getFileTypeName(type, customName) {
    if (type === 'other' && customName) {
        return customName;
    }
    const types = {
        'shahid_sports': 'ملف شاهد رياضي',
        'shahid_vip': 'ملف شاهد مسلسلات',
        'netflix': 'ملف نتفلكس',
        'disney': 'ملف ديزني',
        'amazon_prime': 'ملف أمازون برايم',
        'youtube_premium': 'ملف يوتيوب بريميوم',
        'spotify': 'ملف سبوتيفاي',
        'other': 'ملف مخصص'
    };
    return types[type] || type || 'غير محدد';
}

function getCurrencyName(currency) {
    const currencies = {
        'USD': 'دولار أمريكي',
        'EUR': 'يورو',
        'SAR': 'ريال سعودي',
        'AED': 'درهم إماراتي',
        'EGP': 'جنيه مصري',
        'JOD': 'دينار أردني',
        'KWD': 'دينار كويتي',
        'QAR': 'ريال قطري',
        'BHD': 'دينار بحريني',
        'OMR': 'ريال عماني',
        'LBP': 'ليرة لبنانية',
        'SYP': 'ليرة سورية',
        'IQD': 'دينار عراقي',
        'YER': 'ريال يمني',
        'LYD': 'دينار ليبي',
        'TND': 'دينار تونسي',
        'DZD': 'دينار جزائري',
        'MAD': 'درهم مغربي',
        'SDG': 'جنيه سوداني'
    };
    return currencies[currency] || currency || 'غير محدد';
}

// إتاحة الدوال عالمياً
if (typeof window !== 'undefined') {
    window.getSubscriptionTypeName = getSubscriptionTypeName;
    window.getFileTypeName = getFileTypeName;
    window.getCurrencyName = getCurrencyName;
}

console.log('✅ تم تحميل إصلاح الطباعة بنجاح');
