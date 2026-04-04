import { useState, useEffect } from 'react';
import { Member, Preferences } from '../types';
import { supabase } from '../lib/supabase';
import { motion } from 'motion/react';
import { User, Mail, Star, Award, Save, CheckCircle2, Loader2, Shield, Calendar, CreditCard } from 'lucide-react';
import { clsx } from 'clsx';

interface ProfilePageProps {
  member: Member;
  onMemberUpdate: (member: Member) => void;
}

const TIER_CONFIG = {
  Explorer: { color: 'bg-stone-500', next: 'Trekker', pointsNeeded: 1000 },
  Trekker: { color: 'bg-blue-500', next: 'Summit', pointsNeeded: 5000 },
  Summit: { color: 'bg-amber-500', next: 'Pinnacle', pointsNeeded: 15000 },
  Pinnacle: { color: 'bg-purple-500', next: null, pointsNeeded: null },
};

export default function ProfilePage({ member, onMemberUpdate }: ProfilePageProps) {
  const [fullName, setFullName] = useState(member.full_name);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [prefs, setPrefs] = useState<Preferences | null>(null);
  const [stats, setStats] = useState({ totalBookings: 0, totalSpent: 0 });

  useEffect(() => {
    fetchPreferences();
    fetchStats();
  }, [member.id]);

  const fetchPreferences = async () => {
    const { data } = await supabase
      .from('member_preferences')
      .select('*')
      .eq('member_id', member.id)
      .single();
    if (data) setPrefs(data as Preferences);
  };

  const fetchStats = async () => {
    const { data } = await supabase
      .from('bookings')
      .select('final_price, status')
      .eq('member_id', member.id);

    if (data) {
      const confirmed = data.filter(b => b.status !== 'Cancelled');
      setStats({
        totalBookings: confirmed.length,
        totalSpent: confirmed.reduce((sum, b) => sum + (b.final_price || 0), 0),
      });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('members')
      .update({ full_name: fullName })
      .eq('id', member.id);

    if (!error) {
      onMemberUpdate({ ...member, full_name: fullName });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
    setSaving(false);
  };

  const tier = TIER_CONFIG[member.loyalty_tier];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-serif text-stone-900 mb-2">My Profile</h1>
        <p className="text-stone-500">Manage your account and view your loyalty status.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Card */}
        <div className="lg:col-span-2 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-stone-100 p-8"
          >
            <h2 className="text-lg font-bold text-stone-900 mb-6">Personal Information</h2>

            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-bold text-stone-500">Full Name</label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 bg-stone-50 border border-stone-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900/5 focus:border-stone-300 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-stone-500">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
                  <input
                    type="email"
                    value={member.email}
                    disabled
                    className="w-full pl-12 pr-4 py-3.5 bg-stone-50 border border-stone-100 rounded-xl text-stone-400 cursor-not-allowed"
                  />
                </div>
              </div>

              <button
                onClick={handleSave}
                disabled={saving || fullName === member.full_name}
                className={clsx(
                  "flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all",
                  saved
                    ? "bg-green-500 text-white"
                    : "bg-stone-900 text-white hover:bg-stone-800 disabled:bg-stone-200 disabled:text-stone-400"
                )}
              >
                {saving ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : saved ? (
                  <CheckCircle2 size={16} />
                ) : (
                  <Save size={16} />
                )}
                {saved ? 'Saved!' : 'Save Changes'}
              </button>
            </div>
          </motion.div>

          {/* Preferences */}
          {prefs && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl border border-stone-100 p-8"
            >
              <h2 className="text-lg font-bold text-stone-900 mb-6">Your Preferences</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div>
                  <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-3">Activities</p>
                  <div className="flex flex-wrap gap-2">
                    {prefs.activities.map(a => (
                      <span key={a} className="bg-stone-50 text-stone-700 px-3 py-1.5 rounded-lg text-xs font-medium border border-stone-100">{a}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-3">Dining</p>
                  <div className="flex flex-wrap gap-2">
                    {prefs.dining.map(d => (
                      <span key={d} className="bg-stone-50 text-stone-700 px-3 py-1.5 rounded-lg text-xs font-medium border border-stone-100">{d}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-3">Wellness</p>
                  <div className="flex flex-wrap gap-2">
                    {prefs.wellness.map(w => (
                      <span key={w} className="bg-stone-50 text-stone-700 px-3 py-1.5 rounded-lg text-xs font-medium border border-stone-100">{w}</span>
                    ))}
                  </div>
                </div>
              </div>
              {prefs.ai_segment && (
                <div className="mt-6 pt-6 border-t border-stone-50 flex items-center gap-3">
                  <Star size={16} className="text-amber-500" />
                  <span className="text-sm text-stone-600">AI Segment: <strong className="text-stone-900">{prefs.ai_segment}</strong></span>
                  {prefs.tagline && <span className="text-sm text-stone-400 italic">"{prefs.tagline}"</span>}
                </div>
              )}
            </motion.div>
          )}
        </div>

        {/* Sidebar - Loyalty & Stats */}
        <div className="space-y-6">
          {/* Loyalty Card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-stone-900 rounded-2xl p-8 text-white relative overflow-hidden"
          >
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/5 rounded-full blur-2xl" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-6">
                <Award size={20} className="text-amber-400" />
                <span className="text-xs font-bold uppercase tracking-widest text-stone-400">Loyalty Tier</span>
              </div>
              <h3 className="text-3xl font-serif mb-2">{member.loyalty_tier}</h3>
              <div className="flex items-center gap-2 mb-6">
                <Shield size={14} className="text-amber-400" />
                <span className="text-sm text-stone-400">{member.points_balance.toLocaleString()} points</span>
              </div>

              {tier.next && tier.pointsNeeded && (
                <div>
                  <div className="flex justify-between text-xs text-stone-400 mb-2">
                    <span>{member.loyalty_tier}</span>
                    <span>{tier.next}</span>
                  </div>
                  <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={clsx("h-full rounded-full", tier.color)}
                      style={{ width: `${Math.min((member.points_balance / tier.pointsNeeded) * 100, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-stone-500 mt-2">
                    {(tier.pointsNeeded - member.points_balance).toLocaleString()} points to {tier.next}
                  </p>
                </div>
              )}
            </div>
          </motion.div>

          {/* Quick Stats */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl border border-stone-100 p-6 space-y-4"
          >
            <h3 className="text-sm font-bold text-stone-400 uppercase tracking-widest">Activity</h3>
            <div className="flex items-center gap-4 p-4 bg-stone-50 rounded-xl">
              <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
                <Calendar size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-stone-900">{stats.totalBookings}</p>
                <p className="text-xs text-stone-500">Total Bookings</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 bg-stone-50 rounded-xl">
              <div className="w-10 h-10 bg-green-100 text-green-600 rounded-xl flex items-center justify-center">
                <CreditCard size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-stone-900">ETB {stats.totalSpent.toLocaleString()}</p>
                <p className="text-xs text-stone-500">Total Spent</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
