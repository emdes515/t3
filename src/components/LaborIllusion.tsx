import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';

interface LaborIllusionProps {
  messages: string[];
  isActive: boolean;
}

export const LaborIllusion: React.FC<LaborIllusionProps> = ({ messages, isActive }) => {
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    if (isActive && messages.length > 0) {
      setMsgIndex(0);
      const interval = setInterval(() => {
        setMsgIndex((prev) => (prev + 1 < messages.length ? prev + 1 : prev));
      }, 3500);
      return () => clearInterval(interval);
    }
  }, [isActive, messages]);

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="absolute inset-0 z-50 flex items-center justify-center rounded-3xl overflow-hidden"
          style={{ backdropFilter: 'blur(24px)', background: 'rgba(15, 10, 30, 0.75)' }}
        >
          {/* Scanning Line */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <motion.div
              className="absolute left-0 right-0 h-px"
              style={{
                background: 'linear-gradient(90deg, transparent 0%, rgba(139,92,246,0.6) 40%, rgba(99,102,241,0.8) 50%, rgba(139,92,246,0.6) 60%, transparent 100%)',
                boxShadow: '0 0 20px 2px rgba(139,92,246,0.3)',
              }}
              animate={{ top: ['0%', '100%'] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: 'linear' }}
            />
            {/* Ambient glow orbs */}
            <motion.div
              className="absolute w-48 h-48 rounded-full"
              style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)', top: '20%', left: '10%' }}
              animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
              className="absolute w-48 h-48 rounded-full"
              style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)', bottom: '10%', right: '10%' }}
              animate={{ scale: [1.2, 1, 1.2], opacity: [0.4, 0.2, 0.4] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>

          <div className="relative z-10 flex flex-col items-center px-8">
            {/* Orbital Loader */}
            <div className="relative w-28 h-28 mx-auto mb-10">
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{ border: '1.5px solid rgba(139,92,246,0.15)' }}
                animate={{ scale: [1, 1.08, 1], opacity: [0.3, 0.5, 0.3] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              />
              <motion.div
                className="absolute inset-2 rounded-full"
                style={{ border: '1.5px solid rgba(99,102,241,0.2)' }}
                animate={{ rotate: 360 }}
                transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
              />
              <motion.div
                className="absolute inset-4 rounded-full"
                style={{
                  border: '2px solid rgba(139,92,246,0.1)',
                  borderTopColor: 'rgba(139,92,246,0.6)',
                  filter: 'drop-shadow(0 0 8px rgba(139,92,246,0.4))',
                }}
                animate={{ rotate: -360 }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.div
                  animate={{ scale: [1, 1.15, 1] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <Sparkles size={28} className="text-violet-400" style={{ filter: 'drop-shadow(0 0 6px rgba(139,92,246,0.5))' }} />
                </motion.div>
              </div>
            </div>

            {/* Dynamic Text with smooth cross-fade */}
            <AnimatePresence mode="wait">
              <motion.p
                key={msgIndex}
                initial={{ opacity: 0, y: 12, filter: 'blur(4px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -12, filter: 'blur(4px)' }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="text-center text-base font-medium text-white/80 tracking-wide max-w-sm"
              >
                {messages[msgIndex]}
              </motion.p>
            </AnimatePresence>

            {/* Subtle progress dots */}
            <div className="flex items-center space-x-1.5 mt-8">
              {messages.map((_, i) => (
                <motion.div
                  key={i}
                  className="rounded-full"
                  style={{
                    width: i === msgIndex ? 16 : 4,
                    height: 4,
                    backgroundColor: i <= msgIndex ? 'rgba(139,92,246,0.7)' : 'rgba(255,255,255,0.1)',
                  }}
                  animate={{ width: i === msgIndex ? 16 : 4 }}
                  transition={{ duration: 0.3 }}
                />
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ─── Premium API Error Overlay ──────────────────────────────────────────

interface ApiErrorOverlayProps {
  isOpen: boolean;
  type: 'quota' | 'timeout' | 'generic';
  message: string;
  onClose: () => void;
  appLanguage: string;
}

export const ApiErrorOverlay: React.FC<ApiErrorOverlayProps> = ({ isOpen, type, message, onClose, appLanguage }) => {
  const [countdown, setCountdown] = useState(30);

  useEffect(() => {
    if (!isOpen) return;
    setCountdown(type === 'quota' ? 45 : 15);
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, type]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ backdropFilter: 'blur(16px)', background: 'rgba(0,0,0,0.6)' }}
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 20 }}
            transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
            className="bg-white rounded-3xl shadow-2xl max-w-md w-full relative overflow-hidden"
          >
            {/* Top gradient accent bar */}
            <div className="h-1 w-full bg-gradient-to-r from-violet-500 via-indigo-500 to-violet-500" />

            <div className="p-10 text-center">
              {/* Animated icon */}
              <div className="relative w-20 h-20 mx-auto mb-8">
                <motion.div
                  className="absolute inset-0 rounded-full"
                  style={{ border: '2px solid rgba(139,92,246,0.15)' }}
                  animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.6, 0.3] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <motion.div
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <Sparkles size={32} className="text-violet-500" />
                  </motion.div>
                </div>
              </div>

              <h3 className="text-xl font-display font-bold uppercase tracking-tight mb-3">
                {type === 'quota'
                  ? (appLanguage === 'pl' ? 'Limit zapytań wyczerpany' : 'Rate limit reached')
                  : type === 'timeout'
                    ? (appLanguage === 'pl' ? 'Przekroczono czas odpowiedzi' : 'Response timed out')
                    : (appLanguage === 'pl' ? 'Usługa tymczasowo niedostępna' : 'Service temporarily unavailable')
                }
              </h3>

              <p className="text-black/50 text-sm leading-relaxed mb-6">
                {message || (appLanguage === 'pl'
                  ? 'AI potrzebuje chwili przerwy. To normalne przy intensywnym użytkowaniu — spróbuj ponownie za moment.'
                  : 'AI needs a short break. This is normal during heavy usage — try again in a moment.'
                )}
              </p>

              {/* Countdown */}
              {countdown > 0 && (
                <div className="mb-8">
                  <div className="text-xs text-black/30 uppercase tracking-widest font-bold mb-2">
                    {appLanguage === 'pl' ? 'Sugerowany czas oczekiwania' : 'Suggested wait time'}
                  </div>
                  <div className="relative w-32 h-32 mx-auto">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(0,0,0,0.05)" strokeWidth="3" />
                      <motion.circle
                        cx="50" cy="50" r="42" fill="none"
                        stroke="url(#gradient)" strokeWidth="3" strokeLinecap="round"
                        strokeDasharray={2 * Math.PI * 42}
                        animate={{ strokeDashoffset: [(2 * Math.PI * 42), 0] }}
                        transition={{ duration: type === 'quota' ? 45 : 15, ease: 'linear' }}
                      />
                      <defs>
                        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#8B5CF6" />
                          <stop offset="100%" stopColor="#6366F1" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-3xl font-display font-black text-violet-600">{countdown}</span>
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={onClose}
                className="w-full py-4 bg-gradient-to-r from-violet-500 to-indigo-600 text-white font-bold rounded-2xl hover:scale-[1.02] transition-all shadow-lg shadow-violet-500/20"
              >
                {appLanguage === 'pl' ? 'Rozumiem' : 'Got it'}
              </button>

              <p className="text-[10px] text-black/25 mt-4 uppercase tracking-widest font-bold">
                {type === 'quota'
                  ? (appLanguage === 'pl' ? 'Limit odnowi się automatycznie' : 'Quota will refresh automatically')
                  : (appLanguage === 'pl' ? 'Sprawdź połączenie z internetem' : 'Check your internet connection')
                }
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
