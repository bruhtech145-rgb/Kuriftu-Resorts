import { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Send, Sparkles, User, Bot, MapPin, Utensils, Heart, Calendar } from 'lucide-react';
import { Member } from '../types';
import { clsx } from 'clsx';

interface ConciergePageProps {
  member: Member;
}

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

const QUICK_ACTIONS = [
  { label: 'Recommend activities', icon: MapPin },
  { label: 'Best restaurants nearby', icon: Utensils },
  { label: 'Spa availability', icon: Heart },
  { label: 'Plan my day', icon: Calendar },
];

// Simple response logic - in production this would connect to an AI API
function generateResponse(input: string, memberName: string): string {
  const lower = input.toLowerCase();

  if (lower.includes('activity') || lower.includes('activities') || lower.includes('do')) {
    return `Great choice, ${memberName}! Here are today's top activities:\n\n🏔 **Crater Lake Kayaking** - 10:00 AM & 2:00 PM (2 spots left)\n🏛 **Heritage Tour** - 11:00 AM (guided, includes coffee ceremony)\n🐦 **Bird Watching** - 6:30 AM early morning expedition\n\nWould you like me to book any of these for you?`;
  }
  if (lower.includes('restaurant') || lower.includes('food') || lower.includes('dining') || lower.includes('eat')) {
    return `Here are our dining experiences for today:\n\n🍽 **Ethiopian Fine Dining** - 7:00 PM (reservations recommended)\n🥩 **Lakeside BBQ Night** - 6:30 PM with live music\n☕ **Traditional Coffee Ceremony** - 3:00 PM & 5:00 PM\n\nAll restaurants accommodate dietary preferences. Shall I make a reservation?`;
  }
  if (lower.includes('spa') || lower.includes('wellness') || lower.includes('massage') || lower.includes('relax')) {
    return `Our wellness center has availability today:\n\n☕ **Coffee Body Scrub** - 11:00 AM, 2:00 PM, 4:00 PM\n♨️ **Hot Springs Session** - Open all day (60 min sessions)\n🧘 **Yoga & Meditation** - Tomorrow 7:00 AM by the lake\n\nThe Coffee Spa is our signature treatment - highly recommended! Want me to book a slot?`;
  }
  if (lower.includes('plan') || lower.includes('itinerary') || lower.includes('day')) {
    return `Here's a perfect day at Kuriftu for you, ${memberName}:\n\n🌅 **7:00 AM** - Yoga by the crater lake\n🥐 **8:30 AM** - Breakfast at the Garden Restaurant\n🏔 **10:00 AM** - Crater Lake Kayaking\n🍽 **12:30 PM** - Lunch with lake view\n☕ **2:30 PM** - Coffee Spa Treatment\n🏛 **4:30 PM** - Heritage Tour\n🥩 **7:00 PM** - Lakeside BBQ with live music\n\nWant me to book this entire itinerary?`;
  }
  if (lower.includes('book') || lower.includes('reserve')) {
    return `I'd be happy to help you book! Please head to the **Dashboard** tab where you can browse all available services and book directly. Or tell me what specific experience you're interested in, and I'll guide you!`;
  }
  if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
    return `Hello ${memberName}! Welcome to Kuriftu Resorts. I'm your AI concierge - I can help you discover activities, book restaurants, schedule spa treatments, or plan your entire day. What sounds good?`;
  }
  if (lower.includes('thank')) {
    return `You're welcome, ${memberName}! Enjoy your stay at Kuriftu. I'm here 24/7 if you need anything else. 🌟`;
  }

  return `I'd love to help with that, ${memberName}! I can assist you with:\n\n• **Activities & Tours** - kayaking, bird watching, heritage tours\n• **Dining** - restaurant reservations, special dietary needs\n• **Wellness** - spa bookings, yoga sessions\n• **Day Planning** - full itinerary suggestions\n\nWhat would you like to explore?`;
}

export default function ConciergePage({ member }: ConciergePageProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: `Welcome back, ${member.full_name}! I'm your Kuriftu AI Concierge. How can I make your stay unforgettable today?`,
      sender: 'bot',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const sendMessage = (text: string) => {
    if (!text.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      text,
      sender: 'user',
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    setTimeout(() => {
      const response = generateResponse(text, member.full_name.split(' ')[0]);
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: response,
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, botMsg]);
      setIsTyping(false);
    }, 800 + Math.random() * 700);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] lg:h-[calc(100vh-5rem)]">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 bg-stone-900 rounded-2xl flex items-center justify-center">
          <Sparkles size={24} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-serif text-stone-900">AI Concierge</h1>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-green-500 rounded-full" />
            <span className="text-xs text-stone-400 font-bold">Online 24/7</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 pb-4 pr-2">
        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={clsx("flex gap-3 max-w-[85%]", msg.sender === 'user' ? "ml-auto flex-row-reverse" : "")}
          >
            <div className={clsx(
              "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-1",
              msg.sender === 'user' ? "bg-stone-200 text-stone-600" : "bg-stone-900 text-white"
            )}>
              {msg.sender === 'user' ? <User size={16} /> : <Bot size={16} />}
            </div>
            <div className={clsx(
              "p-4 rounded-2xl text-sm leading-relaxed whitespace-pre-line",
              msg.sender === 'user'
                ? "bg-stone-900 text-white rounded-tr-sm"
                : "bg-white text-stone-800 border border-stone-100 shadow-sm rounded-tl-sm"
            )}>
              {msg.text}
            </div>
          </motion.div>
        ))}

        {isTyping && (
          <div className="flex gap-3 max-w-[85%]">
            <div className="w-8 h-8 bg-stone-900 text-white rounded-xl flex items-center justify-center shrink-0 mt-1">
              <Bot size={16} />
            </div>
            <div className="bg-white p-4 rounded-2xl rounded-tl-sm border border-stone-100 shadow-sm">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-stone-300 rounded-full animate-bounce" />
                <span className="w-2 h-2 bg-stone-300 rounded-full animate-bounce [animation-delay:0.2s]" />
                <span className="w-2 h-2 bg-stone-300 rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      {messages.length <= 2 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {QUICK_ACTIONS.map(action => (
            <button
              key={action.label}
              onClick={() => sendMessage(action.label)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-stone-200 rounded-xl text-sm font-medium text-stone-700 hover:bg-stone-50 hover:border-stone-300 transition-all"
            >
              <action.icon size={14} className="text-stone-400" />
              {action.label}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="relative">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage(input)}
          placeholder="Ask me anything about your stay..."
          className="w-full pl-5 pr-14 py-4 bg-white border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-300 transition-all shadow-sm"
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={!input.trim()}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-stone-900 text-white rounded-xl hover:bg-stone-800 transition-colors disabled:opacity-30"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
