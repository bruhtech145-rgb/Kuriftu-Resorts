import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles, AlertTriangle, Info, CheckCircle2, XCircle, Bell, Send, Bot, User,
  TrendingUp, Users, Calendar, Hotel, Loader2, ChevronRight, X, Zap, Volume2,
  PieChart as PieChartIcon, BarChart3
} from 'lucide-react';
import { runAdminAnalysis, adminChat, loadAdminHistory, AdminAlert, AIInsight, DashboardAnalysis } from '../lib/admin-agent';
import { clsx } from 'clsx';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

// ─── Notification Toast ───

interface NotificationProps {
  alerts: AdminAlert[];
  onDismiss: (id: string) => void;
}

export function AdminNotifications({ alerts, onDismiss }: NotificationProps) {
  const [visible, setVisible] = useState<string[]>([]);

  useEffect(() => {
    // Show new alerts with stagger
    const newIds = alerts.filter(a => !visible.includes(a.id)).map(a => a.id);
    newIds.forEach((id, i) => {
      setTimeout(() => setVisible(prev => [...prev, id]), i * 300);
    });
  }, [alerts]);

  const activeAlerts = alerts.filter(a => visible.includes(a.id));

  const iconMap = {
    urgent: <XCircle size={18} />,
    warning: <AlertTriangle size={18} />,
    info: <Info size={18} />,
    success: <CheckCircle2 size={18} />,
  };
  const colorMap = {
    urgent: 'bg-red-50 border-red-200 text-red-700',
    warning: 'bg-amber-50 border-amber-200 text-amber-700',
    info: 'bg-blue-50 border-blue-200 text-blue-700',
    success: 'bg-green-50 border-green-200 text-green-700',
  };

  if (activeAlerts.length === 0) return null;

  return (
    <div className="fixed top-20 right-6 z-[80] space-y-3 max-w-sm">
      <AnimatePresence>
        {activeAlerts.slice(0, 4).map(alert => (
          <motion.div
            key={alert.id}
            initial={{ opacity: 0, x: 100, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.9 }}
            className={clsx("p-4 rounded-2xl border shadow-lg backdrop-blur-sm flex gap-3", colorMap[alert.type])}
          >
            <div className="shrink-0 mt-0.5">{iconMap[alert.type]}</div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm">{alert.title}</p>
              <p className="text-xs mt-1 opacity-80 line-clamp-2">{alert.message}</p>
            </div>
            <button onClick={() => { setVisible(prev => prev.filter(id => id !== alert.id)); onDismiss(alert.id); }} className="shrink-0 p-1 hover:opacity-60">
              <X size={14} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ─── AI Insights Panel ───

interface InsightsPanelProps {
  analysis: DashboardAnalysis | null;
  loading: boolean;
  onRefresh: () => void;
}

export function AIInsightsPanel({ analysis, loading, onRefresh }: InsightsPanelProps) {
  const categoryIcons: Record<string, React.ReactNode> = {
    revenue: <TrendingUp size={16} />,
    occupancy: <Hotel size={16} />,
    guest: <Users size={16} />,
    event: <Calendar size={16} />,
    operations: <Zap size={16} />,
  };

  const impactColors = {
    high: 'bg-red-100 text-red-700',
    medium: 'bg-amber-100 text-amber-700',
    low: 'bg-green-100 text-green-700',
  };

  // Process segmentation data for charts
  const segmentationData = analysis?.customerSegments ? (() => {
    const counts: Record<string, number> = {};
    analysis.customerSegments.forEach(s => {
      counts[s.category] = (counts[s.category] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  })() : [];

  const COLORS = ['#0066ff', '#00C49F', '#FFBB28', '#FF8042'];

  return (
    <div className="space-y-8">
      {/* AI Summary Card */}
      <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-60 h-60 bg-[#0066ff]/10 rounded-full blur-3xl" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#0066ff] rounded-xl flex items-center justify-center">
                <Sparkles size={20} />
              </div>
              <div>
                <h3 className="font-bold text-lg">AI Operations Agent</h3>
                <span className="text-xs text-slate-400">Powered by Groq AI</span>
              </div>
            </div>
            <button onClick={onRefresh} disabled={loading} className="p-2 hover:bg-white/10 rounded-xl transition-colors disabled:opacity-50">
              <Loader2 size={18} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          {loading ? (
            <div className="flex items-center gap-3 text-slate-400">
              <Loader2 size={16} className="animate-spin" />
              <span className="text-sm">Analyzing resort data...</span>
            </div>
          ) : analysis ? (
            <>
              <p className="text-slate-300 leading-relaxed text-sm whitespace-pre-line">{analysis.summary}</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
                <div className="bg-white/5 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold">{analysis.occupancyRate}%</p>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest">Occupancy</p>
                </div>
                <div className="bg-white/5 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold">{analysis.totalBookings}</p>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest">Bookings</p>
                </div>
                <div className="bg-white/5 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold">ETB {(analysis.todayRevenue / 1000).toFixed(1)}K</p>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest">Today</p>
                </div>
                <div className="bg-white/5 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold">{analysis.demandForecast.split(' ')[0]}</p>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest">Demand</p>
                </div>
              </div>
            </>
          ) : (
            <p className="text-slate-400 text-sm">Click refresh to run analysis.</p>
          )}
        </div>
      </div>

      {/* Market Segmentation */}
      {analysis && analysis.customerSegments && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Users size={18} className="text-[#0066ff]" />
              AI Customer Segmentation
            </h3>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={segmentationData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    cursor={{ fill: '#f8fafc' }}
                  />
                  <Bar dataKey="value" fill="#0066ff" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
              <PieChartIcon size={18} className="text-[#0066ff]" />
              Distribution
            </h3>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={segmentationData}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {segmentationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
              {segmentationData.map((s, i) => (
                <div key={i} className="flex items-center justify-between text-[10px]">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-slate-600 truncate max-w-[120px]">{s.name}</span>
                  </div>
                  <span className="font-bold text-slate-900 whitespace-nowrap">{s.value} guests</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Upcoming Events */}
      {analysis && analysis.upcomingEvents.length > 0 && (
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
          <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Calendar size={18} className="text-[#0066ff]" />
            Upcoming Ethiopian Events
          </h3>
          <div className="space-y-3">
            {analysis.upcomingEvents.map((e, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-amber-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <span className="text-lg">🇪🇹</span>
                  <div>
                    <p className="font-bold text-sm text-slate-900">{e.name}</p>
                    <p className="text-xs text-slate-500">{e.nameAmharic}</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-amber-600 bg-amber-100 px-2 py-1 rounded-lg">High Demand</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Insights Grid */}
      {analysis && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {analysis.insights.map((insight, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-[#0066ff]">
                  {categoryIcons[insight.category] || <Zap size={16} />}
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-400">{insight.category}</span>
                </div>
                <span className={clsx("text-[10px] font-bold px-2 py-0.5 rounded-lg uppercase", impactColors[insight.impact])}>
                  {insight.impact} impact
                </span>
              </div>
              <h4 className="font-bold text-slate-900 mb-2">{insight.title}</h4>
              <p className="text-sm text-slate-500 mb-3 leading-relaxed">{insight.detail}</p>
              <div className="pt-3 border-t border-slate-50">
                <p className="text-xs text-[#0066ff] font-bold flex items-center gap-1">
                  <Sparkles size={12} />
                  {insight.suggestion}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Admin AI Chat ───

interface AdminChatProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AdminAIChat({ isOpen, onClose }: AdminChatProps) {
  const [messages, setMessages] = useState<{ id: string; text: string; sender: 'user' | 'bot' }[]>([
    { id: '1', text: "Selam! I'm your AI Operations Manager. I remember our past conversations and have access to all live resort data. Ask me about occupancy, revenue, pricing — or tell me to create packages!", sender: 'bot' },
  ]);
  const [chatHistory, setChatHistory] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load persistent admin history
  useEffect(() => {
    if (!isOpen || historyLoaded) return;
    setHistoryLoaded(true);
    loadAdminHistory().then(history => {
      if (history.length > 0) {
        setChatHistory(history);
        const recent = history.slice(-8).map((m, i) => ({
          id: `hist-${i}`,
          text: m.content,
          sender: m.role === 'user' ? 'user' as const : 'bot' as const,
        }));
        setMessages(prev => [...recent, ...prev]);
      }
    }).catch(() => {});
  }, [isOpen]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isTyping]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isTyping) return;
    setMessages(prev => [...prev, { id: Date.now().toString(), text, sender: 'user' }]);
    setInput('');
    setIsTyping(true);

    const newHistory = [...chatHistory, { role: 'user', content: text }];
    setChatHistory(newHistory);

    try {
      const reply = await adminChat(text, newHistory);
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), text: reply, sender: 'bot' }]);
      setChatHistory(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch {
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), text: "Connection issue. Try again.", sender: 'bot' }]);
    } finally {
      setIsTyping(false);
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed bottom-6 right-6 w-[420px] max-w-[calc(100vw-3rem)] h-[550px] bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 flex flex-col overflow-hidden z-[80]"
    >
      <div className="bg-slate-900 p-5 text-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#0066ff] rounded-xl flex items-center justify-center">
            <Bot size={18} />
          </div>
          <div>
            <h3 className="font-bold text-sm">AI Operations Manager</h3>
            <span className="text-[10px] text-slate-400">Live data connected</span>
          </div>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl"><X size={18} /></button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/50">
        {messages.map(msg => (
          <div key={msg.id} className={clsx("flex gap-2 max-w-[85%]", msg.sender === 'user' ? "ml-auto flex-row-reverse" : "")}>
            <div className={clsx("w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-1", msg.sender === 'user' ? "bg-slate-200" : "bg-slate-900 text-white")}>
              {msg.sender === 'user' ? <User size={14} /> : <Bot size={14} />}
            </div>
            <div className={clsx("p-3 rounded-2xl text-sm leading-relaxed whitespace-pre-line", msg.sender === 'user' ? "bg-slate-900 text-white rounded-tr-sm" : "bg-white text-slate-800 border border-slate-100 rounded-tl-sm")}>
              {msg.text}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex gap-2">
            <div className="w-7 h-7 bg-slate-900 text-white rounded-lg flex items-center justify-center shrink-0 mt-1"><Bot size={14} /></div>
            <div className="bg-white p-3 rounded-2xl rounded-tl-sm border border-slate-100">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" />
                <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:0.2s]" />
                <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 bg-white border-t border-slate-100">
        <div className="relative">
          <input
            type="text" value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage(input)}
            placeholder="Ask about revenue, occupancy, pricing..."
            disabled={isTyping}
            className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0066ff]/20 disabled:opacity-60"
          />
          <button onClick={() => sendMessage(input)} disabled={!input.trim() || isTyping}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-[#0066ff] text-white rounded-lg hover:bg-[#0052cc] disabled:opacity-30">
            <Send size={16} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
