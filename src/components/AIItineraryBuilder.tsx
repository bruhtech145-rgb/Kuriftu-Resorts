import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  History, 
  Mountain, 
  Coffee, 
  Waves, 
  Compass, 
  Users, 
  Clock, 
  MapPin, 
  Calendar,
  CheckCircle2,
  ChevronRight,
  ArrowRight,
  Palmtree
} from 'lucide-react';

const interests = [
  { id: 'culture', label: 'Culture & History', icon: '🏛️' },
  { id: 'nature', label: 'Nature & Hiking', icon: '🏔️' },
  { id: 'food', label: 'Food & Coffee', icon: '☕' },
  { id: 'wellness', label: 'Wellness & Spa', icon: '🧘' },
  { id: 'adventure', label: 'Adventure', icon: '🪂' },
  { id: 'local', label: 'Local Life', icon: '🎭' },
];

const durations = ['Half Day', 'Full Day', '2 Days'];

const mockItinerary = [
  {
    time: '8:00am',
    price: '1,800 ETB',
    title: 'Lalibela Rock Churches',
    description: 'UNESCO World Heritage — 11 monolithic churches carved from single rocks. Guide Abebe included.',
    image: 'https://images.unsplash.com/photo-1523805081730-614449379e7d?auto=format&fit=crop&q=80&w=800',
    tag: 'UNESCO World Heritage'
  },
  {
    time: '1:00pm',
    price: '320 ETB',
    title: 'Traditional Injera Lunch',
    description: 'Authentic family-style Ethiopian lunch at Meseret restaurant in Lalibela town.',
    image: 'https://images.unsplash.com/photo-1541510852743-0771833951cb?auto=format&fit=crop&q=80&w=800',
    tag: 'Authentic Experience'
  },
  {
    time: '4:00pm',
    price: 'Complimentary',
    title: 'Coffee Ceremony',
    description: 'Traditional Buna ceremony at the resort with green coffee beans roasted over charcoal.',
    image: 'https://images.unsplash.com/photo-1544161515-4af6b1d462c2?auto=format&fit=crop&q=80&w=800',
    tag: 'Cultural Ritual'
  }
];

export const AIItineraryBuilder: React.FC = () => {
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [duration, setDuration] = useState('Full Day');
  const [isGenerating, setIsGenerating] = useState(false);
  const [itinerary, setItinerary] = useState<typeof mockItinerary | null>(null);

  const toggleInterest = (id: string) => {
    setSelectedInterests(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleGenerate = () => {
    if (selectedInterests.length === 0) return;
    setIsGenerating(true);
    setItinerary(null);
    
    // Simulate AI generation
    setTimeout(() => {
      setIsGenerating(false);
      setItinerary(mockItinerary);
    }, 2000);
  };

  return (
    <section className="py-24 bg-slate-50 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-start">
          {/* Left Side: Input */}
          <div className="space-y-10">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#0066ff]/10 text-[#0066ff] text-sm font-bold mb-6">
                <Sparkles size={16} />
                <span>AI-Powered Marketing Automation</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 leading-tight">
                Your perfect day,<br />
                <span className="text-[#0066ff]">crafted by AI.</span>
              </h2>
              <p className="text-lg text-slate-500 max-w-md leading-relaxed">
                What excites you most? Select your interests and we'll build a personalized day itinerary.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {interests.map((interest) => (
                <button
                  key={interest.id}
                  onClick={() => toggleInterest(interest.id)}
                  className={`p-6 rounded-3xl border-2 transition-all flex flex-col items-center gap-3 text-center group ${
                    selectedInterests.includes(interest.id)
                      ? 'border-[#0066ff] bg-[#0066ff]/5 shadow-lg shadow-blue-500/10'
                      : 'border-white bg-white hover:border-slate-200'
                  }`}
                >
                  <span className="text-3xl group-hover:scale-110 transition-transform">{interest.icon}</span>
                  <span className={`text-sm font-bold ${
                    selectedInterests.includes(interest.id) ? 'text-[#0066ff]' : 'text-slate-600'
                  }`}>
                    {interest.label}
                  </span>
                </button>
              ))}
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Trip Duration</h4>
              <div className="flex gap-3">
                {durations.map((d) => (
                  <button
                    key={d}
                    onClick={() => setDuration(d)}
                    className={`px-6 py-3 rounded-2xl font-bold text-sm transition-all ${
                      duration === d
                        ? 'bg-slate-900 text-white shadow-xl shadow-slate-900/20'
                        : 'bg-white text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={selectedInterests.length === 0 || isGenerating}
              className="w-full sm:w-auto bg-[#0066ff] hover:bg-[#0052cc] disabled:bg-slate-300 text-white px-10 py-5 rounded-3xl font-bold text-lg transition-all flex items-center justify-center gap-3 shadow-xl shadow-blue-500/20 active:scale-95"
            >
              {isGenerating ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles size={20} />
                  Generate My Itinerary
                </>
              )}
            </button>
          </div>

          {/* Right Side: Output */}
          <div className="relative">
            <AnimatePresence mode="wait">
              {!itinerary && !isGenerating ? (
                <motion.div
                  key="placeholder"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.05 }}
                  className="bg-white rounded-[3rem] p-12 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center space-y-6 min-h-[600px]"
                >
                  <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                    <Compass size={48} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-2">Ready to explore?</h3>
                    <p className="text-slate-400 max-w-xs mx-auto">
                      Select your interests and duration to see your personalized AI itinerary.
                    </p>
                  </div>
                </motion.div>
              ) : isGenerating ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="bg-white rounded-[3rem] p-12 shadow-2xl shadow-slate-200/50 flex flex-col items-center justify-center text-center space-y-8 min-h-[600px]"
                >
                  <div className="relative">
                    <div className="w-24 h-24 border-4 border-slate-100 border-t-[#0066ff] rounded-full animate-spin" />
                    <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[#0066ff]" size={32} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-2">Crafting your perfect day...</h3>
                    <p className="text-slate-400">Our AI is analyzing thousands of experiences to find the best matches for you.</p>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="itinerary"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-white rounded-[3rem] p-8 md:p-12 shadow-2xl shadow-slate-200/50 space-y-10"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-8">
                    <div>
                      <h3 className="text-3xl font-bold text-slate-900 mb-1">Your AI Itinerary</h3>
                      <p className="text-slate-400 font-medium">April 1, 2026 · Personalized for you</p>
                    </div>
                    <div className="bg-[#0066ff]/10 text-[#0066ff] px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest">
                      AI Generated
                    </div>
                  </div>

                  <div className="space-y-10">
                    {itinerary?.map((item, i) => (
                      <div key={i} className="flex gap-6 md:gap-8 group">
                        <div className="flex flex-col items-center">
                          <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center font-bold text-xs shrink-0 shadow-lg shadow-slate-900/20">
                            {item.time}
                          </div>
                          {i !== itinerary.length - 1 && (
                            <div className="w-0.5 flex-1 bg-slate-100 my-4" />
                          )}
                        </div>
                        <div className="flex-1 space-y-4">
                          <div className="relative h-48 rounded-3xl overflow-hidden">
                            <img 
                              src={item.image} 
                              alt={item.title} 
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-[10px] font-bold text-slate-900 uppercase tracking-wider">
                              {item.tag}
                            </div>
                          </div>
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-xl font-bold text-slate-900">{item.title}</h4>
                              <span className="text-[#0066ff] font-bold">{item.price}</span>
                            </div>
                            <p className="text-slate-500 text-sm leading-relaxed">
                              {item.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button className="w-full bg-slate-900 hover:bg-slate-800 text-white py-5 rounded-3xl font-bold text-lg transition-all flex items-center justify-center gap-3 shadow-xl shadow-slate-900/20">
                    <CheckCircle2 size={20} />
                    Book All Activities
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Decorative elements */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#0066ff]/5 rounded-full blur-3xl -z-10" />
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-orange-500/5 rounded-full blur-3xl -z-10" />
          </div>
        </div>
      </div>
    </section>
  );
};
