import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Activity, Users, MessageSquare, Zap, ArrowLeft } from 'lucide-react';

const mockActivityData = [
  { name: 'Lun', questions: 120, cacheHits: 85 },
  { name: 'Mar', questions: 150, cacheHits: 110 },
  { name: 'Mer', questions: 180, cacheHits: 140 },
  { name: 'Jeu', questions: 145, cacheHits: 100 },
  { name: 'Ven', questions: 210, cacheHits: 175 },
  { name: 'Sam', questions: 90, cacheHits: 50 },
  { name: 'Dim', questions: 75, cacheHits: 40 },
];

const profileData = [
  { name: 'Étudiants', value: 750 },
  { name: 'Établissements', value: 150 },
  { name: 'Associations', value: 70 },
];

const COLORS = ['#1E4FD8', '#FF6B35', '#00C49F'];

export default function Dashboard({ onBack }: { onBack: () => void }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="p-8 bg-gray-50 min-h-screen font-['Inter'] absolute inset-0 z-50 overflow-auto">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 bg-white rounded-full border border-gray-200 hover:bg-gray-100 transition-colors shadow-sm"
            title="Retour au Chat"
          >
            <ArrowLeft className="w-6 h-6 text-[#003399]" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-[#003399]">Dashboard Administrateur</h1>
            <p className="text-gray-600 mt-2">Suivi des performances et de l'utilisation de l'assistant Lumina</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Requêtes (7j)</p>
                <p className="text-2xl font-bold text-[#003399] mt-1">970</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Taux de Succès Cache</p>
                <p className="text-2xl font-bold text-green-600 mt-1">72.1%</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center">
                <Zap className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Temps de Réponse</p>
                <p className="text-2xl font-bold text-orange-600 mt-1">1.2s</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center">
                <Activity className="w-5 h-5 text-orange-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Utilisateurs Uniques</p>
                <p className="text-2xl font-bold text-purple-600 mt-1">452</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm col-span-2">
            <h3 className="text-lg font-bold text-gray-800 mb-6">Activité Hebdomadaire & Cache Sémantique</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mockActivityData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip cursor={{fill: 'transparent'}} />
                  <Legend />
                  <Bar dataKey="questions" name="Requêtes LLM" fill="#1E4FD8" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="cacheHits" name="Hits Cache Sémantique" fill="#FF6B35" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="text-lg font-bold text-gray-800 mb-6">Répartition par Profil</h3>
            <div className="h-[300px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={profileData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {profileData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
