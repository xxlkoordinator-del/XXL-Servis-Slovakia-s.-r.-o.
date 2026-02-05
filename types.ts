
export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  color?: string;
  category?: string;
  lastUpdated: string;
}

export type ScanHistoryEntry = {
  id: string;
  itemId: string;
  itemName: string;
  timestamp: string;
  action: 'DECREMENT' | 'INCREMENT';
};

export enum StorageKey {
  INVENTORY = 'qr_sklad_inventory',
  HISTORY = 'qr_sklad_history',
  SYNC_ID = 'qr_sklad_sync_id'
}
