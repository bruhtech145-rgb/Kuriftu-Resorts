import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, auth } from '../lib/firebase';
import { collection, onSnapshot, query, orderBy, limit, addDoc, deleteDoc } from 'firebase/firestore';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell 
} from 'recharts';
import { 
  TrendingUp, Users, Calendar, DollarSign, ArrowUpRight, ArrowDownRight, 
  Sparkles, AlertCircle, Download, RefreshCcw, Database, Plus, Trash2, Tag
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, subDays } from 'date-fns';
import { doc, writeBatch } from 'firebase/firestore';
import { PricingRule } from '../types';
import { getRevenueForecast, suggestPricingRules } from '../lib/gemini';

const COLORS = ['#1c1917', '#44403c', '#78716c', '#a8a29e', '#d6d3d1'];

export default function AdminDashboard() {
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [kpis, setKpis] = useState({
    revenue: 1245000,
    occupancy: 78,
    bookings: 142,
    avgStay: 4.2
  });
  const [aiForecast, setAiForecast] = useState<any>(null);
  const [pricingRules, setPricingRules] = useState<PricingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [showAddRule, setShowAddRule] = useState(false);
  const [newRule, setNewRule] = useState<Partial<PricingRule>>({
    type: 'occupancy',
    adjustment_type: 'percentage',
    is_active: true
  });
  const [applyingAi, setApplyingAi] = useState(false);

  useEffect(() => {
    // Simulated data for charts
    const data = Array.from({ length: 7 }).map((_, i) => ({
      date: format(subDays(new Date(), 6 - i), 'MMM dd'),
      revenue: Math.floor(Math.random() * 50000) + 100000,
      bookings: Math.floor(Math.random() * 20) + 10,
      occupancy: Math.floor(Math.random() * 30) + 60
    }));
    setRevenueData(data);

    // Fetch pricing rules
    const rulesUnsubscribe = onSnapshot(collection(db, 'pricing_rules'), (snapshot) => {
      const rules = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PricingRule));
      setPricingRules(rules);
      
      // Fetch forecast whenever rules change or initially
      setLoading(true);
      getRevenueForecast(data, rules)
        .then(setAiForecast)
        .catch(err => {
          console.error("Critical forecast failure:", err);
          // Only set a minimal fallback if gemini.ts failed completely (not just quota)
          if (!aiForecast) {
            setAiForecast({
              forecast_summary: "Unable to generate AI forecast at this time.",
              predicted_revenue: 0,
              risk_factors: ["Service unavailable"],
              recommendations: [],
              pricing_optimization_tips: []
            });
          }
        })
        .finally(() => setLoading(false));
    }, (err) => handleFirestoreError(err, 'list', 'pricing_rules'));

    return () => rulesUnsubscribe();
  }, []);

  const addRule = async () => {
    try {
      await addDoc(collection(db, 'pricing_rules'), {
        ...newRule,
        created_at: new Date().toISOString()
      });
      setShowAddRule(false);
      setNewRule({ type: 'occupancy', adjustment_type: 'percentage', is_active: true });
    } catch (err) {
      handleFirestoreError(err, 'write', 'pricing_rules');
    }
  };

  const applyAiRules = async () => {
    if (!aiForecast) return;
    setApplyingAi(true);
    try {
      const suggestions = await suggestPricingRules(aiForecast, pricingRules);
      if (!Array.isArray(suggestions) || suggestions.length === 0) {
        alert("AI suggestions are currently unavailable due to high demand. Please try again later.");
        return;
      }
      const batch = writeBatch(db);
      
      suggestions.forEach((rule: any) => {
        if (!rule) return;
        const ref = doc(collection(db, 'pricing_rules'));
        batch.set(ref, {
          ...rule,
          created_at: new Date().toISOString()
        });
      });

      await batch.commit();
      alert("AI-suggested pricing rules applied successfully!");
    } catch (err) {
      console.error("Failed to apply AI rules", err);
      alert("Failed to apply AI rules. Please try again.");
    } finally {
      setApplyingAi(false);
    }
  };

  const deleteRule = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'pricing_rules', id));
    } catch (err) {
      handleFirestoreError(err, 'delete', `pricing_rules/${id}`);
    }
  };

  const seedData = async () => {
    setSeeding(true);
    try {
      const batch = writeBatch(db);
      const services = [
        { id: 'room-1', name: 'Luxury Rock Suite', category_id: 'Rooms', base_price: 12500, description: 'Hand-carved suite with panoramic views of the Lalibela mountains.', status: 'Active', duration_minutes: 1440, max_capacity: 2, tags: ['luxury', 'view'], images: ['https://picsum.photos/seed/room1/800/600'] },
        { id: 'tour-1', name: 'Lalibela Heritage Tour', category_id: 'Activities', base_price: 3500, description: 'A deep dive into the 11 rock-hewn churches with an expert guide.', status: 'Active', duration_minutes: 240, max_capacity: 10, tags: ['culture', 'history'], images: ['https://picsum.photos/seed/tour1/800/600'] },
        { id: 'spa-1', name: 'Traditional Coffee Spa', category_id: 'Wellness', base_price: 2800, description: 'A unique wellness experience using organic Ethiopian coffee beans.', status: 'Active', duration_minutes: 90, max_capacity: 1, tags: ['wellness', 'coffee'], images: ['https://picsum.photos/seed/spa1/800/600'] },
        { id: 'dining-1', name: 'Royal Ethiopian Feast', category_id: 'Dining', base_price: 4500, description: 'A multi-course traditional dinner with live cultural music.', status: 'Active', duration_minutes: 120, max_capacity: 50, tags: ['food', 'music'], images: ['https://picsum.photos/seed/dining1/800/600'] },
      ];

      services.forEach(s => {
        const ref = doc(db, 'services', s.id);
        batch.set(ref, s);
      });

      try {
        await batch.commit();
        alert("Seed data added successfully!");
      } catch (err) {
        handleFirestoreError(err, 'write', 'services (batch)');
      }
    } catch (err) {
      console.error("Seeding failed", err);
    } finally {
      setSeeding(false);
    }
  };

  const StatCard = ({ title, value, icon: Icon, trend, trendValue }: any) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white p-6 rounded-[2rem] border border-stone-100 shadow-sm"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="w-12 h-12 bg-stone-50 rounded-2xl flex items-center justify-center text-stone-900">
          <Icon size={24} />
        </div>
        <div className={clsx(
          "flex items-center gap-1 text-sm font-bold px-2 py-1 rounded-full",
          trend === 'up' ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
        )}>
          {trend === 'up' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          {trendValue}%
        </div>
      </div>
      <p className="text-stone-500 text-sm font-medium mb-1">{title}</p>
      <h3 className="text-2xl font-serif text-stone-900">{value}</h3>
    </motion.div>
  );

  return (
    <div className="space-y-10">
      {/* Debug Info */}
      <div className="bg-stone-100 p-4 rounded-xl text-xs font-mono text-stone-500">
        Admin: bruhtech145@gmail.com | Current: {auth.currentUser?.email}
      </div>
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-serif text-stone-900 mb-2">Operations Dashboard</h1>
          <p className="text-stone-500">Real-time performance metrics and AI-driven insights.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={seedData}
            disabled={seeding}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-stone-200 rounded-xl text-stone-600 hover:bg-stone-50 transition-all font-medium"
          >
            <Database size={18} />
            {seeding ? "Seeding..." : "Seed Initial Data"}
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-stone-200 rounded-xl text-stone-600 hover:bg-stone-50 transition-all font-medium">
            <Download size={18} />
            Export Report
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-stone-900 text-white rounded-xl hover:bg-stone-800 transition-all font-medium">
            <RefreshCcw size={18} />
            Refresh Data
          </button>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Revenue" value={`ETB ${kpis.revenue.toLocaleString()}`} icon={DollarSign} trend="up" trendValue="12.5" />
        <StatCard title="Avg. Occupancy" value={`${kpis.occupancy}%`} icon={Calendar} trend="up" trendValue="4.2" />
        <StatCard title="New Bookings" value={kpis.bookings} icon={Users} trend="down" trendValue="2.1" />
        <StatCard title="Avg. Stay Length" value={`${kpis.avgStay} Days`} icon={TrendingUp} trend="up" trendValue="0.8" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border border-stone-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-serif text-stone-900">Revenue Performance</h3>
            <div className="flex gap-2">
              <button className="px-3 py-1 text-xs font-bold bg-stone-100 text-stone-900 rounded-lg">7D</button>
              <button className="px-3 py-1 text-xs font-bold text-stone-400 hover:text-stone-900">30D</button>
              <button className="px-3 py-1 text-xs font-bold text-stone-400 hover:text-stone-900">YTD</button>
            </div>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1c1917" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#1c1917" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f4" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#a8a29e', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#a8a29e', fontSize: 12}} tickFormatter={(v) => `ETB ${v/1000}k`} />
                <Tooltip 
                  contentStyle={{backgroundColor: '#fff', borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                  itemStyle={{color: '#1c1917', fontWeight: 'bold'}}
                />
                <Area type="monotone" dataKey="revenue" stroke="#1c1917" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AI Insights Panel */}
        <div className="bg-stone-900 p-8 rounded-[2.5rem] text-white overflow-hidden relative">
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2 text-stone-400">
                <Sparkles size={20} />
                <span className="uppercase tracking-widest text-xs font-bold">AI Revenue Forecast</span>
              </div>
              {aiForecast?.forecast_summary?.includes("unavailable") && (
                <div className="flex items-center gap-1.5 bg-amber-500/10 text-amber-500 px-3 py-1 rounded-full border border-amber-500/20">
                  <AlertCircle size={12} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">High Demand</span>
                </div>
              )}
            </div>
            
            {loading ? (
              <div className="space-y-4 animate-pulse">
                <div className="h-8 bg-white/10 rounded-lg w-3/4" />
                <div className="h-24 bg-white/10 rounded-lg w-full" />
                <div className="space-y-2">
                  <div className="h-4 bg-white/10 rounded-lg w-full" />
                  <div className="h-4 bg-white/10 rounded-lg w-5/6" />
                </div>
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-8"
              >
                <div>
                  <h4 className="text-3xl font-serif mb-2">ETB {(aiForecast.predicted_revenue / 1000000).toFixed(1)}M</h4>
                  <p className="text-stone-400 text-sm">Predicted revenue for next 30 days</p>
                </div>

                <div className="bg-white/5 border border-white/10 p-5 rounded-2xl">
                  <p className="text-stone-300 text-sm leading-relaxed italic">
                    "{aiForecast.forecast_summary}"
                  </p>
                </div>

                <div className="space-y-4">
                  <h5 className="text-xs font-bold uppercase tracking-widest text-stone-400">Strategic Recommendations</h5>
                  {aiForecast.recommendations.map((rec: string, i: number) => (
                    <div key={i} className="flex gap-3 items-start group">
                      <div className="w-5 h-5 bg-white/10 rounded-full flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-white/20 transition-colors">
                        <span className="text-[10px] font-bold">{i + 1}</span>
                      </div>
                      <p className="text-sm text-stone-300 group-hover:text-white transition-colors">{rec}</p>
                    </div>
                  ))}
                </div>

                {aiForecast.pricing_optimization_tips && (
                  <div className="space-y-4 pt-4 border-t border-white/10">
                    <h5 className="text-xs font-bold uppercase tracking-widest text-stone-400">Pricing Optimization</h5>
                    {aiForecast.pricing_optimization_tips.map((tip: string, i: number) => (
                      <div key={i} className="flex gap-3 items-start group">
                        <Tag size={14} className="text-stone-500 mt-1" />
                        <p className="text-sm text-stone-400">{tip}</p>
                      </div>
                    ))}
                  </div>
                )}

                <button 
                  onClick={applyAiRules}
                  disabled={applyingAi || !aiForecast}
                  className="w-full bg-white text-stone-900 py-4 rounded-2xl font-bold hover:bg-stone-100 transition-all flex items-center justify-center gap-2"
                >
                  {applyingAi ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                      className="w-5 h-5 border-2 border-stone-900/20 border-t-stone-900 rounded-full"
                    />
                  ) : (
                    <>
                      <Sparkles size={18} />
                      Apply AI Pricing Rules
                    </>
                  )}
                </button>
              </motion.div>
            )}
          </div>
          {/* Decorative background */}
          <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        </div>
      </div>

      {/* Dynamic Pricing Rules Section */}
      <div className="bg-white p-8 rounded-[2.5rem] border border-stone-100 shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-2xl font-serif text-stone-900 mb-1">Dynamic Pricing Rules</h3>
            <p className="text-stone-500 text-sm">Automate price adjustments based on real-time factors.</p>
          </div>
          <button 
            onClick={() => setShowAddRule(true)}
            className="flex items-center gap-2 bg-stone-900 text-white px-6 py-3 rounded-2xl hover:bg-stone-800 transition-all font-bold"
          >
            <Plus size={18} />
            Add New Rule
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {pricingRules.map((rule) => (
              <motion.div
                key={rule.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="p-6 rounded-3xl border border-stone-100 bg-stone-50/50 relative group"
              >
                <button 
                  onClick={() => deleteRule(rule.id)}
                  className="absolute top-4 right-4 text-stone-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={18} />
                </button>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                    {rule.type === 'occupancy' ? <Users size={20} className="text-stone-600" /> : 
                     rule.type === 'seasonal' ? <Calendar size={20} className="text-stone-600" /> : 
                     <Sparkles size={20} className="text-stone-600" />}
                  </div>
                  <div>
                    <h4 className="font-bold text-stone-900">{rule.name}</h4>
                    <span className="text-[10px] uppercase tracking-widest font-bold text-stone-400">{rule.type}</span>
                  </div>
                </div>
                <p className="text-sm text-stone-500 mb-6 line-clamp-2">{rule.description}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={clsx(
                      "px-3 py-1 rounded-full text-xs font-bold",
                      rule.adjustment_value > 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                    )}>
                      {rule.adjustment_value > 0 ? '+' : ''}{rule.adjustment_value}{rule.adjustment_type === 'percentage' ? '%' : ' ETB'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={clsx(
                      "w-2 h-2 rounded-full",
                      rule.is_active ? "bg-green-500" : "bg-stone-300"
                    )} />
                    <span className="text-xs font-medium text-stone-500">{rule.is_active ? 'Active' : 'Inactive'}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {showAddRule && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white w-full max-w-lg rounded-[2.5rem] p-10 shadow-2xl"
            >
              <h3 className="text-2xl font-serif text-stone-900 mb-8">New Pricing Rule</h3>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-stone-500 mb-2">Rule Name</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-stone-900 focus:outline-none"
                    placeholder="e.g. High Occupancy Surge"
                    onChange={(e) => setNewRule({...newRule, name: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-stone-500 mb-2">Type</label>
                    <select 
                      className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-stone-900 focus:outline-none"
                      onChange={(e) => setNewRule({...newRule, type: e.target.value as any})}
                    >
                      <option value="occupancy">Occupancy</option>
                      <option value="seasonal">Seasonal</option>
                      <option value="event">Event</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-stone-500 mb-2">Condition Value</label>
                    <input 
                      type="text" 
                      className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-stone-900 focus:outline-none"
                      placeholder="e.g. 80"
                      onChange={(e) => setNewRule({...newRule, condition_value: e.target.value})}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-stone-500 mb-2">Adjustment Type</label>
                    <select 
                      className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-stone-900 focus:outline-none"
                      onChange={(e) => setNewRule({...newRule, adjustment_type: e.target.value as any})}
                    >
                      <option value="percentage">Percentage (%)</option>
                      <option value="fixed">Fixed (ETB)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-stone-500 mb-2">Value</label>
                    <input 
                      type="number" 
                      className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-stone-900 focus:outline-none"
                      placeholder="e.g. 15"
                      onChange={(e) => setNewRule({...newRule, adjustment_value: Number(e.target.value)})}
                    />
                  </div>
                </div>
                <div className="flex gap-4 pt-4">
                  <button 
                    onClick={() => setShowAddRule(false)}
                    className="flex-1 px-6 py-4 rounded-2xl border border-stone-200 text-stone-600 font-bold hover:bg-stone-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={addRule}
                    className="flex-1 px-6 py-4 rounded-2xl bg-stone-900 text-white font-bold hover:bg-stone-800 transition-all"
                  >
                    Create Rule
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}

function clsx(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
