import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Download, ImageIcon, Palette, Calendar, Diamond } from 'lucide-react';
import { Vehicle } from '../types';

interface PDFLiveEditorProps {
  vehicle: Vehicle;
  branding: { logo?: string; primaryColor?: string };
  onClose: () => void;
  onExport: (config: { 
    logo?: string; 
    primaryColor?: string; 
    dateFrom: string; 
    dateTo: string;
    includeAttachments: boolean;
    showDocuments: boolean;
  }) => void;
  onBrandingChange: (branding: { logo?: string; primaryColor?: string }) => void;
}

export default function PDFLiveEditor({ vehicle, branding, onClose, onExport, onBrandingChange }: PDFLiveEditorProps) {
  const [localLogo, setLocalLogo] = useState(branding.logo);
  const [localColor, setLocalColor] = useState(branding.primaryColor || '#3b82f6');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [includeAttachments, setIncludeAttachments] = useState(true);
  const [showDocuments, setShowDocuments] = useState(true);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1 * 1024 * 1024) return alert('Logo zu groß (max 1MB)');
      const reader = new FileReader();
      reader.onloadend = () => {
        const logo = reader.result as string;
        setLocalLogo(logo);
        onBrandingChange({ logo, primaryColor: localColor });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleColorChange = (color: string) => {
    setLocalColor(color);
    onBrandingChange({ logo: localLogo, primaryColor: color });
  };

  const filteredHistory = (vehicle.history || []).filter(h => {
    if (dateFrom && new Date(h.date) < new Date(dateFrom)) return false;
    if (dateTo && new Date(h.date) > new Date(dateTo)) return false;
    return true;
  });

  const filteredDocuments = (vehicle.documents || []).filter(d => {
    if (!showDocuments) return false;
    return true;
  });

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 md:p-8"
    >
      <div className="bg-[#0B0D0F] w-full max-w-7xl h-full max-h-[90vh] rounded-[3rem] border border-white/10 overflow-hidden flex flex-col md:flex-row">
        {/* Sidebar: Controls */}
        <div className="w-full md:w-80 border-r border-white/5 p-8 space-y-10 overflow-y-auto">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-black text-white italic uppercase tracking-tighter">Live Editor</h3>
            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl transition-colors"><X size={18}/></button>
          </div>

          {/* Logo */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
              <ImageIcon size={14} /> Logo
            </div>
            <div className="relative group aspect-square bg-white/5 rounded-2xl border-2 border-dashed border-white/10 flex items-center justify-center overflow-hidden">
               {localLogo ? (
                 <img src={localLogo} className="w-full h-full object-contain p-4" alt="Branding Logo" />
               ) : (
                 <Diamond size={30} className="text-white/20" />
               )}
               <input 
                 type="file" 
                 accept="image/*" 
                 onChange={handleLogoUpload}
                 className="absolute inset-0 opacity-0 cursor-pointer z-10" 
               />
               <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity pointer-events-none">
                 <p className="text-[10px] font-black uppercase text-white">Ändern</p>
               </div>
            </div>
          </div>

          {/* Primary Color */}
          <div className="space-y-4">
             <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
               <Palette size={14} /> Farbschema
             </div>
             <div className="grid grid-cols-5 gap-2">
               {['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#ffffff', '#000000', '#475569', '#1e293b'].map(c => (
                 <button 
                   key={c}
                   onClick={() => handleColorChange(c)}
                   className={`aspect-square rounded-lg border-2 transition-transform active:scale-90 ${localColor === c ? 'border-white scale-110' : 'border-transparent'}`}
                   style={{ backgroundColor: c }}
                 />
               ))}
             </div>
          </div>

          {/* Filter */}
          <div className="space-y-4">
             <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
               <Calendar size={14} /> Zeitraum
             </div>
             <div className="space-y-2">
                <input 
                  type="date" 
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full bg-white/5 border border-white/5 rounded-xl p-3 text-[10px] font-mono text-white outline-none" 
                  placeholder="Von"
                />
                <input 
                  type="date" 
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full bg-white/5 border border-white/5 rounded-xl p-3 text-[10px] font-mono text-white outline-none" 
                  placeholder="Bis"
                />
             </div>
          </div>

          {/* Premium Options */}
          <div className="space-y-4 pt-4 border-t border-white/5">
             <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-blue-500">
               <Diamond size={12} /> Premium Optionen
             </div>
             <div className="space-y-3">
                <label className="flex items-center justify-between cursor-pointer group">
                  <span className="text-[10px] font-bold text-slate-400 group-hover:text-white transition-colors">Belege anhängen</span>
                  <div 
                    onClick={() => setIncludeAttachments(!includeAttachments)}
                    className={`w-10 h-5 rounded-full relative transition-colors ${includeAttachments ? 'bg-blue-600' : 'bg-white/10'}`}
                  >
                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${includeAttachments ? 'left-6' : 'left-1'}`} />
                  </div>
                </label>
                <label className="flex items-center justify-between cursor-pointer group">
                  <span className="text-[10px] font-bold text-slate-400 group-hover:text-white transition-colors">Dokumente anzeigen</span>
                  <div 
                    onClick={() => setShowDocuments(!showDocuments)}
                    className={`w-10 h-5 rounded-full relative transition-colors ${showDocuments ? 'bg-blue-600' : 'bg-white/10'}`}
                  >
                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${showDocuments ? 'left-6' : 'left-1'}`} />
                  </div>
                </label>
             </div>
          </div>

          <button 
            onClick={() => onExport({ 
              logo: localLogo, 
              primaryColor: localColor, 
              dateFrom, 
              dateTo,
              includeAttachments,
              showDocuments
            })}
            className="w-full bg-white text-black py-5 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-200 transition-colors shadow-xl shadow-white/5"
          >
            PDF Generieren
          </button>
        </div>

        {/* Main: Preview Area */}
        <div className="flex-1 bg-[#111318]/50 p-8 md:p-12 overflow-y-auto scrollbar-hide">
          <div className="max-w-[800px] mx-auto bg-white rounded-lg shadow-2xl p-16 text-slate-800 min-h-[1100px] relative overflow-hidden">
             
             {/* PDF Header Preview */}
             <div className="flex justify-between items-start mb-20">
                <div className="w-16 h-16 bg-slate-100 flex items-center justify-center rounded-xl overflow-hidden">
                   {localLogo ? <img src={localLogo} className="w-full h-full object-contain" /> : <Diamond size={30} className="text-slate-300" />}
                </div>
                <div className="text-right">
                   <h1 className="text-3xl font-black uppercase italic tracking-tighter mb-2" style={{ color: localColor }}>Service Exposé</h1>
                   <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Erstellt am {new Date().toLocaleDateString()}</p>
                </div>
             </div>

             {/* Vehicle Box */}
             <div className="bg-slate-50 p-10 rounded-3xl mb-12 flex justify-between items-center border border-slate-100">
                <div>
                   <h2 className="text-2xl font-black text-slate-900 uppercase italic leading-none mb-2">{vehicle.name}</h2>
                   <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">{vehicle.model} • {vehicle.year}</p>
                </div>
                <div className="text-right">
                   <p className="text-[9px] font-black uppercase text-slate-400 mb-1">Laufleistung</p>
                   <p className="text-3xl font-mono font-black text-slate-900 tracking-tighter">{vehicle.currentMileage.toLocaleString()} <span className="text-xs uppercase">km</span></p>
                </div>
             </div>

             {/* Stats */}
             <div className="grid grid-cols-3 gap-6 mb-16">
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                   <p className="text-[8px] font-black uppercase text-slate-400 mb-1">Services</p>
                   <p className="text-lg font-mono font-black" style={{ color: localColor }}>{filteredHistory.length}</p>
                </div>
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                   <p className="text-[8px] font-black uppercase text-slate-400 mb-1">Investition</p>
                   <p className="text-lg font-mono font-black" style={{ color: localColor }}>{filteredHistory.reduce((acc, h) => acc + (h.cost || 0), 0).toLocaleString()} €</p>
                </div>
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                   <p className="text-[8px] font-black uppercase text-slate-400 mb-1">Upgrades</p>
                   <p className="text-lg font-mono font-black" style={{ color: localColor }}>{filteredDocuments.length}</p>
                </div>
             </div>

             {/* Table Preview */}
             <div className="space-y-6">
                <div className="space-y-1">
                   <div className="grid grid-cols-4 bg-slate-900 rounded-t-lg p-4">
                      <p className="text-[8px] font-black text-white uppercase tracking-widest">Datum</p>
                      <p className="text-[8px] font-black text-white uppercase tracking-widest col-span-2">Arbeiten</p>
                      <p className="text-[8px] font-black text-white uppercase tracking-widest text-right">KM-Stand</p>
                   </div>
                   {filteredHistory.slice(0, 10).map((h, i) => (
                     <div key={i} className="grid grid-cols-4 p-4 border-b border-slate-100 text-[10px]">
                        <p className="font-bold">{new Date(h.date).toLocaleDateString()}</p>
                        <p className="col-span-2 text-slate-600 truncate">{h.tasks.join(', ')}</p>
                        <p className="text-right font-mono font-bold text-slate-900">{h.mileage.toLocaleString()}</p>
                     </div>
                   ))}
                   {filteredHistory.length > 10 && (
                     <div className="p-4 text-center text-[10px] text-slate-400 italic">... und {filteredHistory.length - 10} weitere Einträge</div>
                   )}
                </div>

                {showDocuments && filteredDocuments.length > 0 && (
                  <div className="space-y-1 pt-4 border-t border-slate-100">
                     <h3 className="text-[10px] font-black uppercase tracking-widest mb-4" style={{ color: localColor }}>Tuning & Dokumente</h3>
                     <div className="grid grid-cols-4 bg-slate-100 p-4 rounded-t-lg">
                       <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Datum</p>
                       <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest col-span-2">Bezeichnung</p>
                       <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest text-right">Typ</p>
                     </div>
                     {filteredDocuments.slice(0, 5).map((d, i) => (
                       <div key={i} className="grid grid-cols-4 p-4 border-b border-slate-100 text-[10px]">
                         <p className="font-bold">{new Date(d.date).toLocaleDateString()}</p>
                         <p className="col-span-2 text-slate-600 truncate">{d.name}</p>
                         <p className="text-right font-bold text-slate-900">{d.type}</p>
                       </div>
                     ))}
                     {filteredDocuments.length > 5 && (
                       <div className="p-4 text-center text-[10px] text-slate-400 italic">... und {filteredDocuments.length - 5} weitere Einträge</div>
                     )}
                  </div>
                )}
             </div>

             <div className="absolute bottom-12 left-16 right-16 pt-8 border-t border-slate-100 flex justify-between items-center text-[8px] font-bold text-slate-300 uppercase tracking-widest">
                <span>Generiert mit SUBBOSS SERVICE</span>
                <span>Seite 1</span>
             </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
