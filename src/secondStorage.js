// IndexedDB configuration
const DB_NAME = "YDD_Storage";
const STORE_NAME = "images";
const DB_VERSION = 2;
const RANDOM_BACKGROUND_QUEUE_KEY = "random_bg_queue";
const RANDOM_BACKGROUND_CURRENT_KEY = "random_bg_current";

let databasePromise = null;
let mutationQueue = Promise.resolve();

// Database lifecycle
function openDB() {
  if (databasePromise) return databasePromise;
  databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = (event) => {
      const db = event.target.result;
      db.onversionchange = () => {
        db.close();
        databasePromise = null;
      };
      resolve(db);
    };
    request.onerror = () => {
      databasePromise = null;
      reject(request.error || new Error("IndexedDB could not be opened."));
    };
    request.onblocked = () => {
      databasePromise = null;
      reject(new Error("IndexedDB upgrade is blocked by another tab."));
    };
  });
  return databasePromise;
}

// Transaction helpers
async function runTransaction(mode, operation) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);
    let result;
    try {
      const request = operation(store);
      request.onsuccess = () => {
        result = request.result;
      };
      request.onerror = () => {
      };
    } catch (error) {
      transaction.abort();
      reject(error);
      return;
    }
    transaction.oncomplete = () => resolve(result);
    transaction.onerror = () =>
      reject(transaction.error || new Error("IndexedDB transaction failed."));
    transaction.onabort = () =>
      reject(
        transaction.error || new Error("IndexedDB transaction was aborted."),
      );
  });
}

function enqueueMutation(operation) {
  const pending = mutationQueue.catch(() => {}).then(operation);
  mutationQueue = pending.catch(() => {});
  return pending;
}

// Background queue mutations
function mutateRandomBackgroundQueue(mutator) {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        let result;
        let settled = false;

        const fail = (error) => {
          if (settled) return;
          settled = true;
          try {
            transaction.abort();
          } catch (abortError) {
          }
          reject(error || new Error("Random background queue update failed."));
        };

        const request = store.get(RANDOM_BACKGROUND_QUEUE_KEY);
        request.onerror = () => fail(request.error);
        request.onsuccess = () => {
          try {
            const queue = Array.isArray(request.result) ? request.result : [];
            const mutation = mutator(queue) || {};
            result = Array.isArray(mutation.result) ? mutation.result : {
              ...(mutation.result || {}),
              queueExists: Array.isArray(request.result),
            };
            if (mutation.queue) {
              store.put(mutation.queue, RANDOM_BACKGROUND_QUEUE_KEY);
            }
          } catch (error) {
            fail(error);
          }
        };

        transaction.oncomplete = () => {
          if (!settled) {
            settled = true;
            resolve(result);
          }
        };
        transaction.onerror = () => fail(transaction.error);
        transaction.onabort = () => fail(transaction.error);
      }),
  );
}

function randomBackgroundIdentity(url) {
  if (typeof url !== "string" || !url) return null;
  try {
    const parsed = new URL(url);
    const picsumId = parsed.pathname.match(/\/id\/([^/]+)/)?.[1];
    return picsumId
      ? `picsum:${picsumId}`
      : `${parsed.origin}${parsed.pathname}`;
  } catch (error) {
    return url;
  }
}

// Background storage API
export const secondStorage = {
  saveImage(blob) {
    return enqueueMutation(() =>
      runTransaction("readwrite", (store) => store.put(blob, "current_bg"))
    );
  },

  async getImage() {
    await mutationQueue;
    return runTransaction("readonly", (store) => store.get("current_bg"));
  },

  deleteImage() {
    return enqueueMutation(() =>
      runTransaction("readwrite", (store) => store.delete("current_bg"))
    );
  },

  saveRandomBackgroundQueue(queue) {
    return enqueueMutation(() =>
      runTransaction(
        "readwrite",
        (store) => store.put(queue, RANDOM_BACKGROUND_QUEUE_KEY),
      )
    );
  },

  async getRandomBackgroundQueue() {
    await mutationQueue;
    const queue = await runTransaction(
      "readonly",
      (store) => store.get(RANDOM_BACKGROUND_QUEUE_KEY),
    );
    return Array.isArray(queue) ? queue : [];
  },

  takeRandomBackgroundQueue() {
    return enqueueMutation(() =>
      mutateRandomBackgroundQueue((queue) => {
        const [entry, ...remaining] = queue;
        return {
          result: { entry: entry || null, queue: remaining },
          queue: remaining,
        };
      })
    );
  },

  appendRandomBackgroundQueue(entries, limit = 2) {
    return enqueueMutation(() =>
      mutateRandomBackgroundQueue((queue) => {
        const nextQueue = queue.filter((entry) =>
          Boolean(randomBackgroundIdentity(entry?.url))
        );
        const knownUrls = new Set(
          nextQueue
            .map((entry) => randomBackgroundIdentity(entry?.url))
            .filter(Boolean),
        );

        for (const entry of Array.isArray(entries) ? entries : []) {
          const identity = randomBackgroundIdentity(entry?.url);
          if (!entry || !identity || knownUrls.has(identity)) continue;
          nextQueue.push(entry);
          knownUrls.add(identity);
          if (nextQueue.length >= limit) break;
        }

        const limitedQueue = nextQueue.slice(0, limit);
        return { result: limitedQueue, queue: limitedQueue };
      })
    );
  },

  deleteRandomBackgroundQueue() {
    return enqueueMutation(() =>
      runTransaction(
        "readwrite",
        (store) => store.delete(RANDOM_BACKGROUND_QUEUE_KEY),
      )
    );
  },

  saveRandomBackgroundCurrent(entry) {
    return enqueueMutation(() =>
      runTransaction(
        "readwrite",
        (store) => store.put(entry, RANDOM_BACKGROUND_CURRENT_KEY),
      )
    );
  },

  async getRandomBackgroundCurrent() {
    await mutationQueue;
    return runTransaction(
      "readonly",
      (store) => store.get(RANDOM_BACKGROUND_CURRENT_KEY),
    );
  },

  deleteRandomBackgroundCurrent() {
    return enqueueMutation(() =>
      runTransaction(
        "readwrite",
        (store) => store.delete(RANDOM_BACKGROUND_CURRENT_KEY),
      )
    );
  },

  async close() {
    if (!databasePromise) return;
    try {
      const db = await databasePromise;
      db.close();
    } finally {
      databasePromise = null;
    }
  },
};

if (typeof window !== "undefined") {
  window.addEventListener("pagehide", () => {
    void secondStorage.close();
  });
}
// [src/secondStorage.js] YourDynamicDashboard V3.0.0 (Ditom Baroi Antu - 2025-26)
