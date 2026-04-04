import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Calendar, Users, CreditCard, CheckCircle2, AlertCircle, Clock, Moon, ChevronRight } from 'lucide-react';
import { Service, Member, PricingRule } from '../types';
import { supabase } from '../lib/supabase';
import { format, addDays, differenceInDays } from 'date-fns';
import { calculateDynamicPrice } from '../lib/pricing';
import { clsx } from 'clsx';

interface BookingModalProps {
  service: Service;
  member: Member;
  onClose: () => void;
}

export default function BookingModal({ service, member, onClose }: BookingModalProps) {
  const isRoom = service.category_id === 'Rooms';
  const [step, setStep] = useState(1);
  const [pricingRules, setPricingRules] = useState<PricingRule[]>([]);
  const [startDate, setStartDate] = useState(format(addDays(new Date(), 1), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(addDays(new Date(), 2), 'yyyy-MM-dd'));
  const [guestCount, setGuestCount] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
    fetchRules();
  }, []);

  const nights = useMemo(() => {
    if (!isRoom) return 1;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diff = differenceInDays(end, start);
    return diff > 0 ? diff : 1;
  }, [startDate, endDate, isRoom]);

  const dynamicPrice = useMemo(() => {
    const date = new Date(startDate);
    const context = {
      occupancy: 85, // Simulated
      isWeekend: date.getDay() === 0 || date.getDay() === 6,
      isHoliday: false
    };
    return calculateDynamicPrice(service, pricingRules, context);
  }, [service, pricingRules, startDate]);

  const totalAmount = useMemo(() => {
    if (isRoom) {
      return dynamicPrice * nights;
    }
    return dynamicPrice * guestCount;
  }, [isRoom, dynamicPrice, nights, guestCount]);

  const handleBooking = async () => {
    setLoading(true);
    setError(null);
    try {
      const bookingData = {
        member_id: member.id,
        service_id: service.id,
        start_date: new Date(startDate).toISOString(),
        end_date: isRoom ? new Date(endDate).toISOString() : new Date(startDate).toISOString(),
        guest_count: guestCount,
        base_price: service.base_price,
        dynamic_price: dynamicPrice,
        final_price: totalAmount,
        status: 'Confirmed',
        payment_status: 'Paid',
        created_at: new Date().toISOString(),
        nights: isRoom ? nights : null
      };

      const { error: insertError } = await supabase
        .from('bookings')
        .insert(bookingData);

      if (insertError) throw insertError;
      setStep(3);
    } catch (err) {
      console.error('Booking error:', err);
      setError("Failed to complete booking. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-stone-900/40 backdrop-blur-md"
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="p-8 border-b border-stone-100 flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-serif text-stone-900">{isRoom ? 'Book Your Stay' : 'Book Experience'}</h3>
            <p className="text-stone-500 text-sm">{service.name}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-stone-50 rounded-full transition-colors">
            <X size={24} className="text-stone-400" />
          </button>
        </div>

        <div className="p-8">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-stone-400">
                      {isRoom ? 'Check-in' : 'Select Date'}
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
                      <input
                        type="date"
                        value={startDate}
                        min={format(new Date(), 'yyyy-MM-dd')}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-stone-50 border border-stone-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900/5 text-sm font-bold text-stone-900"
                      />
                    </div>
                  </div>

                  {isRoom && (
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-stone-400">Check-out</label>
                      <div className="relative">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
                        <input
                          type="date"
                          value={endDate}
                          min={format(addDays(new Date(startDate), 1), 'yyyy-MM-dd')}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="w-full pl-12 pr-4 py-3 bg-stone-50 border border-stone-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900/5 text-sm font-bold text-stone-900"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-stone-400">Number of Guests</label>
                  <div className="relative">
                    <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={20} />
                    <select
                      value={guestCount}
                      onChange={(e) => setGuestCount(Number(e.target.value))}
                      className="w-full pl-12 pr-4 py-4 bg-stone-50 border border-stone-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-stone-900/5 appearance-none font-bold text-stone-900"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                        <option key={n} value={n}>{n} {n === 1 ? 'Guest' : 'Guests'}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="bg-stone-50 p-6 rounded-2xl space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-stone-500">{isRoom ? 'Price per Night' : 'Base Price (per guest)'}</span>
                    <span className="font-medium text-stone-900">ETB {service.base_price.toLocaleString()}</span>
                  </div>
                  {dynamicPrice !== service.base_price && (
                    <div className="flex justify-between text-sm">
                      <span className="text-stone-500">Dynamic Adjustment</span>
                      <span className={clsx(
                        "font-medium",
                        dynamicPrice > service.base_price ? "text-red-600" : "text-green-600"
                      )}>
                        {dynamicPrice > service.base_price ? '+' : ''}ETB {(dynamicPrice - service.base_price).toLocaleString()}
                      </span>
                    </div>
                  )}
                  {isRoom && (
                    <div className="flex justify-between text-sm">
                      <span className="text-stone-500">Duration</span>
                      <span className="font-medium text-stone-900 flex items-center gap-1">
                        <Moon size={14} /> {nights} {nights === 1 ? 'Night' : 'Nights'}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-serif pt-3 border-t border-stone-200">
                    <span className="text-stone-900">Total Amount</span>
                    <span className="text-stone-900">ETB {totalAmount.toLocaleString()}</span>
                  </div>
                </div>

                <button
                  onClick={() => setStep(2)}
                  className="w-full bg-stone-900 text-white py-4 rounded-2xl font-bold hover:bg-stone-800 transition-all"
                >
                  Proceed to Payment
                </button>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="bg-stone-900 p-8 rounded-3xl text-white relative overflow-hidden">
                  <div className="relative z-10">
                    <CreditCard size={32} className="mb-8 opacity-50" />
                    <div className="space-y-1">
                      <p className="text-xs uppercase tracking-widest opacity-50">Amount to Pay</p>
                      <p className="text-3xl font-serif">ETB {totalAmount.toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/5 rounded-full blur-2xl" />
                </div>

                <div className="space-y-4">
                  <button className="w-full flex items-center justify-between px-6 py-4 border-2 border-stone-900 rounded-2xl font-bold">
                    <span>Chapa Payment Gateway</span>
                    <span className="text-xs bg-stone-900 text-white px-2 py-1 rounded">Local</span>
                  </button>
                  <button className="w-full flex items-center justify-between px-6 py-4 border border-stone-100 rounded-2xl font-medium text-stone-400">
                    <span>Stripe (International)</span>
                    <span className="text-xs border border-stone-200 px-2 py-1 rounded">Coming Soon</span>
                  </button>
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-red-600 bg-red-50 p-4 rounded-xl text-sm">
                    <AlertCircle size={16} />
                    {error}
                  </div>
                )}

                <div className="flex gap-4">
                  <button onClick={() => setStep(1)} className="flex-1 border border-stone-200 py-4 rounded-2xl font-medium">Back</button>
                  <button
                    onClick={handleBooking}
                    disabled={loading}
                    className="flex-[2] bg-stone-900 text-white py-4 rounded-2xl font-bold hover:bg-stone-800 transition-all flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                        className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full"
                      />
                    ) : (
                      "Confirm & Pay"
                    )}
                  </button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-10 space-y-6"
              >
                <div className="w-20 h-20 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 size={48} />
                </div>
                <h3 className="text-3xl font-serif text-stone-900">Booking Confirmed!</h3>
                <p className="text-stone-500 leading-relaxed px-8">
                  Your reservation for <span className="font-bold text-stone-900">{service.name}</span> has been successfully processed. 
                  A confirmation email has been sent to your inbox.
                </p>
                <button
                  onClick={onClose}
                  className="w-full bg-stone-900 text-white py-4 rounded-2xl font-bold hover:bg-stone-800 transition-all"
                >
                  Done
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
