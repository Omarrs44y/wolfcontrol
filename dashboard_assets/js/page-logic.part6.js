// جزء 6: الملف الشخصي والمستخدمون المرتبطون

function loadUserProfile() {
  const userData = JSON.parse(localStorage.getItem('userData') || '{}');
  const whatsapp = userData.whatsapp ? String(userData.whatsapp) : '';
  const countryCodeList = ['+966', '+971', '+974', '+973', '+968', '+965', '+20'];
  let countryCode = '+966';
  let phoneNumber = whatsapp;
  for (let code of countryCodeList) { if (whatsapp.startsWith(code)) { countryCode = code; phoneNumber = whatsapp.substring(code.length); break; } }
  const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.value = v || ''; };
  setVal('dashboardName', userData.dashboardName);
  setVal('profileCountryCode', countryCode);
  setVal('profileWhatsapp', phoneNumber);
  setVal('storeName', userData.storeName);
  setVal('storeLink', userData.storeLink);
  checkPasswordChangeEligibility();
}

function checkPasswordChangeEligibility() {
  const userData = JSON.parse(localStorage.getItem('userData') || '{}');
  const lastPasswordChange = userData.lastPasswordChange;
  const now = Date.now();
  const fifteenDays = 15 * 24 * 60 * 60 * 1000;
  if (lastPasswordChange && (now - lastPasswordChange) < fifteenDays) {
    const remainingDays = Math.ceil((fifteenDays - (now - lastPasswordChange)) / (24 * 60 * 60 * 1000));
    const info = document.getElementById('passwordChangeInfo');
    if (info) { info.classList.remove('hidden'); info.innerHTML = `<i class="fas fa-info-circle ml-1"></i>يمكن تغيير كلمة المرور بعد ${remainingDays} يوم`; }
    const btn = document.getElementById('changePassword');
    if (btn) btn.disabled = true;
  }
}

function openLinkedUsersModal() {
  const modal = document.getElementById('linkedUsersModal');
  if (modal) { modal.classList.remove('hidden'); modal.classList.add('flex'); loadLinkedUsers(); generateRandomCredentials(); }
}
function closeLinkedUsersModal() { const modal = document.getElementById('linkedUsersModal'); if (modal) { modal.classList.add('hidden'); modal.classList.remove('flex'); } }
function generateRandomEmail() { const s = Math.random().toString(36).substring(2, 8); document.getElementById('linkedUserEmail').value = `user_${s}@temp.local`; }
function generateRandomPassword() { const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'; let p=''; for(let i=0;i<8;i++){ p += chars.charAt(Math.floor(Math.random()*chars.length)); } document.getElementById('linkedUserPassword').value = p; }
function generateRandomCredentials(){ generateRandomEmail(); generateRandomPassword(); }
function resetLinkedUserForm(){ const f=document.getElementById('addLinkedUserForm'); if (f) f.reset(); generateRandomCredentials(); }

async function loadLinkedUsers() {
  try {
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    const result = await window.dbManager.getLinkedUsers(userData.id);
    if (!result.success) { document.getElementById('linkedUsersList').innerHTML = '<p class="text-red-400 text-center py-4">خطأ في تحميل البيانات</p>'; return; }
    const linkedUsers = result.data;
    const listContainer = document.getElementById('linkedUsersList');
    if (!listContainer) return;
    document.getElementById('linkedUsersCount').textContent = linkedUsers.length;
    listContainer.innerHTML = linkedUsers.length === 0 ? '<p class="text-gray-400 text-center py-4">لا توجد مستخدمين مرتبطين</p>' : linkedUsers.map(user => `
      <div class="bg-[#2a2a2a] rounded-lg p-4 flex justify-between items-center">
        <div>
          <div class="font-semibold">${user.email}</div>
          <div class="text-sm text-gray-400">الصلاحيات: ${user.permissions ? Object.keys(user.permissions).length : 0} | الوصول: ${getAccessTypeText(user.subscription_access)}</div>
          <div class="text-xs text-gray-500">تم الإنشاء: ${new Date(user.created_at).toLocaleDateString('ar-SA')}</div>
        </div>
        <div class="flex gap-2">
          <button onclick="editLinkedUser('${user.id}')" class="text-blue-500 hover:text-blue-400 p-2" title="تعديل"><i class="fas fa-edit"></i></button>
          <button onclick="deleteLinkedUser('${user.id}')" class="text-red-500 hover:text-red-400 p-2" title="حذف"><i class="fas fa-trash"></i></button>
        </div>
      </div>`).join('');
  } catch (error) {
    console.error('خطأ في loadLinkedUsers:', error);
  }
}

function getAccessTypeText(accessType){ const types = { both:'الكل', regular:'عادية فقط', files:'ملفات فقط' }; return types[accessType] || accessType; }

// مستمعات نماذج الملف الشخصي والمستخدمين المرتبطين

document.addEventListener('DOMContentLoaded', function(){
  const profileForm = document.getElementById('profileForm');
  if (profileForm) {
    profileForm.addEventListener('submit', async function(e){
      e.preventDefault();
      try {
        const userData = JSON.parse(localStorage.getItem('userData') || '{}');
        const profileData = {
          dashboardName: document.getElementById('dashboardName').value,
          whatsapp: document.getElementById('profileCountryCode').value + document.getElementById('profileWhatsapp').value,
          storeName: document.getElementById('storeName').value,
          storeLink: document.getElementById('storeLink').value
        };
        const updateResult = await window.dbManager.updateUserProfile(userData.id, profileData);
        if (!updateResult.success) { alert('خطأ في تحديث المعلومات: ' + updateResult.error); return; }
        if (document.getElementById('changePassword').checked) {
          const currentPassword = document.getElementById('currentPassword').value;
          const newPassword = document.getElementById('newPassword').value;
          const confirmPassword = document.getElementById('confirmPassword').value;
          if (!currentPassword || !newPassword || !confirmPassword) return alert('يرجى ملء جميع حقول كلمة المرور');
          if (newPassword !== confirmPassword) return alert('كلمة المرور الجديدة وتأكيدها غير متطابقين');
          if (newPassword.length < 6) return alert('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
          const passwordResult = await window.dbManager.changeUserPassword(userData.id, currentPassword, newPassword);
          if (!passwordResult.success) return alert('خطأ في تغيير كلمة المرور: ' + passwordResult.error);
        }
        // تحديث localStorage
        const updatedUserData = { ...JSON.parse(localStorage.getItem('userData') || '{}'), ...profileData };
        localStorage.setItem('userData', JSON.stringify(updatedUserData));
        alert('تم تحديث المعلومات بنجاح');
        window.closeProfileModal?.();
      } catch (error) {
        console.error('خطأ في تحديث المعلومات:', error); alert('حدث خطأ أثناء تحديث المعلومات');
      }
    });
  }

  const addLinkedUserForm = document.getElementById('addLinkedUserForm');
  if (addLinkedUserForm) {
    addLinkedUserForm.addEventListener('submit', async function(e){
      e.preventDefault();
      try {
        const userData = JSON.parse(localStorage.getItem('userData') || '{}');
        const formData = new FormData(this);
        const linkedUserData = {
          email: document.getElementById('linkedUserEmail').value,
          password: document.getElementById('linkedUserPassword').value,
          subscriptionAccess: formData.get('subscription_access')
        };
        const permissions = {};
        document.querySelectorAll('input[name="permissions"]:checked').forEach(cb => permissions[cb.value] = true);
        if (document.getElementById('limitSpecificSubscriptions').checked) {
          const specificCheckboxes = document.querySelectorAll('input[name="specific_subscriptions"]:checked');
          linkedUserData.specificSubscriptions = Array.from(specificCheckboxes).map(cb => cb.value);
        }
        const result = await window.dbManager.createLinkedUser(userData.id, linkedUserData, permissions);
        if (result.success) { alert('تم إضافة المستخدم المرتبط بنجاح'); resetLinkedUserForm(); loadLinkedUsers(); }
        else { alert('خطأ في إضافة المستخدم: ' + result.error); }
      } catch (error) {
        console.error('خطأ في إضافة المستخدم المرتبط:', error); alert('حدث خطأ أثناء إضافة المستخدم');
      }
    });
  }

  const changePasswordCheckbox = document.getElementById('changePassword');
  const passwordSection = document.getElementById('passwordSection');
  if (changePasswordCheckbox && passwordSection) changePasswordCheckbox.addEventListener('change', function(){ passwordSection.classList.toggle('hidden', !this.checked); });

  const limitCheckbox = document.getElementById('limitSpecificSubscriptions');
  const specificSection = document.getElementById('specificSubscriptionsSection');
  if (limitCheckbox && specificSection) limitCheckbox.addEventListener('change', function(){ specificSection.classList.toggle('hidden', !this.checked); });

  console.log('Dashboard functions loaded');
  ['googlePlaySection','gpaSection','notesSection','fileNotesSection','subscriptionModal','newFileSubscriptionModal']
    .forEach(id => { if (!document.getElementById(id)) console.warn(`Element with id '${id}' not found`); });
});

async function deleteLinkedUser(userId) {
  if (!confirm('هل أنت متأكد من حذف هذا المستخدم المرتبط؟')) return;
  try {
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    const result = await window.dbManager.deleteLinkedUser(userId, userData.id);
    if (result.success) { alert('تم حذف المستخدم بنجاح'); loadLinkedUsers(); }
    else { alert('خطأ في حذف المستخدم: ' + result.error); }
  } catch (error) {
    console.error('خطأ في حذف المستخدم:', error); alert('حدث خطأ أثناء حذف المستخدم');
  }
}

function editLinkedUser(userId){ 
    // تحقق من وجود الوظيفة في الصفحة الحالية
    if (typeof openEditUserModal === 'function') {
        const user = linkedUsers.find(u => u.id === userId);
        if (user) {
            openEditUserModal(user);
        } else {
            alert('لم يتم العثور على المستخدم');
        }
    } else {
        alert('ميزة التعديل متاحة في صفحة إدارة المستخدمين المرتبطين');
    }
}

// expose
window.loadUserProfile = loadUserProfile;
window.checkPasswordChangeEligibility = checkPasswordChangeEligibility;
window.openLinkedUsersModal = openLinkedUsersModal;
window.closeLinkedUsersModal = closeLinkedUsersModal;
window.generateRandomEmail = generateRandomEmail;
window.generateRandomPassword = generateRandomPassword;
window.generateRandomCredentials = generateRandomCredentials;
window.resetLinkedUserForm = resetLinkedUserForm;
window.loadLinkedUsers = loadLinkedUsers;
window.getAccessTypeText = getAccessTypeText;
window.deleteLinkedUser = deleteLinkedUser;
window.editLinkedUser = editLinkedUser;

