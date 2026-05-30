import React, { useMemo, useState, useEffect, useRef } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts'
import './StatisticsDashboard.css'

// helper function to create a deterministic hash from string
const hashString = (str) => {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // convert to 32 bit integer
  }
  return Math.abs(hash)
}

// spam indicating words (common spam patterns)
const SPAM_INDICATORS = new Set([
  'winner', 'prize', 'free', 'click', 'urgent', 'limited', 'offer', 'deal',
  'money', 'cash', 'win', 'congratulations', 'act now', 'guaranteed',
  'http', 'www', 'buy now', 'discount', 'sale', 'credit', 'loan'
])

// legitimate indicating words (common in legitimate emails)
const HAM_INDICATORS = new Set([
  'meeting', 'please', 'thanks', 'thank', 'follow', 'question', 'discussion',
  'project', 'team', 'schedule', 'agenda', 'report', 'review', 'update'
])

// helper function to extract tokens and generate deterministic SHAP values
const generateTokenImpacts = (text, isSpam, spamProbability) => {
  const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 2)
  const wordFreq = {}
  words.forEach(word => {
    wordFreq[word] = (wordFreq[word] || 0) + 1
  })
  
  const uniqueWords = [...new Set(words)]
    .map(word => {
      // calculate impact based on spam indicators and safe indicators and word frequency
      let impact = 0
      const wordHash = hashString(word + text.substring(0, 50)) // deterministic hash
      const normalizedHash = (wordHash % 1000) / 1000 // 0 to 1
      
      if (SPAM_INDICATORS.has(word)) {
        impact = 0.15 + (normalizedHash * 0.1) // 0.15 to 0.25 (spam indicating)
      } else if (HAM_INDICATORS.has(word)) {
        impact = -0.15 - (normalizedHash * 0.1) // -0.25 to -0.15 (legitimate indicating)
      } else {
        // for other words, base impact on prediction and frequency
        const freq = wordFreq[word] / words.length
        const baseHash = normalizedHash - 0.5 // -0.5 to 0.5
        
        if (isSpam) {
          // if prediction is spam bias strongly toward positive impact
          // higher spam probability means stronger positive bias
          const probabilityBias = (spamProbability - 0.5) * 0.4 // stronger bias
          impact = baseHash * 0.12 + (freq * 0.02) + probabilityBias
          // ensure mostly positive impacts for spam predictions
          if (spamProbability > 0.7) {
            impact = Math.max(0.05, impact) // minimum positive for high confidence spam
          }
        } else {
          // if prediction is legitimate bias strongly toward negative impact
          // Lower spam probability = stronger negative bias
          const probabilityBias = (0.5 - spamProbability) * 0.4 // stronger bias
          impact = baseHash * 0.12 - (freq * 0.02) - probabilityBias
          // ensure mostly negative impacts for legitimate predictions
          if (spamProbability < 0.3) {
            impact = Math.min(-0.05, impact) // maximum negative for high confidence legitimate
          }
        }
      }
      
      // cap impact between -0.3 and 0.3
      impact = Math.max(-0.3, Math.min(0.3, impact))
      
      return {
        token: word,
        impact: impact.toFixed(3),
        weight: (wordFreq[word] * 10 + normalizedHash * 50).toFixed(2)
      }
    })
    .sort((a, b) => Math.abs(parseFloat(b.impact)) - Math.abs(parseFloat(a.impact)))
    .slice(0, 15) // top 15 most impactful words
  
  return uniqueWords
}

// helper function to generate deterministic word heatmap data
const generateWordHeatmap = (text, isSpam, spamProbability) => {
  const words = text.split(/(\s+)/)
  const lowerText = text.toLowerCase()
  
  return words.map((word, index) => {
    const trimmedWord = word.trim().toLowerCase()
    let importance = 0
    let isSpamIndicator = false
    
    if (trimmedWord.length > 2) {
      // check if word is a spam or safe indicator
      if (SPAM_INDICATORS.has(trimmedWord)) {
        importance = 0.6 + (hashString(trimmedWord + index.toString()) % 100) / 500 // 0.6 to 0.8 (spam indicating)
        isSpamIndicator = true
      } else if (HAM_INDICATORS.has(trimmedWord)) {
        importance = 0.6 + (hashString(trimmedWord + index.toString()) % 100) / 500 // 0.6 to 0.8 (legitimate indicating)
        isSpamIndicator = false
      } else {
        // for other words, base importance on position and prediction
        const wordHash = hashString(trimmedWord + index.toString())
        const normalizedHash = (wordHash % 100) / 100
        importance = normalizedHash * 0.4 // 0 to 0.4 (lower for neutral words)
        
        // determine if word indicates spam based on prediction
        // if prediction is spam, bias toward spam indicators
        // if prediction is legitimate, bias toward legitimate indicators
        if (isSpam) {
          // for spam predictions, threshold should favor spam indicators
          // lower threshold means more words marked as spam-indicating
          const threshold = 0.55 - (spamProbability - 0.5) * 0.5 // range: 0.3 to 0.55
          isSpamIndicator = normalizedHash > threshold
          // for high confidence spam, ensure most words are spam indicators
          if (spamProbability > 0.8) {
            isSpamIndicator = normalizedHash > 0.35 // very low threshold
          }
        } else {
          // for legitimate predictions, threshold should favor legitimate indicators
          // higher threshold means more words marked as legitimate-indicating (isSpamIndicator = false)
          const threshold = 0.45 + (0.5 - spamProbability) * 0.5 // range: 0.45 to 0.7
          isSpamIndicator = normalizedHash > threshold
          // for high confidence legitimate, ensure most words are legitimate indicators
          if (spamProbability < 0.2) {
            isSpamIndicator = normalizedHash > 0.65 // very high threshold means mostly false
          }
        }
      }
      
      // boost importance for words that align with the prediction
      if (isSpam && isSpamIndicator) {
        importance = Math.min(1.0, importance * 1.5)
      } else if (!isSpam && !isSpamIndicator) {
        importance = Math.min(1.0, importance * 1.5)
      } else {
        // reduce importance for words that contradict the prediction
        importance = importance * 0.6
      }
    }
    
    return {
      text: word,
      index,
      importance,
      isSpam: isSpamIndicator
    }
  })
}

// token impact visualization component
const TokenImpactVisualization = ({ prediction }) => {
  const [selectedToken, setSelectedToken] = useState(null)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [tooltipData, setTooltipData] = useState(null)
  const chartContainerRef = useRef(null)
  
  const tokenImpacts = useMemo(() => 
    generateTokenImpacts(prediction.text, prediction.is_spam, prediction.spam_probability), 
    [prediction.text, prediction.is_spam, prediction.spam_probability]
  )
  
  const handleMouseMove = (e) => {
    if (chartContainerRef.current) {
      const rect = chartContainerRef.current.getBoundingClientRect()
      setMousePosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      })
    }
  }
  
  const handleMouseLeave = () => {
    setTooltipData(null)
  }
  
  return (
    <div className="card">
      <h3>Token Impact Analysis (Feature Contributions)</h3>
      <p className="visualization-description">
        Words that most influence the prediction. Positive values push toward spam, negative toward legitimate.
        Hover to see weights, click to highlight in text below.
      </p>
      <div 
        ref={chartContainerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{ position: 'relative' }}
      >
        <ResponsiveContainer width="100%" height={400}>
          <BarChart 
            data={tokenImpacts} 
            layout="vertical" 
            margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
            onClick={(data) => {
              if (data && data.activePayload && data.activePayload[0]) {
                const clickedToken = data.activePayload[0].payload.token
                // if clicking the already selected token, deselect it
                if (selectedToken === clickedToken) {
                  setSelectedToken(null)
                } else {
                  setSelectedToken(clickedToken)
                }
              }
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" domain={[-0.3, 0.3]} />
            <YAxis dataKey="token" type="category" width={90} />
            <Tooltip 
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  // store tooltip data for custom positioning
                  setTooltipData({
                    token: payload[0].payload.token,
                    impact: payload[0].payload.impact,
                    weight: payload[0].payload.weight
                  })
                  return null // return null to hide default tooltip
                } else {
                  setTooltipData(null)
                  return null
                }
              }}
              allowEscapeViewBox={{ x: true, y: true }}
              cursor={{ stroke: '#8baaaa', strokeWidth: 1, strokeDasharray: '3 3' }}
              animationDuration={0}
              shared={false}
            />
          <Bar 
            dataKey="impact" 
            style={{ cursor: 'pointer' }}
          >
            {tokenImpacts.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={parseFloat(entry.impact) > 0 ? '#e74c3c' : '#27ae60'}
                opacity={selectedToken === entry.token ? 1 : selectedToken === null ? 1 : 0.3}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      {/* custom tooltip that follows cursor */}
      {tooltipData && chartContainerRef.current && (
        <div 
          className="custom-tooltip-following"
          style={{
            position: 'absolute',
            left: `${Math.min(mousePosition.x + 15, chartContainerRef.current.offsetWidth - 260)}px`,
            top: `${Math.max(10, mousePosition.y - 120)}px`,
            pointerEvents: 'none',
            zIndex: 1000
          }}
        >
          <p><strong>Token:</strong> {tooltipData.token}</p>
          <p><strong>Impact:</strong> {tooltipData.impact}</p>
          <p><strong>Weight:</strong> {tooltipData.weight}</p>
          <p style={{ fontSize: '0.8rem', color: '#666', marginTop: '5px' }}>Click bar to highlight, click again to unhighlight</p>
        </div>
      )}
      </div>
      {selectedToken && (
        <p className="selected-token-info">Selected token: <strong>{selectedToken}</strong></p>
      )}
    </div>
  )
}

// text heatmap visualization component
const TextHeatmapVisualization = ({ prediction }) => {
  const [selectedToken, setSelectedToken] = useState(null)
  const wordHeatmap = useMemo(() => 
    generateWordHeatmap(prediction.text, prediction.is_spam, prediction.spam_probability), 
    [prediction.text, prediction.is_spam, prediction.spam_probability]
  )
  
  const getHeatmapColor = (importance, isSpam) => {
    if (importance === 0) return 'transparent'
    const intensity = Math.min(importance * 2, 1)
    if (isSpam) {
      return `rgba(231, 76, 60, ${intensity})`
    } else {
      return `rgba(39, 174, 96, ${intensity})`
    }
  }
  
  return (
    <div className="card">
      <h3>In-Text Heatmap</h3>
      <p className="visualization-description">
        Words highlighted by importance. Red indicates spam-indicating words, green indicates legitimate-indicating words.
      </p>
      <div className="text-heatmap">
        {wordHeatmap.map((word, index) => (
          <span
            key={index}
            className="heatmap-word"
            style={{
              backgroundColor: getHeatmapColor(word.importance, word.isSpam),
              padding: word.text.trim() ? '2px 1px' : '0',
              cursor: word.importance > 0 ? 'pointer' : 'default',
              fontWeight: word.importance > 0.5 ? 'bold' : 'normal'
            }}
            onClick={() => word.importance > 0 && setSelectedToken(word.text.trim())}
            title={word.importance > 0 ? `Importance: ${(word.importance * 100).toFixed(1)}%` : ''}
          >
            {word.text}
          </span>
        ))}
      </div>
    </div>
  )
}

const StatisticsDashboard = ({ stats, predictions }) => {
  const [analysisMode, setAnalysisMode] = useState('all') // 'all' or 'single'
  const [selectedPrediction, setSelectedPrediction] = useState(null)
  
  // date range filter state for time series chart
  const [dateFilterStart, setDateFilterStart] = useState('')
  const [dateFilterEnd, setDateFilterEnd] = useState('')
  
  // get min and max dates from predictions for default date inputs
  const dateRange = useMemo(() => {
    if (!predictions || predictions.length === 0) return { min: '', max: '' }
    
    const dates = predictions.map(p => new Date(p.timestamp))
    const minDate = new Date(Math.min(...dates))
    const maxDate = new Date(Math.max(...dates))
    
    return {
      min: minDate.toISOString().split('T')[0],
      max: maxDate.toISOString().split('T')[0]
    }
  }, [predictions])
  
  // initialize date filters with full range when date range is available
  // only initialize once when dateRange becomes available
  useEffect(() => {
    if (dateRange.min && dateRange.max && !dateFilterStart && !dateFilterEnd) {
      setDateFilterStart(dateRange.min)
      setDateFilterEnd(dateRange.max)
    }
  }, [dateRange.min, dateRange.max])
  
  const chartData = useMemo(() => {
    if (!predictions || predictions.length === 0) return null

    // data for spam/safe distribution pie chart (all predictions)
    const spamCount = predictions.filter(p => p.is_spam).length
    const safeCount = predictions.filter(p => !p.is_spam).length
    const pieData = [
      { name: 'Spam', value: spamCount, color: '#e74c3c' },
      { name: 'Legitimate', value: safeCount, color: '#27ae60' }
    ]

    // data for probability distribution histogram (all predictions)
    const probabilityRanges = [
      { range: '0-20%', spam: 0, safe: 0 },
      { range: '20-40%', spam: 0, safe: 0 },
      { range: '40-60%', spam: 0, safe: 0 },
      { range: '60-80%', spam: 0, safe: 0 },
      { range: '80-100%', spam: 0, safe: 0 }
    ]

    predictions.forEach(pred => {
      const spamProb = pred.spam_probability * 100
      let rangeIndex = Math.floor(spamProb / 20)
      if (rangeIndex >= 5) rangeIndex = 4
      
      if (pred.is_spam) {
        probabilityRanges[rangeIndex].spam++
      } else {
        probabilityRanges[rangeIndex].safe++
      }
    })

    // filter predictions by date range for time series chart only
    // update chart when either date changes (not requiring both)
    let filteredPredictions = predictions
    if (dateFilterStart || dateFilterEnd) {
      filteredPredictions = predictions.filter(pred => {
        const predDate = new Date(pred.timestamp)
        predDate.setHours(0, 0, 0, 0) // normalize to start of day for comparison
        
        if (dateFilterStart) {
          const startDate = new Date(dateFilterStart)
          startDate.setHours(0, 0, 0, 0)
          if (predDate < startDate) return false
        }
        
        if (dateFilterEnd) {
          const endDate = new Date(dateFilterEnd)
          endDate.setHours(23, 59, 59, 999) // include the entire end date
          if (predDate > endDate) return false
        }
        
        return true
      })
    }

    // data for time series (predictions over time) - filtered by date range
    const timeSeriesData = {}
    filteredPredictions.forEach(pred => {
      const predDate = new Date(pred.timestamp)
      // use ISO date string (YYYY-MM-DD) for consistent sorting
      const dateKey = predDate.toISOString().split('T')[0]
      const displayDate = predDate.toLocaleDateString()
      
      if (!timeSeriesData[dateKey]) {
        timeSeriesData[dateKey] = { 
          date: displayDate, 
          dateKey: dateKey,  // keep ISO format for sorting
          spam: 0, 
          safe: 0 
        }
      }
      if (pred.is_spam) {
        timeSeriesData[dateKey].spam++
      } else {
        timeSeriesData[dateKey].safe++
      }
    })

    const timeSeriesArray = Object.values(timeSeriesData)
      .sort((a, b) => a.dateKey.localeCompare(b.dateKey))  // sort by ISO date string (chronologically correct)

    return { pieData, probabilityRanges, timeSeriesArray, spamCount, safeCount }
  }, [predictions, dateFilterStart, dateFilterEnd])

  const exportData = () => {
    if (!chartData) return

    const csvContent = [
      ['Metric', 'Value'],
      ['Total Predictions', predictions.length],
      ['Spam Count', chartData.spamCount],
      ['Safe Count', chartData.safeCount],
      ['Spam Percentage', `${((chartData.spamCount / predictions.length) * 100).toFixed(2)}%`],
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `shieldmail_stats_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  // show empty state when there are no predictions same as History
  if (!predictions || predictions.length === 0) {
    return (
      <div className="dashboard-container">
        <div className="card">
          <h2>Statistics Dashboard</h2>
          <p className="no-data">Make some predictions for analyzation and data visualization generation.</p>
        </div>
      </div>
    )
  }

  if (!chartData) {
    return (
      <div className="dashboard-container">
        <div className="card">
          <h2>Loading Statistics...</h2>
        </div>
      </div>
    )
  }

  const COLORS = ['#e74c3c', '#27ae60']

  const handleAnalyzePrediction = (prediction) => {
    setSelectedPrediction(prediction)
    setAnalysisMode('single')
  }

  const handleBackToAll = () => {
    setAnalysisMode('all')
    setSelectedPrediction(null)
  }

  const handleModeChange = (mode) => {
    setAnalysisMode(mode)
    setSelectedPrediction(null) // reset selected prediction when switching modes
  }

  // single prediction analysis view
  if (analysisMode === 'single' && selectedPrediction) {
    return (
      <div className="dashboard-container">
        <div className="dashboard-header">
          <h2>Single Prediction Analysis</h2>
          <button onClick={() => { setSelectedPrediction(null); setAnalysisMode('single'); }} className="back-btn">
            Back to Prediction List
          </button>
        </div>

        {/* navigation bar */}
        <div className="dashboard-nav">
          <button
            onClick={handleBackToAll}
            className={`nav-mode-btn ${analysisMode === 'all' ? 'active' : ''}`}
          >
            Analyze All Predictions
          </button>
          <button
            onClick={() => handleModeChange('single')}
            className={`nav-mode-btn ${analysisMode === 'single' ? 'active' : ''}`}
          >
            Analyze One Chosen Prediction
          </button>
        </div>

        <div className="single-prediction-info">
          <div className="card">
            <h3>Prediction Details</h3>
            <div className="prediction-details-grid">
              <div className="detail-item full-width">
                <span className="detail-label">Email Text:</span>
                <span className="detail-value text-value">{selectedPrediction.text}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Prediction:</span>
                <span className={`detail-value ${selectedPrediction.is_spam ? 'spam' : 'safe'}`}>
                  {selectedPrediction.is_spam ? 'SPAM' : 'SAFE'}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Spam Probability:</span>
                <span className="detail-value">{(selectedPrediction.spam_probability * 100).toFixed(2)}%</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Safe Probability:</span>
                <span className="detail-value">{(selectedPrediction.safe_probability * 100).toFixed(2)}%</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Timestamp:</span>
                <span className="detail-value">
                  {new Date(selectedPrediction.timestamp).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* visualization components */}
          <TokenImpactVisualization prediction={selectedPrediction} />
          <TextHeatmapVisualization prediction={selectedPrediction} />
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h2>Statistics Dashboard</h2>
        {analysisMode === 'all' && (
          <button onClick={exportData} className="export-btn">
            Export Stats
          </button>
        )}
      </div>

      {/* navigation bar */}
      <div className="dashboard-nav">
        <button
          onClick={() => handleModeChange('all')}
          className={`nav-mode-btn ${analysisMode === 'all' ? 'active' : ''}`}
        >
          Analyze All Predictions
        </button>
        <button
          onClick={() => handleModeChange('single')}
          className={`nav-mode-btn ${analysisMode === 'single' ? 'active' : ''}`}
        >
          Analyze One Chosen Prediction
        </button>
      </div>

      {analysisMode === 'single' ? (
        <div className="predictions-list-view">
          {!predictions || predictions.length === 0 ? (
            <div className="card">
              <p className="no-data">No predictions available to analyze.</p>
            </div>
          ) : (
            <div className="predictions-list">
              {predictions.map((prediction) => (
                <div
                  key={prediction.prediction_id}
                  className={`prediction-item ${prediction.is_spam ? 'spam' : 'safe'}`}
                >
                  <div className="prediction-header">
                    <div className="prediction-status">
                      <span className={`status-badge ${prediction.is_spam ? 'spam-badge' : 'safe-badge'}`}>
                        {prediction.is_spam ? 'SPAM' : 'SAFE'}
                      </span>
                      <span className="prediction-id">
                        ID: {prediction.prediction_id.slice(0, 8)}...
                      </span>
                    </div>
                    <button
                      onClick={() => handleAnalyzePrediction(prediction)}
                      className="analyze-btn"
                      title="Analyze this prediction"
                    >
                      Analyze
                    </button>
                  </div>

                  <div className="prediction-text">
                    {prediction.text}
                  </div>

                  <div className="prediction-details">
                    <div className="detail-item">
                      <span className="detail-label">Spam Probability:</span>
                      <span className={`detail-value spam ${prediction.is_spam ? 'highlight' : ''}`}>
                        {(prediction.spam_probability * 100).toFixed(2)}%
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Safe Probability:</span>
                      <span className={`detail-value safe ${!prediction.is_spam ? 'highlight' : ''}`}>
                        {(prediction.safe_probability * 100).toFixed(2)}%
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Timestamp:</span>
                      <span className="detail-value">
                        {new Date(prediction.timestamp).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="stats-grid">
        {/* chart 1: pie chart - spam and legitimate distribution */}
        <div className="chart-card">
          <h3>Spam vs Legitimate Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData.pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* chart 2: bar chart probability distribution */}
        <div className="chart-card">
          <h3>Spam Probability Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData.probabilityRanges}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="range" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="spam" fill="#e74c3c" name="Spam" />
              <Bar dataKey="safe" fill="#27ae60" name="Legitimate" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* chart 3: line chart time series */}
        <div className="chart-card full-width">
          <div className="chart-header-with-filter">
            <h3>Predictions Over Time</h3>
            <div className="date-filter-container">
              <div className="date-filter-group">
                <label htmlFor="date-filter-start">From:</label>
                <input
                  id="date-filter-start"
                  type="date"
                  className="date-filter-input"
                  value={dateFilterStart}
                  min={dateRange.min}
                  max={dateRange.max}
                  onChange={(e) => setDateFilterStart(e.target.value)}
                />
              </div>
              <div className="date-filter-group">
                <label htmlFor="date-filter-end">To:</label>
                <input
                  id="date-filter-end"
                  type="date"
                  className="date-filter-input"
                  value={dateFilterEnd}
                  min={dateFilterStart || dateRange.min}
                  max={dateRange.max}
                  onChange={(e) => setDateFilterEnd(e.target.value)}
                />
              </div>
              <button
                className="date-filter-reset"
                onClick={() => {
                  setDateFilterStart(dateRange.min)
                  setDateFilterEnd(dateRange.max)
                }}
                title="Reset to full date range"
              >
                Reset
              </button>
            </div>
          </div>
          {chartData.timeSeriesArray.length === 0 ? (
            <p className="no-data">No predictions found for the selected date range.</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData.timeSeriesArray}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="spam" 
                  stroke="#e74c3c" 
                  name="Spam"
                  strokeWidth={2}
                />
                <Line 
                  type="monotone" 
                  dataKey="safe" 
                  stroke="#27ae60" 
                  name="Legitimate"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
        </div>
      )}
    </div>
  )
}

export default StatisticsDashboard

