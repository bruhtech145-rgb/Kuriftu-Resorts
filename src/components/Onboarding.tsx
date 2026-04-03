import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Member, Preferences } from '../types';
import { db, handleFirestoreError } from '../lib/firebase';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { Check, ChevronRight, Sparkles, Map, Utensils, Heart, Wallet } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface OnboardingProps {
  member: Member;
  onComplete: (member: Member) => void;
}

const ACTIVITY_OPTIONS = ["Hiking & Trekking", "Cultural Tours", "Wildlife Safari", "Photography", "Bird Watching", "Rock Climbing", "Swimming", "Horse Riding", "Historical Sites", "Coffee Ceremony"];
const DINING_OPTIONS = ["Ethiopian Cuisine", "International", "Fine Dining", "Vegetarian/Vegan", "Halal", "Seafood", "Wine Pairing", "Breakfast packages"];
const WELLNESS_OPTIONS = ["Spa Treatments", "Yoga & Meditation", "Hot Springs", "Fitness Classes", "Sauna", "Traditional Coffee Spa"];

export default function Onboarding({ member, onComplete }: OnboardingProps) {
  const [step, setStep] = useState(1);
  const [prefs, setPrefs] = useState<Preferences>({
    activities: [],
    dining: [],
    wellness: [],
    budget_tier: "Mid"
  });
  const [loading, setLoading] = useState(false);

  const toggleOption = (category: keyof Preferences, option: string) => {
    setPrefs(prev => {
      const current = prev[category] as string[];
      if (current.includes(option)) {
        return { ...prev, [category]: current.filter(o => o !== option) };
      }
      return { ...prev, [category]: [...current, option] };
    });
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      const aiResult = {
        ai_segment: "Adventure Enthusiast",
        tagline: "The Explorer of Lalibela"
      };

      const memberRef = doc(db, 'members', member.id);
      const updatedMember = {
        ...member,
        onboarding_completed: true,
      };
      
      try {
        await updateDoc(memberRef, { onboarding_completed: true });
        
        const prefsRef = doc(db, 'members', member.id, 'preferences', 'current');
        await setDoc(prefsRef, {
          ...prefs,
          ...aiResult,
          member_id: member.id,
          ai_segment_updated_at: new Date().toISOString()
        });

        onComplete(updatedMember);
      } catch (error) {
        handleFirestoreError(error, 'write', `members/${member.id}`);
      }
    } catch (error) {
      console.error("Onboarding failed", error);
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="w-16 h-16 bg-stone-900 rounded-2xl flex items-center justify-center mb-8">
              <Sparkles className="text-white" size={32} />
            </div>
            <h2 className="text-4xl font-serif text-stone-900 leading-tight">Welcome to the Lalibela Experience</h2>
            <p className="text-xl text-stone-500 leading-relaxed">
              To create a stay as unique as you are, we've designed an AI-guided onboarding process. 
              It takes less than 2 minutes to personalize your journey.
            </p>
            <button
              onClick={() => setStep(2)}
              className="group flex items-center gap-3 bg-stone-900 text-white px-8 py-4 rounded-2xl hover:bg-stone-800 transition-all text-lg font-medium"
            >
              Start Personalization
              <ChevronRight className="group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>
        );
      case 2:
        return (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-8"
          >
            <div className="flex items-center gap-3 text-stone-400">
              <Map size={20} />
              <span className="uppercase tracking-widest text-xs font-bold">Step 1 of 4</span>
            </div>
            <h2 className="text-3xl font-serif text-stone-900">What activities excite you?</h2>
            <div className="grid grid-cols-2 gap-3">
              {ACTIVITY_OPTIONS.map(option => (
                <button
                  key={option}
                  onClick={() => toggleOption('activities', option)}
                  className={cn(
                    "px-4 py-4 rounded-2xl border-2 text-left transition-all relative group",
                    prefs.activities.includes(option)
                      ? "border-stone-900 bg-stone-900 text-white"
                      : "border-stone-100 hover:border-stone-300 text-stone-600"
                  )}
                >
                  <span className="font-medium">{option}</span>
                  {prefs.activities.includes(option) && (
                    <Check size={16} className="absolute top-4 right-4" />
                  )}
                </button>
              ))}
            </div>
            <button
              disabled={prefs.activities.length === 0}
              onClick={() => setStep(3)}
              className="w-full bg-stone-900 text-white py-4 rounded-2xl hover:bg-stone-800 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue
            </button>
          </motion.div>
        );
      case 3:
        return (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-8"
          >
            <div className="flex items-center gap-3 text-stone-400">
              <Utensils size={20} />
              <span className="uppercase tracking-widest text-xs font-bold">Step 2 of 4</span>
            </div>
            <h2 className="text-3xl font-serif text-stone-900">Your dining preferences?</h2>
            <div className="grid grid-cols-2 gap-3">
              {DINING_OPTIONS.map(option => (
                <button
                  key={option}
                  onClick={() => toggleOption('dining', option)}
                  className={cn(
                    "px-4 py-4 rounded-2xl border-2 text-left transition-all relative",
                    prefs.dining.includes(option)
                      ? "border-stone-900 bg-stone-900 text-white"
                      : "border-stone-100 hover:border-stone-300 text-stone-600"
                  )}
                >
                  <span className="font-medium">{option}</span>
                  {prefs.dining.includes(option) && (
                    <Check size={16} className="absolute top-4 right-4" />
                  )}
                </button>
              ))}
            </div>
            <div className="flex gap-4">
              <button onClick={() => setStep(2)} className="flex-1 border border-stone-200 py-4 rounded-2xl hover:bg-stone-50 transition-all font-medium">Back</button>
              <button
                disabled={prefs.dining.length === 0}
                onClick={() => setStep(4)}
                className="flex-[2] bg-stone-900 text-white py-4 rounded-2xl hover:bg-stone-800 transition-all font-medium disabled:opacity-50"
              >
                Continue
              </button>
            </div>
          </motion.div>
        );
      case 4:
        return (
          <motion.div
            key="step4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-8"
          >
            <div className="flex items-center gap-3 text-stone-400">
              <Heart size={20} />
              <span className="uppercase tracking-widest text-xs font-bold">Step 3 of 4</span>
            </div>
            <h2 className="text-3xl font-serif text-stone-900">Wellness & Relaxation?</h2>
            <div className="grid grid-cols-2 gap-3">
              {WELLNESS_OPTIONS.map(option => (
                <button
                  key={option}
                  onClick={() => toggleOption('wellness', option)}
                  className={cn(
                    "px-4 py-4 rounded-2xl border-2 text-left transition-all relative",
                    prefs.wellness.includes(option)
                      ? "border-stone-900 bg-stone-900 text-white"
                      : "border-stone-100 hover:border-stone-300 text-stone-600"
                  )}
                >
                  <span className="font-medium">{option}</span>
                  {prefs.wellness.includes(option) && (
                    <Check size={16} className="absolute top-4 right-4" />
                  )}
                </button>
              ))}
            </div>
            <div className="flex gap-4">
              <button onClick={() => setStep(3)} className="flex-1 border border-stone-200 py-4 rounded-2xl hover:bg-stone-50 transition-all font-medium">Back</button>
              <button
                disabled={prefs.wellness.length === 0}
                onClick={() => setStep(5)}
                className="flex-[2] bg-stone-900 text-white py-4 rounded-2xl hover:bg-stone-800 transition-all font-medium disabled:opacity-50"
              >
                Continue
              </button>
            </div>
          </motion.div>
        );
      case 5:
        return (
          <motion.div
            key="step5"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-8"
          >
            <div className="flex items-center gap-3 text-stone-400">
              <Wallet size={20} />
              <span className="uppercase tracking-widest text-xs font-bold">Step 4 of 4</span>
            </div>
            <h2 className="text-3xl font-serif text-stone-900">Preferred nightly budget?</h2>
            <div className="space-y-4">
              {(["Low", "Mid", "Premium", "Luxury"] as const).map(tier => (
                <button
                  key={tier}
                  onClick={() => setPrefs(prev => ({ ...prev, budget_tier: tier }))}
                  className={cn(
                    "w-full px-6 py-5 rounded-2xl border-2 text-left transition-all flex items-center justify-between",
                    prefs.budget_tier === tier
                      ? "border-stone-900 bg-stone-900 text-white"
                      : "border-stone-100 hover:border-stone-300 text-stone-600"
                  )}
                >
                  <span className="font-medium text-lg">{tier}</span>
                  <span className="text-sm opacity-60">
                    {tier === "Low" && "ETB 2,000 - 5,000"}
                    {tier === "Mid" && "ETB 5,000 - 10,000"}
                    {tier === "Premium" && "ETB 10,000 - 15,000"}
                    {tier === "Luxury" && "ETB 15,000+"}
                  </span>
                </button>
              ))}
            </div>
            <div className="flex gap-4">
              <button onClick={() => setStep(4)} className="flex-1 border border-stone-200 py-4 rounded-2xl hover:bg-stone-50 transition-all font-medium">Back</button>
              <button
                onClick={handleComplete}
                disabled={loading}
                className="flex-[2] bg-stone-900 text-white py-4 rounded-2xl hover:bg-stone-800 transition-all font-medium flex items-center justify-center gap-2"
              >
                {loading ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                    className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full"
                  />
                ) : (
                  <>
                    Complete Profile
                    <Sparkles size={18} />
                  </>
                )}
              </button>
            </div>
          </motion.div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white p-10 rounded-[2.5rem] shadow-2xl border border-stone-100 overflow-hidden">
        <AnimatePresence mode="wait">
          {renderStep()}
        </AnimatePresence>
      </div>
    </div>
  );
}
