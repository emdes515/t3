import React, { useState } from 'react';
import { useStore, RadarJob } from '../store/useStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Radar, Briefcase, MapPin, Zap, CheckCircle2, AlertCircle, RefreshCw, X, FileText } from 'lucide-react';
import { t } from '../i18n';
import {
  generateJobSearchQueries,
  searchJobsWithGemini,
  fetchJobFromURL,
  tailorCv,
  generateRadarSummary
} from '../lib/gemini';
import { toast } from 'sonner';

interface JobRadarProps {
  onApply: () => void; // Triggered when jumping to CvCreator
}

export const JobRadar: React.FC<JobRadarProps> = ({ onApply }) => {
  const { profile, radarState, setRadarState, appLanguage, setCvCreatorState } = useStore();
  const [activeJobIndex, setActiveJobIndex] = useState(0);

  const performScan = async () => {
    if (!profile || !profile.geminiApiKey) {
      toast.error('API Key required. Please set it in Settings.');
      return;
    }

    setRadarState({ isScanning: true });

    try {
      toast.info('Generating AI search queries...');
      const dorkResult = await generateJobSearchQueries(profile.geminiApiKey, profile);
      const queries = dorkResult.queries || [];

      if (queries.length === 0) {
        throw new Error('Failed to generate search queries.');
      }

      toast.info('Searching for jobs (last 24h)...');
      const searchResult = await searchJobsWithGemini(profile.geminiApiKey, queries);
      const urls = searchResult.urls || [];

      if (urls.length === 0) {
        toast.warning('No recent jobs found matching your profile.');
        setRadarState({ isScanning: false, lastScanDate: new Date().toISOString() });
        return;
      }

      toast.info(`Found ${urls.length} potential offers. Pre-screening...`);

      const scoredJobs: RadarJob[] = [];

      for (const url of urls) {
        try {
          // Fetch job details
          const jobData = await fetchJobFromURL(profile.geminiApiKey, url);

          if (!jobData || !jobData.meta?.is_real_job_offer) {
            continue; // Skip invalid links
          }

          // Pre-screen: Generate match score by doing a quick "tailor" or match analysis
          // We can use the existing tailorCv to get matchAnalysis.
          // Note: Full tailoring might take a while, but for MVP it works.
          const tailored = await tailorCv(profile.geminiApiKey, profile, jobData, appLanguage);
          const matchScore = tailored.matchAnalysis?.score || 0;

          if (matchScore >= 60) {
            // Generate summary specifically for radar
            const summaryResult = await generateRadarSummary(profile.geminiApiKey, profile, jobData);

            scoredJobs.push({
              url,
              jobInfo: jobData,
              matchScore,
              summary: summaryResult.summary
            });
          }
        } catch (e) {
          console.warn(`Failed to process URL: ${url}`, e);
        }
      }

      // Sort by score
      scoredJobs.sort((a, b) => b.matchScore - a.matchScore);

      setRadarState({
        isScanning: false,
        lastScanDate: new Date().toISOString(),
        jobs: scoredJobs
      });

      if (scoredJobs.length > 0) {
        toast.success(`Found ${scoredJobs.length} matching jobs!`);
        setActiveJobIndex(0);
      } else {
        toast.warning('No jobs matched your profile over 60%.');
      }

    } catch (error) {
      console.error(error);
      toast.error('Scan failed. Try again.');
      setRadarState({ isScanning: false });
    }
  };

  const handleApply = (job: RadarJob) => {
    // Pre-fill CV Creator
    setCvCreatorState({
      step: 1, // Start at analysis or generation
      jobUrl: job.url,
      isManual: false,
      jobInfo: job.jobInfo,
      // We could also pass tailoredData if we saved it, but for now we let it re-tailor or use existing
    });
    onApply();
  };

  const currentJob = radarState.jobs[activeJobIndex];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-display font-bold flex items-center gap-3">
            <Radar className="text-accent" size={32} />
            AI Job Radar
          </h2>
          <p className="text-black/60 mt-2">
            Auto-hunting for jobs matching your Master Profile.
            {radarState.lastScanDate && ` Last scan: ${new Date(radarState.lastScanDate).toLocaleString()}`}
          </p>
        </div>

        <button
          onClick={performScan}
          disabled={radarState.isScanning}
          className="flex items-center gap-2 bg-accent text-white px-6 py-3 rounded-lg font-medium hover:bg-accent/90 transition-all disabled:opacity-50"
        >
          {radarState.isScanning ? (
            <RefreshCw className="animate-spin" size={20} />
          ) : (
            <Zap size={20} />
          )}
          {radarState.isScanning ? 'Scanning Web...' : 'Scan Now'}
        </button>
      </div>

      {radarState.isScanning ? (
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-black/5">
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className="absolute inset-0 bg-accent/20 rounded-full animate-ping"></div>
            <div className="relative bg-white rounded-full p-4 border-4 border-accent">
              <Radar className="w-full h-full text-accent" />
            </div>
          </div>
          <h3 className="text-xl font-bold mb-2">Radar is searching...</h3>
          <p className="text-black/60">Using Gemini to build Dorks and scan job boards for 24h updates.</p>
        </div>
      ) : radarState.jobs.length > 0 && currentJob ? (
        <div className="relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeJobIndex}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="bg-white rounded-2xl shadow-xl border border-black/5 overflow-hidden"
            >
              {/* Card Header */}
              <div className="p-8 border-b border-black/5 bg-gradient-to-r from-white to-gray-50">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">
                      {currentJob.jobInfo.basic_info?.job_title || 'Unknown Title'}
                    </h3>
                    <div className="flex items-center gap-4 text-black/60 text-sm">
                      <span className="flex items-center gap-1">
                        <Briefcase size={16} />
                        {currentJob.jobInfo.basic_info?.company_name || 'Confidential'}
                      </span>
                      {currentJob.jobInfo.basic_info?.location && (
                        <span className="flex items-center gap-1">
                          <MapPin size={16} />
                          {currentJob.jobInfo.basic_info.location}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Match Score Badge */}
                  <div className="flex flex-col items-center">
                    <div className="relative w-16 h-16 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                        <path
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="#E5E7EB"
                          strokeWidth="3"
                        />
                        <path
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke={currentJob.matchScore >= 80 ? '#22C55E' : '#F59E0B'}
                          strokeWidth="3"
                          strokeDasharray={`${currentJob.matchScore}, 100`}
                        />
                      </svg>
                      <span className="absolute text-lg font-bold">
                        {currentJob.matchScore}%
                      </span>
                    </div>
                    <span className="text-xs font-medium text-black/40 mt-1 uppercase tracking-wider">
                      Match Score
                    </span>
                  </div>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-8">
                {/* AI Summary */}
                <div className="bg-[#F5F5F5] rounded-xl p-6 mb-8 relative">
                  <div className="absolute -top-3 left-6 bg-accent text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                    <Zap size={12} /> AI Summary
                  </div>
                  <p className="text-gray-800 font-medium leading-relaxed mt-2">
                    {currentJob.summary}
                  </p>
                </div>

                {/* Requirements & Responsibilities */}
                <div className="grid grid-cols-2 gap-8 mb-8">
                  <div>
                    <h4 className="font-bold mb-4 flex items-center gap-2">
                      <CheckCircle2 className="text-accent" size={18} />
                      Key Requirements
                    </h4>
                    <ul className="space-y-2">
                      {currentJob.jobInfo.skills?.must_have?.slice(0, 5).map((req: string, i: number) => (
                        <li key={i} className="text-sm text-black/70 flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-black/20 mt-1.5 shrink-0" />
                          {req}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-bold mb-4 flex items-center gap-2">
                      <FileText className="text-accent" size={18} />
                      Main Responsibilities
                    </h4>
                    <ul className="space-y-2">
                      {currentJob.jobInfo.context?.main_responsibilities?.slice(0, 5).map((resp: string, i: number) => (
                        <li key={i} className="text-sm text-black/70 flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-black/20 mt-1.5 shrink-0" />
                          {resp}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4">
                  <button
                    onClick={() => handleApply(currentJob)}
                    className="flex-1 bg-accent text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 hover:bg-accent/90 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                  >
                    <Zap size={24} />
                    Wygeneruj CV pod tę ofertę
                  </button>
                  <a
                    href={currentJob.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-6 py-4 rounded-xl font-bold text-black border border-black/10 hover:bg-black/5 transition-all flex items-center justify-center"
                  >
                    Oryginalne ogłoszenie
                  </a>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Navigation Controls */}
          <div className="flex justify-between items-center mt-6">
            <button
              onClick={() => setActiveJobIndex(Math.max(0, activeJobIndex - 1))}
              disabled={activeJobIndex === 0}
              className="p-2 rounded-full border border-black/10 disabled:opacity-30 hover:bg-black/5 transition-all"
            >
              Poprzednia
            </button>
            <span className="text-sm font-medium text-black/40">
              {activeJobIndex + 1} z {radarState.jobs.length}
            </span>
            <button
              onClick={() => setActiveJobIndex(Math.min(radarState.jobs.length - 1, activeJobIndex + 1))}
              disabled={activeJobIndex === radarState.jobs.length - 1}
              className="p-2 rounded-full border border-black/10 disabled:opacity-30 hover:bg-black/5 transition-all"
            >
              Następna
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-black/5">
          <Radar className="mx-auto text-black/20 mb-4" size={64} />
          <h3 className="text-xl font-bold mb-2">No jobs currently on radar</h3>
          <p className="text-black/60 mb-6">Click "Scan Now" to search for recent job postings matching your profile.</p>
        </div>
      )}
    </div>
  );
};