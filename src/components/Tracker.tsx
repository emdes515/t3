import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firebase-errors';
import { useStore } from '../store/useStore';
import { t } from '../i18n';
import { motion, AnimatePresence } from 'framer-motion';
import { Briefcase, Calendar, ExternalLink, Trash2, ChevronRight, CheckCircle2, Clock, XCircle, Star, Edit3, Download, X, AlertTriangle } from 'lucide-react';
import { notify } from '../lib/notifications';
import { format } from 'date-fns';
import { CvCreator } from './CvCreator';
import { ModernTemplate } from './pdf/templates/ModernTemplate';
import { PDFDownloadLink } from '@react-pdf/renderer';

export const Tracker: React.FC = () => {
  const { profile, appLanguage } = useStore();
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingApp, setEditingApp] = useState<any>(null);
  const [appToDelete, setAppToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (!profile?.uid) return;
    const path = 'applications';
    const q = query(collection(db, 'applications'), where('uid', '==', profile.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const apps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setApplications(apps.sort((a: any, b: any) => b.createdAt?.seconds - a.createdAt?.seconds));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
    return () => unsubscribe();
  }, [profile?.uid]);

  const updateStatus = async (id: string, status: string) => {
    const path = `applications/${id}`;
    try {
      await updateDoc(doc(db, 'applications', id), { status, updatedAt: new Date() });
      notify.success(t('applicationUpdated', appLanguage));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
      notify.error(t('failedToUpdateStatus', appLanguage));
    }
  };

  const deleteApp = async () => {
    if (!appToDelete) return;
    const path = `applications/${appToDelete}`;
    try {
      await deleteDoc(doc(db, 'applications', appToDelete));
      notify.success(t('appDeleted', appLanguage));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
      notify.error(t('failedToDeleteApp', appLanguage));
    } finally {
      setAppToDelete(null);
    }
  };

  const statusIcons: any = {
    prepared: { icon: Clock, color: 'text-blue-400', bg: 'bg-blue-400/10' },
    applied: { icon: Star, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
    interview: { icon: Briefcase, color: 'text-purple-400', bg: 'bg-purple-400/10' },
    rejected: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-400/10' },
    offer: { icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-400/10' }
  };

  if (loading) return <div className="animate-pulse text-black/20">{t('loadingApplications', appLanguage)}</div>;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-4xl font-display uppercase tracking-tight">{t('applicationTracker', appLanguage)}</h2>
        <div className="text-black/40 text-sm font-mono">{applications.length} {t('applicationsTotal', appLanguage)}</div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <AnimatePresence>
          {applications.map((app) => {
            const StatusIcon = statusIcons[app.status]?.icon || Clock;
            return (
              <motion.div
                key={app.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="glass rounded-2xl p-6 flex items-center justify-between group hover:border-[var(--color-accent)]/30 transition-all"
              >
                <div className="flex items-center space-x-6">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${statusIcons[app.status]?.bg} ${statusIcons[app.status]?.color}`}>
                    <StatusIcon size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{app.position}</h3>
                    <div className="flex items-center space-x-3 text-sm text-black/40">
                      <span className="text-[var(--color-accent)] font-medium">{app.company}</span>
                      <span>•</span>
                      <span className="flex items-center space-x-1">
                        <Calendar size={12} />
                        <span>{app.createdAt ? format(app.createdAt.toDate(), 'MMM d, yyyy') : 'Just now'}</span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="flex bg-black/5 p-1 rounded-xl">
                    {Object.keys(statusIcons).map((s) => (
                      <button
                        key={s}
                        onClick={() => updateStatus(app.id, s)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${
                          app.status === s 
                            ? `${statusIcons[s].bg} ${statusIcons[s].color}` 
                            : 'text-black/20 hover:text-black/40'
                        }`}
                      >
                        {t(s as any, appLanguage)}
                      </button>
                    ))}
                  </div>
                  
                  <div className="flex items-center space-x-2 border-l border-black/10 pl-4">
                    <button 
                      onClick={() => setEditingApp(app)}
                      className="p-2 hover:bg-black/5 rounded-lg text-black/40 hover:text-black transition-all"
                      title={t('editCv', appLanguage)}
                    >
                      <Edit3 size={18} />
                    </button>
                    <PDFDownloadLink
                      document={<ModernTemplate data={app.tailoredCv} profile={profile} jobInfo={{ basic_info: { company_name: app.company, job_title: app.position } }} appLanguage={appLanguage} />}
                      fileName={`CV_${app.company}_${profile?.personalInfo?.fullName}.pdf`}
                      className="p-2 hover:bg-black/5 rounded-lg text-black/40 hover:text-black transition-all"
                      title={t('downloadPDF', appLanguage)}
                      aria-label={t('downloadPDF', appLanguage)}
                    >
                      {({ loading }) => loading ? <Clock size={18} className="animate-spin" /> : <Download size={18} />}
                    </PDFDownloadLink>
                    <a 
                      href={app.jobUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="p-2 hover:bg-black/5 rounded-lg text-black/40 hover:text-black transition-all"
                      title={t('jobUrl', appLanguage)}
                      aria-label={t('jobUrl', appLanguage)}
                    >
                      <ExternalLink size={18} />
                    </a>
                    <button 
                      onClick={() => setAppToDelete(app.id)}
                      className="p-2 hover:bg-red-500/20 text-black/20 hover:text-red-400 rounded-lg transition-all"
                      title={t('deleteApplication', appLanguage)}
                      aria-label={t('deleteApplication', appLanguage)}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {applications.length === 0 && (
          <div className="text-center py-32 glass rounded-3xl space-y-4">
            <div className="w-16 h-16 bg-black/5 rounded-full flex items-center justify-center mx-auto text-black/20">
              <Briefcase size={32} />
            </div>
            <p className="text-black/40">{t('noApplicationsYet', appLanguage)}</p>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingApp && (
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
              className="bg-[#F5F5F4] w-full max-w-6xl h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-black/5 flex items-center justify-between bg-white">
                <h3 className="text-xl font-bold">{t('editApplication', appLanguage)}</h3>
                <button 
                  onClick={() => setEditingApp(null)}
                  className="p-2 hover:bg-black/5 rounded-full transition-all"
                  title={t('close', appLanguage)}
                  aria-label={t('close', appLanguage)}
                >
                  <X size={24} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-8">
                <CvCreator initialData={editingApp} onClose={() => setEditingApp(null)} />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {appToDelete && (
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
              className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col p-8 space-y-6"
            >
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto text-red-600">
                <AlertTriangle size={32} />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-2xl font-bold">{appLanguage === 'pl' ? 'Usuwanie Aplikacji' : 'Delete Application'}</h3>
                <p className="text-black/60">
                  {appLanguage === 'pl' 
                    ? 'Czy na pewno chcesz usunąć to pozycję z historii? Tej akcji nie można cofnąć.' 
                    : 'Are you sure you want to delete this application? This action cannot be undone.'}
                </p>
              </div>
              <div className="flex flex-col space-y-3">
                <button
                  onClick={deleteApp}
                  className="w-full py-4 bg-gradient-to-r from-red-500 to-red-600 text-white font-bold rounded-2xl hover:scale-[1.02] transition-transform shadow-lg shadow-red-500/20"
                >
                  {appLanguage === 'pl' ? 'Usuń bezpowrotnie' : 'Delete permanently'}
                </button>
                <button
                  onClick={() => setAppToDelete(null)}
                  className="w-full py-4 bg-black/5 text-black/60 font-bold rounded-2xl hover:bg-black/10 transition-colors"
                >
                  {t('cancel', appLanguage)}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
