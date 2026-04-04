import { useState, useEffect } from 'react';
import { Member } from '../types';
import { supabase } from '../lib/supabase';
import { motion } from 'motion/react';
import { Calendar, Clock, Users, MapPin, CheckCircle2, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import { format } from 'date-fns';

interface MyBookingsProps {
  member: Member;
}

interface BookingWithService {
  id: string;
  service_id: string;
  start_date: string;
  end_date: string;
  guest_count: number;
  nights: number | null;
  base_price: number;
  dynamic_price: number;
  final_price: number;
  status: string;
  payment_status: string;
  created_at: string;
  services: {
    name: string;
    category_id: string;
    images: string[];
    duration_minutes: number;
  } | null;
}

export default function MyBookings({ member }: MyBookingsProps) {
  const [bookings, setBookings] = useState<BookingWithService[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('all');

  useEffect(() => {
    fetchBookings();
  }, [member.id]);

  const fetchBookings = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('bookings')
      .select('*, services(name, category_id, images, duration_minutes)')
      .eq('member_id', member.id)
      .order('start_date', { ascending: false });

    if (error) {
      console.error('Error fetching bookings:', error);
    } else {
      setBookings(data as BookingWithService[]);
    }
    setLoading(false);
  };

  const handleCancel = async (bookingId: string) => {
    const { error } = await supabase
      .from('bookings')
      .update({ status: 'Cancelled' })
      .eq('id', bookingId);

    if (!error) {
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'Cancelled' } : b));
    }
  };

  const now = new Date().toISOString();
  const filtered = bookings.filter(b => {
    if (filter === 'upcoming') return b.start_date >= now && b.status !== 'Cancelled';
    if (filter === 'past') return b.start_date < now || b.status === 'Cancelled';
    return true;
  });

  const statusConfig: Record<string, { color: string; bg: string; icon: React.ReactNode }> = {
    Confirmed: { color: 'text-green-600', bg: 'bg-green-50', icon: <CheckCircle2 size={14} /> },
    Pending: { color: 'text-amber-600', bg: 'bg-amber-50', icon: <AlertCircle size={14} /> },
    Cancelled: { color: 'text-red-600', bg: 'bg-red-50', icon: <XCircle size={14} /> },
    Completed: { color: 'text-blue-600', bg: 'bg-blue-50', icon: <CheckCircle2 size={14} /> },
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-serif text-stone-900 mb-2">My Bookings</h1>
        <p className="text-stone-500">Manage your reservations and upcoming experiences.</p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(['all', 'upcoming', 'past'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={clsx(
              "px-5 py-2.5 rounded-xl font-medium text-sm transition-all capitalize",
              filter === f
                ? "bg-stone-900 text-white shadow-lg shadow-stone-900/20"
                : "bg-white text-stone-600 hover:bg-stone-100 border border-stone-100"
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-stone-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-20 h-20 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Calendar className="text-stone-300" size={32} />
          </div>
          <h3 className="text-xl font-serif text-stone-900 mb-2">No bookings yet</h3>
          <p className="text-stone-500">Your reservations will appear here once you book an experience.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((booking, index) => {
            const status = statusConfig[booking.status] || statusConfig['Pending'];
            return (
              <motion.div
                key={booking.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white rounded-2xl border border-stone-100 overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="flex flex-col sm:flex-row">
                  {/* Image */}
                  <div className="sm:w-48 h-32 sm:h-auto overflow-hidden shrink-0">
                    <img
                      src={booking.services?.images?.[0] || `https://picsum.photos/seed/${booking.service_id}/400/300`}
                      alt={booking.services?.name || 'Booking'}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  {/* Details */}
                  <div className="flex-1 p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-lg font-bold text-stone-900">{booking.services?.name || 'Service'}</h3>
                        <div className="flex items-center gap-2 text-stone-400 text-xs font-bold uppercase tracking-widest mt-1">
                          <MapPin size={12} />
                          {booking.services?.category_id || 'Experience'}
                        </div>
                      </div>
                      <div className={clsx("flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold", status.bg, status.color)}>
                        {status.icon}
                        {booking.status}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-sm text-stone-500 mb-4">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={14} />
                        {format(new Date(booking.start_date), 'MMM d, yyyy')}
                        {booking.nights && booking.nights > 0 && (
                          <span className="text-stone-400">
                            &rarr; {format(new Date(booking.end_date), 'MMM d, yyyy')}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Users size={14} />
                        {booking.guest_count} {booking.guest_count === 1 ? 'Guest' : 'Guests'}
                      </div>
                      {booking.nights && (
                        <div className="flex items-center gap-1.5">
                          <Clock size={14} />
                          {booking.nights} {booking.nights === 1 ? 'Night' : 'Nights'}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-stone-50">
                      <div className="text-stone-900 font-bold text-lg">
                        ETB {booking.final_price.toLocaleString()}
                      </div>
                      {booking.status === 'Confirmed' && new Date(booking.start_date) > new Date() && (
                        <button
                          onClick={() => handleCancel(booking.id)}
                          className="text-red-500 hover:bg-red-50 px-4 py-2 rounded-xl text-sm font-bold transition-colors"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
