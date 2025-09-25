-- إضافة أعمدة جديدة لجدول المستخدمين لدعم المستخدمين المرتبطين والمعلومات الشخصية

-- إضافة أعمدة المعلومات الشخصية
ALTER TABLE users ADD COLUMN IF NOT EXISTS dashboard_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS whatsapp TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS store_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS store_link TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_password_change TIMESTAMP;

-- إضافة أعمدة المستخدمين المرتبطين
ALTER TABLE users ADD COLUMN IF NOT EXISTS parent_user_id UUID REFERENCES users(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_linked_user BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions JSONB;
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_access TEXT DEFAULT 'both'; -- 'both', 'regular', 'files'
ALTER TABLE users ADD COLUMN IF NOT EXISTS specific_subscriptions JSONB;

-- إنشاء فهرس للمستخدمين المرتبطين
CREATE INDEX IF NOT EXISTS idx_users_parent_user_id ON users(parent_user_id);
CREATE INDEX IF NOT EXISTS idx_users_is_linked_user ON users(is_linked_user);

-- إضافة قيود للتأكد من صحة البيانات
ALTER TABLE users ADD CONSTRAINT check_subscription_access 
    CHECK (subscription_access IN ('both', 'regular', 'files'));

-- إضافة قيد للتأكد من أن المستخدم المرتبط لا يمكن أن يكون مديراً
ALTER TABLE users ADD CONSTRAINT check_linked_user_not_admin 
    CHECK (NOT (is_linked_user = TRUE AND is_admin = TRUE));

-- دالة للتحقق من انتهاء صلاحية المستخدم الأساسي
CREATE OR REPLACE FUNCTION check_parent_user_expiry()
RETURNS TRIGGER AS $$
BEGIN
    -- إذا انتهت صلاحية المستخدم الأساسي، قم بتعطيل جميع المستخدمين المرتبطين
    IF NEW.is_active = FALSE AND OLD.is_active = TRUE THEN
        UPDATE users 
        SET is_active = FALSE 
        WHERE parent_user_id = NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء trigger للتحقق من انتهاء صلاحية المستخدم الأساسي
DROP TRIGGER IF EXISTS trigger_check_parent_user_expiry ON users;
CREATE TRIGGER trigger_check_parent_user_expiry
    AFTER UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION check_parent_user_expiry();

-- دالة للتحقق من عدد المستخدمين المرتبطين
CREATE OR REPLACE FUNCTION check_linked_users_limit()
RETURNS TRIGGER AS $$
DECLARE
    linked_count INTEGER;
BEGIN
    -- التحقق من عدد المستخدمين المرتبطين للمستخدم الأساسي
    SELECT COUNT(*) INTO linked_count
    FROM users 
    WHERE parent_user_id = NEW.parent_user_id 
    AND is_active = TRUE 
    AND is_linked_user = TRUE;
    
    IF linked_count >= 3 THEN
        RAISE EXCEPTION 'لا يمكن إضافة أكثر من 3 مستخدمين مرتبطين';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء trigger للتحقق من عدد المستخدمين المرتبطين
DROP TRIGGER IF EXISTS trigger_check_linked_users_limit ON users;
CREATE TRIGGER trigger_check_linked_users_limit
    BEFORE INSERT ON users
    FOR EACH ROW
    WHEN (NEW.is_linked_user = TRUE)
    EXECUTE FUNCTION check_linked_users_limit();

-- إضافة بيانات افتراضية للمستخدمين الموجودين
UPDATE users 
SET 
    dashboard_name = COALESCE(dashboard_name, 'لوحة التحكم'),
    subscription_access = COALESCE(subscription_access, 'both'),
    is_linked_user = COALESCE(is_linked_user, FALSE)
WHERE dashboard_name IS NULL OR subscription_access IS NULL OR is_linked_user IS NULL;

-- عرض للمستخدمين المرتبطين مع معلومات المستخدم الأساسي
CREATE OR REPLACE VIEW linked_users_view AS
SELECT 
    lu.id,
    lu.email,
    lu.dashboard_name,
    lu.permissions,
    lu.subscription_access,
    lu.specific_subscriptions,
    lu.is_active,
    lu.created_at,
    pu.email as parent_email,
    pu.dashboard_name as parent_dashboard_name,
    pu.expiry_date as parent_expiry_date
FROM users lu
JOIN users pu ON lu.parent_user_id = pu.id
WHERE lu.is_linked_user = TRUE;

-- إنشاء فهارس إضافية لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_users_whatsapp ON users(whatsapp);
CREATE INDEX IF NOT EXISTS idx_users_store_name ON users(store_name);
CREATE INDEX IF NOT EXISTS idx_users_last_password_change ON users(last_password_change);

COMMENT ON COLUMN users.dashboard_name IS 'اسم لوحة التحكم الخاصة بالمستخدم';
COMMENT ON COLUMN users.whatsapp IS 'رقم الواتساب المرتبط بالحساب';
COMMENT ON COLUMN users.store_name IS 'اسم المتجر (اختياري)';
COMMENT ON COLUMN users.store_link IS 'رابط المتجر (اختياري)';
COMMENT ON COLUMN users.last_password_change IS 'تاريخ آخر تغيير لكلمة المرور';
COMMENT ON COLUMN users.parent_user_id IS 'معرف المستخدم الأساسي للمستخدمين المرتبطين';
COMMENT ON COLUMN users.is_linked_user IS 'هل هذا مستخدم مرتبط بمستخدم آخر';
COMMENT ON COLUMN users.permissions IS 'صلاحيات المستخدم المرتبط';
COMMENT ON COLUMN users.subscription_access IS 'نوع الاشتراكات المسموح بالوصول إليها';
COMMENT ON COLUMN users.specific_subscriptions IS 'اشتراكات محددة مسموح بالوصول إليها';
