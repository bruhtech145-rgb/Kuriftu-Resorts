/**
 * Kuriftu Resorts — Telegram AI Concierge Bot
 * Supabase Edge Function that handles Telegram webhook messages.
 *
 * Uses Groq (llama-3.3-70b) for AI with tool-calling to book services,
 * list experiences, and answer questions about Ethiopian culture.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.101.1';

// ─── Config ───
const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN') || '';
const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const OPERATOR_PASSWORD = Deno.env.get('OPERATOR_PASSWORD') || 'kuriftu2026admin';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ─── Ethiopian Calendar ───

interface EthiopianEvent {
  name: string;
  nameAmharic: string;
  type: string;
  demandMultiplier: number;
  fbImpact: string;
}

const FIXED_EVENTS: Record<string, EthiopianEvent> = {
  '01-07': { name: 'Ethiopian Christmas (Genna)', nameAmharic: 'ገና', type: 'holiday', demandMultiplier: 1.6, fbImpact: 'feast_menu' },
  '01-19': { name: 'Timkat (Epiphany)', nameAmharic: 'ጥምቀት', type: 'holiday', demandMultiplier: 1.8, fbImpact: 'feast_menu' },
  '04-13': { name: 'Ethiopian Easter (Fasika)', nameAmharic: 'ፋሲካ', type: 'holiday', demandMultiplier: 1.7, fbImpact: 'feast_menu' },
  '09-11': { name: 'Ethiopian New Year (Enkutatash)', nameAmharic: 'እንቁጣጣሽ', type: 'holiday', demandMultiplier: 1.7, fbImpact: 'feast_menu' },
  '09-27': { name: 'Meskel', nameAmharic: 'መስቀል', type: 'holiday', demandMultiplier: 1.6, fbImpact: 'feast_menu' },
};

function getEthiopianEvents(date: Date): EthiopianEvent[] {
  const mmdd = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const events: EthiopianEvent[] = [];
  if (FIXED_EVENTS[mmdd]) events.push(FIXED_EVENTS[mmdd]);
  const dow = date.getDay();
  if (dow === 3 || dow === 5) {
    events.push({ name: dow === 3 ? 'Wednesday Fast' : 'Friday Fast', nameAmharic: dow === 3 ? 'ረቡዕ ጾም' : 'ዓርብ ጾም', type: 'fasting', demandMultiplier: 1.0, fbImpact: 'fasting_menu' });
  }
  return events;
}

// ─── Telegram Helpers ───

async function send(chatId: number, text: string) {
  if (!BOT_TOKEN) return;
  const safe = text.replace(/\*\*(.+?)\*\*/g, '*$1*');
  const chunks: string[] = [];
  for (let i = 0; i < safe.length; i += 4000) chunks.push(safe.slice(i, i + 4000));
  for (const chunk of chunks) {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: chunk, parse_mode: 'Markdown' }),
    });
    if (!res.ok) {
      // Retry without markdown if parse fails
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: chunk }),
      });
    }
  }
}

async function typing(chatId: number) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendChatAction`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, action: 'typing' }),
  });
}

// ─── Conversation Memory (Supabase) ───

async function getConversation(chatId: number): Promise<{ role: string; content: string }[]> {
  const { data } = await supabase
    .from('telegram_conversations')
    .select('role, content')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: true })
    .limit(20);
  return data || [];
}

async function saveMessage(chatId: number, role: string, content: string) {
  await supabase.from('telegram_conversations').insert({ chat_id: chatId, role, content });
}

async function clearConversation(chatId: number) {
  await supabase.from('telegram_conversations').delete().eq('chat_id', chatId);
}

// ─── Tool Definitions (Groq/OpenAI format) ───

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'listServices',
      description: 'List available services at Kuriftu Resorts: rooms, activities, dining, wellness.',
      parameters: {
        type: 'object',
        properties: {
          category: { type: 'string', description: 'Filter: Rooms, Activities, Dining, Wellness' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'bookService',
      description: 'Book a service for the guest. Confirm details first.',
      parameters: {
        type: 'object',
        properties: {
          serviceId: { type: 'string', description: 'Service UUID' },
          guestName: { type: 'string', description: 'Guest name' },
          startDate: { type: 'string', description: 'Start date YYYY-MM-DD' },
          endDate: { type: 'string', description: 'End date (rooms) YYYY-MM-DD' },
          guestCount: { type: 'number', description: 'Number of guests' },
        },
        required: ['serviceId', 'guestName', 'startDate'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getBookings',
      description: 'List bookings. For guests: their bookings. For operators: all bookings.',
      parameters: {
        type: 'object',
        properties: {
          guestName: { type: 'string', description: 'Filter by guest name (optional)' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'cancelBooking',
      description: 'Cancel a booking by ID.',
      parameters: {
        type: 'object',
        properties: { bookingId: { type: 'string', description: 'Booking UUID' } },
        required: ['bookingId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'checkCalendar',
      description: 'Check Ethiopian calendar events and holidays.',
      parameters: {
        type: 'object',
        properties: { date: { type: 'string', description: 'Date YYYY-MM-DD' } },
      },
    },
  },
];

// ─── Tool Execution ───

async function executeTool(name: string, args: Record<string, unknown>): Promise<string> {
  switch (name) {
    case 'listServices': {
      const query = supabase.from('services').select('id, name, category_id, description, base_price, duration_minutes').eq('status', 'Active');
      if (args.category) query.eq('category_id', args.category as string);
      const { data, error } = await query;
      if (error) return JSON.stringify({ error: error.message });
      return JSON.stringify({
        services: (data || []).map(s => ({
          id: s.id, name: s.name, category: s.category_id,
          price: `${s.base_price.toLocaleString()} ETB`,
          duration: `${s.duration_minutes} min`,
        })),
      });
    }

    case 'bookService': {
      const { serviceId, guestName, startDate, endDate, guestCount } = args as Record<string, string>;
      const { data: service } = await supabase.from('services').select('*').eq('id', serviceId).single();
      if (!service) return JSON.stringify({ error: 'Service not found. Use listServices first.' });

      const isRoom = service.category_id === 'Rooms';
      const nights = isRoom && endDate ? Math.max(1, Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000)) : isRoom ? 1 : null;
      const count = Number(guestCount) || 1;
      const finalPrice = isRoom ? service.base_price * (nights || 1) : service.base_price * count;
      const confCode = `KUR-${Math.floor(1000 + Math.random() * 9000)}`;

      // Find or create member for this guest
      let memberId: string | null = null;
      const { data: existingMembers } = await supabase.from('members').select('id').eq('full_name', guestName).limit(1);
      if (existingMembers && existingMembers.length > 0) {
        memberId = existingMembers[0].id;
      }

      const bookingData: Record<string, unknown> = {
        service_id: serviceId,
        start_date: new Date(startDate).toISOString(),
        end_date: new Date(endDate || startDate).toISOString(),
        guest_count: count,
        base_price: service.base_price,
        dynamic_price: service.base_price,
        final_price: finalPrice,
        status: 'Confirmed',
        payment_status: 'Paid',
        created_at: new Date().toISOString(),
        nights,
      };
      if (memberId) bookingData.member_id = memberId;

      const { error } = await supabase.from('bookings').insert(bookingData);
      if (error) return JSON.stringify({ error: `Booking failed: ${error.message}` });

      return JSON.stringify({
        success: true,
        confirmationCode: confCode,
        service: service.name,
        date: startDate,
        guests: count,
        nights,
        total: `${finalPrice.toLocaleString()} ETB`,
        message: `Booking confirmed! ${confCode} — ${service.name} on ${startDate}. Total: ${finalPrice.toLocaleString()} ETB`,
      });
    }

    case 'getBookings': {
      const query = supabase
        .from('bookings')
        .select('id, start_date, guest_count, final_price, status, nights, services(name, category_id)')
        .eq('status', 'Confirmed')
        .order('start_date', { ascending: false })
        .limit(10);

      const { data, error } = await query;
      if (error) return JSON.stringify({ error: error.message });
      return JSON.stringify({
        bookings: (data || []).map(b => ({
          id: b.id,
          service: (b.services as Record<string, string>)?.name,
          date: b.start_date?.split('T')[0],
          guests: b.guest_count,
          total: `${b.final_price?.toLocaleString()} ETB`,
          status: b.status,
        })),
      });
    }

    case 'cancelBooking': {
      const { error } = await supabase.from('bookings').update({ status: 'Cancelled' }).eq('id', args.bookingId as string);
      if (error) return JSON.stringify({ error: error.message });
      return JSON.stringify({ success: true, message: `Booking cancelled.` });
    }

    case 'checkCalendar': {
      const d = args.date ? new Date(args.date as string) : new Date();
      const events = getEthiopianEvents(d);
      return JSON.stringify({
        date: d.toISOString().split('T')[0],
        day: d.toLocaleDateString('en-US', { weekday: 'long' }),
        events: events.length > 0 ? events.map(e => ({ name: e.name, amharic: e.nameAmharic, type: e.type })) : [{ name: 'No special events' }],
      });
    }

    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}

// ─── AI Chat via Groq ───

async function aiChat(messages: { role: string; content: string }[]): Promise<string> {
  const today = new Date().toISOString().split('T')[0];

  const systemPrompt = `You are the AI concierge for Kuriftu Resorts, Ethiopia's premier luxury resort chain.
You know Ethiopian culture, holidays (Timkat, Meskel, Genna, Fasika, Enkutatash), fasting seasons, and local cuisine.
Use Amharic greetings naturally: "Selam!", "Egziabher yistilign". Currency: Ethiopian Birr (ETB).
Be warm, helpful, and concise. Today is ${today}.

You have tools to: list services, book experiences, check bookings, cancel bookings, and check Ethiopian calendar events.
When booking: confirm details first, then use bookService. Share the confirmation code after.
Categories: Rooms, Activities, Dining, Wellness.`;

  let conversationMessages: Record<string, unknown>[] = [
    { role: 'system', content: systemPrompt },
    ...messages.slice(-12),
  ];

  let maxSteps = 5;
  while (maxSteps > 0) {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: conversationMessages,
        tools: TOOLS,
        tool_choice: 'auto',
        temperature: 0.7,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      console.error('Groq error:', await response.text());
      return "I'm having trouble right now. Try /start or ask again.";
    }

    const data = await response.json();
    const choice = data.choices[0];

    if (choice.finish_reason === 'stop' || !choice.message.tool_calls) {
      return choice.message.content || "I'm not sure how to help with that.";
    }

    conversationMessages.push(choice.message);
    for (const tc of choice.message.tool_calls) {
      const args = JSON.parse(tc.function.arguments || '{}');
      const result = await executeTool(tc.function.name, args);
      conversationMessages.push({ role: 'tool', content: result, tool_call_id: tc.id });
    }
    maxSteps--;
  }
  return "Done! Anything else I can help with?";
}

// ─── Main Handler ───

Deno.serve(async (req: Request) => {
  // CORS for webhook setup
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, GET' } });
  }

  // GET — webhook setup & info
  if (req.method === 'GET') {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    if (action === 'setWebhook') {
      const webhookUrl = url.searchParams.get('url');
      if (!webhookUrl) return Response.json({ error: 'Provide ?url=...' }, { status: 400 });
      const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: webhookUrl }),
      });
      return Response.json(await res.json());
    }
    if (action === 'info') {
      const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`);
      return Response.json(await res.json());
    }
    return Response.json({ status: 'Kuriftu AI Telegram Bot', token: BOT_TOKEN ? 'configured' : 'MISSING' });
  }

  // POST — handle Telegram update
  try {
    if (!BOT_TOKEN) return Response.json({ ok: true });
    const update = await req.json();
    const message = update.message;
    if (!message?.text) return Response.json({ ok: true });

    const chatId: number = message.chat.id;
    const text: string = message.text.trim();
    const firstName: string = message.from?.first_name || 'Guest';

    // ─── /start ───
    if (text === '/start') {
      await clearConversation(chatId).catch(() => {});
      await send(chatId,
        `🏨 *Selam ${firstName}! Welcome to Kuriftu Resorts*\n\n` +
        `I'm your AI concierge. I can:\n` +
        `• Browse & book rooms, activities, dining, wellness\n` +
        `• Answer questions about Ethiopian culture & holidays\n` +
        `• Manage your reservations\n\n` +
        `Just tell me what you'd like to do!\n\n` +
        `Quick commands:\n/events — Ethiopian calendar\n/clear — Reset conversation`
      );
      return Response.json({ ok: true });
    }

    // ─── /clear ───
    if (text === '/clear') {
      await clearConversation(chatId).catch(() => {});
      await send(chatId, '🔄 Memory cleared. Fresh start!');
      return Response.json({ ok: true });
    }

    // ─── /events ───
    if (text === '/events') {
      await typing(chatId);
      const events = getEthiopianEvents(new Date());
      let msg = `🇪🇹 *Ethiopian Calendar Today*\n\n`;
      if (events.length === 0) msg += 'No special events today.';
      else for (const e of events) msg += `${e.type === 'holiday' ? '🎉' : '🕊️'} *${e.name}* (${e.nameAmharic})\n`;
      await send(chatId, msg);
      return Response.json({ ok: true });
    }

    // ─── AI Chat ───
    if (!GROQ_API_KEY) {
      await send(chatId, 'AI not configured. Please ask the admin to set GROQ_API_KEY.');
      return Response.json({ ok: true });
    }

    await typing(chatId);

    // Load conversation history
    let history = await getConversation(chatId).catch(() => []);
    history.push({ role: 'user', content: text });

    try {
      const reply = await aiChat(history as { role: string; content: string }[]);

      // Save to conversation memory
      await saveMessage(chatId, 'user', text).catch(() => {});
      await saveMessage(chatId, 'assistant', reply).catch(() => {});

      await send(chatId, reply);
    } catch (e) {
      console.error('AI error:', e);
      await send(chatId, `Sorry, something went wrong. Try again or use /start.`);
    }

    return Response.json({ ok: true });
  } catch (error) {
    console.error('Bot error:', error);
    return Response.json({ ok: true });
  }
});
