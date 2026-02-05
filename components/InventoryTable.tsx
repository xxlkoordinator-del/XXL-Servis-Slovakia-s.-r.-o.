
import React, { useState } from 'react';
import { InventoryItem } from '../types';
import { Trash2, QrCode, MoreVertical } from 'lucide-react';
import { QRCodeDisplay } from './QRCodeDisplay';

interface Props {
  items: InventoryItem[];
  onDelete: (id: string) => void;
}

export const InventoryTable: React.FC<Props> = ({ items, onDelete }) => {
  const [selectedQR, setSelectedQR] = useState<InventoryItem | null>(null);

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div key={item.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center border border-slate-100 bg-slate-50 cursor-pointer hover:bg-indigo-50 transition"
                onClick={() => setSelectedQR(item)}
              >
                <QrCode className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">{item.name}</h3>
                <p className="text-xs text-slate-400 font-mono">{item.sku}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className={`text-xl font-bold ${item.quantity < 5 ? 'text-orange-500' : 'text-slate-900'}`}>
                  {item.quantity} <span className="text-xs text-slate-400 font-normal">ks</span>
                </div>
                {item.color && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 uppercase font-semibold">
                    {item.color}
                  </span>
                )}
              </div>
              
              <button 
                onClick={() => onDelete(item.id)}
                className="p-2 text-slate-300 hover:text-red-500 transition"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      ))}

      {selectedQR && (
        <QRCodeDisplay 
          item={selectedQR} 
          onClose={() => setSelectedQR(null)} 
        />
      )}
    </div>
  );
};
