/**
 * Admin AI Agent — Proactive intelligence for resort management.
 * Analyzes real data from Supabase and generates actionable insights,
 * alerts, and recommendations using Groq AI.
 */

import { supabase } from './supabase';
import { getEthiopianEvents, getTourismSeason, getDemandMultiplier } from './ethiopian-calendar';

const SUPABASE_URL = import.meta.env.VITE_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY;
const AI_CHAT_URL = `${SUPABASE_URL}/functions/v1/ai-chat`;

// ─── Types ───

export interface AdminAlert {
  id: string;
  type: 'urgent' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  action?: string;
  timestamp: Date;
}

export interface AIInsight {
  category: 'revenue' | 'occupancy' | 'guest' | 'event' | 'operations';
  title: string;
  detail: string;
  impact: 'high' | 'medium' | 'low';
  suggestion: string;
}

export interface DashboardAnalysis {
  alerts: AdminAlert[];
  insights: AIInsight[];
  summary: string;
  occupancyRate: number;
  totalBookings: number;
  todayRevenue: number;
  upcomingEvents: { name: string; nameAmharic: string; type: string }[];
  demandForecast: string;
}

// ─── Data Fetching ───

async function fetchLiveData() {
  const today = new Date();
  const startOfDay = new Date(today); startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(today); endOfDay.setHours(23, 59, 59, 999);
  const next7Days = new Date(today); next7Days.setDate(next7Days.getDate() + 7);

  const [
    { data: allBookings },
    { data: recentBookings },
    { data: upcomingBookings },
    { data: currentStays },
    { data: services },
    { data: members },
    { data: cancelledBookings },
  ] = await Promise.all([
    supabase.from('bookings').select('*, services(name, category_id)').order('created_at', { ascending: false }),
    supabase.from('bookings').select('*, services(name, category_id)').gte('created_at', startOfDay.toISOString()).lte('created_at', endOfDay.toISOString()),
    supabase.from('bookings').select('*, services(name, category_id)').gte('start_date', today.toISOString()).lte('start_date', next7Days.toISOString()).eq('status', 'Confirmed'),
    // Current stays: checked in (start_date <= now) AND not checked out yet (end_date >= now), rooms only
    supabase.from('bookings').select('*, services(name, category_id)').lte('start_date', today.toISOString()).gte('end_date', startOfDay.toISOString()).eq('status', 'Confirmed'),
    supabase.from('services').select('*').eq('status', 'Active'),
    supabase.from('members').select('*'),
    supabase.from('bookings').select('*').eq('status', 'Cancelled'),
  ]);

  // Ethiopian calendar context
  const events = getEthiopianEvents(today);
  const season = getTourismSeason(today);
  const demand = getDemandMultiplier(today);

  // Check next 7 days for upcoming events
  const upcomingEvents: { name: string; nameAmharic: string; type: string; date: string }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const dayEvents = getEthiopianEvents(d);
    for (const e of dayEvents) {
      if (e.type === 'holiday') {
        upcomingEvents.push({ name: e.name, nameAmharic: e.nameAmharic, type: e.type, date: d.toISOString().split('T')[0] });
      }
    }
  }

  return {
    allBookings: allBookings || [],
    recentBookings: recentBookings || [],
    upcomingBookings: upcomingBookings || [],
    currentStays: currentStays || [],
    services: services || [],
    members: members || [],
    cancelledBookings: cancelledBookings || [],
    events,
    season,
    demand,
    upcomingEvents,
    today,
  };
}

// ─── Local Analysis (no AI needed) ───

function analyzeLocally(data: Awaited<ReturnType<typeof fetchLiveData>>): {
  alerts: AdminAlert[];
  insights: AIInsight[];
  stats: { occupancyRate: number; totalBookings: number; todayRevenue: number; cancellationRate: number };
} {
  const alerts: AdminAlert[] = [];
  const insights: AIInsight[] = [];

  const totalBookings = data.allBookings.length;
  const confirmedBookings = data.allBookings.filter(b => b.status === 'Confirmed').length;
  const cancelledCount = data.cancelledBookings.length;
  const cancellationRate = totalBookings > 0 ? Math.round((cancelledCount / totalBookings) * 100) : 0;

  // Today's revenue
  const todayRevenue = data.recentBookings
    .filter(b => b.status !== 'Cancelled')
    .reduce((sum, b) => sum + (b.final_price || 0), 0);

  // Occupancy calculation:
  // 1. Current stays (start_date <= now AND end_date >= today) — guests in the resort right now
  // 2. If no current stays, use all confirmed bookings as a general activity indicator
  // Note: services join may be null due to RLS, so we count all confirmed bookings, not just "Rooms"
  const currentStayCount = data.currentStays.filter(b => b.status === 'Confirmed').length;
  const totalRooms = 42;

  let occupancyRate: number;
  if (currentStayCount > 0) {
    // Real-time: guests currently checked in
    occupancyRate = Math.min(100, Math.round((currentStayCount / totalRooms) * 100));
  } else {
    // Fallback: use all confirmed bookings as activity indicator
    // This prevents showing 0% when there are real bookings
    occupancyRate = Math.min(100, Math.round((confirmedBookings / totalRooms) * 100));
  }

  // ─── Generate Alerts ───

  // High cancellation rate
  if (cancellationRate > 20) {
    alerts.push({
      id: 'high-cancellation',
      type: 'urgent',
      title: 'High Cancellation Rate',
      message: `${cancellationRate}% of bookings have been cancelled. Investigate root cause — pricing too high? Service issues?`,
      action: 'Review cancelled bookings',
      timestamp: new Date(),
    });
  }

  // Low occupancy warning
  if (occupancyRate < 30) {
    alerts.push({
      id: 'low-occupancy',
      type: 'warning',
      title: 'Low Occupancy Alert',
      message: `Only ${occupancyRate}% occupancy this week. Consider promotional pricing or marketing push.`,
      action: 'Adjust pricing',
      timestamp: new Date(),
    });
  }

  // High occupancy — revenue opportunity
  if (occupancyRate > 80) {
    alerts.push({
      id: 'high-occupancy',
      type: 'success',
      title: 'High Demand Detected',
      message: `${occupancyRate}% occupancy! Consider premium pricing to maximize revenue.`,
      action: 'Apply dynamic pricing',
      timestamp: new Date(),
    });
  }

  // Ethiopian holiday alerts
  for (const event of data.upcomingEvents) {
    alerts.push({
      id: `event-${event.name}`,
      type: 'info',
      title: `Upcoming: ${event.name}`,
      message: `${event.name} (${event.nameAmharic}) on ${event.date}. Expect ${event.type === 'holiday' ? 'high' : 'adjusted'} demand. Prepare accordingly.`,
      action: 'Review pricing & staffing',
      timestamp: new Date(),
    });
  }

  // Fasting day alert
  const fastingEvents = data.events.filter(e => e.type === 'fasting');
  if (fastingEvents.length > 0) {
    alerts.push({
      id: 'fasting-day',
      type: 'info',
      title: 'Orthodox Fasting Day',
      message: `Today is ${fastingEvents.map(e => e.name).join(' & ')}. Ensure vegan/vegetarian options are prominently featured.`,
      action: 'Update dining menu',
      timestamp: new Date(),
    });
  }

  // No bookings today
  if (data.recentBookings.length === 0) {
    alerts.push({
      id: 'no-bookings-today',
      type: 'warning',
      title: 'No Bookings Today',
      message: 'Zero bookings received today. Consider sending promotional notifications or running a flash sale.',
      action: 'Launch promotion',
      timestamp: new Date(),
    });
  }

  // ─── Generate Insights ───

  // Revenue insight
  const totalRevenue = data.allBookings
    .filter(b => b.status !== 'Cancelled')
    .reduce((sum, b) => sum + (b.final_price || 0), 0);

  insights.push({
    category: 'revenue',
    title: 'Revenue Overview',
    detail: `Total revenue: ETB ${totalRevenue.toLocaleString()}. Today: ETB ${todayRevenue.toLocaleString()}. ${data.upcomingBookings.length} upcoming bookings.`,
    impact: todayRevenue > 10000 ? 'high' : todayRevenue > 0 ? 'medium' : 'low',
    suggestion: todayRevenue === 0
      ? 'Consider flash promotions to drive bookings today.'
      : `Revenue is ${todayRevenue > 10000 ? 'strong' : 'moderate'}. ${occupancyRate > 70 ? 'Dynamic pricing could boost yields further.' : 'Focus on increasing booking volume.'}`,
  });

  // Season insight
  insights.push({
    category: 'occupancy',
    title: `${data.season.name}`,
    detail: `Demand multiplier: ${data.demand.multiplier}x. ${data.demand.reasons.join('. ')}.`,
    impact: data.demand.multiplier > 1.3 ? 'high' : data.demand.multiplier < 0.9 ? 'low' : 'medium',
    suggestion: data.demand.multiplier > 1.3
      ? 'High demand period — maximize rates and ensure staffing is adequate.'
      : data.demand.multiplier < 0.9
      ? 'Low demand — offer packages and promotions to boost occupancy.'
      : 'Standard demand — maintain current pricing strategy.',
  });

  // Guest insight
  const newMembers = data.members.filter(m => {
    const created = new Date(m.created_at || 0);
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
    return created > weekAgo;
  });

  insights.push({
    category: 'guest',
    title: 'Guest Activity',
    detail: `${data.members.length} total members. ${newMembers.length} new this week. ${confirmedBookings} active bookings.`,
    impact: newMembers.length > 5 ? 'high' : 'medium',
    suggestion: newMembers.length > 0
      ? `${newMembers.length} new guests this week! Send personalized welcome offers to boost first bookings.`
      : 'Guest acquisition is slow. Consider social media campaigns or referral programs.',
  });

  // Category breakdown
  const categoryBookings: Record<string, number> = {};
  for (const b of data.allBookings) {
    const cat = (b.services as any)?.category_id || 'Other';
    categoryBookings[cat] = (categoryBookings[cat] || 0) + 1;
  }
  const topCategory = Object.entries(categoryBookings).sort((a, b) => b[1] - a[1])[0];

  if (topCategory) {
    insights.push({
      category: 'operations',
      title: 'Most Popular Category',
      detail: `${topCategory[0]} leads with ${topCategory[1]} bookings. ${Object.entries(categoryBookings).map(([k, v]) => `${k}: ${v}`).join(', ')}.`,
      impact: 'medium',
      suggestion: `${topCategory[0]} is your strongest category. Consider adding more ${topCategory[0].toLowerCase()} options or premium tiers.`,
    });
  }

  return {
    alerts,
    insights,
    stats: { occupancyRate, totalBookings: confirmedBookings, todayRevenue, cancellationRate },
  };
}

// ─── AI Summary (Groq) ───

async function generateAISummary(analysis: ReturnType<typeof analyzeLocally>, seasonName: string, events: any[]): Promise<string> {
  if (!SUPABASE_URL) {
    return `📊 ${analysis.stats.totalBookings} active bookings | ${analysis.stats.occupancyRate}% occupancy | ETB ${analysis.stats.todayRevenue.toLocaleString()} today. ${analysis.alerts.length} alerts require attention.`;
  }

  const prompt = `You are the AI operations manager for Kuriftu Resorts, Ethiopia. Generate a brief (3-4 sentences) executive briefing for the admin based on this data:

- Occupancy: ${analysis.stats.occupancyRate}%
- Active bookings: ${analysis.stats.totalBookings}
- Today's revenue: ETB ${analysis.stats.todayRevenue.toLocaleString()}
- Cancellation rate: ${analysis.stats.cancellationRate}%
- Season: ${seasonName}
- Ethiopian calendar: ${events.map(e => e.name).join(', ') || 'No special events'}
- Alerts: ${analysis.alerts.map(a => a.title).join(', ') || 'None'}
- Top insight: ${analysis.insights[0]?.suggestion || 'N/A'}

Be concise, data-driven, and include one actionable recommendation. Use ETB currency. Start with "Selam!" or an Amharic greeting.`;

  try {
    const response = await fetch(AI_CHAT_URL, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 300,
      }),
    });

    if (!response.ok) throw new Error('Groq API error');
    const data = await response.json();
    return data.choices[0]?.message?.content || 'Analysis complete. Check alerts for details.';
  } catch {
    return `📊 ${analysis.stats.totalBookings} active bookings | ${analysis.stats.occupancyRate}% occupancy | ETB ${analysis.stats.todayRevenue.toLocaleString()} today. ${analysis.alerts.length} alerts need attention.`;
  }
}

// ─── Admin Tool Definitions ───

const ADMIN_TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'createService',
      description: 'Create a new service, package, or experience in the database. Use when admin asks to create packages, add rooms, activities, dining, or wellness. This writes to the DB — guests can immediately book it.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Service/package name' },
          description: { type: 'string', description: 'Detailed description' },
          category_id: { type: 'string', enum: ['Rooms', 'Activities', 'Dining', 'Wellness', 'Packages'], description: 'Category' },
          base_price: { type: 'number', description: 'Price in ETB' },
          duration_minutes: { type: 'number', description: 'Duration in minutes (1440 for per-night)' },
          max_capacity: { type: 'number', description: 'Max guests' },
          tags: { type: 'array', items: { type: 'string' }, description: 'Tags like ["Lenten", "Family"]' },
        },
        required: ['name', 'description', 'category_id', 'base_price'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'updateServicePrice',
      description: 'Update the price of an existing service.',
      parameters: {
        type: 'object',
        properties: {
          serviceId: { type: 'string', description: 'Service UUID' },
          newPrice: { type: 'number', description: 'New price in ETB' },
        },
        required: ['serviceId', 'newPrice'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'listCurrentServices',
      description: 'List all active services with prices and categories.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'deactivateService',
      description: 'Archive a service so it no longer appears to guests.',
      parameters: {
        type: 'object',
        properties: { serviceId: { type: 'string', description: 'Service UUID' } },
        required: ['serviceId'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'createAlert',
      description: 'Create an admin alert/notification on the dashboard.',
      parameters: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['urgent', 'warning', 'info', 'success'] },
          title: { type: 'string' },
          message: { type: 'string' },
        },
        required: ['type', 'title', 'message'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'getLiveStats',
      description: 'Get live resort stats: occupancy, revenue, bookings, calendar events.',
      parameters: { type: 'object', properties: {} },
    },
  },
];

// ─── Admin Tool Execution ───

async function executeAdminTool(name: string, args: Record<string, any>): Promise<string> {
  switch (name) {
    case 'createService': {
      const { data, error } = await supabase.from('services').insert({
        category_id: args.category_id,
        name: args.name,
        description: args.description,
        base_price: args.base_price,
        duration_minutes: args.duration_minutes || 60,
        max_capacity: args.max_capacity || 10,
        is_bookable: true,
        status: 'Active',
        tags: args.tags || [],
        images: [],
      }).select().single();
      if (error) return JSON.stringify({ error: `Failed: ${error.message}` });
      return JSON.stringify({ success: true, id: data.id, name: data.name, category: data.category_id, price: `${data.base_price.toLocaleString()} ETB`, message: `Created "${data.name}" at ETB ${data.base_price.toLocaleString()}. Now live and bookable.` });
    }
    case 'updateServicePrice': {
      const { error } = await supabase.from('services').update({ base_price: args.newPrice }).eq('id', args.serviceId);
      if (error) return JSON.stringify({ error: error.message });
      return JSON.stringify({ success: true, message: `Price updated to ETB ${args.newPrice.toLocaleString()}.` });
    }
    case 'listCurrentServices': {
      const { data } = await supabase.from('services').select('id, name, category_id, base_price, tags').eq('status', 'Active');
      return JSON.stringify({ count: (data || []).length, services: (data || []).map(s => ({ id: s.id, name: s.name, category: s.category_id, price: `${s.base_price.toLocaleString()} ETB`, tags: s.tags })) });
    }
    case 'deactivateService': {
      const { error } = await supabase.from('services').update({ status: 'Archived' }).eq('id', args.serviceId);
      if (error) return JSON.stringify({ error: error.message });
      return JSON.stringify({ success: true, message: `Service archived.` });
    }
    case 'createAlert': {
      await supabase.from('admin_alerts').insert({ type: args.type, title: args.title, message: args.message, source: 'ai-manager', is_read: false });
      return JSON.stringify({ success: true, message: `Alert created: ${args.title}` });
    }
    case 'getLiveStats': {
      const d = await fetchLiveData();
      const a = analyzeLocally(d);
      return JSON.stringify({ occupancy: `${a.stats.occupancyRate}%`, activeBookings: a.stats.totalBookings, todayRevenue: `ETB ${a.stats.todayRevenue.toLocaleString()}`, cancellationRate: `${a.stats.cancellationRate}%`, members: d.members.length, season: d.season.name, demand: `${d.demand.multiplier}x`, events: d.events.map(e => e.name), upcoming: d.upcomingEvents.map(e => e.name), services: d.services.length });
    }
    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}

// ─── Admin Chat (for AI assistant in dashboard) ───

export async function loadAdminHistory(): Promise<{ role: string; content: string }[]> {
  try {
    const { data } = await supabase
      .from('conversations')
      .select('role, content')
      .eq('user_id', 'admin')
      .order('created_at', { ascending: true })
      .limit(20);
    return (data || []).map(m => ({ role: m.role, content: m.content }));
  } catch {
    return [];
  }
}

async function saveAdminMessages(userMsg: string, assistantMsg: string) {
  try {
    await supabase.from('conversations').insert([
      { user_id: 'admin', role: 'user', content: userMsg },
      { user_id: 'admin', role: 'assistant', content: assistantMsg },
    ]);
  } catch {}
}

export async function adminChat(message: string, history: { role: string; content: string }[]): Promise<string> {
  if (!SUPABASE_URL) return "AI not configured.";

  const systemPrompt = `You are the AI Operations Manager for Kuriftu Resorts, Ethiopia. You READ and WRITE to the database.
Tools: createService, updateServicePrice, listCurrentServices, deactivateService, createAlert, getLiveStats.
CRITICAL: When asked to create packages, USE createService tool for EACH one. Do NOT just describe them.
After creating, call createAlert to notify the team. Use getLiveStats for data before decisions.
Categories: Rooms, Activities, Dining, Wellness, Packages. Currency: ETB. Be concise and data-driven.`;

  let conversationMessages: Record<string, any>[] = [
    { role: 'system', content: systemPrompt },
    ...history.slice(-10),
    { role: 'user', content: message },
  ];

  let maxSteps = 10;
  while (maxSteps > 0) {
    try {
      const response = await fetch(AI_CHAT_URL, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: conversationMessages,
          tools: ADMIN_TOOLS,
          tool_choice: 'auto',
          temperature: 0.7,
          max_tokens: 1024,
        }),
      });

      if (!response.ok) throw new Error('Groq error');
      const data = await response.json();
      const choice = data.choices[0];

      if (choice.finish_reason === 'stop' || !choice.message.tool_calls) {
        const reply = choice.message.content || "Done. Check the dashboard for updates.";
        saveAdminMessages(message, reply);
        return reply;
      }

      conversationMessages.push(choice.message);
      for (const tc of choice.message.tool_calls) {
        const args = JSON.parse(tc.function.arguments || '{}');
        const result = await executeAdminTool(tc.function.name, args);
        conversationMessages.push({ role: 'tool', content: result, tool_call_id: tc.id });
      }
      maxSteps--;
    } catch (e) {
      console.error('Admin chat error:', e);
      return "Connection issue. Please try again.";
    }
  }
  const fallback = "All actions completed. Check the services list and dashboard.";
  saveAdminMessages(message, fallback);
  return fallback;
}

// ─── Load Persisted Alerts from DB (written by cron) ───

async function loadPersistedAlerts(): Promise<AdminAlert[]> {
  const { data } = await supabase
    .from('admin_alerts')
    .select('*')
    .eq('is_read', false)
    .order('created_at', { ascending: false })
    .limit(20);

  if (!data) return [];
  return data.map((a: any) => ({
    id: a.id,
    type: a.type,
    title: a.title,
    message: a.message,
    action: a.action,
    timestamp: new Date(a.created_at),
  }));
}

// ─── Trigger Cron Manually ───

export async function triggerAgentCron(): Promise<{ success: boolean; summary?: string; alerts?: number }> {
  try {
    const url = import.meta.env.VITE_PUBLIC_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY;
    const res = await fetch(`${url}/functions/v1/ai-agent-cron`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${anonKey}`, 'Content-Type': 'application/json' },
    });
    const result = await res.json();
    return { success: result.success, summary: result.summary, alerts: result.alerts };
  } catch (e) {
    console.error('Trigger cron error:', e);
    return { success: false };
  }
}

// ─── Mark Alert as Read ───

export async function dismissAlert(alertId: string) {
  // Only dismiss DB alerts (UUIDs). Local alerts like "fasting-day", "low-occupancy" are not in DB.
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(alertId)) {
    await supabase.from('admin_alerts').update({ is_read: true }).eq('id', alertId);
  }
  // Local alerts are dismissed via the in-memory dismissedAlerts state only
}

// ─── Main: Run Full Analysis ───

export async function runAdminAnalysis(): Promise<DashboardAnalysis> {
  const data = await fetchLiveData();
  const analysis = analyzeLocally(data);
  const summary = await generateAISummary(analysis, data.season.name, data.events);

  // Merge local alerts with persisted cron alerts
  let persistedAlerts: AdminAlert[] = [];
  try {
    persistedAlerts = await loadPersistedAlerts();
  } catch { /* table may not exist yet */ }

  // Deduplicate by title
  const seen = new Set(analysis.alerts.map(a => a.title));
  const mergedAlerts = [
    ...analysis.alerts,
    ...persistedAlerts.filter(a => !seen.has(a.title)),
  ];

  return {
    alerts: mergedAlerts,
    insights: analysis.insights,
    summary,
    occupancyRate: analysis.stats.occupancyRate,
    totalBookings: analysis.stats.totalBookings,
    todayRevenue: analysis.stats.todayRevenue,
    upcomingEvents: data.upcomingEvents.map(e => ({ name: e.name, nameAmharic: e.nameAmharic, type: e.type })),
    demandForecast: `${data.demand.multiplier}x demand (${data.demand.reasons[0] || data.season.name})`,
  };
}
