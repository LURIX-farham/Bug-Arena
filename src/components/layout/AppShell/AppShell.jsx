import { Outlet } from 'react-router-dom'
import AppSidebar from './AppSidebar'
import AppTopbar from './AppTopbar'
import AppMobileNav from './AppMobileNav'
import DuelInvitationListener from '../../duel/DuelInvitationListener'
import { useI18n } from '../../../i18n/useI18n'

function AppShell() {
  const { t } = useI18n()
  return (
    <div className="app-shell">

      <a className="skip-link" href="#main-content">{t('ux', 'skip')}</a>

      <AppSidebar />

      <div className="app-main">

        <AppTopbar />

        <main className="app-content" id="main-content" tabIndex={-1}>
          <Outlet />
        </main>

      </div>

      <AppMobileNav />

      {/* Global 1v1 duel invitation toast — polls while signed in. */}
      <DuelInvitationListener />

    </div>
  )
}

export default AppShell