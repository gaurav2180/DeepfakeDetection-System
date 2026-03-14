// import React, { useState, useRef } from 'react';
// import axios from 'axios';
// import './App.css';
// import attachedImage from './assets/deepfake-detection-visual.jpg';  // Make sure the image is saved here

// const App = () => {
//   const [file, setFile] = useState(null);
//   const [uploading, setUploading] = useState(false);
//   const [analyzing, setAnalyzing] = useState(false);
//   const [uploadResult, setUploadResult] = useState(null);
//   const [analysisResult, setAnalysisResult] = useState(null);
//   const [error, setError] = useState('');
//   const fileInputRef = useRef(null);

//   const handleFileChange = (event) => {
//     const selectedFile = event.target.files[0];
//     if (selectedFile) {
//       if (selectedFile.size > 100 * 1024 * 1024) {
//         setError('File size too large. Please select a video under 100MB.');
//         return;
//       }
//       setFile(selectedFile);
//       setError('');
//       setUploadResult(null);
//       setAnalysisResult(null);
//     }
//   };

//   const handleUpload = async () => {
//     if (!file) return;

//     const formData = new FormData();
//     formData.append('video', file);

//     setUploading(true);
//     setError('');

//     try {
//       const uploadResponse = await axios.post('http://localhost:5000/api/upload', formData);
//       setUploadResult(uploadResponse.data);
//       setUploading(false);

//       setAnalyzing(true);
//       const analyzeResponse = await axios.post(
//         `http://localhost:5000/api/analyze/${uploadResponse.data.filename}`
//       );
//       setAnalysisResult(analyzeResponse.data);
//     } catch (err) {
//       setError(err.response?.data?.error || 'Analysis failed. Please try again.');
//     } finally {
//       setUploading(false);
//       setAnalyzing(false);
//     }
//   };

//   const resetForm = () => {
//     setFile(null);
//     setUploadResult(null);
//     setAnalysisResult(null);
//     setError('');
//     if (fileInputRef.current) {
//       fileInputRef.current.value = '';
//     }
//   };

//   return (
//     <div className="app">
//       {/* Navigation */}
//       <nav className="navbar">
//         <div className="nav-container">
//           <div className="nav-logo">
//             <span className="logo-text">DeepFake AI</span>
//           </div>
//           <div className="nav-links">
//             <a href="#" className="nav-link active">Home</a>
//             <a href="#" className="nav-link">Features</a>
//             <a href="#" className="nav-link">Documentation</a>
//             <a href="#" className="nav-link">About</a>            
//           </div>
//           <button className="nav-cta">Start Analysis</button>
//         </div>
//       </nav>

//       {/* Hero Section */}
//       <section className="hero">
//         <div className="hero-container">
//           <div className="hero-content">
//             <h1 className="hero-title">
//               The Smarter Way<br />
//               to Detect Deepfakes
//             </h1>
//             <p className="hero-subtitle">
//               AI-powered deepfake detection using advanced ResNet-Swish-BiLSTM neural networks that learn and adapt to emerging threats.
//             </p>
//             <div className="hero-buttons">
//               <button className="btn-primary" onClick={() => fileInputRef.current && fileInputRef.current.click()}>
//                 Start AI Analysis
//               </button>
//               <button className="btn-secondary">Get Demo</button>
//             </div>
//           </div>
//           <div className="hero-image">
//             <img src={attachedImage} alt="Deepfake Detection Visual" />
//           </div>
//         </div>
//       </section>

//       {/* Main Content */}
//       <section className="dashboard">
//         <div className="dashboard-container">
//           <div className="main-content">
//             <div className="content-header">
              
//               <div className="header-actions">
//                 <button className="action-btn">Choose Model</button>
//               </div>
//             </div>

//             <div className="task-manager">
//               <h2 className="section-title">Deepfake Detector</h2>

//               {/* Stats Cards */}
//               <div className="stats-grid">
//                 <div className="stat-card">
//                   <div className="stat-number">{analysisResult ? '1' : '0'}</div>
//                   <div className="stat-label">+ Videos Analyzed</div>
//                   <div className="stat-badge">Active</div>
//                 </div>

//                 <div className="stat-card">
//                   <div className="stat-number">{analysisResult ? Math.round(analysisResult.confidence * 100) : '0'}</div>
//                   <div className="stat-label">+ Confidence Score</div>
//                   <div className="stat-badge">In Progress</div>
//                 </div>

//                 <div className="stat-card">
//                   <div className="stat-number">{analysisResult ? analysisResult.faces_detected : '0'}</div>
//                   <div className="stat-label">+ Faces Detected</div>
//                   <div className="stat-badge">Complete</div>
//                 </div>
//               </div>

//               {/* Upload Section */}
//               <div className="upload-section">
//                 <div className="upload-card">
//                   <div className="upload-icon" style={{ animation: 'none' }}>📁</div>
//                   <h3>Upload Video for AI Analysis</h3>
//                   <p>Advanced neural networks will analyze your video for deepfake patterns</p>
//                   <p className="upload-formats">Supports: MP4, AVI, MOV, MKV · Max size: 100MB</p>

//                   <input
//                     id="video-upload-input"
//                     ref={fileInputRef}
//                     type="file"
//                     accept="video/*"
//                     onChange={handleFileChange}
//                     style={{ display: 'none' }}
//                   />

//                   <button
//                     className="upload-btn primary"
//                     onClick={() => fileInputRef.current && fileInputRef.current.click()}
//                   >
//                     Choose File
//                   </button>

//                {file && (
//   <div className="file-upload-action-row">
//     <div className="file-card-mini">
//       <span className="file-card-icon">🎬</span>
//       <div>
//         <span className="file-card-filename" title={file.name}>{file.name}</span>
//         <div className="file-card-meta">
//           {(file.size / 1024 / 1024).toFixed(2)} MB · {file.type}
//         </div>
//       </div>
//       <button className="file-card-remove" onClick={resetForm} title="Remove">×</button>
//     </div>
//     <button
//       className="analyze-btn-mini"
//       onClick={handleUpload}
//       disabled={uploading || analyzing}
//     >
//       {uploading ? 'Uploading...' : analyzing ? 'AI Analyzing...' : 'Start Analysis'}
//     </button>
//   </div>
// )}





//                 </div>
//               </div>

//               {/* Loading State */}
//               {(uploading || analyzing) && (
//                 <div className="loading-section">
//                   <div className="loading-spinner"></div>
//                   <p>{uploading ? 'Uploading video...' : 'Analyzing for deepfakes...'}</p>
//                 </div>
//               )}

//               {/* Error Display */}
//               {error && (
//                 <div className="error-card">
//                   <div className="error-icon">⚠️</div>
//                   <div className="error-content">
//                     <h4>Analysis Error</h4>
//                     <p>{error}</p>
//                   </div>
//                 </div>
//               )}

//               {/* Results Section */}
//               {analysisResult && (
//                 <div className="results-section">
//                   <div className="results-grid">
//                     <div className="result-card main-result">
//                       <div className="result-header">
//                         <h3>Detection Result</h3>
//                        <div className={`status-badge ${analysisResult.prediction}`} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
//   {analysisResult.prediction === 'deepfake' ? (
//     <>
//       <span role="img" aria-label="Warning" style={{ fontSize: '1.2em' }}>⚠️</span>
//       <span>DEEPFAKE</span>
//     </>
//   ) : (
//     <>
//       <span role="img" aria-label="Check" style={{ fontSize: '1.2em' }}>✅</span>
//       <span>Authentic</span>
//     </>
//   )}
// </div>

//                       </div>
//                       <div className="confidence-score">
//                         <div className="score-number">{Math.round(analysisResult.confidence * 100)}%</div>
//                         <div className="score-label">Confidence</div>
//                       </div>
//                       <div className="result-message">{analysisResult.message}</div>
//                     </div>

//                     <div className="result-card">
//                       <h4>Video Analysis</h4>
//                       <div className="analysis-details">
//   <div className="detail-item">
//     <span className="detail-label">Duration:</span>
//     <span className="detail-value">{analysisResult.duration}s</span>
//   </div>
//   <div className="detail-item">
//     <span className="detail-label">Frames:</span>
//     <span className="detail-value">{analysisResult.total_frames}</span>
//   </div>
//   <div className="detail-item">
//     <span className="detail-label">Faces:</span>
//     <span className="detail-value">{analysisResult.faces_detected}</span>
//   </div>
//   <div className="detail-item">
//     <span className="detail-label">Method:</span>
//     <span className="detail-value">ResNet-BiLSTM</span>
//   </div>
// </div>

//                     </div>

//                     <div className="result-card">
//                       <h4>Risk Assessment</h4>
//                       <div className={`risk-level ${analysisResult.risk_level}`}>
//                         {analysisResult.risk_level.toUpperCase()} RISK
//                       </div>
//                       <p className="risk-description">
//                         {analysisResult.risk_level === 'high'
//                           ? 'High probability of manipulation detected'
//                           : analysisResult.risk_level === 'medium'
//                             ? 'Some suspicious patterns found'
//                             : 'Video appears to be authentic'
//                         }
//                       </p>
//                       <button className="btn-secondary" onClick={resetForm}>
//                         Analyze Another Video
//                       </button>
//                     </div>
//                   </div>
//                 </div>
//               )}
//             </div>
//           </div>
//         </div>
//       </section>

//       {/* Footer */}
//       <footer className="footer-container">
//         <div className="footer-inner">
//           <div className="footer-left">
//             <h2 className="footer-logo">DeepFake AI</h2>
//             <p className="footer-description">Detecting deepfakes with cutting-edge AI technology.</p>
//             <p className="footer-copy">© {new Date().getFullYear()} DeepFake AI. All rights reserved.</p>
//           </div>
//           <div className="footer-right">
//             <div className="footer-links-group">
//               <h4 className="footer-links-title">Product</h4>
//               <a href="#" className="footer-link">Features</a>
//               <a href="#" className="footer-link">Pricing</a>
//               <a href="#" className="footer-link">Updates</a>
//             </div>
//             <div className="footer-links-group">
//               <h4 className="footer-links-title">Company</h4>
//               <a href="#" className="footer-link">About</a>
//               <a href="#" className="footer-link">Careers</a>
//               <a href="#" className="footer-link">Contact</a>
//             </div>
//             <div className="footer-links-group">
//               <h4 className="footer-links-title">Resources</h4>
//               <a href="#" className="footer-link">Blog</a>
//               <a href="#" className="footer-link">Help Center</a>
//               <a href="#" className="footer-link">Privacy & Terms</a>
//             </div>
//           </div>
//         </div>
//       </footer>
//     </div>
//   );
// };

// export default App;
// import React, { useState, useRef } from 'react';
// import axios from 'axios';
// import './App.css';
// import attachedImage from './assets/deepfake-detection-visual.jpg';

// const App = () => {
//   const [file, setFile] = useState(null);
//   const [uploading, setUploading] = useState(false);
//   const [analyzing, setAnalyzing] = useState(false);
//   const [uploadResult, setUploadResult] = useState(null);
//   const [analysisResult, setAnalysisResult] = useState(null);
//   const [error, setError] = useState('');
//   const fileInputRef = useRef(null);
//   const resultRef = useRef(null);

//   const handleFileChange = (event) => {
//     const selectedFile = event.target.files[0];
//     if (selectedFile) {
//       if (selectedFile.size > 100 * 1024 * 1024) {
//         setError('File size too large. Please select a video under 100MB.');
//         return;
//       }
//       setFile(selectedFile);
//       setError('');
//       setUploadResult(null);
//       setAnalysisResult(null);
//     }
//   };

//   const handleUpload = async () => {
//     if (!file) return;
//     const formData = new FormData();
//     formData.append('video', file);
//     setUploading(true);
//     setError('');
//     try {
//       const uploadResponse = await axios.post('http://localhost:5000/api/upload', formData);
//       setUploadResult(uploadResponse.data);
//       setUploading(false);
//       setAnalyzing(true);
//       const analyzeResponse = await axios.post(
//         `http://localhost:5000/api/analyze/${uploadResponse.data.filename}`
//       );
//       setAnalysisResult(analyzeResponse.data);
//       setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth' }), 200);
//     } catch (err) {
//       setError(err.response?.data?.error || 'Analysis failed. Please try again.');
//     } finally {
//       setUploading(false);
//       setAnalyzing(false);
//     }
//   };

//   const resetForm = () => {
//     setFile(null);
//     setUploadResult(null);
//     setAnalysisResult(null);
//     setError('');
//     if (fileInputRef.current) fileInputRef.current.value = '';
//   };

//   const ResultCard = ({ result }) => {
//     const isDeepfake = result.prediction === 'deepfake';
//     const confidence = Math.round((result.confidence || 0) * 100);
//     const hScore = result.heuristic_analysis?.score ?? 100;
//     const warnings = result.heuristic_analysis?.warnings ?? [];
//     const meta = result.heuristic_analysis?.metadata ?? {};

//     const getRisk = () => {
//       if (!isDeepfake) return { text: 'LOW RISK', color: '#22c55e' };
//       if (confidence >= 85) return { text: 'HIGH RISK', color: '#ef4444' };
//       if (confidence >= 70) return { text: 'MEDIUM RISK', color: '#f97316' };
//       return { text: 'SUSPICIOUS', color: '#facc15' };
//     };
//     const risk = getRisk();

//     return (
//       <div className="result-unified-card">

//         {/* ── BANNER ── */}
//         <div className={`result-banner ${isDeepfake ? 'banner-fake' : 'banner-real'}`}>
//           <div className="banner-left">
//             <span className="banner-icon">{isDeepfake ? '🚨' : '✅'}</span>
//             <div>
//               <div className="banner-title">
//                 {isDeepfake ? 'DEEPFAKE DETECTED' : 'AUTHENTIC VIDEO'}
//               </div>
//               <div className="banner-sub">
//                 Analysis complete · {result.processing_time ?? '—'}s processing time
//               </div>
//             </div>
//           </div>
//           <span className="risk-pill" style={{ background: risk.color }}>
//             {risk.text}
//           </span>
//         </div>

//         {/* ── CONFIDENCE ── */}
//         <div className="rc-section">
//           <div className="conf-row">
//             <span className="conf-label">Detection Confidence</span>
//             <span className="conf-number" style={{ color: isDeepfake ? '#ef4444' : '#22c55e' }}>
//               {confidence}%
//             </span>
//           </div>
//           <div className="conf-track">
//             <div
//               className="conf-fill"
//               style={{
//                 width: `${confidence}%`,
//                 background: isDeepfake
//                   ? 'linear-gradient(90deg,#ef4444,#dc2626)'
//                   : 'linear-gradient(90deg,#22c55e,#16a34a)',
//               }}
//             />
//           </div>
//           <div className="conf-ends"><span>0%</span><span>100%</span></div>
//         </div>

//         {/* ── SCORE BOXES ── */}
//         <div className="rc-section rc-scores">
//           <div className="rc-score-box">
//             <div className="rc-score-label">Real Score</div>
//             <div className="rc-score-val" style={{ color: '#22c55e' }}>
//               {Math.round((result.scores?.real ?? 0) * 100)}%
//             </div>
//           </div>
//           <div className="rc-score-box">
//             <div className="rc-score-label">Fake Score</div>
//             <div className="rc-score-val" style={{ color: '#ef4444' }}>
//               {Math.round((result.scores?.fake ?? 0) * 100)}%
//             </div>
//           </div>
//           <div className="rc-score-box">
//             <div className="rc-score-label">Quality Score</div>
//             <div
//               className="rc-score-val"
//               style={{ color: hScore >= 60 ? '#22c55e' : hScore >= 40 ? '#f97316' : '#ef4444' }}
//             >
//               {hScore}/100
//             </div>
//           </div>
//         </div>

        

//         {/* ── WARNINGS (only if any) ── */}
//         {warnings.length > 0 && (
//           <div className="rc-section">
//             <div className="rc-warnings">
//               <div className="rc-warnings-title">⚠️ Suspicious Patterns Detected</div>
//               {warnings.map((w, i) => (
//                 <div className="rc-warning-item" key={i}>{w}</div>
//               ))}
//             </div>
//           </div>
//         )}

//         {/* ── VERDICT ── */}
//         <div className="rc-section">
//           <div className={`rc-verdict ${isDeepfake ? 'rc-verdict-fake' : 'rc-verdict-real'}`}>
//             {isDeepfake
//               ? `This video shows signs of AI manipulation with ${confidence}% confidence. We recommend treating this content as potentially synthetic.`
//               : `This video appears authentic with ${confidence}% confidence. No significant manipulation patterns were detected.`
//             }
//           </div>
//         </div>

//         {/* ── BUTTON ── */}
//         <div className="rc-section">
//           <button className="rc-reset-btn" onClick={resetForm}>
//             🔄 Analyze Another Video
//           </button>
//         </div>

//       </div>
//     );
//   };

//   return (
//     <div className="app">

//       {/* NAVBAR */}
//       <nav className="navbar">
//         <div className="nav-container">
//           <div className="nav-logo">
//             <span className="logo-text">DeepFake AI</span>
//           </div>
//           <div className="nav-links">
//             <a href="#" className="nav-link active">Home</a>
//             <a href="#" className="nav-link">Features</a>
//             <a href="#" className="nav-link">Documentation</a>
//             <a href="#" className="nav-link">About</a>
//           </div>
//           <button className="nav-cta">Start Analysis</button>
//         </div>
//       </nav>

//       {/* HERO */}
//       <section className="hero">
//         <div className="hero-container">
//           <div className="hero-content">
//             <h1 className="hero-title">
//               The Smarter Way<br />to Detect Deepfakes
//             </h1>
//             <p className="hero-subtitle">
//               AI-powered deepfake detection using advanced ResNet-Swish-BiLSTM neural
//               networks that learn and adapt to emerging threats.
//             </p>
//             <div className="hero-buttons">
//               <button
//                 className="btn-primary"
//                 onClick={() => fileInputRef.current?.click()}
//               >
//                 Start AI Analysis
//               </button>
//               <button className="btn-secondary">Get Demo</button>
//             </div>
//           </div>
//           <div className="hero-image">
//             <img src={attachedImage} alt="Deepfake Detection Visual" />
//           </div>
//         </div>
//       </section>

//       {/* DASHBOARD */}
//       <section className="dashboard">
//         <div className="dashboard-container">
//           <div className="main-content">
//             <div className="task-manager">
//               <h2 className="section-title">Deepfake Detector</h2>

//               {/* STATS — hidden when result is shown */}
//               {!analysisResult && (
//                 <div className="stats-grid">
//                   <div className="stat-card">
//                     <div className="stat-number">0</div>
//                     <div className="stat-label">Videos Analyzed</div>
//                     <div className="stat-badge">Ready</div>
//                   </div>
//                   <div className="stat-card">
//                     <div className="stat-number">—</div>
//                     <div className="stat-label">Confidence Score</div>
//                     <div className="stat-badge">Pending</div>
//                   </div>
//                   <div className="stat-card">
//                     <div className="stat-number">—</div>
//                     <div className="stat-label">Risk Level</div>
//                     <div className="stat-badge">Pending</div>
//                   </div>
//                 </div>
//               )}

//               {/* UPLOAD — hidden when result is shown */}
//               {!analysisResult && (
//                 <div className="upload-section">
//                   <div className="upload-card">
//                     <div className="upload-icon">📁</div>
//                     <h3>Upload Video for AI Analysis</h3>
//                     <p>Advanced neural networks will analyze your video for deepfake patterns</p>
//                     <p className="upload-formats">
//                       Supports: MP4, AVI, MOV, MKV · Max size: 100MB
//                     </p>

//                     <input
//                       ref={fileInputRef}
//                       type="file"
//                       accept="video/*"
//                       onChange={handleFileChange}
//                       style={{ display: 'none' }}
//                     />

//                     <button
//                       className="upload-btn primary"
//                       onClick={() => fileInputRef.current?.click()}
//                     >
//                       Choose File
//                     </button>

//                     {file && (
//                       <div className="file-upload-action-row">
//                         <div className="file-card-mini">
//                           <span className="file-card-icon">🎬</span>
//                           <div>
//                             <span className="file-card-filename" title={file.name}>
//                               {file.name}
//                             </span>
//                             <div className="file-card-meta">
//                               {(file.size / 1024 / 1024).toFixed(2)} MB · {file.type}
//                             </div>
//                           </div>
//                           <button className="file-card-remove" onClick={resetForm}>×</button>
//                         </div>
//                         <button
//                           className="analyze-btn-mini"
//                           onClick={handleUpload}
//                           disabled={uploading || analyzing}
//                         >
//                           {uploading ? 'Uploading...' : analyzing ? 'Analyzing...' : 'Start Analysis'}
//                         </button>
//                       </div>
//                     )}
//                   </div>
//                 </div>
//               )}

//               {/* LOADING */}
//               {(uploading || analyzing) && (
//                 <div className="loading-section">
//                   <div className="loading-spinner"></div>
//                   <p style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.4rem' }}>
//                     {uploading ? '⬆️ Uploading video...' : '🤖 AI is analyzing frames...'}
//                   </p>
//                   {analyzing && (
//                     <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>
//                       This may take 20–60 seconds depending on video length
//                     </p>
//                   )}
//                 </div>
//               )}

//               {/* ERROR */}
//               {error && (
//                 <div className="error-card">
//                   <div className="error-icon">⚠️</div>
//                   <div className="error-content">
//                     <h4>Analysis Error</h4>
//                     <p>{error}</p>
//                   </div>
//                 </div>
//               )}

//               {/* RESULT */}
//               {analysisResult && (
//                 <div ref={resultRef} className="results-section">
//                   <ResultCard result={analysisResult} />
//                 </div>
//               )}

//             </div>
//           </div>
//         </div>
//       </section>

//       {/* FOOTER */}
//       <footer className="footer-container">
//         <div className="footer-inner">
//           <div className="footer-left">
//             <h2 className="footer-logo">DeepFake AI</h2>
//             <p className="footer-description">Detecting deepfakes with cutting-edge AI technology.</p>
//             <p className="footer-copy">© {new Date().getFullYear()} DeepFake AI. All rights reserved.</p>
//           </div>
//           <div className="footer-right">
//             <div className="footer-links-group">
//               <h4 className="footer-links-title">Product</h4>
//               <a href="#" className="footer-link">Features</a>
//               <a href="#" className="footer-link">Pricing</a>
//               <a href="#" className="footer-link">Updates</a>
//             </div>
//             <div className="footer-links-group">
//               <h4 className="footer-links-title">Company</h4>
//               <a href="#" className="footer-link">About</a>
//               <a href="#" className="footer-link">Careers</a>
//               <a href="#" className="footer-link">Contact</a>
//             </div>
//             <div className="footer-links-group">
//               <h4 className="footer-links-title">Resources</h4>
//               <a href="#" className="footer-link">Blog</a>
//               <a href="#" className="footer-link">Help Center</a>
//               <a href="#" className="footer-link">Privacy & Terms</a>
//             </div>
//           </div>
//         </div>
//       </footer>

//     </div>
//   );
// };

// export default App;

import React, { useState, useRef } from 'react';
import axios from 'axios';
import './App.css';
import attachedImage from './assets/deepfake-detection-visual.jpg';

const App = () => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);
  const resultRef = useRef(null);

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
        `http://localhost:5000/api/analyze/${uploadResponse.data.filename}`
      );
      setAnalysisResult(analyzeResponse.data);
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth' }), 200);
    } catch (err) {
      setError(err.response?.data?.error || 'Analysis failed. Please try again.');
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
      <nav className="navbar">
        <div className="nav-container">
          <div className="nav-logo">
            <span className="logo-text">DeepFake AI</span>
          </div>
          <div className="nav-links">
            <a href="#" className="nav-link active">Home</a>
            <a href="#" className="nav-link">Features</a>
            <a href="#" className="nav-link">Documentation</a>
            <a href="#" className="nav-link">About</a>
          </div>
          <button className="nav-cta">Start Analysis</button>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="hero-container">
          <div className="hero-content">
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
                onClick={() => fileInputRef.current?.click()}
              >
                Start AI Analysis
              </button>
              <button className="btn-secondary">Get Demo</button>
            </div>
          </div>
          <div className="hero-image">
            <img src={attachedImage} alt="Deepfake Detection Visual" />
          </div>
        </div>
      </section>

      {/* DASHBOARD */}
      <section className="dashboard">
        <div className="dashboard-container">
          <div className="main-content">
            <div className="task-manager">
              {/* <h2 className="section-title">Deepfake Detector</h2> */}

             
              {/* UPLOAD — hidden when result shown */}
              {!analysisResult && (
                <div className="upload-section">
                  <div className="upload-card">
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
                <div className="loading-section">
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
                <div className="error-card">
                  <div className="error-icon">⚠️</div>
                  <div className="error-content">
                    <h4>Analysis Error</h4>
                    <p>{error}</p>
                  </div>
                </div>
              )}

              {/* RESULT */}
              {analysisResult && (
                <div ref={resultRef} className="results-section">
                  <ResultCard result={analysisResult} />
                </div>
              )}

            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer-container">
        <div className="footer-inner">
          <div className="footer-left">
            <h2 className="footer-logo">DeepFake AI</h2>
            <p className="footer-description">Detecting deepfakes with cutting-edge AI technology.</p>
            <p className="footer-copy">© {new Date().getFullYear()} DeepFake AI. All rights reserved.</p>
          </div>
          <div className="footer-right">
            <div className="footer-links-group">
              <h4 className="footer-links-title">Product</h4>
              <a href="#" className="footer-link">Features</a>
              <a href="#" className="footer-link">Pricing</a>
              <a href="#" className="footer-link">Updates</a>
            </div>
            <div className="footer-links-group">
              <h4 className="footer-links-title">Company</h4>
              <a href="#" className="footer-link">About</a>
              <a href="#" className="footer-link">Careers</a>
              <a href="#" className="footer-link">Contact</a>
            </div>
            <div className="footer-links-group">
              <h4 className="footer-links-title">Resources</h4>
              <a href="#" className="footer-link">Blog</a>
              <a href="#" className="footer-link">Help Center</a>
              <a href="#" className="footer-link">Privacy & Terms</a>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default App;
