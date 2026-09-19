import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { allChallenges } from '../../data/challenges'
import { DIFFICULTIES, filterChallenges, getChallengeTags, sortChallenges } from '../../data/challengeUtils'
import { isChallengeCompleted } from '../../services/submissionStore'
import { useI18n } from '../../i18n/useI18n'
import { getLocalizedChallenge } from '../../i18n/languageUtils'

import './Challenges.css'

function Challenges() {
  const { t, language } = useI18n()
  const [activeDifficulty, setActiveDifficulty] = useState('ALL')
  const [activeTag, setActiveTag] = useState('ALL')
  const [sort, setSort] = useState('DEFAULT')
  const [query, setQuery] = useState('')

  const tags = useMemo(() => getChallengeTags(allChallenges), [])
  const filteredChallenges = useMemo(() => {
    const filtered = filterChallenges(allChallenges, {
      difficulty: activeDifficulty,
      tag: activeTag,
      query,
    })
    return sortChallenges(filtered, sort)
  }, [activeDifficulty, activeTag, query, sort])

  const clearFilters = () => {
    setActiveDifficulty('ALL')
    setActiveTag('ALL')
    setSort('DEFAULT')
    setQuery('')
  }

  return (
    <div className="challenges-page">
      <div className="challenges-header">
        <div>
          <span className="eyebrow">{t('challenges', 'eyebrow')}</span>
          <h1>
            {t('challenges', 'title1')}
            <br />
            {t('challenges', 'title2')}
          </h1>
          <p>
            {t('challenges', 'description')}
          </p>
        </div>

        <div className="challenge-count">
          <span>{t('challenges', 'showing')}</span>
          <strong>{filteredChallenges.length}</strong>
        </div>
      </div>

      <div className="challenge-toolbar">
        <label className="challenge-search">
          <span>⌕</span>
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
        {tags.map((tag) => (
          <button
            key={tag}
            className={`tag-filter ${activeTag === tag ? 'active' : ''}`}
            onClick={() => setActiveTag(tag)}
          >
            {tag === 'ALL' ? t('challenges', 'allTopics') : `#${tag}`}
          </button>
        ))}
      </div>

      <div className="challenge-grid">
        {filteredChallenges.map((rawChallenge) => {
          const challenge = getLocalizedChallenge(rawChallenge, language)
          const completed = isChallengeCompleted(challenge.id)
          const coreTests = challenge.evaluation.tests.filter((test) => test.type === 'core').length
          const hiddenTests = challenge.evaluation.tests.filter((test) => test.type === 'hidden').length

          return (
            <Link
              to={`/challenges/${challenge.id}`}
              className={`challenge-card ${completed ? 'challenge-completed-card' : ''}`}
              key={challenge.id}
            >
              <div className="challenge-card-top">
                <span>{t('challenges', 'bug')} #{challenge.id}</span>
                <div className="challenge-card-status">
                  <span className="challenge-difficulty">{challenge.difficulty.toUpperCase()}</span>
                  {completed && <span className="challenge-completed">{t('challenges', 'completed')}</span>}
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
                <span className="challenge-arrow">→</span>
              </div>
            </Link>
          )
        })}
      </div>

      {filteredChallenges.length === 0 && (
        <div className="challenges-empty">
          <span>◌</span>
          <strong>{t('challenges', 'noFound')}</strong>
          <p>{t('challenges', 'noFoundBody')}</p>
          <button className="filter active" onClick={clearFilters}>{t('common', 'clear')}</button>
        </div>
      )}
    </div>
  )
}

export default Challenges
