import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { acceptInvitation, canDuel, createPoller, declineInvitation, fetchInvitations, heartbeat } from '../../services/duelStore.js'
import { useI18n } from '../../i18n/useI18n'
import './duel.css'

/**
 * Global duel invitation inbox. Polls every few seconds while signed in and
 * surfaces live duel requests as a toast pinned to the top of the screen.
 * Accepting routes straight into the duel room.
 */
function DuelInvitationListener() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const location = useLocation()

  const [invitation, setInvitation] = useState(null)
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const handled = useRef(new Set())

  useEffect(() => {
    if (!canDuel()) return undefined
    const poller = createPoller(async () => {
      const invitations = await fetchInvitations()
      const next = invitations.find((item) => !handled.current.has(item.invitationId)) || null
      setInvitation(next)
    }, 4000)
    // Heartbeat keeps last_active_at fresh from ANY page, so the player
    // stays visible in the online list and keeps receiving new invites
    // even while idle outside the duel lobby.
    const presence = createPoller(async () => {
      await heartbeat()
    }, 20000)
    return () => {
      poller.stop()
      presence.stop()
    }
  }, [])

  useEffect(() => {
    if (!notice) return undefined
    const timer = setTimeout(() => setNotice(''), 4000)
    return () => clearTimeout(timer)
  }, [notice])

  // Inside the duel flow itself the toast would only be noise — hide it on
  // the lobby/room pages and while playing an active duel inside the arena.
  if (location.pathname.startsWith('/duel')) return null
  if (location.pathname.startsWith('/arena/') && location.search.includes('mode=duel')) return null
  if (!invitation && !notice) return null

  const handleAccept = async () => {
    if (!invitation || busy) return
    setBusy(true)
    const current = invitation
    try {
      const result = await acceptInvitation(current.invitationId)
      handled.current.add(current.invitationId)
      setInvitation(null)
      if (result?.matchId) navigate(`/duel/${result.matchId}`)
    } catch (error) {
      handled.current.add(current.invitationId)
      setInvitation(null)
      if (error?.status === 410) setNotice(t('duel', 'inviteExpired'))
      else if (error?.status === 409) setNotice(t('duel', 'seatTaken'))
      else setNotice(t('duel', 'acceptError'))
    } finally {
      setBusy(false)
    }
  }

  const handleDecline = () => {
    if (!invitation || busy) return
    handled.current.add(invitation.invitationId)
    setInvitation(null)
    declineInvitation(invitation.invitationId).catch(() => undefined)
  }

  if (notice) {
    return (
      <div className="duel-toast" role="status">
        <div className="duel-toast-body">
          <strong>{notice}</strong>
        </div>
      </div>
    )
  }

  const meta = [invitation.difficulty, invitation.bugType]
    .map((value) => (value && value !== 'any' ? value : null))
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="duel-toast" role="alert">
      <div
        className="duel-toast-avatar"
        style={{ background: invitation.from.avatarColor }}
      >
        {invitation.from.displayName.charAt(0).toUpperCase()}
      </div>

      <div className="duel-toast-body">
        <strong>{t('duel', 'title')} · {invitation.from.displayName}</strong>
        <span>{t('duel', 'inviteWants')}</span>
        {meta && <small>{meta}</small>}
      </div>

      <div className="duel-toast-actions">
        <button
          type="button"
          className="duel-toast-accept"
          onClick={handleAccept}
          disabled={busy}
        >
          {t('duel', 'accept')}
        </button>
        <button
          type="button"
          className="duel-toast-decline"
          onClick={handleDecline}
          disabled={busy}
          aria-label={t('duel', 'decline')}
        >
          ×
        </button>
      </div>
    </div>
  )
}

export default DuelInvitationListener
