/* LabRep IndexedDB — cache offline + fila de sync (RN-12) */

const DB_NAME = 'labrep-db';
const DB_VERSION = 1;

let _dbPromise = null;

export function initDB() {
  if (_dbPromise) return _dbPromise;
  _dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('sync_queue')) {
        db.createObjectStore('sync_queue', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('clientes_cache')) {
        db.createObjectStore('clientes_cache', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('interacoes_cache')) {
        db.createObjectStore('interacoes_cache', { keyPath: 'cliente_id' });
      }
      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta', { keyPath: 'key' });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return _dbPromise;
}

function tx(storeName, mode) {
  return initDB().then(db => db.transaction(storeName, mode).objectStore(storeName));
}

function promisify(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/* ── Fila de sync (interações offline) ── */

export async function queueInteracao(payload) {
  const store = await tx('sync_queue', 'readwrite');
  const entry = { ...payload, id: crypto.randomUUID(), queued_at: new Date().toISOString() };
  await promisify(store.put(entry));
  return entry.id;
}

export async function getPendingQueue() {
  const store = await tx('sync_queue', 'readonly');
  return promisify(store.getAll());
}

export async function removeFromQueue(id) {
  const store = await tx('sync_queue', 'readwrite');
  return promisify(store.delete(id));
}

/* ── Cache de cliente ── */

export async function cacheCliente(id, data) {
  const store = await tx('clientes_cache', 'readwrite');
  return promisify(store.put({ ...data, id }));
}

export async function getCachedCliente(id) {
  const store = await tx('clientes_cache', 'readonly');
  return promisify(store.get(id));
}

/* ── Cache de interações por cliente ── */

export async function cacheInteracoes(clienteId, list) {
  const store = await tx('interacoes_cache', 'readwrite');
  return promisify(store.put({ cliente_id: clienteId, list, cached_at: new Date().toISOString() }));
}

export async function getCachedInteracoes(clienteId) {
  const store = await tx('interacoes_cache', 'readonly');
  const row = await promisify(store.get(clienteId));
  return row?.list ?? [];
}
