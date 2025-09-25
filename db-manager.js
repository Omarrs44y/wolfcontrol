// Database Manager - إدارة قاعدة البيانات المحلية
console.log('📂 بدء تحميل db-manager.js');

class DatabaseManager {
    constructor() {
        this.dbName = 'SubscriptionSystemDB';
        this.version = 1;
        this.db = null;
        this.isReady = false;
        this.readyPromise = this.init();
    }

    // انتظار تهيئة قاعدة البيانات
    async waitForReady() {
        if (!this.isReady) {
            await this.readyPromise;
        }
        return this.db;
    }

    // تهيئة قاعدة البيانات
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => {
                console.error('خطأ في فتح قاعدة البيانات:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                this.isReady = true;
                console.log('✅ تم الاتصال بقاعدة البيانات بنجاح');
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                console.log('🔄 تحديث قاعدة البيانات...');

                // جدول المستخدمين
                if (!db.objectStoreNames.contains('users')) {
                    const userStore = db.createObjectStore('users', { keyPath: 'id', autoIncrement: true });
                    userStore.createIndex('email', 'email', { unique: true });
                    userStore.createIndex('is_admin', 'is_admin', { unique: false });
                    console.log('📋 تم إنشاء جدول المستخدمين');
                }

                // جدول الاشتراكات
                if (!db.objectStoreNames.contains('subscriptions')) {
                    const subStore = db.createObjectStore('subscriptions', { keyPath: 'id', autoIncrement: true });
                    subStore.createIndex('user_id', 'user_id', { unique: false });
                    subStore.createIndex('email', 'email', { unique: false });
                    subStore.createIndex('type', 'type', { unique: false });
                    console.log('📋 تم إنشاء جدول الاشتراكات');
                }

                // جدول اشتراكات الملفات
                if (!db.objectStoreNames.contains('file_subscriptions')) {
                    const fileStore = db.createObjectStore('file_subscriptions', { keyPath: 'id', autoIncrement: true });
                    fileStore.createIndex('user_id', 'user_id', { unique: false });
                    fileStore.createIndex('email', 'email', { unique: false });
                    fileStore.createIndex('type', 'type', { unique: false });
                    console.log('📋 تم إنشاء جدول اشتراكات الملفات');
                }

                // جدول إعدادات المستخدمين
                if (!db.objectStoreNames.contains('user_settings')) {
                    const settingsStore = db.createObjectStore('user_settings', { keyPath: 'user_id' });
                    console.log('📋 تم إنشاء جدول إعدادات المستخدمين');
                }

                // جدول المستخدمين المرتبطين
                if (!db.objectStoreNames.contains('linked_users')) {
                    const linkedStore = db.createObjectStore('linked_users', { keyPath: 'id', autoIncrement: true });
                    linkedStore.createIndex('parent_user_id', 'parent_user_id', { unique: false });
                    linkedStore.createIndex('email', 'email', { unique: true });
                    console.log('📋 تم إنشاء جدول المستخدمين المرتبطين');
                }
            };
        });
    }

    // تسجيل الدخول
    async login(email, password) {
        try {
            const transaction = this.db.transaction(['users'], 'readonly');
            const store = transaction.objectStore('users');
            const index = store.index('email');
            
            return new Promise((resolve, reject) => {
                const request = index.get(email);
                
                request.onsuccess = async () => {
                    const user = request.result;
                    if (user) {
                        // تجربة كلمة المرور مباشرة أولاً (للمستخدمين القدامى)
                        if (user.password_hash === password) {
                            console.log('✅ تم تسجيل الدخول بنجاح:', user.email);
                            resolve({ success: true, user: user });
                            return;
                        }

                        // تجربة كلمة المرور المشفرة
                        try {
                            const hashedPassword = await this.hashPassword(password);
                            if (user.password_hash === hashedPassword) {
                                console.log('✅ تم تسجيل الدخول بنجاح:', user.email);
                                resolve({ success: true, user: user });
                                return;
                            }
                        } catch (hashError) {
                            console.error('❌ خطأ في تشفير كلمة المرور:', hashError);
                        }

                        console.log('❌ بيانات دخول خاطئة');
                        resolve({ success: false, error: 'بيانات دخول خاطئة' });
                    } else {
                        console.log('❌ المستخدم غير موجود');
                        resolve({ success: false, error: 'المستخدم غير موجود' });
                    }
                }.bind(this);
                
                request.onerror = () => {
                    console.error('❌ خطأ في تسجيل الدخول:', request.error);
                    reject({ success: false, error: 'خطأ في قاعدة البيانات' });
                };
            });
        } catch (error) {
            console.error('❌ خطأ في تسجيل الدخول:', error);
            return { success: false, error: 'خطأ في النظام' };
        }
    }

    // إنشاء مستخدم جديد
    async createUser(userData) {
        try {
            const transaction = this.db.transaction(['users'], 'readwrite');
            const store = transaction.objectStore('users');
            
            const newUser = {
                email: userData.email,
                password_hash: userData.password,
                is_admin: userData.is_admin || false,
                expiry_date: userData.expiry_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                is_active: true,
                created_at: new Date().toISOString(),
                whatsapp: userData.whatsapp || null
            };

            return new Promise((resolve, reject) => {
                const request = store.add(newUser);
                
                request.onsuccess = () => {
                    console.log('✅ تم إنشاء المستخدم بنجاح:', newUser.email);
                    newUser.id = request.result;
                    resolve({ success: true, user: newUser });
                };
                
                request.onerror = () => {
                    console.error('❌ خطأ في إنشاء المستخدم:', request.error);
                    reject({ success: false, error: 'خطأ في إنشاء المستخدم' });
                };
            });
        } catch (error) {
            console.error('❌ خطأ في إنشاء المستخدم:', error);
            return { success: false, error: 'خطأ في النظام' };
        }
    }

    // جلب إعدادات المستخدم
    async getUserSettings(userId) {
        try {
            await this.waitForReady();
            const transaction = this.db.transaction(['user_settings'], 'readonly');
            const store = transaction.objectStore('user_settings');
            
            return new Promise((resolve, reject) => {
                const request = store.get(userId);
                
                request.onsuccess = () => {
                    const settings = request.result;
                    console.log('📋 إعدادات المستخدم:', settings);
                    resolve({ success: true, data: settings || {} });
                };
                
                request.onerror = () => {
                    console.error('❌ خطأ في جلب إعدادات المستخدم:', request.error);
                    reject({ success: false, error: 'خطأ في جلب الإعدادات' });
                };
            });
        } catch (error) {
            console.error('❌ خطأ في جلب إعدادات المستخدم:', error);
            return { success: false, error: 'خطأ في النظام' };
        }
    }

    // تحديث إعدادات المستخدم
    async updateUserSettings(userId, settings) {
        try {
            await this.waitForReady();
            const transaction = this.db.transaction(['user_settings'], 'readwrite');
            const store = transaction.objectStore('user_settings');
            
            const updatedSettings = {
                user_id: userId,
                ...settings,
                updated_at: new Date().toISOString()
            };

            return new Promise((resolve, reject) => {
                const request = store.put(updatedSettings);
                
                request.onsuccess = () => {
                    console.log('✅ تم تحديث إعدادات المستخدم بنجاح');
                    resolve({ success: true, data: updatedSettings });
                };
                
                request.onerror = () => {
                    console.error('❌ خطأ في تحديث إعدادات المستخدم:', request.error);
                    reject({ success: false, error: 'خطأ في تحديث الإعدادات' });
                };
            });
        } catch (error) {
            console.error('❌ خطأ في تحديث إعدادات المستخدم:', error);
            return { success: false, error: 'خطأ في النظام' };
        }
    }

    // جلب جميع الاشتراكات
    async getAllSubscriptions() {
        try {
            const transaction = this.db.transaction(['subscriptions'], 'readonly');
            const store = transaction.objectStore('subscriptions');
            
            return new Promise((resolve, reject) => {
                const request = store.getAll();
                
                request.onsuccess = () => {
                    const subscriptions = request.result || [];
                    console.log('📋 تم جلب الاشتراكات:', subscriptions.length);
                    resolve({ success: true, subscriptions: subscriptions });
                };
                
                request.onerror = () => {
                    console.error('❌ خطأ في جلب الاشتراكات:', request.error);
                    reject({ success: false, error: 'خطأ في جلب الاشتراكات' });
                };
            });
        } catch (error) {
            console.error('❌ خطأ في جلب الاشتراكات:', error);
            return { success: false, error: 'خطأ في النظام' };
        }
    }

    // جلب جميع اشتراكات الملفات
    async getAllFileSubscriptions() {
        try {
            const transaction = this.db.transaction(['file_subscriptions'], 'readonly');
            const store = transaction.objectStore('file_subscriptions');
            
            return new Promise((resolve, reject) => {
                const request = store.getAll();
                
                request.onsuccess = () => {
                    const subscriptions = request.result || [];
                    console.log('📋 تم جلب اشتراكات الملفات:', subscriptions.length);
                    resolve({ success: true, subscriptions: subscriptions });
                };
                
                request.onerror = () => {
                    console.error('❌ خطأ في جلب اشتراكات الملفات:', request.error);
                    reject({ success: false, error: 'خطأ في جلب اشتراكات الملفات' });
                };
            });
        } catch (error) {
            console.error('❌ خطأ في جلب اشتراكات الملفات:', error);
            return { success: false, error: 'خطأ في النظام' };
        }
    }

    // إنشاء اشتراك جديد
    async createSubscription(subscriptionData) {
        try {
            const transaction = this.db.transaction(['subscriptions'], 'readwrite');
            const store = transaction.objectStore('subscriptions');
            
            const newSubscription = {
                ...subscriptionData,
                created_at: new Date().toISOString(),
                id: Date.now() // معرف مؤقت
            };

            return new Promise((resolve, reject) => {
                const request = store.add(newSubscription);
                
                request.onsuccess = () => {
                    console.log('✅ تم إنشاء الاشتراك بنجاح');
                    newSubscription.id = request.result;
                    resolve({ success: true, subscription: newSubscription });
                };
                
                request.onerror = () => {
                    console.error('❌ خطأ في إنشاء الاشتراك:', request.error);
                    reject({ success: false, error: 'خطأ في إنشاء الاشتراك' });
                };
            });
        } catch (error) {
            console.error('❌ خطأ في إنشاء الاشتراك:', error);
            return { success: false, error: 'خطأ في النظام' };
        }
    }

    // إنشاء اشتراك ملف جديد
    async createFileSubscription(subscriptionData) {
        try {
            const transaction = this.db.transaction(['file_subscriptions'], 'readwrite');
            const store = transaction.objectStore('file_subscriptions');
            
            const newSubscription = {
                ...subscriptionData,
                created_at: new Date().toISOString(),
                id: Date.now() // معرف مؤقت
            };

            return new Promise((resolve, reject) => {
                const request = store.add(newSubscription);
                
                request.onsuccess = () => {
                    console.log('✅ تم إنشاء اشتراك الملف بنجاح');
                    newSubscription.id = request.result;
                    resolve({ success: true, subscription: newSubscription });
                };
                
                request.onerror = () => {
                    console.error('❌ خطأ في إنشاء اشتراك الملف:', request.error);
                    reject({ success: false, error: 'خطأ في إنشاء اشتراك الملف' });
                };
            });
        } catch (error) {
            console.error('❌ خطأ في إنشاء اشتراك الملف:', error);
            return { success: false, error: 'خطأ في النظام' };
        }
    }

    // إنشاء مستخدمين تجريبيين
    async createTestUsers() {
        try {
            console.log('🔄 إنشاء مستخدمين تجريبيين...');

            const transaction = this.db.transaction(['users'], 'readwrite');
            const store = transaction.objectStore('users');

            // مستخدم إداري تجريبي
            const adminUser = {
                email: 'admin@test.com',
                password_hash: 'admin123',
                is_admin: true,
                whatsapp: '1234567890',
                expiry_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
                created_at: new Date().toISOString()
            };

            // مستخدم عادي تجريبي
            const normalUser = {
                email: 'user@test.com',
                password_hash: 'user123',
                is_admin: false,
                whatsapp: '0987654321',
                expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                created_at: new Date().toISOString()
            };

            // إضافة المستخدمين
            store.add(adminUser);
            store.add(normalUser);

            console.log('✅ تم إنشاء مستخدمين تجريبيين:');
            console.log('👤 إداري: admin@test.com / admin123');
            console.log('👤 عادي: user@test.com / user123');

        } catch (error) {
            console.log('ℹ️ المستخدمين التجريبيين موجودين مسبقاً أو حدث خطأ:', error.message);
        }
    }
}

// إنشاء مثيل من مدير قاعدة البيانات
try {
    window.dbManager = new DatabaseManager();
    console.log('🚀 تم تحميل مدير قاعدة البيانات');

    // إضافة مستخدمين تجريبيين عند التحميل
    window.dbManager.waitForReady().then(() => {
        window.dbManager.createTestUsers();
    });
} catch (error) {
    console.error('❌ خطأ في إنشاء مدير قاعدة البيانات:', error);
}
