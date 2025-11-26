
import React, { useState, useRef, useEffect } from 'react';
import { AppState, VoiceAnalysisResult, Language } from './types';
import Visualizer from './components/Visualizer';
import VoiceRadar from './components/RadarChart';
import AdminDashboard from './components/AdminDashboard';
import { analyzeVoice } from './services/geminiService';
import { saveRecord } from './services/storageService';
import { 
  Mic, 
  Square, 
  RefreshCw, 
  Activity,
  BarChart3,
  CheckCircle2,
  XCircle,
  Fingerprint,
  Link as LinkIcon,
  Check,
  Zap,
  HeartHandshake,
  Globe,
  Languages,
  AlertTriangle
} from 'lucide-react';

const translations = {
  en: {
    title: "Voice Analytics",
    systemOnline: "SYSTEM ONLINE",
    heroTitle: "Discover Your Vocal Signature",
    heroDesc: "Advanced AI analysis of your clarity, charisma, and tone. Receive detailed acoustic metrics and personalized feedback.",
    globalHint: "Supports any language or dialect. We analyze the sound, not the words.",
    tapToRecord: "Tap to Initialize Recording",
    recording: "Recording",
    speakNaturally: "Speak naturally. Read a sentence or introduce yourself.",
    stopAnalysis: "Stop Analysis",
    processingTitle: "Processing Acoustics",
    processingDesc: "Generating spectral analysis and profiling...",
    metricsTitle: "Acoustic Metrics",
    objective: "OBJECTIVE",
    score: "Score",
    vocalAge: "Vocal Age",
    estWeight: "Est. Weight",
    pitchRange: "Pitch Range",
    pacing: "Pacing",
    expressiveness: "Expressiveness",
    isPinchedLabel: "Pinched Voice",
    pinchedDetected: "Detected (Artificial)",
    naturalVoice: "Natural / Authentic",
    similarVoice: "Similar Voice",
    dimAnalysis: "Dimensional Analysis",
    strengths: "Key Strengths",
    growth: "Areas for Growth",
    archetype: "Voice Archetype",
    roast: "The Roast",
    realityCheck: "Reality Check",
    newAnalysis: "New Analysis",
    shareResults: "Share Results",
    copied: "Copied Link!",
    tryAgain: "Try Again",
    errorMic: "Microphone access denied. Please check permissions.",
    errorAnalysis: "Analysis failed. Please try again."
  },
  zh: {
    title: "声音分析",
    systemOnline: "系统在线",
    heroTitle: "探索你的声音特质",
    heroDesc: "AI 深度分析你的音色、魅力与独特性。获取详细的声学指标和个性化建议。",
    globalHint: "支持任何语言或方言。我们需要听到的是你的“声音”。",
    tapToRecord: "点击开始录音",
    recording: "正在录音",
    speakNaturally: "请自然说话。读一句话，或者做个自我介绍。",
    stopAnalysis: "停止并分析",
    processingTitle: "正在分析声学特征",
    processingDesc: "生成频谱报告与声音画像中...",
    metricsTitle: "声学指标",
    objective: "客观数据",
    score: "综合评分",
    vocalAge: "声音年龄",
    estWeight: "预估体格",
    pitchRange: "音域范围",
    pacing: "语速节奏",
    expressiveness: "表现力",
    isPinchedLabel: "夹子音鉴定",
    pinchedDetected: "⚠️ 疑似夹子音",
    naturalVoice: "✅ 自然原声",
    similarVoice: "相似声音",
    dimAnalysis: "维度分析",
    strengths: "核心优势",
    growth: "提升空间",
    archetype: "声音原型",
    roast: "毒舌点评",
    realityCheck: "真实建议",
    newAnalysis: "重新测试",
    shareResults: "分享结果",
    copied: "链接已复制!",
    tryAgain: "重试",
    errorMic: "麦克风访问被拒绝，请检查权限。",
    errorAnalysis: "分析失败，请重试。"
  }
};

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [language, setLanguage] = useState<Language>('zh');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [analysis, setAnalysis] = useState<VoiceAnalysisResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [timer, setTimer] = useState<number>(0);
  const [isCopied, setIsCopied] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerIntervalRef = useRef<number | null>(null);

  const t = translations[language];

  // Initialize checks
  useEffect(() => {
    const checkRoute = () => {
        // Support Path (if server rewrite exists) OR Hash (static safe)
        const isPathAdmin = window.location.pathname === '/admin';
        const isHashAdmin = window.location.hash === '#/admin' || window.location.hash === '#admin';
        
        if (isPathAdmin || isHashAdmin) {
            setAppState(AppState.ADMIN);
            return true;
        }

        // Check for Shared Result via Query Param
        const params = new URLSearchParams(window.location.search);
        const shareData = params.get('share');
        
        if (shareData && appState === AppState.IDLE) {
          try {
            const jsonString = decodeURIComponent(escape(window.atob(shareData)));
            const parsedAnalysis = JSON.parse(jsonString) as VoiceAnalysisResult;
            
            if (parsedAnalysis.overallScore && parsedAnalysis.metrics) {
                setAnalysis(parsedAnalysis);
                setAppState(AppState.RESULT);
            }
          } catch (e) {
            console.error("Failed to parse shared result", e);
            window.history.replaceState(null, '', '/');
          }
        }
        return false;
    };

    // Check on mount
    checkRoute();

    // Listen for hash changes
    window.addEventListener('hashchange', checkRoute);
    return () => window.removeEventListener('hashchange', checkRoute);
  }, [appState]);

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'en' ? 'zh' : 'en');
  };

  // Start Recording
  const startRecording = async () => {
    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setStream(audioStream);
      
      const mediaRecorder = new MediaRecorder(audioStream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        handleAnalysis(blob);
      };

      mediaRecorder.start();
      setAppState(AppState.RECORDING);
      setTimer(0);
      
      timerIntervalRef.current = window.setInterval(() => {
        setTimer(prev => {
            if (prev >= 15) {
                stopRecording();
                return prev;
            }
            return prev + 1;
        });
      }, 1000);

    } catch (err) {
      console.error(err);
      setErrorMsg(t.errorMic);
      setAppState(AppState.ERROR);
    }
  };

  // Stop Recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    setAppState(AppState.PROCESSING);
  };

  // Handle Gemini API Call
  const handleAnalysis = async (blob: Blob) => {
    try {
      const result = await analyzeVoice(blob, language);
      setAnalysis(result);
      
      // Save access log (no audio)
      await saveRecord(result);

      setAppState(AppState.RESULT);
    } catch (err) {
      console.error(err);
      setErrorMsg(t.errorAnalysis);
      setAppState(AppState.ERROR);
    }
  };

  const resetApp = () => {
    // Clean URL
    if (window.location.hash.includes('admin') || window.location.pathname.includes('admin')) {
        window.history.pushState({}, '', '/');
    } else {
        // Remove query params if any
        window.history.pushState({}, '', window.location.pathname);
    }
    
    setAppState(AppState.IDLE);
    setAnalysis(null);
    setAudioBlob(null);
    setStream(null);
    setErrorMsg('');
    setIsCopied(false);
  };

  const handleShare = () => {
    if (!analysis) return;
    
    try {
      const jsonString = JSON.stringify(analysis);
      const encodedData = window.btoa(unescape(encodeURIComponent(jsonString)));
      // Use clean URL for sharing
      const baseUrl = window.location.origin + window.location.pathname;
      const shareUrl = `${baseUrl}?share=${encodedData}`;
      
      navigator.clipboard.writeText(shareUrl).then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      });
    } catch (e) {
      console.error("Failed to generate share link", e);
    }
  };

  // Secret shortcut to admin
  const handleSecretAdmin = () => {
      window.location.hash = '#/admin';
  };

  if (appState === AppState.ADMIN) {
      return <AdminDashboard onBack={resetApp} />;
  }

  return (
    <div className="min-h-screen flex flex-col items-center bg-tech-gradient text-zinc-100 font-sans selection:bg-cyan-500/30">
        
        {/* Navbar / Header */}
        <header className="w-full border-b border-white/5 bg-zinc-950/50 backdrop-blur-md sticky top-0 z-50">
            <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
                <div className="flex items-center gap-2 cursor-pointer" onClick={resetApp}>
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                        <Activity className="w-5 h-5 text-white" />
                    </div>
                    <span className="font-semibold tracking-tight hidden sm:inline">Voice<span className="text-zinc-400">Analytics</span></span>
                </div>
                
                <div className="flex items-center gap-4">
                    <button 
                        onClick={toggleLanguage}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-800/50 hover:bg-zinc-700/50 transition-colors border border-white/5 text-xs font-medium text-zinc-300"
                    >
                        <Languages className="w-3.5 h-3.5" />
                        {language === 'zh' ? '中文 / EN' : 'EN / 中文'}
                    </button>

                    <div 
                        className="text-xs font-mono text-zinc-500 flex items-center gap-2 cursor-pointer select-none"
                        onDoubleClick={handleSecretAdmin}
                        title="System Status: Normal"
                    >
                        <span className="w-2 h-2 rounded-full bg-green-500/50 animate-pulse"></span>
                        <span className="hidden sm:inline">{t.systemOnline}</span>
                    </div>
                </div>
            </div>
        </header>

        <main className="w-full max-w-2xl px-4 py-12 flex-1 flex flex-col justify-center">
            
            {/* Error State */}
            {appState === AppState.ERROR && (
                <div className="glass-panel border-red-500/20 p-6 rounded-2xl text-center animate-in fade-in zoom-in-95">
                    <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <p className="font-medium text-red-200 mb-6">{errorMsg}</p>
                    <button 
                        onClick={resetApp}
                        className="bg-zinc-800 hover:bg-zinc-700 text-white px-6 py-2 rounded-full font-medium transition-all"
                    >
                        {t.tryAgain}
                    </button>
                </div>
            )}

            {/* Idle State */}
            {appState === AppState.IDLE && (
                <div className="text-center space-y-10 animate-in fade-in slide-in-from-bottom-5 duration-700">
                    <div className="space-y-4">
                        <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-zinc-400">
                            {t.heroTitle}
                        </h1>
                        <p className="text-zinc-400 max-w-lg mx-auto text-lg leading-relaxed">
                            {t.heroDesc}
                        </p>
                        
                        {/* Language/Global Support Hint */}
                        <div className="flex items-center justify-center gap-2 max-w-md mx-auto py-2 px-4 rounded-full bg-white/5 border border-white/5">
                            <Globe className="w-4 h-4 text-cyan-400 shrink-0" />
                            <span className="text-xs text-zinc-400">
                                {t.globalHint}
                            </span>
                        </div>
                    </div>
                    
                    <div className="relative group w-fit mx-auto">
                        <div className="absolute inset-0 bg-cyan-500/20 blur-3xl rounded-full scale-150 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                        <button 
                            onClick={startRecording}
                            className="relative w-24 h-24 rounded-3xl bg-white text-zinc-950 hover:scale-105 transition-all duration-300 flex items-center justify-center shadow-xl shadow-cyan-500/10"
                        >
                            <Mic className="w-8 h-8" />
                        </button>
                    </div>
                    
                    <div className="text-xs font-mono text-zinc-600 uppercase tracking-widest">
                        {t.tapToRecord}
                    </div>
                </div>
            )}

            {/* Recording State */}
            {appState === AppState.RECORDING && (
                <div className="w-full animate-in fade-in zoom-in-95 duration-300">
                    <div className="glass-panel rounded-3xl p-8 mb-6 relative overflow-hidden">
                        {/* Status Badge */}
                        <div className="flex justify-between items-center mb-8">
                            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20">
                                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                                <span className="text-xs font-medium text-red-400 uppercase tracking-wider">{t.recording}</span>
                            </div>
                            <span className="font-mono text-2xl font-medium tabular-nums">{timer < 10 ? `0${timer}` : timer}s / 15s</span>
                        </div>
                        
                        <Visualizer stream={stream} isRecording={true} />
                        
                        <p className="text-center text-zinc-500 text-sm mt-8">{t.speakNaturally}</p>
                    </div>
                    
                    <button 
                        onClick={stopRecording}
                        className="w-full py-4 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 font-semibold text-lg transition-colors flex items-center justify-center gap-3 shadow-lg"
                    >
                        <Square className="w-5 h-5 fill-current" />
                        {t.stopAnalysis}
                    </button>
                </div>
            )}

            {/* Processing State */}
            {appState === AppState.PROCESSING && (
                <div className="text-center space-y-6 animate-in fade-in">
                     <div className="relative w-20 h-20 mx-auto">
                        <div className="absolute inset-0 border-4 border-zinc-800 rounded-full"></div>
                        <div className="absolute inset-0 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                     </div>
                     <div className="space-y-2">
                        <h3 className="text-xl font-medium text-white">{t.processingTitle}</h3>
                        <p className="text-zinc-500 text-sm">{t.processingDesc}</p>
                     </div>
                </div>
            )}

            {/* Result State */}
            {appState === AppState.RESULT && analysis && (
                <div className="space-y-6 animate-in slide-in-from-bottom-8 duration-700 pb-20">
                    
                    {/* SECTION 1: OBJECTIVE ANALYSIS */}
                    <section className="glass-panel rounded-3xl p-1 overflow-hidden">
                        <div className="bg-zinc-900/50 px-6 py-4 border-b border-white/5 flex justify-between items-center">
                            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                                <BarChart3 className="w-4 h-4" /> {t.metricsTitle}
                            </h2>
                            <span className="text-xs font-mono text-cyan-500 bg-cyan-950/30 px-2 py-1 rounded">{t.objective}</span>
                        </div>
                        
                        <div className="p-6">
                            <div className="flex flex-col md:flex-row gap-8 items-center md:items-start mb-8">
                                {/* Score Circle */}
                                <div className="relative shrink-0">
                                    <svg className="w-32 h-32 -rotate-90">
                                        <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-zinc-800" />
                                        <circle 
                                            cx="64" cy="64" r="58" 
                                            stroke="currentColor" strokeWidth="8" 
                                            fill="transparent" 
                                            className="text-cyan-500"
                                            strokeDasharray={365}
                                            strokeDashoffset={365 - (365 * analysis.overallScore) / 100}
                                            strokeLinecap="round"
                                        />
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-3xl font-bold">{analysis.overallScore}</span>
                                        <span className="text-[10px] text-zinc-500 uppercase tracking-wider">{t.score}</span>
                                    </div>
                                </div>

                                {/* Tech Stats */}
                                <div className="grid grid-cols-2 gap-4 w-full">
                                     {[
                                        { label: t.vocalAge, val: analysis.estimatedAge },
                                        { label: t.estWeight, val: analysis.estimatedWeight },
                                        { label: t.pitchRange, val: analysis.technical.pitchRange },
                                        { label: t.pacing, val: analysis.technical.speakingPace },
                                        { label: t.expressiveness, val: analysis.technical.expressiveness },
                                        { 
                                            label: t.isPinchedLabel, 
                                            val: analysis.isPinched ? t.pinchedDetected : t.naturalVoice,
                                            highlight: analysis.isPinched,
                                            icon: analysis.isPinched ? AlertTriangle : CheckCircle2
                                        },
                                        { label: t.similarVoice, val: analysis.similarVoice, span: true }
                                    ].map((item, i) => (
                                        <div key={i} className={`bg-zinc-800/50 rounded-lg p-3 border border-white/5 ${item.span ? 'col-span-2' : ''} ${item.highlight ? 'bg-amber-900/10 border-amber-500/20' : ''}`}>
                                            <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 uppercase mb-1">
                                                {item.icon && <item.icon className={`w-3 h-3 ${item.highlight ? 'text-amber-500' : 'text-emerald-500'}`} />}
                                                {item.label}
                                            </div>
                                            <div className={`text-sm font-medium ${item.highlight ? 'text-amber-400' : 'text-zinc-200'}`}>{item.val}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Radar & Pros/Cons Split */}
                            <div className="grid md:grid-cols-2 gap-8 border-t border-white/5 pt-8">
                                <div>
                                    <h3 className="text-xs font-semibold text-zinc-500 mb-4 uppercase">{t.dimAnalysis}</h3>
                                    {analysis.metrics && <VoiceRadar metrics={analysis.metrics} language={language} />}
                                </div>
                                <div className="space-y-6">
                                    <div>
                                        <h3 className="text-xs font-semibold text-emerald-500 mb-3 uppercase flex items-center gap-2">
                                            <CheckCircle2 className="w-3 h-3" /> {t.strengths}
                                        </h3>
                                        <ul className="space-y-2">
                                            {analysis.pros.map((pro, i) => (
                                                <li key={i} className="text-sm text-zinc-300 flex items-start gap-2">
                                                    <span className="w-1 h-1 rounded-full bg-emerald-500 mt-2 shrink-0"></span>
                                                    {pro}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                    <div>
                                        <h3 className="text-xs font-semibold text-orange-500 mb-3 uppercase flex items-center gap-2">
                                            <XCircle className="w-3 h-3" /> {t.growth}
                                        </h3>
                                        <ul className="space-y-2">
                                            {analysis.cons.map((con, i) => (
                                                <li key={i} className="text-sm text-zinc-300 flex items-start gap-2">
                                                    <span className="w-1 h-1 rounded-full bg-orange-500 mt-2 shrink-0"></span>
                                                    {con}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* SECTION 2: SUBJECTIVE VERDICT */}
                    <section className="bg-gradient-to-br from-zinc-900 to-zinc-950 rounded-3xl p-1 border border-white/10 shadow-2xl relative overflow-hidden group">
                        {/* Decorative glow */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-cyan-500/10 transition-colors duration-700"></div>
                        
                        <div className="relative p-8 space-y-8">
                            {/* Archetype Header */}
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-zinc-800 rounded-lg text-cyan-400">
                                    <Fingerprint className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">{t.archetype}</div>
                                    <h2 className="text-2xl font-bold text-white tracking-tight">{analysis.voiceArchetype}</h2>
                                </div>
                            </div>

                            {/* The Roast */}
                            <div className="bg-zinc-800/30 rounded-2xl p-6 border border-white/5 relative">
                                <div className="flex items-center gap-2 mb-3 text-purple-400">
                                    <Zap className="w-4 h-4 fill-current" />
                                    <span className="text-xs font-bold uppercase tracking-wide">{t.roast}</span>
                                </div>
                                <p className="text-zinc-200 leading-relaxed text-lg italic font-medium">
                                    "{analysis.roast}"
                                </p>
                            </div>

                            {/* The Encouragement */}
                            <div className="pl-2 border-l-2 border-emerald-500/30">
                                <div className="flex items-center gap-2 mb-2 text-emerald-500">
                                    <HeartHandshake className="w-4 h-4" />
                                    <span className="text-xs font-bold uppercase tracking-wide">{t.realityCheck}</span>
                                </div>
                                <p className="text-zinc-400 text-sm leading-relaxed">
                                    {analysis.encouragement}
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* Actions */}
                    <div className="flex gap-4 pt-4">
                        <button 
                            onClick={resetApp}
                            className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                        >
                            <RefreshCw className="w-4 h-4" /> {t.newAnalysis}
                        </button>
                        <button 
                            onClick={handleShare}
                            className={`flex-1 ${isCopied ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-cyan-600 hover:bg-cyan-500'} text-white py-3 rounded-xl font-medium transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-cyan-900/20`}
                        >
                            {isCopied ? (
                                <>
                                    <Check className="w-4 h-4" /> {t.copied}
                                </>
                            ) : (
                                <>
                                    <LinkIcon className="w-4 h-4" /> {t.shareResults}
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}
        </main>
        
        {/* Footer */}
        <footer className="w-full py-6 text-center text-zinc-800 text-xs">
            © 2024 VoiceAnalytics AI
        </footer>
    </div>
  );
};

export default App;
