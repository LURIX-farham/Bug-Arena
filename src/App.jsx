import { useEffect, useState } from 'react'
import { Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom'

import Landing from './pages/Landing/Landing'
import AppShell from './components/layout/AppShell/AppShell'
import ComingSoon from './components/layout/AppShell/ComingSoon'

import Home from './pages/Home/Home'
import Challenges from './pages/Challenges/Challenges'
import ChallengeDetails from './pages/ChallengeDetails/ChallengeDetails'
import Arena from './pages/Arena/Arena'
import Leaderboard from './pages/Leaderboard/Leaderboard'
import Profile from './pages/Profile/Profile'
import Achievements from './pages/Achievements/Achievements'
import Replays from './pages/Replays/Replays'
import Analytics from './pages/Analytics/Analytics'
import Auth from './pages/Auth'
import ErrorBoundary from './components/ErrorBoundary'
import { I18nProvider } from './i18n/I18nContext'
import { useI18n } from './i18n/useI18n'
import { ThemeProvider } from './theme/ThemeProvider'
import Settings from './pages/Settings/Settings'
import Competitive from './pages/Competitive/Competitive'
import System from './pages/System/System'
import DuelLobby from './pages/Duel/DuelLobby'
import DuelRoom from './pages/Duel/DuelRoom'
import { runMigrations } from './services/migrations.js'
import { bootstrapDatabase, refreshDatabase } from './services/databaseSync.js'
import { isAuthenticated } from './services/authStore.js'
import usePremiumMotion from './hooks/usePremiumMotion'


function ArenaRoute() {
  const { id } = useParams()
  const location = useLocation()
  return <Arena key={`${id}${location.search}`} />
}


function ProtectedShell({ ready }) {
  const { t } = useI18n()
  if (!ready) {
    return <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', color: 'var(--text-secondary)' }}>{t('boot', 'connecting')}</div>
  }
  if (!isAuthenticated()) return <Navigate to="/login" replace />
  return <AppShell />
}

function App() {
  usePremiumMotion()
  runMigrations()
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
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<Landing />} />

            <Route element={<ProtectedShell ready={ready} />}>
              <Route path="/home" element={<Home />} />
              <Route path="/challenges" element={<Challenges />} />
              <Route path="/challenges/:id" element={<ChallengeDetails />} />
              <Route path="/arena/:id" element={<ArenaRoute />} />
              <Route path="/arena" element={<Navigate to="/challenges/1001" replace />} />
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

            <Route path="/login" element={<Auth />} />
            <Route path="/register" element={<Auth />} />
            <Route path="/privacy" element={<ComingSoon title="Privacy" />} />
            <Route path="/terms" element={<ComingSoon title="Terms" />} />

            <Route path="*" element={<Navigate to="/home" replace />} />
          </Routes>
        </ErrorBoundary>
      </I18nProvider>
    </ThemeProvider>
  )
}

export default App
