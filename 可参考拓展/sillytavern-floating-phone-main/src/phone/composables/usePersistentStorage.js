const DB_NAME = 'floating_phone_persistent_v1';
const STORE_NAME = 'records';
const DB_TIMEOUT = 10000;

let dbPromise = null;
const memoryStore = new Map();

function withTimeout(promise, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} 超时`)), DB_TIMEOUT)),
  ]);
}

function toPlainJson(value) {
  if (value === undefined) return null;
  try { return JSON.parse(JSON.stringify(value)); }
  catch (error) {
    console.warn('[PersistentStorage] clone to plain JSON failed:', error);
    throw new Error('数据无法保存：包含不可序列化内容');
  }
}

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = withTimeout(new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error('当前环境不支持 IndexedDB，无法可靠保存大体积图片数据'));
      return;
    }
    const request = window.indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('IndexedDB 打开失败'));
    request.onblocked = () => reject(new Error('IndexedDB 被其他页面阻塞'));
  }), 'IndexedDB 打开').catch(error => {
    dbPromise = null;
    throw error;
  });
  return dbPromise;
}

function runStore(mode, runner) {
  return openDb().then(db => withTimeout(new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const store = tx.objectStore(STORE_NAME);
    let result;
    try { result = runner(store); }
    catch (error) { reject(error); return; }
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error || new Error('IndexedDB 写入失败'));
    tx.onabort = () => reject(tx.error || new Error('IndexedDB 操作中止'));
  }), `IndexedDB ${mode}`));
}

export async function getJson(key, fallback = null) {
  try {
    const value = await withTimeout(new Promise((resolve, reject) => {
      openDb().then(db => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const request = tx.objectStore(STORE_NAME).get(key);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
        tx.onerror = () => reject(tx.error);
      }).catch(reject);
    }), `IndexedDB 读取 ${key}`);
    if (value !== undefined) return value;
  } catch (error) {
    console.warn('[PersistentStorage] IndexedDB read failed:', key, error);
  }

  try {
    const raw = localStorage.getItem(key);
    if (raw !== null) return JSON.parse(raw);
  } catch (error) {
    console.warn('[PersistentStorage] localStorage fallback read failed:', key, error);
  }
  return memoryStore.has(key) ? memoryStore.get(key) : fallback;
}

export async function setJson(key, value, { mirrorLocal = false } = {}) {
  const plainValue = toPlainJson(value);
  memoryStore.set(key, plainValue);
  try {
    await runStore('readwrite', store => store.put(plainValue, key));
  } catch (error) {
    console.warn('[PersistentStorage] IndexedDB write failed, using fallback:', key, error);
    if (!mirrorLocal) throw error;
  }
  if (mirrorLocal) {
    try { localStorage.setItem(key, JSON.stringify(plainValue)); }
    catch (error) { console.warn('[PersistentStorage] localStorage mirror failed:', key, error); }
  }
  return plainValue;
}

export async function deleteKey(key) {
  memoryStore.delete(key);
  try { await runStore('readwrite', store => store.delete(key)); }
  catch (error) { console.warn('[PersistentStorage] IndexedDB delete failed:', key, error); }
  try { localStorage.removeItem(key); }
  catch {}
}
