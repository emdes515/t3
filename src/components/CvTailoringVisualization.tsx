import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Briefcase, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';
import { useStore } from '../store/useStore';
import { t } from '../i18n';

const MOCK_PROFILE = {
  skills: ['React', 'Node.js', 'Python', 'Docker', 'AWS', 'GraphQL', 'TypeScript', 'MongoDB'],
  experience: [
    { id: 1, role: 'Full Stack Developer', company: 'Tech Corp', desc: 'Built scalable web apps using React and Node.js.' },
    { id: 2, role: 'Frontend Engineer', company: 'Web Solutions', desc: 'Created responsive UIs with React and TypeScript.' },
    { id: 3, role: 'Data Analyst', company: 'Data Inc', desc: 'Analyzed datasets using Python and SQL.' }
  ]
};

const MOCK_JOB = {
  title: 'Senior Frontend Developer',
  keywords: ['React', 'TypeScript', 'GraphQL', 'Frontend Engineer']
};

export const CvTailoringVisualization: React.FC = () => {
  const { appLanguage } = useStore();
  const [step, setStep] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  // Animation sequence
  useEffect(() => {
    if (isHovered) {
      const timer = setInterval(() => {
        setStep((prev) => (prev < 4 ? prev + 1 : 0));
      }, 2500);
      return () => clearInterval(timer);
    } else {
      setStep(0);
    }
  }, [isHovered]);

  return (
    <div 
      className="w-full bg-white/40 backdrop-blur-xl border border-black/10 rounded-3xl p-6 shadow-2xl relative z-10 overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-red-500/30" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/30" />
          <div className="w-3 h-3 rounded-full bg-green-500/30" />
        </div>
        <div className="text-xs text-black/40 font-mono uppercase tracking-widest flex items-center space-x-2">
          <span>{isHovered ? 'Processing...' : 'Hover to animate'}</span>
          {isHovered && <Sparkles size={14} className="text-primary animate-pulse" />}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative">
        {/* Connection Lines (Desktop only) */}
        <div className="hidden lg:block absolute top-1/2 left-1/3 right-1/3 h-0.5 bg-gradient-to-r from-transparent via-primary/20 to-transparent -translate-y-1/2 z-0" />

        {/* Column 1: Master Profile */}
        <div className="bg-white/60 rounded-2xl p-5 border border-black/5 relative z-10">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <FileText size={16} className="text-blue-600" />
            </div>
            <h3 className="font-display font-bold text-sm uppercase tracking-wider">Master Profile</h3>
          </div>

          <div className="space-y-4">
            <div>
              <div className="text-xs font-mono text-black/40 mb-2 uppercase">Skills</div>
              <div className="flex flex-wrap gap-2">
                {MOCK_PROFILE.skills.map((skill, i) => {
                  const isMatch = MOCK_JOB.keywords.includes(skill);
                  const isHighlighted = step >= 1 && isMatch;
                  const isFaded = step >= 1 && !isMatch;
                  
                  return (
                    <motion.span
                      key={skill}
                      animate={{
                        backgroundColor: isHighlighted ? 'rgba(37, 99, 235, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                        color: isHighlighted ? 'rgba(37, 99, 235, 1)' : (isFaded ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.7)'),
                        borderColor: isHighlighted ? 'rgba(37, 99, 235, 0.2)' : 'transparent',
                        scale: isHighlighted ? 1.05 : 1
                      }}
                      className="text-xs px-2 py-1 rounded-md border transition-colors duration-500"
                    >
                      {skill}
                    </motion.span>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="text-xs font-mono text-black/40 mb-2 uppercase">Experience</div>
              <div className="space-y-2">
                {MOCK_PROFILE.experience.map((exp) => {
                  const isMatch = MOCK_JOB.keywords.some(k => exp.role.includes(k) || exp.desc.includes(k));
                  const isHighlighted = step >= 2 && isMatch;
                  const isFaded = step >= 2 && !isMatch;

                  return (
                    <motion.div
                      key={exp.id}
                      animate={{
                        opacity: isFaded ? 0.4 : 1,
                        x: isHighlighted ? 5 : 0,
                        borderColor: isHighlighted ? 'rgba(37, 99, 235, 0.3)' : 'rgba(0,0,0,0.05)',
                        backgroundColor: isHighlighted ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0.5)'
                      }}
                      className="p-3 rounded-xl border text-sm transition-all duration-500"
                    >
                      <div className="font-medium text-black/80">{exp.role}</div>
                      <div className="text-xs text-black/50">{exp.company}</div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Column 2: Job Description */}
        <div className="bg-accent/5 rounded-2xl p-5 border border-accent/10 relative z-10">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
              <Briefcase size={16} className="text-accent" />
            </div>
            <h3 className="font-display font-bold text-sm uppercase tracking-wider">Job Posting</h3>
          </div>

          <div className="mb-4">
            <h4 className="font-bold text-lg">{MOCK_JOB.title}</h4>
            <div className="text-xs text-black/50 mt-1">Tech Solutions Inc.</div>
          </div>

          <div className="space-y-2 text-sm text-black/70 leading-relaxed relative">
            {step === 0 && (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent h-10 w-full animate-[scan_2s_ease-in-out_infinite]"
                style={{ top: '-20%' }}
              />
            )}
            <p>
              We are looking for a <span className={`transition-colors duration-500 ${step >= 1 ? 'bg-yellow-200/50 text-yellow-800 px-1 rounded' : ''}`}>Frontend Engineer</span> to join our team.
            </p>
            <p>
              Requirements:
            </p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Strong proficiency in <span className={`transition-colors duration-500 ${step >= 1 ? 'bg-yellow-200/50 text-yellow-800 px-1 rounded' : ''}`}>React</span></li>
              <li>Experience with <span className={`transition-colors duration-500 ${step >= 1 ? 'bg-yellow-200/50 text-yellow-800 px-1 rounded' : ''}`}>TypeScript</span></li>
              <li>Knowledge of <span className={`transition-colors duration-500 ${step >= 1 ? 'bg-yellow-200/50 text-yellow-800 px-1 rounded' : ''}`}>GraphQL</span> is a plus</li>
            </ul>
          </div>
        </div>

        {/* Column 3: Tailored CV */}
        <div className="bg-primary/5 rounded-2xl p-5 border border-primary/20 relative z-10 overflow-hidden">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <Sparkles size={16} className="text-primary" />
            </div>
            <h3 className="font-display font-bold text-sm uppercase tracking-wider text-primary">Tailored CV</h3>
          </div>

          <div className="space-y-4 min-h-[250px]">
            <AnimatePresence>
              {step >= 3 && (
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className="bg-white p-4 rounded-xl shadow-sm border border-primary/10"
                >
                  <div className="text-xs font-mono text-primary/60 mb-2 uppercase flex items-center justify-between">
                    <span>Selected Skills</span>
                    <CheckCircle2 size={14} className="text-green-500" />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {MOCK_JOB.keywords.filter(k => k !== 'Frontend Engineer').map((skill, i) => (
                      <motion.span
                        key={skill}
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.1 }}
                        className="text-xs px-2 py-1 rounded-md bg-primary/10 text-primary font-medium"
                      >
                        {skill}
                      </motion.span>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {step >= 4 && (
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: 0.2 }}
                  className="bg-white p-4 rounded-xl shadow-sm border border-primary/10"
                >
                  <div className="text-xs font-mono text-primary/60 mb-2 uppercase flex items-center justify-between">
                    <span>Relevant Experience</span>
                    <CheckCircle2 size={14} className="text-green-500" />
                  </div>
                  <div className="space-y-2">
                    {MOCK_PROFILE.experience.filter(exp => MOCK_JOB.keywords.some(k => exp.role.includes(k) || exp.desc.includes(k))).map((exp, i) => (
                      <motion.div
                        key={exp.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 + (i * 0.1) }}
                        className="text-sm"
                      >
                        <div className="font-medium text-black/80">{exp.role}</div>
                        <div className="text-xs text-black/50">{exp.company}</div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {step < 3 && (
              <div className="h-full flex flex-col items-center justify-center text-black/30 space-y-4 opacity-50">
                <motion.div 
                  animate={{ rotate: 360 }} 
                  transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                >
                  <Sparkles size={32} />
                </motion.div>
                <div className="text-sm font-medium">Waiting for analysis...</div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Progress Indicator */}
      <div className="mt-8 flex justify-center space-x-2">
        {[0, 1, 2, 3, 4].map((i) => (
          <div 
            key={i} 
            className={`h-1.5 rounded-full transition-all duration-500 ${i <= step ? 'w-8 bg-primary' : 'w-2 bg-black/10'}`}
          />
        ))}
      </div>
    </div>
  );
};
