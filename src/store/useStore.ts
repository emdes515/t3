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
    jobTitle?: string;
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

export interface RadarJob {
  id: string;
  url: string;
  title: string;
  company: string;
  location?: string;
  matchScore?: number;
  aiSummary?: string;
  matchedSkills?: string[];
  missingSkills?: string[];
  jobInfo?: any;
  isAnalyzed: boolean;
  foundAt: string;
  status: 'new' | 'saved' | 'applied' | 'dismissed';
}

export interface RadarState {
  isScanning: boolean;
  scanProgress: { current: number; total: number; message: string };
  jobs: RadarJob[];
  lastScanDate: string | null;
  minMatchScore: number;
  searchSettings: {
    jobTitle: string;
    location: string;
    workModel: string;
  };
}

interface AppState {
  profile: UserProfile | null;
  appLanguage: string;
  cvCreatorState: CvCreatorState | null;
  radarState: RadarState;
  isAuditingProfile: boolean;
  setProfile: (profile: UserProfile) => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
  setAppLanguage: (lang: string) => void;
  setCvCreatorState: (state: Partial<CvCreatorState> | null) => void;
  resetCvCreator: () => void;
  setIsAuditingProfile: (isAuditing: boolean) => void;
  performProfileAudit: (apiKey: string, profile: UserProfile) => Promise<any>;
  setRadarState: (state: Partial<RadarState>) => void;
  addRadarJob: (job: RadarJob) => void;
  updateRadarJob: (jobId: string, updates: Partial<RadarJob>) => void;
  updateRadarJobStatus: (jobId: string, status: RadarJob['status']) => void;
  dismissRadarJob: (jobId: string) => void;
  clearRadarJobs: () => void;
}

const getBrowserLanguage = () => {
  if (typeof navigator === 'undefined') return 'en';
  const lang = navigator.language.split('-')[0];
  return ['en', 'pl'].includes(lang) ? lang : 'en';
};

export const createInitialProfile = (user: any): UserProfile => ({
  uid: user.uid,
  personalInfo: {
    fullName: user.displayName || '',
    email: user.email || '',
    photoURL: user.photoURL || '',
    socialLinks: [],
  },
  experience: [],
  education: [],
  skills: [],
  certifications: [],
  languages: [],
  courses: [],
  projects: [],
});

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

const defaultRadarState: RadarState = {
  isScanning: false,
  scanProgress: { current: 0, total: 0, message: '' },
  jobs: [],
  lastScanDate: null,
  minMatchScore: 70,
  searchSettings: {
    jobTitle: '',
    location: '',
    workModel: 'any'
  }
};

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      profile: null,
      appLanguage: getBrowserLanguage(),
      cvCreatorState: defaultCvCreatorState,
      radarState: defaultRadarState,
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
          set({ isAuditingProfile: false });
          return result;
        } catch (error) {
          console.error('Audit error:', error);
          set({ isAuditingProfile: false });
          throw error;
        }
      },
      setRadarState: (updates) => set((state) => ({
        radarState: { ...state.radarState, ...updates }
      })),
      addRadarJob: (job) => set((state) => ({
        radarState: {
          ...state.radarState,
          jobs: [job, ...state.radarState.jobs.filter(j => j.url !== job.url)]
        }
      })),
      updateRadarJob: (jobId, updates) => set((state) => ({
        radarState: {
          ...state.radarState,
          jobs: state.radarState.jobs.map(j => 
            j.id === jobId ? { ...j, ...updates } : j
          )
        }
      })),
      updateRadarJobStatus: (jobId, status) => set((state) => ({
        radarState: {
          ...state.radarState,
          jobs: state.radarState.jobs.map(j => j.id === jobId ? { ...j, status } : j)
        }
      })),
      dismissRadarJob: (jobId) => set((state) => ({
        radarState: {
          ...state.radarState,
          jobs: state.radarState.jobs.map(j => j.id === jobId ? { ...j, status: 'dismissed' as const } : j)
        }
      })),
      clearRadarJobs: () => set((state) => ({
        radarState: { ...state.radarState, jobs: [] }
      })),
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
        } : null,
        radarState: {
          ...state.radarState,
          isScanning: false,
          scanProgress: { current: 0, total: 0, message: '' }
        }
      }),
    }
  )
);
