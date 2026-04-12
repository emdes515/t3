import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Radar, Zap, ExternalLink, X, Search, Target,
  CheckCircle2, AlertTriangle, Loader2, ChevronDown,
  Sparkles, RefreshCw, Eye, Clock, Filter
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { t } from '../i18n';
import { runFullRadarScan, analyzeSingleMatch } from '../lib/radarService';
import { notify } from '../lib/notifications';
import type { RadarJob } from '../store/useStore';

interface JobRadarProps {
  onGenerateCv?: (jobInfo: any, jobUrl: string) => void;
}

// ─── Scanning Messages ───────────────────────────────────────────────────

const scanningMessages = [
  { emoji: '', text: 'Generuję zapytania wyszukiwarki na podstawie Twojego profilu' },
  { emoji: '', text: 'Przeszukuję Pracuj.pl, LinkedIn, JustJoin.it' },
  { emoji: '', text: 'Buduję bezpieczny tunel do portali pracy' },
  { emoji: '', text: 'Oczyszczam dane i usuwam szum' },
  { emoji: '', text: 'Wyodrębniam wymagania Must-Have' },
  { emoji: '', text: 'Obliczam dopasowanie do Twojego profilu' },
  { emoji: '', text: 'Finalizuję wyniki skanowania' },
];

// ─── Score Color Logic ───────────────────────────────────────────────────

const getScoreColor = (score: number) => {
  if (score >= 80) return { bg: 'bg-emerald-500', text: 'text-emerald-600', ring: 'ring-emerald-500/20', glow: 'shadow-emerald-500/30' };
  if (score >= 60) return { bg: 'bg-amber-500', text: 'text-amber-600', ring: 'ring-amber-500/20', glow: 'shadow-amber-500/30' };
  return { bg: 'bg-red-400', text: 'text-red-500', ring: 'ring-red-400/20', glow: 'shadow-red-400/30' };
};

// ─── Main Component ──────────────────────────────────────────────────────

export const JobRadar: React.FC<JobRadarProps> = ({ onGenerateCv }) => {
  const {
    profile, appLanguage,
    radarState, setRadarState, addRadarJob, dismissRadarJob, clearRadarJobs
  } = useStore();

  const { isScanning, scanProgress, jobs, lastScanDate, minMatchScore, searchSettings } = radarState;
  const [showFilter, setShowFilter] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  const visibleJobs = jobs.filter(j => j.status !== 'dismissed' && (!j.isAnalyzed || (j.matchScore && j.matchScore >= minMatchScore)));
  const newJobCount = jobs.filter(j => j.status === 'new').length;

  // ─── Scan Handler ────────────────────────────────────────────────────

  const handleScan = useCallback(async () => {
    if (!profile?.geminiApiKey) {
      notify.error(appLanguage === 'pl'
        ? 'Dodaj klucz Gemini API w ustawieniach, aby korzystać z Radaru.'
        : 'Add your Gemini API key in settings to use the Radar.');
      return;
    }

    if (!radarState.searchSettings.jobTitle && !profile.personalInfo.jobTitle) {
      notify.error(appLanguage === 'pl'
        ? 'Uzupełnij swoje "Szukane Stanowisko" w filtrach, aby Radar wiedział w co celować.'
        : 'Fill in your "Target Job Title" in the filters so the Radar knows what to look for.');
      return;
    }

    setScanError(null);
    setRadarState({ isScanning: true, scanProgress: { current: 0, total: 0, message: scanningMessages[0].text } });

    try {
      await runFullRadarScan(
        profile.geminiApiKey,
        profile,
        minMatchScore,
        radarState.searchSettings || { jobTitle: '', location: '', workModel: 'any' },
        (current, total, message) => {
          setRadarState({ scanProgress: { current, total, message } });
        },
        (job) => {
          addRadarJob(job);
        }
      );

      setRadarState({
        isScanning: false,
        lastScanDate: new Date().toISOString(),
        scanProgress: { current: 0, total: 0, message: '' }
      });

      notify.success(appLanguage === 'pl' ? 'Skanowanie zakończone!' : 'Scan complete!');
    } catch (error: any) {
      console.error('Radar scan error:', error);
      setScanError(error.message || 'Wystąpił błąd podczas skanowania.');
      setRadarState({
        isScanning: false,
        scanProgress: { current: 0, total: 0, message: '' }
      });
    }
  }, [profile, minMatchScore, appLanguage]);

  // ─── Render ──────────────────────────────────────────────────────────

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-violet-500/30">
            <Radar size={24} />
          </div>
          <div>
            <h2 className="text-4xl font-display uppercase tracking-tight">
              {appLanguage === 'pl' ? 'Radar Ofert' : 'Job Radar'}
            </h2>
            {lastScanDate && (
              <p className="text-xs text-black/40 mt-1 flex items-center space-x-1">
                <Clock size={12} />
                <span>
                  {appLanguage === 'pl' ? 'Ostatnie skanowanie:' : 'Last scan:'}{' '}
                  {new Date(lastScanDate).toLocaleString(appLanguage === 'pl' ? 'pl-PL' : 'en-US')}
                </span>
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-3">


          {/* Clear */}
          {jobs.length > 0 && (
            <button
              onClick={clearRadarJobs}
              className="px-4 py-3 rounded-xl bg-black/5 border border-black/10 text-black/40 hover:text-red-500 hover:bg-red-500/5 hover:border-red-500/20 transition-all text-xs font-bold uppercase tracking-widest"
            >
              {appLanguage === 'pl' ? 'Wyczyść' : 'Clear'}
            </button>
          )}

          {/* Scan Button */}
          <button
            onClick={handleScan}
            disabled={isScanning}
            className="px-6 py-3 bg-gradient-to-r from-violet-500 to-indigo-600 text-white font-bold rounded-2xl hover:scale-105 transition-all shadow-lg shadow-violet-500/30 disabled:opacity-50 disabled:hover:scale-100 flex items-center space-x-2"
          >
            {isScanning ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                <span>{appLanguage === 'pl' ? 'Szukam...' : 'Scanning...'}</span>
              </>
            ) : (
              <>
                <Search size={20} />
                <span>{appLanguage === 'pl' ? 'Skanuj teraz' : 'Scan now'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="glass rounded-2xl p-6 flex flex-col space-y-6 border border-violet-500/10">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="text-[10px] uppercase text-black/40 font-bold tracking-widest block mb-2">
                    {appLanguage === 'pl' ? 'Szukane Stanowisko' : 'Target Job Title'}
                  </label>
                  <input
                    type="text"
                    placeholder={profile.personalInfo.jobTitle || (appLanguage === 'pl' ? 'Np. React Developer' : 'E.g. React Developer')}
                    value={searchSettings?.jobTitle || ''}
                    onChange={(e) => setRadarState({ searchSettings: { ...searchSettings, jobTitle: e.target.value } })}
                    className="w-full bg-white/50 border border-black/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all font-medium text-sm"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase text-black/40 font-bold tracking-widest block mb-2">
                    {appLanguage === 'pl' ? 'Lokalizacja' : 'Location'}
                  </label>
                  <input
                    type="text"
                    placeholder={profile.personalInfo.location || (appLanguage === 'pl' ? 'Np. Warszawa lub Remote' : 'E.g. Warsaw or Remote')}
                    value={searchSettings?.location || ''}
                    onChange={(e) => setRadarState({ searchSettings: { ...searchSettings, location: e.target.value } })}
                    className="w-full bg-white/50 border border-black/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all font-medium text-sm"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase text-black/40 font-bold tracking-widest block mb-2">
                    {appLanguage === 'pl' ? 'Tryb pracy' : 'Work Model'}
                  </label>
                  <select
                    value={searchSettings?.workModel || 'any'}
                    onChange={(e) => setRadarState({ searchSettings: { ...searchSettings, workModel: e.target.value } })}
                    className="w-full bg-white/50 border border-black/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all font-medium text-sm appearance-none"
                  >
                    <option value="any">{appLanguage === 'pl' ? 'Dowolny' : 'Any'}</option>
                    <option value="remote">{appLanguage === 'pl' ? 'Prywatnie Zdalna' : 'Remote'}</option>
                    <option value="hybrid">{appLanguage === 'pl' ? 'Hybrydowo' : 'Hybrid'}</option>
                    <option value="office">{appLanguage === 'pl' ? 'Stacjonarnie' : 'On-site'}</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-black/5">
                <label className="text-[10px] uppercase text-black/40 font-bold tracking-widest block mb-2">
                  {appLanguage === 'pl' ? 'Minimalny Match Score' : 'Minimum Match Score'}
                </label>
                <div className="flex items-center space-x-4">
                  <input
                    type="range"
                    min={30}
                    max={95}
                    step={5}
                    value={minMatchScore}
                    onChange={(e) => setRadarState({ minMatchScore: parseInt(e.target.value) })}
                    className="flex-1 h-2 bg-black/10 rounded-full appearance-none cursor-pointer accent-violet-500"
                  />
                  <span className="text-2xl font-display font-black text-[var(--color-accent)] w-16 text-center">
                    {minMatchScore}%
                  </span>
                </div>
              </div>
            </div>

      {/* Scanning Overlay */}
      <AnimatePresence>
        {isScanning && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="glass rounded-3xl p-12 text-center relative overflow-hidden"
          >
            {/* Animated Background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <motion.div
                className="absolute w-full h-1 bg-gradient-to-r from-transparent via-violet-500 to-transparent opacity-30"
                animate={{ y: [0, 400, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
              />
              <div className="absolute -top-32 -right-32 w-64 h-64 bg-violet-500/5 rounded-full blur-3xl" />
              <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl" />
            </div>

            <div className="relative z-10 space-y-8">
              {/* Orbital Loader */}
              <div className="relative w-32 h-32 mx-auto">
                <motion.div
                  className="absolute inset-0 rounded-full border-2 border-violet-500/20"
                  animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.6, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <motion.div
                  className="absolute inset-2 rounded-full border-2 border-indigo-500/30"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                />
                <motion.div
                  className="absolute inset-4 rounded-full border-2 border-violet-400/40 border-t-violet-500"
                  animate={{ rotate: -360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <Radar size={36} className="text-violet-500" />
                  </motion.div>
                </div>
              </div>

              {/* Progress Text */}
              <div className="space-y-3">
                <AnimatePresence mode="wait">
                  <motion.p
                    key={scanProgress.message}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="text-lg font-medium text-black/70"
                  >
                    {scanProgress.message || scanningMessages[0].text}
                  </motion.p>
                </AnimatePresence>

                {scanProgress.total > 0 && (
                  <div className="max-w-xs mx-auto">
                    <div className="h-2 bg-black/5 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${(scanProgress.current / scanProgress.total) * 100}%` }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                    <p className="text-xs text-black/30 mt-2 font-mono">
                      {scanProgress.current} / {scanProgress.total}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scan Error */}
      {scanError && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-6 border-red-500/20 bg-red-500/5 flex items-start space-x-4"
        >
          <AlertTriangle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <p className="font-bold text-red-600 mb-1">{appLanguage === 'pl' ? 'Błąd skanowania' : 'Scan Error'}</p>
            <p className="text-sm text-black/60">{scanError}</p>
          </div>
          <button onClick={() => setScanError(null)} className="text-black/20 hover:text-black ml-auto">
            <X size={18} />
          </button>
        </motion.div>
      )}

      {/* Job Cards Grid */}
      {!isScanning && visibleJobs.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AnimatePresence>
            {visibleJobs.map((job, i) => (
              <JobCard
                key={job.id}
                job={job}
                index={i}
                appLanguage={appLanguage}
                onDismiss={() => dismissRadarJob(job.id)}
                onGenerateCv={() => onGenerateCv?.(job.jobInfo, job.url)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Empty State */}
      {!isScanning && visibleJobs.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-32 glass rounded-3xl space-y-6 relative overflow-hidden"
        >
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-violet-500/5 rounded-full blur-3xl" />
            <div className="absolute bottom-1/4 right-1/4 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl" />
          </div>

          <div className="relative z-10 space-y-6">
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className="w-24 h-24 bg-gradient-to-br from-violet-500/10 to-indigo-500/10 rounded-full flex items-center justify-center mx-auto"
            >
              <Radar size={48} className="text-violet-400" />
            </motion.div>

            <div>
              <h3 className="text-xl font-bold mb-2">
                {appLanguage === 'pl' ? 'Radar czeka na rozkazy' : 'Radar awaiting orders'}
              </h3>
              <p className="text-black/40 max-w-md mx-auto">
                {appLanguage === 'pl'
                  ? 'Kliknij „Skanuj teraz", aby przeszukać portale pracy i znaleźć oferty dopasowane do Twojego profilu.'
                  : 'Click "Scan now" to search job portals and find offers matching your profile.'}
              </p>
            </div>

            <button
              onClick={handleScan}
              disabled={isScanning}
              className="px-8 py-4 bg-gradient-to-r from-violet-500 to-indigo-600 text-white font-bold rounded-2xl hover:scale-105 transition-all shadow-lg shadow-violet-500/30 inline-flex items-center space-x-2"
            >
              <Search size={20} />
              <span>{appLanguage === 'pl' ? 'Uruchom Radar' : 'Launch Radar'}</span>
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
};

// ─── Job Card Component ──────────────────────────────────────────────────

interface JobCardProps {
  job: RadarJob;
  index: number;
  appLanguage: string;
  onDismiss: () => void;
  onGenerateCv: () => void;
}

const JobCard: React.FC<JobCardProps> = ({ job, index, appLanguage, onDismiss, onGenerateCv }) => {
  const { profile, updateRadarJob } = useStore();
  const scoreColors = getScoreColor(job.matchScore || 0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAnalyzingLocal, setIsAnalyzingLocal] = useState(false);

  const handleGenerateCv = () => {
    setIsGenerating(true);
    setTimeout(() => {
      onGenerateCv();
      setIsGenerating(false);
    }, 1500);
  };

  const handleAnalyzeMatch = async () => {
    if (!profile?.geminiApiKey) {
      notify.error(appLanguage === 'pl' ? 'Brak klucza API.' : 'Missing API Key.');
      return;
    }
    setIsAnalyzingLocal(true);
    const result = await analyzeSingleMatch(profile.geminiApiKey, job, profile);
    if (result) {
      updateRadarJob(job.id, result);
      notify.success(appLanguage === 'pl' ? 'Analiza zakończona sukcesem!' : 'Analysis complete!');
    } else {
      notify.error(appLanguage === 'pl' ? 'Nie udało się przeanalizować oferty.' : 'Could not analyze job.');
    }
    setIsAnalyzingLocal(false);
  };

  if (!job.isAnalyzed) {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9, x: -100 }}
        transition={{ delay: index * 0.1, duration: 0.4 }}
        className="glass rounded-3xl p-6 space-y-4 hover:border-violet-500/30 transition-all group relative overflow-hidden"
      >
        <div className="flex items-center justify-between relative z-10">
          <div className="flex-1 pr-4">
            <h3 className="text-xl font-bold leading-tight mb-1">{job.title}</h3>
            <div className="flex items-center space-x-2 text-sm mb-4">
              <span className="text-violet-500 font-semibold">{job.company || 'Nieznana firma'}</span>
              <a href={job.url} target="_blank" rel="noreferrer" className="text-black/40 hover:text-violet-500 flex items-center space-x-1 transition-all">
                <ExternalLink size={14} />
                <span>URL</span>
              </a>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={handleAnalyzeMatch}
                disabled={isAnalyzingLocal}
                className="flex-1 py-3 bg-[var(--color-accent)]/10 text-[var(--color-accent)] font-bold rounded-2xl hover:bg-[var(--color-accent)]/20 transition-all flex items-center justify-center space-x-2"
              >
                {isAnalyzingLocal ? <Loader2 size={18} className="animate-spin" /> : <Zap size={18} />}
                <span>{appLanguage === 'pl' ? 'Sprawdź Dopasowanie (AI)' : 'Check Match (AI)'}</span>
              </button>
              <button
                onClick={onDismiss}
                className="p-3 bg-black/5 rounded-2xl text-black/20 hover:text-red-500 hover:bg-red-500/5 transition-all"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        </div>
        {isAnalyzingLocal && (
            <div className="absolute inset-0 bg-violet-900/10 backdrop-blur-sm z-20 flex flex-col items-center justify-center rounded-3xl">
               <Loader2 className="animate-spin text-violet-500 mb-2" size={32} />
               <p className="text-xs font-bold text-violet-600 uppercase tracking-widest">{appLanguage === 'pl' ? 'Scraping & Analiza...' : 'Scraping & Analizing...'}</p>
            </div>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, x: -100 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
      className="glass rounded-3xl p-8 space-y-5 hover:border-violet-500/30 transition-all group relative overflow-hidden"
    >
      {/* Background Score Glow */}
      <div className={`absolute -top-16 -right-16 w-40 h-40 ${scoreColors.bg} opacity-5 rounded-full blur-3xl transition-opacity group-hover:opacity-10`} />

      {/* Top Row: Score + Title */}
      <div className="flex items-start justify-between relative">
        <div className="flex-1 pr-4">
          <h3 className="text-xl font-bold leading-tight mb-1">{job.title}</h3>
          <div className="flex items-center space-x-2 text-sm">
            <span className="text-violet-500 font-semibold">{job.company}</span>
            {job.location && (
              <>
                <span className="text-black/20">•</span>
                <span className="text-black/40">{job.location}</span>
              </>
            )}
          </div>
        </div>

        {/* Match Score Badge */}
        <div className={`relative flex-shrink-0`}>
          <div className={`w-20 h-20 rounded-2xl ${scoreColors.bg} bg-opacity-10 ring-4 ${scoreColors.ring} flex flex-col items-center justify-center shadow-lg ${scoreColors.glow}`}>
            <span className={`text-2xl font-display font-black ${scoreColors.text}`}>{job.matchScore}</span>
            <span className={`text-[8px] uppercase font-bold tracking-widest ${scoreColors.text} opacity-70`}>match</span>
          </div>
        </div>
      </div>

      {/* AI Summary */}
      <div className="bg-gradient-to-r from-violet-500/5 to-indigo-500/5 rounded-2xl p-4 border border-violet-500/10">
        <div className="flex items-start space-x-2">
          <Sparkles size={16} className="text-violet-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-black/70 leading-relaxed">{job.aiSummary}</p>
        </div>
      </div>

      {/* Skills Tags */}
      <div className="space-y-3">
        {job.matchedSkills && job.matchedSkills.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {job.matchedSkills.slice(0, 5).map((skill) => (
              <span key={skill} className="px-2.5 py-1 bg-emerald-500/10 text-emerald-700 rounded-lg text-xs font-medium flex items-center space-x-1">
                <CheckCircle2 size={10} />
                <span>{skill}</span>
              </span>
            ))}
          </div>
        )}
        {job.missingSkills && job.missingSkills.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {job.missingSkills.slice(0, 3).map((skill) => (
              <span key={skill} className="px-2.5 py-1 bg-amber-500/10 text-amber-700 rounded-lg text-xs font-medium flex items-center space-x-1">
                <AlertTriangle size={10} />
                <span>{skill}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center space-x-3 pt-2">
        <motion.button
          onClick={handleGenerateCv}
          disabled={isGenerating}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex-1 py-3.5 bg-gradient-to-r from-violet-500 to-indigo-600 text-white font-bold rounded-2xl hover:scale-[1.02] transition-all shadow-lg shadow-violet-500/20 flex items-center justify-center space-x-2"
        >
          {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Zap size={18} />}
          <span>{appLanguage === 'pl' ? 'Dopasuj CV' : 'Tailor CV'}</span>
        </motion.button>

        <a
          href={job.url}
          target="_blank"
          rel="noopener noreferrer"
          className="p-3.5 bg-black/5 border border-black/10 rounded-2xl text-black/40 hover:text-black hover:bg-black/10 transition-all"
          title={appLanguage === 'pl' ? 'Otwórz ofertę' : 'Open job'}
        >
          <ExternalLink size={18} />
        </a>

        <button
          onClick={onDismiss}
          className="p-3.5 bg-black/5 border border-black/10 rounded-2xl text-black/20 hover:text-red-500 hover:bg-red-500/5 hover:border-red-500/20 transition-all"
          title={appLanguage === 'pl' ? 'Odrzuć' : 'Dismiss'}
        >
          <X size={18} />
        </button>
      </div>

      {/* Timestamp */}
      <p className="text-[10px] text-black/20 uppercase tracking-widest font-mono text-right">
        {new Date(job.foundAt).toLocaleString(appLanguage === 'pl' ? 'pl-PL' : 'en-US')}
      </p>
    </motion.div>
  );
};
