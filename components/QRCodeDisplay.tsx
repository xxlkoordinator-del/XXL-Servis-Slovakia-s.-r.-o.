
import React, { useRef } from 'react';
import { InventoryItem } from '../types';
import { X, Printer, Download, ExternalLink, Smartphone } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface Props {
  item: InventoryItem;
  onClose: () => void;
}

export const QRCodeDisplay: React.FC<Props> = ({ item, onClose }) => {
  const printRef = useRef<HTMLDivElement>(null);

  // Vytvorenie odkaz na konkrétny odpis produktu
  const getProductActionUrl = () => {
    const url = new URL(window.location.origin + window.location.pathname);
    // Zachováme syncId aby sa mobil pripojil k správnemu skladu
    const currentSyncId = new URLSearchParams(window.location.search).get('s');
    if (currentSyncId) url.searchParams.set('s', currentSyncId);
    
    // Pridáme príkaz na odpis
    url.searchParams.set('scan', item.sku);
    return url.toString();
  };

  const actionUrl = getProductActionUrl();

  const handlePrint = () => window.print();

  const handleDownload = () => {
    const svg = document.querySelector('#item-qr-svg') as SVGElement;
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      if (ctx) {
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, 1024, 1024);
      }
      const pngFile = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.download = `QR-ODPIS-${item.sku}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #printable-area, #printable-area * { visibility: visible; }
          #printable-area { 
            position: absolute; 
            left: 50%; 
            top: 40%; 
            transform: translate(-50%, -50%) scale(1.8); 
          }
        }
      `}</style>
      
      <div className="bg-white rounded-[40px] shadow-2xl max-w-sm w-full overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="p-4 flex justify-between items-center border-b border-slate-50 bg-slate-50/50">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse"></div>
            <h3 className="font-black text-slate-500 uppercase text-[10px] tracking-widest">QR ŠTÍTOK PRODUKTU</h3>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white shadow-sm transition">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>
        
        <div className="p-10 flex flex-col items-center" id="printable-area" ref={printRef}>
          <div className="p-6 bg-white rounded-[40px] border-2 border-slate-100 mb-8 shadow-2xl shadow-indigo-100/50">
            <QRCodeSVG 
              id="item-qr-svg"
              value={actionUrl} 
              size={180}
              level="H"
              includeMargin={false}
            />
          </div>
          <div className="text-center">
            <div className="text-3xl font-black text-slate-900 leading-tight mb-2 tracking-tight">{item.name}</div>
            <div className="text-xs font-black text-indigo-600 uppercase tracking-[0.2em] bg-indigo-50 px-4 py-2 rounded-xl inline-block border border-indigo-100">
              SKU: {item.sku}
            </div>
          </div>
        </div>

        <div className="p-6 bg-slate-50 grid grid-cols-2 gap-3">
          <button 
            onClick={handlePrint}
            className="py-4 bg-white border border-slate-200 rounded-2xl flex items-center justify-center font-black text-xs text-slate-700 uppercase tracking-widest hover:bg-white transition active:scale-95 shadow-sm"
          >
            <Printer className="w-4 h-4 mr-2 text-indigo-500" /> TLAČIŤ
          </button>
          <button 
            onClick={handleDownload}
            className="py-4 bg-indigo-600 rounded-2xl flex items-center justify-center font-black text-xs text-white uppercase tracking-widest hover:bg-indigo-700 transition shadow-lg shadow-indigo-200 active:scale-95"
          >
            <Download className="w-4 h-4 mr-2" /> ULOŽIŤ PNG
          </button>
          <div className="col-span-2 mt-2 py-3 bg-indigo-50 rounded-xl flex items-center justify-center">
            <Smartphone className="w-3 h-3 text-indigo-400 mr-2" />
            <span className="text-[10px] text-indigo-600 font-black uppercase tracking-tight">
              Skenovanie mobilom automaticky odpíše 1ks
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
