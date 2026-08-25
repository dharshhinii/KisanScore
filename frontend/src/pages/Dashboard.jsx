import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Clock, Settings, LogOut,
  ChevronRight, Loader2, CheckCircle2, XCircle,
  RefreshCw, BarChart2, ShieldCheck, Zap,
  X, AlertCircle, Menu, User, Cpu, Info, Hourglass, LineChart
} from 'lucide-react';
import {
  RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer,
} from 'recharts';
import { fetchPendingQueue, fetchScore, submitDecision } from '../api/client';

// ── Helpers ──────────────────────────────────────────────────────────────────
function scoreColor(score) {
  if (score >= 700) return { text: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/30', hex: '#22c55e', label: 'Low Risk', badge: 'bg-green-500/20 text-green-400' };
  if (score >= 550) return { text: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/30', hex: '#f59e0b', label: 'Moderate Risk', badge: 'bg-amber-500/20 text-amber-400' };
  return { text: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/30', hex: '#ef4444', label: 'High Risk', badge: 'bg-red-500/20 text-red-400' };
}

function riskBadge(risk) {
  const m = {
    'Very Low': 'bg-green-500/20 text-green-400 border-green-500/30',
    Low: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    Moderate: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    High: 'bg-red-500/20 text-red-400 border-red-500/30',
  };
  return m[risk] || 'bg-gray-800 text-gray-400 border-gray-700';
}

function timeAgo(iso) {
  if (!iso) return '—';
  const diff = Math.floor((Date.now() - new Date(iso)) / 60000);
  if (diff < 1) return 'Just now';
  if (diff < 60) return `${diff}m ago`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
  return `${Math.floor(diff / 1440)}d ago`;
}

function fmt(n) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

// ── Gov Top Bar ───────────────────────────────────────────────────────────────
const GovBar = () => (
  <div className="bg-[#111] text-[10px] text-gray-400 shrink-0">
    <div className="ippb-tricolor" />
    <div className="px-4 py-1 flex items-center justify-between border-b border-gray-800">
      <span>Government of India · Ministry of Communications · Department of Posts</span>
      <span className="hidden sm:block">ippbonline.bank.in</span>
    </div>
  </div>
);

// ── IPPB Header ───────────────────────────────────────────────────────────────
const IPPBHeader = ({ onMenuClick, onRefresh, loading }) => (
  <header className="bg-[#c8102e] shadow-md shrink-0 border-b border-red-900">
    <div className="px-4 py-3 flex items-center gap-3">
      <button onClick={onMenuClick} className="lg:hidden p-1.5 rounded bg-black/20 hover:bg-black/30 transition-colors">
        <Menu size={18} className="text-white" />
      </button>
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center shrink-0 shadow-inner">
          <span className="text-[#c8102e] font-black text-[8px] leading-tight text-center">IPPB</span>
        </div>
        <div>
          <p className="text-white font-black text-sm leading-tight">KisanScore · Credit Evaluation System</p>
          <p className="text-red-200 text-[10px] hidden sm:block">India Post Payments Bank · Bank Officer Portal</p>
        </div>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <button onClick={onRefresh}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-black/20 hover:bg-black/30 border border-black/10 text-white text-xs font-medium transition-colors">
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded bg-green-500/20 border border-green-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-green-300 text-xs font-medium">AI Online</span>
        </div>
      </div>
    </div>
    
    {/* Sub-nav */}
    <div className="bg-[#a00d25] px-4 border-t border-red-800/50">
      <div className="flex items-center gap-0 text-xs overflow-x-auto">
        {['Dashboard', 'Pending Approvals', 'Approved Loans', 'Rejected', 'Reports', 'Settings'].map((item, i) => (
          <a key={item} href="#" onClick={(e) => e.preventDefault()}
            className={`px-3 sm:px-4 py-2 font-medium whitespace-nowrap border-b-2 transition-colors
              ${i === 0 ? 'border-white text-white font-bold' : 'border-transparent text-red-200 hover:text-white'}`}>
            {item}
          </a>
        ))}
      </div>
    </div>
  </header>
);

// ── KPI Card ──────────────────────────────────────────────────────────────────
const KpiCard = ({ icon: Icon, label, value, sub, colorClass }) => (
  <div className="bg-[#161616] rounded-xl border border-gray-800 p-4 flex items-start gap-4">
    <div className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 ${colorClass}`}>
      <Icon size={24} />
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest truncate">{label}</p>
      <p className="text-2xl font-black text-white mt-0.5">{value}</p>
      {sub && <p className="text-[10px] text-gray-400 truncate mt-1">{sub}</p>}
    </div>
  </div>
);

// ── Score Gauge ───────────────────────────────────────────────────────────────
const ScoreGauge = ({ score }) => {
  const MIN = 300, MAX = 900;
  const pct = ((score - MIN) / (MAX - MIN)) * 100;
  const c = scoreColor(score);
  return (
    <div className="flex flex-col items-center py-4">
      <div className="relative w-44 h-28 sm:w-52 sm:h-32">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart cx="50%" cy="85%" innerRadius="75%" outerRadius="100%"
            startAngle={180} endAngle={0} barSize={14}
            data={[{ value: pct, fill: c.hex }]}
          >
            <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
            <RadialBar background={{ fill: '#333' }} dataKey="value" angleAxisId={0} cornerRadius={8} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center">
          <p className={`text-3xl sm:text-4xl font-black ${c.text}`}>{score}</p>
          <p className="text-[10px] text-gray-500">out of 900</p>
        </div>
      </div>
      <div className={`mt-3 px-4 py-1.5 rounded-full border text-xs font-bold ${c.badge} ${c.border}`}>
        {c.label}
      </div>
    </div>
  );
};

// ── Detail Panel ──────────────────────────────────────────────────────────────
const DetailPanel = ({ appId, onClose }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [decision, setDecision] = useState(null);
  const [deciding, setDeciding] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setData(null); setErr(''); setDecision(null);
    fetchScore(appId)
      .then((d) => { if (!cancelled) { setData(d); setLoading(false); } })
      .catch((e) => { if (!cancelled) { setErr(e.message); setLoading(false); } });
    return () => { cancelled = true; };
  }, [appId]);

  const handleDecision = useCallback(async (type) => {
    setDeciding(true);
    try {
      await submitDecision(appId, type, data?.loan_amount_suggested || 50000);
      setDecision(type);
    } catch (e) {
      alert(`Error recording decision: ${e.message}`);
    } finally {
      setDeciding(false);
    }
  }, [appId, data]);

  if (loading) return (
    <div className="p-5 flex flex-col gap-3 h-full bg-[#121212]">
      {[...Array(5)].map((_, i) => <div key={i} className={`animate-pulse rounded-lg bg-[#1a1a1a] border border-gray-800 ${i === 1 ? 'h-40' : 'h-12'} w-full`} />)}
    </div>
  );

  if (err) return (
    <div className="p-5 flex flex-col items-center justify-center gap-3 text-center h-full bg-[#121212]">
      <AlertCircle size={32} className="text-red-500" />
      <p className="text-red-400 text-sm font-semibold">Failed to load score data</p>
      <p className="text-gray-500 text-xs">{err}</p>
    </div>
  );

  const c = scoreColor(data.kisan_score);

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-[#121212] text-gray-300">
      {/* Panel Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-[#1a1a1a] border-b border-gray-800 shadow-sm">
        <div>
          <p className="font-bold text-white text-sm">{data.farmer_name}</p>
          <p className="text-[10px] text-gray-500 font-mono">{data.application_id}</p>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-800 transition-colors">
          <X size={16} className="text-gray-400" />
        </button>
      </div>

      <div className="p-4 sm:p-5 flex flex-col gap-4">
        {/* Score Gauge */}
        <div className="bg-[#1a1a1a] rounded-xl border border-gray-800 shadow-sm overflow-hidden">
          <div className="bg-[#111] border-b border-gray-800 px-4 py-2.5 flex items-center gap-2">
            <Cpu size={13} className="text-[#c8102e]" />
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">AI KisanScore Rating</span>
          </div>
          <ScoreGauge score={data.kisan_score} />
        </div>

        {/* Action Buttons */}
        {decision ? (
          <div className={`flex items-center justify-center gap-2 py-4 rounded-xl border font-bold text-sm
            ${decision === 'APPROVED' ? 'bg-green-900/30 border-green-700/50 text-green-400' : 'bg-red-900/30 border-red-700/50 text-red-400'}
          `}>
            {decision === 'APPROVED' ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
            Decision Recorded: {decision}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => handleDecision('APPROVED')} disabled={deciding}
              className="flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-sm
                bg-green-600 hover:bg-green-700 text-white transition-all active:scale-[0.97]
                disabled:opacity-50 disabled:cursor-not-allowed border border-green-500/50">
              {deciding ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              APPROVE
            </button>
            <button onClick={() => handleDecision('REJECTED')} disabled={deciding}
              className="flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-sm
                bg-[#c8102e] hover:bg-[#a00d25] text-white transition-all active:scale-[0.97]
                disabled:opacity-50 disabled:cursor-not-allowed border border-red-500/50">
              {deciding ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
              REJECT
            </button>
          </div>
        )}

        {/* Environmental Data */}
        {data.environmental_data && (
          <div className="bg-[#1a1a1a] rounded-xl border border-gray-800 overflow-hidden">
            <div className="bg-[#111] border-b border-gray-800 px-4 py-2 flex items-center gap-2">
              <BarChart2 size={13} className="text-blue-400" />
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Environmental Data</span>
            </div>
            <div className="grid grid-cols-3 gap-3 p-4">
              {[
                { l: 'NDVI Score', v: data.environmental_data.historical_ndvi, c: 'text-teal-400 bg-teal-500/10 border-teal-500/20' },
                { l: 'Rainfall (mm)', v: data.environmental_data.rainfall_mm, c: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
                { l: 'Soil Nitrogen', v: data.environmental_data.soil_nitrogen, c: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
              ].map(({ l, v, c: tc }) => (
                <div key={l} className={`rounded-lg border p-2.5 text-center ${tc}`}>
                  <p className="text-base font-black">{v}</p>
                  <p className="text-[9px] mt-0.5 opacity-70">{l}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Views ─────────────────────────────────────────────────────────────────────
const SettingsView = () => (
  <div className="flex flex-col flex-1 p-6 text-gray-300">
    <h2 className="text-xl font-bold text-white mb-6">System Settings</h2>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
      <div className="bg-[#1a1a1a] rounded-xl border border-gray-800 p-5">
        <h3 className="font-semibold text-white mb-4 flex items-center gap-2"><Cpu size={16} className="text-[#c8102e]" /> AI Engine Configuration</h3>
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-gray-400">Decision Threshold</span>
            <input type="range" className="accent-[#c8102e]" />
          </label>
          <label className="flex items-center gap-3">
            <input type="checkbox" defaultChecked className="accent-[#c8102e] w-4 h-4 rounded bg-gray-800 border-gray-700" />
            <span className="text-sm">Auto-Approve Low Risk &lt; ₹50,000</span>
          </label>
        </div>
      </div>
      <div className="bg-[#1a1a1a] rounded-xl border border-gray-800 p-5">
        <h3 className="font-semibold text-white mb-4 flex items-center gap-2"><User size={16} className="text-blue-400" /> Officer Preferences</h3>
        <div className="flex flex-col gap-4">
          <label className="flex items-center gap-3">
            <input type="checkbox" defaultChecked className="accent-blue-500 w-4 h-4 rounded bg-gray-800 border-gray-700" />
            <span className="text-sm">Enable Desktop Notifications</span>
          </label>
          <label className="flex items-center gap-3">
            <input type="checkbox" defaultChecked className="accent-blue-500 w-4 h-4 rounded bg-gray-800 border-gray-700" />
            <span className="text-sm">Dark Mode UI (Forced)</span>
          </label>
        </div>
      </div>
    </div>
  </div>
);

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate();
  const [activeNav, setActiveNav] = useState('dashboard');
  const [queue, setQueue] = useState([]);
  const [queueLoading, setQueueLoading] = useState(true);
  const [queueError, setQueueError] = useState('');
  const [selectedId, setSelectedId] = useState(null);

  const loadQueue = useCallback(async () => {
    setQueueLoading(true); setQueueError('');
    try {
      const data = await fetchPendingQueue();
      setQueue(data);
    } catch (e) {
      setQueueError(e.message);
    } finally {
      setQueueLoading(false);
    }
  }, []);

  useEffect(() => { loadQueue(); }, [loadQueue]);

  return (
    <div className="h-screen bg-[#0f0f0f] flex flex-col overflow-hidden font-sans text-gray-200">
      <GovBar />
      <IPPBHeader onMenuClick={() => {}} onRefresh={loadQueue} loading={queueLoading} />

      <div className="flex flex-1 min-h-0 relative">
        {/* Sidebar */}
        <aside className="w-64 bg-[#121212] border-r border-gray-800 flex flex-col shrink-0 z-10">
          <div className="p-4 flex-1">
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-4 px-2">Navigation</p>
            <div className="flex flex-col gap-1">
              {[
                { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
                { id: 'approvals', icon: Clock, label: 'Pending Approvals' },
                { id: 'settings', icon: Settings, label: 'System Settings' }
              ].map(n => (
                <button key={n.id} onClick={() => setActiveNav(n.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                    ${activeNav === n.id ? 'bg-[#c8102e] text-white shadow-md' : 'text-gray-400 hover:bg-[#1a1a1a] hover:text-white'}
                  `}>
                  <n.icon size={18} strokeWidth={activeNav === n.id ? 2 : 1.5} />
                  {n.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 border-t border-gray-800">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-[#1a1a1a] border border-gray-800">
              <div className="w-9 h-9 rounded-full bg-[#c8102e] flex items-center justify-center text-[10px] font-black text-white shrink-0 shadow-inner">PK</div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white truncate">Priya Krishnan</p>
                <p className="text-[10px] text-gray-500 truncate">Branch Officer · IPPB</p>
              </div>
            </div>
            <button onClick={() => navigate('/')} className="w-full mt-3 flex items-center gap-2 px-3 py-2 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-[#1a1a1a] text-xs font-medium transition-colors">
              <LogOut size={14} /> Sign Out
            </button>
          </div>
        </aside>

        {/* Main Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#0f0f0f]">
          {activeNav === 'settings' ? <SettingsView /> : (
            <>
              {/* KPIs */}
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 p-5 bg-[#121212] border-b border-gray-800 shrink-0">
                <KpiCard icon={Hourglass} label="Pending Review" value={queue.length} sub="Applications in queue" colorClass="bg-red-500/20 text-red-500 border border-red-500/30" />
                <KpiCard icon={CheckCircle2} label="Approved Today" value="12" sub="₹8.2L disbursed" colorClass="bg-green-500/20 text-green-500 border border-green-500/30" />
                <KpiCard icon={XCircle} label="Rejected Today" value="3" sub="Risk threshold exceeded" colorClass="bg-gray-800 text-gray-400 border border-gray-700" />
                <KpiCard icon={LineChart} label="Avg KisanScore" value="718" sub="Portfolio health: Good" colorClass="bg-blue-500/20 text-blue-400 border border-blue-500/30" />
              </div>

              {/* Table / Details Split */}
              <div className="flex flex-1 min-h-0 bg-[#0f0f0f] p-4 gap-4">
                <div className={`flex flex-col bg-[#161616] rounded-xl border border-gray-800 overflow-hidden transition-all ${selectedId ? 'w-1/2 hidden lg:flex' : 'w-full'}`}>
                  <div className="px-4 py-3 bg-[#111] border-b border-gray-800 flex items-center gap-2 shrink-0">
                    <div className="w-1 h-4 bg-[#c8102e] rounded-full" />
                    <h2 className="text-sm font-bold text-white">Pending Applications</h2>
                    <span className="px-2 py-0.5 text-[10px] rounded-full bg-red-500/20 text-red-400 font-bold border border-red-500/30 ml-2">{queue.length}</span>
                  </div>

                  <div className="flex-1 overflow-y-auto">
                    {queueError && (
                      <div className="m-4 p-4 rounded-lg bg-red-950/40 border border-red-900 flex gap-3 text-red-400">
                        <AlertCircle size={18} className="shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-sm mb-1">Cannot connect to backend</p>
                          <p className="text-xs opacity-80 mb-2">{queueError}</p>
                          <code className="text-[10px] bg-black/50 px-2 py-1 rounded">uvicorn main:app --reload --port 8000</code>
                        </div>
                      </div>
                    )}
                    {!queueError && queue.map(app => (
                      <div key={app.application_id} onClick={() => setSelectedId(app.application_id)}
                        className={`flex items-center gap-4 px-4 py-4 border-b border-gray-800 cursor-pointer transition-colors
                          ${selectedId === app.application_id ? 'bg-[#c8102e]/10 border-l-2 border-l-[#c8102e]' : 'hover:bg-[#1a1a1a]'}
                        `}>
                        <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-gray-300 font-black shrink-0">
                          {app.farmer_name?.[0] || '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm text-gray-200 truncate">{app.farmer_name}</p>
                          <p className="text-[10px] text-gray-500 font-mono mt-0.5">{app.application_id}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                            {app.status || 'Pending Review'}
                          </span>
                          <p className="text-[10px] text-gray-600 mt-1.5">{timeAgo(app.created_at)}</p>
                        </div>
                        <ChevronRight size={16} className={`shrink-0 ml-2 ${selectedId === app.application_id ? 'text-[#c8102e]' : 'text-gray-700'}`} />
                      </div>
                    ))}
                  </div>
                </div>

                {selectedId && (
                  <div className="flex-1 bg-[#161616] rounded-xl border border-gray-800 overflow-hidden shadow-xl">
                    <DetailPanel appId={selectedId} onClose={() => setSelectedId(null)} />
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
      
      <footer className="bg-[#111] text-gray-600 px-4 py-2 text-center text-[10px] shrink-0 border-t border-gray-900">
        © 2025 India Post Payments Bank Ltd. · RBI Lic. No. 20/2015-16 · CIN: U64200DL2016GOI297535 · DPDP Act 2023 Compliant
      </footer>
    </div>
  );
}
