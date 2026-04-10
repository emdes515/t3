import React, { useState, useEffect, useCallback } from 'react';
import { useStore } from '../store/useStore';
import { t } from '../i18n';
import { fetchJobFromURL, analyzeJobDescription, tailorCv, translateTailoredData } from '../lib/gemini';
import { db } from '../firebase';
import { collection, addDoc, updateDoc, doc, serverTimestamp, getDoc, setDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firebase-errors';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { Sparkles, Link as LinkIcon, FileText, Download, CheckCircle2, Loader2, ArrowLeft, Eye, Edit3, Save, Languages, RefreshCw, X, Plus, AlertTriangle, GripVertical, ThumbsUp, Undo } from 'lucide-react';
import { notify } from '../lib/notifications';
import { PDFDownloadLink, Document, Page, Text, View, StyleSheet, Font, Image } from '@react-pdf/renderer';
import { CanvasPDFViewer } from './CanvasPDFViewer';
import debounce from 'lodash.debounce';
import { generateWordDocument } from '../lib/docxExport';

import { ModernTemplate } from './pdf/templates/ModernTemplate';
import { ClassicTemplate } from './pdf/templates/ClassicTemplate';
import { ModernCoverLetterTemplate } from './pdf/templates/ModernCoverLetterTemplate';
import { ClassicCoverLetterTemplate } from './pdf/templates/ClassicCoverLetterTemplate';
import { registerFonts } from './pdf/fonts';
import { MatchAnalysis } from './MatchAnalysis';

// Register Fonts for PDF
registerFonts();

// PDF Styles



interface CvCreatorProps {
  initialData?: any;
  onClose?: () => void;
}

export const CvCreator: React.FC<CvCreatorProps> = ({ initialData, onClose }) => {
  const { profile, appLanguage, cvCreatorState, setCvCreatorState } = useStore();
  
  const step = initialData ? 3 : (cvCreatorState?.step || 1);
  const jobUrl = initialData?.jobUrl || (cvCreatorState?.jobUrl || '');
  const manualJobText = cvCreatorState?.manualJobText || '';
  const isManual = cvCreatorState?.isManual || false;
  const jobInfo = initialData ? { basic_info: { company_name: initialData.company, job_title: initialData.position }, skills: { must_have: [] } } : (cvCreatorState?.jobInfo || null);
  const targetLanguage = cvCreatorState?.targetLanguage || 'auto';
  const activeTab = cvCreatorState?.activeTab || 'analysis';
  const selectedTemplate = cvCreatorState?.selectedTemplate || 'modern';

  const [localTailoredData, setLocalTailoredData] = useState<any>(initialData?.tailoredCv || null);
  const tailoredData = initialData ? localTailoredData : (cvCreatorState?.tailoredData || null);
  const [debouncedTailoredData, setDebouncedTailoredData] = useState<any>(tailoredData);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedTailoredData(tailoredData);
    }, 1000);
    return () => clearTimeout(handler);
  }, [tailoredData]);

  const [isTranslating, setIsTranslating] = useState(false);
  const [showPhoto, setShowPhoto] = useState(true);
  const [showSkillLevels, setShowSkillLevels] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showLowConfidenceModal, setShowLowConfidenceModal] = useState(false);
  const [showInvalidJobModal, setShowInvalidJobModal] = useState(false);
  const [showNotAJobModal, setShowNotAJobModal] = useState(false);
  const [editorMode, setEditorMode] = useState<'form' | 'pdf'>('form');
  const [progressMessage, setProgressMessage] = useState('');

  const isAnalyzing = cvCreatorState?.isAnalyzing || false;
  const isTailoring = cvCreatorState?.isTailoring || false;
  const applicationId = initialData?.id || cvCreatorState?.applicationId;

  // Labor Illusion Effect
  useEffect(() => {
    if (isAnalyzing) {
      setProgressMessage("Nawiązywanie bezpiecznego połączenia z portalem...");

      const timer1 = setTimeout(() => {
        setProgressMessage("Oczyszczanie strony z szumu i reklam...");
      }, 2000);

      const timer2 = setTimeout(() => {
        setProgressMessage("AI analizuje wymagania i wyciąga słowa kluczowe...");
      }, 5000);

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    } else {
      setProgressMessage('');
    }
  }, [isAnalyzing]);

  // Debounced Auto-save for CV
  const debouncedSaveCv = useCallback(
    debounce(async (appId: string, dataToSave: any) => {
      setIsUpdating(true);
      const path = `applications/${appId}`;
      try {
        await updateDoc(doc(db, 'applications', appId), {
          tailoredCv: dataToSave,
          updatedAt: serverTimestamp()
        });
        // notify.success(t('applicationUpdated', appLanguage)); // Optional: might be too noisy for auto-save
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, path);
        notify.error(t('failedToUpdateApplication', appLanguage));
      } finally {
        setIsUpdating(false);
      }
    }, 2000),
    [appLanguage]
  );

  useEffect(() => {
    if (applicationId && tailoredData) {
      debouncedSaveCv(applicationId, tailoredData);
    }
    return () => debouncedSaveCv.cancel();
  }, [tailoredData, applicationId, debouncedSaveCv]);

  const handleReset = () => {
    if (window.confirm(appLanguage === 'pl' ? 'Czy na pewno chcesz zacząć od nowa? Niezapisane zmiany zostaną utracone.' : 'Are you sure you want to start over? Unsaved changes will be lost.')) {
      setCvCreatorState({
        step: 1,
        jobUrl: '',
        manualJobText: '',
        isManual: false,
        jobInfo: null,
        tailoredData: null,
        targetLanguage: 'auto',
        activeTab: 'analysis',
        selectedTemplate: 'modern',
        isAnalyzing: false,
        isTailoring: false
      });
    }
  };

  useEffect(() => {
    if (initialData?.tailoredCv && !initialData.tailoredCv.personalInfo && profile) {
      setLocalTailoredData({
        ...initialData.tailoredCv,
        personalInfo: { ...profile.personalInfo },
        education: [...profile.education],
        projects: [...(profile.projects || [])],
        languages: [...(profile.languages || [])]
      });
    }
  }, [initialData, profile]);

  const languages = [
    { code: 'auto', label: t('auto', appLanguage) },
    { code: 'polish', label: t('polish', appLanguage) },
    { code: 'english', label: t('english', appLanguage) },
    { code: 'german', label: t('german', appLanguage) },
    { code: 'french', label: t('french', appLanguage) },
    { code: 'spanish', label: t('spanish', appLanguage) },
  ];

  const handleAnalyze = async () => {
    if (!profile?.geminiApiKey) {
      notify.error(t('geminiKeyMissing', appLanguage));
      return;
    }

    setCvCreatorState({ isAnalyzing: true, jobUrl, manualJobText, isManual });

    let analyzed;
    try {
      if (isManual) {
        analyzed = await analyzeJobDescription(profile.geminiApiKey, manualJobText);
      } else {
        // Pillar 4: Caching na poziomie bazy danych
        // Create a simple hash from the URL
        const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(jobUrl));
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const urlHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        
        const cacheRef = doc(db, 'job_cache', urlHash);
        const cacheSnap = await getDoc(cacheRef);
        
        // Check if cache exists and is less than 7 days old
        const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
        if (cacheSnap.exists() && (Date.now() - cacheSnap.data().timestamp < SEVEN_DAYS_MS)) {
          console.log("Using cached job analysis");
          analyzed = cacheSnap.data().data;
        } else {
          console.log("Fetching fresh job analysis");
          analyzed = await fetchJobFromURL(profile.geminiApiKey, jobUrl);
          
          // Save to cache if it's a real job offer
          if (analyzed?.meta?.is_real_job_offer !== false) {
            await setDoc(cacheRef, {
              url: jobUrl,
              timestamp: Date.now(),
              data: analyzed
            });
          }
        }
      }
      
      if (analyzed?.meta?.is_real_job_offer === false) {
        setShowNotAJobModal(true);
        setCvCreatorState({ isAnalyzing: false, isManual: true });
        return;
      }
      
      const loc = analyzed?.basic_info?.location?.toLowerCase() || '';
      if (loc.includes('us') || loc.includes('united states') || loc.includes('uk') || loc.includes('united kingdom')) {
        setShowPhoto(false);
      }
      
      // Store analyzed job info so background tailoring can use it if needed or for reference
      setCvCreatorState({ jobInfo: analyzed });

    } catch (error: any) {
      console.error('Analysis error:', error);
      if (error.message === 'JINA_BLOCKED') {
        setShowInvalidJobModal(true);
      } else {
        notify.error(t('analysisFailed', appLanguage));
      }
      setCvCreatorState({ isAnalyzing: false, isManual: true });
      return;
    }

    // Immediately trigger tailoring process (Phase 5 Auto-Calculation)
    const path = 'applications';
    try {
      // Use the newly fetched `analyzed` instead of state variable to avoid race conditions
      const tailored = await tailorCv(profile.geminiApiKey, profile, analyzed, targetLanguage);

      // Enrich tailored data with profile data to allow full editing
      const enrichedTailored = {
        ...tailored,
        personalInfo: { ...profile.personalInfo },
        education: [...profile.education],
        projects: [...(profile.projects || [])],
        languages: [...(profile.languages || [])]
      };

      // Save to Tracker
      const docRef = await addDoc(collection(db, 'applications'), {
        uid: profile.uid,
        jobUrl,
        company: analyzed?.basic_info?.company_name || 'Unknown Company',
        position: analyzed?.basic_info?.job_title || 'Unknown Position',
        status: 'prepared',
        tailoredCv: enrichedTailored,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Linear Jump directly to Step 3
      setCvCreatorState({
        isAnalyzing: false,
        isTailoring: false,
        step: 3,
        tailoredData: enrichedTailored,
        activeTab: 'analysis',
        applicationId: docRef.id
      });
      notify.success(t('tailoringSuccess', appLanguage));
    } catch (error) {
      console.error('Tailoring error:', error);
      handleFirestoreError(error, OperationType.CREATE, path);
      notify.error(t('tailoringFailed', appLanguage));
      setCvCreatorState({ isAnalyzing: false, isTailoring: false });
    }
  };

  // We are keeping handleTailor strictly for manual tailoring override if needed in the future,
  // but the main flow automatically tailors in handleAnalyze.
  const handleTailor = async () => {
    if (!profile?.geminiApiKey || !jobInfo) return;
    
    setCvCreatorState({ isTailoring: true });
    const path = 'applications';
    try {
      const tailored = await tailorCv(profile.geminiApiKey, profile, jobInfo, targetLanguage);
      
      // Enrich tailored data with profile data to allow full editing
      const enrichedTailored = {
        ...tailored,
        personalInfo: { ...profile.personalInfo },
        education: [...profile.education],
        projects: [...(profile.projects || [])],
        languages: [...(profile.languages || [])]
      };
      
      // Save to Tracker
      const docRef = await addDoc(collection(db, 'applications'), {
        uid: profile.uid,
        jobUrl,
        company: jobInfo?.basic_info?.company_name || 'Unknown Company',
        position: jobInfo?.basic_info?.job_title || 'Unknown Position',
        status: 'prepared',
        tailoredCv: enrichedTailored,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      setCvCreatorState({ isTailoring: false, step: 3, tailoredData: enrichedTailored, activeTab: 'analysis', applicationId: docRef.id });
      notify.success(t('tailoringSuccess', appLanguage));
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
      notify.error(t('tailoringFailed', appLanguage));
      setCvCreatorState({ isTailoring: false });
    }
  };

  const handleTranslate = async (lang: string) => {
    if (!profile?.geminiApiKey || !tailoredData) return;
    setIsTranslating(true);
    try {
      const translated = await translateTailoredData(profile.geminiApiKey, tailoredData, lang);
      if (initialData) {
        setLocalTailoredData(translated);
      } else {
        setCvCreatorState({ tailoredData: translated });
      }
      notify.success(t('translationSuccess', appLanguage));
    } catch (error) {
      console.error('Translation error:', error);
      notify.error(t('translationFailed', appLanguage));
    } finally {
      setIsTranslating(false);
    }
  };

  const handleUpdateApplication = async () => {
    if (!initialData?.id || !tailoredData) return;
    setIsUpdating(true);
    const path = `applications/${initialData.id}`;
    try {
      await updateDoc(doc(db, 'applications', initialData.id), {
        tailoredCv: tailoredData,
        updatedAt: serverTimestamp()
      });
      notify.success(t('applicationUpdated', appLanguage));
      if (onClose) onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
      notify.error(t('failedToUpdateApplication', appLanguage));
    } finally {
      setIsUpdating(false);
    }
  };

  const updateTailoredField = (field: string, value: any) => {
    if (initialData) {
      setLocalTailoredData((prev: any) => ({ ...prev, [field]: value }));
    } else {
      setCvCreatorState({ tailoredData: { ...tailoredData, [field]: value } });
    }
  };

  const updateExperienceField = (idx: number, field: string, value: any) => {
    const newExp = [...tailoredData.tailoredExperience];
    newExp[idx] = { ...newExp[idx], [field]: value };
    updateTailoredField('tailoredExperience', newExp);
  };

  const handleCopyText = () => {
    let text = '';
    if (activeTab !== 'coverLetter') {
      text += `${profile?.personalInfo?.fullName || ''}\n`;
      text += `${profile?.personalInfo?.email || ''} | ${profile?.personalInfo?.phone || ''}\n\n`;
      text += `SUMMARY\n${tailoredData?.tailoredSummary || ''}\n\n`;
      text += `EXPERIENCE\n`;
      tailoredData?.tailoredExperience?.filter((exp: any) => !exp.omit).forEach((exp: any) => {
        text += `${exp.role} at ${exp.company}\n`;
        text += `${exp.startDate} - ${exp.endDate}\n`;
        text += `${exp.description}\n\n`;
      });
      text += `EDUCATION\n`;
      tailoredData?.education?.forEach((edu: any) => {
        text += `${edu.degree} at ${edu.institution}\n`;
        text += `${edu.startDate} - ${edu.endDate}\n\n`;
      });
      if (tailoredData?.skills?.length > 0) {
        text += `SKILLS\n${tailoredData.skills.join(', ')}\n\n`;
      }
      if (tailoredData?.projects?.length > 0) {
        text += `PROJECTS\n`;
        tailoredData.projects.forEach((proj: any) => {
          text += `${proj.name}\n${proj.description}\n\n`;
        });
      }
      if (tailoredData?.languages?.length > 0) {
        text += `LANGUAGES\n`;
        tailoredData.languages.forEach((lang: any) => {
          text += `${lang.name} - ${lang.level}\n`;
        });
      }
    } else if (activeTab === 'coverLetter') {
      text = tailoredData?.coverLetter || '';
    }

    navigator.clipboard.writeText(text).then(() => {
      notify.success(t('textCopied', appLanguage));
    }).catch(() => {
      notify.error(t('failedToCopy', appLanguage));
    });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {step > 1 && !initialData && (
            <button 
              onClick={handleReset}
              className="px-4 py-2 bg-red-500/10 text-red-600 hover:bg-red-500/20 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors flex items-center space-x-2"
              title={t('startOver', appLanguage)}
            >
              <RefreshCw size={14} />
              <span>{t('startOver', appLanguage) || 'Start Over'}</span>
            </button>
          )}
          <h2 className="text-4xl font-display uppercase tracking-tight">
            {initialData ? t('editApplication', appLanguage) : t('cvCreator', appLanguage)}
          </h2>
        </div>
        {!initialData && (
          <div className="flex items-center space-x-6">
            {[
              { num: 1, label: t('stepAnalysis', appLanguage) },
              { num: 2, label: t('stepProfile', appLanguage) },
              { num: 3, label: t('stepTuning', appLanguage) }
            ].map((s) => (
              <div key={s.num} className="flex flex-col items-center space-y-2">
                <div 
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${
                    step === 3 || step >= s.num ? 'bg-[var(--color-accent)] text-white shadow-lg shadow-[var(--color-accent)]/20' : 'bg-black/5 text-black/20 border border-black/10'
                  }`}
                >
                  {step === 3 && s.num < 3 ? <CheckCircle2 size={20} /> : step > s.num ? <CheckCircle2 size={20} /> : s.num}
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-widest ${step === 3 || step >= s.num ? 'text-[var(--color-accent)]' : 'text-black/20'}`}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="glass rounded-3xl p-12 space-y-8"
          >
            <div className="text-center space-y-4">
              <div className="w-20 h-20 bg-[var(--color-accent)]/10 rounded-full flex items-center justify-center mx-auto text-[var(--color-accent)]">
                <LinkIcon size={40} />
              </div>
              <h3 className="text-2xl font-bold">{t('pasteJobUrl', appLanguage)}</h3>
              <p className="text-black/40">{t('pasteJobUrlDesc', appLanguage)}</p>
            </div>
            <div className="space-y-4">
              <div className="flex justify-center space-x-4 mb-4">
                <button 
                  onClick={() => setCvCreatorState({ isManual: false })}
                  className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${!isManual ? 'bg-[var(--color-accent)] text-white' : 'bg-black/5 text-black/40'}`}
                >
                  {t('link', appLanguage)}
                </button>
                <button 
                  onClick={() => setCvCreatorState({ isManual: true })}
                  className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${isManual ? 'bg-[var(--color-accent)] text-white' : 'bg-black/5 text-black/40'}`}
                >
                  {t('manualText', appLanguage)}
                </button>
              </div>

              {!isManual ? (
                <div className="flex gap-4">
                  <input
                    type="url"
                    placeholder="https://linkedin.com/jobs/view/..."
                    value={jobUrl}
                    onChange={(e) => setCvCreatorState({ jobUrl: e.target.value })}
                    className="flex-1 bg-white/5 border border-black/10 rounded-2xl px-6 py-4 focus:border-[var(--color-accent)] outline-none transition-all"
                  />
                  <button
                    onClick={handleAnalyze}
                    disabled={isAnalyzing || !jobUrl}
                    className="px-8 bg-[var(--color-accent)] text-white font-bold rounded-2xl hover:scale-105 transition-all disabled:opacity-50 flex items-center space-x-2"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="animate-spin" />
                        <span>{progressMessage || t('analyze', appLanguage)}</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={20} />
                        <span>{t('analyze', appLanguage)}</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <textarea
                    placeholder={t('pasteJobDesc', appLanguage)}
                    value={manualJobText}
                    onChange={(e) => setCvCreatorState({ manualJobText: e.target.value })}
                    className="w-full bg-white/5 border border-black/10 rounded-2xl px-6 py-4 h-64 focus:border-[var(--color-accent)] outline-none transition-all resize-none"
                  />
                  <button
                    onClick={handleAnalyze}
                    disabled={isAnalyzing || !manualJobText}
                    className="w-full py-4 bg-[var(--color-accent)] text-white font-bold rounded-2xl hover:scale-[1.02] transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="animate-spin" />
                        <span>{progressMessage || t('analyzeText', appLanguage)}</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={20} />
                        <span>{t('analyzeText', appLanguage)}</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col h-[85vh]"
          >
            {/* Top Navigation for Step 3 */}
            <div className="flex flex-col space-y-4 bg-[#F5F5F4] z-10 py-4 mb-4 border-b border-black/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 bg-black/5 p-1 rounded-xl">
                  <button 
                    onClick={() => setCvCreatorState({ activeTab: 'analysis' })}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'analysis' ? 'bg-white text-[var(--color-accent)] shadow-sm' : 'text-black/40 hover:text-black'}`}
                  >
                    <Sparkles size={14} />
                    <span>{t('stepAnalysis', appLanguage)}</span>
                  </button>
                  <button 
                    onClick={() => setCvCreatorState({ activeTab: 'cv' })}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'cv' ? 'bg-white text-[var(--color-accent)] shadow-sm' : 'text-black/40 hover:text-black'}`}
                  >
                    <FileText size={14} />
                    <span>CV {t('editor', appLanguage)}</span>
                  </button>
                  <button 
                    onClick={() => setCvCreatorState({ activeTab: 'coverLetter' })}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'coverLetter' ? 'bg-white text-[var(--color-accent)] shadow-sm' : 'text-black/40 hover:text-black'}`}
                  >
                    <FileText size={14} />
                    <span>{t('coverLetter', appLanguage)} {t('editor', appLanguage)}</span>
                  </button>
                </div>
                <div className="flex items-center space-x-2">
                  {initialData && (
                    <button
                      onClick={handleUpdateApplication}
                      disabled={isUpdating}
                      className="p-3 bg-green-500 text-white rounded-xl hover:scale-110 transition-all shadow-lg shadow-green-500/20"
                      title={t('updateApplication', appLanguage)}
                    >
                      {isUpdating ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                    </button>
                  )}
                  {activeTab !== 'analysis' && (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => generateWordDocument(tailoredData, profile, jobInfo, activeTab as 'cv' | 'coverLetter')}
                        className="p-3 bg-blue-600 text-white rounded-xl hover:scale-110 transition-all shadow-lg shadow-blue-600/20"
                        title="Download Word (.docx)"
                      >
                        <FileText size={20} />
                      </button>
                      <PDFDownloadLink
                        document={activeTab === 'cv' ? (selectedTemplate === 'modern' ? <ModernTemplate data={debouncedTailoredData} profile={profile} jobInfo={jobInfo} appLanguage={appLanguage} showPhoto={showPhoto} showSkillLevels={showSkillLevels} /> : <ClassicTemplate data={debouncedTailoredData} profile={profile} jobInfo={jobInfo} appLanguage={appLanguage} showPhoto={showPhoto} showSkillLevels={showSkillLevels} />) : (selectedTemplate === 'modern' ? <ModernCoverLetterTemplate data={debouncedTailoredData} profile={profile} jobInfo={jobInfo} appLanguage={appLanguage} showPhoto={showPhoto} /> : <ClassicCoverLetterTemplate data={debouncedTailoredData} profile={profile} jobInfo={jobInfo} appLanguage={appLanguage} showPhoto={showPhoto} />)}
                        fileName={`${activeTab === 'cv' ? 'CV' : 'CoverLetter'}_${jobInfo?.basic_info?.company_name || jobInfo?.company}_${profile?.personalInfo?.fullName}.pdf`}
                        className="p-3 bg-[var(--color-accent)] text-white rounded-xl hover:scale-110 transition-all shadow-lg shadow-[var(--color-accent)]/20"
                        title="Download PDF"
                      >
                        {({ loading }) => loading ? <Loader2 className="animate-spin" size={20} /> : <Download size={20} />}
                      </PDFDownloadLink>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Nested Tabs for Editor Mode */}
              {activeTab !== 'analysis' && (
                <div className="flex justify-center">
                  <div className="flex items-center space-x-2 bg-black/5 p-1 rounded-xl">
                    <button 
                      onClick={() => setEditorMode('form')}
                      className={`flex items-center space-x-2 px-6 py-2 rounded-lg text-sm font-bold transition-all ${editorMode === 'form' ? 'bg-white text-[var(--color-accent)] shadow-sm' : 'text-black/40 hover:text-black'}`}
                    >
                      <span>📝 Wypełnij dane</span>
                    </button>
                    <button 
                      onClick={() => setEditorMode('pdf')}
                      className={`flex items-center space-x-2 px-6 py-2 rounded-lg text-sm font-bold transition-all ${editorMode === 'pdf' ? 'bg-white text-[var(--color-accent)] shadow-sm' : 'text-black/40 hover:text-black'}`}
                    >
                      <span>📄 Podgląd PDF</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col lg:flex-row gap-8 flex-1 overflow-hidden">
              {/* Left Panel (Tabs Content) */}
              <div className={`w-full ${activeTab === 'analysis' ? 'lg:w-full' : (editorMode === 'form' ? 'max-w-3xl mx-auto' : 'hidden')} flex flex-col space-y-6 overflow-y-auto custom-scrollbar pr-2 pb-12`}>
                {activeTab === 'analysis' ? (
                  <div className="space-y-6 pb-12">
                    {tailoredData?.matchAnalysis ? (
                      <MatchAnalysis analysis={tailoredData.matchAnalysis} onContinue={() => setCvCreatorState({ activeTab: 'cv' })} />
                    ) : (
                      <div className="text-center p-8 glass rounded-3xl">
                        <p className="mb-4">Match analysis is not available for this application.</p>
                        <button onClick={() => setCvCreatorState({ activeTab: 'cv' })} className="px-8 py-3 bg-[var(--color-accent)] text-white rounded-xl">Continue to Editor</button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-6 pb-12">
                    {/* Template Selection & Photo Toggle */}
                    <div className="glass p-4 rounded-2xl space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 text-[var(--color-accent)]">
                          <FileText size={16} />
                          <span className="text-xs font-bold uppercase tracking-widest">{t('selectTemplate', appLanguage)}</span>
                        </div>
                        <div className="flex items-center space-x-4">
                          <label className="flex items-center space-x-2 cursor-pointer group">
                            <span className="text-xs font-bold text-black/60 group-hover:text-black transition-colors">{t('showSkillLevels', appLanguage)}</span>
                            <div className="relative">
                              <input type="checkbox" className="sr-only" checked={showSkillLevels} onChange={(e) => setShowSkillLevels(e.target.checked)} />
                              <div className={`block w-10 h-6 rounded-full transition-colors ${showSkillLevels ? 'bg-[var(--color-accent)]' : 'bg-black/20'}`}></div>
                              <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${showSkillLevels ? 'transform translate-x-4' : ''}`}></div>
                            </div>
                          </label>
                          <label className="flex items-center space-x-2 cursor-pointer group">
                            <span className="text-xs font-bold text-black/60 group-hover:text-black transition-colors">{t('showPhoto', appLanguage)}</span>
                            <div className="relative">
                              <input type="checkbox" className="sr-only" checked={showPhoto} onChange={(e) => setShowPhoto(e.target.checked)} />
                              <div className={`block w-10 h-6 rounded-full transition-colors ${showPhoto ? 'bg-[var(--color-accent)]' : 'bg-black/20'}`}></div>
                              <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${showPhoto ? 'transform translate-x-4' : ''}`}></div>
                            </div>
                          </label>
                        </div>
                      </div>
                      
                      {((jobInfo?.basic_info?.location?.toLowerCase().includes('us') || jobInfo?.basic_info?.location?.toLowerCase().includes('united states') || jobInfo?.basic_info?.location?.toLowerCase().includes('uk') || jobInfo?.basic_info?.location?.toLowerCase().includes('united kingdom'))) && (
                        <div className="bg-blue-500/10 text-blue-700 p-3 rounded-xl text-xs flex items-start space-x-2">
                          <Sparkles size={14} className="shrink-0 mt-0.5" />
                          <span>{t('photoHiddenUs', appLanguage)}</span>
                        </div>
                      )}

                      <div className="flex space-x-2">
                      <button
                        onClick={() => setCvCreatorState({ selectedTemplate: 'modern' })}
                        className={`relative flex-1 py-3 rounded-xl text-xs font-bold transition-all group overflow-hidden ${selectedTemplate === 'modern' ? 'bg-[var(--color-accent)] text-white shadow-md' : 'bg-black/5 text-black/60 hover:bg-black/10'}`}
                      >
                        <span className="relative z-10">Modern</span>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      </button>
                      <button
                        onClick={() => setCvCreatorState({ selectedTemplate: 'classic' })}
                        className={`relative flex-1 py-3 rounded-xl text-xs font-bold transition-all group overflow-hidden ${selectedTemplate === 'classic' ? 'bg-[var(--color-accent)] text-white shadow-md' : 'bg-black/5 text-black/60 hover:bg-black/10'}`}
                      >
                        <span className="relative z-10">Classic</span>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      </button>
                    </div>
                  </div>

                  {/* Language Regeneration */}
                  <div className="glass p-4 rounded-2xl space-y-3">
                    <div className="flex items-center space-x-2 text-[var(--color-accent)]">
                      <Languages size={16} />
                      <span className="text-xs font-bold uppercase tracking-widest">{t('regenerateIn', appLanguage)}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {languages.filter(l => l.code !== 'auto').map((lang) => (
                        <button
                          key={lang.code}
                          onClick={() => handleTranslate(lang.code)}
                          disabled={isTranslating}
                          className="px-3 py-1.5 bg-black/5 hover:bg-black/10 rounded-lg text-[10px] font-bold transition-all flex items-center space-x-1"
                        >
                          {isTranslating ? <Loader2 size={10} className="animate-spin" /> : <RefreshCw size={10} />}
                          <span>{lang.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Personal Info is shared between CV and Cover Letter */}
                  <div className="space-y-4">
                    <label className="text-[10px] uppercase text-black/40 font-bold tracking-widest">{t('personalInfo', appLanguage)}</label>
                    <div className="bg-white border border-black/10 rounded-2xl p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] text-black/40">{t('fullName', appLanguage)}</label>
                        <input
                          value={tailoredData.personalInfo?.fullName || ''}
                          onChange={(e) => updateTailoredField('personalInfo', { ...tailoredData.personalInfo, fullName: e.target.value })}
                          className="w-full bg-black/5 border border-transparent rounded-xl px-4 py-2.5 text-sm focus:bg-white focus:border-[var(--color-accent)] outline-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] text-black/40">{t('jobTitle', appLanguage)}</label>
                        <input
                          value={tailoredData.personalInfo?.jobTitle || ''}
                          onChange={(e) => updateTailoredField('personalInfo', { ...tailoredData.personalInfo, jobTitle: e.target.value })}
                          className="w-full bg-black/5 border border-transparent rounded-xl px-4 py-2.5 text-sm focus:bg-white focus:border-[var(--color-accent)] outline-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] text-black/40">{t('email', appLanguage)}</label>
                        <input
                          value={tailoredData.personalInfo?.email || ''}
                          onChange={(e) => updateTailoredField('personalInfo', { ...tailoredData.personalInfo, email: e.target.value })}
                          className="w-full bg-black/5 border border-transparent rounded-xl px-4 py-2.5 text-sm focus:bg-white focus:border-[var(--color-accent)] outline-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] text-black/40">{t('phone', appLanguage)}</label>
                        <input
                          value={tailoredData.personalInfo?.phone || ''}
                          onChange={(e) => updateTailoredField('personalInfo', { ...tailoredData.personalInfo, phone: e.target.value })}
                          className="w-full bg-black/5 border border-transparent rounded-xl px-4 py-2.5 text-sm focus:bg-white focus:border-[var(--color-accent)] outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {activeTab === 'cv' && (
                    <>
                      <div className="space-y-4">
                        <label className="text-[10px] uppercase text-black/40 font-bold tracking-widest">{t('tailoredSummary', appLanguage)}</label>
                        <textarea
                          value={tailoredData.tailoredSummary}
                          onChange={(e) => updateTailoredField('tailoredSummary', e.target.value)}
                          className="w-full bg-white border border-black/10 rounded-2xl p-6 text-sm leading-relaxed focus:border-[var(--color-accent)] outline-none min-h-[150px] resize-none"
                        />
                      </div>

                  <div className="space-y-6">
                    <label className="text-[10px] uppercase text-black/40 font-bold tracking-widest">{t('tailoredExperience', appLanguage)}</label>
                    <Reorder.Group axis="y" values={tailoredData.tailoredExperience} onReorder={(newOrder) => updateTailoredField('tailoredExperience', newOrder)} className="space-y-6">
                      {tailoredData.tailoredExperience.map((exp: any, idx: number) => (
                        <Reorder.Item key={exp.id} value={exp} className={`bg-white border ${exp.omit ? 'border-red-200 opacity-60' : 'border-black/10'} rounded-2xl p-6 space-y-4 transition-all relative`}>
                          <div className="flex justify-between items-center flex-wrap gap-2">
                            <div className="flex items-center gap-3">
                              <div className="cursor-grab active:cursor-grabbing text-black/20 hover:text-black/60 transition-colors">
                                <GripVertical size={16} />
                              </div>
                              <div>
                                <span className="font-bold text-sm">{exp.company}</span>
                                <span className="text-xs text-black/40 ml-2">{exp.position}</span>
                              </div>
                            </div>
                            <div className="flex items-center space-x-3">
                              {exp.relevanceScore !== undefined && (
                                <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${exp.relevanceScore >= 80 ? 'bg-green-100 text-green-700' : exp.relevanceScore >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                                  Dopasowanie: {exp.relevanceScore}%
                                </span>
                              )}
                              {exp.modifiedByAI && !exp.omit && (
                                <button
                                  onClick={() => {
                                    const originalExp = profile?.experience?.find((e: any) => e.id === exp.id);
                                    if (originalExp) {
                                      updateExperienceField(idx, 'description', originalExp.description);
                                      updateExperienceField(idx, 'modifiedByAI', false);
                                      notify.success(appLanguage === 'pl' ? 'Przywrócono oryginał' : 'Reverted to original');
                                    }
                                  }}
                                  className="text-xs px-3 py-1 rounded-lg font-bold transition-colors bg-yellow-500/10 text-yellow-700 hover:bg-yellow-500/20 flex items-center space-x-1"
                                  title="Przywróć oryginał (Revert)"
                                >
                                  <Undo size={12} />
                                  <span>{appLanguage === 'pl' ? 'Odrzuć zmiany AI' : 'Revert AI changes'}</span>
                                </button>
                              )}
                              <button
                                onClick={() => updateExperienceField(idx, 'omit', !exp.omit)}
                                className={`text-xs px-3 py-1 rounded-lg font-bold transition-colors ${exp.omit ? 'bg-green-500 text-white' : 'bg-red-500/10 text-red-600 hover:bg-red-500/20'}`}
                              >
                                {exp.omit ? 'Przywróć' : 'Pomiń w CV'}
                              </button>
                            </div>
                          </div>
                          <div className="relative pt-2">
                            <textarea
                              value={exp.description}
                              onChange={(e) => updateExperienceField(idx, 'description', e.target.value)}
                              className={`w-full border rounded-xl p-4 text-xs leading-relaxed outline-none min-h-[100px] resize-none transition-colors ${exp.omit ? 'bg-black/5 border-transparent text-black/40' : exp.modifiedByAI ? 'bg-yellow-50/50 border-yellow-400 focus:border-yellow-500 focus:bg-white shadow-[0_0_15px_rgba(250,204,21,0.3)]' : 'bg-black/5 border-transparent focus:bg-white focus:border-[var(--color-accent)]'}`}
                            />
                            {exp.modifiedByAI && !exp.omit && (
                              <div className="absolute -top-3 right-4 flex flex-col items-end z-10">
                                <div className="flex items-center space-x-2 bg-yellow-100 text-yellow-800 text-[10px] px-3 py-1.5 rounded-t-xl shadow-sm border border-yellow-300 border-b-0 group relative cursor-pointer">
                                  <AlertTriangle size={12} className="text-yellow-600" />
                                  <span className="font-bold">AI zmodyfikowało ten tekst</span>
                                  {exp.aiExplanation && (
                                    <div className="absolute top-full right-0 mt-1 w-64 bg-white border border-yellow-200 p-3 rounded-xl shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-20">
                                      <p className="text-xs text-black/70 font-normal leading-relaxed">{exp.aiExplanation}</p>
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center space-x-1 bg-yellow-50 border border-yellow-300 border-t-0 rounded-b-xl px-2 py-1 shadow-sm">
                                  <button
                                    onClick={() => updateExperienceField(idx, 'modifiedByAI', false)}
                                    className="flex items-center space-x-1 px-2 py-1 hover:bg-yellow-200 rounded-lg transition-colors text-yellow-700"
                                    title="Akceptuj zmiany"
                                  >
                                    <ThumbsUp size={12} />
                                    <span className="text-[10px] font-bold">Akceptuj</span>
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                          {exp.omit && (
                            <p className="text-xs text-red-600/80 italic">To doświadczenie zostało pominięte, ponieważ AI uznało je za nieistotne dla tej oferty pracy.</p>
                          )}
                        </Reorder.Item>
                      ))}
                    </Reorder.Group>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] uppercase text-black/40 font-bold tracking-widest">{t('tailoredSkills', appLanguage)}</label>
                    <div className="bg-white border border-black/10 rounded-2xl p-6">
                      <div className="flex flex-wrap gap-3">
                        {tailoredData.tailoredSkills.map((skill: string, idx: number) => (
                          <div key={idx} className="relative group">
                            <input
                              value={skill}
                              onChange={(e) => {
                                const newSkills = [...tailoredData.tailoredSkills];
                                newSkills[idx] = e.target.value;
                                updateTailoredField('tailoredSkills', newSkills);
                              }}
                              className="bg-black/5 px-3 py-1.5 rounded-lg text-xs border border-transparent focus:border-[var(--color-accent)] focus:bg-white outline-none min-w-[80px]"
                            />
                            <button 
                              onClick={() => {
                                const newSkills = tailoredData.tailoredSkills.filter((_: any, i: number) => i !== idx);
                                updateTailoredField('tailoredSkills', newSkills);
                              }}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                            >
                              <X size={10} />
                            </button>
                          </div>
                        ))}
                        <button 
                          onClick={() => updateTailoredField('tailoredSkills', [...tailoredData.tailoredSkills, ''])}
                          className="px-3 py-1.5 rounded-lg text-xs border border-dashed border-black/20 text-black/40 hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-all flex items-center space-x-1"
                        >
                          <Plus size={12} />
                          <span>{t('add', appLanguage)}</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Cover Letter field removed from here, moved to activeTab === 'coverLetter' block */}

                  <div className="space-y-6">
                    <label className="text-[10px] uppercase text-black/40 font-bold tracking-widest">{t('education', appLanguage)}</label>
                    {tailoredData.education?.map((edu: any, idx: number) => (
                      <div key={idx} className="bg-white border border-black/10 rounded-2xl p-6 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-[10px] text-black/40">{t('school', appLanguage)}</label>
                            <input
                              value={edu.school}
                              onChange={(e) => {
                                const newEdu = [...tailoredData.education];
                                newEdu[idx] = { ...newEdu[idx], school: e.target.value };
                                updateTailoredField('education', newEdu);
                              }}
                              className="w-full bg-black/5 border border-transparent rounded-xl px-4 py-2.5 text-sm focus:bg-white focus:border-[var(--color-accent)] outline-none"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] text-black/40">{t('degree', appLanguage)}</label>
                            <input
                              value={edu.degree}
                              onChange={(e) => {
                                const newEdu = [...tailoredData.education];
                                newEdu[idx] = { ...newEdu[idx], degree: e.target.value };
                                updateTailoredField('education', newEdu);
                              }}
                              className="w-full bg-black/5 border border-transparent rounded-xl px-4 py-2.5 text-sm focus:bg-white focus:border-[var(--color-accent)] outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] uppercase text-black/40 font-bold tracking-widest">{t('projects', appLanguage)}</label>
                      <button 
                        onClick={() => updateTailoredField('projects', [...(tailoredData.projects || []), { name: '', description: '', startDate: '', endDate: '' }])}
                        className="text-[10px] text-[var(--color-accent)] font-bold hover:underline"
                      >
                        + {t('add', appLanguage)}
                      </button>
                    </div>
                    {tailoredData.projects?.map((project: any, idx: number) => (
                      <div key={idx} className="bg-white border border-black/10 rounded-2xl p-6 space-y-4 relative group">
                        <button 
                          onClick={() => {
                            const newProjects = tailoredData.projects.filter((_: any, i: number) => i !== idx);
                            updateTailoredField('projects', newProjects);
                          }}
                          className="absolute top-4 right-4 text-black/20 hover:text-red-500 transition-colors"
                        >
                          <X size={14} />
                        </button>
                        <div className="space-y-2">
                          <label className="text-[10px] text-black/40">{t('projectName', appLanguage)}</label>
                          <input
                            value={project.name}
                            onChange={(e) => {
                              const newProjects = [...tailoredData.projects];
                              newProjects[idx] = { ...newProjects[idx], name: e.target.value };
                              updateTailoredField('projects', newProjects);
                            }}
                            className="w-full bg-black/5 border border-transparent rounded-xl px-4 py-2.5 text-sm focus:bg-white focus:border-[var(--color-accent)] outline-none"
                          />
                        </div>
                        <textarea
                          value={project.description}
                          onChange={(e) => {
                            const newProjects = [...tailoredData.projects];
                            newProjects[idx] = { ...newProjects[idx], description: e.target.value };
                            updateTailoredField('projects', newProjects);
                          }}
                          className="w-full bg-black/5 border border-transparent rounded-xl p-4 text-xs leading-relaxed focus:bg-white focus:border-[var(--color-accent)] outline-none min-h-[80px] resize-none"
                        />
                      </div>
                    ))}
                    {(!tailoredData.projects || tailoredData.projects.length === 0) && (
                      <div className="bg-black/5 border border-dashed border-black/10 rounded-2xl p-8 text-center">
                        <p className="text-xs text-black/40">{t('projectsEmpty', appLanguage)}</p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] uppercase text-black/40 font-bold tracking-widest">{t('languages', appLanguage)}</label>
                      <button 
                        onClick={() => updateTailoredField('languages', [...(tailoredData.languages || []), { name: '', level: '' }])}
                        className="text-[10px] text-[var(--color-accent)] font-bold hover:underline"
                      >
                        + {t('add', appLanguage)}
                      </button>
                    </div>
                    <div className="bg-white border border-black/10 rounded-2xl p-6 space-y-4">
                      {tailoredData.languages?.map((lang: any, idx: number) => (
                        <div key={idx} className="flex items-center space-x-2 group">
                          <input
                            value={lang.name}
                            onChange={(e) => {
                              const newLangs = [...tailoredData.languages];
                              newLangs[idx] = { ...newLangs[idx], name: e.target.value };
                              updateTailoredField('languages', newLangs);
                            }}
                            placeholder={t('name', appLanguage)}
                            className="flex-1 bg-black/5 border border-transparent rounded-xl px-4 py-2.5 text-sm focus:bg-white focus:border-[var(--color-accent)] outline-none"
                          />
                          <input
                            value={lang.level}
                            onChange={(e) => {
                              const newLangs = [...tailoredData.languages];
                              newLangs[idx] = { ...newLangs[idx], level: e.target.value };
                              updateTailoredField('languages', newLangs);
                            }}
                            placeholder={t('level', appLanguage)}
                            className="w-24 bg-black/5 border border-transparent rounded-xl px-4 py-2.5 text-sm focus:bg-white focus:border-[var(--color-accent)] outline-none"
                          />
                          <button 
                            onClick={() => {
                              const newLangs = tailoredData.languages.filter((_: any, i: number) => i !== idx);
                              updateTailoredField('languages', newLangs);
                            }}
                            className="text-black/20 hover:text-red-500 transition-colors"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                      {(!tailoredData.languages || tailoredData.languages.length === 0) && (
                        <p className="text-xs text-black/40 text-center py-4">{t('languagesEmpty', appLanguage)}</p>
                      )}
                    </div>
                  </div>
                  </>
                  )}

                  {activeTab === 'coverLetter' && (
                    <div className="space-y-4">
                      <label className="text-[10px] uppercase text-black/40 font-bold tracking-widest">{t('coverLetter', appLanguage)}</label>
                      <textarea
                        value={tailoredData.coverLetter}
                        onChange={(e) => updateTailoredField('coverLetter', e.target.value)}
                        className="w-full bg-white border border-black/10 rounded-2xl p-6 text-sm leading-relaxed focus:border-[var(--color-accent)] outline-none min-h-[400px] resize-none"
                      />
                    </div>
                  )}
                  
                  {/* Mobile Create Another CV Button */}
                  {!initialData && (
                    <div className="lg:hidden pt-4">
                      <button
                        onClick={handleReset}
                        className="w-full py-4 bg-black text-white rounded-2xl font-bold hover:bg-black/80 transition-all flex items-center justify-center gap-2 shadow-lg"
                      >
                        <Plus size={24} />
                        {t('createAnotherCv', appLanguage)}
                      </button>
                    </div>
                  )}
                </div>
                )}
              </div>

              {/* PDF Preview Panel */}
              {activeTab !== 'analysis' && editorMode === 'pdf' && (
                <div className="flex flex-col w-full h-full relative">
                  <div className="pdf-viewer-container flex-1 bg-white border border-black/10 rounded-3xl overflow-hidden shadow-2xl relative">
                    {/* Minimal Action Bar */}
                    <div className="absolute top-4 right-4 z-20 flex items-center space-x-2 bg-white/80 backdrop-blur-md px-2 py-1.5 rounded-xl shadow-sm border border-black/5">
                      <button
                        onClick={() => generateWordDocument(tailoredData, profile, jobInfo, activeTab as 'cv' | 'coverLetter')}
                        className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Download Word (.docx)"
                      >
                        <FileText size={18} />
                      </button>
                      <div className="w-px h-4 bg-black/10"></div>
                      <PDFDownloadLink
                        document={activeTab !== 'coverLetter' ? (selectedTemplate === 'modern' ? <ModernTemplate data={debouncedTailoredData} profile={profile} jobInfo={jobInfo} appLanguage={appLanguage} showPhoto={showPhoto} showSkillLevels={showSkillLevels} /> : <ClassicTemplate data={debouncedTailoredData} profile={profile} jobInfo={jobInfo} appLanguage={appLanguage} showPhoto={showPhoto} showSkillLevels={showSkillLevels} />) : (selectedTemplate === 'modern' ? <ModernCoverLetterTemplate data={debouncedTailoredData} profile={profile} jobInfo={jobInfo} appLanguage={appLanguage} showPhoto={showPhoto} /> : <ClassicCoverLetterTemplate data={debouncedTailoredData} profile={profile} jobInfo={jobInfo} appLanguage={appLanguage} showPhoto={showPhoto} />)}
                        fileName={`${activeTab !== 'coverLetter' ? 'CV' : 'CoverLetter'}_${jobInfo?.basic_info?.company_name || jobInfo?.company}_${profile?.personalInfo?.fullName}.pdf`}
                        className="p-1.5 text-black/60 hover:text-black hover:bg-black/5 rounded-lg transition-colors"
                        title={t('downloadPdf', appLanguage)}
                      >
                        {({ loading }) => loading ? <Loader2 className="animate-spin" size={18} /> : <Download size={18} />}
                      </PDFDownloadLink>
                      <div className="w-px h-4 bg-black/10"></div>
                      <button 
                        className="p-1.5 text-black/60 hover:text-black hover:bg-black/5 rounded-lg transition-colors" 
                        onClick={handleCopyText}
                        title={t('copyText', appLanguage)}
                      >
                        <Edit3 size={18} />
                      </button>
                      <div className="w-px h-4 bg-black/10"></div>
                      <button 
                        className="p-1.5 text-black/60 hover:text-black hover:bg-black/5 rounded-lg transition-colors" 
                        onClick={() => {
                          const elem = document.querySelector('.pdf-viewer-container');
                          if (elem?.requestFullscreen) {
                            elem.requestFullscreen();
                          }
                        }}
                        title={t('fullscreen', appLanguage)}
                      >
                        <Eye size={18} />
                      </button>
                    </div>

                    <CanvasPDFViewer 
                      document={
                        activeTab !== 'coverLetter' ? (
                          selectedTemplate === 'modern' ? 
                            <ModernTemplate data={debouncedTailoredData} profile={profile} jobInfo={jobInfo} appLanguage={appLanguage} showPhoto={showPhoto} showSkillLevels={showSkillLevels} /> :
                            <ClassicTemplate data={debouncedTailoredData} profile={profile} jobInfo={jobInfo} appLanguage={appLanguage} showPhoto={showPhoto} showSkillLevels={showSkillLevels} />
                        ) : (
                          selectedTemplate === 'modern' ?
                            <ModernCoverLetterTemplate data={debouncedTailoredData} profile={profile} jobInfo={jobInfo} appLanguage={appLanguage} showPhoto={showPhoto} /> :
                            <ClassicCoverLetterTemplate data={debouncedTailoredData} profile={profile} jobInfo={jobInfo} appLanguage={appLanguage} showPhoto={showPhoto} />
                        )
                      }
                    />
                  </div>
                  {!initialData && (
                    <div className="pt-4">
                      <button
                        onClick={handleReset}
                        className="w-full py-4 bg-black text-white rounded-2xl font-bold hover:bg-black/80 transition-all flex items-center justify-center gap-2 shadow-lg"
                      >
                        <Plus size={24} />
                        {t('createAnotherCv', appLanguage)}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showInvalidJobModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col p-8 space-y-6"
            >
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto text-red-600">
                <AlertTriangle size={32} />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-2xl font-bold">System napotkał blokadę strony</h3>
                <p className="text-black/60">
                  Portal blokuje automatyczne pobieranie (zabezpieczenia anty-botowe). Proszę, skopiuj treść ogłoszenia i wklej ją poniżej.
                </p>
              </div>
              <div className="flex flex-col space-y-3">
                <button
                  onClick={() => {
                    setShowInvalidJobModal(false);
                    setCvCreatorState({ step: 1, isManual: true });
                  }}
                  className="w-full py-3 bg-[var(--color-accent)] text-white font-bold rounded-xl hover:scale-[1.02] transition-all"
                >
                  Wklej tekst ręcznie
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showNotAJobModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col p-8 space-y-6"
            >
              <div className="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto text-yellow-600">
                <AlertTriangle size={32} />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-2xl font-bold">To nie wygląda na ogłoszenie</h3>
                <p className="text-black/60">
                  Pod tym linkiem nie znaleźliśmy ogłoszenia o pracę. Sprawdź link lub wklej treść ręcznie.
                </p>
              </div>
              <div className="flex flex-col space-y-3">
                <button
                  onClick={() => {
                    setShowNotAJobModal(false);
                    setCvCreatorState({ step: 1, isManual: true });
                  }}
                  className="w-full py-3 bg-[var(--color-accent)] text-white font-bold rounded-xl hover:scale-[1.02] transition-all"
                >
                  Wklej tekst ręcznie
                </button>
                <button
                  onClick={() => {
                    setShowNotAJobModal(false);
                    setCvCreatorState({ step: 1, isManual: false, jobUrl: '' });
                  }}
                  className="w-full py-3 text-black/40 font-bold hover:text-black transition-colors"
                >
                  Spróbuj inny link
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showLowConfidenceModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col p-8 space-y-6"
            >
              <div className="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto text-yellow-600">
                <AlertTriangle size={32} />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-2xl font-bold">Niska pewność analizy</h3>
                <p className="text-black/60">
                  Zauważyliśmy, że na stronie ogłoszenia było dużo dodatkowych informacji (np. inne oferty pracy). AI mogło mieć problem z wyciągnięciem tylko tych właściwych. Przejrzyj poniższe dane. Jeśli widzisz błędy, najlepszym wyjściem będzie ręczne wklejenie tekstu ogłoszenia.
                </p>
              </div>
              <div className="flex flex-col space-y-3">
                <button
                  onClick={() => setShowLowConfidenceModal(false)}
                  className="w-full py-3 bg-[var(--color-accent)] text-white font-bold rounded-xl hover:scale-[1.02] transition-all"
                >
                  Rozumiem, sprawdzę dane
                </button>
                <button
                  onClick={async () => {
                    try {
                      await addDoc(collection(db, 'analysis_errors'), {
                        uid: profile?.uid,
                        jobUrl,
                        jobInfo,
                        createdAt: serverTimestamp()
                      });
                      notify.success('Błąd został zgłoszony. Dziękujemy!');
                      setShowLowConfidenceModal(false);
                    } catch (e) {
                      notify.error('Nie udało się zgłosić błędu.');
                    }
                  }}
                  className="w-full py-3 bg-black/5 text-black/60 font-bold rounded-xl hover:bg-black/10 transition-all"
                >
                  Zgłoś błąd analizy
                </button>
                <button
                  onClick={() => {
                    setShowLowConfidenceModal(false);
                    setCvCreatorState({ step: 1, isManual: true });
                  }}
                  className="w-full py-3 text-black/40 font-bold hover:text-black transition-colors"
                >
                  Wklej tekst ręcznie
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
