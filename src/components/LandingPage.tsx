import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, Target, Zap, Globe, FileText, CheckCircle2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import { t } from '../i18n';
import { CvTailoringVisualization } from './CvTailoringVisualization';

interface LandingPageProps {
  onLogin: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onLogin }) => {
  const { appLanguage, setAppLanguage } = useStore();

  return (
    <div className="min-h-screen bg-[#F5F5F4] text-[#1A1A1A] overflow-x-hidden font-sans">
      {/* Language Switcher */}
      <div className="fixed top-6 right-6 z-50 flex items-center space-x-2 bg-black/5 backdrop-blur-md border border-black/10 rounded-full p-1">
        <button
          onClick={() => setAppLanguage('en')}
          className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${appLanguage === 'en' ? 'bg-accent text-white' : 'text-black/40 hover:text-black'}`}
        >
          EN
        </button>
        <button
          onClick={() => setAppLanguage('pl')}
          className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${appLanguage === 'pl' ? 'bg-accent text-white' : 'text-black/40 hover:text-black'}`}
        >
          PL
        </button>
      </div>

      {/* Hero Section */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-4 pt-20 overflow-hidden">
        {/* Animated Background Gradients */}
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-accent/5 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] animate-pulse delay-700" />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center z-10 max-w-5xl mx-auto"
        >
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="inline-flex items-center space-x-2 bg-black/5 border border-black/10 rounded-full px-4 py-2 mb-8"
          >
            <Sparkles size={16} className="text-primary" />
            <span className="text-sm font-medium tracking-wide">{t('landingHeroBadge', appLanguage)}</span>
          </motion.div>
          
          <h1 className="font-display text-[12vw] md:text-[8vw] leading-[0.85] uppercase tracking-tighter mb-8">
            {t('landingHeroTitle', appLanguage, { dreamJob: `<span class="text-primary">${t('landingHeroDreamJob', appLanguage)}</span>` }).split('<span').map((part, i) => {
              if (i === 0) return part;
              const [content, rest] = part.split('</span>');
              const text = content.split('>')[1];
              return <React.Fragment key={i}><span className="text-primary">{text}</span>{rest}</React.Fragment>;
            })}
          </h1>
          <p className="text-xl md:text-2xl text-black/60 max-w-3xl mx-auto font-light mb-12 leading-relaxed">
            {t('landingHeroSubtitle', appLanguage)}
          </p>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onLogin}
            className="group relative px-12 py-5 bg-accent text-white font-bold text-lg rounded-full shadow-[0_20px_40px_rgba(15,23,42,0.15)] hover:shadow-[0_30px_60px_rgba(15,23,42,0.25)] transition-all duration-300 flex items-center space-x-3 mx-auto"
          >
            <span>{t('landingHeroCta', appLanguage)}</span>
            <ArrowRight className="group-hover:translate-x-2 transition-transform" />
          </motion.button>
          
          <div className="mt-8 flex items-center justify-center space-x-6 text-sm text-black/40 font-medium">
            <div className="flex items-center space-x-2">
              <CheckCircle2 size={16} className="text-green-600" />
              <span>{t('landingHeroNoCreditCard', appLanguage)}</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle2 size={16} className="text-green-600" />
              <span>{t('landingHeroInstantExport', appLanguage)}</span>
            </div>
          </div>
        </motion.div>

        {/* Floating Mockup Preview */}
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 1, ease: "easeOut" }}
          className="mt-24 w-full max-w-6xl relative z-10"
        >
          <CvTailoringVisualization />
        </motion.div>
      </section>

      {/* Bento Grid Features */}
      <section className="py-32 px-4 max-w-7xl mx-auto relative z-20">
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-5xl font-display uppercase tracking-tight mb-6">{t('landingFeaturesTitle', appLanguage)}</h2>
          <p className="text-xl text-black/60 max-w-2xl mx-auto">{t('landingFeaturesSubtitle', appLanguage)}</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div 
            whileHover={{ y: -5 }}
            className="md:col-span-2 bg-white/40 backdrop-blur-xl border border-black/10 p-12 rounded-3xl group"
          >
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
              <Sparkles className="text-primary" size={32} />
            </div>
            <h3 className="text-3xl font-bold mb-4">{t('landingFeatureAiTitle', appLanguage)}</h3>
            <p className="text-black/60 text-lg leading-relaxed">
              {t('landingFeatureAiDesc', appLanguage)}
            </p>
          </motion.div>
          
          <motion.div 
            whileHover={{ y: -5 }}
            className="bg-white/40 backdrop-blur-xl border border-black/10 p-12 rounded-3xl group"
          >
            <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
              <Target className="text-blue-600" size={32} />
            </div>
            <h3 className="text-2xl font-bold mb-4">{t('landingFeatureAtsTitle', appLanguage)}</h3>
            <p className="text-black/60 leading-relaxed">
              {t('landingFeatureAtsDesc', appLanguage)}
            </p>
          </motion.div>
          
          <motion.div 
            whileHover={{ y: -5 }}
            className="bg-white/40 backdrop-blur-xl border border-black/10 p-12 rounded-3xl group"
          >
            <div className="w-16 h-16 bg-yellow-500/10 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
              <Zap className="text-yellow-600" size={32} />
            </div>
            <h3 className="text-2xl font-bold mb-4">{t('landingFeaturePdfTitle', appLanguage)}</h3>
            <p className="text-black/60 leading-relaxed">
              {t('landingFeaturePdfDesc', appLanguage)}
            </p>
          </motion.div>
          
          <motion.div 
            whileHover={{ y: -5 }}
            className="md:col-span-2 bg-white/40 backdrop-blur-xl border border-black/10 p-12 rounded-3xl group"
          >
            <div className="w-16 h-16 bg-green-500/10 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
              <Globe className="text-green-600" size={32} />
            </div>
            <h3 className="text-3xl font-bold mb-4">{t('landingFeatureLangTitle', appLanguage)}</h3>
            <p className="text-black/60 text-lg leading-relaxed">
              {t('landingFeatureLangDesc', appLanguage)}
            </p>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-primary/5" />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-5xl md:text-7xl font-display uppercase tracking-tight mb-8">{t('landingCtaTitle', appLanguage)}</h2>
          <p className="text-xl text-black/60 mb-12">{t('landingCtaSubtitle', appLanguage)}</p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onLogin}
            className="px-12 py-6 bg-accent text-white font-bold text-xl rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 flex items-center space-x-3 mx-auto"
          >
            <span>{t('landingCtaButton', appLanguage)}</span>
            <ArrowRight />
          </motion.button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-black/10 text-center text-black/40 text-sm">
        <p>{t('landingFooterCopy', appLanguage)}</p>
      </footer>
    </div>
  );
};
