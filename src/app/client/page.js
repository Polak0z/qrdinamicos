'use client';
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Activity, QrCode, LogOut, Calendar, TrendingUp, Lock } from 'lucide-react';

export default function ClientPortal() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [clientAuth, setClientAuth] = useState(null);
  const [loginError, setLoginError] = useState('');
  
  const [qrs, setQrs] = useState([]);
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [selectedQr, setSelectedQr] = useState('all');
  const [timeFilter, setTimeFilter] = useState('all'); // all, today, week, month, year, custom
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  // Check existing session
  useEffect(() => {
    const savedId = localStorage.getItem('qr_nexus_client_id');
    const savedName = localStorage.getItem('qr_nexus_client_name');
    if (savedId && savedName) {
      setClientAuth({ id: savedId, name: savedName });
    }
  }, []);

  // Fetch Data when authenticated
  useEffect(() => {
    if (clientAuth) {
      fetchClientData();
    }
  }, [clientAuth]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('username', username.toLowerCase())
        .eq('password', password)
        .single();

      if (error || !data) {
        setLoginError('Usuario o contraseña incorrectos.');
      } else {
        setClientAuth({ id: data.id, name: data.name });
        localStorage.setItem('qr_nexus_client_id', data.id);
        localStorage.setItem('qr_nexus_client_name', data.name);
      }
    } catch (err) {
      setLoginError('Error de conexión.');
    }
    setLoading(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('qr_nexus_client_id');
    localStorage.removeItem('qr_nexus_client_name');
    setClientAuth(null);
    setQrs([]);
    setScans([]);
    setUsername('');
    setPassword('');
  };

  const fetchClientData = async () => {
    setLoading(true);
    // Fetch QRs
    const { data: qrsData } = await supabase
      .from('dynamic_qrs')
      .select('*')
      .eq('client_id', clientAuth.id);
    
    setQrs(qrsData || []);

    if (qrsData && qrsData.length > 0) {
      const qrIds = qrsData.map(q => q.id);
      // Fetch Scans for these QRs
      const { data: scansData } = await supabase
        .from('scan_events')
        .select('*')
        .in('qr_id', qrIds);
      
      setScans(scansData || []);
    }
    setLoading(false);
  };

  // --- Derived Analytics ---
  const { filteredScans, dailyChartData, hourlyChartData } = useMemo(() => {
    let filtered = scans;

    // 1. QR Filter
    if (selectedQr !== 'all') {
      filtered = filtered.filter(s => s.qr_id === selectedQr);
    }

    // 2. Time Filter
    const now = new Date();
    if (timeFilter !== 'all') {
      filtered = filtered.filter(s => {
        const scanDate = new Date(s.scanned_at);
        if (timeFilter === 'today') {
          return scanDate.toDateString() === now.toDateString();
        }
        if (timeFilter === 'week') {
          const oneWeekAgo = new Date();
          oneWeekAgo.setDate(now.getDate() - 7);
          return scanDate >= oneWeekAgo;
        }
        if (timeFilter === 'month') {
          return scanDate.getMonth() === now.getMonth() && scanDate.getFullYear() === now.getFullYear();
        }
        if (timeFilter === 'year') {
          return scanDate.getFullYear() === now.getFullYear();
        }
        if (timeFilter === 'custom' && customStart && customEnd) {
          const start = new Date(customStart);
          start.setHours(0,0,0,0);
          const end = new Date(customEnd);
          end.setHours(23,59,59,999);
          return scanDate >= start && scanDate <= end;
        }
        return true;
      });
    }

    // Prepare Daily Chart (Last 14 days or based on range)
    const dateCounts = {};
    filtered.forEach(scan => {
      const date = new Date(scan.scanned_at).toLocaleDateString();
      dateCounts[date] = (dateCounts[date] || 0) + 1;
    });
    
    // Sort dates
    let daily = Object.keys(dateCounts).map(date => ({
      date,
      scans: dateCounts[date],
      timestamp: new Date(date).getTime()
    })).sort((a,b) => a.timestamp - b.timestamp);

    // If 'all' or 'week', maybe limit to recent for readability if too large, but sorting is enough.
    if (timeFilter === 'all' && daily.length > 30) {
      daily = daily.slice(-30); // Show last 30 active days
    }

    // Prepare Hourly Chart
    const hourCounts = Array(24).fill(0);
    filtered.forEach(scan => {
      const hour = new Date(scan.scanned_at).getHours();
      hourCounts[hour]++;
    });
    const hourly = hourCounts.map((count, hour) => ({
      hour: `${hour}:00`,
      scans: count
    }));

    return { filteredScans: filtered, dailyChartData: daily, hourlyChartData: hourly };
  }, [scans, selectedQr, timeFilter, customStart, customEnd]);


  if (!clientAuth) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 selection:bg-purple-500/30">
        <div className="bg-white/5 border border-white/10 p-8 rounded-3xl w-full max-w-md shadow-2xl backdrop-blur-xl">
          <div className="flex justify-center mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-purple-600 to-blue-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Lock className="w-6 h-6 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white text-center mb-2">Portal de Clientes</h1>
          <p className="text-slate-400 text-sm text-center mb-8">Ingresa tus credenciales para ver el rendimiento de tus códigos QR.</p>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Usuario</label>
              <input 
                type="text" 
                required
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:ring-2 focus:ring-purple-500/50 outline-none transition-all"
                placeholder="Ej. zara_admin"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Contraseña</label>
              <input 
                type="password" 
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:ring-2 focus:ring-purple-500/50 outline-none transition-all"
                placeholder="••••••••"
              />
            </div>
            {loginError && <p className="text-red-400 text-sm font-medium text-center">{loginError}</p>}
            <button 
              type="submit" 
              disabled={loading}
              className="w-full mt-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-medium py-3 rounded-xl shadow-lg transition-all disabled:opacity-50"
            >
              {loading ? 'Verificando...' : 'Ingresar al Portal'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-purple-500/30">
      
      {/* Navbar */}
      <nav className="border-b border-white/10 bg-white/5 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-blue-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-lg sm:text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
              Métricas - {clientAuth.name}
            </h1>
          </div>
          
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg transition-all text-sm font-medium"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Cerrar Sesión</span>
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        
        {/* Filters Panel */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-4">
            <h2 className="text-white font-semibold flex items-center gap-2">
              <Calendar className="w-5 h-5 text-purple-400" /> 
              Filtros de Análisis
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* QR Filter */}
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Código QR Específico</label>
              <select 
                value={selectedQr} 
                onChange={(e) => setSelectedQr(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-sm text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 outline-none"
              >
                <option value="all">Resumen General (Todos)</option>
                {qrs.map(q => <option key={q.id} value={q.id}>{q.name}</option>)}
              </select>
            </div>

            {/* Time Filter */}
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Rango de Tiempo</label>
              <select 
                value={timeFilter} 
                onChange={(e) => setTimeFilter(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-sm text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 outline-none"
              >
                <option value="all">Historico Completo</option>
                <option value="today">Solo Hoy</option>
                <option value="week">Últimos 7 días</option>
                <option value="month">Este Mes</option>
                <option value="year">Este Año</option>
                <option value="custom">Rango Personalizado...</option>
              </select>
            </div>

            {/* Custom Range Inputs */}
            {timeFilter === 'custom' && (
              <>
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">Desde</label>
                  <input 
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-sm text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">Hasta</label>
                  <input 
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-sm text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Global Metric */}
        <div className="bg-gradient-to-br from-purple-900/40 to-blue-900/40 border border-purple-500/20 rounded-2xl p-6 sm:p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <TrendingUp className="w-32 h-32" />
          </div>
          <div className="relative z-10">
            <p className="text-purple-300 text-sm font-medium mb-2 uppercase tracking-widest">Total Escaneos (Rango Seleccionado)</p>
            <h2 className="text-6xl sm:text-7xl font-black text-white drop-shadow-lg">{filteredScans.length}</h2>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Daily Chart */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-6">
            <h3 className="text-lg font-semibold text-white mb-6">Tráfico por Fechas</h3>
            <div className="h-72 w-full">
              {dailyChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailyChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                    <XAxis dataKey="date" stroke="#94a3b8" axisLine={false} tickLine={false} tick={{fontSize: 12}} dy={10} />
                    <YAxis stroke="#94a3b8" axisLine={false} tickLine={false} tick={{fontSize: 12}} dx={-10} allowDecimals={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} itemStyle={{ color: '#fff' }} />
                    <Line type="monotone" dataKey="scans" name="Escaneos" stroke="#8b5cf6" strokeWidth={3} dot={{r: 4, fill: '#0f172a'}} activeDot={{r: 6, fill: '#8b5cf6'}} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-500 text-sm">Sin datos para mostrar en este rango</div>
              )}
            </div>
          </div>

          {/* Hourly Chart */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-6">
            <h3 className="text-lg font-semibold text-white mb-6">Tráfico por Horas del Día</h3>
            <div className="h-72 w-full">
              {hourlyChartData.some(d => d.scans > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hourlyChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                    <XAxis dataKey="hour" stroke="#94a3b8" axisLine={false} tickLine={false} tick={{fontSize: 10}} dy={10} interval={2} />
                    <YAxis stroke="#94a3b8" axisLine={false} tickLine={false} tick={{fontSize: 12}} dx={-10} allowDecimals={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} itemStyle={{ color: '#fff' }} cursor={{fill: '#ffffff05'}} />
                    <Bar dataKey="scans" name="Escaneos" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-500 text-sm">Sin datos para mostrar en este rango</div>
              )}
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
