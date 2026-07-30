import { ref, onMounted, onBeforeUnmount } from 'vue';

const weekdays = ['星期日','星期一','星期二','星期三','星期四','星期五','星期六'];
const pad = n => n < 10 ? '0' + n : n;

export function useTime() {
  const time = ref('');
  const dateStr = ref('');
  let timer = null;

  function update() {
    const d = new Date();
    time.value = d.getHours() + ':' + pad(d.getMinutes());
    dateStr.value = `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日 ${weekdays[d.getDay()]}`;
  }

  onMounted(() => { update(); timer = setInterval(update, 1000); });
  onBeforeUnmount(() => { if (timer) clearInterval(timer); });

  return { time, dateStr };
}
