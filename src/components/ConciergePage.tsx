import { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Send, Sparkles, User, Bot, MapPin, Utensils, Heart, Calendar } from 'lucide-react';
import { Member } from '../types';
import { chatWithAI, ChatMessage, loadConversationHistory, getProactiveGreeting } from '../lib/ai-service';
import { clsx } from 'clsx';

interface ConciergePageProps {
  member: Member;
}

interface UIMessage {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

const QUICK_ACTIONS = [
  { label: 'What can I do here?', icon: MapPin },
  { label: 'Book a dining experience', icon: Utensils },
  { label: 'Spa & wellness options', icon: Heart },
  { label: 'Show my bookings', icon: Calendar },
];

export default function ConciergePage({ member }: ConciergePageProps) {
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(true); // Start loading
  const [initialized, setInitialized] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load persistent history + proactive greeting on mount
  useEffect(() => {
    if (initialized) return;
    setInitialized(true);

    const init = async () => {
      // 1. Load past conversations from DB
      const history = await loadConversationHistory(member.id);
      if (history.length > 0) {
        setChatHistory(history);
        // Show last few messages in UI
        const recentMessages: UIMessage[] = history.slice(-10).map((m, i) => ({
          id: `hist-${i}`,
          text: m.content,
          sender: m.role === 'user' ? 'user' as const : 'bot' as const,
          timestamp: new Date(),
        }));
        setMessages(recentMessages);
      }

      // 2. Get personalized AI greeting (knows their prefs, new packages, history)
      try {
        const greeting = await getProactiveGreeting({
          memberId: member.id,
          memberName: member.full_name,
        });
        setMessages(prev => [...prev, {
          id: 'greeting',
          text: greeting,
          sender: 'bot',
          timestamp: new Date(),
        }]);
      } catch {
        setMessages(prev => [...prev, {
          id: 'greeting',
          text: `Selam, ${member.full_name}! Welcome to Kuriftu. How can I help you today?`,
          sender: 'bot',
          timestamp: new Date(),
        }]);
      }
      setIsTyping(false);
    };

    init();
  }, [member.id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isTyping) return;

    const userMsg: UIMessage = {
      id: Date.now().toString(),
      text,
      sender: 'user',
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    const newHistory: ChatMessage[] = [...chatHistory, { role: 'user', content: text }];
    setChatHistory(newHistory);

    try {
      const response = await chatWithAI(newHistory, {
        memberId: member.id,
        memberName: member.full_name,
      });

      const botMsg: UIMessage = {
        id: (Date.now() + 1).toString(),
        text: response,
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, botMsg]);
      setChatHistory(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (error) {
      console.error('AI error:', error);
      const errorMsg: UIMessage = {
        id: (Date.now() + 1).toString(),
        text: "I'm having trouble connecting right now. Please try again in a moment.",
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
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
            <span className="text-xs text-stone-400 font-bold">Powered by Groq AI</span>
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
          disabled={isTyping}
          className="w-full pl-5 pr-14 py-4 bg-white border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-300 transition-all shadow-sm disabled:opacity-60"
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || isTyping}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-stone-900 text-white rounded-xl hover:bg-stone-800 transition-colors disabled:opacity-30"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
