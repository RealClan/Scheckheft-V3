import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  Car, 
  Bike, 
  Calendar, 
  Milestone, 
  Wrench, 
  ExternalLink,
  ShieldCheck,
  Diamond,
  FileText,
  History as HistoryIcon,
  Search,
  Package,
  Wrench as WrenchIcon,
  Tag
} from 'lucide-react';
import { Vehicle } from '../types';

export default function PublicVehiclePage() {
  const { slug } = useParams();
  const [vehicle, setVehicle] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVehicle = async () => {
      try {
        const res = await fetch(`/api/public/vehicles/${slug}`);
        if (!res.ok) throw new Error('Fahrzeug nicht gefunden.');
        const data = await res.json();
        setVehicle(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchVehicle();
  }, [slug]);

  if (loading) return (
    <div className="min-h-screen bg-[#0B0D0F] flex items-center justify-center">
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"
      />
    </div>
  );

  if (error || !vehicle) return (
    <div className="min-h-screen bg-[#0B0D0F] flex flex-col items-center justify-center p-6 text-center">
      <Search size={48} className="text-slate-700 mb-4" />
      <h1 className="text-2xl font-black text-white uppercase italic tracking-tighter mb-2">Ups!</h1>
      <p className="text-slate-500 text-sm mb-8">{error || 'Fahrzeug nicht gefunden.'}</p>
      <Link to="/" className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold text-xs uppercase tracking-widest">
        Zur Startseite
      </Link>
    </div>
  );

  const primaryColor = vehicle.seller?.branding?.primaryColor || '#2563eb';

  return (
    <div className="min-h-screen bg-[#0B0D0F] text-slate-300 font-sans pb-20">
      {/* Top Banner */}
      <div className="bg-slate-900/50 border-b border-white/5 py-3 px-6 text-center">
        <p className="text-[10px] uppercase tracking-[0.3em] font-black italic flex items-center justify-center gap-2">
          <ShieldCheck size={12} className="text-blue-500" />
          Verifiziertes digitales Scheckheft von <span className="text-white">{vehicle.seller.displayName}</span>
        </p>
      </div>

      <div className="max-w-4xl mx-auto p-6 md:p-12 space-y-12">
        {/* Hero Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 pt-6">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div 
                className="p-4 rounded-3xl"
                style={{ backgroundColor: `${primaryColor}20`, border: `1px solid ${primaryColor}40` }}
              >
                {vehicle.type === 'Car' ? <Car className="text-white" size={32} /> : <Bike className="text-white" size={32} />}
              </div>
              <div>
                <h1 className="text-5xl font-black text-white tracking-tighter uppercase italic leading-none">
                  {vehicle.name}
                </h1>
                <p className="text-xs text-slate-500 uppercase tracking-[0.3em] font-bold mt-1">
                  Digitales Exposé
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-xl flex items-center gap-2">
                <Tag size={14} className="text-slate-500" />
                <span className="text-xs font-black text-white">{vehicle.model}</span>
              </div>
              <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-xl flex items-center gap-2">
                <Calendar size={14} className="text-slate-500" />
                <span className="text-xs font-black text-white">{vehicle.year}</span>
              </div>
              <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-xl flex items-center gap-2">
                <Milestone size={14} className="text-slate-500" />
                <span className="text-xs font-black text-white">{vehicle.currentMileage.toLocaleString()} KM</span>
              </div>
            </div>
          </div>

           {vehicle.seller?.branding?.logo && (
            <img src={vehicle.seller.branding.logo} alt="Seller Logo" className="h-12 object-contain hidden md:block opacity-50 hover:opacity-100 transition-opacity" />
          )}
        </div>

        {/* Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* History */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <HistoryIcon size={18} className="text-blue-500" />
              <h2 className="text-xl font-black text-white uppercase italic tracking-tighter">Wartungshistorie</h2>
            </div>

            <div className="space-y-4">
              {vehicle.history.map((record: any) => (
                <div key={record.id} className="bg-[#14171C] border border-white/5 p-6 rounded-3xl space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs font-black text-white uppercase tracking-wider">{new Date(record.date).toLocaleDateString()}</p>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest">{record.mileage.toLocaleString()} KM</p>
                    </div>
                    <span className="bg-blue-500/10 text-blue-500 text-[9px] font-black px-2 py-1 rounded uppercase tracking-widest border border-blue-500/20">
                      {record.category}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {record.tasks.map((task: string) => (
                      <span key={task} className="text-[10px] bg-white/5 text-slate-400 px-2 py-1 rounded-lg border border-white/5 uppercase font-bold">
                        {task}
                      </span>
                    ))}
                  </div>
                  {record.notes && <p className="text-[11px] text-slate-500 italic leading-relaxed">"{record.notes}"</p>}
                </div>
              ))}
              {vehicle.history.length === 0 && (
                <p className="text-xs text-slate-600 uppercase tracking-widest font-bold italic">Keine Einträge vorhanden.</p>
              )}
            </div>
          </div>

          {/* Documents / Tuning */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <Package size={18} className="text-blue-500" />
              <h2 className="text-xl font-black text-white uppercase italic tracking-tighter">Umbauten & Dokumente</h2>
            </div>

            <div className="space-y-4">
              {vehicle.documents.map((doc: any) => (
                <div key={doc.id} className="bg-[#14171C] border border-white/5 p-6 rounded-3xl space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs font-black text-white uppercase tracking-wider">{doc.name}</p>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest">
                        {new Date(doc.date).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="bg-emerald-500/10 text-emerald-500 text-[9px] font-black px-2 py-1 rounded uppercase tracking-widest border border-emerald-500/20">
                      {doc.type}
                    </span>
                  </div>
                  {doc.notes && <p className="text-[11px] text-slate-500 italic">"{doc.notes}"</p>}
                </div>
              ))}
              {vehicle.documents.length === 0 && (
                <p className="text-xs text-slate-600 uppercase tracking-widest font-bold italic">Keine Einträge vorhanden.</p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-12 border-t border-white/5 text-center space-y-4">
          <p className="text-[9px] text-slate-700 uppercase tracking-[0.3em] font-black">
            Dieses Dokument wurde fälschungssicher über SubBoss erstellt.
          </p>
          <div className="flex items-center justify-center gap-6">
             <Link to="/" className="text-[10px] text-blue-500 font-black uppercase tracking-widest hover:underline flex items-center gap-2">
               App öffnen <ExternalLink size={10} />
             </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
