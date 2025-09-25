// Dashboard Manager - إدارة لوحة التحكم
console.log('📂 بدء تحميل dashboard-manager.js');

class DashboardManager {
    constructor() {
        this.dbManager = null;
        this.userData = null;
        this.isInitialized = false;
        this.subscriptionsCache = null;
        this.lastUpdateTime = null;
        this.updateInterval = 30000; // 30 ثانية
    }

    // تهيئة المدير
    async initialize() {
        try {
            console.log('🔄 تهيئة مدير لوحة التحكم...');
            
            // فحص تسجيل الدخول
            const isLoggedIn = localStorage.getItem('isLoggedIn');
            this.userData = JSON.parse(localStorage.getItem('userData') || '{}');
            
            if (!isLoggedIn || isLoggedIn !== 'true' || !this.userData.id) {
                console.log('❌ المستخدم غير مسجل دخول');
                window.location.href = 'login.html';
                return false;
            }
            
            console.log('✅ المستخدم مسجل دخول:', this.userData.email);
            
            // تهيئة مدير قاعدة البيانات
            await this.initializeDatabaseManager();

            // التحقق من حالة حساب المستخدم (is_active وتاريخ الانتهاء)
            await this.validateUserStatus();
            
            this.isInitialized = true;

            // بدء التحديث التلقائي
            this.startAutoRefresh();

            console.log('✅ تم تهيئة مدير لوحة التحكم بنجاح');
            return true;
        } catch (error) {
            console.error('❌ خطأ في تهيئة مدير لوحة التحكم:', error);
            return false;
        }
    }

    // التحقق من حالة المستخدم من قاعدة البيانات
    async validateUserStatus() {
        try {
            const supabaseClient = (this.dbManager && this.dbManager.supabase) ? this.dbManager.supabase : (typeof supabaseDbManager !== 'undefined' ? supabaseDbManager.supabase : null);
            if (!supabaseClient) {
                console.warn('⚠️ لا يمكن التحقق من حالة المستخدم: Supabase غير متوفر');
                return;
            }

            const { data: user, error } = await supabaseClient
                .from('users')
                .select('is_active, expiry_date, is_admin')
                .eq('id', this.userData.id)
                .single();

            if (error) {
                console.error('خطأ أثناء جلب حالة المستخدم:', error);
                return;
            }

            const now = new Date();
            const isExpired = !user.is_admin && user.expiry_date && new Date(user.expiry_date) < now;
            const isInactive = user.is_active === false;

            if (isInactive || isExpired) {
                // تنظيف وتوجيه مناسب
                localStorage.removeItem('isLoggedIn');
                localStorage.removeItem('userData');

                if (isExpired) {
                    console.log('⛔ الاشتراك منتهي. إعادة التوجيه إلى صفحة انتهاء الاشتراك');
                    window.location.href = 'subscription-expired.html';
                } else {
                    console.log('⛔ الحساب معطل. إعادة التوجيه إلى صفحة تسجيل الدخول');
                    window.location.href = 'login.html';
                }
            }
        } catch (err) {
            console.error('خطأ أثناء التحقق من حالة المستخدم:', err);
        }
    }

    // تهيئة مدير قاعدة البيانات
    async initializeDatabaseManager() {
        try {
            // محاولة استخدام قاعدة البيانات المحلية أولاً
            if (typeof DatabaseManager !== 'undefined') {
                console.log('🔄 استخدام قاعدة البيانات المحلية...');
                this.dbManager = new DatabaseManager();
                await this.dbManager.waitForReady();
                console.log('✅ تم تهيئة قاعدة البيانات المحلية');
            } else {
                console.log('🔄 استخدام Supabase...');
                this.dbManager = supabaseDbManager;
                console.log('✅ تم تهيئة Supabase');
            }
            
            window.dbManager = this.dbManager;
        } catch (error) {
            console.error('❌ خطأ في تهيئة قاعدة البيانات:', error);
            // استخدام Supabase كبديل
            this.dbManager = supabaseDbManager;
            window.dbManager = this.dbManager;
            console.log('✅ تم استخدام Supabase كبديل');
        }
    }

    // تحميل الاشتراكات
    async loadSubscriptions() {
        try {
            console.log('🔄 تحميل الاشتراكات...');

            // إظهار حالة التحميل
            this.showLoadingState(true);

            if (!this.dbManager) {
                throw new Error('مدير قاعدة البيانات غير متوفر');
            }

            const result = await this.dbManager.getAllSubscriptions();

            if (result.success) {
                const subscriptions = result.subscriptions || result.data || [];
                console.log('✅ تم تحميل', subscriptions.length, 'اشتراك');

                // تحديث الجدول
                await this.updateSubscriptionsTable(subscriptions);

                // تحديث الإحصائيات
                await this.updateStatistics(subscriptions);

                // إخفاء حالة التحميل
                this.showLoadingState(false);

                return subscriptions;
            } else {
                throw new Error(result.error || 'فشل في تحميل الاشتراكات');
            }
        } catch (error) {
            console.error('❌ خطأ في تحميل الاشتراكات:', error);
            this.showErrorMessage('فشل في تحميل الاشتراكات: ' + error.message);
            this.showLoadingState(false);
            return [];
        }
    }

    // إظهار/إخفاء حالة التحميل
    showLoadingState(show) {
        const tableBody = document.getElementById('subscriptionsTableBody');
        const cardsContainer = document.getElementById('subscriptionsCardsContainer');

        if (show) {
            const loadingHTML = `
                <div class="flex items-center justify-center py-8 text-gray-400">
                    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500 ml-3"></div>
                    <span>جاري التحميل...</span>
                </div>
            `;
            if (tableBody) tableBody.innerHTML = loadingHTML;
            if (cardsContainer) cardsContainer.innerHTML = loadingHTML;
        } else {
            if (tableBody) tableBody.innerHTML = '';
            if (cardsContainer) cardsContainer.innerHTML = '';
        }
    }

    // تحديث جدول الاشتراكات
    async updateSubscriptionsTable(subscriptions) {
        try {
            const tableBody = document.getElementById('subscriptionsTableBody');
            const cardsContainer = document.getElementById('subscriptionsCardsContainer');

            if (!tableBody && !cardsContainer) {
                console.error('❌ لم يتم العثور على عناصر عرض الاشتراكات');
                return;
            }

            if (!subscriptions || subscriptions.length === 0) {
                // عرض رسالة فارغة للجدول
                if (tableBody) {
                    tableBody.innerHTML = `
                        <tr>
                            <td colspan="9" class="px-6 py-8 text-center text-gray-400">
                                <i class="fas fa-inbox text-4xl mb-2"></i>
                                <p>لا توجد اشتراكات حالياً</p>
                            </td>
                        </tr>
                    `;
                }

                // عرض رسالة فارغة للبطاقات
                if (cardsContainer) {
                    cardsContainer.innerHTML = `
                        <div class="text-center py-8 text-gray-400">
                            <i class="fas fa-inbox text-4xl mb-2"></i>
                            <p>لا توجد اشتراكات حالياً</p>
                        </div>
                    `;
                }
                return;
            }

            // مسح المحتوى الحالي
            if (tableBody) tableBody.innerHTML = '';
            if (cardsContainer) cardsContainer.innerHTML = '';

            // إضافة الاشتراكات بشكل محسن للأداء
            const fragment = document.createDocumentFragment();
            const cardsFragment = document.createDocumentFragment();

            subscriptions.forEach(subscription => {
                // إضافة صف للجدول
                if (tableBody) {
                    const row = this.createSubscriptionRow(subscription);
                    fragment.appendChild(row);
                }

                // إضافة بطاقة للعرض المحمول
                if (cardsContainer) {
                    const card = this.createSubscriptionCard(subscription);
                    cardsFragment.appendChild(card);
                }
            });

            // إضافة جميع العناصر مرة واحدة لتحسين الأداء
            if (tableBody && fragment.children.length > 0) {
                tableBody.appendChild(fragment);
            }

            if (cardsContainer && cardsFragment.children.length > 0) {
                cardsContainer.appendChild(cardsFragment);
            }

            console.log('✅ تم تحديث عرض الاشتراكات');
        } catch (error) {
            console.error('❌ خطأ في تحديث عرض الاشتراكات:', error);
        }
    }

    // إنشاء صف اشتراك
    createSubscriptionRow(subscription) {
        const row = document.createElement('tr');
        row.className = 'hover:bg-[#3a3a3a] transition-colors';

        const expiryDate = new Date(subscription.expiry_date || subscription.expiryDate);
        const now = new Date();
        const isExpired = expiryDate <= now;
        const isExpiringSoon = expiryDate > now && expiryDate <= new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
        const daysLeft = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));

        let statusClass = 'bg-green-500';
        let statusText = 'نشط';
        if (isExpired) {
            statusClass = 'bg-red-500';
            statusText = 'منتهي';
        } else if (isExpiringSoon) {
            statusClass = 'bg-yellow-500';
            statusText = 'ينتهي قريباً';
        }

        const remainingHTML = isExpired
            ? `<div class="text-sm text-red-500">منتهي</div>`
            : `<div class="text-sm ${daysLeft <= 7 ? 'text-yellow-500' : 'text-green-500'}">متبقي ${daysLeft} يوم</div>`;

        const whatsappHTML = subscription.whatsapp
            ? `<div class="flex items-center gap-2">
                    <i class="fab fa-whatsapp text-green-500"></i>
                    <a href="https://wa.me/${subscription.whatsapp}" target="_blank" class="text-green-500 hover:text-green-400 transition-colors">${subscription.whatsapp}</a>
               </div>`
            : 'غير محدد';

        const notesHTML = subscription.notes
            ? `<div class="max-w-32 truncate" title="${subscription.notes}">
                   <i class="fas fa-sticky-note text-yellow-500 ml-1"></i>${subscription.notes}
               </div>`
            : '<span class="text-gray-500">-</span>';

        row.innerHTML = `
            <td class="px-6 py-4">
                <div class="flex items-center gap-2">
                    <span class="font-medium">${subscription.customer_name || subscription.customerName || 'غير محدد'}</span>
                </div>
            </td>
            <td class="px-6 py-4">${subscription.email || 'غير محدد'}</td>
            <td class="px-6 py-4">${whatsappHTML}</td>
            <td class="px-6 py-4">${this.getSubscriptionTypeName(subscription.subscription_type || subscription.type || subscription.subscriptionType)}</td>
            <td class="px-6 py-4">${this.getCurrencyName(subscription.currency) || 'غير محدد'}</td>
            <td class="px-6 py-4">
                <div class="space-y-1">
                    <div>${this.formatDate(expiryDate)}</div>
                    ${remainingHTML}
                </div>
            </td>
            <td class="px-6 py-4">
                <span class="px-2 py-1 rounded text-sm text-white ${statusClass}">
                    ${statusText}
                </span>
            </td>
            <td class="px-6 py-4">${notesHTML}</td>
            <td class="px-6 py-4">
                <div class="flex gap-2">
                    <button onclick="showSubscriptionDetails('${subscription.id}', 'regular')"
                            class="bg-purple-600 hover:bg-purple-700 text-white px-2 py-1 rounded text-xs transition-colors"
                            title="عرض التفاصيل">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button onclick="editSubscription('${subscription.id}')"
                            class="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs transition-colors"
                            title="تعديل">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="printSubscription('${subscription.id}', 'regular')"
                            class="bg-orange-600 hover:bg-orange-700 text-white px-2 py-1 rounded text-xs transition-colors"
                            title="طباعة">
                        <i class="fas fa-print"></i>
                    </button>
                    <button onclick="renewSubscription('${subscription.id}', 'regular')"
                            class="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs transition-colors"
                            title="تجديد">
                        <i class="fas fa-sync-alt"></i>
                    </button>
                    <button onclick="deleteSubscription('${subscription.id}', 'regular')"
                            class="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs transition-colors"
                            title="حذف">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;

        return row;
    }

    // إنشاء بطاقة اشتراك للعرض المحمول
    createSubscriptionCard(subscription) {
        const card = document.createElement('div');
        card.className = 'subscription-card hover-scale active-scale fade-in';

        const expiryDate = new Date(subscription.expiry_date || subscription.expiryDate);
        const now = new Date();
        const isExpired = expiryDate <= now;
        const isExpiringSoon = expiryDate > now && expiryDate <= new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

        let statusClass = 'status-active';
        let statusText = 'نشط';
        if (isExpired) {
            statusClass = 'status-expired';
            statusText = 'منتهي';
        } else if (isExpiringSoon) {
            statusClass = 'status-expiring';
            statusText = 'ينتهي قريباً';
        }

        card.innerHTML = `
            <div class="card-header">
                <div class="flex-1">
                    <div class="card-title">${subscription.customer_name || subscription.customerName || 'عميل غير محدد'}</div>
                    <div class="card-subtitle">${this.getSubscriptionTypeName(subscription.subscription_type || subscription.type || subscription.subscriptionType)}</div>
                </div>
                <span class="status-badge ${statusClass}">${statusText}</span>
            </div>
            <div class="card-body">
                <div class="card-field">
                    <div class="card-field-label">البريد الإلكتروني</div>
                    <div class="card-field-value">
                        ${subscription.email ? `
                            <a href="mailto:${subscription.email}" class="text-blue-400 hover:text-blue-300 transition-colors">
                                <i class="fas fa-envelope mr-1"></i>${subscription.email}
                            </a>
                        ` : 'غير محدد'}
                    </div>
                </div>
                <div class="card-field">
                    <div class="card-field-label">رقم الواتساب</div>
                    <div class="card-field-value">
                        ${subscription.whatsapp ? `
                            <a href="https://wa.me/${subscription.whatsapp}" target="_blank" class="text-green-400 hover:text-green-300 transition-colors">
                                <i class="fab fa-whatsapp mr-1"></i>${subscription.whatsapp}
                            </a>
                        ` : 'غير محدد'}
                    </div>
                </div>
                <div class="card-field">
                    <div class="card-field-label">العملة</div>
                    <div class="card-field-value">${this.getCurrencyName(subscription.currency)}</div>
                </div>
                <div class="card-field">
                    <div class="card-field-label">تاريخ الانتهاء</div>
                    <div class="card-field-value">${this.formatDate(expiryDate)}</div>
                </div>
            </div>
            ${subscription.notes ? `
                <div class="mb-3">
                    <div class="card-field-label">ملاحظات</div>
                    <div class="card-field-value text-sm">${subscription.notes}</div>
                </div>
            ` : ''}
            <div class="card-actions">
                <div class="text-xs text-gray-400">
                    <i class="fas fa-calendar-alt mr-1"></i>
                    ${this.formatDate(expiryDate)}
                </div>
                <div class="flex flex-wrap gap-1">
                    <button onclick="showSubscriptionDetails('${subscription.id}', 'regular')"
                            class="bg-purple-600 hover:bg-purple-700 text-white px-2 py-1 rounded text-xs transition-colors"
                            title="عرض التفاصيل">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button onclick="editSubscription('${subscription.id}')"
                            class="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs transition-colors"
                            title="تعديل">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="printSubscription('${subscription.id}', 'regular')"
                            class="bg-orange-600 hover:bg-orange-700 text-white px-2 py-1 rounded text-xs transition-colors"
                            title="طباعة">
                        <i class="fas fa-print"></i>
                    </button>
                    <button onclick="renewSubscription('${subscription.id}', 'regular')"
                            class="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs transition-colors"
                            title="تجديد">
                        <i class="fas fa-sync-alt"></i>
                    </button>
                    <button onclick="deleteSubscription('${subscription.id}', 'regular')"
                            class="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs transition-colors"
                            title="حذف">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;

        return card;
    }

    // إنشاء بطاقة اشتراك ملف للعرض المحمول
    createFileSubscriptionCard(subscription) {
        const card = document.createElement('div');
        card.className = 'subscription-card hover-scale active-scale fade-in';

        const expiryDate = new Date(subscription.expiry_date || subscription.expiryDate);
        const now = new Date();
        const isExpired = expiryDate <= now;
        const isExpiringSoon = expiryDate > now && expiryDate <= new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

        let statusClass = 'status-active';
        let statusText = 'نشط';
        if (isExpired) {
            statusClass = 'status-expired';
            statusText = 'منتهي';
        } else if (isExpiringSoon) {
            statusClass = 'status-expiring';
            statusText = 'ينتهي قريباً';
        }

        card.innerHTML = `
            <div class="card-header">
                <div class="flex-1">
                    <div class="card-title">${this.getFileTypeName(subscription.subscription_type || subscription.type, subscription.custom_subscription_name || subscription.customSubscriptionName)}</div>
                    <div class="card-subtitle">${subscription.file_name || subscription.fileName || 'ملف غير محدد'}</div>
                </div>
                <span class="status-badge ${statusClass}">${statusText}</span>
            </div>

            <div class="card-body">
                <div class="card-field">
                    <div class="card-field-label">البريد الإلكتروني</div>
                    <div class="card-field-value">
                        ${subscription.email ? `
                            <a href="mailto:${subscription.email}" class="text-blue-400 hover:text-blue-300 transition-colors">
                                <i class="fas fa-envelope mr-1"></i>${subscription.email}
                            </a>
                        ` : 'غير محدد'}
                    </div>
                </div>

                <div class="card-field">
                    <div class="card-field-label">رقم الواتساب</div>
                    <div class="card-field-value">
                        ${subscription.whatsapp ? `
                            <a href="https://wa.me/${subscription.whatsapp}" target="_blank" class="text-green-400 hover:text-green-300 transition-colors">
                                <i class="fab fa-whatsapp mr-1"></i>${subscription.whatsapp}
                            </a>
                        ` : 'غير محدد'}
                    </div>
                </div>

                <div class="card-field">
                    <div class="card-field-label">نوع الحساب</div>
                    <div class="card-field-value">${(subscription.account_type || subscription.accountType) === 'subscriber' ? 'مشترك' : 'خاص'}</div>
                </div>

                <div class="card-field">
                    <div class="card-field-label">تاريخ الانتهاء</div>
                    <div class="card-field-value">${this.formatDate(expiryDate)}</div>
                </div>
            </div>

            ${subscription.notes ? `
                <div class="mb-3">
                    <div class="card-field-label">ملاحظات</div>
                    <div class="card-field-value text-sm">${subscription.notes}</div>
                </div>
            ` : ''}

            <div class="card-actions">
                <div class="text-xs text-gray-400">
                    <i class="fas fa-calendar-alt mr-1"></i>
                    ${this.formatDate(expiryDate)}
                </div>
                <div class="flex flex-wrap gap-1">
                    <button onclick="showSubscriptionDetails('${subscription.id}', 'file')"
                            class="bg-purple-600 hover:bg-purple-700 text-white px-2 py-1 rounded text-xs transition-colors"
                            title="عرض التفاصيل">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button onclick="editFileSubscription('${subscription.id}')"
                            class="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs transition-colors"
                            title="تعديل">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="printSubscription('${subscription.id}', 'file')"
                            class="bg-orange-600 hover:bg-orange-700 text-white px-2 py-1 rounded text-xs transition-colors"
                            title="طباعة">
                        <i class="fas fa-print"></i>
                    </button>
                    <button onclick="renewSubscription('${subscription.id}', 'file')"
                            class="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs transition-colors"
                            title="تجديد">
                        <i class="fas fa-sync-alt"></i>
                    </button>
                    <button onclick="deleteFileSubscription('${subscription.id}', 'file')"
                            class="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs transition-colors"
                            title="حذف">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;

        return card;
    }

    // الحصول على اسم نوع الملف
    getFileTypeName(type, customName) {
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

    // تحديث الإحصائيات
    async updateStatistics(subscriptions) {
        try {
            if (!subscriptions) {
                subscriptions = await this.loadSubscriptions();
            }

            const now = new Date();
            const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

            const stats = {
                total: subscriptions.length,
                active: subscriptions.filter(sub => new Date(sub.expiry_date || sub.expiryDate) > now).length,
                expiring: subscriptions.filter(sub => {
                    const expiryDate = new Date(sub.expiry_date || sub.expiryDate);
                    return expiryDate > now && expiryDate <= threeDaysFromNow;
                }).length,
                expired: subscriptions.filter(sub => new Date(sub.expiry_date || sub.expiryDate) <= now).length
            };

            // تحديث عناصر الإحصائيات
            const totalElement = document.getElementById('totalSubscriptions');
            const activeElement = document.getElementById('activeSubscriptions');
            const expiringElement = document.getElementById('expiringSubscriptions');
            const expiredElement = document.getElementById('expiredSubscriptions');

            if (totalElement) totalElement.textContent = stats.total;
            if (activeElement) activeElement.textContent = stats.active;
            if (expiringElement) expiringElement.textContent = stats.expiring;
            if (expiredElement) expiredElement.textContent = stats.expired;

            console.log('✅ تم تحديث الإحصائيات:', stats);
        } catch (error) {
            console.error('❌ خطأ في تحديث الإحصائيات:', error);
        }
    }

    // عرض رسالة خطأ
    showErrorMessage(message) {
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
        notification.innerHTML = `<i class="fas fa-exclamation-triangle mr-2"></i>${message}`;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);
    }

    // عرض رسالة نجاح
    showSuccessMessage(message) {
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
        notification.innerHTML = `<i class="fas fa-check mr-2"></i>${message}`;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }

    // الحصول على اسم نوع الاشتراك
    getSubscriptionTypeName(type) {
        const types = {
            'netflix': 'نتفلكس',
            'shahid_vip': 'شاهد مسلسلات',
            'shahid_sport': 'شاهد رياضي',
            'shahid_year': 'شاهد سنة',
            'shahid_full': 'شاهد شامل',
            'use_pro': 'يوز برو',
            'canva_pro': 'كانفا برو',
            'canva_500': 'كانفا ٥٠٠ دعوة',
            'digital_sim': 'شريحة رقمية',
            'youtube_premium': 'يوتيوب بريميوم',
            'amazon_prime': 'امازون برايم',
            'bein_sports': 'بي ان سبورت',
            'osn_plus': 'OSN+',
            'disney_plus': 'ديزني بلس'
        };
        return types[type] || type || 'غير محدد';
    }

    // الحصول على اسم العملة
    getCurrencyName(currency) {
        const currencies = {
            'sar': 'ريال سعودي',
            'aed': 'درهم إماراتي',
            'qar': 'ريال قطري',
            'kwd': 'دينار كويتي',
            'bhd': 'دينار بحريني',
            'omr': 'ريال عماني',
            'egp': 'جنيه مصري',
            'try': 'ليرة تركية',
            'inr': 'روبية هندية',
            'ngn': 'نايرا نيجيري'
        };
        return currencies[currency] || currency || 'غير محدد';
    }

    // تنسيق التاريخ
    formatDate(date) {
        if (!date) return 'غير محدد';
        const d = new Date(date);
        if (isNaN(d.getTime())) return 'تاريخ غير صالح';
        return d.toLocaleDateString('ar-SA');
    }

    // بدء التحديث التلقائي
    startAutoRefresh() {
        // تحديث كل 30 ثانية
        setInterval(async () => {
            if (this.isInitialized && document.visibilityState === 'visible') {
                try {
                    await this.loadSubscriptions();
                    console.log('🔄 تم التحديث التلقائي');
                } catch (error) {
                    console.error('❌ خطأ في التحديث التلقائي:', error);
                }
            }
        }, this.updateInterval);

        // تحديث عند العودة للتبويب
        document.addEventListener('visibilitychange', async () => {
            if (document.visibilityState === 'visible' && this.isInitialized) {
                const now = Date.now();
                if (!this.lastUpdateTime || (now - this.lastUpdateTime) > this.updateInterval) {
                    try {
                        await this.loadSubscriptions();
                        this.lastUpdateTime = now;
                        console.log('🔄 تم التحديث عند العودة للتبويب');
                    } catch (error) {
                        console.error('❌ خطأ في التحديث:', error);
                    }
                }
            }
        });
    }

    // تحديث جدول الملفات
    async updateFilesTable(fileSubscriptions) {
        try {
            const tableBody = document.getElementById('filesTableBody');
            const cardsContainer = document.getElementById('filesCardsContainer');

            if (!tableBody && !cardsContainer) {
                console.error('❌ لم يتم العثور على عناصر عرض اشتراكات الملفات');
                return;
            }

            if (!fileSubscriptions || fileSubscriptions.length === 0) {
                // عرض رسالة فارغة للجدول
                if (tableBody) {
                    tableBody.innerHTML = `
                        <tr>
                            <td colspan="9" class="px-6 py-8 text-center text-gray-400">
                                <i class="fas fa-inbox text-4xl mb-2"></i>
                                <p>لا توجد اشتراكات ملفات حالياً</p>
                            </td>
                        </tr>
                    `;
                }

                // عرض رسالة فارغة للبطاقات
                if (cardsContainer) {
                    cardsContainer.innerHTML = `
                        <div class="text-center py-8 text-gray-400">
                            <i class="fas fa-inbox text-4xl mb-2"></i>
                            <p>لا توجد اشتراكات ملفات حالياً</p>
                        </div>
                    `;
                }
                return;
            }

            // مسح المحتوى الحالي
            if (tableBody) tableBody.innerHTML = '';
            if (cardsContainer) cardsContainer.innerHTML = '';

            // إضافة الاشتراكات بشكل محسن للأداء
            const fragment = document.createDocumentFragment();
            const cardsFragment = document.createDocumentFragment();

            fileSubscriptions.forEach(subscription => {
                // إضافة صف للجدول
                if (tableBody) {
                    const row = this.createFileSubscriptionRow(subscription);
                    fragment.appendChild(row);
                }

                // إضافة بطاقة للعرض المحمول
                if (cardsContainer) {
                    const card = this.createFileSubscriptionCard(subscription);
                    cardsFragment.appendChild(card);
                }
            });

            // إضافة جميع العناصر مرة واحدة لتحسين الأداء
            if (tableBody && fragment.children.length > 0) {
                tableBody.appendChild(fragment);
            }

            if (cardsContainer && cardsFragment.children.length > 0) {
                cardsContainer.appendChild(cardsFragment);
            }

            console.log('✅ تم تحديث عرض اشتراكات الملفات');
        } catch (error) {
            console.error('❌ خطأ في تحديث عرض اشتراكات الملفات:', error);
        }
    }

    // إنشاء صف اشتراك ملف للجدول
    createFileSubscriptionRow(subscription) {
        const row = document.createElement('tr');
        row.className = 'hover:bg-[#3a3a3a] transition-colors';

        const expiryDate = new Date(subscription.expiry_date || subscription.expiryDate);
        const now = new Date();
        const isExpired = expiryDate <= now;
        const isExpiringSoon = expiryDate > now && expiryDate <= new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

        let statusClass = 'bg-green-500';
        let statusText = 'نشط';
        if (isExpired) {
            statusClass = 'bg-red-500';
            statusText = 'منتهي';
        } else if (isExpiringSoon) {
            statusClass = 'bg-yellow-500';
            statusText = 'ينتهي قريباً';
        }

        row.innerHTML = `
            <td class="px-6 py-4">${subscription.email || 'غير محدد'}</td>
            <td class="px-6 py-4">${this.getFileTypeName(subscription.subscription_type || subscription.type, subscription.custom_subscription_name || subscription.customSubscriptionName)}</td>
            <td class="px-6 py-4">${subscription.file_name || subscription.fileName || 'غير محدد'}</td>
            <td class="px-6 py-4">${(subscription.account_type || subscription.accountType) === 'subscriber' ? 'مشترك' : 'خاص'}</td>
            <td class="px-6 py-4">
                ${subscription.whatsapp ? `
                    <a href="https://wa.me/${subscription.whatsapp}" target="_blank" class="text-green-500 hover:text-green-400 transition-colors">
                        <i class="fab fa-whatsapp mr-1"></i>${subscription.whatsapp}
                    </a>
                ` : 'غير محدد'}
            </td>
            <td class="px-6 py-4">${this.formatDate(expiryDate)}</td>
            <td class="px-6 py-4">
                <span class="px-2 py-1 rounded-full text-xs text-white ${statusClass}">
                    ${statusText}
                </span>
            </td>
            <td class="px-6 py-4">${subscription.category || 'غير مصنف'}</td>
            <td class="px-6 py-4">
                <div class="flex gap-1">
                    <button onclick="showSubscriptionDetails('${subscription.id}', 'file')" class="text-purple-500 hover:text-purple-400 p-1" title="عرض التفاصيل">
                        <i class="fas fa-eye text-xs"></i>
                    </button>
                    <button onclick="editFileSubscription('${subscription.id}')" class="text-blue-500 hover:text-blue-600 p-1" title="تعديل">
                        <i class="fas fa-edit text-xs"></i>
                    </button>
                    <button onclick="printSubscription('${subscription.id}', 'file')" class="text-orange-500 hover:text-orange-600 p-1" title="طباعة">
                        <i class="fas fa-print text-xs"></i>
                    </button>
                    <button onclick="renewSubscription('${subscription.id}', 'file')" class="text-green-500 hover:text-green-600 p-1" title="تجديد">
                        <i class="fas fa-sync-alt text-xs"></i>
                    </button>
                    <button onclick="deleteFileSubscription('${subscription.id}', 'file')" class="text-red-500 hover:text-red-600 p-1" title="حذف">
                        <i class="fas fa-trash text-xs"></i>
                    </button>
                </div>
            </td>
        `;

        return row;
    }

    // تنظيف الموارد
    cleanup() {
        this.subscriptionsCache = null;
        this.isInitialized = false;
        console.log('🧹 تم تنظيف موارد مدير لوحة التحكم');
    }
}

// إنشاء مثيل عام من مدير لوحة التحكم
window.dashboardManager = new DashboardManager();

console.log('✅ تم تحميل dashboard-manager.js بنجاح');
