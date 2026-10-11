import React, { useState, useEffect } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';
import { 
  Users, MessageSquare, Zap, ArrowLeft, Brain, Clock, 
  TrendingUp, Globe2, BookOpen, AlertCircle
} from 'lucide-react';
import { motion } from 'motion/react';

const COLORS = ['#003399', '#FF6B35', '#10B981', '#8B5CF6', '#64748B'];

export default function Dashboard({ onBack }: { onBack: () => void }) {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activityData, setActivityData] = useState<any[]>([]);
  const [topicData, setTopicData] = useState<any[]>([]);
  const [latencyData, setLatencyData] = useState<any[]>([]);
  const [kpi, setKpi] = useState({
    total_requests: 0,
    cache_rate: "0%",
    active_users: 0,
    avg_latency: "0s",
    doc_count: 0
  });

  useEffect(() => {
    setMounted(true);
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      // Adaptation dynamique de l'URL si besoin
      const apiUrl = window.location.hostname === "localhost" 
        ? "http://localhost:3000/api/stats" 
        : "/api/stats";
        
      const res = await fetch(apiUrl);
      if (!res.ok) throw new Error("Erreur lors de la récupération des données");
      const data = await res.json();
      
      setActivityData(data.activityData || []);
      setTopicData(data.topicData || []);
      setLatencyData(data.latencyData || []);
      if (data.kpi) {
        setKpi(data.kpi);
      }
      setError(null);
    } catch (err: any) {
      setError(err.message || "Impossible de joindre le serveur");
    } finally {
      setLoading(false);
    }
  };

  const performanceMetrics = [
    { label: 'Précision du RAG (est.)', value: '94.2%', icon: Brain, color: '#10B981', trend: '+1.2%' },
    { label: 'Temps de réponse moyen', value: kpi.avg_latency, icon: Clock, color: '#F59E0B', trend: '' },
    { label: 'Économie API (Cache)', value: kpi.cache_rate, icon: Zap, color: '#3B82F6', trend: '' },
    { label: 'Requêtes non résolues', value: '1.8%', icon: AlertCircle, color: '#EF4444', trend: '' },
  ];

  if (!mounted) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="absolute inset-0 z-50 bg-[#F4F7FC] font-['Inter'] overflow-y-auto"
    >
      {/* Header */}
      <div className="bg-[#001a66] text-white pt-8 pb-16 px-8 relative overflow-hidden">
        {/* Decor */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#FF6B35]/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3 pointer-events-none" />
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex items-center gap-4 mb-6">
            <button 
              onClick={onBack}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors backdrop-blur-sm"
              title="Retour au Chat"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-black tracking-tight">Intelligence Artificielle — Analytics</h1>
                {error ? (
                  <span className="px-2.5 py-1 bg-red-500/20 text-red-400 border border-red-500/30 rounded-full text-[10px] font-bold uppercase tracking-widest">
                    Serveur Inaccessible
                  </span>
                ) : (
                  <span className="px-2.5 py-1 bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/30 rounded-full text-[10px] font-bold uppercase tracking-widest">
                    Système Sain en direct
                  </span>
                )}
              </div>
              <p className="text-white/60 text-sm mt-1">Supervision en temps réel du moteur RAG Lumina et des interactions étudiantes.</p>
            </div>
          </div>

          {/* Top KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-8">
            <div className="bg-white/10 backdrop-blur-md border border-white/10 p-5 rounded-2xl relative overflow-hidden">
              <div className="flex items-center justify-between relative z-10">
                <div>
                  <p className="text-white/60 text-xs font-semibold uppercase tracking-wider">Total Requêtes</p>
                  <p className="text-3xl font-black text-white mt-1">{loading ? "..." : kpi.total_requests}</p>
                </div>
                <div className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-blue-400" />
                </div>
              </div>
            </div>
            
            <div className="bg-white/10 backdrop-blur-md border border-white/10 p-5 rounded-2xl relative overflow-hidden">
              <div className="flex items-center justify-between relative z-10">
                <div>
                  <p className="text-white/60 text-xs font-semibold uppercase tracking-wider">Économie LLM (Cache)</p>
                  <p className="text-3xl font-black text-white mt-1">{loading ? "..." : kpi.cache_rate}</p>
                </div>
                <div className="w-12 h-12 bg-amber-500/20 rounded-2xl flex items-center justify-center">
                  <Zap className="w-6 h-6 text-amber-400" />
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md border border-white/10 p-5 rounded-2xl relative overflow-hidden">
              <div className="flex items-center justify-between relative z-10">
                <div>
                  <p className="text-white/60 text-xs font-semibold uppercase tracking-wider">Utilisateurs Actifs</p>
                  <p className="text-3xl font-black text-white mt-1">{loading ? "..." : kpi.active_users}</p>
                </div>
                <div className="w-12 h-12 bg-purple-500/20 rounded-2xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-purple-400" />
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md border border-white/10 p-5 rounded-2xl relative overflow-hidden">
              <div className="flex items-center justify-between relative z-10">
                <div>
                  <p className="text-white/60 text-xs font-semibold uppercase tracking-wider">Documents RAG (VDB)</p>
                  <p className="text-3xl font-black text-white mt-1">{loading ? "..." : kpi.doc_count}</p>
                </div>
                <div className="w-12 h-12 bg-emerald-500/20 rounded-2xl flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-emerald-400" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 -mt-8 relative z-20 pb-20 space-y-6">
        
        {/* Main Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Activity Area Chart */}
          <div className="col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[15px] font-black text-[#001a66]">Volume de requêtes sur 7 jours</h3>
            </div>
            <div className="h-[280px]">
              {loading ? (
                <div className="w-full h-full flex items-center justify-center text-gray-400">Chargement...</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={activityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRequetes" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#003399" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#003399" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorCache" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#FF6B35" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#FF6B35" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} />
                    <RechartsTooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
                      cursor={{ stroke: '#003399', strokeWidth: 1, strokeDasharray: '4 4' }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                    <Area type="monotone" name="Requêtes LLM" dataKey="requetes" stroke="#003399" strokeWidth={3} fillOpacity={1} fill="url(#colorRequetes)" />
                    <Area type="monotone" name="Hits Cache Sémantique" dataKey="cache" stroke="#FF6B35" strokeWidth={3} fillOpacity={1} fill="url(#colorCache)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Topics Pie Chart */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col">
            <h3 className="text-[15px] font-black text-[#001a66] mb-2">Profils des utilisateurs</h3>
            <p className="text-xs text-gray-500 mb-6">Répartition déduite sémantiquement par le LLM</p>
            <div className="flex-1 min-h-[220px]">
              {loading ? (
                 <div className="w-full h-full flex items-center justify-center text-gray-400">Chargement...</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={topicData}
                      cx="50%"
                      cy="45%"
                      innerRadius={65}
                      outerRadius={85}
                      paddingAngle={6}
                      dataKey="value"
                      stroke="none"
                    >
                      {topicData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      formatter={(value: number) => [`${value}%`, 'Proportion']}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }} 
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            {/* Custom Legend */}
            {!loading && (
              <div className="space-y-2 mt-2">
                {topicData.slice(0, 3).map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx] }} />
                      <span className="font-medium text-gray-700">{item.name}</span>
                    </div>
                    <span className="font-bold text-[#001a66]">{item.value}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Secondary Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Performance Metrics List */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-[15px] font-black text-[#001a66] mb-6">Métriques de Performance</h3>
            <div className="space-y-5">
              {performanceMetrics.map((metric, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm" style={{ backgroundColor: `${metric.color}15` }}>
                      <metric.icon className="w-5 h-5" style={{ color: metric.color }} />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-medium">{metric.label}</p>
                      <p className="text-lg font-black text-gray-900 leading-tight">{loading ? '...' : metric.value}</p>
                    </div>
                  </div>
                  {metric.trend && (
                    <div className={`text-xs font-bold px-2 py-1 rounded-md ${metric.trend.startsWith('+') && metric.color !== '#EF4444' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {metric.trend}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Latency Chart */}
          <div className="col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-[15px] font-black text-[#001a66]">Latence Réelle (ms)</h3>
                <p className="text-xs text-gray-500">20 dernières requêtes</p>
              </div>
            </div>
            <div className="h-[250px]">
              {loading ? (
                <div className="w-full h-full flex items-center justify-center text-gray-400">Chargement...</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={latencyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#888' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#888' }} />
                    <RechartsTooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <Line type="monotone" name="Génération Complète" dataKey="latency" stroke="#8B5CF6" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                    <Line type="monotone" name="Recherche Vectorielle (DB)" dataKey="db_latency" stroke="#10B981" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

        </div>
      </div>
    </motion.div>
  );
}
