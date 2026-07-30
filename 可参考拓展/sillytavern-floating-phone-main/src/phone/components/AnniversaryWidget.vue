<template>
  <div class="anniversary-widget">
    <div class="anniversary-main">
      <button class="avatar-slot ta-avatar" type="button" @click="chooseAvatar('ta')">
        <span v-if="!taAvatar">TA</span>
        <img v-else :src="taAvatar" alt="TA 的照片" />
      </button>

      <div class="anniversary-copy">
        <div class="names">你和 {{ roleName }}</div>
        <div class="days-row"><strong>{{ togetherDays }}</strong><span>天</span></div>
        <p>已经在一起</p>
      </div>

      <button class="avatar-slot user-avatar" type="button" @click="chooseAvatar('user')">
        <span v-if="!userAvatar">我</span>
        <img v-else :src="userAvatar" alt="我的照片" />
      </button>
    </div>

    <div class="anniversary-foot">
      <i></i>
      <span>{{ birthdayText }}</span>
      <i></i>
    </div>

    <input ref="userInput" class="avatar-input" type="file" accept="image/*" @change="handleAvatarChange('user', $event)" />
    <input ref="taInput" class="avatar-input" type="file" accept="image/*" @change="handleAvatarChange('ta', $event)" />
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useCompanyStore } from '../composables/useCompanyStore.js';
import { useTavern } from '../composables/useTavern.js';

const USER_AVATAR_KEY = 'phone_anniversary_user_avatar';
const TA_AVATAR_KEY = 'phone_anniversary_ta_avatar';

const { state, togetherDays } = useCompanyStore();
const tavern = useTavern();

const roleName = ref('TA');
const userAvatar = ref('');
const taAvatar = ref('');
const userInput = ref(null);
const taInput = ref(null);

const birthdayText = computed(() => {
  const days = daysUntilBirthday(state.birthday);
  if (days === null) return '在陪伴 App 设置生日后显示倒计时';
  if (days === 0) return '今天就是你的生日';
  return `距离你的生日还有 ${days} 天`;
});

onMounted(async () => {
  userAvatar.value = localStorage.getItem(USER_AVATAR_KEY) || '';
  taAvatar.value = localStorage.getItem(TA_AVATAR_KEY) || '';

  try {
    const data = await tavern.getRoleAppData();
    roleName.value = data?.character?.name && data.character.name !== '暂无数据' ? data.character.name : 'TA';
  } catch (error) {
    console.warn('[AnniversaryWidget] role load failed:', error);
  }
});

function chooseAvatar(type) {
  if (type === 'user') userInput.value?.click();
  if (type === 'ta') taInput.value?.click();
}

function handleAvatarChange(type, event) {
  const file = event.target.files?.[0];
  event.target.value = '';
  if (!file || !file.type.startsWith('image/')) return;

  const reader = new FileReader();
  reader.onload = () => {
    const value = String(reader.result || '');
    if (type === 'user') {
      userAvatar.value = value;
      localStorage.setItem(USER_AVATAR_KEY, value);
    } else {
      taAvatar.value = value;
      localStorage.setItem(TA_AVATAR_KEY, value);
    }
  };
  reader.readAsDataURL(file);
}

function daysUntilBirthday(value) {
  if (!value) return null;
  const birthday = new Date(`${value}T00:00:00`);
  if (Number.isNaN(birthday.getTime())) return null;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(today.getFullYear(), birthday.getMonth(), birthday.getDate());
  if (target < today) target.setFullYear(target.getFullYear() + 1);

  return Math.ceil((target - today) / 86400000);
}
</script>

<style scoped>
.anniversary-widget {
  position:absolute; top:430px; left:24px; right:24px; height:150px;
  z-index:5; overflow:hidden; border-radius:22px; padding:14px 16px;
  border:.5px solid rgba(255,255,255,.16);
  background:rgba(18,18,22,.28);
  backdrop-filter:blur(24px) saturate(170%);
  -webkit-backdrop-filter:blur(24px) saturate(170%);
  box-shadow:0 8px 28px rgba(0,0,0,.24), inset 0 1px 0 rgba(255,255,255,.1);
  color:#fff;
}
.anniversary-widget::before {
  content:""; position:absolute; left:16px; right:16px; bottom:37px; height:1px; pointer-events:none;
  background:rgba(255,255,255,.12);
}
.anniversary-main { position:relative; display:grid; grid-template-columns:62px minmax(0,1fr) 62px; align-items:center; gap:13px; height:99px; }
.avatar-slot {
  width:62px; height:62px; padding:0; overflow:hidden; border:none; border-radius:22px;
  background:rgba(255,255,255,.12); color:rgba(255,255,255,.92); cursor:pointer;
  box-shadow:inset 0 0 0 1px rgba(255,255,255,.18), 0 10px 20px rgba(0,0,0,.24);
  transition:transform .18s ease;
}
.ta-avatar { justify-self:start; }
.user-avatar { justify-self:end; }
.avatar-slot span { display:grid; place-items:center; width:100%; height:100%; font-size:16px; font-weight:900; letter-spacing:.8px; }
.avatar-slot img { display:block; width:100%; height:100%; object-fit:cover; }
.avatar-slot:active { transform:scale(.95); }
.anniversary-copy { min-width:0; text-align:center; }
.names { color:rgba(255,255,255,.82); font-size:12px; letter-spacing:.4px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.days-row { display:flex; align-items:flex-end; justify-content:center; gap:6px; margin-top:1px; }
.days-row strong { font-size:44px; font-weight:300; line-height:.96; letter-spacing:-1.8px; text-shadow:0 2px 12px rgba(0,0,0,.25); }
.days-row span { padding-bottom:5px; color:rgba(255,255,255,.76); font-size:15px; font-weight:700; }
.anniversary-copy p { margin:3px 0 0; color:rgba(255,255,255,.58); font-size:11px; line-height:1.2; }
.anniversary-foot { position:relative; display:grid; grid-template-columns:1fr auto 1fr; align-items:center; gap:10px; margin-top:1px; color:rgba(255,255,255,.48); font-size:10px; letter-spacing:.3px; }
.anniversary-foot span { max-width:185px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.anniversary-foot i { display:block; height:1px; border-radius:999px; background:rgba(255,255,255,.18); }
.avatar-input { display:none; }
</style>
