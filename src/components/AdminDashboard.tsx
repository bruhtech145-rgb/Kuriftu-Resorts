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
  RefreshCw,
  DoorOpen,
  Plus,
  Edit2,
  Trash2
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
import { runAdminAnalysis, triggerAgentCron, dismissAlert, DashboardAnalysis } from '../lib/admin-agent';
import { AdminNotifications, AIInsightsPanel, AdminAIChat } from './AdminAIPanel';
import { Sparkles as SparklesIcon } from 'lucide-react';
import { Room, Booking } from '../types';
import { format, addDays } from 'date-fns';

interface AdminDashboardProps {
  onLogout: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('ai-insights');
  const [guests, setGuests] = useState<any[]>([]);
  const [loadingGuests, setLoadingGuests] = useState(false);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [showRoomForm, setShowRoomForm] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [isPredicting, setIsPredicting] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [roomFormData, setRoomFormData] = useState<Partial<Room>>({});

  // Calendar States
  const [calendarStartDate, setCalendarStartDate] = useState(format(addDays(new Date(), 1), 'yyyy-MM-dd'));
  const [calendarTimeframe, setCalendarTimeframe] = useState<'week' | 'month'>('week');
  const [isCalendarPredicting, setIsCalendarPredicting] = useState(false);
  const [calendarDaysData, setCalendarDaysData] = useState<any[]>([]);

  // New state variables for dashboard data
  const [trendData, setTrendData] = useState<any[]>([]);
  const [pricingApprovals, setPricingApprovals] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [resortApprovals, setResortApprovals] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // AI Agent state
  const [aiAnalysis, setAiAnalysis] = useState<DashboardAnalysis | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [cronRunning, setCronRunning] = useState(false);
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);
  const [showAIChat, setShowAIChat] = useState(false);

  useEffect(() => {
    fetchDashboardData();
    runAIAnalysis();
  }, []);

  const handleTriggerCron = async () => {
    setCronRunning(true);
    try {
      await triggerAgentCron();
      // Refresh analysis after cron writes new alerts
      await runAIAnalysis();
    } catch (e) {
      console.error('Cron trigger error:', e);
    } finally {
      setCronRunning(false);
    }
  };

  const handleDismissAlert = (id: string) => {
    setDismissedAlerts(prev => [...prev, id]);
    dismissAlert(id).catch(() => {});
  };

  const runAIAnalysis = async () => {
    setAiLoading(true);
    try {
      console.log('Starting AI analysis...');
      const result = await runAdminAnalysis();
      console.log('AI analysis result:', result);
      setAiAnalysis(result);
    } catch (error) {
      console.error('AI analysis error:', error);
      // Set a fallback analysis so the panel still shows something
      setAiAnalysis({
        alerts: [],
        insights: [],
        summary: `Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}. Click refresh to retry.`,
        occupancyRate: 0,
        totalBookings: 0,
        todayRevenue: 0,
        upcomingEvents: [],
        demandForecast: 'N/A',
      });
    } finally {
      setAiLoading(false);
    }
  };

  const fetchDashboardData = async () => {
    setLoadingData(true);
    try {
      const [trendsRes, approvalsRes, recsRes, resortsRes, roomsRes, bookingsRes] = await Promise.all([
        supabase.from('price_trends').select('*').order('order_idx', { ascending: true }),
        supabase.from('pricing_approvals').select('*').eq('status', 'Pending').order('target_date', { ascending: true }),
        supabase.from('ai_recommendations').select('*'),
        supabase.from('resort_approvals').select('*'),
        supabase.from('rooms').select('*'),
        supabase.from('bookings').select('final_price, status')
      ]);

      if (trendsRes.data) setTrendData(trendsRes.data.map(d => ({ name: d.date_name, current: d.current_price, suggested: d.suggested_price })));
      if (approvalsRes.data) setPricingApprovals(approvalsRes.data.map(d => ({ id: d.id, roomType: d.room_type, date: d.target_date, current: d.current_price, suggested: d.suggested_price, change: d.change_percent, status: d.status })));
      if (recsRes.data) setRecommendations(recsRes.data.map(d => ({ type: d.room_type, reason: d.reason, current: d.current_price, suggested: d.suggested_price, change: d.change_percent, confidence: d.confidence })));
      if (resortsRes.data) setResortApprovals(resortsRes.data.map(d => ({ id: d.id, resort: d.resort_name, occupancy: d.occupancy, currentRate: d.current_rate, suggestedRate: d.suggested_rate, change: d.change_percent, reason: d.reason, status: d.status })));
      if (roomsRes.data) setRooms(roomsRes.data);
      if (bookingsRes.data) setBookings(bookingsRes.data as any);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'guests') {
      fetchGuests();
    } else if (activeTab === 'rooms') {
      fetchRooms();
    } else if (activeTab === 'bookings') {
      fetchBookings();
    }
  }, [activeTab]);

  const fetchRooms = async () => {
    setLoadingRooms(true);
    try {
      const { data, error } = await supabase.from('rooms').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setRooms(data || []);
    } catch (error) {
      console.error('Error fetching rooms:', error);
    } finally {
      setLoadingRooms(false);
    }
  };

  const handleSaveRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingRoom) {
        const { error } = await supabase.from('rooms').update(roomFormData).eq('id', editingRoom.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('rooms').insert([roomFormData]);
        if (error) throw error;
      }
      setShowRoomForm(false);
      setEditingRoom(null);
      setRoomFormData({});
      fetchRooms();
    } catch (error) {
      console.error('Error saving room:', error);
    }
  };

  const handleDeleteRoom = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this room?')) return;
    try {
      const { error } = await supabase.from('rooms').delete().eq('id', id);
      if (error) throw error;
      fetchRooms();
    } catch (error) {
      console.error('Error deleting room:', error);
    }
  };

  const handleApprovePrice = async (roomId: string | null, suggestedPrice: number, roomType: string, approvalId?: string) => {
    try {
      // 1. Update ALL rooms of the same type to maintain consistency
      const { error: roomError } = await supabase
        .from('rooms')
        .update({ 
          price: suggestedPrice, 
          suggested_price: null 
        })
        .eq('type', roomType);

      if (roomError) throw roomError;

      // 2. Update the corresponding service base_price for consistency
      const { error: serviceError } = await supabase
        .from('services')
        .update({ base_price: suggestedPrice })
        .eq('name', roomType);

      if (serviceError) {
        console.warn('Could not update service base_price:', serviceError);
      }

      // 3. Mark approval as 'Approved' if called from approvals tab
      if (approvalId) {
        await supabase.from('pricing_approvals').update({ status: 'Approved' }).eq('id', approvalId);
      }

      await fetchRooms();
      await fetchDashboardData();
      alert(`AI Price Approved!\nAll rooms within '${roomType}' category have been updated to ETB ${suggestedPrice}.`);
    } catch (error) {
      console.error('Error approving price:', error);
      alert('Failed to approve price.');
    }
  };

  const fetchBookings = async () => {
    setLoadingBookings(true);
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .order('start_date', { ascending: false });

      if (error) throw error;
      setBookings(data || []);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoadingBookings(false);
    }
  };

  const renderBookings = () => (
    <div className="space-y-8">
      <div className="flex items-center justify-between bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
        <div>
          <h3 className="text-xl font-bold text-slate-900">All Bookings</h3>
          <p className="text-sm text-slate-400">View and manage all guest bookings</p>
        </div>
        <button
          onClick={fetchBookings}
          disabled={loadingBookings}
          className="text-[#0066ff] hover:bg-blue-50 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={18} className={loadingBookings ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">ID</th>
                <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Dates</th>
                <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Guests</th>
                <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Price</th>
                <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Payment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loadingBookings ? (
                <tr>
                  <td colSpan={6} className="px-8 py-12 text-center text-slate-400 font-bold">
                    <RefreshCw size={24} className="animate-spin text-[#0066ff] mx-auto mb-2" /> Loading bookings...
                  </td>
                </tr>
              ) : bookings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-12 text-center text-slate-500">No bookings found.</td>
                </tr>
              ) : (
                bookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-6 font-mono text-xs text-slate-400">{booking.id.substring(0, 8)}...</td>
                    <td className="px-8 py-6">
                      <div className="font-bold text-slate-900">{new Date(booking.start_date).toLocaleDateString()}</div>
                      <div className="text-xs text-slate-500">to {new Date(booking.end_date).toLocaleDateString()}</div>
                    </td>
                    <td className="px-8 py-6 text-slate-500">{booking.guest_count}</td>
                    <td className="px-8 py-6 font-bold text-slate-900">${booking.final_price}</td>
                    <td className="px-8 py-6">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        booking.status === 'Confirmed' ? 'bg-green-100 text-green-600' :
                        booking.status === 'Pending' ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-600'
                      }`}>
                        {booking.status}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        booking.payment_status === 'Paid' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {booking.payment_status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

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

  const pricingStats = React.useMemo(() => {
    const totalRooms = rooms.length || 1;
    const bookedRooms = rooms.filter(r => r.status === 'Booked').length;
    const occupancyRate = (bookedRooms / totalRooms);
    
    const avgPrice = rooms.reduce((acc, r) => acc + Number(r.price), 0) / totalRooms;
    
    const suggestedRooms = rooms.filter(r => r.suggested_price);
    const avgSuggested = suggestedRooms.length > 0
      ? suggestedRooms.reduce((acc, r) => acc + Number(r.suggested_price), 0) / suggestedRooms.length
      : avgPrice;
    
    const suggestedChange = avgPrice > 0 ? ((avgSuggested - avgPrice) / avgPrice) * 100 : 0;
    
    const revenue = bookings.reduce((acc, b) => acc + (Number(b.final_price) || 0), 0);

    return [
      { label: 'Current Avg Price', value: `ETB ${Math.round(avgPrice).toLocaleString()}`, change: '+3.2%', icon: <TrendingUp size={24} />, color: 'bg-blue-500' },
      { label: 'AI Suggested Price', value: `ETB ${Math.round(avgSuggested).toLocaleString()}`, change: `${suggestedChange >= 0 ? '+' : ''}${suggestedChange.toFixed(1)}%`, icon: <Zap size={24} />, color: 'bg-amber-500' },
      { label: 'Occupancy Rate', value: `${Math.round(occupancyRate * 100)}%`, change: occupancyRate > 0.6 ? 'High' : 'Normal', icon: <Hotel size={24} />, color: 'bg-green-500' },
      { label: 'Total Revenue', value: `ETB ${(revenue / 1000).toFixed(1)}k`, change: '+15.7%', icon: <TrendingUp size={24} />, color: 'bg-purple-500' },
    ];
  }, [rooms, bookings]);


  const quickInsights = React.useMemo(() => {
    const oppty = rooms.reduce((acc, r) => acc + (r.suggested_price ? (Number(r.suggested_price) - Number(r.price)) : 0), 0);
    const occupancy = rooms.length ? (rooms.filter(r => r.status === 'Booked').length / rooms.length) : 0;
    const avgPrice = rooms.length ? (rooms.reduce((acc, r) => acc + Number(r.price), 0) / rooms.length) : 250;
    
    return {
      revenueOpportunity: `ETB ${(oppty * 7 / 1000).toFixed(1)}K`, // Estimated weekly gain
      highDemandPeriod: 'Weekend (Apr 10-12)', // Could be dynamic based on pricing_approvals
      avgWindow: '12 days',
      compPrice: `ETB ${Math.round(avgPrice * 1.05).toLocaleString()}`,
      marketDemand: occupancy > 0.7 ? 'High' : occupancy > 0.4 ? 'Medium' : 'Low'
    };
  }, [rooms]);

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
            {loadingData ? (
              <div className="w-full h-full flex items-center justify-center text-slate-400">
                <RefreshCw size={24} className="animate-spin mr-3" />
                Loading trends...
              </div>
            ) : (
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
            )}
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
                Accepting AI suggestions could increase revenue by <span className="font-bold">{quickInsights.revenueOpportunity}</span> this week
              </p>
            </div>
            <div className="p-4 bg-amber-50 rounded-2xl">
              <div className="flex items-center gap-3 mb-2 text-amber-600">
                <AlertCircle size={20} />
                <span className="font-bold text-sm">High Demand Period</span>
              </div>
              <p className="text-sm text-amber-900/70 leading-relaxed">
                {quickInsights.highDemandPeriod} shows <span className="font-bold">156%</span> higher demand than average
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-2xl text-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Avg. Window</p>
                <p className="text-lg font-bold text-slate-900">{quickInsights.avgWindow}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl text-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Comp. Price</p>
                <p className="text-lg font-bold text-slate-900">{quickInsights.compPrice}</p>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-slate-900 text-white rounded-2xl">
              <div className="flex items-center gap-3">
                <Globe size={20} className="text-[#0066ff]" />
                <span className="font-bold text-sm">Market Demand</span>
              </div>
              <span className={`text-white text-[10px] font-bold px-2 py-1 rounded-lg ${
                quickInsights.marketDemand === 'High' ? 'bg-green-500' : 
                quickInsights.marketDemand === 'Medium' ? 'bg-amber-500' : 'bg-blue-500'
              }`}>
                {quickInsights.marketDemand}
              </span>
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
          {loadingData ? (
            <div className="col-span-full flex items-center justify-center py-12 text-slate-400">
              <RefreshCw size={24} className="animate-spin mr-3" />
              Loading recommendations...
            </div>
          ) : recommendations.length === 0 ? (
            <div className="col-span-full text-center py-12 text-slate-500 font-bold">No recommendations found</div>
          ) : (
            recommendations.map((rec, i) => (
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
            ))
          )}
        </div>
      </div>
    </div>
  );

  const renderPricingApprovals = () => (
    <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
      <div className="p-8 border-b border-slate-50 flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-slate-900">Pricing Approvals</h3>
          <p className="text-sm text-slate-400">{pricingApprovals.filter(a => a.status === 'Pending').length} pending approvals</p>
        </div>
        <button
          onClick={handleBulkApprove}
          className="px-6 py-2 bg-green-500 text-white rounded-xl text-sm font-bold hover:bg-green-600 transition-all shadow-lg shadow-green-500/20"
        >
          Approve All Pending
        </button>
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
            {loadingData ? (
              <tr>
                <td colSpan={8} className="px-8 py-12 text-center text-slate-400">
                  <div className="flex justify-center items-center gap-3">
                    <RefreshCw size={24} className="animate-spin text-[#0066ff]" />
                    Loading approvals...
                  </div>
                </td>
              </tr>
            ) : pricingApprovals.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-8 py-12 text-center text-slate-500 font-bold">No pricing approvals pending</td>
              </tr>
            ) : (
              pricingApprovals.map((approval) => (
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
                       <button 
                        onClick={() => handleApprovePrice(null, approval.suggested, approval.roomType, approval.id)}
                        className="px-4 py-1.5 bg-green-500 text-white rounded-xl text-xs font-bold hover:bg-green-600 transition-colors shadow-lg shadow-green-500/10"
                      >
                        Approve
                      </button>
                      <button 
                        onClick={async () => {
                          await supabase.from('pricing_approvals').update({ status: 'Rejected' }).eq('id', approval.id);
                          fetchDashboardData();
                        }}
                        className="px-4 py-1.5 bg-slate-100 text-slate-500 rounded-xl text-xs font-bold hover:bg-red-50 hover:text-red-500 transition-colors"
                      >
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const handleGenerateCalendarPrediction = async () => {
    setIsCalendarPredicting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 800)); // Simulate AI computation

      const daysToGenerate = calendarTimeframe === 'month' ? 30 : 7;
      const start = new Date(calendarStartDate);
      const newDays = [];

      let basePrice = 250;

      for (let i = 0; i < daysToGenerate; i++) {
        const currentDate = addDays(start, i);
        const dayOfWeek = currentDate.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        
        let price = basePrice;
        let demand = 'Medium Demand';
        let discount = null;

        if (isWeekend) {
          price = Math.round(basePrice * 1.15); 
          demand = 'High Demand';
        }

        if (Math.random() > 0.85) {
          price = Math.round(price * 1.30); 
          demand = 'High Demand';
        }

        if (!isWeekend && Math.random() > 0.80) {
          price = Math.round(basePrice * 0.85); 
          demand = 'Low Demand';
          discount = '15% OFF';
        }

        newDays.push({
          date: currentDate,
          day: format(currentDate, 'd'),
          dayName: format(currentDate, 'EEE'),
          fullDate: format(currentDate, 'MMM d, yyyy'),
          price,
          demand,
          discount
        });
      }

      setCalendarDaysData(newDays);
    } catch (err) {
      console.error(err);
    } finally {
      setIsCalendarPredicting(false);
    }
  };

  const handleBulkApprove = async () => {
    try {
      const { error } = await supabase
        .from('pricing_approvals')
        .update({ status: 'Approved' })
        .eq('status', 'Pending');
      
      if (error) throw error;
      
      alert('All pending price suggestions have been approved and are now active for member bookings!');
      fetchDashboardData();
    } catch (err) {
      console.error('Bulk approval error:', err);
      alert('Failed to approve all suggestions.');
    }
  };

  const handleBulkGenerateForecasts = async () => {
    setIsCalendarPredicting(true);
    try {
      // 1. Get unique room types
      const uniqueTypes = [...new Set(rooms.map(r => r.type))];
      if (uniqueTypes.length === 0) {
        // Fallback to services if rooms table is empty for some reason
        const { data: services } = await supabase.from('services').select('name');
        if (services) uniqueTypes.push(...services.map(s => s.name));
      }

      const daysToGenerate = calendarTimeframe === 'month' ? 30 : 7;
      const start = new Date(calendarStartDate);
      const forecasts = [];

      for (const type of uniqueTypes) {
        // Find current base price for this type
        const baseRoom = rooms.find(r => r.type === type);
        const basePrice = baseRoom?.price || 200;

        for (let i = 0; i < daysToGenerate; i++) {
          const currentDate = addDays(start, i);
          const dayOfWeek = currentDate.getDay();
          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
          
          let suggested = basePrice;
          if (isWeekend) suggested = Math.round(basePrice * 1.25);
          if (Math.random() > 0.8) suggested = Math.round(suggested * 1.15); // Random surge

          const changePercent = `${(((suggested - basePrice) / basePrice) * 100).toFixed(1)}%`;

          forecasts.push({
            room_type: type,
            target_date: format(currentDate, 'MMM d, yyyy'),
            current_price: basePrice,
            suggested_price: suggested,
            change_percent: changePercent.startsWith('-') ? changePercent : `+${changePercent}`,
            status: 'Pending'
          });
        }
      }

      // 2. Insert into pricing_approvals
      const { error } = await supabase.from('pricing_approvals').insert(forecasts);
      if (error) throw error;

      alert(`Successfully generated ${forecasts.length} AI price forecasts across ${uniqueTypes.length} room categories!`);
      fetchDashboardData(); // Refresh approvals tab
    } catch (err) {
      console.error('Bulk forecast error:', err);
      alert('Failed to generate bulk forecasts.');
    } finally {
      setIsCalendarPredicting(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'pricing-calendar' && calendarDaysData.length === 0) {
      handleGenerateCalendarPrediction();
    }
  }, [activeTab]);

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

      <div className="mb-8 flex flex-col lg:flex-row items-center gap-4 justify-between bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
        <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
          <input 
            type="date"
            value={calendarStartDate}
            onChange={(e) => setCalendarStartDate(e.target.value)}
            className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0066ff]/20 text-sm font-bold text-slate-900"
          />
          <select 
            value={calendarTimeframe}
            onChange={(e) => setCalendarTimeframe(e.target.value as 'week' | 'month')}
            className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0066ff]/20 text-sm font-bold text-slate-900"
          >
            <option value="week">1-Week Forecast</option>
            <option value="month">1-Month Forecast</option>
          </select>
          <button
            onClick={handleBulkGenerateForecasts}
            disabled={isCalendarPredicting}
            className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-2xl text-sm font-bold hover:scale-105 active:scale-95 transition-all shadow-xl shadow-slate-900/10 disabled:opacity-50"
          >
            <SparklesIcon size={18} className={isCalendarPredicting ? 'animate-spin' : ''} />
            {isCalendarPredicting ? 'Calculating...' : 'Bulk Forecast All Room Types'}
          </button>
        </div>
        <button 
          onClick={handleGenerateCalendarPrediction}
          disabled={isCalendarPredicting}
          className="w-full sm:w-auto bg-[#0066ff] hover:bg-blue-600 text-white px-6 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
        >
          <Zap size={16} className={isCalendarPredicting ? 'animate-pulse' : ''} />
          {isCalendarPredicting ? 'Predicting...' : 'Generate Forecast'}
        </button>
      </div>

      {isCalendarPredicting ? (
         <div className="py-20 flex flex-col items-center justify-center space-y-4">
            <RefreshCw size={32} className="animate-spin text-[#0066ff]" />
            <p className="text-slate-500 font-bold">Running Dynamic Prophet Model...</p>
         </div>
      ) : (
        <div className="grid grid-cols-7 gap-px bg-slate-100 border border-slate-100 rounded-3xl overflow-hidden">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="bg-white p-4 text-center text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-50">
              {day}
            </div>
          ))}
          
          {/* Fill beginning empty cells */}
          {calendarDaysData.length > 0 && Array.from({ length: new Date(calendarDaysData[0].date).getDay() }).map((_, i) => (
            <div key={`empty-start-${i}`} className="bg-slate-50/30 p-6 min-h-[120px]" />
          ))}

          {calendarDaysData.map((day, i) => (
            <div key={i} className="bg-white p-6 min-h-[120px] hover:bg-slate-50 transition-colors group cursor-pointer relative">
              <span className="text-sm font-bold text-slate-400 group-hover:text-slate-900 transition-colors">{day.day}</span>
              <div className="mt-4">
                <p className="text-xl font-bold text-slate-900">${day.price}</p>
                {day.discount && (
                  <p className="text-[10px] font-bold text-blue-500 mt-1">{day.discount}</p>
                )}
              </div>
              <div className={`absolute bottom-4 right-4 w-2 h-2 rounded-full ${day.demand === 'High Demand' ? 'bg-red-500' :
                  day.demand === 'Medium Demand' ? 'bg-amber-500' : 'bg-green-500'
                }`} />
            </div>
          ))}
          
          {/* Fill remaining empty cells */}
          {calendarDaysData.length > 0 && (() => {
             const startPadding = new Date(calendarDaysData[0].date).getDay();
             const totalCells = startPadding + calendarDaysData.length;
             const neededRows = Math.ceil(totalCells / 7);
             const remainingCells = (neededRows * 7) - totalCells;
             return Array.from({ length: remainingCells }).map((_, i) => (
               <div key={`empty-end-${i}`} className="bg-slate-50/30 p-6 min-h-[120px]" />
             ));
          })()}
        </div>
      )}
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
            {loadingData ? (
              <tr>
                <td colSpan={7} className="px-8 py-12 text-center text-slate-400">
                  <div className="flex justify-center items-center gap-3">
                    <RefreshCw size={24} className="animate-spin text-[#0066ff]" />
                    Loading resort approvals...
                  </div>
                </td>
              </tr>
            ) : resortApprovals.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-8 py-12 text-center text-slate-500 font-bold">No resort approvals pending</td>
              </tr>
            ) : (
              resortApprovals.map((approval) => (
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
              ))
            )}
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

  const handleRunAIPrediction = async () => {
    setIsPredicting(true);
    try {
      // Simulate calling ai-models/dynamic-price-predictor.py
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const updates = rooms.map(room => {
        const demandMultiplier = 1.0 + Math.random() * 0.2; 
        const holidayMultiplier = Math.random() > 0.8 ? 1.2 : 1.0; 
        const suggested = Math.round(room.price * demandMultiplier * holidayMultiplier);
        return {
          id: room.id,
          suggested_price: suggested
        };
      });

      // Sequential update to Supabase (in a real app, do an RPC or bulk update)
      for (const update of updates) {
        await supabase
          .from('rooms')
          .update({ suggested_price: update.suggested_price })
          .eq('id', update.id);
      }

      await fetchRooms();
      alert('AI Price Prediction Complete!\nSuggested prices have been populated.');
    } catch (error) {
      console.error('Error running AI prediction:', error);
      alert('Failed to run AI prediction.');
    } finally {
      setIsPredicting(false);
    }
  };

  const renderRooms = () => (
    <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
      <div className="p-8 border-b border-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-slate-900">Rooms Management</h3>
          <p className="text-sm text-slate-400">Manage all rooms and suites</p>
        </div>
        <div className="flex flex-wrap flex-col sm:flex-row gap-2">
          <button
            onClick={handleRunAIPrediction}
            disabled={isPredicting || loadingRooms || rooms.length === 0}
            className="text-amber-600 bg-amber-50 hover:bg-amber-100 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            <Zap size={16} className={isPredicting ? 'animate-pulse' : ''} />
            {isPredicting ? 'Predicting...' : 'Predict AI Prices'}
          </button>
          <button
            onClick={fetchRooms}
            disabled={loadingRooms}
            className="text-[#0066ff] bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={16} className={loadingRooms ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={() => {
              setEditingRoom(null);
              setRoomFormData({ status: 'Available', capacity: 2 });
              setShowRoomForm(true);
            }}
            className="bg-[#0066ff] hover:bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors"
          >
            <Plus size={16} />
            Add Room
          </button>
        </div>
      </div>

      {showRoomForm && (
        <div className="p-8 bg-slate-50 border-b border-slate-100">
          <h4 className="font-bold text-slate-900 mb-4">{editingRoom ? 'Edit Room' : 'Add New Room'}</h4>
          <form onSubmit={handleSaveRoom} className="space-y-4 max-w-2xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Room Name</label>
                <input required type="text" value={roomFormData.name || ''} onChange={e => setRoomFormData({ ...roomFormData, name: e.target.value })} className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-[#0066ff]" placeholder="e.g. Ocean View Suite 101" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Room Type</label>
                <select required value={roomFormData.type || ''} onChange={e => setRoomFormData({ ...roomFormData, type: e.target.value })} className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-[#0066ff] bg-white">
                  <option value="" disabled>Select a room type</option>
                  <optgroup label="Bishoftu (Debre Zeyit)">
                    <option value="Royal Presidential Suite">Royal Presidential Suite</option>
                    <option value="Lake Side">Lake Side</option>
                    <option value="Splash View Suite">Splash View Suite</option>
                    <option value="Gateway Retreat">Gateway Retreat</option>
                    <option value="Standard Twin">Standard Twin</option>
                    <option value="Standard King">Standard King</option>
                    <option value="Family Room">Family Room</option>
                  </optgroup>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Price / Night ($)</label>
                <input required type="number" min="0" value={roomFormData.price || ''} onChange={e => setRoomFormData({ ...roomFormData, price: parseFloat(e.target.value) })} className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-[#0066ff]" placeholder="450" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Capacity</label>
                <input required type="number" min="1" value={roomFormData.capacity || ''} onChange={e => setRoomFormData({ ...roomFormData, capacity: parseInt(e.target.value) })} className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-[#0066ff]" placeholder="2" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Status</label>
                <select required value={roomFormData.status || 'Available'} onChange={e => setRoomFormData({ ...roomFormData, status: e.target.value })} className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-[#0066ff] bg-white">
                  <option value="Available">Available</option>
                  <option value="Booked">Booked</option>
                  <option value="Maintenance">Maintenance</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Description</label>
                <textarea value={roomFormData.description || ''} onChange={e => setRoomFormData({ ...roomFormData, description: e.target.value })} className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-[#0066ff]" rows={3}></textarea>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowRoomForm(false)} className="px-4 py-2 font-bold text-slate-500 hover:bg-slate-200 rounded-xl transition-colors">Cancel</button>
              <button type="submit" className="px-4 py-2 font-bold text-white bg-[#0066ff] hover:bg-blue-600 rounded-xl transition-colors">Save Room</button>
            </div>
          </form>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50">
              <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Name</th>
              <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Type</th>
              <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Price</th>
              <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Suggested</th>
              <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Cap.</th>
              <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Status</th>
              <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loadingRooms ? (
              <tr>
                <td colSpan={7} className="px-8 py-12 text-center text-slate-400 font-bold">
                  <RefreshCw size={24} className="animate-spin text-[#0066ff] mx-auto mb-2" /> Loading rooms...
                </td>
              </tr>
            ) : rooms.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-8 py-12 text-center text-slate-500">No rooms found.</td>
              </tr>
            ) : (
              rooms.map((room) => (
                <tr key={room.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-6 font-bold text-slate-900">{room.name}</td>
                  <td className="px-8 py-6 text-slate-500">{room.type}</td>
                  <td className="px-8 py-6 font-bold text-slate-900">${room.price}</td>
                  <td className="px-8 py-6 text-amber-600 font-bold">{room.suggested_price ? `$${room.suggested_price}` : '-'}</td>
                  <td className="px-8 py-6 text-slate-500">{room.capacity}</td>
                  <td className="px-8 py-6">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${room.status === 'Available' ? 'bg-green-100 text-green-600' :
                        room.status === 'Booked' ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-600'
                      }`}>
                      {room.status}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {room.suggested_price && (
                        <button 
                          onClick={() => handleApprovePrice(room.id, room.suggested_price!, room.type)}
                          title="Approve AI Suggestion"
                          className="p-2 text-green-500 hover:bg-green-50 rounded-xl transition-colors"
                        >
                          <CheckCircle2 size={16} />
                        </button>
                      )}
                      <button onClick={() => { setEditingRoom(room); setRoomFormData(room); setShowRoomForm(true); }} className="p-2 text-blue-500 hover:bg-blue-50 rounded-xl transition-colors"><Edit2 size={16} /></button>
                      <button onClick={() => handleDeleteRoom(room.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors"><Trash2 size={16} /></button>
                    </div>
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
            { id: 'ai-insights', label: 'AI Insights', icon: <SparklesIcon size={20} /> },
            { id: 'pricing-dashboard', label: 'Pricing Dashboard', icon: <LayoutDashboard size={20} /> },
            { id: 'pricing-approvals', label: 'Pricing Approvals', icon: <CheckCircle2 size={20} /> },
            { id: 'pricing-calendar', label: 'Pricing Calendar', icon: <Calendar size={20} /> },
            { id: 'resorts', label: 'Resorts', icon: <Hotel size={20} /> },
            { id: 'rooms', label: 'Rooms', icon: <DoorOpen size={20} /> },
            { id: 'bookings', label: 'Bookings', icon: <Calendar size={20} /> },
            { id: 'guests', label: 'Guests', icon: <Users size={20} /> },
            { id: 'settings', label: 'Settings', icon: <Settings size={20} /> },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${activeTab === item.id
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
              <button
                onClick={handleTriggerCron}
                disabled={cronRunning}
                className="flex items-center gap-2 px-4 py-2 bg-[#0066ff] text-white rounded-xl text-sm font-bold hover:bg-[#0052cc] transition-all disabled:opacity-50 shadow-lg shadow-blue-500/20"
              >
                <SparklesIcon size={16} className={cronRunning ? 'animate-spin' : ''} />
                {cronRunning ? 'Running...' : 'Run AI Agent'}
              </button>
              <button className="relative p-2 text-slate-400 hover:text-[#0066ff] transition-colors">
                <Bell size={24} />
                {aiAnalysis && aiAnalysis.alerts.filter(a => !dismissedAlerts.includes(a.id)).length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white text-[10px] font-bold flex items-center justify-center border-2 border-white">
                    {aiAnalysis.alerts.filter(a => !dismissedAlerts.includes(a.id)).length}
                  </span>
                )}
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
              {activeTab === 'ai-insights' && (
                <AIInsightsPanel analysis={aiAnalysis} loading={aiLoading} onRefresh={runAIAnalysis} />
              )}
              {activeTab === 'pricing-dashboard' && renderPricingDashboard()}
              {activeTab === 'pricing-approvals' && renderPricingApprovals()}
              {activeTab === 'pricing-calendar' && renderPricingCalendar()}
              {activeTab === 'resorts' && renderResortsApprovals()}
              {activeTab === 'rooms' && renderRooms()}
              {activeTab === 'bookings' && renderBookings()}
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

      {/* AI Notifications */}
      {aiAnalysis && (
        <AdminNotifications
          alerts={aiAnalysis.alerts.filter(a => !dismissedAlerts.includes(a.id))}
          onDismiss={handleDismissAlert}
        />
      )}

      {/* AI Chat FAB */}
      <button
        onClick={() => setShowAIChat(!showAIChat)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-[#0066ff] text-white rounded-full shadow-2xl shadow-blue-500/30 flex items-center justify-center hover:scale-110 transition-transform z-[70]"
      >
        <SparklesIcon size={24} />
      </button>

      {/* AI Chat Panel */}
      <AdminAIChat isOpen={showAIChat} onClose={() => setShowAIChat(false)} />
    </div>
  );
};
