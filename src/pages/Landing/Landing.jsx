import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import Navbar from '../../components/navigation/Navbar'

import ProductStats from './sections/ProductStats'
import HowItWorks from './sections/HowItWorks'
import WhyBugArena from './sections/WhyBugArena'

import '../../styles/Landing.css'
import GameModes from './sections/GameModes'
import ChallengeShowcase from './sections/ChallengeShowcase'
import CompetitiveSystem from './sections/CompetitiveSystem'

import LeaderboardPreview from './sections/LeaderboardPreview'
import ReplayShowcase from './sections/ReplayShowcase'
import LandingFooter from './sections/LandingFooter'

import useScrollReveal from '../../hooks/useScrollReveal'
import { useI18n } from '../../i18n/useI18n'
import { Aurora, BlurText, GradientText } from '../../components/reactbits'

function Landing() {
  const { t } = useI18n()
  const [demoState, setDemoState] = useState('idle')

  useEffect(() => {
    const sequence = [
      ['testing', 1800],
      ['failed', 1800],
      ['fixing', 1800],
      ['success', 2500],
      ['idle', 1000],
    ]

    let timer
    let index = 0

    const runSequence = () => {
      const [state, duration] = sequence[index]

      setDemoState(state)

      timer = setTimeout(() => {
        index = (index + 1) % sequence.length
        runSequence()
      }, duration)
    }

    runSequence()


    return () => clearTimeout(timer)
  }, [])
  useScrollReveal()
  return (
    <div className="landing">

      <Navbar />

      <main>

        {/* HERO */}

        <section className="hero hero-with-aurora">
          <div className="hero-aurora-bg" aria-hidden="true">
            <Aurora
              colorStops={['#5227FF', '#7cff67', '#5227FF']}
              amplitude={1.0}
              blend={0.55}
            />
          </div>

          <div className="hero-content">

            <span className="hero-eyebrow">
              {t('landing', 'heroEyebrow')}
            </span>

            <h1 className="hero-title-animated">
              <BlurText
                text={t('landing', 'heroTitle1')}
                delay={80}
                animateBy="words"
                direction="top"
                className="hero-blur-line"
              />
              <br />
              <GradientText
                colors={['#6366f1', '#a78bfa', '#22d3ee', '#6366f1']}
                animationSpeed={6}
                className="hero-gradient-accent"
              >
                {t('landing', 'heroTitleAccent')}
              </GradientText>
              <br />
              <BlurText
                text={t('landing', 'heroTitle3')}
                delay={120}
                animateBy="words"
                direction="top"
                className="hero-blur-line"
              />
            </h1>

            <p className="hero-description">
              {t('landing', 'heroDescription')}
            </p>

            <div className="hero-actions">

              <Link
                to="/challenges"
                className="hero-primary"
              >
                {t('landing', 'heroPrimaryCta')}
                <span>→</span>
              </Link>

              <a
                href="#how-it-works"
                className="hero-secondary"
              >
                {t('landing', 'heroSecondaryCta')}
              </a>

            </div>

          </div>

          <div className={`hero-demo demo-${demoState}`}>

            <div className="code-window">

              <div className="code-header">

                <div className="window-dots">
                  <span />
                  <span />
                  <span />
                </div>

                <span>challenge.py</span>

                <span className="code-status">
                  {t('landing', 'challengeLanguage')}
                </span>

              </div>

              <div className="code-body">

                <div className="line">
                  <span>01</span>
                  <code>def calculate_average(data):</code>
                </div>

                <div className="line">
                  <span>02</span>
                  <code>    total = 0</code>
                </div>

                <div className="line error-line">
                  <span>03</span>
                  <code>    for value in data:</code>
                </div>

                <div className="line">
                  <span>04</span>
                  <code>        total += value</code>
                </div>

                <div className="line">
                  <span>05</span>
                  <code>    return total</code>
                </div>

              </div>

              <div className="code-footer">

                <span className="demo-status">
                  {demoState === 'testing' && t('landing', 'demoStatusTesting')}
                  {demoState === 'failed' && t('landing', 'demoStatusFailed')}
                  {demoState === 'fixing' && t('landing', 'demoStatusFixing')}
                  {demoState === 'success' && t('landing', 'demoStatusSuccess')}
                  {demoState === 'idle' && t('landing', 'demoStatusIdle')}
                </span>

                <span>{t('landing', 'demoBugId')}</span>

              </div>

            </div>

            <div className="demo-result">

              <span>
                {demoState === 'success'
                  ? t('landing', 'demoBugFixed')
                  : t('landing', 'demoRating')
                }
              </span>

              <strong>
                {demoState === 'success'
                  ? '+742'
                  : '1842'
                }
              </strong>

            </div>

          </div>

        </section>

        <div className="reveal">
          <ProductStats />
        </div>

        <div className="reveal">
          <HowItWorks />
        </div>

        <div className="reveal">
          <WhyBugArena />
        </div>

        <div className="reveal">
          <GameModes />
        </div>

        <div className="reveal">
          <ChallengeShowcase />
        </div>

        <div className="reveal">
          <CompetitiveSystem />
        </div>

        <div className="reveal">
          <LeaderboardPreview />
        </div>

        <div className="reveal">
          <ReplayShowcase />
        </div>
        <div className='reveal'>
          <LandingFooter />
        </div>
      </main>

    </div>
  )
}

export default Landing
