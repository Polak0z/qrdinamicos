'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { QRCodeSVG } from 'qrcode.react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Link2, Trash2, Edit2, Download, QrCode, TrendingUp, Users } from 'lucide-react';

export default function Dashboard() {
  const [clients, setClients] = useState([]);
  const [qrs, setQrs] = useState([]);
  const [stats, setStats] = useState({ totalScans: 0, chartData: [] });
  const [selectedQr, setSelectedQr] = useState(null);

  // Form states
  const [newClientName, setNewClientName] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [qrName, setQrName] = useState('');
  const [qrSlug, setQrSlug] = useState('');
  const [targetUrl, setTargetUrl] = useState('');

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    // 1. Load Clients
    const { data: clientsData } = await supabase.from('clients').select('*').order('created_at', { ascending: false });
    setClients(clientsData || []);

    // 2. Load QRs with Scan count
    const { data: qrsData } = await supabase.from('dynamic_qrs').select(`
      *,
      clients (name)
    `).order('created_at', { ascending: false });

    // 3. Load Scans for Stats
    const { data: scansData } = await supabase.from('scan_events').select('*');
    
    // Process stats
    const totalScans = scansData ? scansData.length : 0;
    
    // Group scans by date
    const dateCounts = {};
    (scansData || []).forEach(scan => {
      const date = new Date(scan.scanned_at).toLocaleDateString();
      dateCounts[date] = (dateCounts[date] || 0) + 1;
    });
    
    const chartData = Object.keys(dateCounts).map(date => ({
      date,
      scans: dateCounts[date]
    })).slice(-7); // Last 7 days

    // Map scan counts to QRs
    const qrsWithCounts = (qrsData || []).map(qr => {
      const qrScans = (scansData || []).filter(s => s.qr_id === qr.id).length;
      return { ...qr, scansCount: qrScans };
    });

    setQrs(qrsWithCounts);
    setStats({ totalScans, chartData });
    setLoading(false);
  };

  const handleCreateClient = async (e) => {
    e.preventDefault();
    if (!newClientName) return;
    await supabase.from('clients').insert([{ name: newClientName }]);
    setNewClientName('');
    loadData();
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

    if (error) {
      alert("Error: " + error.message);
      return;
    }

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

  const downloadQR = () => {
    const svg = document.getElementById("qr-code-svg");
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.download = `QR_${selectedQr.slug}.png`;
      downloadLink.href = `${pngFile}`;
      downloadLink.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://tudominio.com';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-purple-500/30">
      
      {/* Navbar */}
      <nav className="border-b border-white/10 bg-white/5 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-blue-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <QrCode className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
              QR Nexus
            </h1>
          </div>
          <div className="text-sm font-medium px-3 py-1.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
            SaaS Admin
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        
        {/* Overview Stats */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="relative group overflow-hidden rounded-2xl bg-white/5 border border-white/10 p-6 transition-all hover:bg-white/[0.07]">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex justify-between items-start relative">
              <div>
                <p className="text-sm font-medium text-slate-400 mb-1">Total Escaneos</p>
                <h3 className="text-4xl font-bold text-white tracking-tight">{stats.totalScans}</h3>
              </div>
              <div className="p-3 bg-purple-500/10 rounded-xl text-purple-400">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>
          </div>
          
          <div className="relative group overflow-hidden rounded-2xl bg-white/5 border border-white/10 p-6 transition-all hover:bg-white/[0.07]">
            <div className="flex justify-between items-start relative">
              <div>
                <p className="text-sm font-medium text-slate-400 mb-1">QRs Activos</p>
                <h3 className="text-4xl font-bold text-white tracking-tight">{qrs.length}</h3>
              </div>
              <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400">
                <QrCode className="w-6 h-6" />
              </div>
            </div>
          </div>

          <div className="relative group overflow-hidden rounded-2xl bg-white/5 border border-white/10 p-6 transition-all hover:bg-white/[0.07]">
            <div className="flex justify-between items-start relative">
              <div>
                <p className="text-sm font-medium text-slate-400 mb-1">Clientes Registrados</p>
                <h3 className="text-4xl font-bold text-white tracking-tight">{clients.length}</h3>
              </div>
              <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400">
                <Users className="w-6 h-6" />
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Management */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Chart */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-white mb-6">Tráfico (Últimos 7 días)</h2>
              <div className="h-64 w-full">
                {stats.chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={stats.chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                      <XAxis dataKey="date" stroke="#94a3b8" axisLine={false} tickLine={false} tick={{fontSize: 12}} dy={10} />
                      <YAxis stroke="#94a3b8" axisLine={false} tickLine={false} tick={{fontSize: 12}} dx={-10} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.5)' }}
                        itemStyle={{ color: '#fff' }}
                      />
                      <Line type="monotone" dataKey="scans" stroke="#8b5cf6" strokeWidth={3} dot={{r: 4, strokeWidth: 2, fill: '#0f172a'}} activeDot={{r: 6, strokeWidth: 0, fill: '#8b5cf6'}} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-500 text-sm">
                    No hay datos suficientes
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Add Client */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h3 className="text-base font-semibold text-white mb-4">1. Nuevo Cliente</h3>
                <form onSubmit={handleCreateClient} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">Nombre del Cliente / Negocio</label>
                    <input 
                      required 
                      value={newClientName} 
                      onChange={e => setNewClientName(e.target.value)} 
                      className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all"
                      placeholder="Ej: Pollo Max"
                    />
                  </div>
                  <button type="submit" className="w-full bg-white/10 hover:bg-white/20 text-white text-sm font-medium py-2.5 rounded-xl transition-all">
                    Registrar Cliente
                  </button>
                </form>
              </div>

              {/* Add QR */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h3 className="text-base font-semibold text-white mb-4">2. Generar Link QR</h3>
                <form onSubmit={handleCreateQr} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Cliente</label>
                      <select 
                        required 
                        value={selectedClientId} 
                        onChange={e => setSelectedClientId(e.target.value)}
                        className="w-full bg-black/20 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all appearance-none"
                      >
                        <option value="" className="bg-slate-900">Seleccionar...</option>
                        {clients.map(c => <option key={c.id} value={c.id} className="bg-slate-900">{c.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Identificador</label>
                      <input 
                        required 
                        value={qrName} 
                        onChange={e => setQrName(e.target.value)} 
                        className="w-full bg-black/20 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                        placeholder="Ej: Mesa 1"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Slug Único</label>
                      <input 
                        required 
                        value={qrSlug} 
                        onChange={e => setQrSlug(e.target.value)} 
                        className="w-full bg-black/20 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                        placeholder="Ej: pol-m1"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">URL de Destino</label>
                      <input 
                        required 
                        type="url"
                        value={targetUrl} 
                        onChange={e => setTargetUrl(e.target.value)} 
                        className="w-full bg-black/20 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                        placeholder="https://..."
                      />
                    </div>
                  </div>
                  <button type="submit" className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white text-sm font-medium py-2.5 rounded-xl transition-all shadow-lg shadow-purple-500/25">
                    Crear Link Dinámico
                  </button>
                </form>
              </div>
            </div>

            {/* List QRs */}
            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
              <div className="p-6 border-b border-white/10">
                <h3 className="text-base font-semibold text-white">Links Activos</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-black/20 text-slate-400">
                    <tr>
                      <th className="px-6 py-4 font-medium">Nombre</th>
                      <th className="px-6 py-4 font-medium">Link Dinámico</th>
                      <th className="px-6 py-4 font-medium">Destino Actual</th>
                      <th className="px-6 py-4 font-medium">Escaneos</th>
                      <th className="px-6 py-4 font-medium text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {loading ? (
                      <tr><td colSpan="5" className="px-6 py-8 text-center text-slate-500">Cargando...</td></tr>
                    ) : qrs.length === 0 ? (
                      <tr><td colSpan="5" className="px-6 py-8 text-center text-slate-500">No hay códigos QR creados.</td></tr>
                    ) : qrs.map(qr => (
                      <tr key={qr.id} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="px-6 py-4">
                          <div className="font-medium text-slate-200">{qr.name}</div>
                          <div className="text-xs text-slate-500">{qr.clients?.name}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-purple-500/10 text-purple-400 text-xs font-medium border border-purple-500/20">
                            /r/{qr.slug}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 max-w-[200px]">
                            <Link2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            <span className="truncate text-slate-400">{qr.target_url}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-medium text-slate-300">
                          {qr.scansCount}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => setSelectedQr(qr)}
                              className="p-1.5 text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors"
                              title="Generar Imagen QR"
                            >
                              <QrCode className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleUpdateUrl(qr.id, qr.target_url)}
                              className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                              title="Editar URL de destino"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleDeleteQr(qr.id)}
                              className="p-1.5 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                              title="Eliminar QR"
                            >
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

          {/* Right Column: Visual QR Generator */}
          <div className="lg:col-span-1">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 sticky top-24">
              <h3 className="text-base font-semibold text-white mb-6">Generador de Código QR</h3>
              
              {selectedQr ? (
                <div className="flex flex-col items-center">
                  <div className="bg-white p-6 rounded-2xl shadow-xl mb-6 relative group">
                    <QRCodeSVG
                      id="qr-code-svg"
                      value={`${baseUrl}/r/${selectedQr.slug}`}
                      size={200}
                      level={"H"}
                      includeMargin={false}
                      fgColor={"#000000"}
                      bgColor={"#ffffff"}
                    />
                    <div className="absolute inset-0 ring-1 ring-inset ring-black/10 rounded-2xl pointer-events-none" />
                  </div>
                  
                  <div className="text-center mb-6 w-full">
                    <h4 className="text-white font-medium text-lg">{selectedQr.clients?.name}</h4>
                    <p className="text-slate-400 text-sm">{selectedQr.name}</p>
                    
                    <div className="mt-4 p-3 bg-black/20 rounded-xl border border-white/5 flex items-center justify-between gap-3">
                      <span className="text-xs text-slate-400 truncate text-left">{`${baseUrl}/r/${selectedQr.slug}`}</span>
                    </div>
                  </div>

                  <button 
                    onClick={downloadQR}
                    className="w-full flex items-center justify-center gap-2 bg-white text-slate-900 hover:bg-slate-100 font-semibold py-3 px-4 rounded-xl transition-all"
                  >
                    <Download className="w-4 h-4" />
                    Descargar PNG
                  </button>
                  <p className="text-xs text-slate-500 text-center mt-4 px-4">
                    Este QR apuntará siempre al link dinámico. Puedes cambiar la URL de destino en el panel sin volver a imprimir el QR.
                  </p>
                </div>
              ) : (
                <div className="py-20 flex flex-col items-center justify-center text-slate-500 border-2 border-dashed border-white/10 rounded-2xl">
                  <QrCode className="w-12 h-12 mb-4 opacity-50" />
                  <p className="text-sm text-center px-6">Selecciona un link de la tabla para generar su código QR listo para imprimir.</p>
                </div>
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
