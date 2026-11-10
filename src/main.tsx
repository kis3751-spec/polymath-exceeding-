import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import AccountSession from './components/AccountSession'
import './styles.css'
import './workspace-screens.css'
import './ivc.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AccountSession>
      <App />
    </AccountSession>
  </React.StrictMode>,
)
