import { VoiceRecord, VoiceAnalysisResult } from "../types";

const DB_NAME = 'VoiceAnalyticsDB';
const STORE_NAME = 'access_logs';
const DB_VERSION = 2; // Incremented version to force upgrade if needed (though structure change might need delete)

// Initialize IndexedDB
const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error("IndexedDB error:", request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // If old store exists (from previous version), delete it to start fresh without blobs
      if (db.objectStoreNames.contains('assessments')) {
        db.deleteObjectStore('assessments');
      }
      
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
};

const getIP = async (): Promise<string> => {
    try {
        const res = await fetch('https://api.ipify.org?format=json');
        const data = await res.json();
        return data.ip;
    } catch (e) {
        return 'Unknown IP';
    }
};

// Save a new log record
export const saveRecord = async (analysis: VoiceAnalysisResult): Promise<void> => {
  try {
    const db = await initDB();
    const ip = await getIP();
    
    const record: VoiceRecord = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      analysis,
      ip,
      userAgent: navigator.userAgent
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.add(record);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error("Failed to save log:", error);
    // Don't throw, just log error so app flow continues
  }
};

// Get all records (sorted by newest first)
export const getAllRecords = async (): Promise<VoiceRecord[]> => {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const results = request.result as VoiceRecord[];
        // Sort by timestamp descending
        results.sort((a, b) => b.timestamp - a.timestamp);
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error("Failed to fetch logs:", error);
    return [];
  }
};

// Delete a record
export const deleteRecord = async (id: string): Promise<void> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
};