
import React from 'react';
import { X, Smartphone, Check, Copy, Info, Link2, Wifi } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  syncId: string;
}

export const PairingModal: React.FC<Props> = ({ isOpen, onClose, syncId }) => {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen) return null;

  // Vytvorenie úplnej adresy, ktorú mobil rozpozná ako link
  const getPairingUrl = () => {
    const url = new URL(window.location.origin + window.location.pathname);
    url.searchParams.set('s', syncId);
    return url.toString();
  };

  const fullUrl = getPairingUrl();

  const handleCopy = () => {
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-[40px] shadow-2xl max-w-sm w-full overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="p-6 flex justify-between items-center border-b border-slate-100 bg-indigo-50/50">
          <div className="flex items-center space-x-2 text-indigo-600">
            <Wifi className="w-5 h-5" />
            <h3 className="font-black text-slate-900 uppercase text-xs tracking-widest">Zdieľanie cez WiFi</h3>
          </div>
          <button onClick={onClose} className="p-2 bg-white rounded-full shadow-sm hover:bg-slate-100 transition">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <div className="p-8 flex flex-col items-center">
          <div className="mb-6 p-6 bg-white rounded-[32px] border-2 border-indigo-100 shadow-xl shadow-indigo-50">
            <QRCodeSVG 
              value={fullUrl} 
              size={200} 
              level="H" 
              includeMargin={false}
              className="rounded-lg" 
            />
          </div>
          
          <h4 className="text-xl font-black text-slate-900 text-center leading-tight">Prepojte zariadenia</h4>
          <p className="text-slate-500 text-[11px] text-center mt-3 font-bold uppercase tracking-tight px-4">
            Naskenujte tento kód fotoaparátom na mobile. Všetci na rovnakej WiFi uvidia tento sklad.
          </p>

          <div className="mt-8 w-full space-y-3">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
               <div className="text-[10px] text-slate-400 font-black uppercase mb-2 flex items-center">
                 <Link2 className="w-3 h-3 mr-1" /> Priamy odkaz pre kolegov:
               </div>
               <div className="text-[11px] text-indigo-600 font-mono break-all line-clamp-2">
                 {fullUrl}
               </div>
            </div>

            <button 
              onClick={handleCopy}
              className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black flex items-center justify-center shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition"
            >
              {copied ? <><Check className="w-5 h-5 mr-2" /> SKOPÍROVANÉ</> : <><Copy className="w-5 h-5 mr-2" /> KOPÍROVAŤ ODKAZ</>}
            </button>
          </div>
        </div>

        <div className="p-6 bg-indigo-600 flex items-start space-x-3">
          <Smartphone className="w-5 h-5 text-indigo-200 flex-shrink-0 mt-0.5" />
          <p className="text-[10px] text-indigo-100 font-bold leading-relaxed uppercase tracking-wide">
            Po naskenovaní sa mobil stane terminálom. Akákoľvek zmena sa okamžite prejaví na všetkých obrazovkách.
          </p>
        </div>
      </div>
    </div>
  );
};
