import React, { useState, useEffect } from 'react'
import './App.css'
import EmailInputForm from './components/EmailInputForm'
import PredictionResults from './components/PredictionResults'
import StatisticsDashboard from './components/StatisticsDashboard'
import PredictionHistory from './components/PredictionHistory'
import Header from './components/Header'

function App() {
  const [prediction, setPrediction] = useState(null)
  const [predictions, setPredictions] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('predict')

  // use relative URL in development or environment variable for production
  const API_BASE_URL = import.meta.env.VITE_API_URL || ''

  useEffect(() => {
    fetchStats()
    fetchPredictions()
  }, [])

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/stats`)
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (err) {
      console.error('Error fetching stats:', err)
    }
  }

  const fetchPredictions = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/predictions?limit=50`)
      if (response.ok) {
        const data = await response.json()
        setPredictions(data)
      }
    } catch (err) {
      console.error('Error fetching predictions:', err)
    }
  }

  const handlePredict = async (text) => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`${API_BASE_URL}/api/predict`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      })

      if (!response.ok) {
        let errorMessage = 'Prediction failed'
        try {
          const errorData = await response.json()
          errorMessage = errorData.detail || errorMessage
        } catch (e) {
          // if response is not JSON use status text
          errorMessage = response.statusText || errorMessage
        }
        throw new Error(errorMessage)
      }

      const data = await response.json()
      setPrediction(data)
      
      // refresh stats and predictions
      await Promise.all([fetchStats(), fetchPredictions()])
      
      // keep user on predict tab (results are shown there)
      // scroll to results after a brief delay to allow render
      setTimeout(() => {
        const resultsElement = document.querySelector('.prediction-results')
        if (resultsElement) {
          resultsElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      }, 100)
    } catch (err) {
      // provide more helpful error messages
      if (err.message.includes('Failed to fetch') || err.message.includes('Load failed') || err.name === 'TypeError') {
        setError('Cannot connect to backend server. Please make sure the backend is running on http://localhost:8000')
      } else {
        setError(err.message)
      }
      setPrediction(null)
    } finally {
      setLoading(false)
    }
  }

  const handleDeletePrediction = async (predictionId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/predictions/${predictionId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await Promise.all([fetchStats(), fetchPredictions()])
        // clear current prediction if it was deleted
        if (prediction && prediction.prediction_id === predictionId) {
          setPrediction(null)
        }
      }
    } catch (err) {
      console.error('Error deleting prediction:', err)
    }
  }

  const handleGenerateSampleData = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`${API_BASE_URL}/api/generate-sample-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        let errorMessage = 'Failed to generate sample data'
        try {
          const errorData = await response.json()
          errorMessage = errorData.detail || errorMessage
        } catch (e) {
          errorMessage = response.statusText || errorMessage
        }
        throw new Error(errorMessage)
      }

      // refresh stats and predictions after generating sample data
      await Promise.all([fetchStats(), fetchPredictions()])
    } catch (err) {
      if (err.message.includes('Failed to fetch') || err.message.includes('Load failed') || err.name === 'TypeError') {
        setError('Cannot connect to backend server. Please make sure the backend is running on http://localhost:8000')
      } else {
        setError(err.message)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="App">
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <div className="container">
        {activeTab === 'predict' && (
          <div className="tab-content">
            <EmailInputForm 
              onPredict={handlePredict} 
              loading={loading}
              error={error}
            />
            {prediction && (
              <PredictionResults prediction={prediction} />
            )}
          </div>
        )}

        {activeTab === 'dashboard' && (
          <div className="tab-content">
            <StatisticsDashboard 
              stats={stats}
              predictions={predictions}
            />
          </div>
        )}

        {activeTab === 'history' && (
          <div className="tab-content">
            <PredictionHistory 
              predictions={predictions}
              onDelete={handleDeletePrediction}
              onRefresh={fetchPredictions}
              onGenerateSampleData={handleGenerateSampleData}
              loading={loading}
              stats={stats}
            />
          </div>
        )}
      </div>
      
      <footer className="footer">
        <div className="footer-content">
          <p>&copy; {new Date().getFullYear()} ShieldMail. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}

export default App

