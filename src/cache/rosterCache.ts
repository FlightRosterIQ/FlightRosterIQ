const DB_NAME = 'flightRosterIQ';
const STORE = 'netlineRoster';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveRoster(
  key: string,
  data: any
) {
  const db = await openDB();
  const tx = db.transaction(STORE, 'readwrite');
  tx.objectStore(STORE).put(
    { savedAt: Date.now(), data },
    key
  );
}

export async function loadRoster(
  key: string,
  maxAgeMs: number
): Promise<any | null> {
  const db = await openDB();
  const tx = db.transaction(STORE, 'readonly');
  const req = tx.objectStore(STORE).get(key);

  return new Promise(resolve => {
    req.onsuccess = () => {
      const record = req.result;
      if (!record) return resolve(null);
      if (Date.now() - record.savedAt > maxAgeMs)
        return resolve(null);
      resolve(record.data);
    };
    req.onerror = () => resolve(null);
  });
}
