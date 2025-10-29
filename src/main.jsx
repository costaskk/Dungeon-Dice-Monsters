import React from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/ddm.css'
import './styles/Animations.css'
import App from './App'

const rootEl = document.getElementById('root')
if (!rootEl) {
  throw new Error('Root element #root not found. Make sure index.html contains <div id="root"></div>.')
}

createRoot(rootEl).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
