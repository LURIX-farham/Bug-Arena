import { Outlet } from 'react-router-dom'
import AppSidebar from './AppSidebar'
import AppTopbar from './AppTopbar'
import AppMobileNav from './AppMobileNav'
import DuelInvitationListener from '../../duel/DuelInvitationListener'

function AppShell() {
  return (
    <div className="app-shell">

      <AppSidebar />

      <div className="app-main">

        <AppTopbar />

        <main className="app-content">
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