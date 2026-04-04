import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mail, Lock, LogIn, AlertCircle, Loader2, Chrome } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToRegister: () => void;
  onGoogleLogin: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onSwitchToRegister, onGoogleLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (loginError) throw loginError;

      // Check if this is an admin — admins should use the Admin Portal
      if (data.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', data.user.id)
          .single();

        if (profile?.is_admin) {
          await supabase.auth.signOut();
          setError('This is an admin account. Please use the Admin Portal to sign in.');
          return;
        }
      }

      onClose();
    } catch (err: any) {
      let message = err.message || 'Invalid email or password.';
      if (message.includes('Invalid login credentials')) {
        message = 'Invalid email or password. Please try again.';
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    onClose();
    onGoogleLogin();
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
            className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
          >
            <button
              onClick={onClose}
              className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-all"
            >
              <X size={24} />
            </button>

            <div className="p-8 sm:p-12">
              <div className="mb-10">
                <div className="w-16 h-16 bg-[#0066ff]/10 text-[#0066ff] rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <LogIn size={32} />
                </div>
                <h2 className="text-3xl font-bold text-slate-900 mb-2 text-center">Welcome Back</h2>
                <p className="text-slate-500 text-center">Sign in to access your member portal.</p>
              </div>

              {/* Google Login */}
              <button
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center gap-3 bg-white border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 py-4 rounded-2xl font-bold transition-all mb-6"
              >
                <Chrome size={20} />
                Continue with Google
              </button>

              <div className="flex items-center gap-4 mb-6">
                <div className="flex-1 h-px bg-slate-200" />
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">or</span>
                <div className="flex-1 h-px bg-slate-200" />
              </div>

              <form onSubmit={handleLogin} className="space-y-6">
                {error && (
                  <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl flex items-center gap-3 text-sm">
                    <AlertCircle size={18} />
                    {error}
                  </div>
                )}

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
                  disabled={loading}
                  type="submit"
                  className="w-full bg-[#0066ff] hover:bg-[#0052cc] text-white py-5 rounded-3xl font-bold text-lg transition-all flex items-center justify-center gap-3 shadow-xl shadow-blue-500/20 active:scale-95 disabled:bg-slate-300"
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      Signing in...
                    </>
                  ) : (
                    'Sign In'
                  )}
                </button>
              </form>

              <p className="mt-8 text-center text-sm text-slate-500">
                Don't have an account?{' '}
                <button
                  onClick={() => {
                    onClose();
                    onSwitchToRegister();
                  }}
                  className="text-[#0066ff] font-bold hover:underline"
                >
                  Register
                </button>
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
