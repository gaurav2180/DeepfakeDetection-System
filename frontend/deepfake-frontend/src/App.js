import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import './App.css';
import attachedImage from './assets/deepfake-detection-visual.jpg';

const HISTORY_STORAGE_KEY = 'deepfake_analysis_history_v1';
const MAX_HISTORY_ITEMS = 30;

const App = () => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [activePage, setActivePage] = useState('home');
  const [isFirstHomeAppearance, setIsFirstHomeAppearance] = useState(true);
  const [analysisHistory, setAnalysisHistory] = useState(() => {
    try {
      const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (_err) {
      return [];
    }
  });
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);
  const resultRef = useRef(null);

  useEffect(() => {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(analysisHistory));
  }, [analysisHistory]);

  useEffect(() => {
    const elements = document.querySelectorAll('.reveal-on-scroll');
    if (!elements.length) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.16, rootMargin: '0px 0px -8% 0px' }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [analysisResult, analysisHistory.length, error, uploading, analyzing, activePage]);

  const navigateToPage = (page) => {
    setActivePage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openAnalyzer = () => {
    setActivePage('home');
    setTimeout(() => {
      document.getElementById('analyzer')?.scrollIntoView({ behavior: 'smooth' });
    }, 0);
  };

  useEffect(() => {
    if (activePage !== 'home' && isFirstHomeAppearance) {
      setIsFirstHomeAppearance(false);
    }
  }, [activePage, isFirstHomeAppearance]);

  const addToHistory = (result) => {
    const entry = {
      id: Date.now(),
      filename: result.filename || file?.name || 'Unknown',
      prediction: result.prediction,
      confidence: result.confidence,
      createdAt: new Date().toISOString(),
    };
    setAnalysisHistory((prev) => [entry, ...prev].slice(0, MAX_HISTORY_ITEMS));
  };

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      if (selectedFile.size > 100 * 1024 * 1024) {
        setError('File size too large. Please select a video under 100MB.');
        return;
      }
      setFile(selectedFile);
      setError('');
      setUploadResult(null);
      setAnalysisResult(null);
    }
  };

  const pollAnalysisResult = async (jobId) => {
    const start = Date.now();
    const timeoutMs = 5 * 60 * 1000;
    const intervalMs = 2500;

    while (Date.now() - start < timeoutMs) {
      const statusResponse = await axios.get(
        `http://localhost:5000/api/analyze_status/${jobId}`
      );
      const status = statusResponse.data;

      if (status.status === 'completed') {
        return status.result;
      }
      if (status.status === 'failed') {
        throw new Error(status.error || 'Analysis failed. Please try again.');
      }

      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }

    throw new Error('Analysis timed out. Please try again.');
  };

  const handleUpload = async () => {
    if (!file) return;
    const formData = new FormData();
    formData.append('video', file);
    setUploading(true);
    setError('');
    try {
      const uploadResponse = await axios.post('http://localhost:5000/api/upload', formData);
      setUploadResult(uploadResponse.data);
      setUploading(false);
      setAnalyzing(true);
      const analyzeResponse = await axios.post(
        `http://localhost:5000/api/analyze_async/${uploadResponse.data.filename}`
      );
      const result = await pollAnalysisResult(analyzeResponse.data.job_id);
      setAnalysisResult(result);
      addToHistory(result);
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth' }), 200);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Analysis failed. Please try again.');
    } finally {
      setUploading(false);
      setAnalyzing(false);
    }
  };

  const resetForm = () => {
    setFile(null);
    setUploadResult(null);
    setAnalysisResult(null);
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const AnalysisFrequencyGraph = ({ history }) => {
    const stats = useMemo(() => {
      const total = history.length;
      const fake = history.filter((item) => item.prediction === 'deepfake').length;
      const real = total - fake;
      const fakePct = total > 0 ? Math.round((fake / total) * 100) : 0;
      const realPct = total > 0 ? 100 - fakePct : 0;
      return { total, fake, real, fakePct, realPct };
    }, [history]);

    const recentItems = history.slice(0, 12).reverse();
    const timeline = useMemo(() => {
      const now = new Date();
      const labels = [];
      const buckets = [];

      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        const label = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        labels.push(label);
        buckets.push({ key, fake: 0, real: 0 });
      }

      const map = new Map(buckets.map((b) => [b.key, b]));
      history.forEach((item) => {
        const key = (item.createdAt || '').slice(0, 10);
        const b = map.get(key);
        if (!b) return;
        if (item.prediction === 'deepfake') b.fake += 1;
        else b.real += 1;
      });

      const maxY = Math.max(1, ...buckets.map((b) => b.fake), ...buckets.map((b) => b.real));

      return {
        labels,
        buckets,
        maxY,
      };
    }, [history]);

    return (
      <div className="freq-card reveal-on-scroll">
        <div className="freq-header">
          <div>
            <h3>Analysis Frequency</h3>
            <p>Distribution of fake vs real detections</p>
          </div>
          {stats.total > 0 && (
            <button
              className="freq-clear-btn"
              onClick={() => setAnalysisHistory([])}
            >
              Clear History
            </button>
          )}
        </div>

        {stats.total === 0 ? (
          <div className="freq-empty">
            No data yet. Analyze videos to build the frequency graph.
          </div>
        ) : (
          <div className="freq-grid">
            <div className="freq-donut-wrap">
              <div
                className="freq-donut"
                style={{
                  background: `conic-gradient(#ef4444 0% ${stats.fakePct}%, #22c55e ${stats.fakePct}% 100%)`,
                }}
              >
                <div className="freq-donut-center">
                  <span>{stats.total}</span>
                  <small>Analyses</small>
                </div>
              </div>

              <div className="freq-legend">
                <div className="freq-legend-item">
                  <span className="freq-dot fake"></span>
                  <span>Deepfake</span>
                  <strong>{stats.fake}</strong>
                </div>
                <div className="freq-legend-item">
                  <span className="freq-dot real"></span>
                  <span>Real</span>
                  <strong>{stats.real}</strong>
                </div>
              </div>
            </div>

            <div className="freq-bars-wrap">
              <div className="freq-bar-row">
                <div className="freq-bar-head">
                  <span>Deepfake Frequency</span>
                  <strong>{stats.fakePct}%</strong>
                </div>
                <div className="freq-bar-track">
                  <div
                    className="freq-bar-fill fake"
                    style={{ width: `${stats.fakePct}%` }}
                  ></div>
                </div>
              </div>

              <div className="freq-bar-row">
                <div className="freq-bar-head">
                  <span>Real Frequency</span>
                  <strong>{stats.realPct}%</strong>
                </div>
                <div className="freq-bar-track">
                  <div
                    className="freq-bar-fill real"
                    style={{ width: `${stats.realPct}%` }}
                  ></div>
                </div>
              </div>

              <div className="freq-trend">
                <div className="freq-trend-head">Recent Detection Trend</div>
                <div className="freq-trend-bars">
                  {recentItems.map((item) => (
                    <div
                      key={item.id}
                      className={`freq-trend-bar ${item.prediction === 'deepfake' ? 'fake' : 'real'}`}
                      title={`${item.filename} - ${item.prediction}`}
                    ></div>
                  ))}
                </div>
              </div>

              <div className="freq-line-chart">
                <div className="freq-trend-head">7 Day Frequency Graph</div>
                <div className="freq-bar-chart">
                  {timeline.buckets.map((b, idx) => (
                    <div className="freq-day-group" key={`${b.key}-${idx}`}>
                      <div className="freq-day-bars">
                        <div
                          className="freq-day-bar real"
                          style={{ height: `${Math.max(6, Math.round((b.real / timeline.maxY) * 100))}%` }}
                          title={`Real: ${b.real}`}
                        ></div>
                        <div
                          className="freq-day-bar fake"
                          style={{ height: `${Math.max(6, Math.round((b.fake / timeline.maxY) * 100))}%` }}
                          title={`Deepfake: ${b.fake}`}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="freq-chart-labels">
                  {timeline.labels.map((label) => (
                    <span key={label}>{label}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const ResultCard = ({ result }) => {
    const isDeepfake = result.prediction === 'deepfake';
    const confidence = Math.round((result.confidence || 0) * 100);
    const hScore = result.heuristic_analysis?.score ?? 100;
    const warnings = result.heuristic_analysis?.warnings ?? [];

    // ✅ FIXED: Scores always consistent with verdict
    const fakeScore = isDeepfake ? confidence : 100 - confidence;
    const realScore = isDeepfake ? 100 - confidence : confidence;

    const getRisk = () => {
      if (!isDeepfake) return { text: 'LOW RISK', color: '#22c55e' };
      if (confidence >= 85) return { text: 'HIGH RISK', color: '#ef4444' };
      if (confidence >= 70) return { text: 'MEDIUM RISK', color: '#f97316' };
      return { text: 'SUSPICIOUS', color: '#facc15' };
    };
    const risk = getRisk();

    return (
      <div className="result-unified-card">

        {/* ── BANNER ── */}
        <div className={`result-banner ${isDeepfake ? 'banner-fake' : 'banner-real'}`}>
          <div className="banner-left">
            <span className="banner-icon">{isDeepfake ? '🚨' : '✅'}</span>
            <div>
              <div className="banner-title">
                {isDeepfake ? 'DEEPFAKE DETECTED' : 'AUTHENTIC VIDEO'}
              </div>
              <div className="banner-sub">
                Analysis complete · {result.processing_time ?? '—'}s processing time
              </div>
            </div>
          </div>
          <span className="risk-pill" style={{ background: risk.color }}>
            {risk.text}
          </span>
        </div>

        {/* ── CONFIDENCE BAR ── */}
        <div className="rc-section">
          <div className="conf-row">
            <span className="conf-label">Detection Confidence</span>
            <span className="conf-number" style={{ color: isDeepfake ? '#ef4444' : '#22c55e' }}>
              {confidence}%
            </span>
          </div>
          <div className="conf-track">
            <div
              className="conf-fill"
              style={{
                width: `${confidence}%`,
                background: isDeepfake
                  ? 'linear-gradient(90deg,#ef4444,#dc2626)'
                  : 'linear-gradient(90deg,#22c55e,#16a34a)',
              }}
            />
          </div>
          <div className="conf-ends"><span>0%</span><span>100%</span></div>
        </div>

      {/* ── SCORE BOXES ── */}
<div className="rc-section rc-scores">
  <div className="rc-score-box">
    <div className="rc-score-label">Real Score</div>
    <div className="rc-score-val" style={{ color: '#22c55e' }}>
      {realScore}%
    </div>
  </div>
  <div className="rc-score-box">
    <div className="rc-score-label">Fake Score</div>
    <div className="rc-score-val" style={{ color: '#ef4444' }}>
      {fakeScore}%
    </div>
  </div>

  {/* ✅ RENAMED + TOOLTIP */}
  <div className="rc-score-box rc-score-box-tip">
    <div className="rc-score-label">
      Integrity Score
      <span className="rc-tooltip-icon">ⓘ
        <span className="rc-tooltip-text">
          Starts at 100. Points deducted for suspicious patterns like compression artifacts,
          lighting inconsistencies, unusual frame rates, or too few faces detected.
          Lower = more suspicious.
        </span>
      </span>
    </div>
    <div
      className="rc-score-val"
      style={{ color: hScore >= 60 ? '#22c55e' : hScore >= 40 ? '#f97316' : '#ef4444' }}
    >
      {hScore}/100
    </div>
  </div>
</div>

        {/* ── WARNINGS (only if any) ── */}
        {warnings.length > 0 && (
          <div className="rc-section">
            <div className="rc-warnings">
              <div className="rc-warnings-title">⚠️ Suspicious Patterns Detected</div>
              {warnings.map((w, i) => (
                <div className="rc-warning-item" key={i}>{w}</div>
              ))}
            </div>
          </div>
        )}

        {/* ── VERDICT ── */}
        <div className="rc-section">
          <div className={`rc-verdict ${isDeepfake ? 'rc-verdict-fake' : 'rc-verdict-real'}`}>
            {isDeepfake
              ? `This video shows signs of AI manipulation with ${confidence}% confidence. We recommend treating this content as potentially synthetic.`
              : `This video appears authentic with ${confidence}% confidence. No significant manipulation patterns were detected.`
            }
          </div>
        </div>

        {/* ── BUTTON ── */}
        <div className="rc-section">
          <button className="rc-reset-btn" onClick={resetForm}>
            Analyze Another Video
          </button>
        </div>

      </div>
    );
  };

  return (
    <div className="app">

      {/* NAVBAR */}
      <nav className="navbar reveal-on-scroll">
        <div className="nav-container">
          <div className="nav-logo">
            <span className="logo-text">DeepFake AI</span>
          </div>
          <div className="nav-links">
            <button
              type="button"
              className={`nav-link ${activePage === 'home' ? 'active' : ''}`}
              onClick={() => navigateToPage('home')}
            >
              Home
            </button>
            <button
              type="button"
              className={`nav-link ${activePage === 'features' ? 'active' : ''}`}
              onClick={() => navigateToPage('features')}
            >
              Features
            </button>
            <button
              type="button"
              className={`nav-link ${activePage === 'documentation' ? 'active' : ''}`}
              onClick={() => navigateToPage('documentation')}
            >
              Documentation
            </button>
            <button
              type="button"
              className={`nav-link ${activePage === 'about' ? 'active' : ''}`}
              onClick={() => navigateToPage('about')}
            >
              About
            </button>
          </div>
          <button type="button" className="nav-cta" onClick={openAnalyzer}>Start Analysis</button>
        </div>
      </nav>

      {/* HERO */}
      {activePage === 'home' && (
      <section
        id="home"
        className={`hero reveal-on-scroll ${isFirstHomeAppearance ? 'hero-first-appearance' : ''}`}
      >
        <div className="hero-container">
          <div className="hero-content reveal-on-scroll">
            <h1 className="hero-title">
              The Smarter Way<br />to Detect Deepfakes
            </h1>
            <p className="hero-subtitle">
              AI-powered deepfake detection using advanced ResNet-Swish-BiLSTM neural
              networks that learn and adapt to emerging threats.
            </p>
            <div className="hero-buttons">
              <button
                className="btn-primary"
                onClick={openAnalyzer}
              >
                Start AI Analysis
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => navigateToPage('documentation')}
              >
                Get Demo
              </button>
            </div>
          </div>
          <div className="hero-image reveal-on-scroll">
            <img src={attachedImage} alt="Deepfake Detection Visual" />
          </div>
        </div>
      </section>
      )}

      {activePage === 'features' && (
      <section id="features" className="info-section reveal-on-scroll">
        <div className="info-section-inner">
          <div className="info-section-head reveal-on-scroll">
            <h2>Features</h2>
            <p>Detection tools designed for fast validation and practical risk analysis.</p>
          </div>
          <div className="info-grid">
            <article className="info-card reveal-on-scroll">
              <h3>Hybrid Detection Pipeline</h3>
              <p>Combines learned visual patterns with heuristic checks for stronger reliability than one-method detectors.</p>
            </article>
            <article className="info-card reveal-on-scroll">
              <h3>Frequency Intelligence</h3>
              <p>Tracks fake versus real detection frequency over time, helping teams quickly spot suspicious content surges.</p>
            </article>
            <article className="info-card reveal-on-scroll">
              <h3>Asynchronous Processing</h3>
              <p>Keeps the interface responsive with queued analysis and status polling for smooth user experience.</p>
            </article>
            <article className="info-card reveal-on-scroll">
              <h3>Transparent Scoring</h3>
              <p>Displays confidence, real/fake scores, integrity score, and warning signals so decisions are auditable.</p>
            </article>
          </div>
        </div>
      </section>
      )}

      {activePage === 'documentation' && (
      <section id="documentation" className="info-section reveal-on-scroll">
        <div className="info-section-inner">
          <div className="info-section-head reveal-on-scroll">
            <h2>Documentation</h2>
            <p>Quick guide to operate the detector workflow from upload to result interpretation.</p>
          </div>
          <div className="doc-steps">
            <div className="doc-step reveal-on-scroll">
              <span>1</span>
              <div>
                <h4>Upload Video</h4>
                <p>Select a supported format (`MP4`, `AVI`, `MOV`, `MKV`) up to `100MB`.</p>
              </div>
            </div>
            <div className="doc-step reveal-on-scroll">
              <span>2</span>
              <div>
                <h4>Run Analysis</h4>
                <p>Analysis executes in background and returns prediction, confidence, and metadata summary.</p>
              </div>
            </div>
            <div className="doc-step reveal-on-scroll">
              <span>3</span>
              <div>
                <h4>Review Risk Indicators</h4>
                <p>Use confidence bands, integrity score, and suspicious-pattern warnings for decision support.</p>
              </div>
            </div>
            <div className="doc-step reveal-on-scroll">
              <span>4</span>
              <div>
                <h4>Monitor Frequency Graph</h4>
                <p>Observe fake vs real trends to identify shifts in incoming content quality.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
      )}

      {activePage === 'about' && (
      <section id="about" className="info-section reveal-on-scroll">
        <div className="info-section-inner">
          <div className="info-section-head reveal-on-scroll">
            <h2>About</h2>
            <p>DeepFake AI helps teams verify media authenticity with interpretable AI outputs and fast operational flow.</p>
          </div>
          <div className="about-strip reveal-on-scroll">
            <div className="about-metric">
              <strong>Detection Engine</strong>
              <small>ML Decisioning</small>
            </div>
            <div className="about-metric">
              <strong>Real-time UX</strong>
              <small>Async Backend + Smooth Frontend</small>
            </div>
            <div className="about-metric">
              <strong>Actionable Output</strong>
              <small>Risk Tier + Explainable Signals</small>
            </div>
          </div>
        </div>
      </section>
      )}

      {/* DASHBOARD */}
      {activePage === 'home' && (
      <section id="analyzer" className="dashboard reveal-on-scroll">
        <div className="dashboard-container">
          <div className="main-content reveal-on-scroll">
            <div className="task-manager">
              {/* <h2 className="section-title">Deepfake Detector</h2> */}
              <AnalysisFrequencyGraph history={analysisHistory} />

              
              {/* UPLOAD — hidden when result shown */}
              {!analysisResult && (
                <div className="upload-section reveal-on-scroll">
                  <div className="upload-card reveal-on-scroll">
                    <div className="upload-icon">📁</div>
                    <h3>Upload Video for AI Analysis</h3>
                    <p>Advanced neural networks will analyze your video for deepfake patterns</p>
                    <p className="upload-formats">
                      Supports: MP4, AVI, MOV, MKV · Max size: 100MB
                    </p>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="video/*"
                      onChange={handleFileChange}
                      style={{ display: 'none' }}
                    />

                    <button
                      className="upload-btn primary"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Choose File
                    </button>

                    {file && (
                      <div className="file-upload-action-row">
                        <div className="file-card-mini">
                          <span className="file-card-icon">🎬</span>
                          <div>
                            <span className="file-card-filename" title={file.name}>
                              {file.name}
                            </span>
                            <div className="file-card-meta">
                              {(file.size / 1024 / 1024).toFixed(2)} MB · {file.type}
                            </div>
                          </div>
                          <button className="file-card-remove" onClick={resetForm}>×</button>
                        </div>
                        <button
                          className="analyze-btn-mini"
                          onClick={handleUpload}
                          disabled={uploading || analyzing}
                        >
                          {uploading ? 'Uploading...' : analyzing ? 'Analyzing...' : 'Start Analysis'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* LOADING */}
              {(uploading || analyzing) && (
                <div className="loading-section reveal-on-scroll">
                  <div className="loading-spinner"></div>
                  <p style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                    {uploading ? '⬆️ Uploading video...' : '🤖 AI is analyzing frames...'}
                  </p>
                  {analyzing && (
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>
                      This may take 20–60 seconds depending on video length
                    </p>
                  )}
                </div>
              )}

              {/* ERROR */}
              {error && (
                <div className="error-card reveal-on-scroll">
                  <div className="error-icon">⚠️</div>
                  <div className="error-content">
                    <h4>Analysis Error</h4>
                    <p>{error}</p>
                  </div>
                </div>
              )}

              {/* RESULT */}
              {analysisResult && (
                <div ref={resultRef} className="results-section reveal-on-scroll">
                  <ResultCard result={analysisResult} />
                </div>
              )}

            </div>
          </div>
        </div>
      </section>
      )}

      {/* FOOTER */}
      <footer className="footer-container reveal-on-scroll">
        <div className="footer-inner reveal-on-scroll">
          <div className="footer-left">
            <h2 className="footer-logo">DeepFake AI</h2>
            <p className="footer-description">Detecting deepfakes with cutting-edge AI technology.</p>
            <p className="footer-copy">© {new Date().getFullYear()} DeepFake AI. All rights reserved.</p>
          </div>
          <div className="footer-right">
            <div className="footer-links-group">
              <h4 className="footer-links-title">Product</h4>
              <button type="button" className="footer-link footer-link-btn" onClick={() => navigateToPage('features')}>Features</button>
              <button type="button" className="footer-link footer-link-btn" onClick={openAnalyzer}>Analyzer</button>
              <button type="button" className="footer-link footer-link-btn" onClick={() => navigateToPage('documentation')}>Documentation</button>
            </div>
            <div className="footer-links-group">
              <h4 className="footer-links-title">Company</h4>
              <button type="button" className="footer-link footer-link-btn" onClick={() => navigateToPage('about')}>About</button>
              <button type="button" className="footer-link footer-link-btn" onClick={() => navigateToPage('home')}>Home</button>
              <button type="button" className="footer-link footer-link-btn" onClick={openAnalyzer}>Contact</button>
            </div>
            <div className="footer-links-group">
              <h4 className="footer-links-title">Resources</h4>
              <button type="button" className="footer-link footer-link-btn" onClick={() => navigateToPage('documentation')}>Guide</button>
              <button type="button" className="footer-link footer-link-btn" onClick={() => navigateToPage('features')}>Use Cases</button>
              <button type="button" className="footer-link footer-link-btn" onClick={() => navigateToPage('about')}>Privacy & Terms</button>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default App;
