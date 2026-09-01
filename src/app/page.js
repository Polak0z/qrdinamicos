'use client';
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Link2, Trash2, Edit2, QrCode, TrendingUp, Users, Activity, Settings2, BarChart3, LayoutGrid } from 'lucide-react';
import QrStudio from '@/components/QrStudio';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('gestion'); // 'gestion', 'analytics', 'studio'

  const [clients, setClients] = useState([]);
  const [qrs, setQrs] = useState([]);
  const [allScans, setAllScans] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [newClientName, setNewClientName] = useState('');
  const [clientUsername, setClientUsername] = useState('');
  const [clientPassword, setClientPassword] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [qrName, setQrName] = useState('');
  const [qrSlug, setQrSlug] = useState('');
  const [targetUrl, setTargetUrl] = useState('');
  const [selectedQr, setSelectedQr] = useState(null);

  // Filters
  const [gestionFilterClient, setGestionFilterClient] = useState('all');
  const [analyticsFilterClient, setAnalyticsFilterClient] = useState('all');
  const [analyticsFilterQr, setAnalyticsFilterQr] = useState('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    if (!supabase) {
      console.error("Supabase client is not initialized.");
      setLoading(false);
      return;
    }
    // 1. Load Clients
    const { data: clientsData } = await supabase.from('clients').select('*').order('created_at', { ascending: false });
    setClients(clientsData || []);

    // 2. Load QRs with Scan count
    const { data: qrsData } = await supabase.from('dynamic_qrs').select(`
      *,
      clients (name)
    `).order('created_at', { ascending: false });

    // 3. Load Scans
    const { data: scansData } = await supabase.from('scan_events').select('*');
    
    setAllScans(scansData || []);

    const qrsWithCounts = (qrsData || []).map(qr => {
      const qrScans = (scansData || []).filter(s => s.qr_id === qr.id).length;
      return { ...qr, scansCount: qrScans };
    });

    setQrs(qrsWithCounts);
    setLoading(false);
  };

  const handleCreateClient = async (e) => {
    e.preventDefault();
    if (!newClientName || !clientUsername || !clientPassword) return;
    
    const { error } = await supabase.from('clients').insert([{ 
      name: newClientName,
      username: clientUsername.toLowerCase(),
      password: clientPassword
    }]);

    if (error) {
      alert("Error al crear cliente: " + error.message);
      return;
    }

    setNewClientName('');
    setClientUsername('');
    setClientPassword('');
    loadData();
  };

  const handleDeleteClient = async (id) => {
    if (confirm("¿Seguro que deseas eliminar este cliente? Se perderán todos sus QRs y analíticas asociados permanentemente.")) {
      await supabase.from('clients').delete().eq('id', id);
      loadData();
    }
  };

  const handleCreateQr = async (e) => {
    e.preventDefault();
    if (!selectedClientId || !qrName || !qrSlug || !targetUrl) return;
    const { error } = await supabase.from('dynamic_qrs').insert([{
      client_id: selectedClientId,
      name: qrName,
      slug: qrSlug,
      target_url: targetUrl
    }]);
    if (error) { alert("Error: " + error.message); return; }
    setQrName(''); setQrSlug(''); setTargetUrl('');
    loadData();
  };

  const handleUpdateUrl = async (id, currentUrl) => {
    const newUrl = prompt("Ingresa la nueva URL de destino:", currentUrl);
    if (newUrl && newUrl !== currentUrl) {
      await supabase.from('dynamic_qrs').update({ target_url: newUrl }).eq('id', id);
      loadData();
    }
  };

  const handleDeleteQr = async (id) => {
    if (confirm("¿Seguro que deseas eliminar este QR? Se perderán sus analíticas.")) {
      await supabase.from('dynamic_qrs').delete().eq('id', id);
      loadData();
    }
  };

  const openQrStudio = (qr) => {
    setSelectedQr(qr);
    setActiveTab('studio');
  };

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://tudominio.com';

  // --- Derived Data for UI ---
  
  // Table filtered QRs
  const filteredQrs = useMemo(() => {
    if (gestionFilterClient === 'all') return qrs;
    return qrs.filter(q => q.client_id === gestionFilterClient);
  }, [qrs, gestionFilterClient]);

  // Analytics derived data
  const { dailyChartData, hourlyChartData, totalFilteredScans } = useMemo(() => {
    let filteredScans = allScans;
    
    // 1. Filter by Client
    if (analyticsFilterClient !== 'all') {
      const qrsOfClient = qrs.filter(q => q.client_id === analyticsFilterClient).map(q => q.id);
      filteredScans = filteredScans.filter(s => qrsOfClient.includes(s.qr_id));
    }
    
    // 2. Filter by QR
    if (analyticsFilterQr !== 'all') {
      filteredScans = filteredScans.filter(s => s.qr_id === analyticsFilterQr);
    }

    const total = filteredScans.length;

    // Daily distribution
    const dateCounts = {};
    filteredScans.forEach(scan => {
      const date = new Date(scan.scanned_at).toLocaleDateString();
      dateCounts[date] = (dateCounts[date] || 0) + 1;
    });
    const daily = Object.keys(dateCounts).map(date => ({
      date,
      scans: dateCounts[date]
    })).slice(-14); // Last 14 days

    // Hourly distribution
    const hourCounts = Array(24).fill(0);
    filteredScans.forEach(scan => {
      const hour = new Date(scan.scanned_at).getHours();
      hourCounts[hour]++;
    });
    const hourly = hourCounts.map((count, hour) => ({
      hour: `${hour}:00`,
      scans: count
    }));

    return { dailyChartData: daily, hourlyChartData: hourly, totalFilteredScans: total };
  }, [allScans, qrs, analyticsFilterClient, analyticsFilterQr]);


  // Analytics QR Options based on selected client
  const availableQrsForAnalytics = useMemo(() => {
    if (analyticsFilterClient === 'all') return qrs;
    return qrs.filter(q => q.client_id === analyticsFilterClient);
  }, [qrs, analyticsFilterClient]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-purple-500/30">
      
      {/* Navbar */}
      <nav className="border-b border-white/10 bg-white/5 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:h-16 sm:py-0 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto justify-center sm:justify-start">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-blue-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <QrCode className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
              QR Nexus
            </h1>
          </div>
          
          {/* Main Navigation Tabs */}
          <div className="flex bg-white/5 rounded-lg p-1 border border-white/10 w-full sm:w-auto overflow-x-auto snap-x">
            <button 
              onClick={() => setActiveTab('gestion')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === 'gestion' ? 'bg-white/10 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              Gestión
            </button>
            <button 
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === 'analytics' ? 'bg-white/10 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              Analíticas
            </button>
            <button 
              onClick={() => setActiveTab('studio')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === 'studio' ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Settings2 className="w-4 h-4" />
              QR Studio
            </button>
          </div>
        </div>
      </nav>

      {!supabase && (
        <div className="max-w-7xl mx-auto px-6 mt-8">
          <div className="bg-red-500/10 border border-red-500/30 p-6 rounded-2xl text-center">
            <h2 className="text-red-400 text-xl font-bold mb-2">Error Crítico: Supabase no está configurado</h2>
            <p className="text-red-300">
              Las variables de entorno en tu archivo <b>.env</b> son incorrectas.
            </p>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        
        {/* ======================= TAB: GESTION ======================= */}
        {activeTab === 'gestion' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Overview Stats */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="relative overflow-hidden rounded-2xl bg-white/5 border border-white/10 p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-slate-400 mb-1">Total Escaneos (Global)</p>
                    <h3 className="text-4xl font-bold text-white tracking-tight">{allScans.length}</h3>
                  </div>
                  <div className="p-3 bg-purple-500/10 rounded-xl text-purple-400"><TrendingUp className="w-6 h-6" /></div>
                </div>
              </div>
              <div className="relative overflow-hidden rounded-2xl bg-white/5 border border-white/10 p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-slate-400 mb-1">QRs Activos</p>
                    <h3 className="text-4xl font-bold text-white tracking-tight">{qrs.length}</h3>
                  </div>
                  <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400"><QrCode className="w-6 h-6" /></div>
                </div>
              </div>
              <div className="relative overflow-hidden rounded-2xl bg-white/5 border border-white/10 p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-slate-400 mb-1">Clientes Registrados</p>
                    <h3 className="text-4xl font-bold text-white tracking-tight">{clients.length}</h3>
                  </div>
                  <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400"><Users className="w-6 h-6" /></div>
                </div>
              </div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Forms */}
              <div className="lg:col-span-1 space-y-6">
                {/* Add Client */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                  <h3 className="text-base font-semibold text-white mb-4">1. Nuevo Cliente</h3>
                  <form onSubmit={handleCreateClient} className="space-y-4">
                    <div>
                      <input 
                        required 
                        value={newClientName} 
                        onChange={e => setNewClientName(e.target.value)} 
                        className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-purple-500/50 outline-none mb-3"
                        placeholder="Nombre del Cliente (Ej. Zara)"
                      />
                      <input 
                        required 
                        value={clientUsername} 
                        onChange={e => setClientUsername(e.target.value)} 
                        className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-purple-500/50 outline-none mb-3 lowercase"
                        placeholder="Usuario de acceso (Ej. zara_admin)"
                      />
                      <input 
                        required 
                        value={clientPassword} 
                        onChange={e => setClientPassword(e.target.value)} 
                        className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-purple-500/50 outline-none"
                        placeholder="Contraseña (Ej. 1234)"
                      />
                    </div>
                    <button type="submit" className="w-full bg-white/10 hover:bg-white/20 text-white text-sm font-medium py-2.5 rounded-xl transition-all">Registrar Cliente</button>
                  </form>
                  
                  <div className="mt-6 pt-4 border-t border-white/10">
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Gestión de Clientes</h4>
                    <ul className="space-y-2 max-h-40 overflow-y-auto pr-2">
                      {clients.map(c => (
                        <li key={c.id} className="flex justify-between items-center text-sm bg-black/20 px-3 py-2 rounded-lg">
                          <div className="flex flex-col truncate">
                            <span className="text-slate-300 font-medium truncate">{c.name}</span>
                            {c.username && <span className="text-slate-500 text-xs truncate">User: {c.username}</span>}
                          </div>
                          <button onClick={() => handleDeleteClient(c.id)} className="text-red-400 hover:text-red-300 p-2 shrink-0" title="Eliminar Cliente">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Add QR */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                  <h3 className="text-base font-semibold text-white mb-4">2. Generar Link QR</h3>
                  <form onSubmit={handleCreateQr} className="space-y-4">
                    <div>
                      <select required value={selectedClientId} onChange={e => setSelectedClientId(e.target.value)} className="w-full bg-black/20 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:ring-2 focus:ring-purple-500/50 outline-none appearance-none">
                        <option value="" className="bg-slate-900">Seleccionar Cliente...</option>
                        {clients.map(c => <option key={c.id} value={c.id} className="bg-slate-900">{c.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <input required value={qrName} onChange={e => setQrName(e.target.value)} className="w-full bg-black/20 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-purple-500/50 outline-none" placeholder="Identificador (Ej: Mesa 1)"/>
                    </div>
                    <div>
                      <input required value={qrSlug} onChange={e => setQrSlug(e.target.value)} className="w-full bg-black/20 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-purple-500/50 outline-none" placeholder="Slug único (Ej: mx-m1)"/>
                    </div>
                    <div>
                      <input required type="url" value={targetUrl} onChange={e => setTargetUrl(e.target.value)} className="w-full bg-black/20 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-purple-500/50 outline-none" placeholder="URL Destino (https://...)"/>
                    </div>
                    <button type="submit" className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white text-sm font-medium py-2.5 rounded-xl shadow-lg transition-all">Crear Link Dinámico</button>
                  </form>
                </div>
              </div>

              {/* Table */}
              <div className="lg:col-span-2">
                <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden flex flex-col h-full">
                  <div className="p-4 sm:p-6 border-b border-white/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-black/10">
                    <h3 className="text-base font-semibold text-white">Links Activos</h3>
                    <select 
                      value={gestionFilterClient} 
                      onChange={(e) => setGestionFilterClient(e.target.value)}
                      className="bg-slate-800 border border-slate-700 text-sm text-white rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-purple-500 outline-none w-full sm:w-auto"
                    >
                      <option value="all">Filtrar: Todos los clientes</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  
                  <div className="overflow-x-auto flex-1">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead className="bg-black/20 text-slate-400">
                        <tr>
                          <th className="px-6 py-4 font-medium">QR / Cliente</th>
                          <th className="px-6 py-4 font-medium">Creación</th>
                          <th className="px-6 py-4 font-medium">Link Dinámico</th>
                          <th className="px-6 py-4 font-medium">Destino</th>
                          <th className="px-6 py-4 font-medium text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {loading ? (
                          <tr><td colSpan="5" className="px-6 py-8 text-center text-slate-500">Cargando...</td></tr>
                        ) : filteredQrs.length === 0 ? (
                          <tr><td colSpan="5" className="px-6 py-8 text-center text-slate-500">No se encontraron resultados.</td></tr>
                        ) : filteredQrs.map(qr => (
                          <tr key={qr.id} className="hover:bg-white/[0.02] transition-colors group">
                            <td className="px-6 py-4">
                              <div className="font-medium text-slate-200">{qr.name}</div>
                              <div className="text-xs text-slate-500">{qr.clients?.name}</div>
                            </td>
                            <td className="px-6 py-4 text-slate-400 text-xs">
                              {new Date(qr.created_at).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4">
                              <span className="inline-flex px-2 py-1 rounded bg-purple-500/10 text-purple-400 text-xs font-mono">
                                /r/{qr.slug}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2 max-w-[150px]">
                                <Link2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                <span className="truncate text-slate-400">{qr.target_url}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-end gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                                <button onClick={() => openQrStudio(qr)} className="p-1.5 text-blue-400 hover:bg-blue-400/20 rounded-md bg-blue-400/10" title="QR Studio">
                                  <QrCode className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleUpdateUrl(qr.id, qr.target_url)} className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-md" title="Editar Destino">
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleDeleteQr(qr.id)} className="p-1.5 text-red-400 hover:bg-red-400/10 rounded-md" title="Eliminar QR">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================= TAB: ANALYTICS ======================= */}
        {activeTab === 'analytics' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Filters Bar */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col sm:flex-row gap-4 items-center">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <Activity className="w-5 h-5 text-purple-400" />
                <span className="text-white font-semibold">Filtros de Analítica:</span>
              </div>
              <div className="flex-1 flex gap-4 w-full">
                <select 
                  value={analyticsFilterClient} 
                  onChange={(e) => {
                    setAnalyticsFilterClient(e.target.value);
                    setAnalyticsFilterQr('all'); // Reset QR filter when client changes
                  }}
                  className="bg-slate-800 border border-slate-700 text-sm text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500 outline-none w-full sm:w-1/2"
                >
                  <option value="all">Todos los clientes</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <select 
                  value={analyticsFilterQr} 
                  onChange={(e) => setAnalyticsFilterQr(e.target.value)}
                  className="bg-slate-800 border border-slate-700 text-sm text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500 outline-none w-full sm:w-1/2"
                >
                  <option value="all">Todos los QRs (del cliente seleccionado)</option>
                  {availableQrsForAnalytics.map(q => <option key={q.id} value={q.id}>{q.name} ({q.slug})</option>)}
                </select>
              </div>
            </div>

            {/* Total Metric */}
            <div className="bg-purple-500/10 border border-purple-500/20 rounded-2xl p-6 text-center">
              <p className="text-purple-300 text-sm font-medium mb-1">Escaneos Resultantes del Filtro</p>
              <h2 className="text-5xl font-black text-purple-400">{totalFilteredScans}</h2>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Daily Chart */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-white mb-6">Tráfico por Día (Últimos 14 días)</h3>
                <div className="h-72 w-full">
                  {dailyChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={dailyChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                        <XAxis dataKey="date" stroke="#94a3b8" axisLine={false} tickLine={false} tick={{fontSize: 12}} dy={10} />
                        <YAxis stroke="#94a3b8" axisLine={false} tickLine={false} tick={{fontSize: 12}} dx={-10} />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} itemStyle={{ color: '#fff' }} />
                        <Line type="monotone" dataKey="scans" stroke="#8b5cf6" strokeWidth={3} dot={{r: 4, fill: '#0f172a'}} activeDot={{r: 6, fill: '#8b5cf6'}} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-500 text-sm">Sin datos en el periodo</div>
                  )}
                </div>
              </div>

              {/* Hourly Chart */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-white mb-6">Concentración por Hora (00:00 - 23:59)</h3>
                <div className="h-72 w-full">
                  {hourlyChartData.some(d => d.scans > 0) ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={hourlyChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                        <XAxis dataKey="hour" stroke="#94a3b8" axisLine={false} tickLine={false} tick={{fontSize: 10}} dy={10} interval={2} />
                        <YAxis stroke="#94a3b8" axisLine={false} tickLine={false} tick={{fontSize: 12}} dx={-10} />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} itemStyle={{ color: '#fff' }} cursor={{fill: '#ffffff05'}} />
                        <Bar dataKey="scans" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-500 text-sm">Sin datos registrados</div>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ======================= TAB: QR STUDIO ======================= */}
        {activeTab === 'studio' && (() => {
          if (!selectedQr) {
            return (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 py-32 flex flex-col items-center justify-center text-slate-500 border-2 border-dashed border-white/10 rounded-2xl bg-white/5">
                <QrCode className="w-16 h-16 mb-4 opacity-50" />
                <p className="text-lg text-center px-6 text-white mb-2">No has seleccionado un QR</p>
                <p className="text-sm text-center px-6 max-w-md">Ve a la pestaña de <b>Gestión</b> y haz clic en el icono de código QR de cualquier link de la tabla para abrir el Estudio de Diseño.</p>
                <button 
                  onClick={() => setActiveTab('gestion')}
                  className="mt-6 bg-purple-600 hover:bg-purple-500 text-white px-6 py-2.5 rounded-lg shadow-lg font-medium transition-all"
                >
                  Ir a Gestión
                </button>
              </div>
            );
          }

          const qrsOfClient = qrs.filter(q => q.client_id === selectedQr.client_id);
          const currentIndex = qrsOfClient.findIndex(q => q.id === selectedQr.id);
          
          return (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <QrStudio 
                url={`${baseUrl}/r/${selectedQr.slug}`} 
                qrName={selectedQr.name}
                qrSlug={selectedQr.slug}
                currentIndex={currentIndex}
                total={qrsOfClient.length}
                onNext={currentIndex < qrsOfClient.length - 1 ? () => setSelectedQr(qrsOfClient[currentIndex + 1]) : null}
                onPrev={currentIndex > 0 ? () => setSelectedQr(qrsOfClient[currentIndex - 1]) : null}
              />
            </div>
          );
        })()}

      </main>
    </div>
  );
}
