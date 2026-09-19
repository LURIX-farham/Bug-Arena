import { useState } from 'react'
import { Link } from 'react-router-dom'

import { useI18n } from '../../../i18n/useI18n'

const modeKeys = {
  solo: {
    number: '01', id: 'solo',
    title: 'modeSoloTitle', subtitle: 'modeSoloSubtitle', description: 'modeSoloDesc',
    stats: ['modeSoloStat1', 'modeSoloStat2', 'modeSoloStat3'],
  },
  '1v1': {
    number: '02', id: '1v1',
    title: 'mode1v1Title', subtitle: 'mode1v1Subtitle', description: 'mode1v1Desc',
    stats: ['mode1v1Stat1', 'mode1v1Stat2', 'mode1v1Stat3'],
  },
  boss: {
    number: '03', id: 'boss',
    title: 'modeBossTitle', subtitle: 'modeBossSubtitle', description: 'modeBossDesc',
    stats: ['modeBossStat1', 'modeBossStat2', 'modeBossStat3'],
  },
  tournament: {
    number: '04', id: 'tournament',
    title: 'modeTournamentTitle', subtitle: 'modeTournamentSubtitle', description: 'modeTournamentDesc',
    stats: ['modeTournamentStat1', 'modeTournamentStat2', 'modeTournamentStat3'],
  },
}

const modes = [modeKeys.solo, modeKeys['1v1'], modeKeys.boss, modeKeys.tournament]

function GameModes() {
  const { t } = useI18n()
  const [activeMode, setActiveMode] = useState('solo')

  const selectedMode = modes.find(
    (mode) => mode.id === activeMode
  )

  return (
    <section id="modes" className="landing-section game-modes">

      <div className="section-heading">
        <span className="section-number">
          {t('landing', 'modesEyebrow')}
        </span>

        <h2>
          {t('landing', 'modesTitle1')}
          <br />
          <span>{t('landing', 'modesTitleAccent')}</span>
        </h2>

        <p>
          {t('landing', 'modesDesc')}
        </p>
      </div>

      <div className="mode-selector">

        <div className="mode-tabs">
          {modes.map((mode) => (
            <button
              key={mode.id}
              className={
                activeMode === mode.id
                  ? 'mode-tab active'
                  : 'mode-tab'
              }
              onClick={() => setActiveMode(mode.id)}
            >
              <span>{mode.number}</span>
              {t('landing', mode.title)}
            </button>
          ))}
        </div>

        <div className="mode-display">

          <div className="mode-display-info">

            <span className="mode-live">
              {t('landing', 'modeLive')} {selectedMode.number}
            </span>

            <h3>{t('landing', selectedMode.title)}</h3>

            <strong>{t('landing', selectedMode.subtitle)}</strong>

            <p>{t('landing', selectedMode.description)}</p>

            <div className="mode-stats">
              {selectedMode.stats.map((stat) => (
                <span key={stat}>{t('landing', stat)}</span>
              ))}
            </div>

            <Link
              to={activeMode === '1v1' ? '/duel' : '/challenges'}
              className="mode-action"
            >
              {t('landing', 'modesCta')}
              <span>→</span>
            </Link>

          </div>

          <div className="mode-visual">

            <div className="mode-visual-grid" />

            <div className="mode-visual-center">
              <span>{t('landing', 'modeVisualBug')}</span>

              <strong>
                #{activeMode === 'solo'
                  ? '1842'
                  : activeMode === '1v1'
                    ? '2071'
                    : activeMode === 'boss'
                      ? '9999'
                      : '2026'}
              </strong>

              <small>
                {t('landing', selectedMode.title)}
              </small>
            </div>

          </div>

        </div>

      </div>

    </section>
  )
}

export default GameModes
