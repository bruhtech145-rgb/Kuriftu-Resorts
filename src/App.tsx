import React, { useState, useEffect } from 'react';
import { auth, db, googleProvider, signInWithPopup, signOut, onAuthStateChanged, handleFirestoreError } from './lib/firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { Member } from './types';
import Layout from './components/Layout';
import Onboarding from './components/Onboarding';
import MemberPortal from './components/MemberPortal';
import AdminDashboard from './components/AdminDashboard';
import LandingPage from './components/LandingPage';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Check admin status first to avoid unnecessary member fetch if admin
        const adminStatus = currentUser.email === "bruhtech145@gmail.com";
        setIsAdmin(adminStatus);

        // Check if member profile exists
        const memberRef = doc(db, 'members', currentUser.uid);
        try {
          const memberSnap = await getDoc(memberRef);
          
          if (memberSnap.exists()) {
            setMember(memberSnap.data() as Member);
          } else {
            // Create initial member profile
            const newMember: Member = {
              id: currentUser.uid,
              email: currentUser.email || '',
              full_name: currentUser.displayName || 'Guest',
              loyalty_tier: 'Explorer',
              points_balance: 0,
              onboarding_completed: false,
            };
            await setDoc(memberRef, newMember);
            setMember(newMember);
          }
        } catch (error) {
          handleFirestoreError(error, 'get/set', `members/${currentUser.uid}`);
        }
      } else {
        setMember(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
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

  if (!user) {
    return <LandingPage onLogin={handleLogin} />;
  }

  if (member && !member.onboarding_completed && !isAdmin) {
    return <Onboarding member={member} onComplete={(updatedMember) => setMember(updatedMember)} />;
  }

  return (
    <Layout user={user} member={member} isAdmin={isAdmin} onLogout={handleLogout}>
      {isAdmin ? <AdminDashboard /> : (member ? <MemberPortal member={member} /> : null)}
    </Layout>
  );
}
