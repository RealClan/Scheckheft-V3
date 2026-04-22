/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  ArrowLeft, 
  Shield, 
  Trash2, 
  Mail, 
  Lock, 
  User,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Diamond
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, signOut, refreshUser } = useAuth();
  
  const [email, setEmail] = useState(user?.email || '');
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<'data' | 'account' | null>(null);

  const handleUnlockPro = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/unlock-pro', { method: 'POST' });
      if (res.ok) {
        await refreshUser();
        setStatus({ type: 'success', message: 'PRO Version erfolgreich freigeschaltet! Viel Spaß.' });
      } else {
        setStatus({ type: 'error', message: 'Freischaltung fehlgeschlagen.' });
      }
    } catch (err) {
      setStatus({ type: 'error', message: 'Verbindungsfehler.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setStatus(null);

    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: password || undefined, displayName })
      });

      const data = await res.json();
      if (res.ok) {
        setStatus({ type: 'success', message: 'Profil erfolgreich aktualisiert.' });
        setPassword('');
      } else {
        setStatus({ type: 'error', message: data.error || 'Update fehlgeschlagen.' });
      }
    } catch (err) {
      setStatus({ type: 'error', message: 'Verbindungsfehler.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/data', { method: 'DELETE' });
      if (res.ok) {
        setStatus({ type: 'success', message: 'Alle Fahrzeugdaten wurden gelöscht.' });
        setShowDeleteConfirm(null);
      } else {
        setStatus({ type: 'error', message: 'Löschen fehlgeschlagen.' });
      }
    } catch (err) {
      setStatus({ type: 'error', message: 'Verbindungsfehler.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/account', { method: 'DELETE' });
      if (res.ok) {
        signOut();
        navigate('/login');
      } else {
        setStatus({ type: 'error', message: 'Account-Löschung fehlgeschlagen.' });
      }
    } catch (err) {
      setStatus({ type: 'error', message: 'Verbindungsfehler.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0D0F] text-slate-300 font-sans p-6 md:p-12 mb-20">
      <div className="max-w-3xl mx-auto space-y-12">
        
        {/* Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate('/')}
              className="p-2 bg-white/5 rounded-xl text-slate-500 hover:text-white transition-all"
            >
              <ArrowLeft size={18} />
            </button>
            <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic leading-none">
              Einstellungen
            </h1>
          </div>
          <p className="text-[10px] text-slate-500 uppercase tracking-[0.3em] font-bold ml-12">
            Account-Sicherheit & Privatsphäre
          </p>
        </div>

        {/* PRO Upgrade Call-to-Action */}
        {!user?.isPro && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2.5rem] p-8 md:p-10 shadow-2xl shadow-blue-600/20 relative overflow-hidden group"
          >
            {/* Background Accent */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl group-hover:bg-white/20 transition-all duration-700"></div>
            
            <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
              <div className="p-5 bg-white/10 backdrop-blur-md rounded-3xl border border-white/20">
                <Diamond size={40} className="text-white" />
              </div>
              <div className="flex-1 text-center md:text-left space-y-2">
                <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">Hol dir PRO Rechte</h2>
                <p className="text-blue-100 text-sm font-medium leading-relaxed max-w-md">
                  Schalte unbegrenzte Fahrzeuge, professionelle Exporte, Dokumenten-Management und dein eigenes Branding frei.
                </p>
              </div>
              <button 
                onClick={handleUnlockPro}
                disabled={isLoading}
                className="bg-white text-blue-600 px-8 py-5 rounded-2xl font-black uppercase tracking-widest text-xs hover:scale-105 active:scale-95 transition-all shadow-xl shadow-black/10"
              >
                {isLoading ? 'Wird freigeschaltet...' : 'Jetzt Freischalten'}
              </button>
            </div>
          </motion.div>
        )}

        {status && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 rounded-2xl flex items-center gap-3 ${status.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-500' : 'bg-red-500/10 border border-red-500/20 text-red-500'}`}
          >
            {status.type === 'success' ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
            <p className="text-sm font-black uppercase tracking-widest">{status.message}</p>
          </motion.div>
        )}

        {/* Profile Form */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#14171C] border border-white/5 rounded-[2.5rem] p-8 md:p-10 space-y-8"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 text-blue-500 rounded-2xl border border-blue-500/20">
              <User size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-white uppercase italic tracking-tighter">Profil & Sicherheit</h2>
              <p className="text-[10px] text-slate-600 uppercase tracking-widest font-bold">Email & Passwort ändern</p>
            </div>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 ml-1">Anzeigename</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-700" size={16} />
                  <input 
                    type="text" 
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-white focus:border-blue-500/50 outline-none transition-all"
                    placeholder="Dein Name"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 ml-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-700" size={16} />
                  <input 
                    type="email" 
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-white focus:border-blue-500/50 outline-none transition-all"
                    placeholder="email@beispiel.de"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 ml-1">Neues Passwort (leer lassen für keine Änderung)</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-700" size={16} />
                <input 
                  type="password" 
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-white focus:border-blue-500/50 outline-none transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-xs transition-all shadow-lg shadow-blue-600/20"
            >
              {isLoading ? 'Speichern...' : 'Profil aktualisieren'}
            </button>
          </form>
        </motion.div>

        {/* Danger Zone */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-red-500/5 border border-red-500/10 rounded-[2.5rem] p-8 md:p-10 space-y-8"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-500/10 text-red-500 rounded-2xl border border-red-500/20">
              <AlertTriangle size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-red-500 uppercase italic tracking-tighter">Gefahrenzone</h2>
              <p className="text-[10px] text-slate-700 uppercase tracking-widest font-bold">Endgültige Aktionen</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button 
              onClick={() => setShowDeleteConfirm('data')}
              className="bg-white/5 border border-white/5 hover:border-red-500/30 p-6 rounded-3xl flex flex-col items-center text-center transition-all group"
            >
              <Trash2 className="text-slate-600 group-hover:text-red-500 mb-2 transition-colors" size={20} />
              <span className="text-[11px] font-black uppercase tracking-widest text-slate-300">Daten löschen</span>
              <p className="text-[9px] text-slate-600 mt-2">Alle Fahrzeuge und Services entfernen</p>
            </button>

            <button 
              onClick={() => setShowDeleteConfirm('account')}
              className="bg-red-500/10 border border-red-500/10 hover:bg-red-500/20 p-6 rounded-3xl flex flex-col items-center text-center transition-all group"
            >
              <AlertTriangle className="text-red-500 mb-2" size={20} />
              <span className="text-[11px] font-black uppercase tracking-widest text-red-500">Account löschen</span>
              <p className="text-[9px] text-red-500/60 mt-2">Account und alle Daten unwiderruflich löschen</p>
            </button>
          </div>
        </motion.div>

        {/* Privacy Info */}
        <div className="flex flex-col items-center text-center space-y-4 pt-12 border-t border-white/5">
          <Shield size={24} className="text-slate-700" />
          <p className="text-[9px] text-slate-600 uppercase tracking-[0.2em] max-w-md leading-relaxed font-bold">
            Deine Daten werden lokal verschlüsselt gespeichert. Wir geben keine Informationen an Dritte weiter. Die Löschung erfolgt sofort und vollständig.
          </p>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#14171C] border border-red-500/20 rounded-[2.5rem] p-8 md:p-12 max-w-lg w-full text-center space-y-8"
          >
            <div className="p-4 bg-red-500/10 text-red-500 rounded-3xl w-fit mx-auto border border-red-500/20">
              <AlertTriangle size={32} />
            </div>
            <div>
              <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter mb-2">Bist du sicher?</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Diese Aktion ist endgültig und kann nicht rückgängig gemacht werden. 
                {showDeleteConfirm === 'account' 
                  ? ' Dein gesamter Account und alle Fahrzeugdaten werden gelöscht.' 
                  : ' Alle deine Fahrzeuge und Service-Einträge werden unwiderruflich entfernt.'}
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <button 
                onClick={showDeleteConfirm === 'account' ? handleDeleteAccount : handleDeleteData}
                disabled={isLoading}
                className="w-full bg-red-600 hover:bg-red-500 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all"
              >
                {isLoading ? 'Löschen...' : 'Ja, unwiderruflich löschen'}
              </button>
              <button 
                onClick={() => setShowDeleteConfirm(null)}
                className="w-full bg-white/5 text-slate-500 py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all hover:text-white"
              >
                Abbrechen
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
