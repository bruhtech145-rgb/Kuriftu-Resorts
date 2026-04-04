/**
 * Kuriftu AI Agent Cron — runs every 30 minutes.
 * Analyzes live resort data, generates alerts, updates pricing recommendations,
 * and writes insights to the admin_alerts table so the dashboard stays fresh.
 *
 * Also callable manually via POST from the admin dashboard.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.101.1';

const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN') || '';
const OPERATOR_CHAT_ID = Deno.env.get('OPERATOR_CHAT_ID') || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ─── Ethiopian Calendar (inline for edge function) ───

const FIXED_EVENTS: Record<string, { name: string; nameAmharic: string; type: string; multiplier: number }> = {
  '01-07': { name: 'Genna (Christmas)', nameAmharic: 'ገና', type: 'holiday', multiplier: 1.6 },
  '01-19': { name: 'Timkat', nameAmharic: 'ጥምቀት', type: 'holiday', multiplier: 1.8 },
  '04-13': { name: 'Fasika (Easter)', nameAmharic: 'ፋሲካ', type: 'holiday', multiplier: 1.7 },
  '09-11': { name: 'Enkutatash (New Year)', nameAmharic: 'እንቁጣጣሽ', type: 'holiday', multiplier: 1.7 },
  '09-27': { name: 'Meskel', nameAmharic: 'መስቀል', type: 'holiday', multiplier: 1.6 },
};

function getEvents(date: Date) {
  const mmdd = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const events = [];
  if (FIXED_EVENTS[mmdd]) events.push(FIXED_EVENTS[mmdd]);
  const dow = date.getDay();
  if (dow === 3 || dow === 5) events.push({ name: dow === 3 ? 'Wednesday Fast' : 'Friday Fast', nameAmharic: '', type: 'fasting', multiplier: 1.0 });
  return events;
}

function getUpcomingEvents(days: number) {
  const events = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(); d.setDate(d.getDate() + i);
    for (const e of getEvents(d)) {
      if (e.type === 'holiday') events.push({ ...e, date: d.toISOString().split('T')[0], daysAway: i });
    }
  }
  return events;
}

// ─── Data Analysis ───

async function analyzeResortData() {
  const now = new Date();
  const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0);
  const next7Days = new Date(now); next7Days.setDate(now.getDate() + 7);

  const [
    { data: allBookings },
    { data: todayBookings },
    { data: upcomingBookings },
    { data: cancelledBookings },
    { data: services },
    { data: members },
  ] = await Promise.all([
    supabase.from('bookings').select('*, services(name, category_id)').order('created_at', { ascending: false }),
    supabase.from('bookings').select('*').gte('created_at', startOfDay.toISOString()),
    supabase.from('bookings').select('*, services(name, category_id)').gte('start_date', now.toISOString()).lte('start_date', next7Days.toISOString()).eq('status', 'Confirmed'),
    supabase.from('bookings').select('*').eq('status', 'Cancelled'),
    supabase.from('services').select('*').eq('status', 'Active'),
    supabase.from('members').select('*'),
  ]);

  const confirmed = (allBookings || []).filter(b => b.status !== 'Cancelled');
  const totalRevenue = confirmed.reduce((s, b) => s + (b.final_price || 0), 0);
  const todayRevenue = (todayBookings || []).filter(b => b.status !== 'Cancelled').reduce((s, b) => s + (b.final_price || 0), 0);
  const roomBookings = (upcomingBookings || []).filter(b => (b.services as any)?.category_id === 'Rooms');
  const occupancyRate = Math.min(100, Math.round((roomBookings.length / 42) * 100));
  const cancellationRate = (allBookings || []).length > 0 ? Math.round(((cancelledBookings || []).length / (allBookings || []).length) * 100) : 0;
  const todayEvents = getEvents(now);
  const upcoming = getUpcomingEvents(7);

  // New members this week
  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
  const newMembers = (members || []).filter(m => new Date(m.created_at || 0) > weekAgo);

  return {
    totalBookings: confirmed.length,
    todayBookings: (todayBookings || []).length,
    todayRevenue,
    totalRevenue,
    occupancyRate,
    cancellationRate,
    totalMembers: (members || []).length,
    newMembers: newMembers.length,
    totalServices: (services || []).length,
    upcomingBookings: (upcomingBookings || []).length,
    todayEvents,
    upcomingEvents: upcoming,
    now,
  };
}

// ─── Generate Alerts ───

interface Alert {
  type: 'urgent' | 'warning' | 'info' | 'success' | 'ai_update';
  title: string;
  message: string;
  action: string | null;
  source: string;
}

function generateAlerts(data: Awaited<ReturnType<typeof analyzeResortData>>): Alert[] {
  const alerts: Alert[] = [];
  const hour = data.now.getHours();

  // High cancellation
  if (data.cancellationRate > 20) {
    alerts.push({ type: 'urgent', title: 'High Cancellation Rate', message: `${data.cancellationRate}% cancellation rate detected. Investigate — potential pricing or service issue.`, action: 'Review cancellations', source: 'ai-cron' });
  }

  // Low occupancy
  if (data.occupancyRate < 30) {
    alerts.push({ type: 'warning', title: 'Low Occupancy Warning', message: `Only ${data.occupancyRate}% occupancy this week. Consider flash sales or promotional packages to drive bookings.`, action: 'Launch promotion', source: 'ai-cron' });
  }

  // High occupancy opportunity
  if (data.occupancyRate > 80) {
    alerts.push({ type: 'success', title: 'High Demand — Revenue Opportunity', message: `${data.occupancyRate}% occupancy! Apply premium pricing to maximize yield. Estimated +15-20% revenue uplift.`, action: 'Apply dynamic pricing', source: 'ai-cron' });
  }

  // Ethiopian holidays approaching
  for (const event of data.upcomingEvents) {
    if (event.daysAway <= 3 && event.daysAway > 0) {
      alerts.push({ type: 'warning', title: `${event.name} in ${event.daysAway} day(s)`, message: `${event.name} (${event.nameAmharic}) on ${event.date}. Expected ${event.multiplier}x demand spike. Increase staffing, prepare feast menu, adjust pricing.`, action: 'Prepare for holiday', source: 'ai-cron' });
    }
  }

  // Fasting day
  if (data.todayEvents.some(e => e.type === 'fasting')) {
    alerts.push({ type: 'info', title: 'Fasting Day — Menu Alert', message: 'Today is an Orthodox fasting day. Ensure vegan/vegetarian options are prominently displayed in all restaurants.', action: 'Update menu display', source: 'ai-cron' });
  }

  // No bookings today (after 10am)
  if (data.todayBookings === 0 && hour >= 10) {
    alerts.push({ type: 'warning', title: 'Zero Bookings Today', message: `No bookings received yet today (${hour}:00). Consider sending push notifications or running a time-limited offer.`, action: 'Send promotion', source: 'ai-cron' });
  }

  // New members milestone
  if (data.newMembers >= 5) {
    alerts.push({ type: 'success', title: `${data.newMembers} New Members This Week`, message: `Strong guest acquisition! Send personalized welcome offers to convert signups into bookings.`, action: 'Send welcome campaign', source: 'ai-cron' });
  }

  // Morning briefing (6-8am runs)
  if (hour >= 6 && hour <= 8) {
    alerts.push({ type: 'ai_update', title: 'Morning Briefing', message: `Good morning! ${data.occupancyRate}% occupancy, ${data.upcomingBookings} upcoming bookings, ETB ${data.totalRevenue.toLocaleString()} total revenue. ${data.upcomingEvents.length > 0 ? `Upcoming: ${data.upcomingEvents.map(e => e.name).join(', ')}.` : 'No major events this week.'}`, action: null, source: 'ai-cron' });
  }

  return alerts;
}

// ─── AI Summary via Groq ───

async function generateSummary(data: Awaited<ReturnType<typeof analyzeResortData>>, alerts: Alert[]): Promise<string> {
  if (!GROQ_API_KEY) return `Agent run complete. ${alerts.length} alerts generated.`;

  const prompt = `You are the AI agent for Kuriftu Resorts. Write a 2-sentence operations update based on:
- Occupancy: ${data.occupancyRate}%
- Today's bookings: ${data.todayBookings}, revenue: ETB ${data.todayRevenue.toLocaleString()}
- Total active: ${data.totalBookings} bookings
- Cancellation rate: ${data.cancellationRate}%
- Members: ${data.totalMembers} (${data.newMembers} new this week)
- Events: ${data.todayEvents.map(e => e.name).join(', ') || 'none today'}
- Upcoming: ${data.upcomingEvents.map(e => `${e.name} in ${e.daysAway}d`).join(', ') || 'none'}
- Alerts: ${alerts.length} (${alerts.filter(a => a.type === 'urgent').length} urgent)

Be concise and actionable. Ethiopian context.`;

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'user', content: prompt }], temperature: 0.7, max_tokens: 200 }),
    });
    if (!res.ok) throw new Error('Groq error');
    const result = await res.json();
    return result.choices[0]?.message?.content || `Agent run: ${alerts.length} alerts.`;
  } catch {
    return `Agent run complete. ${alerts.length} alerts generated. ${data.occupancyRate}% occupancy.`;
  }
}

// ─── Notify Operator via Telegram ───

async function notifyOperator(summary: string, urgentAlerts: Alert[]) {
  if (!TELEGRAM_BOT_TOKEN || !OPERATOR_CHAT_ID) return;

  let msg = `🤖 *Kuriftu AI Agent Update*\n\n${summary}`;
  if (urgentAlerts.length > 0) {
    msg += '\n\n⚠️ *Urgent Alerts:*';
    for (const a of urgentAlerts) msg += `\n• ${a.title}: ${a.message}`;
  }

  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: OPERATOR_CHAT_ID, text: msg, parse_mode: 'Markdown' }),
  }).catch(() => {});
}

// ─── Write Alerts to DB ───

async function persistAlerts(alerts: Alert[], summary: string) {
  // Clear old cron alerts (keep manual ones)
  await supabase.from('admin_alerts').delete().eq('source', 'ai-cron');

  // Insert fresh alerts
  const rows = alerts.map(a => ({
    type: a.type,
    title: a.title,
    message: a.message,
    action: a.action,
    source: a.source,
    is_read: false,
  }));

  if (rows.length > 0) {
    await supabase.from('admin_alerts').insert(rows);
  }

  // Save summary
  await supabase.from('admin_alerts').insert({
    type: 'ai_update',
    title: 'AI Agent Summary',
    message: summary,
    action: null,
    source: 'ai-cron',
    is_read: false,
  });
}

// ─── Main Handler ───

Deno.serve(async (req: Request) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('🤖 AI Agent Cron starting...');

    // 1. Analyze data
    const data = await analyzeResortData();

    // 2. Generate alerts
    const alerts = generateAlerts(data);

    // 3. AI summary
    const summary = await generateSummary(data, alerts);

    // 4. Persist to DB
    await persistAlerts(alerts, summary);

    // 5. Notify operator on Telegram (urgent alerts only)
    const urgent = alerts.filter(a => a.type === 'urgent' || a.type === 'warning');
    if (urgent.length > 0) {
      await notifyOperator(summary, urgent);
    }

    console.log(`✅ Agent done: ${alerts.length} alerts, ${urgent.length} urgent`);

    return new Response(
      JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        alerts: alerts.length,
        urgent: urgent.length,
        summary,
        data: {
          occupancy: data.occupancyRate,
          todayRevenue: data.todayRevenue,
          totalBookings: data.totalBookings,
          upcomingEvents: data.upcomingEvents.length,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Agent error:', error);
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
