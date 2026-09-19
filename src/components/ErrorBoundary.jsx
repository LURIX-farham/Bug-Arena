import { Component } from 'react'

import { useI18n } from '../i18n/useI18n'

function ErrorFallback({ onReload }) {
  const { t } = useI18n()

  return (
    <main className="app-error-page">
      <div className="app-error-card">
        <span className="app-error-eyebrow">{t('errorPage', 'eyebrow')}</span>
        <h1>{t('errorPage', 'title')}</h1>
        <p>{t('errorPage', 'description')}</p>
        <button type="button" onClick={onReload}>{t('errorPage', 'reload')} →</button>
      </div>
    </main>
  )
}

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    console.error('Bug Arena UI error:', error, info)
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children
    }

    return <ErrorFallback onReload={this.handleReload} />
  }
}

export default ErrorBoundary
