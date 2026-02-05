
import { InventoryItem, ScanHistoryEntry, StorageKey } from '../types';

export const inventoryService = {
  getItems: (): InventoryItem[] => {
    const data = localStorage.getItem(StorageKey.INVENTORY);
    return data ? JSON.parse(data) : [];
  },

  saveItems: (items: InventoryItem[]) => {
    localStorage.setItem(StorageKey.INVENTORY, JSON.stringify(items));
  },

  getHistory: (): ScanHistoryEntry[] => {
    const data = localStorage.getItem(StorageKey.HISTORY);
    return data ? JSON.parse(data) : [];
  },

  saveHistory: (history: ScanHistoryEntry[]) => {
    localStorage.setItem(StorageKey.HISTORY, JSON.stringify(history));
  }
};
