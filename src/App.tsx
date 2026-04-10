import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, getDocFromServer } from 'firebase/firestore';
import { useStore } from './store/useStore';
import { LandingPage } from './components/LandingPage';
import { MasterProfile } from './components/MasterProfile';
import { CvCreator } from './components/CvCreator';
import { Tracker } from './components/Tracker';
import { Settings } from './components/Settings';
import { Layout } from './components/Layout';
import { Toaster } from 'sonner';
import { ErrorBoundary } from './components/ErrorBoundary';
import { handleFirestoreError, OperationType } from './lib/firebase-errors';

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

function AppContent() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'landing' | 'profile' | 'creator' | 'tracker' | 'settings'>('landing');
  const [initialJobData, setInitialJobData] = useState<any>(null);
  const { setProfile } = useStore();

  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration. ");
        }
      }
    }
    testConnection();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        const path = `users/${user.uid}`;
        try {
          const docRef = doc(db, 'users', user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setProfile(docSnap.data() as any);
          } else {
            const initialProfile = {
              uid: user.uid,
              personalInfo: { 
                fullName: user.displayName, 
                email: user.email,
                photoURL: user.photoURL 
              },
              experience: [],
              education: [],
              skills: [],
              certifications: [],
              languages: [],
              courses: [],
              projects: [],
              socialLinks: []
            };
            await setDoc(docRef, initialProfile);
            setProfile(initialProfile);
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, path);
        }
        if (view === 'landing') setView('profile');
      } else {
        setView('landing');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setView('landing');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FBFBFA] flex items-center justify-center">
        <div className="animate-pulse text-accent font-display text-4xl uppercase tracking-widest">
          TailorCV
        </div>
      </div>
    );
  }

  if (view === 'landing') {
    return <LandingPage onLogin={handleLogin} />;
  }

  return (
    <Layout currentView={view} setView={setView} onLogout={handleLogout} user={user}>
      <Toaster 
        position="bottom-right" 
        theme="dark" 
        richColors 
        closeButton
        toastOptions={{
          style: {
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.1)',
            backdropFilter: 'blur(8px)',
          },
        }}
      />
      {view === 'profile' && <MasterProfile />}
      {view === 'creator' && <CvCreator initialData={initialJobData} />}
      {view === 'tracker' && <Tracker />}
      {view === 'settings' && <Settings />}
    </Layout>
  );
}
