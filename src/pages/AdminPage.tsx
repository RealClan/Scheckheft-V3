/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { 
  ArrowLeft, 
  LayoutDashboard, 
  FileText, 
  PlusCircle, 
  Image as ImageIcon,
  ChevronRight,
  TrendingUp,
  Users,
  CheckCircle2,
  XCircle,
  Trash2,
  Calendar,
  ShieldCheck,
  Diamond,
  ShieldAlert,
  Shield
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Stats {
  totals: {
    vehicles: number;
    services: number;
    attachments: number;
    pdfExports: number;
  };
  recentActivity: {
    event_type: string;
    count: number;
  }[];
}

interface User {
  id: string;
  email: string;
  displayName: string;
  role: string;
  isPro: boolean;
  createdAt: string;
}

const EVENT_LABELS: Record<string, string> = {
  vehicle_created: 'Fahrzeuge',
  service_created: 'Services',
  attachment_uploaded: 'Belege',
  pdf_export: 'Exports'
};

const EVENT_COLORS: Record<string, string> = {
  vehicle_created: '#3b82f6', // blue
  service_created: '#10b981', // emerald
  attachment_uploaded: '#8b5cf6', // violet
  pdf_export: '#f59e0b' // amber
};

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'stats' | 'users'>('stats');
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userActionLoading, setUserActionLoading] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (activeTab === 'stats') fetchStats();
    if (activeTab === 'users') fetchUsers();
  }, [activeTab]);

  const fetchStats = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || `Fehler ${res.status}: Zugriff verweigert oder Serverfehler.`);
      }
    } catch (err) {
      console.error('Failed to fetch admin stats:', err);
      setError('Verbindung zum Server fehlgeschlagen.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUsers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || `Fehler ${res.status}: Benutzerliste konnte nicht geladen werden.`);
      }
    } catch (err) {
      setError('Verbindung zum Server fehlgeschlagen.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteUser = async (id: string, email: string) => {
    if (!confirm(`Möchtest du den Benutzer "${email}" und alle zugehörigen Daten wirklich unwiderruflich löschen?`)) return;
    
    setUserActionLoading(id);
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setUsers(users.filter(u => u.id !== id));
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || 'Löschen fehlgeschlagen.');
      }
    } catch (err) {
      alert('Verbindungsfehler.');
    } finally {
      setUserActionLoading(null);
    }
  };

  const toggleProStatus = async (user: User) => {
    setUserActionLoading(user.id);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/pro`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPro: !user.isPro })
      });
      if (res.ok) {
        setUsers(users.map(u => u.id === user.id ? { ...u, isPro: !u.isPro } : u));
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || 'Update fehlgeschlagen.');
      }
    } catch (err) {
      alert('Verbindungsfehler.');
    } finally {
      setUserActionLoading(null);
    }
  };

  const toggleAdminRole = async (user: User) => {
    if (user.role === 'admin' && !confirm('Bist du sicher, dass du diesem Nutzer die Admin-Rechte entziehen möchtest?')) return;
    
    setUserActionLoading(user.id);
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    try {
      const res = await fetch(`/api/admin/users/${user.id}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      });
      if (res.ok) {
        setUsers(users.map(u => u.id === user.id ? { ...u, role: newRole } : u));
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || 'Rollenupdate fehlgeschlagen.');
      }
    } catch (err) {
      alert('Verbindungsfehler.');
    } finally {
      setUserActionLoading(null);
    }
  };

  const chartData = stats?.recentActivity.map(item => ({
    name: EVENT_LABELS[item.event_type] || item.event_type,
    count: item.count,
    color: EVENT_COLORS[item.event_type] || '#64748b'
  })) || [];

  if (isLoading && activeTab === 'stats' && !stats) {
    return (
      <div className="min-h-screen bg-[#0B0D0F] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0B0D0F] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-red-500/10 border border-red-500/20 rounded-3xl p-8 text-center space-y-6">
          <XCircle className="mx-auto text-red-500" size={48} />
          <h2 className="text-xl font-black text-white uppercase italic tracking-tighter">Zugriff verweigert</h2>
          <p className="text-sm text-slate-400">{error}</p>
          <button 
            onClick={() => navigate('/')}
            className="w-full bg-white/5 hover:bg-white/10 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all"
          >
            Zurück zur Garage
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0D0F] text-slate-300 font-sans p-6 md:p-12 selection:bg-blue-500/30">
      <div className="max-w-6xl mx-auto space-y-12 pb-20">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => navigate('/')}
                className="p-2 bg-white/5 rounded-xl text-slate-500 hover:text-white transition-all"
              >
                <ArrowLeft size={18} />
              </button>
              <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic leading-none">
                Admin <span className="text-blue-500">Panel</span>
              </h1>
            </div>
            <p className="text-[10px] text-slate-500 uppercase tracking-[0.3em] font-bold ml-12">
              Systemkontrolle & Analyse
            </p>
          </div>

          {/* Sub Navigation */}
          <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/5">
            <button 
              onClick={() => setActiveTab('stats')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'stats' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-500 hover:text-white'}`}
            >
              <TrendingUp size={14} />
              Statistiken
            </button>
            <button 
              onClick={() => setActiveTab('users')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'users' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-500 hover:text-white'}`}
            >
              <Users size={14} />
              Benutzer
            </button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'stats' ? (
            <motion.div 
              key="stats"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-12"
            >
              {/* Totals Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Fahrzeuge', value: stats?.totals.vehicles, icon: LayoutDashboard, color: 'text-blue-500' },
                  { label: 'Services', value: stats?.totals.services, icon: PlusCircle, color: 'text-emerald-500' },
                  { label: 'Belege', value: stats?.totals.attachments, icon: ImageIcon, color: 'text-violet-500' },
                  { label: 'PDF Exports', value: stats?.totals.pdfExports, icon: FileText, color: 'text-amber-500' },
                ].map((item, idx) => (
                  <div 
                    key={idx}
                    className="bg-[#14171C] border border-white/5 rounded-3xl p-6 flex flex-col items-center text-center group hover:border-blue-500/30 transition-all"
                  >
                    <div className={`p-3 rounded-2xl bg-white/5 mb-4 group-hover:scale-110 transition-transform ${item.color}`}>
                      <item.icon size={24} strokeWidth={2.5} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 mb-1">{item.label}</span>
                    <span className="text-4xl font-mono font-black text-white tracking-tighter">{item.value?.toLocaleString() || 0}</span>
                  </div>
                ))}
              </div>

              {/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-[#14171C] border border-white/5 rounded-[2.5rem] p-8 space-y-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-black text-white uppercase italic tracking-tighter">Aktivität</h3>
                      <p className="text-[10px] text-slate-600 uppercase tracking-widest font-bold">Letzte 30 Tage (Aggregiert)</p>
                    </div>
                    <TrendingUp className="text-blue-500" size={24} />
                  </div>

                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <XAxis 
                          dataKey="name" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: '#475569', fontSize: 10, fontWeight: 700 }}
                          interval={0}
                        />
                        <YAxis hide />
                        <Tooltip 
                          cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                          contentStyle={{ 
                            backgroundColor: '#14171C', 
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '16px',
                            fontSize: '11px',
                            fontWeight: 800,
                            textTransform: 'uppercase'
                          }}
                        />
                        <Bar dataKey="count" radius={[8, 8, 8, 8]} barSize={40}>
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Side Info */}
                <div className="bg-[#14171C] border border-white/5 rounded-[2.5rem] p-8 flex flex-col justify-between">
                  <div className="space-y-6">
                    <h3 className="text-xl font-black text-white uppercase italic tracking-tighter">System Info</h3>
                    
                    <div className="space-y-4">
                      <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-1">
                        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Datenbank</p>
                        <p className="text-sm font-black text-slate-300">SQLite (Lokal)</p>
                      </div>
                      <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-1">
                        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Privacy</p>
                        <p className="text-sm font-black text-slate-300">DSGVO Konform</p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-8 border-t border-white/5">
                    <p className="text-[9px] text-slate-700 uppercase tracking-[0.2em] font-bold leading-relaxed">
                      Diese Daten sind rein aggregiert. Es werden keine Nutzer-IDs, E-Mails oder individuelle Fahrzeuge gespeichert.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="users"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="bg-[#14171C] border border-white/5 rounded-[2.5rem] overflow-hidden">
                <div className="p-8 border-b border-white/5 flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-black text-white uppercase italic tracking-tighter">Benutzerverwaltung</h3>
                    <p className="text-[10px] text-slate-600 uppercase tracking-widest font-bold">Liste aller registrierten Accounts</p>
                  </div>
                  <div className="px-4 py-1.5 bg-blue-500/10 rounded-full border border-blue-500/20">
                    <span className="text-[10px] font-black uppercase tracking-widest text-blue-500">{users.length} Nutzer</span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-white/5 bg-white/[0.02]">
                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-600">Nutzer</th>
                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-600">Rolle</th>
                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-600">PRO Status</th>
                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-600">Registriert am</th>
                        <th className="px-8 py-5 text-right text-[10px] font-black uppercase tracking-widest text-slate-600">Aktionen</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {users.map(user => (
                        <tr key={user.id} className="group hover:bg-white/[0.02] transition-colors">
                          <td className="px-8 py-6">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-400 group-hover:text-white transition-colors">
                                <Users size={18} />
                              </div>
                              <div>
                                <p className="text-sm font-black text-white tracking-tight leading-none mb-1">{user.displayName || 'Unbekannt'}</p>
                                <p className="text-[10px] text-slate-600 font-bold uppercase tracking-wider">{user.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <button 
                              onClick={() => toggleAdminRole(user)}
                              disabled={userActionLoading === user.id}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${user.role === 'admin' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-slate-500/10 text-slate-500 border border-white/5 hover:border-slate-400'}`}
                            >
                              {user.role === 'admin' ? <ShieldCheck size={10} /> : <Shield size={10} />}
                              {user.role}
                            </button>
                          </td>
                          <td className="px-8 py-6">
                            <button 
                              onClick={() => toggleProStatus(user)}
                              disabled={userActionLoading === user.id}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${user.isPro ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-slate-500/10 text-slate-500 border border-white/5 hover:border-slate-400'}`}
                            >
                              <Diamond size={10} />
                              {user.isPro ? 'PRO AKTIV' : 'FREE'}
                            </button>
                          </td>
                          <td className="px-8 py-6">
                            <div className="flex items-center gap-2 text-slate-500">
                              <Calendar size={14} className="opacity-40" />
                              <span className="text-[10px] font-bold">{new Date(user.createdAt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                            </div>
                          </td>
                          <td className="px-8 py-6 text-right">
                            {user.role !== 'admin' && (
                              <button 
                                onClick={() => handleDeleteUser(user.id, user.email)}
                                disabled={userActionLoading === user.id}
                                className="p-3 bg-white/5 text-slate-600 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                                title="Benutzer löschen"
                              >
                                {userActionLoading === user.id ? (
                                  <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                  <Trash2 size={18} />
                                )}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {users.length === 0 && !isLoading && (
                  <div className="p-20 text-center space-y-4">
                    <Users size={48} className="mx-auto text-slate-800" />
                    <p className="text-sm font-black uppercase tracking-[0.2em] text-slate-600 italic">Noch keine Benutzer registriert.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer Link */}
        <div className="flex justify-center pt-8">
           <button 
             onClick={activeTab === 'stats' ? fetchStats : fetchUsers}
             className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-slate-600 hover:text-blue-500 transition-colors"
           >
             Daten aktualisieren <ChevronRight size={12} />
           </button>
        </div>
      </div>
    </div>
  );
}
