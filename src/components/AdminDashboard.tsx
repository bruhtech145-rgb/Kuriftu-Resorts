import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  Calendar, 
  MapPin, 
  TrendingUp, 
  Bell, 
  Search, 
  LogOut, 
  Settings, 
  ChevronRight, 
  LayoutDashboard, 
  Hotel, 
  Utensils, 
  Waves,
  Menu,
  X,
  UserCircle,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Clock,
  Globe,
  RefreshCw
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area 
} from 'recharts';
import { supabase } from '../lib/supabase';

interface AdminDashboardProps {
  onLogout: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('pricing-dashboard');
  const [guests, setGuests] = useState<any[]>([]);
  const [loadingGuests, setLoadingGuests] = useState(false);

  // New state variables for dashboard data
  const [trendData, setTrendData] = useState<any[]>([]);
  const [pricingApprovals, setPricingApprovals] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [resortApprovals, setResortApprovals] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoadingData(true);
    try {
      const [trendsRes, approvalsRes, recsRes, resortsRes] = await Promise.all([
        supabase.from('price_trends').select('*').order('order_idx', { ascending: true }),
        supabase.from('pricing_approvals').select('*').order('target_date', { ascending: true }),
        supabase.from('ai_recommendations').select('*'),
        supabase.from('resort_approvals').select('*')
      ]);

      if (trendsRes.data) setTrendData(trendsRes.data.map(d => ({ name: d.date_name, current: d.current_price, suggested: d.suggested_price })));
      if (approvalsRes.data) setPricingApprovals(approvalsRes.data.map(d => ({ id: d.id, roomType: d.room_type, date: d.target_date, current: d.current_price, suggested: d.suggested_price, change: d.change_percent, status: d.status })));
      if (recsRes.data) setRecommendations(recsRes.data.map(d => ({ type: d.room_type, reason: d.reason, current: d.current_price, suggested: d.suggested_price, change: d.change_percent, confidence: d.confidence })));
      if (resortsRes.data) setResortApprovals(resortsRes.data.map(d => ({ id: d.id, resort: d.resort_name, occupancy: d.occupancy, currentRate: d.current_rate, suggestedRate: d.suggested_rate, change: d.change_percent, reason: d.reason, status: d.status })));
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'guests') {
      fetchGuests();
    }
  }, [activeTab]);

  const fetchGuests = async () => {
    setLoadingGuests(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setGuests(data || []);
    } catch (error) {
      console.error('Error fetching guests from Supabase:', error);
    } finally {
      setLoadingGuests(false);
    }
  };

  const pricingStats = [
    { label: 'Current Avg Price', value: '$275', change: '+8.2%', icon: <TrendingUp size={24} />, color: 'bg-blue-500' },
    { label: 'AI Suggested Price', value: '$298', change: '+12.5%', icon: <Zap size={24} />, color: 'bg-amber-500' },
    { label: 'Occupancy Rate', value: '87%', change: '+5.3%', icon: <Hotel size={24} />, color: 'bg-green-500' },
    { label: 'Revenue Projection', value: '$45.2K', change: '+15.7%', icon: <TrendingUp size={24} />, color: 'bg-purple-500' },
  ];

  const calendarDays = Array.from({ length: 18 }, (_, i) => {
    const day = i + 1;
    let price = 250;
    let discount = null;
    let demand = 'Medium Demand';
    
    if ([1, 2, 3, 6, 7, 8, 9].includes(day)) {
      price = 200;
      discount = '15% OFF';
      demand = 'Low Demand';
    } else if ([4, 5, 11, 12, 18].includes(day)) {
      price = 320;
      demand = 'High Demand';
    }
    
    return { day, price, discount, demand };
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    onLogout();
  };

  const renderPricingDashboard = () => (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {pricingStats.map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 ${stat.color} text-white rounded-2xl flex items-center justify-center shadow-lg`}>
                {stat.icon}
              </div>
              <span className="text-xs font-bold text-green-500 bg-green-50 px-2 py-1 rounded-lg">
                {stat.change}
              </span>
            </div>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
            <h3 className="text-3xl font-bold text-slate-900">{stat.value}</h3>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-bold text-slate-900">Price Trends Overview</h3>
              <p className="text-sm text-slate-400">Current vs AI-suggested pricing over time</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-bold">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-[#0066ff] rounded-full" />
                <span>Current Price</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-amber-500 rounded-full" />
                <span>AI Suggested</span>
              </div>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="colorCurrent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0066ff" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#0066ff" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorSuggested" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                />
                <Area type="monotone" dataKey="current" stroke="#0066ff" strokeWidth={3} fillOpacity={1} fill="url(#colorCurrent)" />
                <Area type="monotone" dataKey="suggested" stroke="#f59e0b" strokeWidth={3} fillOpacity={1} fill="url(#colorSuggested)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
          <h3 className="text-xl font-bold text-slate-900 mb-6">Quick Insights</h3>
          <div className="space-y-6">
            <div className="p-4 bg-blue-50 rounded-2xl">
              <div className="flex items-center gap-3 mb-2 text-blue-600">
                <Zap size={20} />
                <span className="font-bold text-sm">Revenue Opportunity</span>
              </div>
              <p className="text-sm text-blue-900/70 leading-relaxed">
                Accepting AI suggestions could increase revenue by <span className="font-bold">$8.5K</span> this week
              </p>
            </div>
            <div className="p-4 bg-amber-50 rounded-2xl">
              <div className="flex items-center gap-3 mb-2 text-amber-600">
                <AlertCircle size={20} />
                <span className="font-bold text-sm">High Demand Period</span>
              </div>
              <p className="text-sm text-amber-900/70 leading-relaxed">
                Weekend (Apr 5-7) shows <span className="font-bold">156%</span> higher demand than average
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-2xl text-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Avg. Window</p>
                <p className="text-lg font-bold text-slate-900">14 days</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl text-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Comp. Price</p>
                <p className="text-lg font-bold text-slate-900">$285</p>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-slate-900 text-white rounded-2xl">
              <div className="flex items-center gap-3">
                <Globe size={20} className="text-[#0066ff]" />
                <span className="font-bold text-sm">Market Demand</span>
              </div>
              <span className="bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded-lg">High</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-xl font-bold text-slate-900">AI Pricing Recommendations</h3>
            <p className="text-sm text-slate-400">Machine learning powered suggestions based on demand forecasting</p>
          </div>
          <button className="text-[#0066ff] font-bold text-sm hover:underline">View All Suggestions</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {recommendations.map((rec, i) => (
            <div key={i} className="p-6 bg-slate-50 rounded-3xl border border-slate-100 hover:border-[#0066ff]/30 transition-all group">
              <h4 className="font-bold text-slate-900 mb-1">{rec.type}</h4>
              <p className="text-xs text-slate-400 mb-4">{rec.reason}</p>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Current</p>
                  <p className="text-lg font-bold text-slate-900">${rec.current}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Suggested</p>
                  <p className="text-lg font-bold text-[#0066ff]">${rec.suggested}</p>
                </div>
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                <div className="flex items-center gap-1 text-green-500 font-bold text-xs">
                  <ArrowUpRight size={14} /> {rec.change}
                </div>
                <div className="text-[10px] font-bold text-slate-400">
                  Confidence: <span className="text-slate-900">{rec.confidence}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderPricingApprovals = () => (
    <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
      <div className="p-8 border-b border-slate-50 flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-slate-900">Pricing Approvals</h3>
          <p className="text-sm text-slate-400">5 pending approvals</p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50">
              <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Room Type</th>
              <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Date</th>
              <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Current Price</th>
              <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Suggested Price</th>
              <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Adjusted Price</th>
              <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Change</th>
              <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Status</th>
              <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {pricingApprovals.map((approval) => (
              <tr key={approval.id} className="hover:bg-slate-50/50 transition-colors group">
                <td className="px-8 py-6 font-bold text-slate-900">{approval.roomType}</td>
                <td className="px-8 py-6 text-slate-500 font-medium">{approval.date}</td>
                <td className="px-8 py-6 font-bold text-slate-400">${approval.current}</td>
                <td className="px-8 py-6 font-bold text-slate-900">${approval.suggested}</td>
                <td className="px-8 py-6">
                  <input 
                    type="text" 
                    defaultValue={approval.suggested} 
                    className="w-20 px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-900 focus:outline-none focus:border-[#0066ff]"
                  />
                </td>
                <td className="px-8 py-6">
                  <span className={`font-bold ${approval.change.startsWith('+') ? 'text-green-500' : 'text-red-500'}`}>
                    {approval.change}
                  </span>
                </td>
                <td className="px-8 py-6">
                  <span className="px-3 py-1 bg-amber-100 text-amber-600 rounded-full text-[10px] font-bold uppercase tracking-wider">
                    {approval.status}
                  </span>
                </td>
                <td className="px-8 py-6 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button className="p-2 text-green-500 hover:bg-green-50 rounded-xl transition-colors">
                      <CheckCircle2 size={20} />
                    </button>
                    <button className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors">
                      <XCircle size={20} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderPricingCalendar = () => (
    <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h3 className="text-xl font-bold text-slate-900">Pricing Calendar</h3>
          <p className="text-sm text-slate-400">Visual overview of dynamic pricing by date</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest">
            <div className="w-3 h-3 bg-red-500 rounded-full" />
            <span>High Demand</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest">
            <div className="w-3 h-3 bg-amber-500 rounded-full" />
            <span>Medium Demand</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest">
            <div className="w-3 h-3 bg-green-500 rounded-full" />
            <span>Low Demand</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest">
            <div className="w-3 h-3 bg-blue-500 rounded-full" />
            <span>Discount Applied</span>
          </div>
        </div>
      </div>

      <div className="mb-8 flex items-center justify-between">
        <h4 className="text-2xl font-bold text-slate-900">April 2026</h4>
        <div className="flex gap-2">
          <button className="p-2 hover:bg-slate-50 rounded-xl border border-slate-100 transition-colors">
            <ChevronRight size={20} className="rotate-180" />
          </button>
          <button className="p-2 hover:bg-slate-50 rounded-xl border border-slate-100 transition-colors">
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px bg-slate-100 border border-slate-100 rounded-3xl overflow-hidden">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="bg-slate-50 p-4 text-center text-xs font-bold text-slate-400 uppercase tracking-widest">
            {day}
          </div>
        ))}
        {calendarDays.map((day, i) => (
          <div key={i} className="bg-white p-6 min-h-[120px] hover:bg-slate-50 transition-colors group cursor-pointer relative">
            <span className="text-sm font-bold text-slate-400 group-hover:text-slate-900 transition-colors">{day.day}</span>
            <div className="mt-4">
              <p className="text-xl font-bold text-slate-900">${day.price}</p>
              {day.discount && (
                <p className="text-[10px] font-bold text-blue-500 mt-1">{day.discount}</p>
              )}
            </div>
            <div className={`absolute bottom-4 right-4 w-2 h-2 rounded-full ${
              day.demand === 'High Demand' ? 'bg-red-500' : 
              day.demand === 'Medium Demand' ? 'bg-amber-500' : 'bg-green-500'
            }`} />
          </div>
        ))}
        {/* Fill remaining empty cells */}
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={`empty-${i}`} className="bg-slate-50/30 p-6 min-h-[120px]" />
        ))}
      </div>
    </div>
  );

  const renderResortsApprovals = () => (
    <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
      <div className="p-8 border-b border-slate-50 flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-slate-900">Resort Rate Approvals</h3>
          <p className="text-sm text-slate-400">AI-driven adjustments based on occupancy and time</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-blue-100 text-blue-600 rounded-full text-[10px] font-bold uppercase tracking-wider">
            4 Pending
          </span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50">
              <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Resort Name</th>
              <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Occupancy</th>
              <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Current Rate</th>
              <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">AI Suggested</th>
              <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Change</th>
              <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Reason</th>
              <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {resortApprovals.map((approval) => (
              <tr key={approval.id} className="hover:bg-slate-50/50 transition-colors group">
                <td className="px-8 py-6">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-[#0066ff]">
                      <Hotel size={18} />
                    </div>
                    <span className="font-bold text-slate-900">{approval.resort}</span>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${parseInt(approval.occupancy) > 80 ? 'bg-orange-500' : 'bg-blue-500'}`} 
                        style={{ width: approval.occupancy }} 
                      />
                    </div>
                    <span className="text-sm font-bold text-slate-600">{approval.occupancy}</span>
                  </div>
                </td>
                <td className="px-8 py-6 font-bold text-slate-400">{approval.currentRate}</td>
                <td className="px-8 py-6 font-bold text-[#0066ff]">{approval.suggestedRate}</td>
                <td className="px-8 py-6">
                  <span className={`font-bold text-xs ${approval.change.startsWith('+') ? 'text-green-500' : 'text-red-500'}`}>
                    {approval.change}
                  </span>
                </td>
                <td className="px-8 py-6">
                  <div className="flex items-center gap-2 text-slate-500 text-xs italic">
                    <Clock size={14} />
                    {approval.reason}
                  </div>
                </td>
                <td className="px-8 py-6 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-green-500/20 active:scale-95">
                      Approve
                    </button>
                    <button className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold transition-all active:scale-95">
                      Reject
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderGuests = () => (
    <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
      <div className="p-8 border-b border-slate-50 flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-slate-900">Registered Guests</h3>
          <p className="text-sm text-slate-400">Manage all registered users from Supabase</p>
        </div>
        <button 
          onClick={fetchGuests} 
          disabled={loadingGuests}
          className="text-[#0066ff] hover:bg-blue-50 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={16} className={loadingGuests ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50">
              <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Name</th>
              <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Email</th>
              <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Phone</th>
              <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loadingGuests ? (
              <tr>
                <td colSpan={4} className="px-8 py-12 text-center text-slate-400 font-bold">
                  <div className="flex justify-center items-center gap-3">
                    <RefreshCw size={24} className="animate-spin text-[#0066ff]" />
                    Loading guests from Supabase...
                  </div>
                </td>
              </tr>
            ) : guests.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-8 py-12 text-center">
                  <p className="text-slate-900 font-bold text-lg mb-2">No guests found</p>
                  <p className="text-slate-500 text-sm">Make sure the `profiles` table and trigger are set up in your Supabase project.</p>
                </td>
              </tr>
            ) : (
              guests.map((guest) => (
                <tr key={guest.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 text-[#0066ff] rounded-full flex items-center justify-center font-bold">
                        {guest.full_name?.charAt(0) || <UserCircle size={20} />}
                      </div>
                      <span className="font-bold text-slate-900">{guest.full_name || 'N/A'}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-slate-500 font-medium">{guest.email || 'N/A'}</td>
                  <td className="px-8 py-6 text-slate-500">{guest.phone || 'N/A'}</td>
                  <td className="px-8 py-6 text-slate-500 text-sm">
                    {new Date(guest.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarOpen ? 280 : 80 }}
        className="bg-slate-900 text-white fixed h-full z-50 overflow-hidden"
      >
        <div className="p-6 flex items-center justify-between">
          {isSidebarOpen && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#0066ff] rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">K</span>
              </div>
              <span className="text-xl font-bold tracking-tight">Admin</span>
            </div>
          )}
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-slate-800 rounded-xl transition-colors"
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="mt-8 px-4 space-y-2">
          {[
            { id: 'pricing-dashboard', label: 'Pricing Dashboard', icon: <LayoutDashboard size={20} /> },
            { id: 'pricing-approvals', label: 'Pricing Approvals', icon: <CheckCircle2 size={20} /> },
            { id: 'pricing-calendar', label: 'Pricing Calendar', icon: <Calendar size={20} /> },
            { id: 'resorts', label: 'Resorts', icon: <Hotel size={20} /> },
            { id: 'guests', label: 'Guests', icon: <Users size={20} /> },
            { id: 'settings', label: 'Settings', icon: <Settings size={20} /> },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${
                activeTab === item.id 
                  ? 'bg-[#0066ff] text-white shadow-lg shadow-blue-500/20' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="shrink-0">{item.icon}</div>
              {isSidebarOpen && <span className="font-bold text-sm">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="absolute bottom-8 left-4 right-4">
          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-4 p-4 rounded-2xl text-red-400 hover:bg-red-500/10 transition-all`}
          >
            <LogOut size={20} />
            {isSidebarOpen && <span className="font-bold text-sm">Sign Out</span>}
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className={`flex-1 transition-all duration-300 ${isSidebarOpen ? 'ml-[280px]' : 'ml-[80px]'}`}>
        {/* Header */}
        <header className="bg-white border-b border-slate-100 p-6 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4 bg-slate-50 px-4 py-2 rounded-2xl w-96">
              <Search size={20} className="text-slate-400" />
              <input 
                type="text" 
                placeholder="Search pricing, bookings, or resorts..." 
                className="bg-transparent border-none focus:ring-0 text-sm w-full"
              />
            </div>

            <div className="flex items-center gap-6">
              <button className="relative p-2 text-slate-400 hover:text-[#0066ff] transition-colors">
                <Bell size={24} />
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
              </button>
              <div className="flex items-center gap-3 pl-6 border-l border-slate-100">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-bold text-slate-900">Sarah Johnson</p>
                  <p className="text-xs text-slate-400">Admin</p>
                </div>
                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400">
                  <UserCircle size={24} />
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="p-8 max-w-7xl mx-auto space-y-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'pricing-dashboard' && renderPricingDashboard()}
              {activeTab === 'pricing-approvals' && renderPricingApprovals()}
              {activeTab === 'pricing-calendar' && renderPricingCalendar()}
              {activeTab === 'resorts' && renderResortsApprovals()}
              {activeTab === 'guests' && renderGuests()}
              {['settings'].includes(activeTab) && (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                  <Hotel size={64} className="mb-4 opacity-20" />
                  <p className="text-xl font-bold">Module coming soon</p>
                  <p className="text-sm">We're working hard to bring you the {activeTab} management module.</p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};
