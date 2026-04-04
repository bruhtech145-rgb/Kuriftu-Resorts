import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { Member } from './types';
import Layout from './components/Layout';
import Onboarding from './components/Onboarding';
import MemberPortal from './components/MemberPortal';
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

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        handleUser(session.user);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        await handleUser(session.user);
      } else {
        setUser(null);
        setMember(null);
        setIsAdmin(false);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleUser = async (currentUser: any) => {
    setUser(currentUser);
    const adminStatus = currentUser.email === "bruhtech145@gmail.com";
    setIsAdmin(adminStatus);

    // Check if member profile exists
    const { data: existingMember, error } = await supabase
      .from('members')
      .select('*')
      .eq('id', currentUser.id)
      .single();

    if (error && error.code === 'PGRST116') {
      // No member found — create one
      const newMember: Member = {
        id: currentUser.id,
        email: currentUser.email || '',
        full_name: currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'Guest',
        loyalty_tier: 'Explorer',
        points_balance: 0,
        onboarding_completed: false,
      };
      const { data: inserted, error: insertError } = await supabase
        .from('members')
        .insert(newMember)
        .select()
        .single();

      if (insertError) {
        console.error('Failed to create member profile:', insertError);
        return;
      }
      setMember(inserted as Member);
    } else if (error) {
      console.error('Error fetching member:', error);
    } else {
      setMember(existingMember as Member);
    }
    setLoading(false);
  };

  const handleLogin = async () => {
    try {
      await supabase.auth.signInWithOAuth({
        provider: 'google',
      });
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

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
    return <AdminDashboard onLogout={() => setView('home')} />;
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

  return (
    <Layout user={user} member={member} isAdmin={false} onLogout={handleLogout}>
      {member ? <MemberPortal member={member} /> : null}
    </Layout>
  );
}
