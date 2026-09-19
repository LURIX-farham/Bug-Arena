import { useEffect, useMemo, useState } from 'react'

import { I18nContext } from './context'
import { translations } from './translations'

const STORAGE_KEY = 'bug-arena:language'


function getInitialLanguage() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return stored === 'fa' || stored === 'en' ? stored : 'en'
  } catch {
    return 'en'
  }
}

export function I18nProvider({ children }) {
  const [language, setLanguage] = useState(getInitialLanguage)

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, language)
    } catch {
      // The UI should remain usable even when storage is unavailable.
    }
    document.documentElement.lang = language
    document.documentElement.dir = language === 'fa' ? 'rtl' : 'ltr'
    document.body.dataset.language = language
  }, [language])

  const value = useMemo(() => ({
    language,
    setLanguage,
    isRTL: language === 'fa',
    t: (section, key) => translations[language]?.[section]?.[key] ?? translations.en?.[section]?.[key] ?? key,
    languages: ['en', 'fa'],
  }), [language])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export default I18nProvider
