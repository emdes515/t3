import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { auditProfile } from '../lib/gemini';

export interface UserProfile {
  uid: string;
  personalInfo: {
    fullName: string;
    email: string;
    phone?: string;
    location?: string;
    birthDate?: string;
    photoURL?: string;
    bio?: string;
    gender?: 'male' | 'female' | 'other';
    additionalInfo?: string;
    linkedin?: string;
    github?: string;
    portfolio?: string;
    socialLinks?: {
      id: string;
      platform: string;
      url: string;
    }[];
  };
  experience: {
    id: string;
    company: string;
    position: string;
    startDate: string;
    endDate: string;
    description: string;
    isCurrent: boolean;
    isYearOnly?: boolean;
  }[];
  education: {
    id: string;
    school: string;
    degree: string;
    field: string;
    startDate: string;
    endDate: string;
    isYearOnly?: boolean;
  }[];
  skills: {
    name: string;
    category: string;
    level: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
    description?: string;
  }[];
  certifications: {
    id: string;
    name: string;
    issuer: string;
    year: string;
    description?: string;
    url?: string;
  }[];
  languages: {
    id: string;
    name: string;
    code?: string;
    flag?: string;
    level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2' | 'Native';
  }[];
  courses: {
    id: string;
    title: string;
    provider: string;
    year: string;
    skills: string[];
    description?: string;
    url?: string;
  }[];
  projects: {
    id: string;
    name: string;
    description: string;
    year: string;
    link?: string;
  }[];
  geminiApiKey?: string;
  auditData?: {
    score: number;
    tips: {
      section: string;
      message: string;
      type: 'critical' | 'warning' | 'tip';
    }[];
    lastAuditDate: string;
  };
}

export interface CvCreatorState {
  step: number;
  jobUrl: string;
  manualJobText: string;
  isManual: boolean;
  jobInfo: any;
  tailoredData: any;
  matchAnalysis?: any;
  targetLanguage: string;
  activeTab: 'analysis' | 'cv' | 'coverLetter';
  selectedTemplate: 'modern' | 'classic';
  isAnalyzing?: boolean;
  isTailoring?: boolean;
  showConfidenceModal?: boolean;
  error?: string;
  applicationId?: string;
}

interface AppState {
  profile: UserProfile | null;
  appLanguage: string;
  cvCreatorState: CvCreatorState | null;
  isAuditingProfile: boolean;
  setProfile: (profile: UserProfile) => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
  setAppLanguage: (lang: string) => void;
  setCvCreatorState: (state: Partial<CvCreatorState> | null) => void;
  resetCvCreator: () => void;
  setIsAuditingProfile: (isAuditing: boolean) => void;
  performProfileAudit: (apiKey: string, profile: UserProfile) => Promise<void>;
}

const getBrowserLanguage = () => {
  if (typeof navigator === 'undefined') return 'en';
  const lang = navigator.language.split('-')[0];
  return ['en', 'pl'].includes(lang) ? lang : 'en';
};

const defaultCvCreatorState: CvCreatorState = {
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
  isTailoring: false,
};

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      profile: null,
      appLanguage: getBrowserLanguage(),
      cvCreatorState: defaultCvCreatorState,
      isAuditingProfile: false,
      setProfile: (profile) => set({ profile }),
      updateProfile: (updates) => set((state) => ({
        profile: state.profile ? { ...state.profile, ...updates } : null
      })),
      setAppLanguage: (lang) => set({ appLanguage: lang }),
      setCvCreatorState: (state) => set((prev) => ({
        cvCreatorState: state === null ? defaultCvCreatorState : { ...prev.cvCreatorState, ...state } as CvCreatorState
      })),
      resetCvCreator: () => set({ cvCreatorState: defaultCvCreatorState }),
      setIsAuditingProfile: (isAuditing) => set({ isAuditingProfile: isAuditing }),
      performProfileAudit: async (apiKey: string, profile: UserProfile) => {
        set({ isAuditingProfile: true });
        try {
          const result = await auditProfile(apiKey, profile);
          set((state) => ({
            profile: state.profile ? { ...state.profile, auditData: result } : null,
            isAuditingProfile: false
          }));
        } catch (error) {
          console.error('Audit error:', error);
          set({ isAuditingProfile: false });
          throw error;
        }
      },
    }),
    {
      name: 'tailor-cv-storage',
      partialize: (state) => ({
        ...state,
        isAuditingProfile: false,
        cvCreatorState: state.cvCreatorState ? {
          ...state.cvCreatorState,
          isAnalyzing: false,
          isTailoring: false
        } : null
      }),
    }
  )
);
