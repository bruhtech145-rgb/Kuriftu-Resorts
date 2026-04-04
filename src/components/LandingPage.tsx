import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LogIn, 
  Search, 
  Calendar, 
  Users, 
  MapPin, 
  ChevronRight, 
  Star, 
  ShieldCheck, 
  Compass, 
  Waves, 
  Coffee, 
  Utensils,
  ArrowRight,
  Menu,
  X,
  Settings,
  Sparkles,
  Palmtree,
  TrendingUp
} from 'lucide-react';
import { AIItineraryBuilder } from './AIItineraryBuilder';
import { RegisterModal } from './RegisterModal';
import { LoginModal } from './LoginModal';
import { supabase } from '../lib/supabase';

interface LandingPageProps {
  onLogin: () => void;
  onAdminPortal: () => void;
}

export default function LandingPage({ onLogin, onAdminPortal }: LandingPageProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'rooms' | 'activities'>('rooms');
  const [destination, setDestination] = useState('');
  const [guests, setGuests] = useState('2 Adults, 1 Room');
  const [checkIn, setCheckIn] = useState('2026-04-15');
  const [checkOut, setCheckOut] = useState('2026-04-20');
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [activeSection, setActiveSection] = useState('resorts');

  // Track which section is in view for nav highlight
  useEffect(() => {
    const sections = ['resorts', 'features', 'services', 'how-it-works', 'about'];
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      }
    }, { threshold: 0.3, rootMargin: '-80px 0px 0px 0px' });

    sections.forEach(id => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  // Fetch real services from Supabase
  const [featuredRooms, setFeaturedRooms] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [allServices, setAllServices] = useState<any[]>([]);

  useEffect(() => {
    supabase.from('services').select('*').eq('status', 'Active').then(({ data }) => {
      if (data) {
        setAllServices(data);
        setFeaturedRooms(data.filter(s => s.category_id === 'Rooms').map(s => ({
          id: s.id, name: s.name, price: s.base_price,
          rating: 4.8, reviews: Math.floor(Math.random() * 100) + 20,
          image: s.images?.[0] || `https://picsum.photos/seed/${s.id}/800/600`,
          tags: s.tags || [],
        })));
        setActivities(data.filter(s => s.category_id !== 'Rooms').map(s => ({
          id: s.id, name: s.name, price: s.base_price,
          rating: 4.7,
          image: s.images?.[0] || `https://picsum.photos/seed/${s.id}/800/600`,
          category: s.category_id,
        })));
      }
    });
  }, []);

  const handleSearch = async () => {
    setSearching(true);

    const guestCount = parseInt(guests) || 1;
    const nights = Math.max(1, Math.ceil(
      (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000
    ));
    const searchText = destination.toLowerCase().trim();

    // 1. Fetch all active services
    const { data: svcData } = await supabase
      .from('services')
      .select('*')
      .eq('status', 'Active')
      .order('base_price', { ascending: true });

    // 2. Fetch bookings that overlap with selected dates
    const { data: overlappingBookings } = await supabase
      .from('bookings')
      .select('service_id')
      .eq('status', 'Confirmed')
      .lte('start_date', new Date(checkOut).toISOString())
      .gte('end_date', new Date(checkIn).toISOString());

    const bookedCounts: Record<string, number> = {};
    (overlappingBookings || []).forEach(b => {
      bookedCounts[b.service_id] = (bookedCounts[b.service_id] || 0) + 1;
    });

    if (svcData) {
      const results = svcData
        .filter(s => {
          // Filter by search text
          if (searchText) {
            const matches = s.name.toLowerCase().includes(searchText)
              || (s.description || '').toLowerCase().includes(searchText)
              || (s.tags || []).some((t: string) => t.toLowerCase().includes(searchText))
              || s.category_id.toLowerCase().includes(searchText);
            if (!matches) return false;
          }
          // Must fit guest count
          if (s.max_capacity && s.max_capacity < guestCount) return false;
          return true;
        })
        .map(s => {
          const isRoom = s.category_id === 'Rooms';
          const totalPrice = isRoom ? s.base_price * nights : s.base_price * guestCount;
          const bookingsInPeriod = bookedCounts[s.id] || 0;
          // Rooms: check if booked during the dates
          const isAvailable = isRoom ? bookingsInPeriod < (s.max_capacity || 1) : true;

          return {
            id: s.id, name: s.name,
            price: s.base_price,
            totalPrice,
            priceLabel: isRoom
              ? `ETB ${totalPrice.toLocaleString()} for ${nights} night${nights > 1 ? 's' : ''}`
              : `ETB ${totalPrice.toLocaleString()} for ${guestCount} guest${guestCount > 1 ? 's' : ''}`,
            category: s.category_id,
            image: s.images?.[0] || `https://picsum.photos/seed/${s.id}/800/600`,
            description: s.description,
            tags: s.tags || [],
            duration: s.duration_minutes,
            capacity: s.max_capacity,
            isAvailable,
            bookingsInPeriod,
          };
        });

      setSearchResults(results);
    }
    setSearching(false);
    setTimeout(() => document.getElementById('search-results')?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const destinations = [
    "Kuriftu Resort & Spa African Village",
    "Kuriftu Resort & Spa Bishoftu",
    "Kuriftu Entoto Adventure Park",
    "Kuriftu Resort & Spa Lake Tana",
    "Kuriftu Resort & Spa Awash",
    "Kuriftu Water Park",
    "Boston Day Spa"
  ];

  const guestOptions = [
    "1 Adult, 1 Room",
    "2 Adults, 1 Room",
    "2 Adults, 2 Rooms",
    "3 Adults, 1 Room",
    "4 Adults, 2 Rooms"
  ];

  return (
    <div className="min-h-screen bg-[#f5f7fa] font-sans text-slate-900">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-[100] bg-white/90 backdrop-blur-md shadow-sm border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <div className="flex items-center gap-10">
              <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                <div className="w-10 h-10 bg-[#0066ff] rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <span className="text-white font-bold text-xl">K</span>
                </div>
                <span className="text-2xl font-bold text-[#002244] tracking-tight hidden sm:block">Kuriftu Resorts</span>
              </div>
              
              <div className="hidden lg:flex items-center gap-8 text-sm font-bold text-slate-500">
                {[
                  { id: 'resorts', label: 'Resorts' },
                  { id: 'features', label: 'Features' },
                  { id: 'services', label: 'Services' },
                  { id: 'how-it-works', label: 'How It Works' },
                  { id: 'about', label: 'About Us' },
                ].map(nav => (
                  <a
                    key={nav.id}
                    href={`#${nav.id}`}
                    onClick={() => setActiveSection(nav.id)}
                    className={`transition-colors relative ${activeSection === nav.id ? 'text-[#0066ff] after:absolute after:bottom-[-28px] after:left-0 after:right-0 after:h-1 after:bg-[#0066ff] after:rounded-full' : 'hover:text-[#0066ff]'}`}
                  >
                    {nav.label}
                  </a>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden xl:flex items-center gap-2">
                <button
                  onClick={() => setIsLoginOpen(true)}
                  className="flex items-center gap-2 text-slate-600 hover:text-[#0066ff] font-bold text-sm px-4 py-2 rounded-xl hover:bg-slate-50 transition-all"
                >
                  <LogIn size={18} />
                  Sign In
                </button>
                <button
                  onClick={onAdminPortal}
                  className="flex items-center gap-2 text-slate-600 hover:text-[#0066ff] font-bold text-sm px-4 py-2 rounded-xl hover:bg-slate-50 transition-all"
                >
                  <Settings size={18} />
                  Admin Portal
                </button>
              </div>
                <button 
                  onClick={() => setIsRegisterOpen(true)}
                  className="hidden sm:flex bg-slate-900 text-white px-8 py-3 rounded-2xl text-sm font-bold hover:bg-[#0066ff] transition-all shadow-xl shadow-slate-900/10"
                >
                  Register
                </button>
              <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="lg:hidden p-3 text-slate-600 hover:bg-slate-50 rounded-2xl transition-colors"
              >
                {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[90] bg-white pt-24 px-6 lg:hidden overflow-y-auto"
          >
            <div className="flex flex-col gap-2">
              <div className="grid grid-cols-2 gap-4 mb-8">
                <button onClick={() => { setIsMenuOpen(false); setIsLoginOpen(true); }} className="flex flex-col items-center gap-3 p-6 bg-slate-50 rounded-[2rem] text-slate-900">
                  <LogIn size={24} className="text-[#0066ff]" />
                  <span className="font-bold text-sm">Sign In</span>
                </button>
                <button onClick={onAdminPortal} className="flex flex-col items-center gap-3 p-6 bg-slate-50 rounded-[2rem] text-slate-900">
                  <Settings size={24} className="text-[#0066ff]" />
                  <span className="font-bold text-sm">Admin</span>
                </button>
              </div>

              {[
                { label: 'Resorts', icon: <Palmtree size={20} />, href: '#resorts' },
                { label: 'Features', icon: <Sparkles size={20} />, href: '#features' },
                { label: 'Services', icon: <Compass size={20} />, href: '#services' },
                { label: 'How It Works', icon: <ArrowRight size={20} />, href: '#how-it-works' },
                { label: 'About Us', icon: <Users size={20} />, href: '#about' },
              ].map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center justify-between p-6 hover:bg-slate-50 rounded-3xl transition-colors group"
                >
                  <div className="flex items-center gap-4">
                    <div className="text-slate-400 group-hover:text-[#0066ff] transition-colors">
                      {link.icon}
                    </div>
                    <span className="text-lg font-bold text-slate-900">{link.label}</span>
                  </div>
                  <ChevronRight size={20} className="text-slate-300" />
                </a>
              ))}
              
              <button 
                onClick={() => {
                  setIsMenuOpen(false);
                  setIsRegisterOpen(true);
                }}
                className="mt-8 w-full bg-[#0066ff] text-white py-6 rounded-[2rem] font-bold text-xl shadow-2xl shadow-blue-500/20"
              >
                Register Now
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Section with Trip.com Style Search */}
      <section id="resorts" className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&q=80&w=1920"
            alt="Kuriftu Background"
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-12">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl md:text-6xl font-bold text-white mb-4 drop-shadow-lg"
            >
              Discover Your Next Luxury Escape
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-lg md:text-xl text-white/90 font-medium"
            >
              Experience the best of Ethiopia at Kuriftu Resorts & Spa
            </motion.p>
          </div>

          {/* Search Box */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-3xl shadow-2xl p-2 max-w-5xl mx-auto"
          >
            <div className="flex flex-col md:flex-row items-stretch">
              {/* Search by name */}
              <div className="flex-1 p-4 border-b md:border-b-0 md:border-r border-slate-100">
                <div className="flex items-center gap-3 mb-1">
                  <Search size={18} className="text-[#0066ff]" />
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Search</span>
                </div>
                <input
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="Room type, spa, dining..."
                  className="w-full text-lg font-bold text-slate-900 bg-transparent focus:outline-none placeholder:text-slate-300"
                />
              </div>

              {/* Dates */}
              <div className="flex-1 p-4 border-b md:border-b-0 md:border-r border-slate-100">
                <div className="flex items-center gap-3 mb-1">
                  <Calendar size={18} className="text-[#0066ff]" />
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Check-in / Check-out</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={checkIn}
                    onChange={(e) => setCheckIn(e.target.value)}
                    className="flex-1 text-sm font-bold text-slate-900 focus:outline-none bg-slate-50 px-3 py-2 rounded-xl border border-transparent focus:border-[#0066ff]/20 transition-all cursor-pointer"
                  />
                  <span className="text-slate-300 font-bold">→</span>
                  <input
                    type="date"
                    value={checkOut}
                    onChange={(e) => setCheckOut(e.target.value)}
                    className="flex-1 text-sm font-bold text-slate-900 focus:outline-none bg-slate-50 px-3 py-2 rounded-xl border border-transparent focus:border-[#0066ff]/20 transition-all cursor-pointer"
                  />
                </div>
              </div>

              {/* Guests */}
              <div className="flex-1 p-4 border-b md:border-b-0 md:border-r border-slate-100">
                <div className="flex items-center gap-3 mb-1">
                  <Users size={18} className="text-[#0066ff]" />
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Guests & Rooms</span>
                </div>
                <select 
                  value={guests}
                  onChange={(e) => setGuests(e.target.value)}
                  className="w-full text-lg font-bold text-slate-900 bg-transparent focus:outline-none cursor-pointer appearance-none"
                >
                  {guestOptions.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleSearch}
                disabled={searching}
                className="bg-[#ff9500] hover:bg-[#e68600] text-white px-10 py-6 md:py-0 rounded-2xl md:rounded-r-3xl font-bold text-xl transition-all flex items-center justify-center gap-3 shadow-lg shadow-orange-500/20 active:scale-95 disabled:opacity-70"
              >
                {searching ? (
                  <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Search size={24} />
                )}
                <span className="md:hidden">Search Now</span>
                <span className="hidden md:inline">Search</span>
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Search Results */}
      {searchResults && (
        <section id="search-results" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-slate-900">
                {searchResults.length} Result{searchResults.length !== 1 ? 's' : ''} Found
              </h2>
              <p className="text-slate-500 mt-1">
                {destination ? `"${destination}" · ` : ''}{checkIn} to {checkOut} · {guests}
              </p>
            </div>
            <button
              onClick={() => setSearchResults(null)}
              className="text-slate-400 hover:text-slate-900 font-bold text-sm px-4 py-2 rounded-xl hover:bg-slate-100 transition-all"
            >
              Clear Results
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {searchResults.map((result) => (
              <motion.div
                key={result.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all group cursor-pointer"
                onClick={() => setIsLoginOpen(true)}
              >
                <div className="relative h-56 overflow-hidden">
                  <img
                    src={result.image}
                    alt={result.name}
                    className={`w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 ${!result.isAvailable ? 'opacity-50 grayscale' : ''}`}
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-4 left-4 flex gap-2">
                    <span className="bg-[#0066ff] text-white text-xs font-bold px-3 py-1 rounded-full">
                      {result.category}
                    </span>
                    {!result.isAvailable && (
                      <span className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                        Booked {checkIn} – {checkOut}
                      </span>
                    )}
                  </div>
                  {result.isAvailable && result.tags?.length > 0 && (
                    <div className="absolute bottom-4 left-4 flex gap-1">
                      {result.tags.slice(0, 2).map((tag: string) => (
                        <span key={tag} className="bg-black/50 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold text-slate-900 mb-2">{result.name}</h3>
                  <p className="text-sm text-slate-500 line-clamp-2 mb-4">{result.description}</p>
                  <div className="flex items-end justify-between">
                    <div>
                      <span className="text-xs text-slate-400 block mb-1">{result.priceLabel}</span>
                      <span className={`text-2xl font-bold ${result.isAvailable ? 'text-[#0066ff]' : 'text-slate-400 line-through'}`}>
                        ETB {result.totalPrice.toLocaleString()}
                      </span>
                    </div>
                    {result.isAvailable ? (
                      <button className="bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold text-sm group-hover:bg-[#0066ff] transition-colors">
                        Sign in to Book
                      </button>
                    ) : (
                      <span className="text-red-500 font-bold text-sm">Unavailable</span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Main Content — Resorts */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Tabs */}
        <div className="flex items-center gap-6 mb-8 border-b border-slate-200 overflow-x-auto">
          {['rooms', 'activities', 'dining', 'wellness', 'packages'].map(tab => {
            const labels: Record<string, string> = { rooms: 'Rooms', activities: 'Activities', dining: 'Dining', wellness: 'Wellness', packages: 'Packages' };
            const items = tab === 'rooms' ? featuredRooms : activities.filter(a => a.category.toLowerCase() === tab || (tab === 'activities' && !['dining', 'wellness', 'packages'].includes(a.category.toLowerCase())));
            return (
              <button key={tab} onClick={() => setActiveTab(tab as any)}
                className={`pb-4 text-lg font-bold transition-all relative whitespace-nowrap ${activeTab === tab ? 'text-[#0066ff]' : 'text-slate-400'}`}>
                {labels[tab]} {items.length > 0 && <span className="text-xs ml-1">({items.length})</span>}
                {activeTab === tab && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-1 bg-[#0066ff] rounded-full" />}
              </button>
            );
          })}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {(() => {
            const categoryMap: Record<string, string> = { rooms: 'Rooms', activities: 'Activities', dining: 'Dining', wellness: 'Wellness', packages: 'Packages' };
            const items = activeTab === 'rooms'
              ? featuredRooms
              : activities.filter(a => a.category === categoryMap[activeTab] || (activeTab === 'activities' && !['Dining', 'Wellness', 'Packages'].includes(a.category)));

            if (items.length === 0) {
              return (
                <div className="col-span-full text-center py-20">
                  <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search size={32} className="text-slate-300" />
                  </div>
                  <p className="text-xl font-bold text-slate-900 mb-2">No {categoryMap[activeTab]} available yet</p>
                  <p className="text-slate-500">Check back soon — new experiences are added regularly.</p>
                </div>
              );
            }

            return items.map((item: any) => {
              const isRoom = activeTab === 'rooms';
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all group cursor-pointer"
                  onClick={() => setIsLoginOpen(true)}
                >
                  <div className="relative h-64 overflow-hidden">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-4 left-4 bg-[#0066ff] text-white text-xs font-bold px-3 py-1 rounded-full">
                      {isRoom ? 'Room' : item.category}
                    </div>
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-slate-900 mb-2">{item.name}</h3>
                    {item.tags?.length > 0 && (
                      <div className="flex gap-2 mb-4 flex-wrap">
                        {item.tags.slice(0, 3).map((tag: string) => (
                          <span key={tag} className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50 px-2 py-1 rounded">{tag}</span>
                        ))}
                      </div>
                    )}
                    <div className="flex items-end justify-between">
                      <div>
                        <span className="text-xs text-slate-400 block mb-1">{isRoom ? 'Per night' : 'Per person'}</span>
                        <span className="text-2xl font-bold text-[#0066ff]">ETB {item.price.toLocaleString()}</span>
                      </div>
                      <button className="bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold text-sm group-hover:bg-[#0066ff] transition-colors">
                        View Details
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            });
          })()}
        </div>
      </main>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* FEATURES SECTION */}
      {/* ═══════════════════════════════════════════════════════ */}
      <section id="features" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <span className="text-[#0066ff] text-sm font-bold uppercase tracking-widest">Why Choose Kuriftu</span>
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mt-4 mb-6">AI-Powered Luxury Hospitality</h2>
            <p className="text-xl text-slate-500 max-w-3xl mx-auto">The first resort in Ethiopia to combine world-class hospitality with artificial intelligence — creating stays that are personal, seamless, and unforgettable.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: <Sparkles size={28} />, title: 'Agentic AI', desc: 'Our autonomous AI agent runs 24/7 — creating packages, adjusting pricing, pushing alerts, and managing operations without human intervention. It thinks, decides, and acts.', color: 'bg-blue-50 text-[#0066ff]', badge: 'Core AI' },
              { icon: <TrendingUp size={28} />, title: 'Dynamic Price Prediction', desc: 'AI predicts optimal room pricing based on occupancy, Ethiopian holidays, fasting seasons, weekend demand, and competitor analysis — maximizing revenue automatically.', color: 'bg-amber-50 text-amber-600', badge: 'Revenue AI' },
              { icon: <Search size={28} />, title: 'Market Prediction', desc: 'Forecasts demand 7-30 days ahead using Ethiopian calendar events (Timkat, Meskel, Fasika), tourism seasons, and historical booking patterns to stay ahead of the market.', color: 'bg-green-50 text-green-600', badge: 'Forecast AI' },
              { icon: <Users size={28} />, title: 'Occupancy-Based Auto Actions', desc: 'When occupancy drops below 30%, AI launches promotions and flash deals. Above 80%, it activates premium pricing. Cancellations trigger automatic waitlist notifications.', color: 'bg-red-50 text-red-600', badge: 'Auto-Pilot' },
              { icon: <Star size={28} />, title: 'AI Concierge & Booking', desc: 'Personal AI assistant that knows each guest — their preferences, past bookings, dietary needs. Books rooms, spa, dining via chat. Works on web and Telegram.', color: 'bg-purple-50 text-purple-600', badge: 'Guest AI' },
              { icon: <Calendar size={28} />, title: 'Ethiopian Calendar Intelligence', desc: 'Built-in awareness of all Ethiopian holidays, Orthodox fasting periods, and tourism seasons. Auto-adjusts menus (vegan for fasting), pricing, and staffing recommendations.', color: 'bg-stone-100 text-stone-700', badge: 'Cultural AI' },
              { icon: <MapPin size={28} />, title: '7 Resort Locations', desc: 'From Bishoftu crater lakes to Lake Tana, Entoto mountains to Awash Falls — each property offers a unique Ethiopian landscape with AI-optimized operations.', color: 'bg-rose-50 text-rose-600', badge: null },
              { icon: <Coffee size={28} />, title: 'Signature Experiences', desc: 'Traditional coffee spa, heritage tours, lakeside BBQ with live music, and farm-to-table dining — all bookable through AI with personalized recommendations.', color: 'bg-cyan-50 text-cyan-600', badge: null },
              { icon: <ShieldCheck size={28} />, title: 'Loyalty & Rewards', desc: 'AI tracks guest spending and preferences to auto-upgrade loyalty tiers: Explorer → Trekker → Summit → Pinnacle. Each tier unlocks exclusive perks and priority booking.', color: 'bg-indigo-50 text-indigo-600', badge: null },
            ].map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group p-8 rounded-[2rem] border border-slate-100 hover:border-[#0066ff]/20 hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300"
              >
                <div className="flex items-start justify-between mb-6">
                  <div className={`w-14 h-14 ${feature.color} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    {feature.icon}
                  </div>
                  {feature.badge && (
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#0066ff] bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
                      {feature.badge}
                    </span>
                  )}
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
                <p className="text-slate-500 leading-relaxed text-sm">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* SERVICES SECTION */}
      {/* ═══════════════════════════════════════════════════════ */}
      <section id="services" className="py-24 bg-[#f5f7fa]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <span className="text-[#0066ff] text-sm font-bold uppercase tracking-widest">Our Offerings</span>
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mt-4 mb-6">Experiences Crafted for You</h2>
            <p className="text-xl text-slate-500 max-w-3xl mx-auto">From luxury rooms to adventure activities, world-class dining to restorative wellness — every experience is designed to exceed expectations.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { category: 'Rooms', count: featuredRooms.length, icon: '🏨', desc: 'Luxury suites, garden villas, and heritage rooms with stunning views', gradient: 'from-blue-600 to-blue-800' },
              { category: 'Activities', count: activities.filter(a => a.category === 'Activities').length, icon: '🏔️', desc: 'Kayaking, trekking, bird watching, heritage tours, and more', gradient: 'from-green-600 to-green-800' },
              { category: 'Dining', count: activities.filter(a => a.category === 'Dining').length, icon: '🍽️', desc: 'Ethiopian fine dining, lakeside BBQ, traditional coffee ceremonies', gradient: 'from-amber-600 to-amber-800' },
              { category: 'Wellness', count: activities.filter(a => a.category === 'Wellness').length, icon: '🧘', desc: 'Coffee spa, hot springs, yoga retreats, and meditation by the lake', gradient: 'from-purple-600 to-purple-800' },
            ].map((cat, i) => (
              <motion.div
                key={cat.category}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                onClick={() => { setActiveTab(cat.category.toLowerCase() as any); document.getElementById('resorts')?.scrollIntoView({ behavior: 'smooth' }); }}
                className="group cursor-pointer relative overflow-hidden rounded-[2rem] p-8 text-white min-h-[280px] flex flex-col justify-end"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${cat.gradient}`} />
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
                <div className="relative z-10">
                  <span className="text-5xl mb-4 block">{cat.icon}</span>
                  <h3 className="text-2xl font-bold mb-2">{cat.category}</h3>
                  <p className="text-white/80 text-sm leading-relaxed mb-3">{cat.desc}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-white/60 text-sm font-bold">{cat.count} available</span>
                    <ArrowRight size={20} className="group-hover:translate-x-2 transition-transform" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* HOW IT WORKS SECTION */}
      {/* ═══════════════════════════════════════════════════════ */}
      <section id="how-it-works" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <span className="text-[#0066ff] text-sm font-bold uppercase tracking-widest">Simple & Seamless</span>
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mt-4 mb-6">How It Works</h2>
            <p className="text-xl text-slate-500 max-w-3xl mx-auto">From discovery to checkout, your entire journey is powered by AI — making every step effortless.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
            {/* Connecting line */}
            <div className="hidden md:block absolute top-16 left-[12%] right-[12%] h-0.5 bg-gradient-to-r from-[#0066ff] via-amber-500 to-green-500" />

            {[
              { step: '01', title: 'Search & Discover', desc: 'Browse rooms, activities, dining, and wellness by date, guests, and preferences. Real-time availability from our database.', color: 'bg-[#0066ff]' },
              { step: '02', title: 'AI Personalizes', desc: 'Our AI Concierge learns your tastes — whether you love wellness, adventure, or fine dining — and recommends the perfect experiences.', color: 'bg-amber-500' },
              { step: '03', title: 'Book Instantly', desc: 'One-click booking with instant confirmation. Pay securely. Your reservation is live — no waiting, no callbacks.', color: 'bg-green-500' },
              { step: '04', title: 'Enjoy & Earn', desc: 'Experience Ethiopia at its finest. Earn loyalty points, get AI-curated suggestions during your stay, and unlock exclusive perks.', color: 'bg-purple-500' },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="text-center relative"
              >
                <div className={`w-16 h-16 ${item.color} text-white rounded-2xl flex items-center justify-center mx-auto mb-6 text-2xl font-bold shadow-lg relative z-10`}>
                  {item.step}
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-3">{item.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>

          {/* CTA */}
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="mt-16 text-center">
            <button
              onClick={() => setIsLoginOpen(true)}
              className="bg-[#0066ff] hover:bg-[#0052cc] text-white px-10 py-5 rounded-2xl font-bold text-lg transition-all shadow-xl shadow-blue-500/20 active:scale-95"
            >
              Start Your Journey
            </button>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* ABOUT US SECTION */}
      {/* ═══════════════════════════════════════════════════════ */}
      <section id="about" className="py-24 bg-slate-900 text-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <span className="text-[#0066ff] text-sm font-bold uppercase tracking-widest">Our Story</span>
              <h2 className="text-4xl md:text-5xl font-bold mt-4 mb-6 leading-tight">Ethiopia's Premier Luxury Resort Brand</h2>
              <p className="text-slate-400 text-lg leading-relaxed mb-6">
                Kuriftu Resort & Spa was born from a vision to showcase Ethiopia's breathtaking landscapes through world-class hospitality.
                From the volcanic crater lakes of Bishoftu to the ancient shores of Lake Tana, each property tells a unique story of Ethiopian heritage and modern luxury.
              </p>
              <p className="text-slate-400 text-lg leading-relaxed mb-8">
                Today, we're pioneering AI-powered hospitality in Africa — using artificial intelligence to personalize every guest's experience
                while preserving the warmth and authenticity that makes Ethiopian hospitality legendary.
              </p>

              <div className="grid grid-cols-3 gap-6">
                <div>
                  <p className="text-4xl font-bold text-[#0066ff]">7</p>
                  <p className="text-slate-500 text-sm font-bold mt-1">Resort Locations</p>
                </div>
                <div>
                  <p className="text-4xl font-bold text-amber-500">15+</p>
                  <p className="text-slate-500 text-sm font-bold mt-1">Years of Excellence</p>
                </div>
                <div>
                  <p className="text-4xl font-bold text-green-500">50K+</p>
                  <p className="text-slate-500 text-sm font-bold mt-1">Happy Guests</p>
                </div>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
              className="relative">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <img src="https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&q=80&w=400&h=300" alt="Kuriftu Resort" className="rounded-2xl w-full h-48 object-cover" referrerPolicy="no-referrer" />
                  <img src="https://images.unsplash.com/photo-1544161515-4af6b1d462c2?auto=format&fit=crop&q=80&w=400&h=400" alt="Ethiopian Spa" className="rounded-2xl w-full h-64 object-cover" referrerPolicy="no-referrer" />
                </div>
                <div className="space-y-4 pt-8">
                  <img src="https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=400&h=400" alt="Luxury Suite" className="rounded-2xl w-full h-64 object-cover" referrerPolicy="no-referrer" />
                  <img src="https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&q=80&w=400&h=300" alt="Ethiopian Dining" className="rounded-2xl w-full h-48 object-cover" referrerPolicy="no-referrer" />
                </div>
              </div>
              {/* Decorative element */}
              <div className="absolute -bottom-8 -right-8 w-40 h-40 bg-[#0066ff]/10 rounded-full blur-3xl" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* AI Itinerary Builder */}
      <AIItineraryBuilder />

      {/* Login Modal */}
      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onSwitchToRegister={() => { setIsLoginOpen(false); setIsRegisterOpen(true); }}
      />

      {/* Registration Modal */}
      <RegisterModal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
      />

      {/* Footer */}
      <footer className="bg-[#002244] text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 bg-[#0066ff] rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">K</span>
                </div>
                <span className="text-2xl font-bold tracking-tight">Kuriftu Resorts</span>
              </div>
              <p className="text-slate-400 max-w-md leading-relaxed mb-8">
                Kuriftu Resorts & Spa is Ethiopia's premier luxury hospitality brand, offering unique experiences that blend tradition with modern comfort.
              </p>
              <div className="flex gap-4">
                <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-[#0066ff] transition-colors cursor-pointer">
                  <Waves size={20} />
                </div>
                <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-[#0066ff] transition-colors cursor-pointer">
                  <Coffee size={20} />
                </div>
                <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-[#0066ff] transition-colors cursor-pointer">
                  <Utensils size={20} />
                </div>
              </div>
            </div>
            
            <div>
              <h5 className="font-bold mb-6">Quick Links</h5>
              <ul className="space-y-4 text-slate-400">
                <li><a href="#" className="hover:text-white transition-colors">About Us</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Our Resorts</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Special Offers</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact Us</a></li>
              </ul>
            </div>

            <div>
              <h5 className="font-bold mb-6">Support</h5>
              <ul className="space-y-4 text-slate-400">
                <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms of Use</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Cookie Policy</a></li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-slate-500">
            <p>© 2026 Kuriftu Resorts & Spa. All rights reserved.</p>
            <div className="flex gap-8">
              <span>Ethiopia's Leading Resort Brand</span>
              <span>AI-Powered Hospitality</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
