import { useCallback, useEffect, useState } from 'react'
import { getSystemDiagnostics } from '../../services/diagnosticsStore'
import { getSyncQueue, clearSyncQueue } from '../../services/syncQueue'
import { clearArenaEvents, getRecentArenaEvents } from '../../services/eventBus'
import { useI18n } from '../../i18n/useI18n'
import './System.css'

function formatBytes(bytes) {
  if (!bytes) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  return `${(bytes / 1024).toFixed(1)} KB`
}

function System() {
  const { t } = useI18n()
  const [diagnostics, setDiagnostics] = useState(getSystemDiagnostics)
  const [events, setEvents] = useState(() => getRecentArenaEvents(12))
  const [queue, setQueue] = useState(() => getSyncQueue())
  const refresh = useCallback(() => { setDiagnostics(getSystemDiagnostics()); setEvents(getRecentArenaEvents(12)); setQueue(getSyncQueue()) }, [])

  useEffect(() => {
    window.addEventListener('bug-arena:data-updated', refresh)
    window.addEventListener('bug-arena:sync-updated', refresh)
    window.addEventListener('online', refresh)
    window.addEventListener('offline', refresh)
    return () => { window.removeEventListener('bug-arena:data-updated', refresh); window.removeEventListener('bug-arena:sync-updated', refresh); window.removeEventListener('online', refresh); window.removeEventListener('offline', refresh) }
  }, [refresh])

  return (
    <div className="system-page">
      <header className="system-header">
        <div><span className="system-eyebrow">{t('system', 'eyebrow')}</span><h1>{t('system', 'title')}</h1><p>{t('system', 'description')}</p></div>
        <div className={`system-connection ${diagnostics.online ? 'online' : 'offline'}`}><span />{diagnostics.online ? t('system', 'online') : t('system', 'offline')}</div>
      </header>

      <section className="system-grid">
        <article className="system-card"><span>{t('system', 'provider')}</span><strong>{diagnostics.provider}</strong><small>{t('system', 'localFirst')}</small></article>
        <article className="system-card"><span>{t('system', 'architecture')}</span><strong>v{diagnostics.architectureVersion}</strong><small>{t('system', 'apiReady')}</small></article>
        <article className="system-card"><span>{t('system', 'dataVersion')}</span><strong>v{diagnostics.dataVersion}</strong><small>{t('system', 'migratable')}</small></article>
        <article className="system-card"><span>{t('system', 'appVersion')}</span><strong>v{diagnostics.appVersion}</strong><small>BUG ARENA</small></article>
      </section>

      <section className="system-panel"><div className="system-panel-heading"><div><span>{t('system', 'storageTitle')}</span><h2>{t('system', 'storageHealth')}</h2></div><strong>{formatBytes(diagnostics.storage.usedBytes)}</strong></div><div className="health-grid">
        <div><span>{t('system', 'available')}</span><b className={diagnostics.storage.available ? 'good' : 'bad'}>{diagnostics.storage.available ? 'OK' : 'FAIL'}</b></div>
        <div><span>{t('system', 'readable')}</span><b className={diagnostics.storage.readable ? 'good' : 'bad'}>{diagnostics.storage.readable ? 'OK' : 'FAIL'}</b></div>
        <div><span>{t('system', 'writable')}</span><b className={diagnostics.storage.writable ? 'good' : 'bad'}>{diagnostics.storage.writable ? 'OK' : 'FAIL'}</b></div>
        <div><span>{t('system', 'keys')}</span><b>{diagnostics.storage.keys}</b></div>
      </div></section>

      <section className="system-panel"><div className="system-panel-heading"><div><span>{t('system', 'syncTitle')}</span><h2>{t('system', 'syncQueue')}</h2></div><button type="button" onClick={() => { clearSyncQueue(); refresh() }}>{t('system', 'clearQueue')}</button></div><div className="sync-summary"><strong>{diagnostics.sync.pending}</strong><span>{t('system', 'pendingActions')}</span><span>{queue.length} {t('system', 'stored')}</span></div><div className="sync-list">{queue.slice(-6).reverse().map((item) => <div className="sync-row" key={item.id}><strong>{item.type}</strong><span>{item.status}</span><time>{new Date(item.createdAt).toLocaleString()}</time></div>)}{!queue.length && <div className="system-empty">{t('system', 'queueEmpty')}</div>}</div></section>

      <section className="system-panel"><div className="system-panel-heading"><div><span>{t('system', 'eventsTitle')}</span><h2>{t('system', 'recentEvents')}</h2></div><button type="button" onClick={() => { clearArenaEvents(); refresh() }}>{t('system', 'clearEvents')}</button></div><div className="event-list">{events.map((event) => <div className="event-row" key={event.id}><span className="event-dot" /><div><strong>{event.type}</strong><small>{new Date(event.at).toLocaleString()}</small></div></div>)}{!events.length && <div className="system-empty">{t('system', 'eventsEmpty')}</div>}</div></section>

      <section className="system-panel"><div className="system-panel-heading"><div><span>{t('system', 'inventoryTitle')}</span><h2>{t('system', 'localInventory')}</h2></div></div><div className="inventory-grid"><div><span>CHALLENGES</span><strong>{diagnostics.challenges}</strong></div><div><span>SUBMISSIONS</span><strong>{diagnostics.submissions}</strong></div><div><span>REPLAYS</span><strong>{diagnostics.replays}</strong></div><div><span>MATCHES</span><strong>{diagnostics.matches}</strong></div></div></section>
    </div>
  )
}

export default System
