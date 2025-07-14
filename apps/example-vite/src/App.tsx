import { useState } from 'react'
import { SqlAnalyzer } from '@meta-sql/core'

function App() {
  const [sqlInput, setSqlInput] = useState('SELECT name, email FROM users WHERE active = 1')
  const [analysis, setAnalysis] = useState<any>(null)
  const [error, setError] = useState<string>('')

  const analyzer = new SqlAnalyzer()

  const handleAnalyze = () => {
    try {
      setError('')
      const result = analyzer.analyze(sqlInput)
      setAnalysis(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setAnalysis(null)
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Meta-SQL Analyzer</h1>
        <p>Analyze SQL queries and extract metadata</p>
      </header>

      <main className="main-content">
        <div className="input-section">
          <label htmlFor="sql-input">SQL Query:</label>
          <textarea
            id="sql-input"
            value={sqlInput}
            onChange={(e) => setSqlInput(e.target.value)}
            placeholder="Enter your SQL query here..."
            rows={6}
            className="sql-input"
          />
          <button onClick={handleAnalyze} className="analyze-btn">
            Analyze Query
          </button>
        </div>

        {error && (
          <div className="error">
            <h3>Error:</h3>
            <p>{error}</p>
          </div>
        )}

        {analysis && (
          <div className="results">
            <h2>Analysis Results</h2>
            
            <div className="result-section">
              <h3>Query Information</h3>
              <div className="info-grid">
                <div className="info-item">
                  <strong>Type:</strong> {analysis.query.type}
                </div>
                <div className="info-item">
                  <strong>Complexity:</strong> 
                  <span className={`complexity ${analysis.estimatedComplexity.toLowerCase()}`}>
                    {analysis.estimatedComplexity}
                  </span>
                </div>
              </div>
            </div>

            <div className="result-section">
              <h3>Tables</h3>
              <div className="tags">
                {analysis.query.tables.map((table: string, index: number) => (
                  <span key={index} className="tag table-tag">{table}</span>
                ))}
              </div>
            </div>

            <div className="result-section">
              <h3>Columns</h3>
              <div className="tags">
                {analysis.query.columns.map((column: string, index: number) => (
                  <span key={index} className="tag column-tag">{column}</span>
                ))}
              </div>
            </div>

            {analysis.query.conditions && analysis.query.conditions.length > 0 && (
              <div className="result-section">
                <h3>Conditions</h3>
                <div className="conditions">
                  {analysis.query.conditions.map((condition: string, index: number) => (
                    <div key={index} className="condition">{condition}</div>
                  ))}
                </div>
              </div>
            )}

            <div className="result-section">
              <h3>Dependencies</h3>
              <div className="tags">
                {analysis.dependencies.map((dep: string, index: number) => (
                  <span key={index} className="tag dependency-tag">{dep}</span>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
