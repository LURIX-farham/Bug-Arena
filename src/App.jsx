import { Suspense, lazy, useEffect, useState } from 'react'
import { Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom'

import AppShell from './components/layout/AppShell/AppShell'
import ComingSoon from './components/layout/AppShell/ComingSoon'

import ErrorBoundary from './components/ErrorBoundary'
import { I18nProvider } from './i18n/I18nContext'
import { useI18n } from './i18n/useI18n'
import { ThemeProvider } from './theme/ThemeProvider'
import { runMigrations } from './services/migrations.js'
import { bootstrapDatabase, refreshDatabase } from './services/databaseSync.js'
import { isAuthenticated } from './services/authStore.js'
import usePremiumMotion from './hooks/usePremiumMotion'
import { ToastProvider } from './components/ui/vibefarsi/Toast'
import BootScreen from './components/feedback/BootScreen'
import OfflineBanner from './components/feedback/OfflineBanner'

// Route-level code splitting: each page is its own chunk, so the first
// paint no longer downloads the Arena editor, Admin console, charts, etc.
const Landing = lazy(() => import('./pages/Landing/Landing'))
const Home = lazy(() => import('./pages/Home/Home'))
const Challenges = lazy(() => import('./pages/Challenges/Challenges'))
const ChallengeDetails = lazy(() => import('./pages/ChallengeDetails/ChallengeDetails'))
const Arena = lazy(() => import('./pages/Arena/Arena'))
const Leaderboard = lazy(() => import('./pages/Leaderboard/Leaderboard'))
const Profile = lazy(() => import('./pages/Profile/Profile'))
const Achievements = lazy(() => import('./pages/Achievements/Achievements'))
const Replays = lazy(() => import('./pages/Replays/Replays'))
const Analytics = lazy(() => import('./pages/Analytics/Analytics'))
const Auth = lazy(() => import('./pages/Auth'))
const Settings = lazy(() => import('./pages/Settings/Settings'))
const Competitive = lazy(() => import('./pages/Competitive/Competitive'))
const System = lazy(() => import('./pages/System/System'))
const Admin = lazy(() => import('./pages/Admin/Admin'))
const AdminShell = lazy(() => import('./components/layout/AdminShell/AdminShell'))
const DuelLobby = lazy(() => import('./pages/Duel/DuelLobby'))
const DuelRoom = lazy(() => import('./pages/Duel/DuelRoom'))
const NotFound = lazy(() => import('./pages/NotFound'))

// Run once at startup (it used to run on every render of <App/>).
runMigrations()


function ArenaRoute() {
  const { id } = useParams()
  const location = useLocation()
  return <Arena key={`${id}${location.search}`} />
}


function ProtectedShell({ ready }) {
  const { t } = useI18n()
  const location = useLocation()
  if (!ready) return <BootScreen label={t('boot', 'connecting')} />
  if (!isAuthenticated()) return <Navigate to="/login" replace state={{ from: location }} />
  return <AppShell />
}

function App() {
  usePremiumMotion()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let active = true
    bootstrapDatabase().finally(() => {
      if (active) setReady(true)
    })

    const refresh = () => { refreshDatabase().catch(() => undefined) }
    window.addEventListener('bug-arena:auth-updated', refresh)
    window.addEventListener('online', refresh)
    return () => {
      active = false
      window.removeEventListener('bug-arena:auth-updated', refresh)
      window.removeEventListener('online', refresh)
    }
  }, [])
  return (
    <ThemeProvider>
      <I18nProvider>
        <ToastProvider>
          <ErrorBoundary>
            <OfflineBanner />
            <Suspense fallback={<BootScreen label={null} />}>
            <Routes>
            <Route path="/" element={<Landing />} />

            <Route element={<ProtectedShell ready={ready} />}>
              <Route path="/home" element={<Home />} />
              <Route path="/challenges" element={<Challenges />} />
              <Route path="/challenges/:id" element={<ChallengeDetails />} />
              <Route path="/arena/:id" element={<ArenaRoute />} />
              <Route path="/arena" element={<Navigate to="/challenges" replace />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/compete" element={<Competitive />} />
              <Route path="/duel" element={<DuelLobby />} />
              <Route path="/duel/:matchId" element={<DuelRoom />} />
              <Route path="/profile" element={<Profile />} />

              <Route path="/replays" element={<Replays />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/tournaments" element={<ComingSoon title="Tournaments" />} />
              <Route path="/achievements" element={<Achievements />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/system" element={<System />} />
            </Route>


            {/* Exclusive admin control plane — not the player AppShell */}
            <Route path="/admin" element={<AdminShell />}>
              <Route index element={<Admin />} />
              <Route path=":section" element={<Admin />} />
            </Route>
            <Route path="/login" element={<Auth />} />
            <Route path="/register" element={<Auth />} />
            <Route path="/privacy" element={<ComingSoon title="Privacy" />} />
            <Route path="/terms" element={<ComingSoon title="Terms" />} />

            <Route path="*" element={<NotFound />} />
            </Routes>
            </Suspense>
          </ErrorBoundary>
        </ToastProvider>
      </I18nProvider>
    </ThemeProvider>
  )
}

export default App
