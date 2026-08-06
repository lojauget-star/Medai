import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Chrome, ShieldAlert, Sparkles, ArrowRight } from 'lucide-react';
import { auth, db, signInAnonymously, doc, getDoc, setDoc, activateLocalGuestMode } from '../lib/firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import VetmindLogo from './VetmindLogo';

interface LoginProps {
  onLoginSuccess: () => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      // Configure prompt to select account to make it predictable
      provider.setCustomParameters({ prompt: 'select_account' });
      
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      if (user) {
        console.log('User logged in, uid:', user.uid);
        // Check if user profile exists, create if not
        const docRef = doc(db, 'users', user.uid);
        try {
          console.log('Fetching user doc...');
          const docSnap = await getDoc(docRef);
          console.log('User doc exists:', docSnap.exists());
          
          if (!docSnap.exists()) {
            console.log('Setting user doc...');
            await setDoc(docRef, {
              name: user.displayName || 'Médico Veterinário',
              crmv: '',
              specialty: 'Clínica Geral de Pequenos Animais',
              isSigned: false,
              email: user.email || '',
              createdAt: new Date().toISOString()
            });
            console.log('User doc set.');
          }
        } catch (innerErr: any) {
          console.error('Error during getDoc/setDoc for users (ignoring to allow login):', innerErr);
        }
        
        console.log('Calling onLoginSuccess...');
        onLoginSuccess();
      }
    } catch (err: any) {
      console.error('Google Auth Error:', err);
      if (err.code === 'auth/popup-blocked') {
        setError('O pop-up de login foi bloqueado pelo seu navegador. Por favor, libere a abertura de pop-ups e tente novamente.');
      } else if (err.code === 'auth/popup-closed-by-user') {
        setError('A janela de login foi fechada antes da conclusão do acesso. Clique em "Entrar com o Google" para tentar de novo.');
      } else if (err.code === 'auth/cancelled-popup-request') {
        setError('A solicitação de login foi cancelada. Por favor, tente novamente.');
      } else {
        setError('Não conseguimos conectar com sua conta Google agora. Por favor, tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      activateLocalGuestMode();
      onLoginSuccess();
    } catch (err: any) {
      console.error('Anonymous Auth Error:', err);
      setError('Erro ao entrar no modo de demonstração.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#f4f6fa] relative overflow-hidden font-sans">
      {/* Decorative Blur Spheres */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-gradient-to-br from-indigo-200/40 to-purple-200/30 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-gradient-to-br from-emerald-100/40 to-indigo-150/30 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md p-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 120 }}
          className="bg-white border border-slate-100 shadow-[0_24px_60px_rgba(37,53,217,0.06)] rounded-[2.5rem] p-10 flex flex-col items-center"
        >
          {/* Logo Container with rotating background glow */}
          <div className="relative mb-8">
            <div className="absolute inset-0 bg-indigo-500/10 rounded-full blur-xl scale-125 animate-pulse" />
            <VetmindLogo showText={false} size={110} />
          </div>

          <h1 className="text-3xl font-black text-slate-900 tracking-tight text-center font-sans">
            Vetmind
          </h1>
          
          <p className="text-slate-500 text-sm font-medium text-center mt-3 max-w-[280px] leading-relaxed">
            Seu copiloto e assistente clínico inteligente com prontuário dinâmico.
          </p>

          {/* AI Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-indigo-50 to-indigo-100/40 border border-indigo-100/50 rounded-full mt-5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
            <span className="text-[10px] font-black uppercase text-indigo-700 tracking-wider">
              Powered by AI Studio
            </span>
          </div>

          <div className="w-full mt-10 space-y-4">
            {/* Primary Google Login CTA */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-full flex items-center justify-center gap-3.5 shadow-md hover:shadow-lg hover:shadow-indigo-600/10 transition-all cursor-pointer disabled:opacity-50"
            >
              <Chrome className="w-5 h-5 shrink-0" />
              <span>
                {loading ? 'Conectando...' : 'Entrar com o Google'}
              </span>
              {!loading && <ArrowRight className="w-4 h-4 text-white/80" />}
            </motion.button>

            {/* Guest / Demo CTA */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleGuestLogin}
              disabled={loading}
              className="w-full h-14 bg-slate-50 border border-slate-200 hover:border-slate-350 text-slate-700 font-extrabold rounded-full flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 text-xs uppercase tracking-wider"
            >
              <span>Entrar como Convidado (Demo)</span>
            </motion.button>
          </div>

          {/* Error message */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="w-full mt-6 bg-rose-50 border border-rose-100 rounded-2xl p-4 flex gap-3 text-rose-700 text-xs font-semibold leading-relaxed"
              >
                <ShieldAlert className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-10 pt-6 border-t border-slate-100 w-full flex items-center justify-center gap-2 text-slate-400 text-[11px] font-bold">
            <span>Privacidade garantida via Firebase Auth</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
