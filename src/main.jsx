import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

import App from './App'

import './styles/variables.css'
import './styles/globals.css'
import './styles/components.css'
import './styles/AppShell.css'
import './styles/rtl.css'
import './styles/vibefarsi.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)
