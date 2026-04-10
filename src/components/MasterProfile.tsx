import React, { useState, useEffect, useCallback } from 'react';
import { useStore, UserProfile } from '../store/useStore';
import { doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firebase-errors';
import { 
  Plus, Trash2, Sparkles, ChevronDown, ChevronUp, GripVertical, 
  User, Briefcase, GraduationCap, Award, Globe, BookOpen, 
  Linkedin, Github, ExternalLink, AlertCircle, CheckCircle2,
  Zap, Info, MoreVertical, Folder, Star, Lightbulb, Share2,
  Twitter, Instagram, Facebook, Youtube, Mail, Cpu, Rocket,
  List, Loader2, X, AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import debounce from 'lodash.debounce';
import { notify } from '../lib/notifications';
import { GoogleGenAI } from "@google/genai";
import { auditProfile, enhanceText, suggestSkills } from '../lib/gemini';
import { LANGUAGES, SOCIAL_PLATFORMS } from '../constants';
import { t } from '../i18n';

const SectionAudit = ({ section, auditData, appLanguage, onDismiss }: { section: string, auditData: any, appLanguage: string, onDismiss?: (index: number) => void }) => {
  const tips = auditData?.tips?.filter((t: any) => t.section?.toLowerCase() === section.toLowerCase()) || [];
  if (tips.length === 0) return null;

  return (
    <div className="mt-4 space-y-2">
      {tips.map((tip: any, i: number) => {
        const originalIndex = auditData.tips.findIndex((t: any) => t === tip);
        return (
          <motion.div 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            key={i} 
            className={`flex items-start space-x-3 p-3 rounded-xl border relative ${
              tip.type === 'critical' 
                ? 'bg-red-50 border-red-100 text-red-700' 
                : 'bg-blue-50 border-blue-100 text-blue-700'
            }`}
          >
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <p className="text-xs font-medium leading-relaxed pr-6">{tip.message}</p>
            {onDismiss && (
              <button 
                onClick={() => onDismiss(originalIndex)}
                className="absolute right-2 top-2 p-1 hover:bg-black/5 rounded-lg transition-colors"
                title={t('dismiss', appLanguage)}
              >
                <X size={14} />
              </button>
            )}
          </motion.div>
        );
      })}
    </div>
  );
};

const EmptyState = ({ section, icon: Icon, message, appLanguage }: { section: string, icon: any, message: string, appLanguage: string }) => (
  <div className="flex flex-col items-center justify-center py-12 px-4 glass rounded-3xl border-dashed border-2 border-black/5">
    <div className="w-16 h-16 bg-black/5 rounded-2xl flex items-center justify-center text-black/20 mb-4">
      <Icon size={32} />
    </div>
    <h3 className="text-lg font-bold mb-2">{t('noSectionAddedYet', appLanguage, { section: t(section as any, appLanguage) })}</h3>
    <p className="text-black/40 text-sm text-center max-w-xs mb-6">{message}</p>
  </div>
);

const TextAreaWithEnhance = ({ 
  value, 
  onChange, 
  onEnhance, 
  onInsertBullet,
  isEnhancing, 
  placeholder, 
  label,
  appLanguage 
}: { 
  value: string, 
  onChange: (val: string) => void, 
  onEnhance: () => void, 
  onInsertBullet: () => void,
  isEnhancing: boolean, 
  placeholder: string,
  label: string,
  appLanguage: string
}) => {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const adjustHeight = () => {
    const target = textareaRef.current;
    if (target) {
      target.style.height = 'auto';
      target.style.height = Math.max(128, target.scrollHeight) + 'px';
    }
  };

  React.useEffect(() => {
    adjustHeight();
  }, [value]);

  return (
    <div className="space-y-2">
      <label className="text-[10px] uppercase text-black/40 font-bold tracking-widest">{label}</label>
      <div className="relative group">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={isEnhancing}
          className="w-full bg-black/5 border border-black/10 rounded-2xl px-6 py-4 min-h-[128px] focus:ring-2 focus:ring-[var(--color-accent)]/20 focus:border-[var(--color-accent)]/30 outline-none transition-all resize-none overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
          placeholder={placeholder}
        />
        <div className="absolute bottom-4 right-4 flex items-center space-x-2">
          <button 
            type="button"
            onClick={onInsertBullet}
            disabled={isEnhancing}
            className="p-2 bg-black/5 text-black/40 rounded-xl hover:bg-black/10 hover:text-black transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            title="Add Bullet Point"
          >
            <List size={14} />
          </button>
          <button 
            type="button"
            onClick={onEnhance}
            disabled={isEnhancing}
            className="p-2 bg-primary/10 text-primary rounded-xl hover:bg-primary hover:text-white transition-all flex items-center space-x-2 text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isEnhancing ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Sparkles size={14} />
            )}
            <span>{isEnhancing ? t('enhancing', appLanguage) : t('enhance', appLanguage)}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

const EnhanceModal = ({ data, appLanguage }: { data: any, appLanguage: string }) => {
  if (!data || !data.isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-6 border-b border-black/5 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${data.isValid ? 'bg-[var(--color-accent)]/10 text-[var(--color-accent)]' : 'bg-red-500/10 text-red-500'}`}>
              {data.isValid ? <Sparkles size={20} /> : <AlertTriangle size={20} />}
            </div>
            <div>
              <h2 className="text-xl font-bold">
                {data.isValid ? (appLanguage === 'pl' ? 'Ulepszyłem Twój tekst!' : 'Text Enhanced!') : (appLanguage === 'pl' ? 'Nie potrafię tego ulepszyć' : 'Cannot Enhance Text')}
              </h2>
            </div>
          </div>
          <button onClick={data.onCancel} className="p-2 hover:bg-black/5 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {!data.isValid ? (
            <div className="text-black/70 leading-relaxed">
              {appLanguage === 'pl' 
                ? 'Wpisany tekst nie ma sensu lub jest za krótki. Napisz chociaż jedno pełne zdanie o tym, co robiłeś, a ja pomogę Ci to profesjonalnie sformułować.' 
                : 'The provided text does not make sense or is too short. Please write at least one full sentence about what you did, and I will help you formulate it professionally.'}
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-[10px] uppercase text-black/40 font-bold tracking-widest">{appLanguage === 'pl' ? 'Stary tekst' : 'Old Text'}</label>
                <div className="p-4 bg-black/5 rounded-2xl text-black/60 text-sm whitespace-pre-wrap">
                  {data.oldText}
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] uppercase text-[var(--color-accent)] font-bold tracking-widest">{appLanguage === 'pl' ? 'Nowy tekst' : 'New Text'}</label>
                <div className="p-4 bg-[var(--color-accent)]/5 border border-[var(--color-accent)]/20 rounded-2xl text-black text-sm whitespace-pre-wrap">
                  {data.newText}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase text-black/40 font-bold tracking-widest">{appLanguage === 'pl' ? 'Dlaczego?' : 'Reasoning'}</label>
                <div className="p-4 bg-blue-50 text-blue-800 rounded-2xl text-sm italic">
                  {data.reasoning}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="p-6 border-t border-black/5 bg-gray-50/50 flex justify-end space-x-4">
          <button 
            onClick={data.onCancel}
            className="px-6 py-3 rounded-xl font-bold hover:bg-black/5 transition-colors"
          >
            {appLanguage === 'pl' ? (data.isValid ? 'Anuluj' : 'Zamknij') : (data.isValid ? 'Cancel' : 'Close')}
          </button>
          {data.isValid && (
            <button 
              onClick={data.onConfirm}
              className="px-6 py-3 bg-[var(--color-accent)] text-white rounded-xl font-bold hover:scale-105 transition-transform shadow-lg shadow-[var(--color-accent)]/20"
            >
              {appLanguage === 'pl' ? 'Zastąp stary tekst' : 'Replace old text'}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export const MasterProfile: React.FC = () => {
  const { profile, updateProfile, appLanguage, isAuditingProfile, performProfileAudit } = useStore();
  const [activeSection, setActiveSection] = useState('personal');
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [localProfile, setLocalProfile] = useState(profile);
  const [isSaving, setIsSaving] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [suggestedSkills, setSuggestedSkills] = useState<any[]>([]);
  const [wasAuditing, setWasAuditing] = useState(isAuditingProfile);

  useEffect(() => {
    if (isAuditingProfile) {
      setWasAuditing(true);
    } else if (wasAuditing && !isAuditingProfile && profile?.auditData) {
      setIsAuditModalOpen(true);
      setWasAuditing(false);
    }
  }, [isAuditingProfile, wasAuditing, profile?.auditData]);
  const [isSuggestingSkills, setIsSuggestingSkills] = useState(false);
  const [profileStrength, setProfileStrength] = useState(0);
  const [isEnhancing, setIsEnhancing] = useState<string | null>(null);
  const [enhanceModalData, setEnhanceModalData] = useState<{
    isOpen: boolean;
    oldText: string;
    newText: string;
    reasoning: string;
    isValid: boolean;
    onConfirm: () => void;
    onCancel: () => void;
  } | null>(null);

  // Sync local profile when store profile changes (e.g. on initial load)
  useEffect(() => {
    if (profile && !localProfile) {
      setLocalProfile(profile);
    }
  }, [profile]);

  // Profile Strength Calculation
  useEffect(() => {
    if (!profile) return;

    let score = 0;
    const p = profile;
    
    // Personal Info (20%)
    if (p.personalInfo?.fullName) score += 5;
    if (p.personalInfo?.email) score += 5;
    if (p.personalInfo?.phone) score += 5;
    if (p.personalInfo?.location) score += 5;

    // Professional Summary (10%)
    if (p.personalInfo?.bio && p.personalInfo.bio.length > 50) score += 10;
    else if (p.personalInfo?.bio) score += 5;

    // Experience (30%)
    if (p.experience?.length > 0) {
      score += 10;
      if (p.experience.some(e => e.description && e.description.length > 50)) score += 10;
      if (p.experience.length >= 2) score += 10;
    }

    // Education (15%)
    if (p.education?.length > 0) score += 15;

    // Skills (15%)
    if (p.skills?.length >= 3) score += 5;
    if (p.skills?.length >= 5) score += 5;
    if (p.skills?.length >= 10) score += 5;

    // Extras (10%)
    if (p.languages?.length > 0) score += 4;
    if (p.certifications?.length > 0) score += 3;
    if (p.projects?.length > 0) score += 3;

    setProfileStrength(Math.min(100, score));
  }, [profile]);

  const getStrengthColor = (score: number) => {
    if (score < 40) return 'bg-red-500';
    if (score < 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStrengthTextColor = (score: number) => {
    if (score < 40) return 'text-red-500';
    if (score < 70) return 'text-yellow-500';
    return 'text-green-500';
  };

  // Debounced Auto-save
  const debouncedSave = useCallback(
    debounce(async (profileData: UserProfile) => {
      setIsSaving(true);
      const path = `users/${profileData.uid}`;
      try {
        const docRef = doc(db, 'users', profileData.uid);
        const { uid, ...updates } = profileData;
        await updateDoc(docRef, updates);
        updateProfile(updates);
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, path);
        notify.error(t('failedAutoSave', appLanguage));
      } finally {
        setIsSaving(false);
      }
    }, 2000),
    [appLanguage, updateProfile]
  );

  useEffect(() => {
    if (!localProfile || JSON.stringify(localProfile) === JSON.stringify(profile)) return;
    debouncedSave(localProfile);
    return () => debouncedSave.cancel();
  }, [localProfile, profile, debouncedSave]);

  // Profile Auditor Logic
  const runAudit = useCallback(async () => {
    if (!profile?.geminiApiKey || !localProfile) return;
    try {
      await performProfileAudit(profile.geminiApiKey, localProfile);
      notify.success(t('auditCompleted', appLanguage));
    } catch (error) {
      notify.error(t('failedAudit', appLanguage));
    }
  }, [profile?.geminiApiKey, localProfile, performProfileAudit, appLanguage]);

  const dismissTip = (index: number) => {
    if (!localProfile?.auditData) return;
    const newTips = localProfile.auditData.tips.filter((_: any, i: number) => i !== index);
    handleLocalUpdate({ auditData: { ...localProfile.auditData, tips: newTips } });
  };

  const handleSyncGooglePhoto = () => {
    if (auth.currentUser?.photoURL) {
      handleLocalUpdate({ personalInfo: { ...localProfile?.personalInfo, photoURL: auth.currentUser.photoURL } });
      notify.success(t('photoSynced', appLanguage));
    } else {
      notify.error(t('noGooglePhoto', appLanguage));
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        handleLocalUpdate({ personalInfo: { ...localProfile?.personalInfo, photoURL: reader.result as string } });
        notify.success(t('photoUploaded', appLanguage));
      };
      reader.readAsDataURL(file);
    }
  };

  const getSocialIcon = (platformId: string) => {
    switch (platformId) {
      case 'linkedin': return <Linkedin size={18} />;
      case 'github': return <Github size={18} />;
      case 'x': return <Twitter size={18} />;
      case 'instagram': return <Instagram size={18} />;
      case 'facebook': return <Facebook size={18} />;
      case 'youtube': return <Youtube size={18} />;
      case 'mail': return <Mail size={18} />;
      default: return <Globe size={18} />;
    }
  };

  const sections = [
    { id: 'personal', label: t('personalInfo', appLanguage), icon: User },
    { id: 'social', label: t('socialLinks', appLanguage), icon: Globe },
    { id: 'experience', label: t('experience', appLanguage), icon: Briefcase },
    { id: 'education', label: t('education', appLanguage), icon: GraduationCap },
    { id: 'projects', label: t('projects', appLanguage), icon: Folder },
    { id: 'skills', label: t('skills', appLanguage), icon: Zap },
    { id: 'certifications', label: t('certifications', appLanguage), icon: Award },
    { id: 'languages', label: t('languages', appLanguage), icon: Globe },
    { id: 'courses', label: t('courses', appLanguage), icon: BookOpen },
  ];

  const handleLocalUpdate = (updates: any) => {
    setLocalProfile(prev => prev ? { ...prev, ...updates } : null);
  };

  const handleAddItem = (section: keyof UserProfile, defaultItem: any) => {
    const newItem = { id: Date.now().toString(), ...defaultItem };
    handleLocalUpdate({ [section]: [...(localProfile?.[section] as any[] || []), newItem] });
    setExpandedItems(prev => [...prev, newItem.id]);
    
    setTimeout(() => {
      const element = document.getElementById(`item-${newItem.id}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const firstInput = element.querySelector('input, textarea') as HTMLElement;
        if (firstInput) {
          firstInput.focus();
        }
      }
    }, 100);
  };

  const fetchSkillSuggestions = async () => {
    if (!profile?.geminiApiKey || !localProfile) return;
    setIsSuggestingSkills(true);
    try {
      const result = await suggestSkills(profile.geminiApiKey, localProfile);
      setSuggestedSkills(result.suggestions);
    } catch (error) {
      console.error('Skill suggestion error:', error);
      notify.error(t('failedSkillSuggestions', appLanguage));
    } finally {
      setIsSuggestingSkills(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedItems(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleEnhance = async (field: string, index: number | null, currentText: string, section: string) => {
    if (!profile?.geminiApiKey) {
      notify.error(t('geminiKeyMissing', appLanguage));
      return;
    }

    const fieldKey = index !== null ? `${section}-${index}-${field}` : `personal-${field}`;
    setIsEnhancing(fieldKey);

    try {
      const result = await enhanceText(profile.geminiApiKey!, currentText, `Section: ${section}`);
      
      setEnhanceModalData({
        isOpen: true,
        oldText: currentText,
        newText: result.improvedText,
        reasoning: result.reasoning,
        isValid: result.isValid,
        onConfirm: () => {
          if (index !== null) {
            const items = [...(localProfile as any)[section]];
            items[index] = { ...items[index], [field]: result.improvedText };
            handleLocalUpdate({ [section]: items });
          } else {
            handleLocalUpdate({ personalInfo: { ...localProfile?.personalInfo, [field]: result.improvedText } });
          }
          setEnhanceModalData(null);
          notify.success(t('textEnhanced', appLanguage));
        },
        onCancel: () => {
          setEnhanceModalData(null);
        }
      });
    } catch (error) {
      console.error(error);
      notify.error(t('enhancementFailed', appLanguage));
    } finally {
      setIsEnhancing(null);
    }
  };

  const insertBullet = (field: string, index: number | null, section: string) => {
    const bullet = "• ";
    if (index !== null) {
      const items = [...(localProfile as any)[section]];
      const currentText = items[index][field] || "";
      const newText = currentText.endsWith('\n') || currentText === "" ? currentText + bullet : currentText + "\n" + bullet;
      items[index] = { ...items[index], [field]: newText };
      handleLocalUpdate({ [section]: items });
    } else {
      const currentText = (localProfile?.personalInfo as any)[field] || "";
      const newText = currentText.endsWith('\n') || currentText === "" ? currentText + bullet : currentText + "\n" + bullet;
      handleLocalUpdate({ personalInfo: { ...localProfile?.personalInfo, [field]: newText } });
    }
  };

  const autoResize = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const target = e.target as HTMLTextAreaElement;
    target.style.height = 'auto';
    target.style.height = target.scrollHeight + 'px';
  };

  const formatDateRange = (start: string, end: string, isCurrent: boolean) => {
    if (!start) return '';
    const formatDate = (dateStr: string) => {
      if (!dateStr) return '';
      if (dateStr.length === 4) return dateStr; // It's a year
      try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr;
        return date.toLocaleDateString(appLanguage === 'pl' ? 'pl-PL' : 'en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        });
      } catch (e) {
        return dateStr;
      }
    };

    const startFormatted = formatDate(start);
    const endFormatted = isCurrent ? t('present', appLanguage) : formatDate(end);

    return `${startFormatted} — ${endFormatted}`;
  };

  const sortedExperience = [...(localProfile?.experience || [])].sort((a, b) => {
    const dateA = new Date(a.startDate || 0).getTime();
    const dateB = new Date(b.startDate || 0).getTime();
    return dateB - dateA; // Newest first
  });

  const sortedEducation = [...(localProfile?.education || [])].sort((a, b) => {
    const dateA = new Date(a.startDate || 0).getTime();
    const dateB = new Date(b.startDate || 0).getTime();
    return dateB - dateA; // Newest first
  });

  const [newCategoryName, setNewCategoryName] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);

  const defaultCategories = ['hard', 'soft', 'tool'];
  const customCategories = Array.from(new Set(
    localProfile?.skills?.map(s => s.category).filter(c => !defaultCategories.includes(c)) || []
  )) as string[];
  const allCategories: string[] = [...defaultCategories, ...customCategories];

  return (
    <div className="flex gap-12 relative max-w-7xl mx-auto">
      <AnimatePresence>
        {isAuditingProfile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-white/80 backdrop-blur-sm rounded-3xl flex flex-col items-center justify-center"
          >
            <div className="bg-white p-8 rounded-3xl shadow-2xl flex flex-col items-center text-center max-w-md w-full">
              <Loader2 size={48} className="animate-spin text-primary mb-6" />
              <h3 className="text-2xl font-bold mb-2">AI skanuje Twój profil...</h3>
              <p className="text-black/60">
                Szukam luk kompetencyjnych, sprawdzam poprawność dat i oceniam metodykę STAR. To może potrwać kilkanaście sekund.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar Navigation */}
      <aside className="w-64 sticky top-8 h-fit space-y-2">
        <div className="px-4 py-2 mb-6">
          <div className="flex items-center space-x-2 text-[10px] uppercase tracking-[0.2em] font-bold text-black/20">
            <div className={`w-1.5 h-1.5 rounded-full ${isSaving ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`} />
            <span>{isSaving ? t('saving', appLanguage) : t('syncedToCloud', appLanguage)}</span>
          </div>
        </div>
        {sections.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-300 ${
              activeSection === s.id 
                ? 'bg-accent text-white font-bold shadow-lg shadow-accent/20' 
                : 'text-black/40 hover:text-black hover:bg-black/5'
            }`}
          >
            <s.icon size={18} />
            <span className="text-sm">{s.label}</span>
          </button>
        ))}

        {/* Auditor Sidebar */}
        <div className="mt-12 space-y-4">
          <h4 className="px-4 text-[10px] uppercase tracking-widest font-bold text-black/20">{t('profileAuditor', appLanguage)}</h4>
          <div className="glass rounded-2xl p-4 space-y-4">
            {isAuditingProfile ? (
              <div className="flex items-center space-x-2 text-black/40 text-xs animate-pulse">
                <Sparkles size={14} />
                <span>{t('analyzing', appLanguage)}</span>
              </div>
            ) : localProfile?.auditData?.tips?.length > 0 ? (
              localProfile.auditData.tips.map((tip: any, i: number) => (
                <div key={i} className="flex items-start space-x-3 group">
                  {tip.type === 'critical' ? (
                    <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
                  ) : (
                    <Info size={14} className="text-primary shrink-0 mt-0.5" />
                  )}
                  <p className="text-[11px] text-black/60 leading-relaxed group-hover:text-black transition-colors">
                    {tip.message}
                  </p>
                </div>
              ))
            ) : localProfile?.auditData ? (
              <div className="flex items-center space-x-2 text-green-600 text-xs">
                <CheckCircle2 size={14} />
                <span>{t('profileLooksGreat', appLanguage)}</span>
              </div>
            ) : (
              <div className="flex flex-col items-start space-y-2 text-black/60 text-xs">
                <p>{t('looksGood', appLanguage)}</p>
                <button onClick={runAudit} className="text-primary font-bold hover:underline">{t('startAudit', appLanguage)}</button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 pb-32 relative">
        <AnimatePresence>
          {isSaving && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute -top-8 right-0 z-50 flex items-center space-x-2 px-3 py-1.5 bg-white/80 backdrop-blur-md border border-black/5 rounded-full shadow-sm"
            >
              <Loader2 size={12} className="animate-spin text-primary" />
              <span className="text-[9px] uppercase font-bold tracking-[0.1em] text-black/40">{t('saving', appLanguage)}</span>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="glass rounded-2xl p-6 mb-12">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                profileStrength < 40 ? 'bg-red-500/10 text-red-500' :
                profileStrength < 70 ? 'bg-yellow-500/10 text-yellow-500' :
                'bg-green-500/10 text-green-500'
              }`}>
                <Zap size={20} />
              </div>
              <div>
                <h3 className="font-bold text-lg">{t('profileStrength', appLanguage)}</h3>
                <p className="text-black/40 text-sm">
                  {profileStrength < 40 ? t('profileNeedsDetails', appLanguage) : 
                   profileStrength < 70 ? t('goodProgress', appLanguage) : 
                   t('excellentProfile', appLanguage)}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                {localProfile?.auditData && (
                  <button 
                    onClick={() => setIsAuditModalOpen(true)}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-all text-xs font-bold"
                  >
                    <Info size={14} />
                    <span>{t('auditResults', appLanguage)}</span>
                  </button>
                )}
                <button 
                  onClick={runAudit}
                  disabled={isAuditingProfile}
                  className="flex items-center space-x-2 px-4 py-2 bg-primary/10 text-primary rounded-xl hover:bg-primary hover:text-white transition-all text-xs font-bold disabled:opacity-50"
                >
                  <Sparkles size={14} className={isAuditingProfile ? 'animate-spin' : ''} />
                  <span>{isAuditingProfile ? t('analyzing', appLanguage) : t('refreshAudit', appLanguage)}</span>
                </button>
              </div>
              <div className="text-right">
                <span className={`text-3xl font-display ${getStrengthTextColor(profileStrength)}`}>{profileStrength}%</span>
              </div>
            </div>
          </div>
          <div className="h-2 bg-black/5 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${profileStrength}%` }}
              className={`h-full ${getStrengthColor(profileStrength)} transition-colors duration-500`}
            />
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-12"
          >
            {activeSection === 'personal' && (
              <section className="space-y-8">
                <div className="flex items-center justify-between">
                  <h2 className="text-4xl font-display uppercase tracking-tight">{t('personalInfo', appLanguage)}</h2>
                </div>
                <div className="grid grid-cols-2 gap-8">
                  <div className="col-span-2 flex items-center space-x-8 mb-4">
                    <div className="relative group">
                      <div className="w-32 h-32 rounded-3xl overflow-hidden border-2 border-black/10 group-hover:border-primary transition-all shadow-xl">
                        {localProfile?.personalInfo?.photoURL ? (
                          <img 
                            src={localProfile.personalInfo.photoURL} 
                            alt="Profile" 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-full h-full bg-black/5 flex items-center justify-center text-black/20">
                            <User size={48} />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <label className="cursor-pointer p-2 bg-white/20 rounded-full hover:bg-white/40 transition-colors">
                            <Plus size={20} className="text-white" />
                            <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                          </label>
                        </div>
                      </div>
                    </div>
                    <div className="flex-1 space-y-4">
                      <div className="flex items-center space-x-3">
                        <button 
                          onClick={handleSyncGooglePhoto}
                          className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-all text-xs font-bold flex items-center space-x-2"
                        >
                          <Globe size={14} />
                          <span>{t('syncGoogle', appLanguage)}</span>
                        </button>
                        <label className="px-4 py-2 bg-black/5 text-black/60 rounded-xl hover:bg-black/10 transition-all text-xs font-bold flex items-center space-x-2 cursor-pointer">
                          <Share2 size={14} />
                          <span>{t('uploadPhoto', appLanguage)}</span>
                          <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                        </label>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase text-black/40 font-bold tracking-widest">{t('profilePhotoUrl', appLanguage)}</label>
                        <input
                          type="text"
                          placeholder="https://example.com/photo.jpg"
                          value={localProfile?.personalInfo?.photoURL || ''}
                          onChange={(e) => handleLocalUpdate({ personalInfo: { ...localProfile?.personalInfo, photoURL: e.target.value } })}
                          className="w-full bg-black/5 border border-black/10 rounded-2xl px-6 py-3 text-sm focus:border-primary outline-none transition-all"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase text-black/40 font-bold tracking-widest">{t('fullName', appLanguage)}</label>
                    <input
                      type="text"
                      value={localProfile?.personalInfo?.fullName || ''}
                      onChange={(e) => handleLocalUpdate({ personalInfo: { ...localProfile?.personalInfo, fullName: e.target.value } })}
                      className="w-full bg-black/5 border border-black/10 rounded-2xl px-6 py-4 focus:border-primary outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase text-black/40 font-bold tracking-widest">{t('email', appLanguage)}</label>
                    <input
                      type="email"
                      value={localProfile?.personalInfo?.email || ''}
                      onChange={(e) => handleLocalUpdate({ personalInfo: { ...localProfile?.personalInfo, email: e.target.value } })}
                      className="w-full bg-black/5 border border-black/10 rounded-2xl px-6 py-4 focus:border-primary outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase text-black/40 font-bold tracking-widest">{t('phone', appLanguage)}</label>
                    <input
                      type="tel"
                      value={localProfile?.personalInfo?.phone || ''}
                      onChange={(e) => handleLocalUpdate({ personalInfo: { ...localProfile?.personalInfo, phone: e.target.value } })}
                      className="w-full bg-black/5 border border-black/10 rounded-2xl px-6 py-4 focus:border-primary outline-none transition-all"
                      placeholder="+48 123 456 789"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase text-black/40 font-bold tracking-widest">{t('location', appLanguage)}</label>
                    <input
                      type="text"
                      value={localProfile?.personalInfo?.location || ''}
                      onChange={(e) => handleLocalUpdate({ personalInfo: { ...localProfile?.personalInfo, location: e.target.value } })}
                      className="w-full bg-black/5 border border-black/10 rounded-2xl px-6 py-4 focus:border-primary outline-none transition-all"
                      placeholder="City, Country"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase text-black/40 font-bold tracking-widest">{t('birthDate', appLanguage)}</label>
                    <input
                      type="date"
                      value={localProfile?.personalInfo?.birthDate || ''}
                      onChange={(e) => handleLocalUpdate({ personalInfo: { ...localProfile?.personalInfo, birthDate: e.target.value } })}
                      className="w-full bg-black/5 border border-black/10 rounded-2xl px-6 py-4 focus:border-primary outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase text-black/40 font-bold tracking-widest">{t('gender', appLanguage)}</label>
                    <select
                      value={localProfile?.personalInfo?.gender || ''}
                      onChange={(e) => handleLocalUpdate({ personalInfo: { ...localProfile?.personalInfo, gender: e.target.value as any } })}
                      className="w-full bg-black/5 border border-black/10 rounded-2xl px-6 py-4 focus:border-primary outline-none transition-all appearance-none cursor-pointer"
                    >
                      <option value="">{appLanguage === 'pl' ? 'Wybierz...' : 'Select...'}</option>
                      <option value="male">{t('male', appLanguage)}</option>
                      <option value="female">{t('female', appLanguage)}</option>
                      <option value="other">{t('other', appLanguage)}</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase text-black/40 font-bold tracking-widest">{t('jobTitle', appLanguage)}</label>
                    <input
                      type="text"
                      placeholder="e.g. Senior Software Engineer"
                      value={localProfile?.personalInfo?.jobTitle || ''}
                      onChange={(e) => handleLocalUpdate({ personalInfo: { ...localProfile?.personalInfo, jobTitle: e.target.value } })}
                      className="w-full bg-black/5 border border-black/10 rounded-2xl px-6 py-4 focus:border-primary outline-none transition-all"
                    />
                  </div>
                  <div className="col-span-2">
                      <TextAreaWithEnhance
                        label={t('bio', appLanguage) || 'Podsumowanie zawodowe'}
                        value={localProfile?.personalInfo?.bio || ''}
                        onChange={(val) => handleLocalUpdate({ personalInfo: { ...localProfile?.personalInfo, bio: val } })}
                        onEnhance={() => handleEnhance('bio', null, localProfile?.personalInfo?.bio || '', 'personalInfo')}
                        onInsertBullet={() => insertBullet('bio', null, 'personalInfo')}
                        isEnhancing={isEnhancing === 'personal-bio'}
                        placeholder={t('describeSkill', appLanguage)}
                        appLanguage={appLanguage}
                      />
                  </div>
                  <div className="col-span-2">
                      <TextAreaWithEnhance
                        label="Dodatkowe informacje / Wyjaśnienie luk w zatrudnieniu"
                        value={localProfile?.personalInfo?.additionalInfo || ''}
                        onChange={(val) => handleLocalUpdate({ personalInfo: { ...localProfile?.personalInfo, additionalInfo: val } })}
                        onEnhance={() => handleEnhance('additionalInfo', null, localProfile?.personalInfo?.additionalInfo || '', 'personalInfo')}
                        onInsertBullet={() => insertBullet('additionalInfo', null, 'personalInfo')}
                        isEnhancing={isEnhancing === 'personal-additionalInfo'}
                        placeholder="Dodatkowe informacje, kursy, wyjaśnienia luk..."
                        appLanguage={appLanguage}
                      />
                  </div>
                </div>
                <SectionAudit section="personal" auditData={localProfile?.auditData} appLanguage={appLanguage} onDismiss={dismissTip} />
              </section>
            )}

            {activeSection === 'social' && (
              <section className="space-y-8">
                <div className="flex items-center justify-between">
                  <h2 className="text-4xl font-display uppercase tracking-tight">{t('socialLinks', appLanguage)}</h2>
                  <div className="relative group">
                    <button 
                      data-add-btn="Social"
                      className="p-3 bg-accent text-white rounded-2xl hover:scale-110 transition-all shadow-lg shadow-accent/20 flex items-center space-x-2"
                    >
                      <Plus size={24} />
                      <span className="text-xs font-bold uppercase tracking-widest pr-2">{t('addLink', appLanguage)}</span>
                    </button>
                    <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-black/10 rounded-2xl p-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 shadow-2xl">
                      <div className="text-[10px] uppercase text-black/20 font-bold p-2 tracking-widest">{t('selectPlatform', appLanguage)}</div>
                      <div className="max-h-64 overflow-y-auto custom-scrollbar">
                        {SOCIAL_PLATFORMS.map(platform => (
                          <button
                            key={platform.id}
                            onClick={() => {
                              const existing = localProfile?.personalInfo?.socialLinks || [];
                              if (existing.find(l => l.platform === platform.id)) {
                                notify.error(t('platformAlreadyAdded', appLanguage, { platform: platform.name }));
                                return;
                              }
                              handleLocalUpdate({ 
                                personalInfo: { 
                                  ...localProfile?.personalInfo, 
                                  socialLinks: [...existing, { id: Date.now().toString(), platform: platform.id, url: '' }] 
                                } 
                              });
                            }}
                            className="w-full flex items-center space-x-3 px-3 py-2 hover:bg-black/5 rounded-xl transition-colors text-sm"
                          >
                            <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${platform.color}20`, color: platform.color }}>
                              {getSocialIcon(platform.id)}
                            </div>
                            <span>{platform.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {(!localProfile?.personalInfo?.socialLinks || localProfile.personalInfo.socialLinks.length === 0) ? (
                  <EmptyState 
                    section="Social" 
                    icon={Globe} 
                    message={t('socialEmpty', appLanguage)} 
                    appLanguage={appLanguage}
                  />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {localProfile?.personalInfo?.socialLinks?.map((link, idx) => {
                      const platform = SOCIAL_PLATFORMS.find(p => p.id === link.platform);
                      return (
                        <div key={link.id} className="space-y-2 group">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] uppercase text-black/40 font-bold tracking-widest">{platform?.name || t('link', appLanguage)}</label>
                            <button 
                              onClick={() => {
                                const newLinks = localProfile.personalInfo.socialLinks!.filter(l => l.id !== link.id);
                                handleLocalUpdate({ personalInfo: { ...localProfile.personalInfo, socialLinks: newLinks } });
                              }}
                              className="text-black/10 hover:text-red-400 transition-colors"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                          <div className="relative">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center" style={{ color: platform?.color }}>
                              {getSocialIcon(link.platform)}
                            </div>
                            <input
                              type="url"
                              value={link.url}
                              onChange={(e) => {
                                const newLinks = [...(localProfile.personalInfo.socialLinks || [])];
                                newLinks[idx].url = e.target.value;
                                handleLocalUpdate({ personalInfo: { ...localProfile.personalInfo, socialLinks: newLinks } });
                              }}
                              className="w-full bg-black/5 border border-black/10 rounded-2xl pl-12 pr-6 py-4 focus:border-primary outline-none transition-all"
                              placeholder={`https://${link.platform}.com/...`}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                <SectionAudit section="social" auditData={localProfile?.auditData} appLanguage={appLanguage} onDismiss={dismissTip} />
              </section>
            )}

            {activeSection === 'experience' && (
              <section className="space-y-8">
                <div className="flex items-center justify-between">
                  <h2 className="text-4xl font-display uppercase tracking-tight">{t('experience', appLanguage)}</h2>
                  <button 
                    data-add-btn="Experience"
                    onClick={() => handleAddItem('experience', { company: '', position: '', description: '', startDate: '', endDate: '', isCurrent: false, isYearOnly: false })}
                    className="p-3 bg-accent text-white rounded-2xl hover:scale-110 transition-all shadow-lg shadow-accent/20"
                  >
                    <Plus size={24} />
                  </button>
                </div>

                {(!localProfile?.experience || localProfile.experience.length === 0) ? (
                  <EmptyState 
                    section="Experience" 
                    icon={Briefcase} 
                    message={t('experienceEmpty', appLanguage)} 
                    appLanguage={appLanguage}
                  />
                ) : (
                  <div className="relative space-y-12 pl-8">
                  <div className="absolute left-0 top-2 bottom-2 w-px bg-gradient-to-b from-primary via-black/10 to-transparent" />
                  
                  {sortedExperience.map((exp, idx) => (
                    <div key={exp.id} id={`item-${exp.id}`} className="relative">
                      <div className="absolute -left-[37px] top-2 w-4 h-4 rounded-full bg-white border-2 border-primary shadow-lg shadow-primary/20" />
                      <div className="glass rounded-3xl p-8 space-y-6 hover:border-primary/30 transition-all group">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-6">
                            <div className="w-12 h-12 bg-black/5 rounded-2xl flex items-center justify-center text-black/20 group-hover:text-primary transition-colors">
                              <Briefcase size={24} />
                            </div>
                            <div>
                              <div className="flex items-center space-x-3">
                                <h3 className="text-xl font-bold">{exp.company || t('companyName', appLanguage)}</h3>
                                <span className="text-[10px] uppercase font-bold text-black/20 tracking-widest bg-black/5 px-2 py-0.5 rounded-full">
                                  {formatDateRange(exp.startDate, exp.endDate, exp.isCurrent)}
                                </span>
                              </div>
                              <p className="text-primary font-medium">{exp.position || t('jobTitle', appLanguage)}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <button onClick={() => toggleExpand(exp.id)} className="p-2 hover:bg-black/5 rounded-xl transition-colors">
                              {expandedItems.includes(exp.id) ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                            </button>
                            <button 
                              onClick={() => handleLocalUpdate({ experience: localProfile.experience.filter(e => e.id !== exp.id) })}
                              className="p-2 hover:bg-red-500/20 text-black/20 hover:text-red-400 rounded-xl transition-all"
                            >
                              <Trash2 size={20} />
                            </button>
                          </div>
                        </div>

                        <AnimatePresence>
                          {expandedItems.includes(exp.id) && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="space-y-6 overflow-hidden pt-4 border-t border-black/5"
                            >
                              <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                  <label className="text-[10px] uppercase text-black/40 font-bold tracking-widest">{t('company', appLanguage)}</label>
                                  <input
                                    value={exp.company}
                                    onChange={(e) => {
                                      const newExp = [...localProfile.experience];
                                      newExp[idx].company = e.target.value;
                                      handleLocalUpdate({ experience: newExp });
                                    }}
                                    className="w-full bg-black/5 border border-black/10 rounded-xl px-4 py-3 text-sm focus:border-primary outline-none"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-[10px] uppercase text-black/40 font-bold tracking-widest">{t('position', appLanguage)}</label>
                                  <input
                                    value={exp.position}
                                    onChange={(e) => {
                                      const newExp = [...localProfile.experience];
                                      newExp[idx].position = e.target.value;
                                      handleLocalUpdate({ experience: newExp });
                                    }}
                                    className="w-full bg-black/5 border border-black/10 rounded-xl px-4 py-3 text-sm focus:border-primary outline-none"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-[10px] uppercase text-black/40 font-bold tracking-widest">{t('startDate', appLanguage)}</label>
                                  <input
                                    type={exp.isYearOnly ? "number" : "date"}
                                    value={exp.startDate}
                                    onChange={(e) => {
                                      const newExp = [...localProfile.experience];
                                      const itemIdx = newExp.findIndex(item => item.id === exp.id);
                                      newExp[itemIdx].startDate = e.target.value;
                                      handleLocalUpdate({ experience: newExp });
                                    }}
                                    className="w-full bg-black/5 border border-black/10 rounded-xl px-4 py-3 text-sm focus:border-primary outline-none"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-[10px] uppercase text-black/40 font-bold tracking-widest">{t('endDate', appLanguage)}</label>
                                  <input
                                    type={exp.isYearOnly ? "number" : "date"}
                                    value={exp.endDate}
                                    disabled={exp.isCurrent}
                                    onChange={(e) => {
                                      const newExp = [...localProfile.experience];
                                      const itemIdx = newExp.findIndex(item => item.id === exp.id);
                                      newExp[itemIdx].endDate = e.target.value;
                                      handleLocalUpdate({ experience: newExp });
                                    }}
                                    className="w-full bg-black/5 border border-black/10 rounded-xl px-4 py-3 text-sm focus:border-primary outline-none disabled:opacity-30"
                                  />
                                </div>
                                <div className="flex items-center space-x-6 pt-6">
                                  <div className="flex items-center space-x-2">
                                    <input
                                      type="checkbox"
                                      checked={exp.isCurrent}
                                      onChange={(e) => {
                                        const newExp = [...localProfile.experience];
                                        const itemIdx = newExp.findIndex(item => item.id === exp.id);
                                        newExp[itemIdx].isCurrent = e.target.checked;
                                        if (e.target.checked) newExp[itemIdx].endDate = '';
                                        handleLocalUpdate({ experience: newExp });
                                      }}
                                      className="accent-primary"
                                    />
                                    <span className="text-xs text-black/60">{t('isCurrent', appLanguage)}</span>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <input
                                      type="checkbox"
                                      checked={exp.isYearOnly}
                                      onChange={(e) => {
                                        const newExp = [...localProfile.experience];
                                        const itemIdx = newExp.findIndex(item => item.id === exp.id);
                                        newExp[itemIdx].isYearOnly = e.target.checked;
                                        handleLocalUpdate({ experience: newExp });
                                      }}
                                      className="accent-primary"
                                    />
                                    <span className="text-xs text-black/60">{t('yearOnly', appLanguage)}</span>
                                  </div>
                                </div>
                              </div>
                              <TextAreaWithEnhance
                                label={t('description', appLanguage)}
                                value={exp.description}
                                onChange={(val) => {
                                  const newExp = [...localProfile.experience];
                                  const itemIdx = newExp.findIndex(item => item.id === exp.id);
                                  newExp[itemIdx].description = val;
                                  handleLocalUpdate({ experience: newExp });
                                }}
                                onEnhance={() => {
                                  const itemIdx = localProfile.experience.findIndex(item => item.id === exp.id);
                                  handleEnhance('description', itemIdx, exp.description, 'experience');
                                }}
                                onInsertBullet={() => {
                                  const itemIdx = localProfile.experience.findIndex(item => item.id === exp.id);
                                  insertBullet('description', itemIdx, 'experience');
                                }}
                                isEnhancing={isEnhancing === `experience-${localProfile.experience.findIndex(item => item.id === exp.id)}-description`}
                                placeholder={t('describeRole', appLanguage)}
                                appLanguage={appLanguage}
                              />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <SectionAudit section="experience" auditData={localProfile?.auditData} appLanguage={appLanguage} onDismiss={dismissTip} />
            </section>
          )}

          {activeSection === 'education' && (
            <section className="space-y-8">
              <div className="flex items-center justify-between">
                <h2 className="text-4xl font-display uppercase tracking-tight">{t('education', appLanguage)}</h2>
                <button 
                  data-add-btn="Education"
                  onClick={() => handleAddItem('education', { school: '', degree: '', field: '', startDate: '', endDate: '', isYearOnly: true })}
                  className="p-3 bg-accent text-white rounded-2xl hover:scale-110 transition-all shadow-lg shadow-accent/20"
                >
                  <Plus size={24} />
                </button>
              </div>

              {(!localProfile?.education || localProfile.education.length === 0) ? (
                <EmptyState 
                  section="Education" 
                  icon={GraduationCap} 
                  message={t('educationEmpty', appLanguage)} 
                  appLanguage={appLanguage}
                />
              ) : (
                <div className="relative space-y-12 pl-8">
                  <div className="absolute left-0 top-2 bottom-2 w-px bg-gradient-to-b from-primary via-black/10 to-transparent" />
                  
                  {sortedEducation.map((edu, idx) => (
                    <div key={edu.id} id={`item-${edu.id}`} className="relative">
                      <div className="absolute -left-[37px] top-2 w-4 h-4 rounded-full bg-white border-2 border-primary shadow-lg shadow-primary/20" />
                      <div className="glass rounded-3xl p-8 space-y-6 hover:border-primary/30 transition-all group">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-6">
                            <div className="w-12 h-12 bg-black/5 rounded-2xl flex items-center justify-center text-black/20 group-hover:text-primary transition-colors">
                              <GraduationCap size={24} />
                            </div>
                            <div>
                              <div className="flex items-center space-x-3">
                                <h3 className="text-xl font-bold">{edu.school || t('schoolName', appLanguage)}</h3>
                                <span className="text-[10px] uppercase font-bold text-black/20 tracking-widest bg-black/5 px-2 py-0.5 rounded-full">
                                  {formatDateRange(edu.startDate, edu.endDate, false)}
                                </span>
                              </div>
                              <p className="text-primary font-medium">{edu.degree || t('degree', appLanguage)} {t('in', appLanguage)} {edu.field || t('field', appLanguage)}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <button onClick={() => toggleExpand(edu.id)} className="p-2 hover:bg-black/5 rounded-xl transition-colors">
                              {expandedItems.includes(edu.id) ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                            </button>
                            <button 
                              onClick={() => handleLocalUpdate({ education: localProfile.education.filter(e => e.id !== edu.id) })}
                              className="p-2 hover:bg-red-500/20 text-black/20 hover:text-red-400 rounded-xl transition-all"
                            >
                              <Trash2 size={20} />
                            </button>
                          </div>
                        </div>

                        <AnimatePresence>
                          {expandedItems.includes(edu.id) && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="space-y-6 overflow-hidden pt-4 border-t border-black/5"
                            >
                              <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                  <label className="text-[10px] uppercase text-black/40 font-bold tracking-widest">{t('school', appLanguage)}</label>
                                  <input
                                    value={edu.school}
                                    onChange={(e) => {
                                      const newEdu = [...localProfile.education];
                                      newEdu[idx].school = e.target.value;
                                      handleLocalUpdate({ education: newEdu });
                                    }}
                                    className="w-full bg-black/5 border border-black/10 rounded-xl px-4 py-3 text-sm focus:border-primary outline-none"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-[10px] uppercase text-black/40 font-bold tracking-widest">{t('degree', appLanguage)}</label>
                                  <input
                                    value={edu.degree}
                                    onChange={(e) => {
                                      const newEdu = [...localProfile.education];
                                      newEdu[idx].degree = e.target.value;
                                      handleLocalUpdate({ education: newEdu });
                                    }}
                                    className="w-full bg-black/5 border border-black/10 rounded-xl px-4 py-3 text-sm focus:border-primary outline-none"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-[10px] uppercase text-black/40 font-bold tracking-widest">{t('field', appLanguage)}</label>
                                  <input
                                    value={edu.field}
                                    onChange={(e) => {
                                      const newEdu = [...localProfile.education];
                                      newEdu[idx].field = e.target.value;
                                      handleLocalUpdate({ education: newEdu });
                                    }}
                                    className="w-full bg-black/5 border border-black/10 rounded-xl px-4 py-3 text-sm focus:border-primary outline-none"
                                  />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <label className="text-[10px] uppercase text-black/40 font-bold tracking-widest">{t('startDate', appLanguage)}</label>
                                    <input
                                      type={edu.isYearOnly ? "number" : "date"}
                                      min={edu.isYearOnly ? "1900" : undefined}
                                      max={edu.isYearOnly ? new Date().getFullYear() : undefined}
                                      value={edu.startDate}
                                      onChange={(e) => {
                                        const newEdu = [...localProfile.education];
                                        newEdu[idx].startDate = e.target.value;
                                        handleLocalUpdate({ education: newEdu });
                                      }}
                                      className="w-full bg-black/5 border border-black/10 rounded-xl px-4 py-3 text-sm focus:border-primary outline-none"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <label className="text-[10px] uppercase text-black/40 font-bold tracking-widest">{t('endDate', appLanguage)}</label>
                                    <input
                                      type={edu.isYearOnly ? "number" : "date"}
                                      min={edu.isYearOnly ? "1900" : undefined}
                                      max={edu.isYearOnly ? new Date().getFullYear() + 10 : undefined}
                                      value={edu.endDate}
                                      onChange={(e) => {
                                        const newEdu = [...localProfile.education];
                                        newEdu[idx].endDate = e.target.value;
                                        handleLocalUpdate({ education: newEdu });
                                      }}
                                      className="w-full bg-black/5 border border-black/10 rounded-xl px-4 py-3 text-sm focus:border-primary outline-none"
                                    />
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2 pt-2">
                                  <input
                                    type="checkbox"
                                    checked={edu.isYearOnly}
                                    onChange={(e) => {
                                      const newEdu = [...localProfile.education];
                                      newEdu[idx].isYearOnly = e.target.checked;
                                      handleLocalUpdate({ education: newEdu });
                                    }}
                                    className="accent-primary"
                                  />
                                  <span className="text-xs text-black/60">{t('yearOnly', appLanguage)}</span>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <SectionAudit section="education" auditData={localProfile?.auditData} appLanguage={appLanguage} onDismiss={dismissTip} />
            </section>
          )}

            {activeSection === 'skills' && (
              <section className="space-y-12">
                <div className="flex items-center justify-between">
                  <h2 className="text-4xl font-display uppercase tracking-tight">{t('skills', appLanguage)}</h2>
                  <div className="flex items-center space-x-4">
                    <button 
                      onClick={() => setIsAddingCategory(true)}
                      className="flex items-center space-x-2 px-4 py-2 bg-black/5 text-black/60 rounded-xl hover:bg-black/10 transition-all text-xs font-bold"
                    >
                      <Plus size={14} />
                      <span>{t('addCategory', appLanguage)}</span>
                    </button>
                    <button 
                      onClick={fetchSkillSuggestions}
                      disabled={isSuggestingSkills}
                      className="flex items-center space-x-2 px-4 py-2 bg-primary/10 text-primary rounded-xl hover:bg-primary hover:text-white transition-all text-xs font-bold disabled:opacity-50"
                    >
                      <Lightbulb size={14} />
                      <span>{isSuggestingSkills ? t('thinking', appLanguage) : t('suggestSkills', appLanguage)}</span>
                    </button>
                  </div>
                </div>

                {isAddingCategory && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass rounded-2xl p-6 space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs uppercase text-black/40 font-bold tracking-widest">{t('newCategory', appLanguage)}</h3>
                      <button onClick={() => setIsAddingCategory(false)} className="text-black/20 hover:text-black">
                        <Plus size={18} className="rotate-45" />
                      </button>
                    </div>
                    <div className="flex items-center space-x-4">
                      <input 
                        autoFocus
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && newCategoryName.trim()) {
                            handleLocalUpdate({ skills: [...(localProfile?.skills || []), { name: 'New Skill', category: newCategoryName.trim(), level: 'Intermediate', description: '' }] });
                            setNewCategoryName('');
                            setIsAddingCategory(false);
                          }
                        }}
                        placeholder={t('categoryName', appLanguage)}
                        className="flex-1 bg-black/5 border border-black/10 rounded-xl px-4 py-3 outline-none focus:border-primary"
                      />
                      <button 
                        onClick={() => {
                          if (newCategoryName.trim()) {
                            handleLocalUpdate({ skills: [...(localProfile?.skills || []), { name: 'New Skill', category: newCategoryName.trim(), level: 'Intermediate', description: '' }] });
                            setNewCategoryName('');
                            setIsAddingCategory(false);
                          }
                        }}
                        className="px-6 py-3 bg-accent text-white rounded-xl font-bold text-sm"
                      >
                        {t('add', appLanguage)}
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* AI Suggestions */}
                <AnimatePresence>
                    {suggestedSkills.length > 0 && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        className="glass rounded-2xl p-6 space-y-4 overflow-hidden"
                      >
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs uppercase text-primary font-bold tracking-[0.2em]">{t('aiSuggestedSkills', appLanguage)}</h3>
                      <button onClick={() => setSuggestedSkills([])} className="text-black/20 hover:text-black text-[10px] uppercase font-bold">{t('dismiss', appLanguage)}</button>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {suggestedSkills.map((skill, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            handleLocalUpdate({ skills: [...(localProfile?.skills || []), { ...skill, level: 'Intermediate' }] });
                            setSuggestedSkills(prev => prev.filter((_, idx) => idx !== i));
                          }}
                          className="px-3 py-1.5 bg-black/5 border border-black/10 rounded-lg text-xs hover:border-primary hover:bg-primary/10 transition-all flex items-center space-x-2"
                        >
                          <span>{skill.name}</span>
                          <Plus size={12} className="text-primary" />
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              
              {allCategories.map((category) => {
                    const categorySkills = localProfile?.skills?.filter(s => s.category.toLowerCase() === category.toLowerCase()) || [];
                    return (
                      <div key={category} className="space-y-6">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs uppercase text-black/40 font-bold tracking-[0.2em]">
                            {defaultCategories.includes(category) ? t(category as any, appLanguage) : category} {t('skills', appLanguage)}
                          </h3>
                          <button 
                            onClick={() => {
                              handleLocalUpdate({ skills: [...(localProfile?.skills || []), { name: 'New Skill', category, level: 'Intermediate', description: '' }] });
                            }}
                            className="text-xs text-primary hover:underline font-bold"
                          >
                            + {t('addSkill', appLanguage)}
                          </button>
                        </div>
                        
                        {categorySkills.length === 0 ? (
                          <div className="glass rounded-2xl p-8 border-dashed border-2 border-black/5 flex flex-col items-center justify-center space-y-4">
                            <p className="text-black/40 text-sm">{t('noSectionAddedYet', appLanguage, { section: category })}</p>
                            <button 
                              onClick={() => {
                                handleLocalUpdate({ skills: [...(localProfile?.skills || []), { name: 'New Skill', category, level: 'Intermediate', description: '' }] });
                              }}
                              className="px-4 py-2 bg-primary/10 text-primary rounded-xl hover:bg-primary hover:text-white transition-all text-xs font-bold"
                            >
                              + {t('addSkill', appLanguage)}
                            </button>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {categorySkills.map((skill, idx) => {
                              const skillIdx = localProfile.skills.findIndex(s => s === skill);
                              return (
                                <div key={idx} className="glass rounded-2xl p-6 space-y-4 group hover:border-primary/50 transition-all">
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                      <input 
                                        value={skill.name}
                                        onChange={(e) => {
                                          const newSkills = [...localProfile.skills];
                                          newSkills[skillIdx].name = e.target.value;
                                          handleLocalUpdate({ skills: newSkills });
                                        }}
                                        className="bg-transparent font-bold text-lg outline-none border-b border-black/5 focus:border-primary w-full"
                                      />
                                      <div className="flex items-center space-x-4 mt-2">
                                        <select 
                                          value={skill.level}
                                          onChange={(e) => {
                                            const newSkills = [...localProfile.skills];
                                            newSkills[skillIdx].level = e.target.value as any;
                                            handleLocalUpdate({ skills: newSkills });
                                          }}
                                          className="bg-transparent text-[10px] text-primary uppercase font-bold outline-none cursor-pointer"
                                        >
                                          <option value="Beginner">{t('beginner', appLanguage)}</option>
                                          <option value="Intermediate">{t('intermediate', appLanguage)}</option>
                                          <option value="Advanced">{t('advanced', appLanguage)}</option>
                                          <option value="Expert">{t('expert', appLanguage)}</option>
                                        </select>
                                        <div className="flex space-x-1">
                                          {['Beginner', 'Intermediate', 'Advanced', 'Expert'].map((lvl, i) => (
                                            <div 
                                              key={lvl} 
                                              className={`w-1.5 h-1.5 rounded-full ${
                                                ['Beginner', 'Intermediate', 'Advanced', 'Expert'].indexOf(skill.level) >= i 
                                                  ? 'bg-primary' 
                                                  : 'bg-black/10'
                                              }`} 
                                            />
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                    <button 
                                      onClick={() => handleLocalUpdate({ skills: localProfile.skills.filter((_, i) => i !== skillIdx) })}
                                      className="text-black/10 group-hover:text-red-400 transition-colors p-2"
                                    >
                                      <Trash2 size={18} />
                                    </button>
                                  </div>
                                  <TextAreaWithEnhance
                                    label={t('description', appLanguage)}
                                    value={skill.description || ''}
                                    onChange={(val) => {
                                      const newSkills = [...localProfile.skills];
                                      newSkills[skillIdx].description = val;
                                      handleLocalUpdate({ skills: newSkills });
                                    }}
                                    onEnhance={() => handleEnhance('description', skillIdx, skill.description || '', 'skills')}
                                    onInsertBullet={() => insertBullet('description', skillIdx, 'skills')}
                                    isEnhancing={isEnhancing === `skills-${skillIdx}-description`}
                                    placeholder={t('describeSkill', appLanguage)}
                                    appLanguage={appLanguage}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
            <SectionAudit section="skills" auditData={localProfile?.auditData} appLanguage={appLanguage} onDismiss={dismissTip} />
          </section>
        )}

            {activeSection === 'certifications' && (
              <section className="space-y-8">
                <div className="flex items-center justify-between">
                  <h2 className="text-4xl font-display uppercase tracking-tight">{t('certifications', appLanguage)}</h2>
                  <button 
                    data-add-btn="Certifications"
                    onClick={() => handleAddItem('certifications', { name: '', issuer: '', year: new Date().getFullYear().toString(), description: '', url: '' })}
                    className="p-3 bg-accent text-white rounded-2xl hover:scale-110 transition-all shadow-lg shadow-accent/20"
                  >
                    <Plus size={24} />
                  </button>
                </div>

                {(!localProfile?.certifications || localProfile.certifications.length === 0) ? (
                  <EmptyState 
                    section="Certifications" 
                    icon={Award} 
                    message={t('certificationsEmpty', appLanguage)} 
                    appLanguage={appLanguage}
                  />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {localProfile?.certifications?.map((cert, idx) => (
                    <div key={cert.id} id={`item-${cert.id}`} className="glass rounded-3xl p-6 space-y-4 group hover:border-primary/30 transition-all">
                      <div className="flex items-center justify-between">
                        <Award className="text-primary" size={24} />
                        <button 
                          onClick={() => handleLocalUpdate({ certifications: localProfile.certifications.filter(c => c.id !== cert.id) })}
                          className="text-black/10 group-hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                      <div className="space-y-4">
                        <input
                          placeholder={t('certName', appLanguage)}
                          value={cert.name}
                          onChange={(e) => {
                            const newCerts = [...localProfile.certifications];
                            newCerts[idx].name = e.target.value;
                            handleLocalUpdate({ certifications: newCerts });
                          }}
                          className="w-full bg-transparent font-bold text-lg outline-none border-b border-black/5 focus:border-primary pb-1"
                        />
                        <input
                          placeholder={t('issuer', appLanguage)}
                          value={cert.issuer}
                          onChange={(e) => {
                            const newCerts = [...localProfile.certifications];
                            newCerts[idx].issuer = e.target.value;
                            handleLocalUpdate({ certifications: newCerts });
                          }}
                          className="w-full bg-transparent text-black/60 outline-none text-sm"
                        />
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[9px] uppercase text-black/20 font-bold">{appLanguage === 'pl' ? 'Rok' : 'Year'} (YYYY)</label>
                            <input
                              type="number"
                              min="1950"
                              max="2030"
                              placeholder="YYYY"
                              value={cert.year || ''}
                              onChange={(e) => {
                                const newCerts = [...localProfile.certifications];
                                newCerts[idx].year = e.target.value;
                                handleLocalUpdate({ certifications: newCerts });
                              }}
                              className="w-full bg-black/5 border border-black/10 rounded-lg px-2 py-1 text-xs outline-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] uppercase text-black/20 font-bold">URL</label>
                            <input
                              type="url"
                              placeholder="https://..."
                              value={cert.url || ''}
                              onChange={(e) => {
                                const newCerts = [...localProfile.certifications];
                                newCerts[idx].url = e.target.value;
                                handleLocalUpdate({ certifications: newCerts });
                              }}
                              className="w-full bg-black/5 border border-black/10 rounded-lg px-2 py-1 text-xs outline-none"
                            />
                          </div>
                        </div>
                        <TextAreaWithEnhance
                          label={t('description', appLanguage)}
                          value={cert.description || ''}
                          onChange={(val) => {
                            const newCerts = [...localProfile.certifications];
                            newCerts[idx].description = val;
                            handleLocalUpdate({ certifications: newCerts });
                          }}
                          onEnhance={() => handleEnhance('description', idx, cert.description || '', 'certifications')}
                          onInsertBullet={() => insertBullet('description', idx, 'certifications')}
                          isEnhancing={isEnhancing === `certifications-${idx}-description`}
                          placeholder={t('description', appLanguage)}
                          appLanguage={appLanguage}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <SectionAudit section="certifications" auditData={localProfile?.auditData} appLanguage={appLanguage} onDismiss={dismissTip} />
            </section>
          )}

            {activeSection === 'languages' && (
              <section className="space-y-8">
                <div className="flex items-center justify-between">
                  <h2 className="text-4xl font-display uppercase tracking-tight">{t('languages', appLanguage)}</h2>
                  <div className="relative group">
                    <button 
                      data-add-btn="Languages"
                      className="p-3 bg-accent text-white rounded-2xl hover:scale-110 transition-all shadow-lg shadow-accent/20 flex items-center space-x-2"
                    >
                      <Plus size={24} />
                      <span className="text-xs font-bold uppercase tracking-widest pr-2">{t('addLanguage', appLanguage)}</span>
                    </button>
                    <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-black/10 rounded-2xl p-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 shadow-2xl">
                      <div className="text-[10px] uppercase text-black/20 font-bold p-2 tracking-widest">{t('selectLanguage', appLanguage)}</div>
                      <div className="max-h-64 overflow-y-auto custom-scrollbar">
                        {LANGUAGES.map(lang => (
                          <button
                            key={lang.code}
                            onClick={() => {
                              const existing = localProfile?.languages || [];
                              if (existing.find(l => l.name === lang.name)) {
                                notify.error(t('languageAlreadyAdded', appLanguage, { language: lang.name }));
                                return;
                              }
                              handleLocalUpdate({ 
                                languages: [...existing, { id: Date.now().toString(), name: lang.name, code: lang.code, flag: lang.flag, level: 'B2' }] 
                              });
                            }}
                            className="w-full flex items-center space-x-3 px-3 py-2 hover:bg-black/5 rounded-xl transition-colors text-sm text-black"
                          >
                            <span className="text-lg">{lang.flag}</span>
                            <span>{lang.name}</span>
                          </button>
                        ))}
                        <div className="h-px bg-black/5 my-2" />
                        <button
                          onClick={() => {
                            const name = 'New Language';
                            handleLocalUpdate({ 
                              languages: [...(localProfile?.languages || []), { id: Date.now().toString(), name, level: 'B2' }] 
                            });
                          }}
                          className="w-full flex items-center space-x-3 px-3 py-2 hover:bg-black/5 rounded-xl transition-colors text-sm text-primary"
                        >
                          <Plus size={14} />
                          <span>{t('addCustom', appLanguage)}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {(!localProfile?.languages || localProfile.languages.length === 0) ? (
                  <EmptyState 
                    section="Languages" 
                    icon={Globe} 
                    message={t('languagesEmpty', appLanguage)} 
                    appLanguage={appLanguage}
                  />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {localProfile?.languages?.map((lang, idx) => (
                    <div key={lang.id} className="glass rounded-2xl p-6 flex items-center justify-between group hover:border-primary/30 transition-all">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-black/5 rounded-xl flex items-center justify-center text-2xl">
                          {lang.flag || <Globe size={24} className="text-primary" />}
                        </div>
                        <div>
                          <h3 className="font-bold">{lang.name}</h3>
                          <select
                            value={lang.level}
                            onChange={(e) => {
                              const newLangs = [...localProfile.languages];
                              newLangs[idx].level = e.target.value as any;
                              handleLocalUpdate({ languages: newLangs });
                            }}
                            className="bg-transparent text-black/40 text-xs outline-none block mt-1 cursor-pointer hover:text-primary transition-colors"
                          >
                            {['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'Native'].map(l => (
                              <option key={l} value={l}>{l}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleLocalUpdate({ languages: localProfile.languages.filter(l => l.id !== lang.id) })}
                        className="text-black/10 group-hover:text-red-400 transition-colors p-2"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <SectionAudit section="languages" auditData={localProfile?.auditData} appLanguage={appLanguage} onDismiss={dismissTip} />
            </section>
          )}
            {activeSection === 'courses' && (
              <section className="space-y-8">
                <div className="flex items-center justify-between">
                  <h2 className="text-4xl font-display uppercase tracking-tight">{t('courses', appLanguage)}</h2>
                  <button 
                    data-add-btn="Courses"
                    onClick={() => handleAddItem('courses', { title: '', provider: '', year: new Date().getFullYear().toString(), description: '', url: '', skills: [] })}
                    className="p-3 bg-accent text-white rounded-2xl hover:scale-110 transition-all shadow-lg shadow-accent/20"
                  >
                    <Plus size={24} />
                  </button>
                </div>

                {(!localProfile?.courses || localProfile.courses.length === 0) ? (
                  <EmptyState 
                    section="Courses" 
                    icon={BookOpen} 
                    message={t('coursesEmpty', appLanguage)} 
                    appLanguage={appLanguage}
                  />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {localProfile?.courses?.map((course, idx) => (
                    <div key={course.id} id={`item-${course.id}`} className="glass rounded-3xl p-6 space-y-4 group hover:border-primary/30 transition-all">
                      <div className="flex items-center justify-between">
                        <BookOpen className="text-primary" size={24} />
                        <button 
                          onClick={() => handleLocalUpdate({ courses: localProfile.courses.filter(c => c.id !== course.id) })}
                          className="text-black/10 group-hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                      <div className="space-y-4">
                        <input
                          placeholder={t('courseTitle', appLanguage)}
                          value={course.title}
                          onChange={(e) => {
                            const newCourses = [...localProfile.courses];
                            newCourses[idx].title = e.target.value;
                            handleLocalUpdate({ courses: newCourses });
                          }}
                          className="w-full bg-transparent font-bold text-lg outline-none border-b border-black/5 focus:border-primary pb-1"
                        />
                        <input
                          placeholder={t('provider', appLanguage)}
                          value={course.provider}
                          onChange={(e) => {
                            const newCourses = [...localProfile.courses];
                            newCourses[idx].provider = e.target.value;
                            handleLocalUpdate({ courses: newCourses });
                          }}
                          className="w-full bg-transparent text-black/60 outline-none text-sm"
                        />
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[9px] uppercase text-black/20 font-bold">{appLanguage === 'pl' ? 'Rok' : 'Year'} (YYYY)</label>
                            <input
                              type="number"
                              min="1950"
                              max="2030"
                              placeholder="YYYY"
                              value={course.year || ''}
                              onChange={(e) => {
                                const newCourses = [...localProfile.courses];
                                newCourses[idx].year = e.target.value;
                                handleLocalUpdate({ courses: newCourses });
                              }}
                              className="w-full bg-black/5 border border-black/10 rounded-lg px-2 py-1 text-xs outline-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] uppercase text-black/20 font-bold">URL</label>
                            <input
                              type="url"
                              placeholder="https://..."
                              value={course.url || ''}
                              onChange={(e) => {
                                const newCourses = [...localProfile.courses];
                                newCourses[idx].url = e.target.value;
                                handleLocalUpdate({ courses: newCourses });
                              }}
                              className="w-full bg-black/5 border border-black/10 rounded-lg px-2 py-1 text-xs outline-none"
                            />
                          </div>
                        </div>
                        <TextAreaWithEnhance
                          label={t('description', appLanguage)}
                          value={course.description || ''}
                          onChange={(val) => {
                            const newCourses = [...localProfile.courses];
                            newCourses[idx].description = val;
                            handleLocalUpdate({ courses: newCourses });
                          }}
                          onEnhance={() => handleEnhance('description', idx, course.description || '', 'courses')}
                          onInsertBullet={() => insertBullet('description', idx, 'courses')}
                          isEnhancing={isEnhancing === `courses-${idx}-description`}
                          placeholder={t('description', appLanguage)}
                          appLanguage={appLanguage}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <SectionAudit section="courses" auditData={localProfile?.auditData} appLanguage={appLanguage} onDismiss={dismissTip} />
            </section>
          )}

            {activeSection === 'projects' && (
              <section className="space-y-8">
                <div className="flex items-center justify-between">
                  <h2 className="text-4xl font-display uppercase tracking-tight">{t('projects', appLanguage)}</h2>
                  <button 
                    data-add-btn="Projects"
                    onClick={() => handleAddItem('projects', { name: '', description: '', link: '', year: new Date().getFullYear().toString() })}
                    className="p-3 bg-accent text-white rounded-2xl hover:scale-110 transition-all shadow-lg shadow-accent/20"
                  >
                    <Plus size={24} />
                  </button>
                </div>

                {(!localProfile?.projects || localProfile.projects.length === 0) ? (
                  <EmptyState 
                    section="Projects" 
                    icon={Rocket} 
                    message={t('projectsEmpty', appLanguage)} 
                    appLanguage={appLanguage}
                  />
                ) : (
                  <div className="grid grid-cols-1 gap-8">
                  {localProfile?.projects?.map((project, idx) => (
                    <div key={project.id} id={`item-${project.id}`} className="glass rounded-3xl p-8 space-y-6 group hover:border-primary/30 transition-all">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-black/5 rounded-2xl flex items-center justify-center text-primary">
                            <Folder size={24} />
                          </div>
                          <div className="flex-1">
                            <input
                              placeholder={t('projectName', appLanguage)}
                              value={project.name}
                              onChange={(e) => {
                                const newProjects = [...localProfile.projects];
                                newProjects[idx].name = e.target.value;
                                handleLocalUpdate({ projects: newProjects });
                              }}
                              className="bg-transparent font-bold text-xl outline-none border-b border-black/5 focus:border-primary w-full"
                            />
                          </div>
                        </div>
                        <button 
                          onClick={() => handleLocalUpdate({ projects: localProfile.projects.filter(p => p.id !== project.id) })}
                          className="p-2 hover:bg-red-500/20 text-black/20 hover:text-red-400 rounded-xl transition-all"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] uppercase text-black/40 font-bold tracking-widest">{t('projectLink', appLanguage)}</label>
                          <input
                            type="url"
                            placeholder="https://github.com/..."
                            value={project.link || ''}
                            onChange={(e) => {
                              const newProjects = [...localProfile.projects];
                              newProjects[idx].link = e.target.value;
                              handleLocalUpdate({ projects: newProjects });
                            }}
                            className="w-full bg-black/5 border border-black/10 rounded-xl px-4 py-3 text-sm focus:border-[var(--color-accent)] outline-none"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] uppercase text-black/40 font-bold tracking-widest">{appLanguage === 'pl' ? 'Rok' : 'Year'}</label>
                          <input
                            type="number"
                            min="1950"
                            max="2030"
                            placeholder="YYYY"
                            value={project.year || ''}
                            onChange={(e) => {
                              const newProjects = [...localProfile.projects];
                              newProjects[idx].year = e.target.value;
                              handleLocalUpdate({ projects: newProjects });
                            }}
                            className="w-full bg-black/5 border border-black/10 rounded-xl px-4 py-3 text-sm focus:border-[var(--color-accent)] outline-none"
                          />
                        </div>
                      </div>

                      <TextAreaWithEnhance
                        label={t('description', appLanguage)}
                        value={project.description}
                        onChange={(val) => {
                          const newProjects = [...localProfile.projects];
                          newProjects[idx].description = val;
                          handleLocalUpdate({ projects: newProjects });
                        }}
                        onEnhance={() => handleEnhance('description', idx, project.description, 'projects')}
                        onInsertBullet={() => insertBullet('description', idx, 'projects')}
                        isEnhancing={isEnhancing === `projects-${idx}-description`}
                        placeholder={t('describeProject', appLanguage)}
                        appLanguage={appLanguage}
                      />
                    </div>
                  ))}
                </div>
              )}
              <SectionAudit section="projects" auditData={localProfile?.auditData} appLanguage={appLanguage} onDismiss={dismissTip} />
            </section>
          )}
          </motion.div>
        </AnimatePresence>

        <AnimatePresence>
          {isAuditModalOpen && localProfile?.auditData && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
              onClick={() => setIsAuditModalOpen(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
              >
                <div className="p-6 border-b border-black/5 flex items-center justify-between bg-black/5">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center">
                      <Sparkles size={24} />
                    </div>
                    <div>
                      <h2 className="text-2xl font-display font-bold">{t('auditResults', appLanguage)}</h2>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-sm text-black/60">{t('score', appLanguage)}:</span>
                        <span className={`font-bold ${getStrengthTextColor(localProfile.auditData.score)}`}>
                          {localProfile.auditData.score}/100
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsAuditModalOpen(false)}
                    className="p-2 hover:bg-black/5 rounded-xl transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                  {/* Critical Issues */}
                  {localProfile.auditData.tips.filter((t: any) => t.type === 'critical').length > 0 && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-bold flex items-center space-x-2 text-red-600">
                        <AlertCircle size={20} />
                        <span>{t('criticalIssues', appLanguage)}</span>
                      </h3>
                      <div className="grid gap-3">
                        {localProfile.auditData.tips.filter((t: any) => t.type === 'critical').map((tip: any, i: number) => (
                          <div key={i} className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-start space-x-4">
                            <div className="w-8 h-8 bg-red-100 text-red-600 rounded-xl flex items-center justify-center shrink-0 mt-1">
                              <AlertCircle size={16} />
                            </div>
                            <div>
                              <div className="text-xs font-bold text-red-800 uppercase tracking-wider mb-1">{t(tip.section as any, appLanguage) || tip.section}</div>
                              <p className="text-red-900 text-sm leading-relaxed">{tip.message}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Suggestions */}
                  {localProfile.auditData.tips.filter((t: any) => t.type !== 'critical').length > 0 && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-bold flex items-center space-x-2 text-blue-600">
                        <Lightbulb size={20} />
                        <span>{t('suggestions', appLanguage)}</span>
                      </h3>
                      <div className="grid gap-3">
                        {localProfile.auditData.tips.filter((t: any) => t.type !== 'critical').map((tip: any, i: number) => (
                          <div key={i} className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-start space-x-4">
                            <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center shrink-0 mt-1">
                              <Lightbulb size={16} />
                            </div>
                            <div>
                              <div className="text-xs font-bold text-blue-800 uppercase tracking-wider mb-1">{t(tip.section as any, appLanguage) || tip.section}</div>
                              <p className="text-blue-900 text-sm leading-relaxed">{tip.message}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="p-6 border-t border-black/5 bg-black/5 flex justify-end">
                  <button
                    onClick={() => setIsAuditModalOpen(false)}
                    className="px-6 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-colors"
                  >
                    {t('fixNow', appLanguage)}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        
        <EnhanceModal data={enhanceModalData} appLanguage={appLanguage} />
      </div>
    </div>
  );
};
