import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useState, useEffect } from 'react';
import AuthPage from './components/AuthPage';
import AppShell from './components/AppShell';
import OnboardingPage from './pages/OnboardingPage';
import { isProfileComplete } from './lib/format';
import DashboardPage from './pages/DashboardPage';
import GoalsPage from './pages/GoalsPage';
import DailyPage from './pages/DailyPage';
import FoodsPage from './pages/FoodsPage';
import ExercisesPage from './pages/ExercisesPage';
import ProfilePage from './pages/ProfilePage';
import BadgesPage from './pages/BadgesPage';
import ProgressPage from './pages/ProgressPage';
import CalendarPage from './pages/CalendarPage';
import { useAuthStore } from './store/auth';
import { useProfile } from './lib/queries';

export default function App() {
  const { accessToken, user } = useAuthStore();
  const [isAuth, setIsAuth] = useState(!!accessToken || !!user);
  const [skippedOnboarding, setSkippedOnboarding] = useState(false);
  const profileQ = useProfile();

  useEffect(() => {
    const interval = setInterval(() => {
      const state = useAuthStore.getState();
      setIsAuth(!!state.accessToken || !!state.user);
    }, 500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setSkippedOnboarding(false);
  }, [user?.id]);

  if (!isAuth) {
    return (
      <div className="min-h-screen bg-ink text-slate-100 font-sans selection:bg-brand-500/30">
        <AuthPage onAuth={() => setIsAuth(true)} />
      </div>
    );
  }

  // Authenticated but profile still resolving — splash avoids flashing
  // onboarding at complete users on every login.
  if (profileQ.isLoading) {
    return (
      <div className="min-h-screen bg-ink flex items-center justify-center">
        <p className="text-slate-400 text-sm">Loading your profile…</p>
      </div>
    );
  }

  // Onboarding AFTER auth: signup auto-creates a bare profile (name only),
  // so new users always land here; returning users with a complete profile
  // go straight to the dashboard. Skip is session-scoped.
  if (!skippedOnboarding && !isProfileComplete(profileQ.data)) {
    return (
      <OnboardingPage
        onDone={() => setSkippedOnboarding(true)}
        onSkip={() => setSkippedOnboarding(true)}
      />
    );
  }

  return (
    <BrowserRouter>
      <AppShell>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/goals" element={<GoalsPage />} />
          <Route path="/daily" element={<DailyPage />} />
          <Route path="/foods" element={<FoodsPage />} />
          <Route path="/exercises" element={<ExercisesPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/progress" element={<ProgressPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/badges" element={<BadgesPage />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  );
}
