-- تحديثات قاعدة البيانات لنظام إعدادات المستخدم والمستخدمين المرتبطين

-- إضافة حقول جديدة لجدول المستخدمين
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS dashboard_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS whatsapp VARCHAR(20),
ADD COLUMN IF NOT EXISTS store_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS store_url VARCHAR(500),
ADD COLUMN IF NOT EXISTS date_format VARCHAR(20) DEFAULT 'gregorian',
ADD COLUMN IF NOT EXISTS last_password_change TIMESTAMP,
ADD COLUMN IF NOT EXISTS parent_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS is_linked_user BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS allowed_subscriptions JSONB DEFAULT NULL;

-- إنشاء فهرس للمستخدمين المرتبطين
CREATE INDEX IF NOT EXISTS idx_users_parent_user_id ON users(parent_user_id);
CREATE INDEX IF NOT EXISTS idx_users_is_linked_user ON users(is_linked_user);

-- إضافة حقول جديدة لجدول الاشتراكات العادية
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS order_date DATE,
ADD COLUMN IF NOT EXISTS account_password VARCHAR(255);

-- إضافة حقول جديدة لجدول اشتراكات الملفات
ALTER TABLE file_subscriptions 
ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS order_date DATE,
ADD COLUMN IF NOT EXISTS custom_subscription_name VARCHAR(255);

-- تحديث قيود الأمان (Row Level Security)

-- سياسة للمستخدمين المرتبطين - يمكنهم رؤية بيانات المستخدم الأساسي
CREATE POLICY IF NOT EXISTS "linked_users_can_view_parent_data" ON subscriptions
    FOR SELECT USING (
        created_by = auth.uid() OR 
        created_by IN (
            SELECT parent_user_id FROM users 
            WHERE id = auth.uid() AND is_linked_user = true
        )
    );

CREATE POLICY IF NOT EXISTS "linked_users_can_view_parent_file_data" ON file_subscriptions
    FOR SELECT USING (
        created_by = auth.uid() OR 
        created_by IN (
            SELECT parent_user_id FROM users 
            WHERE id = auth.uid() AND is_linked_user = true
        )
    );

-- سياسة للمستخدمين المرتبطين - يمكنهم إضافة بيانات للمستخدم الأساسي (حسب الصلاحيات)
CREATE POLICY IF NOT EXISTS "linked_users_can_insert_parent_data" ON subscriptions
    FOR INSERT WITH CHECK (
        created_by = auth.uid() OR 
        (created_by IN (
            SELECT parent_user_id FROM users 
            WHERE id = auth.uid() 
            AND is_linked_user = true 
            AND permissions ? 'add_subscriptions'
        ))
    );

CREATE POLICY IF NOT EXISTS "linked_users_can_insert_parent_file_data" ON file_subscriptions
    FOR INSERT WITH CHECK (
        created_by = auth.uid() OR 
        (created_by IN (
            SELECT parent_user_id FROM users 
            WHERE id = auth.uid() 
            AND is_linked_user = true 
            AND permissions ? 'add_subscriptions'
        ))
    );

-- سياسة للمستخدمين المرتبطين - يمكنهم تعديل بيانات المستخدم الأساسي (حسب الصلاحيات)
CREATE POLICY IF NOT EXISTS "linked_users_can_update_parent_data" ON subscriptions
    FOR UPDATE USING (
        created_by = auth.uid() OR 
        (created_by IN (
            SELECT parent_user_id FROM users 
            WHERE id = auth.uid() 
            AND is_linked_user = true 
            AND permissions ? 'edit_subscriptions'
        ))
    );

CREATE POLICY IF NOT EXISTS "linked_users_can_update_parent_file_data" ON file_subscriptions
    FOR UPDATE USING (
        created_by = auth.uid() OR 
        (created_by IN (
            SELECT parent_user_id FROM users 
            WHERE id = auth.uid() 
            AND is_linked_user = true 
            AND permissions ? 'edit_subscriptions'
        ))
    );

-- سياسة للمستخدمين المرتبطين - يمكنهم حذف بيانات المستخدم الأساسي (حسب الصلاحيات)
CREATE POLICY IF NOT EXISTS "linked_users_can_delete_parent_data" ON subscriptions
    FOR DELETE USING (
        created_by = auth.uid() OR 
        (created_by IN (
            SELECT parent_user_id FROM users 
            WHERE id = auth.uid() 
            AND is_linked_user = true 
            AND permissions ? 'delete_subscriptions'
        ))
    );

CREATE POLICY IF NOT EXISTS "linked_users_can_delete_parent_file_data" ON file_subscriptions
    FOR DELETE USING (
        created_by = auth.uid() OR 
        (created_by IN (
            SELECT parent_user_id FROM users 
            WHERE id = auth.uid() 
            AND is_linked_user = true 
            AND permissions ? 'delete_subscriptions'
        ))
    );

-- دالة لحذف المستخدمين المرتبطين عند حذف المستخدم الأساسي
CREATE OR REPLACE FUNCTION delete_linked_users_on_parent_delete()
RETURNS TRIGGER AS $$
BEGIN
    -- حذف جميع المستخدمين المرتبطين
    UPDATE users 
    SET is_active = false 
    WHERE parent_user_id = OLD.id;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- إنشاء المشغل
DROP TRIGGER IF EXISTS trigger_delete_linked_users ON users;
CREATE TRIGGER trigger_delete_linked_users
    BEFORE DELETE ON users
    FOR EACH ROW
    EXECUTE FUNCTION delete_linked_users_on_parent_delete();

-- دالة لتعطيل المستخدمين المرتبطين عند انتهاء اشتراك المستخدم الأساسي
CREATE OR REPLACE FUNCTION deactivate_linked_users_on_parent_expiry()
RETURNS TRIGGER AS $$
BEGIN
    -- إذا انتهى اشتراك المستخدم الأساسي، تعطيل المستخدمين المرتبطين
    IF NEW.is_active = false AND OLD.is_active = true THEN
        UPDATE users 
        SET is_active = false 
        WHERE parent_user_id = NEW.id AND is_linked_user = true;
    END IF;
    
    -- إذا تم تفعيل المستخدم الأساسي، تفعيل المستخدمين المرتبطين
    IF NEW.is_active = true AND OLD.is_active = false THEN
        UPDATE users 
        SET is_active = true 
        WHERE parent_user_id = NEW.id AND is_linked_user = true;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء المشغل
DROP TRIGGER IF EXISTS trigger_deactivate_linked_users ON users;
CREATE TRIGGER trigger_deactivate_linked_users
    AFTER UPDATE OF is_active ON users
    FOR EACH ROW
    EXECUTE FUNCTION deactivate_linked_users_on_parent_expiry();

-- إضافة بيانات افتراضية للحقول الجديدة
UPDATE users 
SET date_format = 'gregorian' 
WHERE date_format IS NULL;

-- إنشاء فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_subscriptions_invoice_number ON subscriptions(invoice_number);
CREATE INDEX IF NOT EXISTS idx_subscriptions_order_date ON subscriptions(order_date);
CREATE INDEX IF NOT EXISTS idx_file_subscriptions_invoice_number ON file_subscriptions(invoice_number);
CREATE INDEX IF NOT EXISTS idx_file_subscriptions_order_date ON file_subscriptions(order_date);
CREATE INDEX IF NOT EXISTS idx_file_subscriptions_custom_name ON file_subscriptions(custom_subscription_name);

-- تحديث الإحصائيات
ANALYZE users;
ANALYZE subscriptions;
ANALYZE file_subscriptions;

-- إضافة تعليقات للتوثيق
COMMENT ON COLUMN users.dashboard_name IS 'اسم لوحة التحكم المخصص للمستخدم';
COMMENT ON COLUMN users.whatsapp IS 'رقم الواتساب للمستخدم';
COMMENT ON COLUMN users.store_name IS 'اسم المتجر (اختياري)';
COMMENT ON COLUMN users.store_url IS 'رابط المتجر (اختياري)';
COMMENT ON COLUMN users.date_format IS 'نوع التاريخ المفضل (gregorian/hijri)';
COMMENT ON COLUMN users.last_password_change IS 'تاريخ آخر تغيير لكلمة المرور';
COMMENT ON COLUMN users.parent_user_id IS 'معرف المستخدم الأساسي للمستخدمين المرتبطين';
COMMENT ON COLUMN users.is_linked_user IS 'هل المستخدم مرتبط بمستخدم آخر';
COMMENT ON COLUMN users.permissions IS 'صلاحيات المستخدم المرتبط (JSON array)';
COMMENT ON COLUMN users.allowed_subscriptions IS 'أنواع الاشتراكات المسموحة للمستخدم المرتبط';

COMMENT ON COLUMN subscriptions.invoice_number IS 'رقم الفاتورة (اختياري)';
COMMENT ON COLUMN subscriptions.order_date IS 'تاريخ الطلب (اختياري)';
COMMENT ON COLUMN subscriptions.account_password IS 'كلمة مرور الحساب (اختياري)';

COMMENT ON COLUMN file_subscriptions.invoice_number IS 'رقم الفاتورة (اختياري)';
COMMENT ON COLUMN file_subscriptions.order_date IS 'تاريخ الطلب (اختياري)';
COMMENT ON COLUMN file_subscriptions.custom_subscription_name IS 'اسم الاشتراك المخصص';
