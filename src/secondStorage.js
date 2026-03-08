const DB_NAME = 'YDD_Storage';
const STORE_NAME = 'images';
const DB_VERSION = 2;

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onerror = (event) => {
      console.error("IndexedDB error:", event.target.error);
      reject(event.target.error);
    };
  });
}

export const secondStorage = {
  saveImage(blob) {
    return openDB().then((db) => {
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(blob, 'current_bg');

        request.onsuccess = () => resolve();
        request.onerror = (event) => reject(event.target.error);
      });
    });
  },

  getImage() {
    return openDB().then((db) => {
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get('current_bg');

        request.onsuccess = (event) => resolve(event.target.result);
        request.onerror = (event) => reject(event.target.error);
      });
    });
  },

  deleteImage() {
    return openDB().then((db) => {
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete('current_bg');

        request.onsuccess = () => resolve();
        request.onerror = (event) => reject(event.target.error);
      });
    });
  }
};

// src/secondStorage.js YourDynamicDashboard v2.2 (Ditom Baroi Antu - 2025-26)