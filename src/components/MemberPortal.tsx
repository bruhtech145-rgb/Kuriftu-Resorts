import { useState, useEffect } from 'react';
import { Member, Service, Preferences, PricingRule } from '../types';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Filter, Sparkles, Star, MapPin, Clock, Users, ChevronRight, Tag, TrendingUp } from 'lucide-react';
import { clsx } from 'clsx';
import BookingModal from './BookingModal';
import { calculateDynamicPrice } from '../lib/pricing';

interface MemberPortalProps {
  member: Member;
}

export default function MemberPortal({ member }: MemberPortalProps) {
  const [services, setServices] = useState<Service[]>([]);
  const [pricingRules, setPricingRules] = useState<PricingRule[]>([]);
  const [roomAvailability, setRoomAvailability] = useState<Record<string, number>>({});
  const [prefs, setPrefs] = useState<Preferences | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  useEffect(() => {
    // Fetch active services
    const fetchServices = async () => {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('status', 'Active');
      if (error) {
        console.error('Error fetching services:', error);
      } else {
        setServices(data as Service[]);
      }
    };

    // Fetch pricing rules
    const fetchRules = async () => {
      const { data, error } = await supabase
        .from('pricing_rules')
        .select('*');
      if (error) {
        console.error('Error fetching pricing rules:', error);
      } else {
        setPricingRules(data as PricingRule[]);
      }
    };

    // Fetch room availability
    const fetchAvailability = async () => {
      const { data, error } = await supabase
        .from('rooms')
        .select('type, status');
      
      if (data) {
        const counts: Record<string, number> = {};
        data.forEach(room => {
          if (room.status === 'Available') {
            counts[room.type] = (counts[room.type] || 0) + 1;
          } else if (!counts[room.type]) {
            counts[room.type] = 0;
          }
        });
        setRoomAvailability(counts);
      }
    };

    // Fetch member preferences
    const fetchPrefs = async () => {
      const { data, error } = await supabase
        .from('member_preferences')
        .select('*')
        .eq('member_id', member.id)
        .single();
      if (data) setPrefs(data as Preferences);
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching preferences:', error);
      }
    };

    fetchServices();
    fetchRules();
    fetchPrefs();
    fetchAvailability();

    // Subscribe to realtime changes for everything
    const servicesChannel = supabase
      .channel('services-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'services' }, () => {
        fetchServices();
      })
      .subscribe();

    const roomsChannel = supabase
      .channel('rooms-availability')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, () => {
        fetchAvailability();
      })
      .subscribe();

    const rulesChannel = supabase
      .channel('pricing-rules-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pricing_rules' }, () => {
        fetchRules();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(servicesChannel);
      supabase.removeChannel(rulesChannel);
      supabase.removeChannel(roomsChannel);
    };
  }, [member.id]);

  const getDynamicPrice = (service: Service) => {
    // Simulated context for now
    const context = {
      occupancy: 85, // High occupancy
      isWeekend: new Date().getDay() === 0 || new Date().getDay() === 6,
      isHoliday: false
    };
    return calculateDynamicPrice(service, pricingRules, context);
  };

  const categories = ['All', 'Rooms', 'Activities', 'Dining', 'Wellness'];

  const filteredServices = services.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = activeCategory === 'All' || s.category_id === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-10">
      {/* AI Recommendation Banner */}
      {prefs && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden bg-stone-900 rounded-[2rem] p-8 lg:p-12 text-white"
        >
          <div className="relative z-10 max-w-2xl">
            <div className="flex items-center gap-2 text-stone-400 mb-4">
              <Sparkles size={18} />
              <span className="uppercase tracking-widest text-xs font-bold">AI Recommended for You</span>
            </div>
            <h2 className="text-4xl font-serif mb-4">Welcome back, {member.full_name}</h2>
            <p className="text-stone-400 text-lg mb-8 leading-relaxed">
              Based on your interest in <span className="text-white font-medium">{prefs.activities.slice(0, 2).join(' & ')}</span>, 
              we've curated a selection of experiences you'll love.
            </p>
            <div className="flex items-center gap-4">
              <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 flex items-center gap-2">
                <Star size={14} className="text-yellow-400 fill-yellow-400" />
                <span className="text-sm font-medium">{prefs.ai_segment}</span>
              </div>
              <div className="text-stone-400 text-sm italic">"{prefs.tagline}"</div>
            </div>
          </div>
          {/* Decorative background element */}
          <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-stone-800/50 to-transparent pointer-events-none" />
        </motion.div>
      )}

      {/* Search and Filter */}
      <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between">
        <div className="relative w-full lg:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={20} />
          <input
            type="text"
            placeholder="Search experiences..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white border border-stone-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-stone-900/5 transition-all shadow-sm"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 w-full lg:w-auto no-scrollbar">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={clsx(
                "px-6 py-3 rounded-xl font-medium transition-all whitespace-nowrap",
                activeCategory === cat
                  ? "bg-stone-900 text-white shadow-lg shadow-stone-900/20"
                  : "bg-white text-stone-600 hover:bg-stone-100"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Service Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredServices.map((service, index) => (
          <motion.div
            key={service.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="group bg-white rounded-[2rem] overflow-hidden border border-stone-100 hover:shadow-2xl hover:shadow-stone-200/50 transition-all"
          >
            <div className="relative h-64 overflow-hidden">
              <img
                src={service.images[0] || `https://picsum.photos/seed/${service.id}/800/600`}
                alt={service.name}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                referrerPolicy="no-referrer"
              />
              <div className="absolute top-4 right-4 flex flex-col items-end gap-2">
                <div className="bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-stone-900 shadow-sm flex items-center gap-1">
                  <TrendingUp size={12} className="text-[#0066ff]" />
                  ETB {getDynamicPrice(service).toLocaleString()}
                </div>
                {getDynamicPrice(service) !== service.base_price && (
                  <div className="bg-[#0066ff]/90 backdrop-blur-md px-2 py-0.5 rounded-full text-[10px] font-bold text-white shadow-lg animate-pulse">
                    AI Adjusted
                  </div>
                )}
              </div>
              {prefs?.recommended_services?.includes(service.id) && (
                <div className="absolute top-4 left-4 bg-stone-900 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                  <Sparkles size={12} />
                  Top Match
                </div>
              )}
            </div>
            <div className="p-8">
              <div className="flex items-center gap-2 text-stone-400 text-xs font-bold uppercase tracking-widest mb-3">
                <MapPin size={12} />
                {service.category_id}
              </div>
              <h3 className="text-2xl font-serif text-stone-900 mb-3 group-hover:text-stone-700 transition-colors">{service.name}</h3>
              <p className="text-stone-500 text-sm line-clamp-2 mb-6 leading-relaxed">
                {service.description}
              </p>
              <div className="flex items-center justify-between pt-6 border-t border-stone-50">
                <div className="flex items-center gap-4 text-stone-400 text-xs font-medium">
                  <div className="flex items-center gap-1">
                    <Clock size={14} />
                    {service.duration_minutes}m
                  </div>
                  <div className="flex items-center gap-1">
                    <Users size={14} />
                    {service.max_capacity}
                  </div>
                </div>
                {service.category_id === 'Rooms' && (
                  <div className={clsx(
                    "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter",
                    (roomAvailability[service.name] || 0) > 0 
                      ? "bg-green-100 text-green-600" 
                      : "bg-red-100 text-red-600"
                  )}>
                    {roomAvailability[service.name] || 0} rooms available
                  </div>
                )}
                <button 
                  onClick={() => setSelectedService(service)}
                  disabled={service.category_id === 'Rooms' && (roomAvailability[service.name] || 0) === 0}
                  className="bg-stone-50 text-stone-900 px-6 py-2 rounded-xl font-bold hover:bg-stone-900 hover:text-white transition-all disabled:opacity-50 disabled:hover:bg-stone-50 disabled:hover:text-stone-900"
                >
                  {service.category_id === 'Rooms' && (roomAvailability[service.name] || 0) === 0 ? 'Sold Out' : 'Book Now'}
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {selectedService && (
          <BookingModal 
            service={selectedService} 
            member={member} 
            onClose={() => setSelectedService(null)} 
          />
        )}
      </AnimatePresence>

      {/* Empty State */}
      {filteredServices.length === 0 && (
        <div className="text-center py-20">
          <div className="w-20 h-20 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Search className="text-stone-300" size={32} />
          </div>
          <h3 className="text-xl font-serif text-stone-900 mb-2">No experiences found</h3>
          <p className="text-stone-500">Try adjusting your search or category filters.</p>
        </div>
      )}
    </div>
  );
}
