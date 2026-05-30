import React from 'react'
import './Header.css'

const Header = ({ activeTab, setActiveTab }) => {
  return (
    <header className="header">
      <div className="header-content">
        <div className="logo">
          <h1>ShieldMail</h1>
        </div>
        <nav className="nav-tabs">
          <button
            className={`nav-tab ${activeTab === 'predict' ? 'active' : ''}`}
            onClick={() => setActiveTab('predict')}
          >
            Predict
          </button>
          <button
            className={`nav-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            Dashboard
          </button>
          <button
            className={`nav-tab ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            History
          </button>
        </nav>
      </div>
    </header>
  )
}

export default Header

