
import React, { useEffect, useState, useRef } from 'react';
import { X, CheckCircle2, AlertCircle, RefreshCw, Camera, Keyboard, Smartphone, Timer } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onScan: (sku: string) => { success: boolean; message: string };
}

export const ScannerModal: React.FC<Props> = ({ isOpen, onClose, onScan }) => {
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [manualMode, setManualMode] = useState(false);
  const [manualSku, setManualSku] = useState('');
  const [cooldown, setCooldown] = useState(0);
  
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const onScanRef = useRef(onScan);
  const lastScanTimeRef = useRef<number>(0);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  // Cooldown timer logic
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setInterval(() => {
        setCooldown(prev => Math.max(0, prev - 1));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [cooldown]);

  const stopCamera = async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        await html5QrCodeRef.current.stop();
      } catch (err) {
        console.error("Stop error", err);
      }
    }
  };

  const startCamera = async () => {
    setErrorMsg(null);
    try {
      const html5QrCode = new Html5Qrcode("reader");
      html5QrCodeRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          // Check for cooldown
          const now = Date.now();
          if (now - lastScanTimeRef.current < 5000) return;
          if (feedback?.type === 'success') return;
          
          setLastScanned(decodedText);
          const result = onScanRef.current(decodedText);
          
          setFeedback({
            type: result.success ? 'success' : 'error',
            message: result.message
          });
          
          if (result.success) {
            lastScanTimeRef.current = now;
            setCooldown(5);
            if ('vibrate' in navigator) navigator.vibrate(200);
          }
          
          setTimeout(() => setFeedback(null), result.success ? 2000 : 3500);
        },
        () => {}
      );
    } catch (err) {
      setErrorMsg("Kamera sa nespustila. Povoľte prístup k fotoaparátu.");
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualSku) return;
    
    // Check for cooldown
    const now = Date.now();
    if (now - lastScanTimeRef.current < 5000) {
      setFeedback({ type: 'error', message: 'Počkajte pred ďalším odpísaním.' });
      setTimeout(() => setFeedback(null), 2000);
      return;
    }

    const result = onScanRef.current(manualSku);
    setFeedback({
      type: result.success ? 'success' : 'error',
      message: result.message
    });
    
    if (result.success) {
      lastScanTimeRef.current = now;
      setCooldown(5);
      setManualSku('');
      setManualMode(false);
    }
    setTimeout(() => setFeedback(null), 3000);
  };

  useEffect(() => {
    if (isOpen && !manualMode) {
      const timer = setTimeout(startCamera, 300);
      return () => { 
        clearTimeout(timer);
        stopCamera(); 
      };
    }
  }, [isOpen, manualMode]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900 z-[100] flex flex-col">
      <div className="p-4 flex items-center justify-between text-white border-b border-white/10 safe-top">
        <h3 className="font-black tracking-tight flex items-center uppercase text-xs">
          {manualMode ? <Keyboard className="w-4 h-4 mr-2 text-indigo-400" /> : <Camera className="w-4 h-4 mr-2 text-indigo-400" />}
          {manualMode ? 'Ručný odpis' : 'Skenovanie QR'}
        </h3>
        <button onClick={onClose} className="p-2 bg-white/10 rounded-full"><X className="w-5 h-5" /></button>
      </div>

      <div className="flex-1 relative bg-black flex flex-col items-center justify-center overflow-hidden">
        {manualMode ? (
          <form onSubmit={handleManualSubmit} className="w-full max-w-xs p-8 bg-slate-800 rounded-[32px] border border-slate-700 shadow-2xl">
            <label className="block text-white/40 text-[10px] font-black uppercase mb-4 tracking-widest text-center">Zadajte kód produktu</label>
            <input 
              autoFocus
              className="w-full bg-slate-900 border border-slate-600 rounded-2xl px-4 py-5 text-white text-2xl font-mono mb-6 text-center focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="SKU-XXX"
              value={manualSku}
              onChange={e => setManualSku(e.target.value)}
            />
            <button 
              disabled={cooldown > 0}
              className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-lg shadow-xl active:scale-95 transition disabled:opacity-50 disabled:bg-slate-700"
            >
              {cooldown > 0 ? `ČAKAJTE ${cooldown}s` : 'ODPÍSAŤ'}
            </button>
          </form>
        ) : (
          <div id="reader" className="w-full h-full"></div>
        )}

        {feedback && (
          <div className="absolute top-10 px-6 w-full animate-in zoom-in duration-200 z-[120]">
            <div className={`p-6 rounded-3xl shadow-2xl flex items-center border-2 ${feedback.type === 'success' ? 'bg-emerald-500 border-emerald-400' : 'bg-rose-600 border-rose-500'} text-white`}>
              {feedback.type === 'success' ? <CheckCircle2 className="w-8 h-8 mr-4 flex-shrink-0" /> : <AlertCircle className="w-8 h-8 mr-4 flex-shrink-0" />}
              <span className="font-black text-lg block leading-tight">{feedback.message}</span>
            </div>
          </div>
        )}

        {!manualMode && cooldown > 0 && !feedback && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-white p-8 rounded-[40px] flex flex-col items-center animate-in zoom-in duration-300">
              <div className="relative w-20 h-20 flex items-center justify-center mb-4">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="40"
                    cy="40"
                    r="36"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    className="text-slate-100"
                  />
                  <circle
                    cx="40"
                    cy="40"
                    r="36"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray={226}
                    strokeDashoffset={226 - (226 * cooldown) / 5}
                    className="text-indigo-600 transition-all duration-1000 ease-linear"
                  />
                </svg>
                <span className="absolute text-2xl font-black text-slate-900">{cooldown}</span>
              </div>
              <p className="text-slate-900 font-black text-sm uppercase tracking-widest">Ďalší sken o chvíľu</p>
            </div>
          </div>
        )}

        {!manualMode && !feedback && cooldown === 0 && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-64 h-64 border-2 border-white/20 rounded-3xl relative">
              <div className="absolute -top-1 -left-1 w-12 h-12 border-t-8 border-l-8 border-indigo-500 rounded-tl-2xl"></div>
              <div className="absolute -top-1 -right-1 w-12 h-12 border-t-8 border-r-8 border-indigo-500 rounded-tr-2xl"></div>
              <div className="absolute -bottom-1 -left-1 w-12 h-12 border-b-8 border-l-8 border-indigo-500 rounded-bl-2xl"></div>
              <div className="absolute -bottom-1 -right-1 w-12 h-12 border-b-8 border-r-8 border-indigo-500 rounded-br-2xl"></div>
            </div>
          </div>
        )}
      </div>

      <div className="p-6 bg-slate-900 flex flex-col space-y-4 safe-bottom">
        {errorMsg && (
          <button 
            onClick={startCamera}
            className="w-full py-4 bg-rose-600 text-white rounded-2xl font-bold flex items-center justify-center"
          >
            <RefreshCw className="w-5 h-5 mr-2" /> Zapnúť kameru
          </button>
        )}
        <button 
          onClick={() => {
            stopCamera();
            setManualMode(!manualMode);
          }}
          className="w-full py-5 border border-white/10 bg-white/5 text-white rounded-2xl font-bold flex items-center justify-center active:bg-white/10 transition"
        >
          {manualMode ? <Camera className="w-5 h-5 mr-2" /> : <Keyboard className="w-5 h-5 mr-2" />}
          {manualMode ? 'Späť na kameru' : 'Zadať kód ručne'}
        </button>
      </div>
    </div>
  );
};
