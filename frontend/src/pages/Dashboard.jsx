import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Clock, Settings, LogOut,
  ChevronRight, Loader2, CheckCircle2, XCircle,
  RefreshCw, BarChart2, ShieldCheck, Zap,
  X, AlertCircle, Menu, TrendingUp, Cpu, Info, User,
} from 'lucide-react';
import {
  RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer,
} from 'recharts';
import { fetchPendingQueue, fetchScore, submitDecision } from '../api/client';

// ── Helpers ──────────────────────────────────────────────────────────────────
function scoreColor(score) {
  if (score >= 700) return { text: 'text-green-600', bg: 'bg-green-50', border: 'border-green-300', hex: '#16a34a', label: 'Low Risk', badge: 'bg-green-100 text-green-700' };
  if (score >= 550) return { text: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-300', hex: '#d97706', label: 'Moderate Risk', badge: 'bg-amber-100 text-amber-700' };
  return { text: 'text-red-600', bg: 'bg-red-50', border: 'border-red-300', hex: '#dc2626', label: 'High Risk', badge: 'bg-red-100 text-red-700' };
}

function riskBadge(risk) {
  const m = {
    'Very Low': 'bg-green-100 text-green-700 border-green-300',
    Low: 'bg-emerald-100 text-emerald-700 border-emerald-300',
    Moderate: 'bg-amber-100 text-amber-700 border-amber-300',
    High: 'bg-red-100 text-red-700 border-red-300',
  };
  return m[risk] || 'bg-gray-100 text-gray-600 border-gray-300';
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
  <div className="bg-[#1a1a1a] text-[10px] text-gray-400 shrink-0">
    <div className="ippb-tricolor" />
    <div className="px-4 py-1 flex items-center justify-between">
      <span>Government of India · Ministry of Communications · Department of Posts</span>
      <span className="hidden sm:block">ippbonline.bank.in</span>
    </div>
  </div>
);

// ── IPPB Header ───────────────────────────────────────────────────────────────
const IPPBHeader = ({ onMenuClick, queueCount, onRefresh, loading }) => (
  <header className="bg-[#c8102e] shadow-md shrink-0">
    <div className="px-4 py-3 flex items-center gap-3">
      <button onClick={onMenuClick} className="lg:hidden p-1.5 rounded bg-white/10 hover:bg-white/20 transition-colors">
        <Menu size={18} className="text-white" />
      </button>
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shrink-0">
          <span className="text-[#c8102e] font-black text-[8px] leading-tight text-center">IPPB</span>
        </div>
        <div>
          <p className="text-white font-black text-sm leading-tight">KisanScore · Credit Evaluation System</p>
          <p className="text-red-200 text-[10px] hidden sm:block">India Post Payments Bank · Bank Officer Portal</p>
        </div>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <button onClick={onRefresh}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-white/15 hover:bg-white/25 border border-white/20 text-white text-xs font-medium transition-colors">
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded bg-green-500/20 border border-green-400/30">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-green-200 text-xs font-medium">AI Online</span>
        </div>
      </div>
    </div>

    {/* Sub-nav */}
    <div className="bg-[#a00d25] px-4">
      <div className="flex items-center gap-0 text-xs overflow-x-auto">
        {['Dashboard', 'Pending Approvals', 'Approved Loans', 'Rejected', 'Reports', 'Settings'].map((item, i) => (
          <a key={item} href="#"
            className={`px-3 sm:px-4 py-2 font-medium whitespace-nowrap border-b-2 transition-colors
              ${i <= 1 ? 'border-white text-white font-bold' : 'border-transparent text-red-300 hover:text-white'}`}>
            {item}{i === 1 && queueCount > 0 ? ` (${queueCount})` : ''}
          </a>
        ))}
      </div>
    </div>
  </header>
);

// ── KPI Card ──────────────────────────────────────────────────────────────────
const KpiCard = ({ icon, label, value, sub, color }) => (
  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-start gap-3">
    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${color} text-white text-lg`}>
      {icon}
    </div>
    <div className="min-w-0">
      <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider truncate">{label}</p>
      <p className="text-xl font-black text-gray-900">{value}</p>
      {sub && <p className="text-[10px] text-gray-400 truncate">{sub}</p>}
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
          <RadialBarChart cx="50%" cy="85%" innerRadius="70%" outerRadius="100%"
            startAngle={180} endAngle={0} barSize={18}
            data={[{ value: pct, fill: c.hex }]}
          >
            <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
            <RadialBar background={{ fill: '#f3f4f6' }} dataKey="value" angleAxisId={0} cornerRadius={8} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center">
          <p className={`text-3xl sm:text-4xl font-black ${c.text}`}>{score}</p>
          <p className="text-[10px] text-gray-400">out of 900</p>
        </div>
      </div>
      <div className={`mt-2 px-4 py-1.5 rounded-full border text-xs font-bold ${c.badge} ${c.border}`}>
        {c.label}
      </div>
      <div className="flex items-center gap-2 mt-3 text-[10px] text-gray-400">
        <span className="text-red-500 font-bold">300</span>
        <div className="h-1 w-20 rounded-full bg-gradient-to-r from-red-500 via-amber-400 to-green-500" />
        <span className="text-green-500 font-bold">900</span>
      </div>
    </div>
  );
};

// ── SHAP Chip ─────────────────────────────────────────────────────────────────
const ShapChip = ({ feature, impact }) => {
  const pos = !String(impact).startsWith('-');
  return (
    <div className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-xs
      ${pos ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}
    `}>
      <span className={`text-sm font-black shrink-0 ${pos ? 'text-green-500' : 'text-red-500'}`}>{pos ? '▲' : '▼'}</span>
      <span className="flex-1 leading-snug">{feature}</span>
      <span className={`font-black text-sm shrink-0 ${pos ? 'text-green-600' : 'text-red-600'}`}>
        {pos ? '+' : ''}{impact}
      </span>
    </div>
  );
};

// ── Sidebar Nav ───────────────────────────────────────────────────────────────
const NavItem = ({ icon: Icon, label, active, badge, onClick }) => (
  <button onClick={onClick}
    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150
      ${active ? 'bg-[#c8102e] text-white' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}
    `}
  >
    <Icon size={16} strokeWidth={active ? 2 : 1.5} />
    <span className="flex-1 text-left">{label}</span>
    {badge !== undefined && badge > 0 && (
      <span className={`px-2 py-0.5 text-[10px] rounded-full font-black ${active ? 'bg-white text-[#c8102e]' : 'bg-[#c8102e] text-white'}`}>
        {badge}
      </span>
    )}
  </button>
);

// ── Table Row ─────────────────────────────────────────────────────────────────
const AppRow = ({ app, selected, onClick }) => (
  <tr onClick={onClick}
    className={`group cursor-pointer border-b border-gray-100 transition-all duration-150
      ${selected ? 'bg-red-50 border-l-2 border-l-[#c8102e]' : 'hover:bg-gray-50'}
    `}
  >
    <td className="px-4 py-3.5">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-full bg-[#c8102e] flex items-center justify-center text-xs font-black text-white shrink-0">
          {app.farmer_name?.[0] ?? '?'}
        </div>
        <div>
          <p className="font-semibold text-gray-900 text-sm">{app.farmer_name}</p>
          <p className="text-[10px] text-gray-400 font-mono">{app.application_id}</p>
        </div>
      </div>
    </td>
    <td className="px-4 py-3.5 hidden md:table-cell">
      <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700 border border-amber-200">
        {app.status || 'Pending Review'}
      </span>
    </td>
    <td className="px-4 py-3.5 hidden lg:table-cell text-xs text-gray-400">{timeAgo(app.created_at)}</td>
    <td className="px-4 py-3.5 text-right">
      <ChevronRight size={15} className={`ml-auto transition-all ${selected ? 'text-[#c8102e]' : 'text-gray-300 group-hover:text-gray-500'}`} />
    </td>
  </tr>
);

// ── Skeleton ──────────────────────────────────────────────────────────────────
const Sk = ({ className }) => <div className={`animate-pulse rounded-lg bg-gray-200 ${className}`} />;

// ── Detail Panel ──────────────────────────────────────────────────────────────
const DetailPanel = ({ appId, onClose }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [decision, setDecision] = useState(null);
  const [deciding, setDeciding] = useState(false);
  const [toast, setToast] = useState(null);

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
      const res = await submitDecision(appId, type, data?.loan_amount_suggested || 50000);
      setDecision(type);
      setToast({ type, message: res.message });
      setTimeout(() => setToast(null), 5000);
    } catch (e) {
      setToast({ type: 'ERROR', message: e.message });
      setTimeout(() => setToast(null), 5000);
    } finally {
      setDeciding(false);
    }
  }, [appId, data]);

  if (loading) return (
    <div className="p-5 flex flex-col gap-3">
      {[...Array(7)].map((_, i) => <Sk key={i} className={`h-${i === 1 ? 36 : 8} w-full`} />)}
    </div>
  );

  if (err) return (
    <div className="p-5 flex flex-col items-center gap-3 text-center">
      <AlertCircle size={32} className="text-red-400" />
      <p className="text-red-600 text-sm font-semibold">Failed to load score data</p>
      <p className="text-gray-500 text-xs">{err}</p>
      <p className="text-gray-400 text-xs mt-1">
        Ensure backend is running: <code className="bg-gray-100 px-1 rounded text-gray-600 font-mono">uvicorn main:app --reload --port 8000</code>
      </p>
    </div>
  );

  const c = scoreColor(data.kisan_score);

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-gray-50">
      {/* Panel Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 shadow-sm">
        <div>
          <p className="font-bold text-gray-900 text-sm">{data.farmer_name}</p>
          <p className="text-[10px] text-gray-400 font-mono">{data.application_id}</p>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
          <X size={16} className="text-gray-500" />
        </button>
      </div>

      <div className="p-4 sm:p-5 flex flex-col gap-4">
        {/* Toast */}
        {toast && (
          <div className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium
            ${toast.type === 'APPROVED' ? 'bg-green-50 border-green-300 text-green-700'
            : toast.type === 'REJECTED' ? 'bg-red-50 border-red-300 text-red-700'
            : 'bg-yellow-50 border-yellow-300 text-yellow-700'}
          `}>
            {toast.type === 'APPROVED' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
            <span className="text-xs">{toast.message}</span>
          </div>
        )}

        {/* Farmer type */}
        {data.farmer_type && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-gray-200 text-xs text-gray-500 w-fit shadow-sm">
            <User size={11} /> {data.farmer_type}
          </div>
        )}

        {/* Score Gauge */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-gray-50 border-b border-gray-200 px-4 py-2.5 flex items-center gap-2">
            <Cpu size={13} className="text-[#c8102e]" />
            <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">AI KisanScore Rating</span>
          </div>
          <ScoreGauge score={data.kisan_score} />
        </div>

        {/* Routing */}
        {data.routing_path && (
          <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${c.bg} ${c.border}`}>
            <Zap size={15} className={c.text} />
            <div>
              <p className="text-[10px] text-gray-500 font-medium">Routing Decision</p>
              <p className={`font-bold text-sm ${c.text}`}>{data.routing_path}</p>
            </div>
          </div>
        )}

        {/* Risk */}
        <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-white border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <ShieldCheck size={14} /> Risk Assessment
          </div>
          <span className={`px-3 py-1 rounded-full border text-xs font-bold ${riskBadge(data.risk_level)}`}>
            {data.risk_level} Risk
          </span>
        </div>

        {/* Environmental Data */}
        {data.environmental_data && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="bg-gray-50 border-b border-gray-200 px-4 py-2.5 flex items-center gap-2">
              <BarChart2 size={13} className="text-blue-500" />
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">Satellite & Environmental Data</span>
            </div>
            <div className="grid grid-cols-3 gap-3 p-4">
              {[
                { l: 'NDVI Score', v: data.environmental_data.historical_ndvi, c: 'text-teal-600 bg-teal-50 border-teal-200' },
                { l: 'Rainfall (mm)', v: data.environmental_data.rainfall_mm, c: 'text-blue-600 bg-blue-50 border-blue-200' },
                { l: 'Soil Nitrogen', v: data.environmental_data.soil_nitrogen, c: 'text-orange-600 bg-orange-50 border-orange-200' },
              ].map(({ l, v, c: tc }) => (
                <div key={l} className={`rounded-lg border p-2.5 text-center ${tc}`}>
                  <p className="text-base font-black">{v}</p>
                  <p className="text-[9px] mt-0.5 opacity-70">{l}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SHAP */}
        {data.shap_explainability?.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="bg-gray-50 border-b border-gray-200 px-4 py-2.5 flex items-center gap-2">
              <Info size={13} className="text-violet-500" />
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">SHAP AI Explainability Factors</span>
            </div>
            <div className="p-3 flex flex-col gap-2">
              {data.shap_explainability.map((s, i) => (
                <ShapChip key={i} feature={s.feature} impact={s.impact} />
              ))}
            </div>
          </div>
        )}

        {/* Recommendation */}
        {data.recommendation && (
          <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-blue-50 border border-blue-200">
            <Cpu size={14} className="text-blue-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-[10px] text-blue-500 font-bold uppercase tracking-wide mb-1">AI System Recommendation</p>
              <p className="text-xs text-blue-800 leading-relaxed">{data.recommendation}</p>
            </div>
          </div>
        )}

        {/* Loan Amount */}
        {data.loan_amount_suggested && (
          <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-white border border-gray-200 shadow-sm">
            <span className="text-xs text-gray-500 font-medium">AI Suggested Loan Amount</span>
            <span className="text-base font-black text-gray-900">{fmt(data.loan_amount_suggested)}</span>
          </div>
        )}

        {/* Action Buttons */}
        {decision ? (
          <div className={`flex items-center justify-center gap-2 py-4 rounded-xl border font-bold text-sm
            ${decision === 'APPROVED' ? 'bg-green-50 border-green-300 text-green-700' : 'bg-red-50 border-red-300 text-red-700'}
          `}>
            {decision === 'APPROVED' ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
            Decision Recorded: {decision}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => handleDecision('APPROVED')} disabled={deciding}
              className="flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-sm
                bg-green-600 hover:bg-green-700 text-white transition-all active:scale-[0.97]
                disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-green-200">
              {deciding ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              ✅ APPROVE LOAN
            </button>
            <button onClick={() => handleDecision('REJECTED')} disabled={deciding}
              className="flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-sm
                bg-[#c8102e] hover:bg-[#a00d25] text-white transition-all active:scale-[0.97]
                disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-red-200">
              {deciding ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
              ❌ REJECT LOAN
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate();
  const [activeNav, setActiveNav] = useState('approvals');
  const [queue, setQueue] = useState([]);
  const [queueLoading, setQueueLoading] = useState(true);
  const [queueError, setQueueError] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const loadQueue = useCallback(async () => {
    setQueueLoading(true);
    setQueueError('');
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
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <GovBar />
      <IPPBHeader
        onMenuClick={() => setSidebarOpen(!sidebarOpen)}
        queueCount={queue.length}
        onRefresh={loadQueue}
        loading={queueLoading}
      />

      <div className="flex flex-1 min-h-0 relative overflow-hidden">
        {/* Mobile overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Sidebar */}
        <aside className={`
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
          fixed lg:relative z-40 lg:z-auto
          w-56 h-full lg:h-auto flex flex-col shrink-0
          border-r border-gray-200 bg-white shadow-sm
          transition-transform duration-200 lg:transition-none
        `}>
          <div className="p-4 border-b border-gray-100">
            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-widest mb-3">Navigation</p>
            <div className="flex flex-col gap-1">
              <NavItem icon={LayoutDashboard} label="Dashboard" active={activeNav === 'dashboard'} onClick={() => { setActiveNav('dashboard'); setSidebarOpen(false); }} />
              <NavItem icon={Clock} label="Pending Approvals" active={activeNav === 'approvals'} badge={queue.length} onClick={() => { setActiveNav('approvals'); setSidebarOpen(false); }} />
              <NavItem icon={Settings} label="System Settings" active={activeNav === 'settings'} onClick={() => { setActiveNav('settings'); setSidebarOpen(false); }} />
            </div>
          </div>

          {/* Officer info */}
          <div className="p-4 mt-auto border-t border-gray-100">
            <div className="flex items-center gap-2.5 p-3 rounded-lg bg-gray-50 border border-gray-200">
              <div className="w-8 h-8 rounded-full bg-[#c8102e] flex items-center justify-center text-[10px] font-black text-white shrink-0">PK</div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-gray-900 truncate">Priya Krishnan</p>
                <p className="text-[9px] text-gray-500 truncate">Branch Officer · IPPB</p>
              </div>
            </div>
            <button onClick={() => navigate('/')}
              className="w-full mt-2 flex items-center gap-2 px-3 py-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 text-xs font-medium transition-colors">
              <LogOut size={13} /> Sign Out
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* KPI */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 p-4 border-b border-gray-200 bg-white shrink-0">
            <KpiCard icon="⏳" label="Pending Review" value={queueLoading ? '—' : queue.length} sub="Applications in queue" color="bg-[#c8102e]" />
            <KpiCard icon="✅" label="Approved Today" value="12" sub="₹8.2L disbursed" color="bg-green-600" />
            <KpiCard icon="❌" label="Rejected Today" value="3" sub="Risk threshold exceeded" color="bg-gray-500" />
            <KpiCard icon="📈" label="Avg KisanScore" value="718" sub="Portfolio health: Good" color="bg-blue-700" />
          </div>

          {/* Split panel */}
          <div className="flex flex-1 min-h-0">
            {/* Table */}
            <div className={`flex flex-col min-h-0 transition-all duration-300 ${selectedId ? 'hidden md:flex md:w-[52%]' : 'flex-1'}`}>
              <div className="px-4 py-3 bg-white border-b border-gray-200 flex items-center gap-2 shrink-0">
                <div className="w-1 h-5 bg-[#c8102e] rounded" />
                <h2 className="text-sm font-bold text-gray-800">Pending Applications</h2>
                <span className="px-2 py-0.5 text-[10px] rounded-full bg-[#c8102e] text-white font-bold">{queue.length}</span>
              </div>

              <div className="flex-1 overflow-y-auto bg-white">
                {queueError && (
                  <div className="m-4 flex items-start gap-2.5 px-4 py-3 rounded-xl bg-red-50 border border-red-200">
                    <AlertCircle size={15} className="text-red-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-red-700 text-sm font-semibold">Cannot connect to backend</p>
                      <p className="text-xs text-red-500 mt-0.5">{queueError}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Run: <code className="bg-gray-100 px-1 rounded font-mono">uvicorn main:app --reload --port 8000</code>
                      </p>
                    </div>
                  </div>
                )}

                {queueLoading ? (
                  <div className="p-4 flex flex-col gap-3">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="flex items-center gap-3 animate-pulse">
                        <div className="w-8 h-8 rounded-full bg-gray-200" />
                        <div className="flex-1 h-4 rounded bg-gray-200" />
                        <div className="w-16 h-4 rounded bg-gray-200" />
                      </div>
                    ))}
                  </div>
                ) : !queueError && queue.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                    <CheckCircle2 size={40} className="mb-3 text-green-300" />
                    <p className="font-semibold text-sm text-gray-600">All applications reviewed</p>
                    <p className="text-xs mt-1">No pending cases in queue</p>
                  </div>
                ) : !queueError ? (
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                        <th className="px-4 py-3 text-left">Farmer / App ID</th>
                        <th className="px-4 py-3 text-left hidden md:table-cell">Status</th>
                        <th className="px-4 py-3 text-left hidden lg:table-cell">Received</th>
                        <th className="px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {queue.map((app) => (
                        <AppRow key={app.application_id} app={app}
                          selected={selectedId === app.application_id}
                          onClick={() => { setSelectedId(app.application_id); setSidebarOpen(false); }}
                        />
                      ))}
                    </tbody>
                  </table>
                ) : null}
              </div>
            </div>

            {/* Detail Panel */}
            {selectedId && (
              <div className="flex-1 md:w-[48%] md:flex-none border-l border-gray-200 overflow-hidden flex flex-col">
                <DetailPanel key={selectedId} appId={selectedId} onClose={() => setSelectedId(null)} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-[#1a1a1a] text-gray-500 px-4 py-3 text-center shrink-0">
        <p className="text-[10px]">
          © 2025 India Post Payments Bank Ltd. · RBI Lic. No. 20/2015-16 · CIN: U64200DL2016GOI297535 · DPDP Act 2023 Compliant
        </p>
      </footer>
    </div>
  );
}
