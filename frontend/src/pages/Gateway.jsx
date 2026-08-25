import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Shield, Phone, Globe, Mail } from 'lucide-react';

// ── IPPB Top Government Bar ──────────────────────────────────────────────────
const GovBar = () => (
  <div className="bg-[#1a1a1a] text-white text-[11px]">
    <div className="ippb-tricolor" />
    <div className="max-w-7xl mx-auto px-4 py-1.5 flex flex-wrap items-center justify-between gap-1">
      <span className="text-gray-300">भारत सरकार | Government of India · Ministry of Communications · Department of Posts</span>
      <div className="flex items-center gap-4 text-gray-400">
        <span className="hidden sm:flex items-center gap-1"><Globe size={10} /> ippb.gov.in</span>
        <span className="flex items-center gap-1"><Phone size={10} /> 155299</span>
        <span className="hidden md:flex items-center gap-1"><Mail size={10} /> care@ippbonline.com</span>
      </div>
    </div>
  </div>
);

// ── IPPB Main Header ─────────────────────────────────────────────────────────
const IPPBHeader = () => (
  <header className="bg-[#c8102e] shadow-lg">
    <div className="max-w-7xl mx-auto px-4 py-3 sm:py-4 flex items-center justify-between gap-4">
      {/* Logo area */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* India Post logo circle */}
        <div className="w-10 h-10 sm:w-14 sm:h-14 bg-white rounded-full flex items-center justify-center shadow-md shrink-0">
          <div className="text-center">
            <div className="text-[#c8102e] font-black text-[9px] sm:text-[10px] leading-tight">INDIA</div>
            <div className="text-[#c8102e] font-black text-[7px] sm:text-[8px] leading-tight">POST</div>
          </div>
        </div>
        <div>
          <h1 className="text-white font-black text-lg sm:text-2xl leading-tight tracking-tight">
            India Post Payments Bank
          </h1>
          <p className="text-red-200 text-[10px] sm:text-xs font-medium">
            Aapka Bank, Aapke Dwar · आपका बैंक, आपके द्वार
          </p>
        </div>
      </div>

      {/* Status badge */}
      <div className="hidden sm:flex items-center gap-2 bg-white/15 px-3 py-2 rounded-lg border border-white/20">
        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        <span className="text-white text-xs font-semibold">KisanScore System Online</span>
      </div>
    </div>

    {/* Nav bar */}
    <div className="bg-[#a00d25]">
      <div className="max-w-7xl mx-auto px-4">
        <nav className="flex items-center gap-0 overflow-x-auto">
          {['Home', 'About IPPB', 'Products', 'Agents', 'KisanScore Portal', 'Downloads', 'Contact Us'].map((item, i) => (
            <a key={item} href="#"
              className={`px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-medium whitespace-nowrap border-b-2 transition-colors
                ${i === 4
                  ? 'border-white text-white font-bold'
                  : 'border-transparent text-red-200 hover:text-white hover:border-red-300'}`}
            >
              {item}
            </a>
          ))}
        </nav>
      </div>
    </div>
  </header>
);

// ── Portal Card ──────────────────────────────────────────────────────────────
const PortalCard = ({ emoji, title, subtitle, tag, features, onClick, accent }) => (
  <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col">
    {/* Card accent */}
    <div className={`h-1.5 ${accent}`} />
    <div className="p-6 sm:p-8 flex flex-col flex-1">
      <div className="text-4xl mb-4">{emoji}</div>
      <div className="inline-block px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-500 mb-3 w-fit">
        {tag}
      </div>
      <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">{title}</h2>
      <p className="text-sm text-gray-500 leading-relaxed mb-5">{subtitle}</p>

      {/* Feature list */}
      <ul className="flex flex-col gap-2 mb-6 flex-1">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-xs text-gray-600">
            <span className="w-4 h-4 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold">✓</span>
            {f}
          </li>
        ))}
      </ul>

      <button
        onClick={onClick}
        className={`w-full py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2
          text-white transition-all duration-200 active:scale-[0.98] hover:opacity-90 ${accent}`}
      >
        Access Portal <ChevronRight size={16} />
      </button>
    </div>
  </div>
);

// ── Stat Card ────────────────────────────────────────────────────────────────
const Stat = ({ value, label, icon }) => (
  <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 text-center">
    <div className="text-2xl mb-1">{icon}</div>
    <p className="text-xl sm:text-2xl font-black text-[#c8102e]">{value}</p>
    <p className="text-xs text-gray-500 mt-0.5">{label}</p>
  </div>
);

// ── Gateway Page ─────────────────────────────────────────────────────────────
export default function Gateway() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <GovBar />
      <IPPBHeader />

      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-[#c8102e] to-[#8b0d20] text-white">
        <div className="max-w-7xl mx-auto px-4 py-10 sm:py-14">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-white/15 border border-white/20 text-xs font-semibold mb-5 uppercase tracking-wider">
              <Shield size={11} /> KisanScore · AI Agricultural Credit Evaluation System · Version 2.1
            </div>
            <h1 className="text-2xl sm:text-4xl md:text-5xl font-black leading-tight mb-4">
              Empowering Farmers with
              <span className="block text-yellow-300">AI-Powered Credit Scoring</span>
            </h1>
            <p className="text-sm sm:text-base text-red-100 leading-relaxed max-w-2xl mb-6">
              KisanScore provides alternative credit assessments for unbanked farmers using
              satellite imagery (NDVI), ISRIC soil data, and NASA POWER rainfall analysis —
              enabling fair financial inclusion under PM-KISAN & Kisan Credit Card schemes.
            </p>
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 border border-white/20 text-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400" /> RBI Regulated · Compliant
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 border border-white/20 text-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400" /> UIDAI Aadhaar Authentication
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 border border-white/20 text-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" /> ISO 27001 Certified
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 py-8 sm:py-12 w-full">
        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-10">
          <Stat value="300–900" label="KisanScore Range" icon="📊" />
          <Stat value="XGBoost" label="ML Scoring Engine" icon="🤖" />
          <Stat value="SHAP" label="AI Explainability" icon="🔍" />
          <Stat value="RBI" label="Regulated Entity" icon="🏦" />
        </div>

        {/* Portal Cards */}
        <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-5 flex items-center gap-2">
          <span className="w-1 h-6 bg-[#c8102e] rounded" />
          Select Your Portal
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6 max-w-3xl">
          <PortalCard
            emoji="🧑‍✈️"
            title="Postman / GDS Field App"
            subtitle="Collect farmer applications from the field. Capture Aadhaar KYC, GPS farm boundary, and crop details."
            tag="Mobile · Field Application"
            features={[
              'Aadhaar OTP Authentication via UIDAI',
              'GPS Farm Polygon Capture with Live Map',
              'Crop & Land Details Entry',
              'Instant Application Submission to AI Engine',
            ]}
            accent="bg-[#c8102e]"
            onClick={() => navigate('/postman')}
          />
          <PortalCard
            emoji="👩‍💼"
            title="Bank Officer Dashboard"
            subtitle="Review AI KisanScores, SHAP explainability reports, and issue final loan approvals or rejections."
            tag="Desktop · Bank Operations"
            features={[
              'AI KisanScore Gauge (300–900 Scale)',
              'SHAP Explainability Factor Cards',
              'One-Click Approve / Reject Decisions',
              'Live Application Queue Management',
            ]}
            accent="bg-[#1a3a6b]"
            onClick={() => navigate('/dashboard')}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-[#1a1a1a] text-gray-400 mt-auto">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:py-8">
          <div className="flex flex-wrap items-start gap-8 mb-6">
            <div>
              <p className="text-white font-bold text-sm mb-2">India Post Payments Bank</p>
              <p className="text-xs leading-relaxed max-w-xs">
                A Government of India enterprise under Ministry of Communications.
                Regulated by Reserve Bank of India.
              </p>
              <p className="text-xs mt-1">CIN: U64200DL2016GOI297535</p>
            </div>
            <div>
              <p className="text-white font-semibold text-xs mb-2 uppercase tracking-wider">Quick Links</p>
              <div className="flex flex-col gap-1 text-xs">
                <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
                <a href="#" className="hover:text-white transition-colors">Terms & Conditions</a>
                <a href="#" className="hover:text-white transition-colors">Grievance Redressal</a>
                <a href="#" className="hover:text-white transition-colors">RTI</a>
              </div>
            </div>
            <div>
              <p className="text-white font-semibold text-xs mb-2 uppercase tracking-wider">Contact</p>
              <div className="flex flex-col gap-1 text-xs">
                <span>📞 155299 (Toll Free)</span>
                <span>📧 care@ippbonline.com</span>
                <span>🌐 ippbonline.bank.in</span>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-700 pt-4 text-[10px] text-center">
            © 2025 India Post Payments Bank Ltd. · All rights reserved.
            Site is best viewed at 1024 × 768 resolution with IE 10+, Chrome 40+, Firefox 40+
          </div>
        </div>
      </footer>
    </div>
  );
}
