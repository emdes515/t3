import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firebase-errors';
import { Key, Shield, Info, ExternalLink, Save, Globe } from 'lucide-react';
import { notify } from '../lib/notifications';
import { t } from '../i18n';

export const Settings: React.FC = () => {
  const { profile, updateProfile, appLanguage, setAppLanguage } = useStore();
  const [apiKey, setApiKey] = useState(profile?.geminiApiKey || '');

  const handleSave = async () => {
    if (!profile?.uid) return;
    const path = `users/${profile.uid}`;
    try {
      const docRef = doc(db, 'users', profile.uid);
      await updateDoc(docRef, { geminiApiKey: apiKey });
      updateProfile({ geminiApiKey: apiKey });
      notify.success(t('apiKeySaved', appLanguage));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
      notify.error(t('failedSaveApiKey', appLanguage));
    }
  };

  return (
    <div className="max-w-2xl space-y-12">
      <h2 className="text-4xl font-display uppercase tracking-tight">{t('settings', appLanguage)}</h2>

      <div className="space-y-8">
        <div className="glass rounded-3xl p-8 space-y-6">
          <div className="flex items-center space-x-3 text-violet-600">
            <Globe size={24} />
            <h3 className="text-xl font-bold">{t('language', appLanguage)}</h3>
          </div>
          
          <div className="space-y-2">
            <label className="text-xs uppercase text-black/40 font-bold tracking-widest">{t('language', appLanguage)}</label>
            <select
              value={appLanguage}
              onChange={(e) => setAppLanguage(e.target.value)}
              className="w-full bg-black/5 border border-black/10 rounded-xl px-4 py-3 focus:border-[var(--color-accent)] outline-none transition-all font-bold"
            >
              <option value="en">English</option>
              <option value="pl">Polski</option>
            </select>
          </div>
        </div>

        <div className="glass rounded-3xl p-8 space-y-6">
          <div className="flex items-center space-x-3 text-violet-600">
            <Key size={24} />
            <h3 className="text-xl font-bold">{t('geminiApiConfig', appLanguage)}</h3>
          </div>
          
          <p className="text-black/60 text-sm leading-relaxed">
            {t('geminiApiConfigDesc', appLanguage)}
          </p>

          <div className="space-y-2">
            <label className="text-xs uppercase text-black/40 font-bold tracking-widest">{t('geminiApiKey', appLanguage)}</label>
            <div className="flex gap-4">
              <input
                type="password"
                placeholder={t('enterApiKey', appLanguage)}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="flex-1 bg-black/5 border border-black/10 rounded-xl px-4 py-3 focus:border-[var(--color-accent)] outline-none transition-all font-mono"
              />
              <button
                onClick={handleSave}
                className="px-6 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold rounded-xl hover:scale-105 hover:shadow-lg hover:shadow-violet-500/20 transition-all flex items-center space-x-2"
              >
                <Save size={18} />
                <span>{t('save', appLanguage)}</span>
              </button>
            </div>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex items-start space-x-3">
            <Info className="text-blue-500 shrink-0 mt-0.5" size={18} />
            <div className="text-sm text-blue-800/80">
              {t('noApiKeyInfo', appLanguage)}{' '}
              <a 
                href="https://aistudio.google.com/app/apikey" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline inline-flex items-center space-x-1 font-medium"
              >
                <span>{t('googleAiStudio', appLanguage)}</span>
                <ExternalLink size={12} />
              </a>
            </div>
          </div>
        </div>

        <div className="glass rounded-3xl p-8 space-y-6 opacity-50 pointer-events-none">
          <div className="flex items-center space-x-3 text-black/40">
            <Shield size={24} />
            <h3 className="text-xl font-bold">{t('privacySecurity', appLanguage)}</h3>
          </div>
          <p className="text-black/40 text-sm">
            {t('privacySecurityDesc', appLanguage)}
          </p>
        </div>
      </div>
    </div>
  );
};
