import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, AlertTriangle, Target, Zap, FileText, ChevronDown, Plus, Loader2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import { t } from '../i18n';
import { fixGapInCv } from '../lib/gemini';
import { notify } from '../lib/notifications';

interface MatchAnalysisProps {
  analysis: {
    score: number;
    hardSkillsGaps?: { skill: string; reason: string; priority?: 'high' | 'medium' | 'low' }[];
    experienceGaps?: { skill: string; reason: string; priority?: 'high' | 'medium' | 'low' }[];
    recommendations: any[]; // Can be string[] or {text: string, priority: string}[]
    strengths?: string[];
  };
  onContinue: () => void;
}

export const MatchAnalysis: React.FC<MatchAnalysisProps> = ({ analysis, onContinue }) => {
  const { appLanguage, profile, updateProfile, cvCreatorState, setCvCreatorState } = useStore();
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    recommendations: false,
    strengths: true,
  });
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [fixModal, setFixModal] = useState<{ isOpen: boolean; skill: string; type: 'hard' | 'experience' | 'recommendation' | null }>({ isOpen: false, skill: '', type: null });
  const [summaryModal, setSummaryModal] = useState<{ 
    isOpen: boolean; 
    title: string; 
    message: string; 
    details: string; 
    savedToMaster: boolean;
    diff?: {
      section: string;
      oldText: string;
      newText: string;
    }
  }>({ isOpen: false, title: '', message: '', details: '', savedToMaster: false });
  const [fixInput, setFixInput] = useState('');

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleFixGap = async (saveToMaster: boolean) => {
    if (!cvCreatorState?.tailoredData || !profile?.geminiApiKey || !fixModal.skill) return;
    
    setIsRegenerating(true);
    
    try {
      // Only regenerate experience if user provided input (for experience gaps or hard skills with context)
      let updatedData = cvCreatorState.tailoredData;
      if (fixInput.trim()) {
        updatedData = await fixGapInCv(
          profile.geminiApiKey,
          cvCreatorState.tailoredData,
          fixModal.skill,
          cvCreatorState.jobInfo,
          fixInput
        );
      }

      // Calculate local score bump
      let newScore = analysis.score;
      const totalGaps = (cvCreatorState.tailoredData.matchAnalysis?.hardSkillsGaps?.length || 0) + 
                        (cvCreatorState.tailoredData.matchAnalysis?.experienceGaps?.length || 0) + 
                        (cvCreatorState.tailoredData.matchAnalysis?.recommendations?.length || 0) + 1; // +1 for the one we just fixed
      
      if (totalGaps > 0) {
        const scoreBump = Math.ceil((100 - analysis.score) / totalGaps);
        newScore = Math.min(100, analysis.score + scoreBump);
      }

      // Find what exactly changed in experience
      let exactChangeDetails = '';
      let diffData: { section: string; oldText: string; newText: string; } | undefined;
      
      if (fixModal.type !== 'hard' || fixInput.trim()) {
        const oldExp = cvCreatorState.tailoredData.tailoredExperience || [];
        const newExp = updatedData.tailoredExperience || [];
        const changedEntry = newExp.find((newE: any, i: number) => 
          newE.description !== oldExp[i]?.description || (newE.modifiedByAI && !oldExp[i]?.modifiedByAI)
        );
        if (changedEntry) {
          const oldEntry = oldExp.find((e: any) => e.id === changedEntry.id) || oldExp[0];
          exactChangeDetails = `Zaktualizowano sekcję: ${changedEntry.company} (${changedEntry.position})\n\nNowy wpis:\n"${changedEntry.description}"`;
          diffData = {
            section: `Doświadczenie (${changedEntry.position} - ${changedEntry.company})`,
            oldText: oldEntry?.description || '',
            newText: changedEntry.description || ''
          };
        } else {
          const oldEdu = cvCreatorState.tailoredData.education || [];
          const newEdu = updatedData.education || [];
          const changedEdu = newEdu.find((newE: any, i: number) => newE.description !== oldEdu[i]?.description);
          
          if (changedEdu) {
            const oldEntry = oldEdu.find((e: any) => e.id === changedEdu.id) || oldEdu[0];
            exactChangeDetails = `Zaktualizowano sekcję: Edukacja (${changedEdu.school})\n\nNowy wpis:\n"${changedEdu.description}"`;
            diffData = {
              section: `Edukacja (${changedEdu.degree} - ${changedEdu.school})`,
              oldText: oldEntry?.description || '',
              newText: changedEdu.description || ''
            };
          } else if (updatedData.tailoredSummary !== cvCreatorState.tailoredData.tailoredSummary) {
            exactChangeDetails = `Zaktualizowano podsumowanie zawodowe.`;
            diffData = {
              section: `Podsumowanie zawodowe`,
              oldText: cvCreatorState.tailoredData.tailoredSummary || '',
              newText: updatedData.tailoredSummary || ''
            };
          }
        }
      }

      // Update CV State
      setCvCreatorState({
        tailoredData: {
          ...updatedData,
          tailoredSkills: fixModal.type === 'hard' ? [...(updatedData.tailoredSkills || []), fixModal.skill] : updatedData.tailoredSkills,
          matchAnalysis: cvCreatorState.tailoredData.matchAnalysis ? {
            ...cvCreatorState.tailoredData.matchAnalysis,
            score: newScore,
            hardSkillsGaps: fixModal.type === 'hard' ? cvCreatorState.tailoredData.matchAnalysis.hardSkillsGaps?.filter((g: any) => g.skill !== fixModal.skill) : cvCreatorState.tailoredData.matchAnalysis.hardSkillsGaps,
            experienceGaps: fixModal.type === 'experience' ? cvCreatorState.tailoredData.matchAnalysis.experienceGaps?.filter((g: any) => g.skill !== fixModal.skill) : cvCreatorState.tailoredData.matchAnalysis.experienceGaps,
            recommendations: fixModal.type === 'recommendation' ? cvCreatorState.tailoredData.matchAnalysis.recommendations?.filter((r: any) => (typeof r === 'string' ? r : r.text) !== fixModal.skill) : cvCreatorState.tailoredData.matchAnalysis.recommendations
          } : undefined
        }
      });
      
      // Save to Master Profile if requested
      let summaryDetails = '';
      if (saveToMaster) {
        if (fixModal.type === 'hard') {
          const newSkill = {
            name: fixModal.skill,
            category: 'hard',
            level: 'Intermediate' as const,
          };
          updateProfile({
            skills: [...(profile.skills || []), newSkill]
          });
          summaryDetails = `Dodano umiejętność "${fixModal.skill}" do Twojego Master Profilu.`;
        } else if ((fixModal.type === 'experience' || fixModal.type === 'recommendation') && fixInput.trim()) {
          const newBio = profile.personalInfo?.additionalInfo 
            ? `${profile.personalInfo.additionalInfo}\n\nDodatkowe doświadczenie: ${fixInput}` 
            : `Dodatkowe doświadczenie: ${fixInput}`;
          updateProfile({
            personalInfo: {
              ...profile.personalInfo,
              additionalInfo: newBio
            }
          });
          summaryDetails = `Zaktualizowano Dodatkowe Informacje w Twoim Master Profilu o nowe doświadczenie. AI będzie o tym pamiętać przy generowaniu kolejnych CV.`;
        }
      } else {
        summaryDetails = `Zmiany zostały zapisane tylko w tym konkretnym CV.`;
      }
      
      setSummaryModal({
        isOpen: true,
        title: 'Aktualizacja zakończona sukcesem! 🎉',
        message: fixModal.type === 'hard' && !fixInput.trim() 
          ? `Sztuczna inteligencja dodała "${fixModal.skill}" do sekcji umiejętności w Twoim CV.` 
          : `Sztuczna inteligencja przeanalizowała Twój opis i wplotła nowe doświadczenie w odpowiednie miejsce w CV (oznaczone na żółto w edytorze). Twój Smart Match Score wzrósł do ${newScore}%!`,
        details: exactChangeDetails ? `${summaryDetails}\n\nSzczegóły zmiany w CV:\n${exactChangeDetails}` : summaryDetails,
        savedToMaster: saveToMaster,
        diff: diffData
      });

      setFixModal({ isOpen: false, skill: '', type: null });
    } catch (error) {
      console.error("Failed to regenerate experience:", error);
      notify.error("Nie udało się zaktualizować doświadczenia.");
    } finally {
      setIsRegenerating(false);
      setFixInput('');
    }
  };

  const scoreColor = analysis.score > 75 ? 'text-green-500' : analysis.score >= 50 ? 'text-yellow-500' : 'text-red-500';
  const scoreBg = analysis.score > 75 ? 'bg-green-500' : analysis.score >= 50 ? 'bg-yellow-500' : 'bg-red-500';

  const getPriorityStyles = (priority?: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high': return 'bg-red-500/10 text-red-600 border-red-500/20';
      case 'medium': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      case 'low': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      default: return 'bg-black/5 text-black/60 border-black/10';
    }
  };
  
  const getPriorityLabel = (priority?: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high': return <span className="flex items-center gap-1"><AlertTriangle size={12} /> Krytyczne (Must-have)</span>;
      case 'medium': return 'Ważne (Should-have)';
      case 'low': return 'Dodatkowe (Nice-to-have)';
      default: return '';
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8">
      <div className="text-center space-y-4">
        <h2 className="text-4xl font-display uppercase tracking-tight flex items-center justify-center space-x-3">
          <Target className="text-primary" size={32} />
          <span>{t('matchAnalysisTitle', appLanguage) || 'Match Analysis'}</span>
        </h2>
        <p className="text-black/60">{t('matchAnalysisSubtitle', appLanguage) || 'Here is how your profile matches the job requirements.'}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Score Widget */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-3xl p-8 flex flex-col items-center justify-center text-center relative overflow-hidden"
        >
          <div className="relative w-48 h-48 flex items-center justify-center mb-6">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="8" className="text-black/5" />
              <motion.circle
                cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="8"
                strokeDasharray="283"
                initial={{ strokeDashoffset: 283 }}
                animate={{ strokeDashoffset: 283 - (283 * analysis.score) / 100 }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                className={`${scoreColor}`}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-5xl font-display font-bold ${scoreColor}`}>{analysis.score}%</span>
              <span className="text-sm font-bold uppercase tracking-widest text-black/40 mt-1">Match</span>
            </div>
          </div>
          <h3 className="font-bold text-xl">Smart Match Score</h3>
        </motion.div>

        {/* Gap Analysis */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="md:col-span-2 glass rounded-3xl overflow-hidden"
        >
          <div className="w-full p-8 flex items-center justify-between border-b border-black/5">
            <div className="flex items-center space-x-2 text-[var(--color-accent)]">
              <AlertTriangle size={24} />
              <h3 className="font-bold text-xl uppercase tracking-widest">Gap Analysis</h3>
            </div>
          </div>

          <div className="px-8 pb-8">
            <div className="grid grid-cols-1 gap-8 pt-4">
                  <div className="space-y-4">
                    <h4 className="text-sm font-bold uppercase text-black/40 border-b border-black/5 pb-2">🔴 Twarde braki narzędziowe/techniczne</h4>
                    {analysis.hardSkillsGaps && analysis.hardSkillsGaps.length > 0 ? (
                      <ul className="space-y-4">
                        {analysis.hardSkillsGaps.map((gap, i) => (
                          <li key={i} className="flex flex-col space-y-2 text-base bg-red-500/5 p-4 rounded-xl border border-red-500/10 relative">
                            {gap.priority && (
                              <div className={`absolute top-4 right-4 px-2 py-1 rounded text-xs font-bold border ${getPriorityStyles(gap.priority)}`}>
                                {getPriorityLabel(gap.priority)}
                              </div>
                            )}
                            <div className="flex items-start space-x-3 pr-20">
                              <XCircle size={20} className="text-red-500 shrink-0 mt-0.5" />
                              <div>
                                <span className="text-black/80 font-bold block">{gap.skill}</span>
                                <span className="text-black/60 text-sm mt-1 block">{gap.reason}</span>
                              </div>
                            </div>
                            <div className="flex justify-end pt-2">
                              <button 
                                onClick={() => setFixModal({ isOpen: true, skill: gap.skill, type: 'hard' })}
                                className="text-sm bg-white border border-black/10 hover:bg-black/5 px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 shadow-sm"
                              >
                                <Plus size={16} />
                                <span>Zaraz, robiłem to! Dopiszmy to do CV</span>
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="flex items-center space-x-2 text-base text-green-600 bg-green-500/10 p-4 rounded-xl">
                        <CheckCircle2 size={20} />
                        <span className="font-medium">Brak twardych luk technicznych!</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-sm font-bold uppercase text-black/40 border-b border-black/5 pb-2">🟡 Luki w skali lub typie doświadczenia</h4>
                    {analysis.experienceGaps && analysis.experienceGaps.length > 0 ? (
                      <ul className="space-y-4">
                        {analysis.experienceGaps.map((gap, i) => (
                          <li key={i} className="flex flex-col space-y-2 text-base bg-yellow-500/5 p-4 rounded-xl border border-yellow-500/10 relative">
                            {gap.priority && (
                              <div className={`absolute top-4 right-4 px-2 py-1 rounded text-xs font-bold border ${getPriorityStyles(gap.priority)}`}>
                                {getPriorityLabel(gap.priority)}
                              </div>
                            )}
                            <div className="flex items-start space-x-3 pr-20">
                              <AlertTriangle size={20} className="text-yellow-500 shrink-0 mt-0.5" />
                              <div>
                                <span className="text-black/80 font-bold block">{gap.skill}</span>
                                <span className="text-black/60 text-sm mt-1 block">{gap.reason}</span>
                              </div>
                            </div>
                            <div className="flex justify-end pt-2">
                              <button 
                                onClick={() => setFixModal({ isOpen: true, skill: gap.skill, type: 'experience' })}
                                className="text-sm bg-white border border-black/10 hover:bg-black/5 px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 shadow-sm"
                              >
                                <Plus size={16} />
                                <span>Zaraz, robiłem to! Dopiszmy to do CV</span>
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="flex items-center space-x-2 text-base text-green-600 bg-green-500/10 p-4 rounded-xl">
                        <CheckCircle2 size={20} />
                        <span className="font-medium">Twoje doświadczenie idealnie pasuje do skali projektu!</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
        </motion.div>

        {/* Recommendations */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="md:col-span-3 glass rounded-3xl overflow-hidden"
        >
          <button 
            onClick={() => toggleSection('recommendations')}
            className="w-full p-8 flex items-center justify-between hover:bg-black/5 transition-colors"
          >
            <div className="flex items-center space-x-2 text-[var(--color-accent)]">
              <Zap size={24} />
              <h3 className="font-bold text-xl uppercase tracking-widest">Actionable Recommendations</h3>
            </div>
            <ChevronDown size={24} className={`transform transition-transform ${openSections.recommendations ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {openSections.recommendations && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="px-8 pb-8"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-black/5">
                  {analysis.recommendations?.map((rec, i) => {
                    const text = typeof rec === 'string' ? rec : rec.text;
                    const priority = typeof rec === 'string' ? undefined : rec.priority;
                    return (
                    <div key={i} className="bg-white/50 border border-black/5 p-6 rounded-2xl text-base flex flex-col space-y-4 shadow-sm hover:shadow-md transition-shadow relative">
                      {priority && (
                        <div className={`absolute top-4 right-4 px-2 py-1 rounded text-xs font-bold border ${getPriorityStyles(priority)}`}>
                          {getPriorityLabel(priority)}
                        </div>
                      )}
                      <div className="flex items-start space-x-4 pr-16">
                        <div className="w-8 h-8 rounded-full bg-[var(--color-accent)]/10 text-[var(--color-accent)] flex items-center justify-center shrink-0 font-bold text-sm">
                          {i + 1}
                        </div>
                        <p className="text-black/80 leading-relaxed pt-1 flex-1">{text}</p>
                      </div>
                      <div className="flex justify-end pl-12">
                        <button
                          onClick={() => setFixModal({ isOpen: true, skill: text, type: 'recommendation' })}
                          className="px-4 py-2 bg-black/5 hover:bg-[var(--color-accent)] hover:text-white text-black/60 font-bold rounded-xl text-sm transition-colors flex items-center space-x-2"
                        >
                          <Zap size={16} />
                          <span>Zaraz, przecież to robiłem! Napraw to</span>
                        </button>
                      </div>
                    </div>
                  )})}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
        
        {/* Strengths */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="md:col-span-3 glass rounded-3xl overflow-hidden"
        >
          <button 
            onClick={() => toggleSection('strengths')}
            className="w-full p-8 flex items-center justify-between hover:bg-black/5 transition-colors"
          >
            <div className="flex items-center space-x-2 text-green-600">
              <CheckCircle2 size={24} />
              <h3 className="font-bold text-xl uppercase tracking-widest">Twoje Mocne Strony (Dlaczego ich zachwycisz)</h3>
            </div>
            <ChevronDown size={24} className={`transform transition-transform ${openSections.strengths ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {openSections.strengths && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="px-8 pb-8"
              >
                <div className="flex flex-col gap-4 pt-4 border-t border-black/5">
                  {analysis.strengths?.map((strength, i) => (
                    <div key={i} className="flex items-start space-x-3 bg-green-500/10 p-4 rounded-xl border border-green-500/20 shadow-sm">
                      <CheckCircle2 size={20} className="text-green-600 shrink-0 mt-0.5" />
                      <span className="text-green-800 font-medium text-base leading-relaxed">
                        {strength}
                      </span>
                    </div>
                  ))}
                  {(!analysis.strengths || analysis.strengths.length === 0) && (
                    <span className="text-base text-black/40 italic">Nie znaleziono wyraźnych mocnych stron.</span>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      <div className="flex justify-center pt-12 pb-8">
        <button
          onClick={onContinue}
          className="px-14 py-5 bg-[var(--color-accent)] text-white font-bold rounded-2xl hover:scale-[1.02] transition-all shadow-xl text-lg flex items-center space-x-3"
        >
          <span>{t('continueToEditor', appLanguage) || 'Continue to Editor'}</span>
          <FileText size={20} />
        </button>
      </div>

      {/* Gap Fixer Modal */}
      <AnimatePresence>
        {fixModal.isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl p-8 max-w-2xl w-full"
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-2xl font-bold mb-2">Uzupełnij brak: <span className="text-[var(--color-accent)]">{fixModal.type === 'recommendation' ? 'Rekomendacja' : fixModal.skill}</span></h3>
                  {fixModal.type === 'recommendation' && (
                    <p className="text-black/80 italic mb-4 border-l-4 border-[var(--color-accent)] pl-4 py-1 bg-black/5 rounded-r-lg">"{fixModal.skill}"</p>
                  )}
                  <p className="text-black/60">
                    {fixModal.type === 'hard' 
                      ? "Znasz to narzędzie/technologię? Możesz po prostu dodać je do listy umiejętności, lub opisać jak go używałeś, aby AI wplotło to w Twoje doświadczenie."
                      : "Opisz krótko swoje doświadczenie w tym obszarze. AI automatycznie wplecie to w odpowiednie miejsce w Twoim CV."}
                  </p>
                </div>
                <button onClick={() => setFixModal({ isOpen: false, skill: '', type: null })} className="p-2 hover:bg-black/5 rounded-full transition-colors">
                  <XCircle size={24} className="text-black/40" />
                </button>
              </div>
              
              <div className="space-y-4 mb-8">
                {fixModal.type === 'hard' && (
                  <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Zap size={20} className="text-blue-500" />
                      <div>
                        <span className="font-bold text-blue-900 block">Szybkie dodanie</span>
                        <span className="text-sm text-blue-700">Dodaj tylko do listy umiejętności (bez pisania historii)</span>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleFixGap(false)}
                        disabled={isRegenerating}
                        className="px-4 py-2 bg-white text-blue-600 border border-blue-200 hover:bg-blue-50 rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
                      >
                        Tylko do tego CV
                      </button>
                      <button
                        onClick={() => handleFixGap(true)}
                        disabled={isRegenerating}
                        className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
                      >
                        Zapisz w Master Profilu
                      </button>
                    </div>
                  </div>
                )}

                <div className="relative">
                  <textarea
                    value={fixInput}
                    onChange={(e) => setFixInput(e.target.value)}
                    placeholder={fixModal.type === 'hard' ? "Opcjonalnie: Opisz jak używałeś tego narzędzia..." : "Np. Negocjowałem umowy z dostawcami z Chin na 50k USD..."}
                    className="w-full h-32 p-4 rounded-xl border border-black/10 bg-black/5 focus:bg-white focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent outline-none resize-none"
                  />
                  {isRegenerating && (
                    <div className="absolute inset-0 bg-white/50 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center">
                      <Loader2 size={32} className="animate-spin text-[var(--color-accent)] mb-2" />
                      <span className="font-bold text-black/60">AI rzeźbi Twoje doświadczenie...</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-4">
                <button
                  onClick={() => handleFixGap(false)}
                  disabled={(!fixInput.trim() && fixModal.type !== 'hard') || isRegenerating}
                  className="px-6 py-3 rounded-xl font-bold border border-black/10 hover:bg-black/5 transition-colors disabled:opacity-50"
                >
                  Zapisz tylko do tego CV
                </button>
                <button
                  onClick={() => handleFixGap(true)}
                  disabled={(!fixInput.trim() && fixModal.type !== 'hard') || isRegenerating}
                  className="px-6 py-3 rounded-xl font-bold bg-[var(--color-accent)] text-white hover:scale-105 transition-transform shadow-lg shadow-[var(--color-accent)]/20 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:hover:scale-100"
                >
                  <Zap size={20} />
                  <span>Zapisz globalnie w Master Profilu</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Summary Modal */}
      <AnimatePresence>
        {summaryModal.isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl p-8 max-w-lg w-full text-center"
            >
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 size={32} />
              </div>
              <h3 className="text-2xl font-bold mb-4">{summaryModal.title}</h3>
              <p className="text-black/80 text-lg mb-4">{summaryModal.message}</p>
              
              {summaryModal.diff ? (
                <div className="bg-black/5 p-4 rounded-xl mb-8 text-left border border-black/10 max-h-96 overflow-y-auto">
                  <h4 className="font-bold text-sm mb-2 text-black/60 uppercase tracking-wider">Zmodyfikowana sekcja:</h4>
                  <p className="text-sm font-bold mb-4 text-[var(--color-accent)]">{summaryModal.diff.section}</p>
                  
                  <div className="space-y-4">
                    <div className="bg-red-50 border border-red-100 rounded-lg p-3 relative">
                      <div className="absolute -top-2 -left-2 bg-red-100 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">Przed</div>
                      <p className="text-sm text-red-900/80 line-through decoration-red-300 mt-1">{summaryModal.diff.oldText}</p>
                    </div>
                    
                    <div className="bg-green-50 border border-green-100 rounded-lg p-3 relative">
                      <div className="absolute -top-2 -left-2 bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">Po (AI Weaving)</div>
                      <p className="text-sm text-green-900 mt-1">{summaryModal.diff.newText}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3 mt-6 pt-4 border-t border-black/10">
                    {summaryModal.savedToMaster ? (
                      <Zap size={16} className="text-[var(--color-accent)] shrink-0 mt-0.5" />
                    ) : (
                      <FileText size={16} className="text-black/40 shrink-0 mt-0.5" />
                    )}
                    <p className="text-xs text-black/60 font-medium whitespace-pre-wrap">{summaryModal.savedToMaster ? "Zapisano również w Master Profilu." : "Zapisano tylko w tym CV."}</p>
                  </div>
                </div>
              ) : (
                <div className="bg-black/5 p-4 rounded-xl mb-8 text-left border border-black/10 max-h-64 overflow-y-auto">
                  <div className="flex items-start space-x-3 mb-4">
                    {summaryModal.savedToMaster ? (
                      <Zap size={20} className="text-[var(--color-accent)] shrink-0 mt-0.5" />
                    ) : (
                      <FileText size={20} className="text-black/40 shrink-0 mt-0.5" />
                    )}
                    <p className="text-sm text-black/70 font-medium whitespace-pre-wrap">{summaryModal.details}</p>
                  </div>
                </div>
              )}
              
              <button
                onClick={() => setSummaryModal(prev => ({ ...prev, isOpen: false }))}
                className="w-full px-6 py-4 rounded-xl font-bold bg-[var(--color-accent)] text-white hover:scale-105 transition-transform shadow-lg shadow-[var(--color-accent)]/20"
              >
                Rozumiem, kontynuuj
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
