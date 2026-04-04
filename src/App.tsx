import { useState, useEffect, useRef } from 'react';
import { supabase } from './lib/supabase';
import { Member } from './types';
import Layout from './components/Layout';
import Onboarding from './components/Onboarding';
import MemberPortal from './components/MemberPortal';
import MyBookings from './components/MyBookings';
import ProfilePage from './components/ProfilePage';
import ConciergePage from './components/ConciergePage';
import { AdminDashboard } from './components/AdminDashboard';
import { AdminLogin } from './components/AdminLogin';
import LandingPage from './components/LandingPage';
import { motion } from 'motion/react';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [view, setView] = useState<'home' | 'admin-login' | 'admin-dashboard'>('home');
  const [activeTab, setActiveTab] = useState('dashboard');
  const handlingRef = useRef(false); // Prevent double-handling

  useEffect(() => {
    // Single init — check session once
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        handleUser(session.user);
      } else {
        setLoading(false);
      }
    });

    // Listen for future auth changes (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (_event === 'SIGNED_IN' && session?.user) {
        handleUser(session.user);
      } else if (_event === 'SIGNED_OUT') {
        setUser(null);
        setMember(null);
        setIsAdmin(false);
        setView('home');
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleUser = async (currentUser: any) => {
    // Prevent concurrent calls (getSession + onAuthStateChange can both fire)
    if (handlingRef.current) return;
    handlingRef.current = true;

    try {
      setUser(currentUser);

      // 1. Check admin status — profiles table might not exist, so handle gracefully
      let adminStatus = false;
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', currentUser.id)
          .single();
        adminStatus = profile?.is_admin === true;
      } catch {
        // profiles table might not exist — not admin
      }
      setIsAdmin(adminStatus);

      if (adminStatus) {
        setView('admin-dashboard');
      }

      // 2. Get or create member profile
      let memberData: Member | null = null;

      const { data: existing, error } = await supabase
        .from('members')
        .select('*')
        .eq('id', currentUser.id)
        .single();

      if (existing && !error) {
        memberData = existing as Member;
      } else {
        // Create new member
        const newMember: Member = {
          id: currentUser.id,
          email: currentUser.email || '',
          full_name: currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'Guest',
          loyalty_tier: adminStatus ? 'Pinnacle' : 'Explorer',
          points_balance: 0,
          onboarding_completed: adminStatus,
        };

        const { data: inserted } = await supabase
          .from('members')
          .insert(newMember)
          .select()
          .single();

        memberData = (inserted as Member) || newMember;
      }

      setMember(memberData);
    } catch (err) {
      console.error('handleUser error:', err);
      // Absolute fallback — never leave user stuck
      setMember({
        id: currentUser.id,
        email: currentUser.email || '',
        full_name: currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'User',
        loyalty_tier: 'Explorer',
        points_balance: 0,
        onboarding_completed: true,
      });
    } finally {
      setLoading(false);
      handlingRef.current = false;
    }
  };

  const handleLogin = async () => {
    try {
      await supabase.auth.signInWithOAuth({ provider: 'google' });
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // ─── Render ───

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-12 h-12 border-4 border-stone-200 border-t-stone-800 rounded-full"
        />
      </div>
    );
  }

  if (view === 'admin-login') {
    return (
      <AdminLogin
        onBack={() => setView('home')}
        onLoginSuccess={() => setView('admin-dashboard')}
      />
    );
  }

  if (view === 'admin-dashboard') {
    return <AdminDashboard onLogout={async () => {
      await supabase.auth.signOut();
      setView('home');
    }} />;
  }

  if (!user) {
    return (
      <LandingPage
        onLogin={handleLogin}
        onAdminPortal={() => setView('admin-login')}
      />
    );
  }

  if (member && !member.onboarding_completed && !isAdmin) {
    return <Onboarding member={member} onComplete={(updatedMember) => setMember(updatedMember)} />;
  }

  const renderContent = () => {
    if (!member) return null;
    switch (activeTab) {
      case 'bookings':
        return <MyBookings member={member} />;
      case 'concierge':
        return <ConciergePage member={member} />;
      case 'profile':
        return <ProfilePage member={member} onMemberUpdate={setMember} />;
      default:
        return <MemberPortal member={member} />;
    }
  };

  return (
    <Layout user={user} member={member} isAdmin={false} onLogout={handleLogout} activeTab={activeTab} onTabChange={setActiveTab}>
      {renderContent()}
    </Layout>
  );
}
