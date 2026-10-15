import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { allChallenges } from '../../data/challenges'
import { DIFFICULTIES, filterChallenges, getChallengeTags, sortChallenges } from '../../data/challengeUtils'
import { isChallengeCompleted } from '../../services/submissionStore'
import { useI18n } from '../../i18n/useI18n'
import { getLocalizedChallenge } from '../../i18n/languageUtils'
import { ArrowRight, CircleDashed, Search } from 'lucide-react'
import {
  AnimatedCounter,
  AnimatedList,
  BlurText,
  DotGrid,
  GradientText,
  Magnet,
  ShinyText,
  SpotlightCard,
} from '../../components/reactbits'
import { useTheme } from '../../theme/useTheme'
import './Challenges.css'

function Challenges() {
  const { t, language } = useI18n()
  const { isDark } = useTheme()
  const [activeDifficulty, setActiveDifficulty] = useState('ALL')
  const [activeTag, setActiveTag] = useState('ALL')
  const [sort, setSort] = useState('DEFAULT')
  const [query, setQuery] = useState('')
  const [showAllTags, setShowAllTags] = useState(false)

  const tags = useMemo(() => getChallengeTags(allChallenges), [])
  const filteredChallenges = useMemo(() => {
    const filtered = filterChallenges(allChallenges, {
      difficulty: activeDifficulty,
      tag: activeTag,
      query,
    })
    return sortChallenges(filtered, sort)
  }, [activeDifficulty, activeTag, query, sort])

  // 40+ topic chips were three rows of noise: show the first dozen and keep
  // the active tag visible even when it is hidden behind "show all".
  const COLLAPSED_TAGS = 12
  const visibleTags = showAllTags || tags.length <= COLLAPSED_TAGS + 2
    ? tags
    : [...tags.slice(0, COLLAPSED_TAGS), ...(activeTag !== 'ALL' && !tags.slice(0, COLLAPSED_TAGS).includes(activeTag) ? [activeTag] : [])]
  const hiddenTagCount = tags.length - visibleTags.length

  const clearFilters = () => {
    setActiveDifficulty('ALL')
    setActiveTag('ALL')
    setSort('DEFAULT')
    setQuery('')
  }

  // Featured hunt — the first unsolved bug in the catalogue, independent
  // of the active filters so the "next up" card never flickers while
  // the player narrows the archive.
  const featured = allChallenges.find((item) => !isChallengeCompleted(item.id)) || null
  const solvedCount = allChallenges.filter((item) => isChallengeCompleted(item.id)).length
  const solvedPercent = allChallenges.length
    ? Math.round((solvedCount / allChallenges.length) * 100)
    : 0

  // DotGrid palette — canvas can't resolve CSS vars, pass concrete colors.
  // Active dots mirror --primary (blueprint accent), never green.
  const dotBase = isDark ? 'rgba(154, 161, 172, 0.16)' : 'rgba(71, 85, 105, 0.13)'
  const dotActive = isDark ? 'rgba(61, 126, 255, 0.7)' : 'rgba(30, 86, 224, 0.45)'

  const renderCard = (rawChallenge) => {
    const challenge = getLocalizedChallenge(rawChallenge, language)
    const completed = isChallengeCompleted(challenge.id)
    const coreTests = challenge.evaluation.tests.filter((test) => test.type === 'core').length
    const hiddenTests = challenge.evaluation.tests.filter((test) => test.type === 'hidden').length
    const isFeatured = featured && challenge.id === featured.id

    const card = (
      <SpotlightCard
        as={Link}
        to={`/challenges/${challenge.id}`}
        key={challenge.id}
        className={`challenge-card ${completed ? 'challenge-completed-card' : ''}${isFeatured ? ' challenge-featured-card' : ''}`}
        spotlightColor={
          completed
            ? 'rgba(var(--success-rgb), 0.16)'
            : 'rgba(var(--accent-rgb), 0.2)'
        }
      >
        <div className="challenge-card-top">
          <span className="challenge-id-chip">{t('challenges', 'bug')} #{challenge.id}</span>
          <div className="challenge-card-status">
            <span className={`challenge-difficulty difficulty--${challenge.difficulty.toLowerCase()}`}>{challenge.difficulty.toUpperCase()}</span>
            {completed && <span className="challenge-completed">{t('challenges', 'completed')}</span>}
            {isFeatured && <span className="challenge-next-chip"><ShinyText text={t('challenges', 'nextUp')} speed={3.2} /></span>}
          </div>
        </div>

        <div className="challenge-card-body">
          <span className="challenge-category">{challenge.category.toUpperCase()}</span>
          <h2>{challenge.title}</h2>
          <p>{challenge.description}</p>
        </div>

        <div className="challenge-card-stats">
          <span>{coreTests} {t('challenges', 'core')}</span>
          <span>{hiddenTests} {t('challenges', 'hidden')}</span>
          <span>{challenge.baseScore} {t('challenges', 'pts')}</span>
          <span>{Math.floor(challenge.timeLimit / 60)} {t('challenges', 'min')}</span>
        </div>

        <div className="challenge-card-bottom">
          <div className="challenge-tags">
            {challenge.tags.map((tag) => <span key={tag}>#{tag}</span>)}
          </div>
          <span className="challenge-arrow" aria-hidden="true"><ArrowRight size={15} strokeWidth={1.75} /></span>
        </div>
      </SpotlightCard>
    )

    // The featured hunt gets a static accent edge (no animated beams —
    // they fight with the card grid and add glow noise).
    return isFeatured ? (
      <div key={challenge.id} className="challenge-featured">
        {card}
      </div>
    ) : card
  }

  return (
    <div className="challenges-page">

      {/* ============ HERO — ARCHIVE FIELD ============ */}
      <section className="challenges-hero bp-grid" aria-labelledby="challenges-hero-title">
        <div className="challenges-hero-layers" aria-hidden="true">
          <DotGrid
            className="challenges-hero-dots"
            gap={24}
            dotSize={1.4}
            baseColor={dotBase}
            activeColor={dotActive}
            proximity={120}
          />
          <div className="challenges-hero-vignette" />
        </div>

        <div className="challenges-header">
          <div>
            <BlurText
              as="span"
              className="eyebrow challenges-hero-eyebrow"
              text={t('challenges', 'eyebrow')}
              animateBy="words"
              delay={22}
              direction="bottom"
              stepDuration={0.2}
            />
            <h1 id="challenges-hero-title">
              {t('challenges', 'title1')}
              <br />
              <GradientText
                as="span"
                colors={['var(--primary)', 'var(--tertiary)', 'var(--secondary)']}
                animationSpeed={7}
                pauseOnHover
              >
                {t('challenges', 'title2')}
              </GradientText>
            </h1>
            <BlurText
              as="p"
              text={t('challenges', 'description')}
              animateBy="words"
              delay={26}
              direction="bottom"
              stepDuration={0.3}
            />
          </div>

          <div className="challenge-count">
            <span>{t('challenges', 'showing')}</span>
            <strong>
              <AnimatedCounter
                value={filteredChallenges.length}
                duration={1.2}
              />
            </strong>
            <div
              className="challenge-count-track"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={solvedPercent}
              aria-label={`${t('home', 'statsSolved')} ${solvedPercent}%`}
            >
              <span className="challenge-count-fill" style={{ width: `${solvedPercent}%` }} />
            </div>
            <small className="challenge-count-meta">
              {solvedCount}/{allChallenges.length} {t('home', 'statsSolved')}
            </small>
          </div>
        </div>
      </section>

      <div className="challenge-toolbar">
        <label className="challenge-search">
          <span className="challenge-search-icon" aria-hidden="true"><Search size={16} strokeWidth={1.75} /></span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('challenges', 'searchPlaceholder')}
            aria-label={t('challenges', 'searchAria')}
          />
        </label>

        <label className="challenge-sort">
          <span>{t('challenges', 'sort')}</span>
          <select value={sort} onChange={(event) => setSort(event.target.value)}>
            <option value="DEFAULT">{t('challenges', 'default')}</option>
            <option value="DIFFICULTY">{t('challenges', 'difficulty')}</option>
            <option value="SCORE">{t('challenges', 'highestScore')}</option>
            <option value="TIME">{t('challenges', 'shortestTime')}</option>
          </select>
        </label>
      </div>

      <div className="challenge-filters">
        {DIFFICULTIES.map((difficulty) => (
          <button
            key={difficulty}
            className={`filter ${activeDifficulty === difficulty ? 'active' : ''}`}
            onClick={() => setActiveDifficulty(difficulty)}
            aria-pressed={activeDifficulty === difficulty}
          >
            {difficulty === 'ALL'
              ? t('common', 'all')
              : difficulty === 'EASY'
                ? t('common', 'easy')
                : difficulty === 'MEDIUM'
                  ? t('common', 'medium')
                  : difficulty === 'HARD'
                    ? t('common', 'hard')
                    : t('challenges', 'expert')}
          </button>
        ))}
      </div>

      <div className="challenge-tags-filter">
        {visibleTags.map((tag) => (
          <button
            key={tag}
            className={`tag-filter ${activeTag === tag ? 'active' : ''}`}
            onClick={() => setActiveTag(tag)}
            aria-pressed={activeTag === tag}
          >
            {tag === 'ALL' ? t('challenges', 'allTopics') : `#${tag}`}
          </button>
        ))}
        {tags.length > COLLAPSED_TAGS + 2 && (
          <button
            type="button"
            className="tag-filter tag-filter--toggle"
            onClick={() => setShowAllTags((value) => !value)}
            aria-expanded={showAllTags}
          >
            {showAllTags ? t('ux', 'showFewerTags') : `${t('ux', 'showAllTags')} (+${hiddenTagCount})`}
          </button>
        )}
      </div>

      <AnimatedList
        className="challenge-grid"
        delay={60}
        initialDelay={120}
        as="div"
      >
        {filteredChallenges.map(renderCard)}
      </AnimatedList>

      {filteredChallenges.length === 0 && (
        <div className="challenges-empty">
          <span className="challenges-empty-icon" aria-hidden="true"><CircleDashed size={18} strokeWidth={1.75} /></span>
          <strong>{t('challenges', 'noFound')}</strong>
          <p>{t('challenges', 'noFoundBody')}</p>
          <Magnet padding={24} magnetStrength={5} maxOffset={5}>
            <button className="filter active" onClick={clearFilters}>{t('common', 'clear')}</button>
          </Magnet>
        </div>
      )}
    </div>
  )
}

export default Challenges
