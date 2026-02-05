
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Layout } from './components/Layout';
import { InventoryTable } from './components/InventoryTable';
import { ScannerModal } from './components/ScannerModal';
import { AddItemModal } from './components/AddItemModal';
import { PairingModal } from './components/PairingModal';
import { InventoryItem, ScanHistoryEntry, StorageKey } from './types';
import { Plus, Scan, History, Package, Search, Cloud, CloudOff, Smartphone, CheckCircle2, AlertCircle } from 'lucide-react';

const generateId = () => {
  try {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
      return window.crypto.randomUUID();
    }
  } catch (e) {}
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
};

const safeParse = (key: string, fallback: any) => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch (e) {
    return fallback;
  }
};

const App: React.FC = () => {
  const [syncId] = useState<string>(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const urlId = urlParams.get('s');
      if (urlId && urlId.length > 3) return urlId;
      const savedId = localStorage.getItem(StorageKey.SYNC_ID);
      if (savedId && savedId.length > 3) return savedId;
    } catch (e) {}
    return Math.random().toString(36).substring(2, 9);
  });

  const [items, setItems] = useState<InventoryItem[]>(() => safeParse(StorageKey.INVENTORY, []));
  const [history, setHistory] = useState<ScanHistoryEntry[]>(() => safeParse(StorageKey.HISTORY, []));
  
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isPairingModalOpen, setIsPairingModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'inventory' | 'history'>('inventory');
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncError, setLastSyncError] = useState(false);
  const [scanToast, setScanToast] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const itemsRef = useRef<InventoryItem[]>(items);
  const historyRef = useRef<ScanHistoryEntry[]>(history);
  const lastCloudHash = useRef<string>('');

  useEffect(() => { itemsRef.current = items; }, [items]);
  useEffect(() => { historyRef.current = history; }, [history]);

  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.get('s') !== syncId) {
        url.searchParams.set('s', syncId);
        window.history.replaceState({}, '', url.toString());
      }
      localStorage.setItem(StorageKey.SYNC_ID, syncId);
    } catch (e) {}
  }, [syncId]);

  const pushToCloud = useCallback(async (forcedItems?: InventoryItem[], forcedHistory?: ScanHistoryEntry[]) => {
    const currentItems = forcedItems || itemsRef.current;
    const currentHistory = forcedHistory || historyRef.current;
    const dataToPush = { items: currentItems, history: currentHistory, _ts: Date.now() };
    const hash = JSON.stringify(currentItems) + JSON.stringify(currentHistory);
    
    if (hash === lastCloudHash.current) return;

    setIsSyncing(true);
    try {
      const res = await fetch(`https://api.npoint.io/${syncId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToPush)
      });
      if (!res.ok) throw new Error();
      setLastSyncError(false);
      lastCloudHash.current = hash;
    } catch (e) {
      setLastSyncError(true);
    } finally {
      setIsSyncing(false);
    }
  }, [syncId]);

  const pullFromCloud = useCallback(async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const res = await fetch(`https://api.npoint.io/${syncId}`);
      if (!res.ok) {
        if (res.status === 404) {
          await pushToCloud();
          return;
        }
        throw new Error();
      }
      const data = await res.json();
      if (!data || !data.items) return;

      const incomingHash = JSON.stringify(data.items) + JSON.stringify(data.history || []);
      const currentHash = JSON.stringify(itemsRef.current) + JSON.stringify(historyRef.current);

      if (incomingHash !== currentHash) {
        lastCloudHash.current = incomingHash;
        setItems(data.items);
        setHistory(data.history || []);
      }
      setLastSyncError(false);
    } catch (e) {
      setLastSyncError(true);
    } finally {
      setIsSyncing(false);
    }
  }, [syncId, pushToCloud]);

  const handleScanSuccess = useCallback((scannedText: string) => {
    let cleanScanned = scannedText.trim();
    try {
      // Ak je naskenovaná celá URL, vytiahneme z nej len SKU
      if (cleanScanned.includes('?')) {
        const url = new URL(cleanScanned);
        const skuParam = url.searchParams.get('scan');
        if (skuParam) cleanScanned = skuParam;
      }
    } catch (e) {}
    
    cleanScanned = cleanScanned.toUpperCase();
    const currentItems = [...itemsRef.current];
    const itemIndex = currentItems.findIndex(i => i.sku.toUpperCase() === cleanScanned);
    
    if (itemIndex > -1) {
      const item = currentItems[itemIndex];
      if (item.quantity > 0) {
        const updatedItems = [...currentItems];
        updatedItems[itemIndex] = { ...item, quantity: item.quantity - 1, lastUpdated: new Date().toISOString() };
        const newEntry: ScanHistoryEntry = { id: generateId(), itemId: item.id, itemName: item.name, timestamp: new Date().toISOString(), action: 'DECREMENT' };
        const updatedHistory = [newEntry, ...historyRef.current].slice(0, 50);
        setItems(updatedItems);
        setHistory(updatedHistory);
        pushToCloud(updatedItems, updatedHistory);
        return { success: true, message: `Odpísané: ${item.name}` };
      }
      return { success: false, message: `Vypredané: ${item.name}` };
    }
    return { success: false, message: `Kód "${cleanScanned}" nepoznám.` };
  }, [pushToCloud]);

  useEffect(() => {
    const url = new URL(window.location.href);
    const skuToScan = url.searchParams.get('scan');
    if (skuToScan) {
      setTimeout(() => {
        const result = handleScanSuccess(skuToScan);
        setScanToast({ type: result.success ? 'success' : 'error', message: result.message });
        setTimeout(() => setScanToast(null), 4000);
        
        // Vyčistenie URL parametra scan po úspešnom načítaní
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('scan');
        window.history.replaceState({}, '', newUrl.toString());
      }, 1000);
    }
  }, [handleScanSuccess]);

  useEffect(() => {
    const timer = setTimeout(pullFromCloud, 500);
    const interval = setInterval(pullFromCloud, 6000);
    return () => { clearTimeout(timer); clearInterval(interval); };
  }, [pullFromCloud]);

  useEffect(() => {
    try { localStorage.setItem(StorageKey.INVENTORY, JSON.stringify(items)); } catch(e) {}
  }, [items]);

  useEffect(() => {
    try { localStorage.setItem(StorageKey.HISTORY, JSON.stringify(history)); } catch(e) {}
  }, [history]);

  const addItem = (item: Omit<InventoryItem, 'id' | 'lastUpdated'>) => {
    const newItem = { ...item, id: generateId(), lastUpdated: new Date().toISOString() };
    const updatedItems = [...items, newItem];
    setItems(updatedItems);
    setIsAddModalOpen(false);
    pushToCloud(updatedItems);
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-6 pb-28">
        {scanToast && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[200] w-full max-w-xs animate-in slide-in-from-top-4 duration-300">
            <div className={`p-4 rounded-2xl shadow-2xl flex items-center border-2 ${scanToast.type === 'success' ? 'bg-emerald-500 border-emerald-400' : 'bg-rose-600 border-rose-500'} text-white`}>
              {scanToast.type === 'success' ? <CheckCircle2 className="w-6 h-6 mr-3 flex-shrink-0" /> : <AlertCircle className="w-6 h-6 mr-3 flex-shrink-0" />}
              <span className="font-black text-sm uppercase tracking-tight">{scanToast.message}</span>
            </div>
          </div>
        )}

        <header className="mb-6 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Sklad <span className="text-indigo-600">QR</span></h1>
            <div className="flex items-center mt-1 space-x-2">
              {lastSyncError ? (
                <span className="flex items-center text-[10px] font-black text-amber-600 uppercase bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100">
                  <CloudOff className="w-3 h-3 mr-1" /> Režim Offline
                </span>
              ) : (
                <span className="flex items-center text-[10px] font-black text-emerald-600 uppercase bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                  <Cloud className="w-3 h-3 mr-1" /> {isSyncing ? 'Synchronizácia...' : 'Cloud Aktívny'}
                </span>
              )}
            </div>
          </div>
          <button 
            onClick={() => setIsPairingModalOpen(true)}
            className="flex items-center space-x-2 px-4 py-3 bg-white border border-slate-200 rounded-2xl shadow-sm active:scale-95 transition hover:bg-slate-50"
          >
            <Smartphone className="w-5 h-5 text-indigo-600" />
            <span className="text-xs font-black text-slate-700 uppercase tracking-tight">Párovať</span>
          </button>
        </header>

        <div className="flex space-x-1 mb-6 p-1 bg-slate-200/50 rounded-2xl">
          <button onClick={() => setActiveTab('inventory')} className={`flex-1 py-3 rounded-xl font-bold transition flex items-center justify-center space-x-2 ${activeTab === 'inventory' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>
            <Package className="w-4 h-4" /> <span>Zásoby</span>
          </button>
          <button onClick={() => setActiveTab('history')} className={`flex-1 py-3 rounded-xl font-bold transition flex items-center justify-center space-x-2 ${activeTab === 'history' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>
            <History className="w-4 h-4" /> <span>Pohyby</span>
          </button>
        </div>

        {activeTab === 'inventory' ? (
          <>
            <div className="relative mb-6">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input 
                type="text" 
                placeholder="Hľadať produkt alebo SKU..." 
                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white border border-slate-200 shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none transition" 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
              />
            </div>
            {items.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border-2 border-dashed border-slate-200">
                <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="font-bold text-slate-800">Sklad je prázdny</h3>
                <p className="text-slate-500 text-sm mt-1">Pridajte prvý produkt pomocou tlačidla +</p>
              </div>
            ) : (
              <InventoryTable 
                items={items.filter(i => 
                  i.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                  i.sku.toLowerCase().includes(searchQuery.toLowerCase())
                )} 
                onDelete={(id) => {
                  if(confirm('Naozaj vymazať?')) {
                    const next = items.filter(i => i.id !== id);
                    setItems(next);
                    pushToCloud(next);
                  }
                }} 
              />
            )}
          </>
        ) : (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden divide-y divide-slate-50">
            {history.length > 0 ? history.map(entry => (
              <div key={entry.id} className="p-4 flex justify-between items-center">
                <div>
                  <div className="font-bold text-slate-800">{entry.itemName}</div>
                  <div className="text-[10px] text-slate-400 font-black uppercase">{new Date(entry.timestamp).toLocaleString()}</div>
                </div>
                <div className="bg-rose-50 text-rose-600 px-3 py-1 rounded-lg font-black text-xs border border-rose-100">-1 ks</div>
              </div>
            )) : <div className="p-12 text-center text-slate-400 italic font-bold uppercase text-[10px]">Zatiaľ žiadne pohyby.</div>}
          </div>
        )}

        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center space-x-4 z-40 px-6 w-full max-w-md">
          <button 
            onClick={() => setIsAddModalOpen(true)} 
            className="w-16 h-16 bg-white text-indigo-600 rounded-[24px] flex items-center justify-center shadow-2xl border border-slate-200 active:scale-90 transition flex-shrink-0"
            aria-label="Pridať produkt"
          >
            <Plus className="w-8 h-8" />
          </button>
          <button 
            onClick={() => setIsScannerOpen(true)} 
            className="flex-1 h-16 bg-indigo-600 text-white rounded-[24px] flex items-center justify-center shadow-2xl shadow-indigo-300 active:scale-95 transition font-black text-xl tracking-tight"
          >
            <Scan className="w-6 h-6 mr-3" /> SKENOVAŤ
          </button>
        </div>
      </div>

      <ScannerModal isOpen={isScannerOpen} onClose={() => setIsScannerOpen(false)} onScan={handleScanSuccess} />
      <AddItemModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onAdd={addItem} />
      <PairingModal isOpen={isPairingModalOpen} onClose={() => setIsPairingModalOpen(false)} syncId={syncId} />
    </Layout>
  );
};

export default App;
