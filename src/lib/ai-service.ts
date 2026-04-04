/**
 * AI Service — calls Groq (llama-3.3-70b) with tool-use support.
 * Handles the agent loop: AI decides to call tools, we execute them, feed results back.
 */

import { supabase } from './supabase';
import { getEthiopianEvents, getTourismSeason, getDemandMultiplier } from './ethiopian-calendar';

const SUPABASE_URL = import.meta.env.VITE_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY;
const AI_CHAT_URL = `${SUPABASE_URL}/functions/v1/ai-chat`;

// ─── Tool Definitions (OpenAI function-calling format) ───

const TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'listServices',
      description: 'List available services and experiences at the resort. Use when guest asks what they can do, browse activities, rooms, dining, or wellness.',
      parameters: {
        type: 'object',
        properties: {
          category: { type: 'string', description: 'Filter by category: Rooms, Activities, Dining, Wellness. Omit for all.' },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'bookService',
      description: 'Book a service for the guest. Use when a guest wants to book/reserve a room, activity, dining, or wellness experience. Confirm details before booking.',
      parameters: {
        type: 'object',
        properties: {
          serviceId: { type: 'string', description: 'The service UUID to book' },
          startDate: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
          endDate: { type: 'string', description: 'End date for rooms (YYYY-MM-DD), same as startDate for activities' },
          guestCount: { type: 'number', description: 'Number of guests. Default 1.' },
        },
        required: ['serviceId', 'startDate'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'getMyBookings',
      description: 'Get the current guest\'s bookings. Use when they ask "my bookings", "my reservations", or "what did I book".',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'cancelBooking',
      description: 'Cancel a booking by its ID. Use when guest wants to cancel a reservation.',
      parameters: {
        type: 'object',
        properties: {
          bookingId: { type: 'string', description: 'The booking UUID to cancel' },
        },
        required: ['bookingId'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'checkEthiopianCalendar',
      description: 'Check Ethiopian calendar events, holidays, fasting periods for a date. Use for cultural context, event info, or holiday questions.',
      parameters: {
        type: 'object',
        properties: {
          date: { type: 'string', description: 'ISO date (YYYY-MM-DD). Defaults to today.' },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'getPersonalizedRecommendations',
      description: 'Get personalized recommendations for the guest based on their preferences, booking history, and current promotions/new packages. Use proactively when greeting the guest, when they ask "what\'s new", "any deals", "recommend something", or at the start of conversation.',
      parameters: { type: 'object', properties: {} },
    },
  },
];

// ─── Tool Execution ───

interface ToolContext {
  memberId: string;
  memberName: string;
}

async function executeTool(name: string, args: Record<string, any>, ctx: ToolContext): Promise<string> {
  switch (name) {
    case 'listServices': {
      const query = supabase.from('services').select('id, name, category_id, description, base_price, duration_minutes, max_capacity').eq('status', 'Active');
      if (args.category) query.eq('category_id', args.category);
      const { data, error } = await query;
      if (error) return JSON.stringify({ error: error.message });
      return JSON.stringify({
        count: data.length,
        services: data.map(s => ({
          id: s.id,
          name: s.name,
          category: s.category_id,
          price: `${s.base_price.toLocaleString()} ETB`,
          duration: `${s.duration_minutes} min`,
          capacity: s.max_capacity,
          description: s.description,
        })),
      });
    }

    case 'bookService': {
      const { serviceId, startDate, endDate, guestCount } = args;
      // Fetch service details
      const { data: service } = await supabase.from('services').select('*').eq('id', serviceId).single();
      if (!service) return JSON.stringify({ error: 'Service not found. Use listServices to see available options.' });

      const isRoom = service.category_id === 'Rooms';
      const nights = isRoom ? Math.max(1, Math.ceil((new Date(endDate || startDate).getTime() - new Date(startDate).getTime()) / 86400000)) : null;
      const count = guestCount || 1;
      const finalPrice = isRoom ? service.base_price * (nights || 1) : service.base_price * count;

      const { data: booking, error } = await supabase.from('bookings').insert({
        member_id: ctx.memberId,
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
      }).select().single();

      if (error) return JSON.stringify({ error: `Booking failed: ${error.message}` });
      return JSON.stringify({
        success: true,
        bookingId: booking.id,
        serviceName: service.name,
        date: startDate,
        guests: count,
        nights,
        totalPrice: `${finalPrice.toLocaleString()} ETB`,
        message: `Booking confirmed! ${service.name} on ${startDate}${nights ? ` for ${nights} night(s)` : ''} — Total: ${finalPrice.toLocaleString()} ETB`,
      });
    }

    case 'getMyBookings': {
      const { data, error } = await supabase
        .from('bookings')
        .select('id, start_date, end_date, guest_count, final_price, status, nights, services(name, category_id)')
        .eq('member_id', ctx.memberId)
        .order('start_date', { ascending: false })
        .limit(10);
      if (error) return JSON.stringify({ error: error.message });
      return JSON.stringify({
        count: data.length,
        bookings: data.map(b => ({
          id: b.id,
          service: (b.services as any)?.name || 'Unknown',
          category: (b.services as any)?.category_id,
          date: b.start_date?.split('T')[0],
          guests: b.guest_count,
          nights: b.nights,
          total: `${b.final_price?.toLocaleString()} ETB`,
          status: b.status,
        })),
      });
    }

    case 'cancelBooking': {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'Cancelled' })
        .eq('id', args.bookingId)
        .eq('member_id', ctx.memberId);
      if (error) return JSON.stringify({ error: error.message });
      return JSON.stringify({ success: true, message: `Booking ${args.bookingId} has been cancelled.` });
    }

    case 'checkEthiopianCalendar': {
      const targetDate = args.date ? new Date(args.date) : new Date();
      const events = getEthiopianEvents(targetDate);
      const season = getTourismSeason(targetDate);
      const demand = getDemandMultiplier(targetDate);
      return JSON.stringify({
        date: targetDate.toISOString().split('T')[0],
        dayOfWeek: targetDate.toLocaleDateString('en-US', { weekday: 'long' }),
        season,
        events: events.length > 0 ? events : [{ name: 'No special events', type: 'none' }],
        demandMultiplier: demand.multiplier,
        demandReasons: demand.reasons,
      });
    }

    case 'getPersonalizedRecommendations': {
      // Fetch user preferences
      const { data: prefs } = await supabase
        .from('member_preferences')
        .select('*')
        .eq('member_id', ctx.memberId)
        .single();

      // Fetch past bookings to understand taste
      const { data: pastBookings } = await supabase
        .from('bookings')
        .select('services(name, category_id, tags)')
        .eq('member_id', ctx.memberId)
        .eq('status', 'Confirmed')
        .limit(10);

      // Fetch newest services (created in last 7 days or tagged as special)
      const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
      const { data: newServices } = await supabase
        .from('services')
        .select('id, name, category_id, base_price, description, tags')
        .eq('status', 'Active')
        .gte('created_at', weekAgo.toISOString())
        .order('created_at', { ascending: false });

      // Fetch all active services for general recs
      const { data: allServices } = await supabase
        .from('services')
        .select('id, name, category_id, base_price, description, tags')
        .eq('status', 'Active');

      const bookedCategories = (pastBookings || []).map(b => (b.services as any)?.category_id).filter(Boolean);
      const events = getEthiopianEvents(new Date());

      return JSON.stringify({
        guestPreferences: prefs ? { activities: prefs.activities, dining: prefs.dining, wellness: prefs.wellness, budget: prefs.budget_tier, aiSegment: prefs.ai_segment } : null,
        pastBookingCategories: [...new Set(bookedCategories)],
        newPackagesAndDeals: (newServices || []).map(s => ({ id: s.id, name: s.name, category: s.category_id, price: `${s.base_price.toLocaleString()} ETB`, description: s.description, tags: s.tags })),
        allAvailable: (allServices || []).map(s => ({ id: s.id, name: s.name, category: s.category_id, price: `${s.base_price.toLocaleString()} ETB`, tags: s.tags })),
        todayEvents: events.map(e => ({ name: e.name, type: e.type })),
        instructions: 'Recommend services that match guest preferences. Highlight NEW packages first. If fasting day, emphasize vegan dining. Use guest budget tier to filter.',
      });
    }

    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}

// ─── System Prompt ───

function getSystemPrompt(memberName: string): string {
  return `You are the AI Concierge for Kuriftu Resorts, Ethiopia. Guest: ${memberName}. Currency: ETB.
Tools: listServices, bookService, getMyBookings, cancelBooking, checkEthiopianCalendar, getPersonalizedRecommendations.
Use getPersonalizedRecommendations to find new packages and guest preferences. Highlight new deals enthusiastically.
On fasting days suggest vegan options. Be warm, use Amharic greetings (Selam!). Keep responses concise.
Booking flow: list → confirm details → bookService → share confirmation.`;
}

// ─── Persistent Conversation History ───

export async function loadConversationHistory(userId: string): Promise<ChatMessage[]> {
  try {
    const { data } = await supabase
      .from('conversations')
      .select('role, content')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(20);
    return (data || []).map(m => ({ role: m.role as ChatMessage['role'], content: m.content }));
  } catch {
    return [];
  }
}

async function saveMessages(userId: string, userMsg: string, assistantMsg: string) {
  try {
    await supabase.from('conversations').insert([
      { user_id: userId, role: 'user', content: userMsg },
      { user_id: userId, role: 'assistant', content: assistantMsg },
    ]);
  } catch (e) {
    console.error('Failed to save conversation:', e);
  }
}

export async function clearConversationHistory(userId: string) {
  await supabase.from('conversations').delete().eq('user_id', userId);
}

// ─── Proactive Welcome (called when concierge opens) ───

export async function getProactiveGreeting(context: ToolContext): Promise<string> {
  if (!SUPABASE_URL) return `Selam, ${context.memberName}! How can I help you today?`;

  // Get recommendations data to include in greeting
  const recsResult = await executeTool('getPersonalizedRecommendations', {}, context);
  const recs = JSON.parse(recsResult);

  // Load past conversation to know the guest
  const history = await loadConversationHistory(context.memberId);
  const hasHistory = history.length > 0;

  const prompt = `You are the AI Concierge for Kuriftu Resorts. Generate a warm, personalized greeting for ${context.memberName}.

${hasHistory ? `This is a RETURNING guest — you've spoken ${history.length} times before. Reference something from past conversations to show you remember them.` : 'This is their FIRST time using the concierge.'}

GUEST DATA:
- Preferences: ${recs.guestPreferences ? JSON.stringify(recs.guestPreferences) : 'Not set yet'}
- Past booking categories: ${recs.pastBookingCategories?.join(', ') || 'None'}
- New packages available: ${recs.newPackagesAndDeals?.map((s: any) => `${s.name} (${s.price})`).join(', ') || 'None'}
- Today's events: ${recs.todayEvents?.map((e: any) => e.name).join(', ') || 'None'}

RULES:
- Keep it 2-3 sentences max
- If there are NEW packages, mention the most relevant one based on their preferences
- If it's a fasting day, mention vegan dining options
- Use Amharic greeting naturally (Selam!, Tadias!)
- End with a question to engage them
- Do NOT list all packages — just tease the best one for this guest`;

  try {
    const response = await fetch(AI_CHAT_URL, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.8,
        max_tokens: 200,
      }),
    });
    if (!response.ok) throw new Error('API error');
    const data = await response.json();
    return data.choices[0]?.message?.content || `Selam, ${context.memberName}! Welcome to Kuriftu. How can I make your stay unforgettable?`;
  } catch {
    // Fallback static greeting
    const newPkg = recs.newPackagesAndDeals?.[0];
    return `Selam, ${context.memberName}! Welcome${hasHistory ? ' back' : ''} to Kuriftu Resorts. ${newPkg ? `We just launched "${newPkg.name}" at ${newPkg.price} — would you like to hear more?` : 'How can I help you today?'}`;
  }
}

// ─── Main Chat Function ───

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  tool_call_id?: string;
}

export async function chatWithAI(
  messages: ChatMessage[],
  context: ToolContext
): Promise<string> {
  if (!SUPABASE_URL) {
    return "AI is not configured. Please check your Supabase configuration.";
  }

  // Load persistent history from DB and merge with current session
  let persistedHistory: ChatMessage[] = [];
  try {
    persistedHistory = await loadConversationHistory(context.memberId);
  } catch { /* table may not exist yet */ }

  // Merge: persisted history + current session messages (deduplicated)
  const persistedTexts = new Set(persistedHistory.map(m => m.content));
  const newMessages = messages.filter(m => !persistedTexts.has(m.content));
  const fullHistory = [...persistedHistory, ...newMessages].slice(-8); // Keep last 8 to save tokens

  const systemMessage = { role: 'system' as const, content: getSystemPrompt(context.memberName) };
  let conversationMessages = [systemMessage, ...fullHistory];
  let maxSteps = 5;

  // Get the user's latest message for saving
  const latestUserMsg = messages.filter(m => m.role === 'user').pop()?.content || '';

  while (maxSteps > 0) {
    const response = await fetch(AI_CHAT_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: conversationMessages,
        tools: TOOLS,
        tool_choice: 'auto',
        temperature: 0.7,
        max_tokens: 512,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Groq API error:', err);
      return "I'm having trouble connecting right now. Please try again in a moment.";
    }

    const data = await response.json();
    const choice = data.choices[0];

    // If no tool calls, save and return
    if (choice.finish_reason === 'stop' || !choice.message.tool_calls) {
      const reply = choice.message.content || "I'm not sure how to help with that. Could you rephrase?";
      // Persist conversation
      if (latestUserMsg) {
        saveMessages(context.memberId, latestUserMsg, reply);
      }
      return reply;
    }

    // Process tool calls
    conversationMessages.push(choice.message);

    for (const toolCall of choice.message.tool_calls) {
      let args: Record<string, any> = {};
      try {
        const parsed = JSON.parse(toolCall.function.arguments || '{}');
        args = parsed && typeof parsed === 'object' ? parsed : {};
      } catch { args = {}; }
      const result = await executeTool(toolCall.function.name, args, context);

      conversationMessages.push({
        role: 'tool' as any,
        content: result,
        tool_call_id: toolCall.id,
      });
    }

    maxSteps--;
  }

  const fallback = "I've completed the action. Is there anything else I can help with?";
  if (latestUserMsg) saveMessages(context.memberId, latestUserMsg, fallback);
  return fallback;
}
