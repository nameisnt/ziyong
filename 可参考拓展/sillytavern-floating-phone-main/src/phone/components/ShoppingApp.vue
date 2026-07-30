<template>
  <section class="shopping-app">
    <header class="shop-head">
      <button class="back-btn" type="button" @click="$emit('close')">返回</button>
      <div class="brand-box">
        <span>拼夕夕</span>
        <strong>百亿补贴试验场</strong>
      </div>
      <button class="lab-pill" type="button" @click="activeTab = activeTab === 'home' ? 'lab' : 'home'">{{ activeTab === 'home' ? '个人' : '首页' }}</button>
    </header>

    <Transition name="shop-tab" mode="out-in">
    <main v-if="activeTab === 'home'" key="home" class="shop-page">
      <label ref="searchShellEl" class="search-shell" style="border:0!important;outline:0!important;box-shadow:none!important;">
        <span>⌕</span>
        <input ref="searchInputEl" v-model="searchKeyword" style="all:unset!important;display:block!important;flex:1 1 auto!important;min-width:0!important;border:0!important;border-width:0!important;border-style:none!important;outline:0!important;box-shadow:none!important;background:transparent!important;background-color:transparent!important;background-image:none!important;appearance:none!important;-webkit-appearance:none!important;color:#111!important;font:inherit!important;font-size:13px!important;" placeholder="搜商品 / 用途 / 分类" />
      </label>

      <section class="tool-card">
        <div>
          <strong>AI 进货</strong>
          <span>按关键词和价位生成最多 15 个商品</span>
        </div>
        <button type="button" @click="generatePanelOpen = true">生成商品</button>
      </section>

      <section v-if="filteredProducts.length" class="product-grid">
        <article v-for="product in filteredProducts" :key="product.id" class="product-card" @click="openDetail(product)">
          <div class="product-cover"><span>{{ product.title.slice(0, 1) }}</span><em>{{ product.category || '好物' }}</em></div>
          <div class="product-info">
            <h2>{{ product.title }}</h2>
            <p>{{ product.intro }}</p>
            <div class="product-meta"><strong>{{ product.priceText }}</strong><span>{{ product.sales }}</span></div>
          </div>
        </article>
      </section>

      <section v-else class="empty-shop">
        <div>PXX</div>
        <h2>{{ products.length ? '没有匹配商品' : '默认没有商品' }}</h2>
        <p>{{ products.length ? '换个关键词或价格范围试试。' : '点击“生成商品”，用设置 App 的 API 生成你的货架。' }}</p>
      </section>
    </main>

    <main v-else key="lab" class="shop-page lab-page">
      <section class="lab-head-card">
        <div>
          <span>拼夕夕 lab</span>
          <strong>已购 {{ orders.length }} 件</strong>
        </div>
        <button type="button" :disabled="!orders.length" @click="clearOrders">清空已购</button>
      </section>

      <section v-if="orders.length" class="order-list">
        <article v-for="order in orders" :key="order.id" class="order-card">
          <div class="order-line"><strong>{{ order.title }}</strong><span>{{ order.priceText }}</span></div>
          <time>{{ formatTime(order.boughtAt) }}</time>
          <p>{{ order.intro }}</p>
          <em>用途：{{ order.usage }}</em>
          <div class="order-actions">
            <button class="share-action" type="button" @click="openTargetPicker('share', order)">分享给 TA 看</button>
            <button class="gift-action" type="button" @click="openTargetPicker('gift', order)">赠予角色</button>
          </div>
        </article>
      </section>

      <section v-else class="empty-shop lab-empty">
        <div>LAB</div>
        <h2>还没有已购商品</h2>
        <p>购买后可以在这里分享给角色看，或直接送给角色。</p>
      </section>
    </main>
    </Transition>

    <Transition name="detail-slide">
      <section v-if="detailProduct" class="detail-panel">
        <header class="detail-head">
          <button type="button" @click="detailProduct = null">返回</button>
          <strong>商品详情</strong>
        </header>
        <div class="detail-cover"><span>{{ detailProduct.title.slice(0, 1) }}</span><em>{{ detailProduct.category }}</em></div>
        <section class="detail-body">
          <div class="detail-price"><strong>{{ detailProduct.priceText }}</strong><span>{{ detailProduct.sales }}</span></div>
          <h1>{{ detailProduct.title }}</h1>
          <p>{{ detailProduct.intro }}</p>
          <div class="usage-box">
            <div class="section-title"><span>用</span><strong>具体用处</strong></div>
            <p>{{ detailProduct.usage }}</p>
          </div>
          <div class="review-box">
            <div class="section-title"><span>评</span><strong>买家评价</strong></div>
            <p v-for="(review, index) in detailProduct.reviews" :key="review">
              <i>{{ index + 1 }}</i>
              <em>{{ review }}</em>
            </p>
          </div>
        </section>
        <footer class="buy-bar">
          <button type="button" @click="buyProduct(detailProduct)">{{ detailProduct.priceText }} 购买</button>
        </footer>
      </section>
    </Transition>

    <div v-if="generatePanelOpen" class="modal-mask">
      <form class="modal-card" @submit.prevent="generateProducts">
        <header><h2>AI 生成商品</h2><button type="button" @click="generatePanelOpen = false">×</button></header>
        <label>关键词<input v-model="generateForm.keyword" placeholder="例如：猫咪、早餐、耳机，可为空" /></label>
        <label>价位
          <select v-model="generateForm.priceTag">
            <option v-for="tag in priceTags" :key="tag" :value="tag">{{ tag }}</option>
          </select>
        </label>
        <label>数量<input v-model.number="generateForm.count" type="number" min="1" max="15" /></label>
        <div class="modal-actions">
          <button type="button" :disabled="!products.length" @click="clearProducts">清空货架</button>
          <button class="accent" type="submit" :disabled="generating">{{ generating ? '生成中...' : '开始生成' }}</button>
        </div>
      </form>
    </div>

    <div v-if="targetPicker.show" class="modal-mask">
      <section class="modal-card role-picker">
        <header><h2>{{ targetPicker.mode === 'share' ? '分享给角色' : '赠予角色' }}</h2><button type="button" @click="closeTargetPicker">×</button></header>
        <p class="target-preview">{{ targetPicker.order?.title }}</p>
        <div v-if="roles.length" class="role-list">
          <button v-for="role in roles" :key="role.id" type="button" @click="sendOrderToRole(role)">
            <span class="role-avatar">{{ role.avatarText || role.name.slice(0, 1) }}</span>
            <strong>{{ role.name }}</strong>
            <em>{{ role.source }}</em>
          </button>
        </div>
        <div v-else class="no-role">请先在信息 App 添加角色。</div>
      </section>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { chatCompletion, useApiSettings } from '../composables/useApiSettings.js';
import { createMessageId, useMessageStore } from '../composables/useMessageStore.js';

const emit = defineEmits(['close', 'detail-state']);

const PRODUCT_KEY = 'phone_shopping_products';
const ORDER_KEY = 'phone_shopping_orders';
const WALLET_KEY = 'phone_message_wallet';
const priceTags = ['0.99特价', '1~10', '10~50', '50~100', '100以上'];

const api = useApiSettings();
const store = useMessageStore();
const { roles } = store;

const products = ref(loadJson(PRODUCT_KEY, []));
const orders = ref(loadJson(ORDER_KEY, []));
const activeTab = ref('home');
const searchKeyword = ref('');
const selectedPriceTag = ref('');
const detailProduct = ref(null);
const generatePanelOpen = ref(false);
const generating = ref(false);
const searchShellEl = ref(null);
const searchInputEl = ref(null);
const generateForm = reactive({ keyword: '', priceTag: '1~10', count: 8 });
const targetPicker = reactive({ show: false, mode: 'share', order: null });

const filteredProducts = computed(() => {
  const keyword = searchKeyword.value.trim();
  return products.value.filter(product => {
    const matchesKeyword = !keyword || [product.title, product.intro, product.category, product.usage].some(value => String(value || '').includes(keyword));
    const matchesPrice = !selectedPriceTag.value || priceInTag(product.priceCents, selectedPriceTag.value);
    return matchesKeyword && matchesPrice;
  });
});

onMounted(() => {
  api.restore();
  removeSearchInputChrome(searchShellEl.value, searchInputEl.value);
});

watch(detailProduct, product => {
  emit('detail-state', Boolean(product));
}, { immediate: true });

function loadJson(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || 'null') || fallback; }
  catch { return fallback; }
}

function saveJson(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); }
  catch (error) { console.warn('[ShoppingApp] save failed:', error); }
}

function saveProducts() { saveJson(PRODUCT_KEY, products.value); }
function saveOrders() { saveJson(ORDER_KEY, orders.value); }

function formatMoney(cents) {
  return `¥${(Math.max(0, Number(cents) || 0) / 100).toFixed(2)}`;
}

function parseMoneyToCents(value) {
  const normalized = String(value || '').trim().replace(/[￥¥,]/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return 0;
  return Math.round(Number(normalized) * 100);
}

function priceInTag(cents, tag) {
  if (tag === '0.99特价') return cents === 99;
  if (tag === '1~10') return cents >= 100 && cents <= 1000;
  if (tag === '10~50') return cents >= 1000 && cents <= 5000;
  if (tag === '50~100') return cents >= 5000 && cents <= 10000;
  if (tag === '100以上') return cents > 10000;
  return true;
}

function clampPriceByTag(cents, tag, index = 0) {
  if (tag === '0.99特价') return 99;
  const ranges = {
    '1~10': [100, 1000],
    '10~50': [1000, 5000],
    '50~100': [5000, 10000],
    '100以上': [10001, 999900],
  };
  const [min, max] = ranges[tag] || [100, 9999];
  if (cents >= min && cents <= max) return cents;
  if (tag === '100以上') {
    const base = 12000 + index * 1737;
    const spread = Math.max(1, max - 12000);
    return Math.min(max, base + ((index * 7919) % spread));
  }
  return Math.min(max, min + (index * 137) % Math.max(1, max - min));
}

function tryParseJson(text) {
  try { return JSON.parse(text); }
  catch {}
  const match = String(text || '').match(/\{[\s\S]*\}/);
  if (!match) return null;
  try { return JSON.parse(match[0]); }
  catch { return null; }
}

function normalizeAiProducts(parsed, tag) {
  const source = Array.isArray(parsed?.products) ? parsed.products : [];
  return source.slice(0, 15).map((item, index) => {
    const rawCents = Number(item.priceCents) || parseMoneyToCents(item.priceText || item.price || item.amount) || 100;
    const priceCents = clampPriceByTag(rawCents, tag, index);
    const title = String(item.title || item.name || `拼夕夕商品 ${index + 1}`).trim().slice(0, 42);
    return {
      id: createMessageId('product'),
      title,
      priceCents,
      priceText: formatMoney(priceCents),
      sales: String(item.sales || `已拼${index + 1}00件`).slice(0, 18),
      intro: String(item.intro || item.description || '平价好物，适合日常使用。').slice(0, 90),
      category: String(item.category || '日用').slice(0, 12),
      usage: String(item.usage || item.use || '日常使用、分享、送礼都可以。').slice(0, 120),
      reviews: Array.isArray(item.reviews) ? item.reviews.slice(0, 3).map(review => String(review).slice(0, 80)) : ['价格实惠，和描述一致。', '发货很快，用起来不错。', '这个价位很满意。'],
      createdAt: Date.now(),
    };
  });
}

async function generateProducts() {
  api.restore();
  if (!api.endpoint.value.trim() || !api.model.value.trim()) {
    alert('请先在设置 App 填写 API 端点并选择模型。');
    return;
  }
  generating.value = true;
  const count = Math.max(1, Math.min(15, Number(generateForm.count) || 1));
  const keyword = generateForm.keyword.trim() || '随机平价好物';
  try {
    const system = '你是购物 App 的商品生成器。只输出合法 JSON，不输出 Markdown、解释或思维链。所有商品必须像中文电商商品，价格符合用户价位。价位为“100以上”时，价格必须明显大于 100 元，可以覆盖 120、199、399、999、2999 等不同档位，不要只贴近 100 元。每个商品必须有 title、price、sales、intro、usage、category、reviews 三条。';
    const user = `生成 ${count} 个商品。关键词：${keyword}。价位：${generateForm.priceTag}。如果价位是“100以上”，请生成大于 100 元且分布更宽的商品，不要集中在 100 元附近。返回格式：{"products":[{"title":"商品标题","price":199,"sales":"已拼1.2万件","intro":"简介","usage":"具体用处","category":"分类","reviews":["评价1","评价2","评价3"]}]}`;
    const result = await chatCompletion({
      endpoint: api.endpoint.value,
      key: api.apiKey.value,
      model: api.model.value,
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      extra: { temperature: 0.85 },
    });
    const content = result?.choices?.[0]?.message?.content || result?.message?.content || result?.content || '';
    const parsed = tryParseJson(content);
    const nextProducts = normalizeAiProducts(parsed, generateForm.priceTag);
    if (!nextProducts.length) throw new Error('AI 没有返回可用商品');
    products.value = [...nextProducts, ...products.value];
    saveProducts();
    generatePanelOpen.value = false;
  } catch (error) {
    alert('生成失败：' + (error.message || '未知错误'));
  } finally {
    generating.value = false;
  }
}

function openDetail(product) { detailProduct.value = product; }

function loadWallet() {
  try {
    const saved = JSON.parse(localStorage.getItem(WALLET_KEY) || 'null');
    return { balanceCents: Number(saved?.balanceCents) || 0, records: Array.isArray(saved?.records) ? saved.records : [] };
  } catch {
    return { balanceCents: 0, records: [] };
  }
}

function saveWallet(wallet) {
  wallet.records = wallet.records.slice(0, 50);
  localStorage.setItem(WALLET_KEY, JSON.stringify(wallet));
}

function buyProduct(product) {
  const wallet = loadWallet();
  if (wallet.balanceCents < product.priceCents) {
    alert(`余额不足，当前余额 ${formatMoney(wallet.balanceCents)}`);
    return;
  }
  wallet.balanceCents -= product.priceCents;
  wallet.records.unshift({ id: createMessageId('ledger'), type: 'expense', amountCents: product.priceCents, title: `购物：${product.title}`, createdAt: Date.now() });
  saveWallet(wallet);
  orders.value.unshift({
    id: createMessageId('order'),
    productId: product.id,
    title: product.title,
    priceCents: product.priceCents,
    priceText: product.priceText,
    intro: product.intro,
    usage: product.usage,
    reviews: product.reviews || [],
    boughtAt: Date.now(),
    sharedTo: [],
    giftedTo: [],
  });
  saveOrders();
  activeTab.value = 'lab';
  detailProduct.value = null;
}

function openTargetPicker(mode, order) {
  targetPicker.show = true;
  targetPicker.mode = mode;
  targetPicker.order = order;
}

function closeTargetPicker() {
  targetPicker.show = false;
  targetPicker.order = null;
}

function sendOrderToRole(role) {
  const order = targetPicker.order;
  if (!order) return;
  const isGift = targetPicker.mode === 'gift';
  const conversation = store.createPrivateConversation(role);
  store.addMessage(conversation.id, {
    senderType: 'user',
    senderId: 'user',
    senderName: '我',
    senderAvatar: '',
    type: isGift ? 'shopping_gift' : 'shopping_share',
    text: `${isGift ? '我把这个商品送给你了' : '我分享了一个商品给你看'}：${order.title}\n用途：${order.usage}\n简介：${order.intro}`,
    shopping: { action: isGift ? 'gift' : 'share', title: order.title, priceText: order.priceText, intro: order.intro, usage: order.usage },
  });
  if (isGift) order.giftedTo = [...(order.giftedTo || []), role.id];
  else order.sharedTo = [...(order.sharedTo || []), role.id];
  saveOrders();
  closeTargetPicker();
  alert(isGift ? '已赠予角色。' : '已分享给角色。');
}

function clearProducts() {
  if (!confirm('清空当前货架商品？')) return;
  products.value = [];
  saveProducts();
}

function clearOrders() {
  if (!confirm('清空已购记录？不会退还余额。')) return;
  orders.value = [];
  saveOrders();
}

function formatTime(value) {
  const date = new Date(value);
  return `${date.getMonth() + 1}/${date.getDate()} ${date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`;
}

function removeSearchInputChrome(shell, input) {
  [shell, input].filter(Boolean).forEach(element => {
    ['border', 'border-width', 'border-style', 'outline', 'box-shadow'].forEach(property => element.style.setProperty(property, property === 'border-style' || property === 'box-shadow' ? 'none' : '0', 'important'));
  });
  if (input) {
    input.style.setProperty('all', 'unset', 'important');
    input.style.setProperty('display', 'block', 'important');
    input.style.setProperty('flex', '1 1 auto', 'important');
    input.style.setProperty('min-width', '0', 'important');
    input.style.setProperty('font', 'inherit', 'important');
    ['background', 'background-color', 'background-image'].forEach(property => input.style.setProperty(property, property === 'background-image' ? 'none' : 'transparent', 'important'));
    input.style.setProperty('appearance', 'none', 'important');
    input.style.setProperty('-webkit-appearance', 'none', 'important');
  }
}
</script>

<style scoped>
.shopping-app { position:absolute; inset:0; z-index:18; overflow:hidden; border-radius:40px; background:#f5f1ec; color:#171717; font-family:inherit; }
.shop-head { position:relative; z-index:4; display:grid; grid-template-columns:60px minmax(0,1fr) 60px; align-items:center; padding:54px 14px 12px; background:#df2b24; color:#fff; }
button { border:none; cursor:pointer; font-family:inherit; }
.back-btn, .lab-pill { height:32px; border-radius:16px; background:rgba(255,255,255,.18); color:#fff; }
.brand-box { display:flex; flex-direction:column; align-items:center; line-height:1.2; }
.brand-box span { font-size:22px; font-weight:800; letter-spacing:1px; }
.brand-box strong { font-size:10px; font-weight:500; opacity:.9; }
.shop-page { position:absolute; inset:110px 0 0; overflow-y:auto; padding:12px 12px 34px; }
.shop-page::-webkit-scrollbar, .detail-panel::-webkit-scrollbar { width:0; }
.search-shell { display:flex; align-items:center; gap:8px; height:40px; padding:0 12px; border-radius:20px; background:#fff; border:0 !important; outline:0 !important; box-shadow:none !important; }
.search-shell:focus-within { border:0 !important; outline:0 !important; box-shadow:none !important; }
.search-shell input, .search-shell input:hover, .search-shell input:focus, .search-shell input:focus-visible, .search-shell input:active { all:unset !important; display:block !important; flex:1 1 auto !important; min-width:0 !important; border:0 !important; border-width:0 !important; border-style:none !important; outline:0 !important; box-shadow:none !important; font:inherit !important; font-size:13px !important; color:#111 !important; background:transparent !important; background-color:transparent !important; background-image:none !important; appearance:none !important; -webkit-appearance:none !important; }
.tool-card { margin-top:10px; }
.tool-card, .lab-head-card { display:flex; justify-content:space-between; align-items:center; gap:12px; padding:12px; border-radius:18px; background:#fff; border:1px solid #eaded8; box-shadow:0 8px 18px rgba(80,42,28,.1); }
.tool-card div, .lab-head-card div { display:flex; flex-direction:column; gap:3px; }
.tool-card strong, .lab-head-card strong { font-size:17px; }
.tool-card span, .lab-head-card span { font-size:11px; color:#8b746b; }
.tool-card button, .lab-head-card button { padding:9px 12px; border-radius:14px; background:#df2b24; color:#fff; font-size:12px; }
.tool-card button:disabled, .lab-head-card button:disabled { opacity:.45; }
.product-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:12px; }
.product-card { overflow:hidden; border-radius:16px; background:#fff; border:1px solid #eaded8; box-shadow:0 7px 16px rgba(80,42,28,.09); }
.product-cover, .detail-cover { display:flex; align-items:center; justify-content:center; position:relative; height:108px; background:#f8d8c9; color:#bc261f; }
.product-cover span, .detail-cover span { font-size:42px; font-weight:900; }
.product-cover em, .detail-cover em { position:absolute; left:8px; bottom:8px; padding:3px 7px; border-radius:10px; background:#fff; color:#9d2e28; font-size:10px; font-style:normal; }
.product-info { padding:9px; }
.product-info h2 { margin:0; font-size:13px; line-height:1.35; min-height:36px; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
.product-info p { margin:6px 0; color:#7a625a; font-size:11px; line-height:1.35; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
.product-meta { display:flex; align-items:flex-end; justify-content:space-between; gap:6px; }
.product-meta strong { color:#df2b24; font-size:17px; }
.product-meta span { color:#9b8a84; font-size:10px; }
.empty-shop { margin:38px 12px; padding:28px 18px; border-radius:24px; background:#fff; text-align:center; border:1px solid #eaded8; color:#7a625a; }
.empty-shop div { width:58px; height:58px; margin:0 auto 12px; border-radius:18px; display:flex; align-items:center; justify-content:center; background:#df2b24; color:#fff; font-weight:900; }
.empty-shop h2 { margin:0 0 8px; color:#241815; font-size:18px; }
.empty-shop p { margin:0; font-size:12px; line-height:1.5; }
.lab-page { padding-top:14px; }
.order-list { display:flex; flex-direction:column; gap:10px; margin-top:12px; }
.order-card { padding:13px; border-radius:18px; background:#fff; border:1px solid #eaded8; box-shadow:0 7px 16px rgba(80,42,28,.08); }
.order-line { display:flex; justify-content:space-between; gap:10px; }
.order-line strong { font-size:15px; }
.order-line span { color:#df2b24; font-weight:800; }
.order-card time { display:block; margin-top:4px; color:#a08e87; font-size:10px; }
.order-card p { margin:8px 0 5px; color:#5d4942; font-size:12px; line-height:1.45; }
.order-card em { display:block; color:#7b625a; font-size:11px; font-style:normal; line-height:1.45; }
.order-actions { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:11px; }
.share-action, .gift-action { padding:10px 8px; border-radius:14px; font-size:12px; font-weight:700; }
.share-action { background:#eef3f7; color:#2d536a; border:1px solid #cbdbe5; }
.gift-action { background:#fff0ef; color:#c52b25; border:1px solid #f2c3bf; }
.detail-panel { position:absolute; inset:0; z-index:7; overflow:hidden; background:#f7f0ea; border-radius:40px; padding-bottom:82px; }
.detail-head { position:sticky; top:0; z-index:2; display:grid; grid-template-columns:68px 1fr 68px; align-items:center; padding:54px 16px 10px; background:#fff; border-bottom:1px solid #eaded8; }
.detail-head button { padding:8px 10px; border-radius:16px; background:#f2ece8; }
.detail-head strong { justify-self:center; }
.detail-cover { height:190px; margin:12px; border-radius:22px; }
.detail-cover span { font-size:74px; }
.detail-body { padding:0 14px 104px; max-height:calc(100% - 268px); overflow-y:auto; }
.detail-body::-webkit-scrollbar { width:0; }
.detail-price { display:flex; justify-content:space-between; align-items:center; }
.detail-price strong { color:#df2b24; font-size:28px; }
.detail-price span { color:#8b746b; font-size:12px; }
.detail-body h1 { margin:8px 0; font-size:20px; line-height:1.35; }
.detail-body > p { margin:0 0 12px; color:#5d4942; line-height:1.55; }
.usage-box, .review-box { position:relative; padding:13px; border-radius:19px; background:#fff; border:1px solid #eaded8; margin-bottom:12px; box-shadow:0 7px 16px rgba(80,42,28,.07); }
.section-title { display:flex; align-items:center; gap:8px; margin-bottom:10px; }
.section-title span { width:25px; height:25px; border-radius:9px; display:flex; align-items:center; justify-content:center; background:#df2b24; color:#fff; font-size:12px; font-weight:900; }
.section-title strong { font-size:14px; color:#2b1b17; }
.usage-box p { margin:0; padding:11px 12px; border-radius:14px; background:#fff5f2; border:1px solid #f1d5cd; color:#4f3e38; font-size:12px; line-height:1.6; }
.review-box p { display:flex; gap:9px; align-items:flex-start; margin:8px 0 0; padding:10px; border-radius:14px; background:#faf7f4; border:1px solid #eee1dc; color:#4f3e38; font-size:12px; line-height:1.45; }
.review-box p i { flex:0 0 auto; width:20px; height:20px; border-radius:50%; display:flex; align-items:center; justify-content:center; background:#2b1b17; color:#fff; font-style:normal; font-size:10px; font-weight:800; }
.review-box p em { font-style:normal; flex:1; }
.buy-bar { position:absolute; left:0; right:0; bottom:0; z-index:3; padding:12px 16px 26px; background:#fff; border-top:1px solid #eaded8; box-shadow:0 -8px 18px rgba(80,42,28,.08); }
.buy-bar button { width:100%; height:44px; border-radius:22px; background:#df2b24; color:#fff; font-size:16px; font-weight:800; }
.modal-mask { position:absolute; inset:0; z-index:12; display:flex; align-items:center; justify-content:center; padding:20px; background:rgba(0,0,0,.38); }
.modal-card { width:100%; max-height:78%; overflow-y:auto; padding:16px; border-radius:22px; background:#fff; color:#171717; box-shadow:0 14px 38px rgba(0,0,0,.22); animation:modal-pop .18s ease both; }
.modal-card header { display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; }
.modal-card h2 { margin:0; font-size:18px; }
.modal-card header button { width:30px; height:30px; border-radius:50%; background:#f0ebe8; }
.modal-card label { display:flex; flex-direction:column; gap:6px; margin-bottom:10px; color:#725f58; font-size:12px; }
.modal-card input, .modal-card select { height:38px; border:1px solid #e0d4cf; border-radius:12px; padding:0 10px; outline:none; font-family:inherit; background:#fff; }
.modal-actions { display:flex; gap:8px; margin-top:12px; }
.modal-actions button { flex:1; height:38px; border-radius:14px; background:#f0ebe8; color:#46322d; }
.modal-actions .accent { background:#df2b24; color:#fff; }
.target-preview { margin:0 0 10px; padding:10px; border-radius:14px; background:#fff2f1; color:#9b2d27; font-size:13px; }
.role-list { display:flex; flex-direction:column; gap:8px; }
.role-list button { display:grid; grid-template-columns:38px 1fr auto; align-items:center; gap:9px; padding:9px; border-radius:15px; background:#f7f2ef; text-align:left; }
.role-avatar { width:38px; height:38px; border-radius:14px; display:flex; align-items:center; justify-content:center; background:#df2b24; color:#fff; font-weight:800; }
.role-list em { color:#8b746b; font-size:11px; font-style:normal; }
.no-role { padding:18px; border-radius:16px; background:#f7f2ef; color:#7a625a; text-align:center; font-size:13px; }
.detail-slide-enter-active, .detail-slide-leave-active { transition:opacity .25s ease, transform .3s cubic-bezier(.2,.9,.2,1); }
.detail-slide-enter-from, .detail-slide-leave-to { opacity:0; transform:translateX(42px); }
.shop-tab-enter-active, .shop-tab-leave-active { transition:opacity .24s ease, transform .28s cubic-bezier(.2,.9,.2,1); }
.shop-tab-enter-from { opacity:0; transform:translateX(18px); }
.shop-tab-leave-to { opacity:0; transform:translateX(-14px); }
@keyframes modal-pop { from { opacity:0; transform:scale(.96); } to { opacity:1; transform:scale(1); } }
</style>
