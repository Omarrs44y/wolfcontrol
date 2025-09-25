-- إضافة عمود رقم الواتساب إلى جدول المستخدمين
ALTER TABLE users ADD COLUMN IF NOT EXISTS whatsapp VARCHAR(20);

-- إضافة فهرس للبحث السريع
CREATE INDEX IF NOT EXISTS idx_users_whatsapp ON users(whatsapp);

-- تحديث المستخدمين الموجودين بأرقام واتساب تجريبية (اختياري)
-- UPDATE users SET whatsapp = '+966500000000' WHERE email = 'test@example.com';

-- عرض المستخدمين مع أرقام الواتساب
SELECT id, email, whatsapp, is_admin, created_at FROM users ORDER BY created_at DESC;