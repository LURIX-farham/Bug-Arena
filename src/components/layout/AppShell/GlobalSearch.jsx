import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useI18n } from '../../../i18n/useI18n'
import { getLocalizedChallenge } from '../../../i18n/languageUtils'

import { allChallenges } from '../../../data/challenges'

const searchItems = [
  {
    titleKey: 'homeTitle',
    descriptionKey: 'homeDescription',
    path: '/home',
    categoryKey: 'categoryNavigation',
  },
  {
    titleKey: 'challengesTitle',
    descriptionKey: 'challengesDescription',
    path: '/challenges',
    categoryKey: 'categoryNavigation',
  },
  {
    titleKey: 'arenaTitle',
    descriptionKey: 'arenaDescription',
    path: '/challenges/1001',
    categoryKey: 'categoryNavigation',
  },
  {
    titleKey: 'leaderboardTitle',
    descriptionKey: 'leaderboardDescription',
    path: '/leaderboard',
    categoryKey: 'categoryNavigation',
  },
  {
    titleKey: 'profileTitle',
    descriptionKey: 'profileDescription',
    path: '/profile',
    categoryKey: 'categoryNavigation',
  },
  {
    titleKey: 'replaysTitle',
    descriptionKey: 'replaysDescription',
    path: '/replays',
    categoryKey: 'categoryProgression',
  },
  {
    titleKey: 'achievementsTitle',
    descriptionKey: 'achievementsDescription',
    path: '/achievements',
    categoryKey: 'categoryProgression',
  },
]

const getSearchResults = (items, value) => items.filter((item) =>
  `${item.title} ${item.description} ${item.category || ''} ${(item.tags || []).join(' ')}`
    .toLowerCase()
    .includes(value.toLowerCase())
)

function GlobalSearch({ open, onClose }) {
  const { t, language } = useI18n()
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const navigate = useNavigate()

  const searchableItems = useMemo(() => [
    ...searchItems.map((item) => ({
      title: t('searchCatalog', item.titleKey),
      description: t('searchCatalog', item.descriptionKey),
      path: item.path,
      category: t('searchCatalog', item.categoryKey),
    })),
    ...allChallenges.map((challenge) => {
      const localized = getLocalizedChallenge(challenge, language)
      return {
        title: localized.title,
        description: localized.description,
        path: `/challenges/${challenge.id}`,
        category: challenge.category,
        tags: challenge.tags,
      }
    }),
  ], [t, language])

  const results = getSearchResults(searchableItems, query)

  const handleSelect = useCallback((path) => {
    navigate(path)
    onClose()
    setQuery('')
    setActiveIndex(0)
  }, [navigate, onClose])

  useEffect(() => {
    if (!open) return

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose()
        return
      }

      const currentResults = getSearchResults(searchableItems, query)

      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setActiveIndex((current) => Math.min(current + 1, Math.max(currentResults.length - 1, 0)))
        return
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault()
        setActiveIndex((current) => Math.max(current - 1, 0))
        return
      }

      if (event.key === 'Enter' && currentResults[activeIndex]) {
        event.preventDefault()
        handleSelect(currentResults[activeIndex].path)
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, onClose, activeIndex, query, handleSelect, searchableItems])

  if (!open) return null

  return (
    <div
      className="global-search-overlay"
      onMouseDown={onClose}
    >

      <div
        className="global-search"
        onMouseDown={(event) =>
          event.stopPropagation()
        }
      >

        <div className="global-search-input">

          <span>⌕</span>

          <input
            autoFocus
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setActiveIndex(0)
            }}
            placeholder={t('search', 'placeholder')}
          />

          <kbd>ESC</kbd>

        </div>

        <div className="global-search-results">

          {results.length > 0 ? (
            results.map((item, index) => (
              <button
                key={item.path}
                className={`search-result ${index === activeIndex ? 'active' : ''}`}
                onClick={() =>
                  handleSelect(item.path)
                }
              >

                <div className="search-result-icon">
                  ◈
                </div>

                <div className="search-result-content">

                  <strong>
                    {item.title}
                  </strong>

                  <span>
                    {item.description}
                  </span>

                </div>

                <small>
                  {item.category}
                </small>

              </button>
            ))
          ) : (
            <div className="search-empty">
              {t('search', 'noResults')}
            </div>
          )}

        </div>

        <div className="global-search-footer">
          <span>
            {t('searchCatalog', 'footerNavigate')}
          </span>

          <span>
            {t('searchCatalog', 'footerSelect')}
          </span>

          <span>
            {t('searchCatalog', 'footerClose')}
          </span>
        </div>

      </div>

    </div>
  )
}

export default GlobalSearch