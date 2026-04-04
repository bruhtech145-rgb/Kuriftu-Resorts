import React, { useState } from 'react';
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
  Palmtree
} from 'lucide-react';
import { AIItineraryBuilder } from './AIItineraryBuilder';
import { RegisterModal } from './RegisterModal';

interface LandingPageProps {
  onLogin: () => void;
  onAdminPortal: () => void;
}

export default function LandingPage({ onLogin, onAdminPortal }: LandingPageProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'rooms' | 'activities'>('rooms');
  const [destination, setDestination] = useState('Kuriftu Resort & Spa African Village');
  const [guests, setGuests] = useState('2 Adults, 1 Room');

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

  const featuredRooms = [
    // ... existing rooms ...
    {
      id: 'room-1',
      name: 'Luxury Rock Suite',
      price: 12500,
      rating: 4.9,
      reviews: 128,
      image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&q=80&w=800',
      tags: ['Mountain View', 'Private Balcony']
    },
    {
      id: 'room-2',
      name: 'Executive Garden Villa',
      price: 15800,
      rating: 4.8,
      reviews: 95,
      image: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&q=80&w=800',
      tags: ['Garden Access', 'Spa Bath']
    },
    {
      id: 'room-3',
      name: 'Presidential Heritage Suite',
      price: 25000,
      rating: 5.0,
      reviews: 42,
      image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=800',
      tags: ['All-Inclusive', 'Personal Butler']
    }
  ];

  const activities = [
    {
      id: 'act-1',
      name: 'Resort Heritage Tour',
      price: 3500,
      rating: 4.9,
      image: 'https://images.unsplash.com/photo-1523805081730-614449379e7d?auto=format&fit=crop&q=80&w=800',
      category: 'Culture'
    },
    {
      id: 'act-2',
      name: 'Traditional Coffee Spa',
      price: 2800,
      rating: 4.7,
      image: 'https://images.unsplash.com/photo-1544161515-4af6b1d462c2?auto=format&fit=crop&q=80&w=800',
      category: 'Wellness'
    }
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
                <a href="#" className="text-[#0066ff] relative after:absolute after:bottom-[-28px] after:left-0 after:right-0 after:h-1 after:bg-[#0066ff] after:rounded-full">Resorts</a>
                <a href="#" className="hover:text-[#0066ff] transition-colors">Spa & Wellness</a>
                <a href="#" className="hover:text-[#0066ff] transition-colors">Dining</a>
                <a href="#" className="hover:text-[#0066ff] transition-colors">Activities</a>
                <a href="#" className="hover:text-[#0066ff] transition-colors">Water Park</a>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden xl:flex items-center gap-2">
                <button
                  onClick={onLogin}
                  className="flex items-center gap-2 text-slate-600 hover:text-[#0066ff] font-bold text-sm px-4 py-2 rounded-xl hover:bg-slate-50 transition-all"
                >
                  <LogIn size={18} />
                  Member Portal
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
                <button onClick={onLogin} className="flex flex-col items-center gap-3 p-6 bg-slate-50 rounded-[2rem] text-slate-900">
                  <LogIn size={24} className="text-[#0066ff]" />
                  <span className="font-bold text-sm">Member</span>
                </button>
                <button onClick={onAdminPortal} className="flex flex-col items-center gap-3 p-6 bg-slate-50 rounded-[2rem] text-slate-900">
                  <Settings size={24} className="text-[#0066ff]" />
                  <span className="font-bold text-sm">Admin</span>
                </button>
              </div>

              {[
                { label: 'Resorts', icon: <Palmtree size={20} /> },
                { label: 'Spa & Wellness', icon: <Waves size={20} /> },
                { label: 'Dining', icon: <Utensils size={20} /> },
                { label: 'Activities', icon: <Compass size={20} /> },
                { label: 'Water Park', icon: <Waves size={20} /> },
                { label: 'Meetings', icon: <Users size={20} /> },
              ].map((link) => (
                <a 
                  key={link.label}
                  href="#" 
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
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
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
              {/* Destination */}
              <div className="flex-1 p-4 border-b md:border-b-0 md:border-r border-slate-100">
                <div className="flex items-center gap-3 mb-1">
                  <MapPin size={18} className="text-[#0066ff]" />
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Destination</span>
                </div>
                <select 
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="w-full text-lg font-bold text-slate-900 bg-transparent focus:outline-none cursor-pointer appearance-none"
                >
                  {destinations.map(dest => (
                    <option key={dest} value={dest}>{dest}</option>
                  ))}
                </select>
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
                    className="flex-1 text-sm font-bold text-slate-900 focus:outline-none bg-slate-50 px-3 py-2 rounded-xl border border-transparent focus:border-[#0066ff]/20 transition-all cursor-pointer"
                    defaultValue="2026-04-15"
                  />
                  <span className="text-slate-300 font-bold">→</span>
                  <input 
                    type="date" 
                    className="flex-1 text-sm font-bold text-slate-900 focus:outline-none bg-slate-50 px-3 py-2 rounded-xl border border-transparent focus:border-[#0066ff]/20 transition-all cursor-pointer"
                    defaultValue="2026-04-20"
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
                onClick={onLogin}
                className="bg-[#ff9500] hover:bg-[#e68600] text-white px-10 py-6 md:py-0 rounded-2xl md:rounded-r-3xl font-bold text-xl transition-all flex items-center justify-center gap-3 shadow-lg shadow-orange-500/20 active:scale-95"
              >
                <Search size={24} />
                <span className="md:hidden">Search Now</span>
                <span className="hidden md:inline">Search</span>
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Tabs */}
        <div className="flex items-center gap-8 mb-8 border-b border-slate-200">
          <button 
            onClick={() => setActiveTab('rooms')}
            className={`pb-4 text-lg font-bold transition-all relative ${activeTab === 'rooms' ? 'text-[#0066ff]' : 'text-slate-400'}`}
          >
            Featured Rooms
            {activeTab === 'rooms' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-1 bg-[#0066ff] rounded-full" />}
          </button>
          <button 
            onClick={() => setActiveTab('activities')}
            className={`pb-4 text-lg font-bold transition-all relative ${activeTab === 'activities' ? 'text-[#0066ff]' : 'text-slate-400'}`}
          >
            Top Activities
            {activeTab === 'activities' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-1 bg-[#0066ff] rounded-full" />}
          </button>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {activeTab === 'rooms' ? (
            featuredRooms.map((room) => (
              <motion.div
                key={room.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all group cursor-pointer"
                onClick={onLogin}
              >
                <div className="relative h-64 overflow-hidden">
                  <img 
                    src={room.image} 
                    alt={room.name} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-md text-white text-xs font-bold px-3 py-1 rounded-full">
                    Featured Room
                  </div>
                </div>
                <div className="p-6">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-xl font-bold text-slate-900">{room.name}</h3>
                    <div className="flex items-center gap-1 text-[#ff9500]">
                      <Star size={16} fill="currentColor" />
                      <span className="font-bold">{room.rating}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 mb-4">
                    {room.tags.map(tag => (
                      <span key={tag} className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50 px-2 py-1 rounded">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-end justify-between">
                    <div>
                      <span className="text-xs text-slate-400 block mb-1">Starting from</span>
                      <span className="text-2xl font-bold text-[#0066ff]">ETB {room.price.toLocaleString()}</span>
                      <span className="text-sm text-slate-400"> / night</span>
                    </div>
                    <button className="bg-slate-900 text-white p-3 rounded-2xl group-hover:bg-[#0066ff] transition-colors">
                      <ArrowRight size={20} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            activities.map((act) => (
              <motion.div
                key={act.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all group cursor-pointer"
                onClick={onLogin}
              >
                <div className="relative h-64 overflow-hidden">
                  <img 
                    src={act.image} 
                    alt={act.name} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-4 left-4 bg-[#0066ff] text-white text-xs font-bold px-3 py-1 rounded-full">
                    {act.category}
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold text-slate-900 mb-4">{act.name}</h3>
                  <div className="flex items-end justify-between">
                    <div>
                      <span className="text-xs text-slate-400 block mb-1">Price per person</span>
                      <span className="text-2xl font-bold text-[#0066ff]">ETB {act.price.toLocaleString()}</span>
                    </div>
                    <button className="bg-slate-900 text-white px-6 py-3 rounded-2xl group-hover:bg-[#0066ff] transition-colors font-bold">
                      Book Now
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </main>

      {/* AI Itinerary Builder */}
      <AIItineraryBuilder />

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
