import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Mail, Lock, Loader2, AlertCircle, ArrowLeft, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AdminLoginProps {
  onBack: () => void;
  onLoginSuccess: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onBack, onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Default Admin Bypass for Prototype
    if (username === 'admin' && password === 'admin123') {
      setTimeout(() => {
        onLoginSuccess();
        setLoading(false);
      }, 1000);
      return;
    }

    try {
      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email: username,
        password,
      });

      if (loginError) throw loginError;

      // Check if the user is an admin
    if (data.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', data.user.id)
        .single();

      if (profile?.is_admin) {
        onLoginSuccess();
      } else {
        await supabase.auth.signOut();
        setError('Unauthorized: You do not have admin privileges.');
      }
    }
    } catch (err: any) {
      console.error('Admin login error:', err);
      let message = err.message || 'Invalid email or password.';
      if (message.includes('API key')) {
        message = 'The Supabase API key is invalid. Please check your VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY in settings.';
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/50 p-8 sm:p-12"
      >
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-slate-400 hover:text-slate-900 transition-colors mb-8 group"
        >
          <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          <span className="font-bold text-sm">Back to Home</span>
        </button>

        <div className="mb-10 text-center">
          <div className="w-16 h-16 bg-[#0066ff]/10 text-[#0066ff] rounded-2xl flex items-center justify-center mx-auto mb-6">
            <ShieldCheck size={32} />
          </div>
          <h2 className="text-3xl font-bold text-slate-900 mb-2">Admin Portal</h2>
          <p className="text-slate-500">Sign in to manage Kuriftu Resorts operations.</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl flex items-center gap-3 text-sm">
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 ml-1">Username</label>
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#0066ff] transition-colors" size={20} />
              <input
                required
                type="text"
                placeholder="admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
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
                placeholder="admin123"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#0066ff]/20 focus:border-[#0066ff] transition-all"
              />
            </div>
          </div>

          <button
            disabled={loading}
            type="submit"
            className="w-full bg-slate-900 hover:bg-slate-800 text-white py-5 rounded-3xl font-bold text-lg transition-all flex items-center justify-center gap-3 shadow-xl shadow-slate-900/20 active:scale-95 disabled:bg-slate-300"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                Authenticating...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-slate-400">
          Authorized personnel only. All access is logged.
        </p>
      </motion.div>
    </div>
  );
};
