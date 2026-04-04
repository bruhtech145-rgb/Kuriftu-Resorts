import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mail, Lock, User, Phone, CheckCircle2, AlertCircle, Loader2, ArrowRight, ArrowLeft, Utensils, Heart, MapPin, Sparkles } from 'lucide-react';
import { auth, db, createUserWithEmailAndPassword, updateProfile, handleFirestoreError } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';

interface RegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Step = 1 | 2;

export const RegisterModal: React.FC<RegisterModalProps> = ({ isOpen, onClose }) => {
  const [step, setStep] = useState<Step>(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  
  // Step 2 fields
  const [origin, setOrigin] = useState('');
  const [foodPreferences, setFoodPreferences] = useState('');
  const [allergies, setAllergies] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    setStep(2);
  };

  const handleBack = () => {
    setStep(1);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setLoading(true);
    setError(null);

    try {
      // 1. Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. Update Auth Profile
      await updateProfile(user, {
        displayName: fullName
      });

      // 3. Create Member Profile in Firestore
      const memberRef = doc(db, 'members', user.uid);
      const memberData = {
        id: user.uid,
        email: email,
        full_name: fullName,
        phone: phone,
        origin: origin,
        food_preferences: foodPreferences,
        allergies: allergies,
        loyalty_tier: 'Explorer',
        points_balance: 0,
        onboarding_completed: true, // Since they filled out the multi-step form
        registration_date: new Date().toISOString(),
      };

      await setDoc(memberRef, memberData);

      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setStep(1);
      }, 3000);
    } catch (err: any) {
      console.error('Registration error:', err);
      let message = err.message || 'An error occurred during registration.';
      if (message.includes('auth/email-already-in-use')) {
        message = 'This email address is already in use.';
      } else if (message.includes('auth/weak-password')) {
        message = 'Password should be at least 6 characters.';
      } else if (message.includes('auth/invalid-email')) {
        message = 'The email address is badly formatted.';
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const stepVariants = {
    hidden: { opacity: 0, x: 50 },
    visible: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -50 }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
          >
            <button 
              onClick={onClose}
              className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-all z-10"
            >
              <X size={24} />
            </button>

            <div className="p-8 sm:p-12">
              {success ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-12 space-y-6"
                >
                  <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 size={40} />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-bold text-slate-900">Registration Successful!</h3>
                    <p className="text-slate-500">Welcome to Kuriftu Resorts. Your AI-powered journey begins now.</p>
                  </div>
                </motion.div>
              ) : (
                <>
                  <div className="mb-8">
                    <div className="flex items-center gap-2 text-[#0066ff] mb-2">
                      <Sparkles size={20} />
                      <span className="text-xs font-bold uppercase tracking-widest">Step {step} of 2</span>
                    </div>
                    <h2 className="text-3xl font-bold text-slate-900 mb-2">
                      {step === 1 ? 'Create Your Account' : 'Personalize Your Stay'}
                    </h2>
                    <p className="text-slate-500">
                      {step === 1 
                        ? 'Unlock exclusive member benefits and AI-powered planning.' 
                        : 'Tell us more so our AI can suggest the best food and activities for you.'}
                    </p>
                  </div>

                  <AnimatePresence mode="wait">
                    {step === 1 ? (
                      <motion.form 
                        key="step1"
                        variants={stepVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        onSubmit={handleNext} 
                        className="space-y-5"
                      >
                        {error && (
                          <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl flex items-center gap-3 text-sm">
                            <AlertCircle size={18} />
                            {error}
                          </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                          <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 ml-1">Full Name</label>
                            <div className="relative group">
                              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#0066ff] transition-colors" size={20} />
                              <input
                                required
                                type="text"
                                placeholder="John Doe"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#0066ff]/20 focus:border-[#0066ff] transition-all"
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 ml-1">Phone Number</label>
                            <div className="relative group">
                              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#0066ff] transition-colors" size={20} />
                              <input
                                required
                                type="tel"
                                placeholder="+251 900 000 000"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#0066ff]/20 focus:border-[#0066ff] transition-all"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-bold text-slate-700 ml-1">Email Address</label>
                          <div className="relative group">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#0066ff] transition-colors" size={20} />
                            <input
                              required
                              type="email"
                              placeholder="john@example.com"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#0066ff]/20 focus:border-[#0066ff] transition-all"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-bold text-slate-700 ml-1">Password</label>
                          <div className="relative group">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#0066ff] transition-colors" size={20} />
                            <input
                              required
                              type="password"
                              placeholder="••••••••"
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#0066ff]/20 focus:border-[#0066ff] transition-all"
                            />
                          </div>
                        </div>

                        <button
                          type="submit"
                          className="w-full bg-[#0066ff] hover:bg-[#0052cc] text-white py-5 rounded-3xl font-bold text-lg transition-all flex items-center justify-center gap-3 shadow-xl shadow-blue-500/20 active:scale-95"
                        >
                          Continue to Preferences
                          <ArrowRight size={20} />
                        </button>
                      </motion.form>
                    ) : (
                      <motion.form 
                        key="step2"
                        variants={stepVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        onSubmit={handleRegister} 
                        className="space-y-5"
                      >
                        {error && (
                          <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl flex items-center gap-3 text-sm">
                            <AlertCircle size={18} />
                            {error}
                          </div>
                        )}

                        <div className="space-y-2">
                          <label className="text-sm font-bold text-slate-700 ml-1">Where are you from?</label>
                          <div className="relative group">
                            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#0066ff] transition-colors" size={20} />
                            <input
                              required
                              type="text"
                              placeholder="Addis Ababa, Ethiopia"
                              value={origin}
                              onChange={(e) => setOrigin(e.target.value)}
                              className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#0066ff]/20 focus:border-[#0066ff] transition-all"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-bold text-slate-700 ml-1">Food Preferences</label>
                          <div className="relative group">
                            <Utensils className="absolute left-4 top-4 text-slate-400 group-focus-within:text-[#0066ff] transition-colors" size={20} />
                            <textarea
                              placeholder="e.g. Traditional Ethiopian, Vegan, Seafood..."
                              value={foodPreferences}
                              onChange={(e) => setFoodPreferences(e.target.value)}
                              className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#0066ff]/20 focus:border-[#0066ff] transition-all min-h-[100px] resize-none"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-bold text-slate-700 ml-1">Allergies or Phobias (Food)</label>
                          <div className="relative group">
                            <Heart className="absolute left-4 top-4 text-slate-400 group-focus-within:text-[#0066ff] transition-colors" size={20} />
                            <textarea
                              placeholder="e.g. Peanuts, Gluten, Spicy food..."
                              value={allergies}
                              onChange={(e) => setAllergies(e.target.value)}
                              className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#0066ff]/20 focus:border-[#0066ff] transition-all min-h-[100px] resize-none"
                            />
                          </div>
                        </div>

                        <div className="flex gap-4">
                          <button
                            type="button"
                            onClick={handleBack}
                            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 py-5 rounded-3xl font-bold text-lg transition-all flex items-center justify-center gap-3 active:scale-95"
                          >
                            <ArrowLeft size={20} />
                            Back
                          </button>
                          <button
                            disabled={loading}
                            type="submit"
                            className="flex-[2] bg-[#0066ff] hover:bg-[#0052cc] text-white py-5 rounded-3xl font-bold text-lg transition-all flex items-center justify-center gap-3 shadow-xl shadow-blue-500/20 active:scale-95 disabled:bg-slate-300"
                          >
                            {loading ? (
                              <>
                                <Loader2 className="animate-spin" size={20} />
                                Creating Account...
                              </>
                            ) : (
                              'Complete Registration'
                            )}
                          </button>
                        </div>
                      </motion.form>
                    )}
                  </AnimatePresence>
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
