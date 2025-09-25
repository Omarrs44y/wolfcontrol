// Supabase Configuration - Load from environment variables
const SUPABASE_URL = window.ENV?.SUPABASE_URL || 'https://rsgwrfpmwqucroredazk.supabase.co';
const SUPABASE_ANON_KEY = window.ENV?.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzZ3dyZnBtd3F1Y3JvcmVkYXprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2Njg0NTYsImV4cCI6MjA2ODI0NDQ1Nn0.CHt_FnbWyt2hdjkl5tzpka9K75LyEXqzTW1AIU24i90';

// Simple password hashing function (for client-side use)
// Note: In production, password hashing should be done server-side
class PasswordManager {
    // Simple hash function for demonstration (not cryptographically secure)
    static async hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password + 'wolf_salt_2025');
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // Verify password against hash
    static async verifyPassword(password, hash) {
        const hashedPassword = await this.hashPassword(password);
        return hashedPassword === hash;
    }
}

// Initialize Supabase client
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Database helper functions - Extended from db-manager.js
class SupabaseDatabaseManager {
    constructor() {
        this.supabase = supabaseClient;
    }

    // User Management
    async authenticateUser(email, password) {
        try {
            // Get user by email first
            const { data: users, error } = await this.supabase
                .from('users')
                .select('*')
                .eq('email', email)
                .eq('is_active', true);

            if (error || !users || users.length === 0) {
                console.error('Authentication error:', error);
                return { success: false, error: 'بيانات تسجيل الدخول غير صحيحة' };
            }

            const user = users[0];
            console.log('Found user:', { email: user.email, hashLength: user.password_hash.length, isAdmin: user.is_admin });

            // Verify password
            let isPasswordValid = false;

            // Check if password is already hashed (length > 20) or plain text
            if (user.password_hash.length > 20) {
                // Password is hashed, verify normally
                console.log('Verifying hashed password...');
                isPasswordValid = await PasswordManager.verifyPassword(password, user.password_hash);
                console.log('Hash verification result:', isPasswordValid);
            } else {
                // Password is plain text, compare directly and then hash it
                console.log('Comparing plain text password...');
                if (password === user.password_hash) {
                    isPasswordValid = true;
                    console.log('Plain text password matches, hashing...');

                    // Hash the password and update in database
                    const hashedPassword = await PasswordManager.hashPassword(password);
                    console.log('New hash:', hashedPassword);

                    await this.supabase
                        .from('users')
                        .update({ password_hash: hashedPassword })
                        .eq('id', user.id);

                    console.log('Password hashed and updated for user:', email);
                } else {
                    console.log('Plain text password does not match');
                }
            }

            if (!isPasswordValid) {
                return { success: false, error: 'بيانات تسجيل الدخول غير صحيحة' };
            }

            // Check if user subscription is expired (for non-admin users)
            if (!user.is_admin && user.expiry_date && new Date(user.expiry_date) < new Date()) {
                return { success: false, error: 'انتهت صلاحية اشتراكك', expired: true };
            }

            return { success: true, user: user };
        } catch (error) {
            console.error('Authentication error:', error);
            return { success: false, error: 'حدث خطأ أثناء تسجيل الدخول' };
        }
    }

    async createUser(email, password, duration, whatsapp = null) {
        try {
            // Hash the password
            const hashedPassword = await PasswordManager.hashPassword(password);

            const expiryDate = new Date();
            expiryDate.setMonth(expiryDate.getMonth() + parseInt(duration));

            const userData = {
                email: email,
                password_hash: hashedPassword,
                is_admin: false,
                expiry_date: expiryDate.toISOString(),
                is_active: true
            };

            // إضافة رقم الواتساب إذا تم توفيره
            if (whatsapp) {
                userData.whatsapp = whatsapp;
            }

            const { data, error } = await this.supabase
                .from('users')
                .insert([userData])
                .select()
                .single();

            if (error) {
                console.error('Create user error:', error);
                if (error.code === '23505') { // Unique constraint violation
                    return { success: false, error: 'البريد الإلكتروني مستخدم بالفعل' };
                }
                return { success: false, error: 'فشل في إنشاء الحساب' };
            }

            return { success: true, user: data };
        } catch (error) {
            console.error('Create user error:', error);
            return { success: false, error: 'حدث خطأ أثناء إنشاء الحساب' };
        }
    }

    // Ensure admin user exists
    async ensureAdminExists() {
        try {
            const adminEmail = window.ENV?.ADMIN_EMAIL || 'mtjgrwolf@gmail.com';
            const adminPassword = window.ENV?.ADMIN_PASSWORD || 'Wolf1681';

            // Check if admin exists
            const { data: existingAdmin, error: checkError } = await this.supabase
                .from('users')
                .select('*')
                .eq('email', adminEmail)
                .single();

            if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
                console.error('Error checking admin existence:', checkError);
                return { success: false, error: 'فشل في التحقق من وجود المدير' };
            }

            if (!existingAdmin) {
                // Create admin user
                const hashedPassword = await PasswordManager.hashPassword(adminPassword);

                const { data, error } = await this.supabase
                    .from('users')
                    .insert([{
                        email: adminEmail,
                        password_hash: hashedPassword,
                        is_admin: true,
                        is_active: true,
                        expiry_date: null
                    }])
                    .select()
                    .single();

                if (error) {
                    console.error('Error creating admin:', error);
                    return { success: false, error: 'فشل في إنشاء حساب المدير' };
                }

                console.log('Admin user created successfully');
                return { success: true, user: data, created: true };
            }

            return { success: true, user: existingAdmin, created: false };
        } catch (error) {
            console.error('Error ensuring admin exists:', error);
            return { success: false, error: 'حدث خطأ أثناء التحقق من المدير' };
        }
    }

    async getAllUsers() {
        try {
            const { data, error } = await this.supabase
                .from('users')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Get users error:', error);
                return { success: false, error: 'فشل في جلب بيانات المستخدمين' };
            }

            return { success: true, users: data };
        } catch (error) {
            console.error('Get users error:', error);
            return { success: false, error: 'حدث خطأ أثناء جلب بيانات المستخدمين' };
        }
    }

    async updateUserPassword(userId, newPassword) {
        try {
            const hashedPassword = await PasswordManager.hashPassword(newPassword);

            const { data, error } = await this.supabase
                .from('users')
                .update({ 
                    password_hash: hashedPassword,
                    original_password: newPassword // تحديث كلمة المرور الأصلية أيضاً
                })
                .eq('id', userId)
                .select()
                .single();

            if (error) {
                console.error('Update password error:', error);
                return { success: false, error: 'فشل في تحديث كلمة المرور' };
            }

            return { success: true, user: data };
        } catch (error) {
            console.error('Update password error:', error);
            return { success: false, error: 'حدث خطأ أثناء تحديث كلمة المرور' };
        }
    }

    async deactivateUser(userId) {
        try {
            const { data, error } = await this.supabase
                .from('users')
                .update({ is_active: false })
                .eq('id', userId)
                .select()
                .single();

            if (error) {
                console.error('Deactivate user error:', error);
                return { success: false, error: 'فشل في إلغاء تفعيل المستخدم' };
            }

            return { success: true, user: data };
        } catch (error) {
            console.error('Deactivate user error:', error);
            return { success: false, error: 'حدث خطأ أثناء إلغاء تفعيل المستخدم' };
        }
    }

    // حذف المستخدم نهائياً
    async deleteUser(userId) {
        try {
            // أولاً حذف جميع اشتراكات المستخدم
            const { error: subscriptionsError } = await this.supabase
                .from('subscriptions')
                .delete()
                .eq('created_by', userId);

            if (subscriptionsError) {
                console.error('Delete user subscriptions error:', subscriptionsError);
                return { success: false, error: 'فشل في حذف اشتراكات المستخدم' };
            }

            // حذف اشتراكات الملفات
            const { error: fileSubscriptionsError } = await this.supabase
                .from('file_subscriptions')
                .delete()
                .eq('created_by', userId);

            if (fileSubscriptionsError) {
                console.error('Delete user file subscriptions error:', fileSubscriptionsError);
                return { success: false, error: 'فشل في حذف اشتراكات ملفات المستخدم' };
            }

            // أخيراً حذف المستخدم نفسه
            const { error: userError } = await this.supabase
                .from('users')
                .delete()
                .eq('id', userId)
                .neq('is_admin', true); // حماية من حذف المدير

            if (userError) {
                console.error('Delete user error:', userError);
                return { success: false, error: 'فشل في حذف المستخدم' };
            }

            return { success: true };
        } catch (error) {
            console.error('Delete user error:', error);
            return { success: false, error: 'حدث خطأ أثناء حذف المستخدم' };
        }
    }

    // Subscription Management
    async createSubscription(subscriptionData) {
        try {
            const { data, error } = await this.supabase
                .from('subscriptions')
                .insert([subscriptionData])
                .select()
                .single();

            if (error) {
                console.error('Create subscription error:', error);
                return { success: false, error: 'فشل في إنشاء الاشتراك' };
            }

            return { success: true, subscription: data };
        } catch (error) {
            console.error('Create subscription error:', error);
            return { success: false, error: 'حدث خطأ أثناء إنشاء الاشتراك' };
        }
    }

    async getAllSubscriptions(userId = null) {
        try {
            // إذا لم يتم تمرير userId، جلب من localStorage
            if (!userId) {
                const userData = JSON.parse(localStorage.getItem('userData') || '{}');
                userId = userData.id;
            }

            if (!userId) {
                return { success: false, error: 'لم يتم العثور على معرف المستخدم' };
            }

            // جلب اشتراكات المستخدم المحدد فقط
            const { data, error } = await this.supabase
                .from('subscriptions')
                .select('*')
                .eq('created_by', userId)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Get user subscriptions error:', error);
                return { success: false, error: 'فشل في جلب بيانات الاشتراكات' };
            }

            return { success: true, subscriptions: data };
        } catch (error) {
            console.error('Get subscriptions error:', error);
            return { success: false, error: 'حدث خطأ أثناء جلب بيانات الاشتراكات' };
        }
    }

    // جلب جميع الاشتراكات (للمدير فقط)
    async getAllSubscriptionsForAdmin() {
        try {
            const userData = JSON.parse(localStorage.getItem('userData') || '{}');
            if (!userData.isAdmin) {
                return { success: false, error: 'غير مصرح لك بالوصول لهذه البيانات' };
            }

            const { data, error } = await this.supabase
                .from('subscriptions')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Get all subscriptions error:', error);
                return { success: false, error: 'فشل في جلب بيانات الاشتراكات' };
            }

            return { success: true, subscriptions: data };
        } catch (error) {
            console.error('Get all subscriptions error:', error);
            return { success: false, error: 'حدث خطأ أثناء جلب بيانات الاشتراكات' };
        }
    }

    async updateSubscription(id, updateData) {
        try {
            const userData = JSON.parse(localStorage.getItem('userData') || '{}');

            // إذا لم يكن مدير، تأكد من أن الاشتراك ينتمي للمستخدم
            let query = this.supabase
                .from('subscriptions')
                .update(updateData)
                .eq('id', id);

            if (!userData.isAdmin && userData.id) {
                query = query.eq('created_by', userData.id);
            }

            const { data, error } = await query
                .select()
                .single();

            if (error) {
                console.error('Update subscription error:', error);
                if (error.code === 'PGRST116') {
                    return { success: false, error: 'لا يمكنك تحديث هذا الاشتراك' };
                }
                return { success: false, error: 'فشل في تحديث الاشتراك' };
            }

            return { success: true, subscription: data };
        } catch (error) {
            console.error('Update subscription error:', error);
            return { success: false, error: 'حدث خطأ أثناء تحديث الاشتراك' };
        }
    }

    async deleteSubscription(id) {
        try {
            const userData = JSON.parse(localStorage.getItem('userData') || '{}');

            // إذا لم يكن مدير، تأكد من أن الاشتراك ينتمي للمستخدم
            let query = this.supabase
                .from('subscriptions')
                .delete()
                .eq('id', id);

            if (!userData.isAdmin && userData.id) {
                query = query.eq('created_by', userData.id);
            }

            const { error } = await query;

            if (error) {
                console.error('Delete subscription error:', error);
                return { success: false, error: 'فشل في حذف الاشتراك' };
            }

            return { success: true };
        } catch (error) {
            console.error('Delete subscription error:', error);
            return { success: false, error: 'حدث خطأ أثناء حذف الاشتراك' };
        }
    }

    // File Subscription Management
    async createFileSubscription(subscriptionData) {
        try {
            console.log('🔄 محاولة إنشاء اشتراك ملف في قاعدة البيانات...');
            console.log('📊 البيانات المُرسلة:', JSON.stringify(subscriptionData, null, 2));

            // التحقق من الاتصال بقاعدة البيانات
            if (!this.supabase) {
                console.error('❌ لا يوجد اتصال بقاعدة البيانات');
                return { success: false, error: 'لا يوجد اتصال بقاعدة البيانات' };
            }

            const { data, error } = await this.supabase
                .from('file_subscriptions')
                .insert([subscriptionData])
                .select()
                .single();

            console.log('📋 استجابة قاعدة البيانات - البيانات:', data);
            console.log('📋 استجابة قاعدة البيانات - الخطأ:', error);

            if (error) {
                console.error('❌ خطأ في إنشاء اشتراك الملف:', error);
                console.error('❌ تفاصيل الخطأ:', error.message);
                console.error('❌ كود الخطأ:', error.code);
                console.error('❌ تفاصيل إضافية:', error.details);
                console.error('❌ تلميح:', error.hint);
                return { success: false, error: `فشل في إنشاء اشتراك الملف: ${error.message}` };
            }

            console.log('✅ تم إنشاء اشتراك الملف بنجاح:', data);
            return { success: true, subscription: data };
        } catch (error) {
            console.error('❌ خطأ عام في إنشاء اشتراك الملف:', error);
            console.error('❌ تفاصيل الخطأ:', error.stack);
            return { success: false, error: `حدث خطأ أثناء إنشاء اشتراك الملف: ${error.message}` };
        }
    }

    async getAllFileSubscriptions(userId = null) {
        try {
            // إذا لم يتم تمرير userId، جلب من localStorage
            if (!userId) {
                const userData = JSON.parse(localStorage.getItem('userData') || '{}');
                userId = userData.id;
            }

            if (!userId) {
                return { success: false, error: 'لم يتم العثور على معرف المستخدم' };
            }

            // جلب اشتراكات الملفات للمستخدم المحدد فقط
            const { data, error } = await this.supabase
                .from('file_subscriptions')
                .select('*')
                .eq('created_by', userId)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Get user file subscriptions error:', error);
                return { success: false, error: 'فشل في جلب بيانات اشتراكات الملفات' };
            }

            return { success: true, subscriptions: data };
        } catch (error) {
            console.error('Get file subscriptions error:', error);
            return { success: false, error: 'حدث خطأ أثناء جلب بيانات اشتراكات الملفات' };
        }
    }

    // جلب جميع اشتراكات الملفات (للمدير فقط)
    async getAllFileSubscriptionsForAdmin() {
        try {
            const userData = JSON.parse(localStorage.getItem('userData') || '{}');
            if (!userData.isAdmin) {
                return { success: false, error: 'غير مصرح لك بالوصول لهذه البيانات' };
            }

            const { data, error } = await this.supabase
                .from('file_subscriptions')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Get all file subscriptions error:', error);
                return { success: false, error: 'فشل في جلب بيانات اشتراكات الملفات' };
            }

            return { success: true, subscriptions: data };
        } catch (error) {
            console.error('Get all file subscriptions error:', error);
            return { success: false, error: 'حدث خطأ أثناء جلب بيانات اشتراكات الملفات' };
        }
    }

    async updateFileSubscription(id, updateData) {
        try {
            const { data, error } = await this.supabase
                .from('file_subscriptions')
                .update(updateData)
                .eq('id', id)
                .select()
                .single();

            if (error) {
                console.error('Update file subscription error:', error);
                return { success: false, error: 'فشل في تحديث اشتراك الملف' };
            }

            return { success: true, subscription: data };
        } catch (error) {
            console.error('Update file subscription error:', error);
            return { success: false, error: 'حدث خطأ أثناء تحديث اشتراك الملف' };
        }
    }

    async deleteFileSubscription(id) {
        try {
            const { error } = await this.supabase
                .from('file_subscriptions')
                .delete()
                .eq('id', id);

            if (error) {
                console.error('Delete file subscription error:', error);
                return { success: false, error: 'فشل في حذف اشتراك الملف' };
            }

            return { success: true };
        } catch (error) {
            console.error('Delete file subscription error:', error);
            return { success: false, error: 'حدث خطأ أثناء حذف اشتراك الملف' };
        }
    }

    // Category Management
    async createCategory(name, description, color) {
        try {
            const { data, error } = await this.supabase
                .from('categories')
                .insert([{
                    name: name,
                    description: description,
                    color: color
                }])
                .select()
                .single();

            if (error) {
                console.error('Create category error:', error);
                return { success: false, error: 'فشل في إنشاء التصنيف' };
            }

            return { success: true, category: data };
        } catch (error) {
            console.error('Create category error:', error);
            return { success: false, error: 'حدث خطأ أثناء إنشاء التصنيف' };
        }
    }

    async getAllCategories() {
        try {
            const { data, error } = await this.supabase
                .from('categories')
                .select('*')
                .order('name', { ascending: true });

            if (error) {
                console.error('Get categories error:', error);
                return { success: false, error: 'فشل في جلب بيانات التصنيفات' };
            }

            return { success: true, categories: data };
        } catch (error) {
            console.error('Get categories error:', error);
            return { success: false, error: 'حدث خطأ أثناء جلب بيانات التصنيفات' };
        }
    }

    // جلب قائمة العملاء (المستخدمين غير المديرين)
    async getCustomersList() {
        try {
            const userData = JSON.parse(localStorage.getItem('userData') || '{}');
            if (!userData.isAdmin) {
                return { success: false, error: 'غير مصرح لك بالوصول لهذه البيانات' };
            }

            const { data, error } = await this.supabase
                .from('users')
                .select('id, email, is_active, expiry_date, created_at')
                .eq('is_admin', false)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Get customers list error:', error);
                return { success: false, error: 'فشل في جلب قائمة العملاء' };
            }

            return { success: true, customers: data };
        } catch (error) {
            console.error('Get customers list error:', error);
            return { success: false, error: 'حدث خطأ أثناء جلب قائمة العملاء' };
        }
    }

    // جلب إحصائيات العميل
    async getCustomerStats(customerId) {
        try {
            const userData = JSON.parse(localStorage.getItem('userData') || '{}');
            if (!userData.isAdmin) {
                return { success: false, error: 'غير مصرح لك بالوصول لهذه البيانات' };
            }

            // جلب اشتراكات العميل العادية
            const { data: regularSubs, error: regularError } = await this.supabase
                .from('subscriptions')
                .select('*')
                .eq('created_by', customerId);

            // جلب اشتراكات الملفات للعميل
            const { data: fileSubs, error: fileError } = await this.supabase
                .from('file_subscriptions')
                .select('*')
                .eq('created_by', customerId);

            if (regularError || fileError) {
                console.error('Get customer stats error:', regularError || fileError);
                return { success: false, error: 'فشل في جلب إحصائيات العميل' };
            }

            const now = new Date();
            const allSubs = [...(regularSubs || []), ...(fileSubs || [])];

            const stats = {
                totalSubscriptions: allSubs.length,
                regularSubscriptions: (regularSubs || []).length,
                fileSubscriptions: (fileSubs || []).length,
                activeSubscriptions: allSubs.filter(sub =>
                    new Date(sub.expiry_date) > now
                ).length,
                expiredSubscriptions: allSubs.filter(sub =>
                    new Date(sub.expiry_date) <= now
                ).length
            };

            return {
                success: true,
                stats,
                regularSubscriptions: regularSubs || [],
                fileSubscriptions: fileSubs || []
            };
        } catch (error) {
            console.error('Get customer stats error:', error);
            return { success: false, error: 'حدث خطأ أثناء جلب إحصائيات العميل' };
        }
    }

    // وظيفة للتحقق من المستخدمين المرتبطين وتعطيلهم إذا انتهت صلاحية المستخدم الأساسي
    async checkAndDeactivateLinkedUsers() {
        try {
            // تنفيذ وظيفة التحقق من انتهاء صلاحية المستخدمين
            const { data, error } = await this.supabase.rpc('check_users_expiry');
            
            if (error) {
                console.error('Error checking and deactivating linked users:', error);
                return { success: false, error: error.message };
            }
            
            // تحديث المستخدمين المرتبطين بناءً على حالة المستخدم الأساسي
            const { error: updateError } = await this.supabase
                .from('users')
                .update({ is_active: false })
                .eq('is_linked_user', true)
                .eq('is_temporary', true)
                .filter('parent_user_id', 'in', (
                    this.supabase
                    .from('users')
                    .select('id')
                    .or('is_active.eq.false,expiry_date.lt.now()')
                ));
            
            if (updateError) {
                console.error('Error updating linked users:', updateError);
                return { success: false, error: updateError.message };
            }
            
            return { success: true };
        } catch (error) {
            console.error('Error in checkAndDeactivateLinkedUsers:', error);
            return { success: false, error: error.message };
        }
    }
    
    // Statistics
    async getStatistics() {
        try {
            // Get regular subscriptions stats
            const { data: regularSubs, error: regularError } = await this.supabase
                .from('subscriptions')
                .select('expiry_date');

            if (regularError) {
                console.error('Get regular subscriptions stats error:', regularError);
            }

            // Get file subscriptions stats
            const { data: fileSubs, error: fileError } = await this.supabase
                .from('file_subscriptions')
                .select('expiry_date');

            if (fileError) {
                console.error('Get file subscriptions stats error:', fileError);
            }

            const allSubs = [...(regularSubs || []), ...(fileSubs || [])];
            const now = new Date();
            const threeDaysFromNow = new Date();
            threeDaysFromNow.setDate(now.getDate() + 3);

            const stats = {
                total: allSubs.length,
                active: allSubs.filter(sub => new Date(sub.expiry_date) > now).length,
                expiring: allSubs.filter(sub => {
                    const expiryDate = new Date(sub.expiry_date);
                    return expiryDate > now && expiryDate <= threeDaysFromNow;
                }).length,
                expired: allSubs.filter(sub => new Date(sub.expiry_date) <= now).length
            };

            return { success: true, stats };
        } catch (error) {
            console.error('Get statistics error:', error);
            return { success: false, error: 'حدث خطأ أثناء جلب الإحصائيات' };
        }
    }

    // Check and deactivate expired users
    async checkAndDeactivateExpiredUsers() {
        try {
            const now = new Date().toISOString();

            // Get expired users
            const { data: expiredUsers, error } = await this.supabase
                .from('users')
                .select('*')
                .lt('expiry_date', now)
                .eq('is_active', true)
                .neq('is_admin', true);

            if (error) {
                console.error('Error getting expired users:', error);
                return { success: false, error: 'فشل في جلب المستخدمين المنتهية اشتراكاتهم' };
            }

            if (expiredUsers && expiredUsers.length > 0) {
                // Deactivate expired users
                const { error: updateError } = await this.supabase
                    .from('users')
                    .update({ is_active: false })
                    .lt('expiry_date', now)
                    .eq('is_active', true)
                    .neq('is_admin', true);

                if (updateError) {
                    console.error('Error deactivating expired users:', updateError);
                    return { success: false, error: 'فشل في إلغاء تفعيل المستخدمين المنتهية اشتراكاتهم' };
                }

                console.log(`Deactivated ${expiredUsers.length} expired users`);
                return { success: true, deactivatedCount: expiredUsers.length };
            }

            return { success: true, deactivatedCount: 0 };
        } catch (error) {
            console.error('Error checking expired users:', error);
            return { success: false, error: 'حدث خطأ أثناء فحص المستخدمين المنتهية اشتراكاتهم' };
        }
    }

    // Get users expiring soon
    async getUsersExpiringSoon(days = 3) {
        try {
            const now = new Date();
            const futureDate = new Date();
            futureDate.setDate(now.getDate() + days);

            const { data: expiringUsers, error } = await this.supabase
                .from('users')
                .select('*')
                .gte('expiry_date', now.toISOString())
                .lte('expiry_date', futureDate.toISOString())
                .eq('is_active', true)
                .neq('is_admin', true);

            if (error) {
                console.error('Error getting expiring users:', error);
                return { success: false, error: 'فشل في جلب المستخدمين المنتهية اشتراكاتهم قريباً' };
            }

            return { success: true, users: expiringUsers || [] };
        } catch (error) {
            console.error('Error getting expiring users:', error);
            return { success: false, error: 'حدث خطأ أثناء جلب المستخدمين المنتهية اشتراكاتهم قريباً' };
        }
    }

    // User Profile Management
    async updateUserProfile(userId, profileData) {
        try {
            const updateData = {};

            if (profileData.dashboardName) updateData.dashboard_name = profileData.dashboardName;
            if (profileData.whatsapp) updateData.whatsapp = profileData.whatsapp;
            if (profileData.storeName) updateData.store_name = profileData.storeName;
            if (profileData.storeLink) updateData.store_link = profileData.storeLink;
            // Support updating expiry_date when provided
            if (Object.prototype.hasOwnProperty.call(profileData, 'expiry_date')) updateData.expiry_date = profileData.expiry_date;
            // Allow toggling activation state when provided
            if (Object.prototype.hasOwnProperty.call(profileData, 'is_active')) updateData.is_active = profileData.is_active;

            const { data, error } = await this.supabase
                .from('users')
                .update(updateData)
                .eq('id', userId)
                .select();

            if (error) {
                console.error('Error updating user profile:', error);
                return { success: false, error: error.message };
            }

            return { success: true, data: data[0] };
        } catch (error) {
            console.error('Error in updateUserProfile:', error);
            return { success: false, error: error.message };
        }
    }

    async changeUserPassword(userId, currentPassword, newPassword) {
        try {
            // التحقق من كلمة المرور الحالية
            const { data: user, error: fetchError } = await this.supabase
                .from('users')
                .select('password_hash, last_password_change')
                .eq('id', userId)
                .single();

            if (fetchError || !user) {
                return { success: false, error: 'لم يتم العثور على المستخدم' };
            }

            // التحقق من كلمة المرور الحالية
            const isCurrentPasswordValid = await PasswordManager.verifyPassword(currentPassword, user.password_hash);
            if (!isCurrentPasswordValid) {
                return { success: false, error: 'كلمة المرور الحالية غير صحيحة' };
            }

            // التحقق من آخر تغيير لكلمة المرور (15 يوم)
            if (user.last_password_change) {
                const lastChange = new Date(user.last_password_change);
                const now = new Date();
                const daysDiff = (now - lastChange) / (1000 * 60 * 60 * 24);

                if (daysDiff < 15) {
                    const remainingDays = Math.ceil(15 - daysDiff);
                    return { success: false, error: `يمكن تغيير كلمة المرور بعد ${remainingDays} يوم` };
                }
            }

            // تشفير كلمة المرور الجديدة
            const newPasswordHash = await PasswordManager.hashPassword(newPassword);

            // تحديث كلمة المرور
            const { error: updateError } = await this.supabase
                .from('users')
                .update({
                    password_hash: newPasswordHash,
                    last_password_change: new Date().toISOString()
                })
                .eq('id', userId);

            if (updateError) {
                console.error('Error updating password:', updateError);
                return { success: false, error: updateError.message };
            }

            return { success: true };
        } catch (error) {
            console.error('Error in changeUserPassword:', error);
            return { success: false, error: error.message };
        }
    }

    // Linked Users Management
    async createLinkedUser(parentUserId, userData, permissions) {
        try {
            // التحقق من عدد المستخدمين المرتبطين الحالي
            const { data: existingUsers, error: countError } = await this.supabase
                .from('users')
                .select('id')
                .eq('parent_user_id', parentUserId)
                .eq('is_active', true);

            if (countError) {
                console.error('Error counting linked users:', countError);
                return { success: false, error: countError.message };
            }

            if (existingUsers && existingUsers.length >= 3) {
                return { success: false, error: 'لا يمكن إضافة أكثر من 3 مستخدمين مرتبطين' };
            }

            // تشفير كلمة المرور
            const passwordHash = await PasswordManager.hashPassword(userData.password);

            // إنشاء المستخدم المرتبط
            const { data: newUser, error: createError } = await this.supabase
                .from('users')
                .insert({
                    email: userData.email,
                    password_hash: passwordHash,
                    parent_user_id: parentUserId,
                    is_linked_user: true,
                    is_active: true,
                    permissions: permissions,
                    subscription_access: userData.subscriptionAccess || 'both',
                    specific_subscriptions: userData.specific_subscriptions || null,
                    created_at: new Date().toISOString()
                })
                .select()
                .single();

            if (createError) {
                console.error('Error creating linked user:', createError);
                return { success: false, error: createError.message };
            }

            return { success: true, data: newUser };
        } catch (error) {
            console.error('Error in createLinkedUser:', error);
            return { success: false, error: error.message };
        }
    }

    async getLinkedUsers(parentUserId) {
        try {
            const { data, error } = await this.supabase
                .from('users')
                .select('*')
                .eq('parent_user_id', parentUserId)
                .eq('is_active', true)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching linked users:', error);
                return { success: false, error: error.message };
            }

            return { success: true, data: data || [] };
        } catch (error) {
            console.error('Error in getLinkedUsers:', error);
            return { success: false, error: error.message };
        }
    }

    async deleteLinkedUser(linkedUserId, parentUserId) {
        try {
            // التحقق من أن المستخدم مرتبط بالمستخدم الحالي
            const { data: user, error: fetchError } = await this.supabase
                .from('users')
                .select('parent_user_id')
                .eq('id', linkedUserId)
                .single();

            if (fetchError || !user || user.parent_user_id !== parentUserId) {
                return { success: false, error: 'غير مسموح بحذف هذا المستخدم' };
            }

            // حذف المستخدم (تعطيل بدلاً من حذف فعلي)
            const { error: deleteError } = await this.supabase
                .from('users')
                .update({ is_active: false })
                .eq('id', linkedUserId);

            if (deleteError) {
                console.error('Error deleting linked user:', deleteError);
                return { success: false, error: deleteError.message };
            }

            return { success: true };
        } catch (error) {
            console.error('Error in deleteLinkedUser:', error);
            return { success: false, error: error.message };
        }
    }

    // User Settings Management
    async getUserSettings(userId) {
        try {
            const { data, error } = await this.supabase
                .from('users')
                .select('dashboard_name, whatsapp, store_name, store_url, date_format, last_password_change')
                .eq('id', userId)
                .single();

            if (error) {
                console.error('Error fetching user settings:', error);
                return { success: false, error: error.message };
            }

            return { success: true, data };
        } catch (error) {
            console.error('Error in getUserSettings:', error);
            return { success: false, error: error.message };
        }
    }

    async updateUserSettings(userId, settings) {
        try {
            const updateData = {};

            if (settings.dashboard_name !== undefined) updateData.dashboard_name = settings.dashboard_name;
            if (settings.whatsapp !== undefined) updateData.whatsapp = settings.whatsapp;
            if (settings.store_name !== undefined) updateData.store_name = settings.store_name;
            if (settings.store_url !== undefined) updateData.store_url = settings.store_url;
            if (settings.date_format !== undefined) updateData.date_format = settings.date_format;

            const { data, error } = await this.supabase
                .from('users')
                .update(updateData)
                .eq('id', userId)
                .select()
                .single();

            if (error) {
                console.error('Error updating user settings:', error);
                return { success: false, error: error.message };
            }

            return { success: true, data };
        } catch (error) {
            console.error('Error in updateUserSettings:', error);
            return { success: false, error: error.message };
        }
    }

    // Enhanced Linked User Management
    async createLinkedUser(userData) {
        try {
            // التحقق من عدد المستخدمين المرتبطين الحالي
            const { data: existingUsers, error: countError } = await this.supabase
                .from('users')
                .select('id')
                .eq('parent_user_id', userData.parent_user_id)
                .eq('is_active', true);

            if (countError) {
                console.error('Error counting linked users:', countError);
                return { success: false, error: countError.message };
            }

            if (existingUsers && existingUsers.length >= 3) {
                return { success: false, error: 'لا يمكن إضافة أكثر من 3 مستخدمين مرتبطين' };
            }

            // تشفير كلمة المرور
            const passwordHash = await PasswordManager.hashPassword(userData.password);

            // الحصول على معلومات المستخدم الأساسي للحصول على تاريخ انتهاء الاشتراك
            const { data: parentUser, error: parentError } = await this.supabase
                .from('users')
                .select('expiry_date')
                .eq('id', userData.parent_user_id)
                .single();
                
            if (parentError) {
                console.error('Error fetching parent user:', parentError);
                return { success: false, error: parentError.message };
            }
            
            // إنشاء المستخدم المرتبط
            const { data: newUser, error: createError } = await this.supabase
                .from('users')
                .insert({
                    email: userData.email,
                    password_hash: passwordHash,
                    name: userData.name || null, // إضافة حقل الاسم
                    parent_user_id: userData.parent_user_id,
                    is_linked_user: true,
                    is_temporary: userData.is_temporary || true,
                    is_active: true,
                    expiry_date: parentUser.expiry_date, // ربط تاريخ انتهاء الصلاحية بالمستخدم الأساسي
                    permissions: userData.permissions || [],
                    allowed_subscriptions: userData.allowed_subscriptions || null,
                    created_at: new Date().toISOString()
                })
                .select()
                .single();

            if (createError) {
                console.error('Error creating linked user:', createError);
                if (createError.code === '23505') {
                    return { success: false, error: 'البريد الإلكتروني مستخدم بالفعل' };
                }
                return { success: false, error: createError.message };
            }

            return { success: true, data: newUser };
        } catch (error) {
            console.error('Error in createLinkedUser:', error);
            return { success: false, error: error.message };
        }
    }

    async deleteLinkedUser(linkedUserId) {
        try {
            // حذف المستخدم (تعطيل بدلاً من حذف فعلي)
            const { error: deleteError } = await this.supabase
                .from('users')
                .update({ is_active: false })
                .eq('id', linkedUserId);

            if (deleteError) {
                console.error('Error deleting linked user:', deleteError);
                return { success: false, error: deleteError.message };
            }

            return { success: true };
        } catch (error) {
            console.error('Error in deleteLinkedUser:', error);
            return { success: false, error: error.message };
        }
    }

    // Check if user has permission
    async checkUserPermission(userId, permission) {
        try {
            const { data: user, error } = await this.supabase
                .from('users')
                .select('permissions, is_admin, parent_user_id')
                .eq('id', userId)
                .single();

            if (error) {
                return { success: false, error: error.message };
            }

            // Admin has all permissions
            if (user.is_admin) {
                return { success: true, hasPermission: true };
            }

            // Regular user (not linked) has all permissions for their own data
            if (!user.parent_user_id) {
                return { success: true, hasPermission: true };
            }

            // Linked user - check specific permissions
            const permissions = user.permissions || [];
            return { success: true, hasPermission: permissions.includes(permission) };
        } catch (error) {
            console.error('Error checking user permission:', error);
            return { success: false, error: error.message };
        }
    }

    // Get user's subscription access restrictions
    async getUserSubscriptionAccess(userId) {
        try {
            const { data: user, error } = await this.supabase
                .from('users')
                .select('allowed_subscriptions, is_admin, parent_user_id')
                .eq('id', userId)
                .single();

            if (error) {
                return { success: false, error: error.message };
            }

            // Admin and regular users have access to all subscriptions
            if (user.is_admin || !user.parent_user_id) {
                return { success: true, allowedSubscriptions: null }; // null means all allowed
            }

            return { success: true, allowedSubscriptions: user.allowed_subscriptions };
        } catch (error) {
            console.error('Error getting user subscription access:', error);
            return { success: false, error: error.message };
        }
    }

    // فحص وتعطيل المستخدمين المرتبطين الذين انتهت صلاحية المستخدم الأصلي أو تم تعطيله
    async checkAndDeactivateLinkedUsers() {
        try {
            // استدعاء وظيفة قاعدة البيانات لفحص انتهاء صلاحية المستخدمين وتعطيلهم
            // هذه الوظيفة تقوم بتحديث المستخدمين المنتهية صلاحيتهم والمستخدمين المرتبطين بهم
            const { data, error } = await this.supabase
                .rpc('check_users_expiry');

            if (error) {
                console.error('Error calling check_users_expiry function:', error);
                return { success: false, error: error.message };
            }

            // إعادة تحميل المستخدمين المرتبطين بعد التحديث
            return { success: true, message: 'Linked users status updated successfully' };
        } catch (error) {
            console.error('Error in checkAndDeactivateLinkedUsers:', error);
            return { success: false, error: error.message };
        }
    }

}

// Create global Supabase database manager instance
const supabaseDbManager = new SupabaseDatabaseManager();
