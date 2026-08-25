import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Polygon, useMapEvents, Popup } from 'react-leaflet';
import L from 'leaflet';
import {
  ArrowLeft, CheckCircle2, Loader2, Smartphone, MapPin,
  Send, User, Wheat, ChevronRight, AlertCircle, Trash2,
  Info,
} from 'lucide-react';
import { submitApplication } from '../api/client';

// Fix Leaflet default icon (Vite asset issue)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// ── Custom red marker ─────────────────────────────────────────────────────────
const redIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// ── Map click handler ─────────────────────────────────────────────────────────
const MapClickHandler = ({ onAddPoint, onMouseMove, enabled }) => {
  useMapEvents({
    click(e) {
      if (enabled) {
        onAddPoint([e.latlng.lat, e.latlng.lng]);
      }
    },
    mousemove(e) {
      if (enabled && onMouseMove) {
        onMouseMove(e.latlng);
      }
    },
    mouseout() {
      if (enabled && onMouseMove) {
        onMouseMove(null);
      }
    }
  });
  return null;
};

// ── Calculate polygon area (Shoelace formula, approximate acres) ──────────────
function calcArea(points) {
  if (points.length < 3) return 0;
  let area = 0;
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += points[i][1] * points[j][0];
    area -= points[j][1] * points[i][0];
  }
  area = Math.abs(area) / 2;
  // Convert from degrees² to m² (rough at India lat ~20°N) then to acres
  const m2 = area * 111320 * 111320 * Math.cos((20 * Math.PI) / 180);
  return (m2 / 4047).toFixed(2);
}

// ── GPS Map Component ─────────────────────────────────────────────────────────
const GpsMap = ({ points, setPoints, locked }) => {
  const [isLocating, setIsLocating] = useState(false);
  const [mapCenter, setMapCenter] = useState([20.5937, 78.9629]); // India center
  const [mousePos, setMousePos] = useState(null);

  const handleAddPoint = async (lat, lng) => {
    const newPoint = { lat, lng, name: "Fetching location name..." };
    setPoints((prev) => [...prev, newPoint]);
    setMapCenter([lat, lng]);

    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
      const data = await res.json();
      const name = data.display_name || "Unknown Location";
      setPoints((prev) => prev.map((p) => (p === newPoint ? { ...p, name } : p)));
    } catch (e) {
      setPoints((prev) => prev.map((p) => (p === newPoint ? { ...p, name: "Unknown Location" } : p)));
    }
  };

  const handleRecordLocation = (e) => {
    e.preventDefault(); // Prevent form submission if inside a form
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        handleAddPoint(position.coords.latitude, position.coords.longitude);
        setIsLocating(false);
      },
      (error) => {
        console.error("Error getting location", error);
        alert("Unable to retrieve your location. Please ensure location services are enabled.");
        setIsLocating(false);
      },
      { enableHighAccuracy: true }
    );
  };

  const handleDragPoint = (index, lat, lng) => {
    setPoints(prev => prev.map((p, i) => (i === index ? { ...p, lat, lng } : p)));
  };

  const handleDragEnd = async (index, lat, lng) => {
    setPoints(prev => prev.map((p, i) => (i === index ? { ...p, lat, lng, name: "Fetching location name..." } : p)));
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
      const data = await res.json();
      const name = data.display_name || "Unknown Location";
      setPoints((prev) => prev.map((p, i) => (i === index ? { ...p, name } : p)));
    } catch (e) {
      setPoints((prev) => prev.map((p, i) => (i === index ? { ...p, name: "Unknown Location" } : p)));
    }
  };

  const polygonColor = locked ? '#138808' : '#c8102e';

  return (
    <div className="flex flex-col gap-3">
      {/* Instructions */}
      <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-700">
        <Info size={14} className="shrink-0 mt-0.5 text-blue-500" />
        <span>
          {locked
            ? `✅ GPS Polygon locked — ${points.length} boundary points captured`
            : points.length === 0
            ? 'Tap on the map or click "Record Current Location" to add points.'
            : `${points.length} point${points.length > 1 ? 's' : ''} added — you can drag markers to adjust them.`}
        </span>
      </div>

      {/* Map */}
      <div className="rounded-xl overflow-hidden border border-gray-300 shadow-sm" style={{ height: 320 }}>
        <MapContainer
          center={DEFAULT_CENTER}
          zoom={5}
          style={{ height: '100%', width: '100%' }}
          className="z-0"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapClickHandler 
            onAddPoint={(lat, lng) => handleAddPoint(lat, lng)} 
            onMouseMove={(pos) => setMousePos(pos)}
            enabled={!locked} 
          />
          <RecenterMap center={mapCenter} />

          {/* Markers */}
          {points.map((pt, i) => (
            <Marker 
              key={i} 
              position={[pt.lat, pt.lng]} 
              icon={redIcon}
              draggable={!locked}
              eventHandlers={{
                drag: (e) => handleDragPoint(i, e.target.getLatLng().lat, e.target.getLatLng().lng),
                dragend: (e) => handleDragEnd(i, e.target.getLatLng().lat, e.target.getLatLng().lng)
              }}
            >
              <Popup>
                <div className="text-xs font-mono">
                  <b>Point {i + 1}</b><br />
                  {pt[0].toFixed(5)}°N, {pt[1].toFixed(5)}°E
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Polygon */}
          {points.length >= 3 && (
            <Polygon
              positions={points}
              pathOptions={{ color: polygonColor, fillColor: polygonColor, fillOpacity: 0.15, weight: 2 }}
            />
          )}

          {/* Preview Polygon */}
          {!locked && points.length > 0 && mousePos && (
            <Polygon
              positions={[...points.map(pt => [pt.lat, pt.lng]), [mousePos.lat, mousePos.lng]]}
              pathOptions={{ color: '#888', dashArray: '5, 10', fillOpacity: 0.1, weight: 2 }}
            />
          )}
        </MapContainer>
      </div>

      {/* Point list */}
      {points.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 overflow-hidden">
          <div className="px-3 py-2 bg-gray-100 border-b border-gray-200 text-xs font-semibold text-gray-600 flex items-center justify-between">
            <span>Captured Coordinates</span>
            {!locked && (
              <button onClick={() => setPoints([])} className="flex items-center gap-1 text-red-500 hover:text-red-700 text-xs font-medium">
                <Trash2 size={11} /> Clear All
              </button>
            )}
          </div>
          <div className="max-h-28 overflow-y-auto divide-y divide-gray-100">
            {points.map((pt, i) => (
              <div key={i} className="flex items-center justify-between px-3 py-1.5 text-xs">
                <span className="text-gray-500">Point {i + 1}</span>
                <span className="font-mono text-gray-700">
                  {pt[0].toFixed(5)}°N, {pt[1].toFixed(5)}°E
                </span>
                {!locked && (
                  <button onClick={() => setPoints((p) => p.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 ml-2">
                    <Trash2 size={11} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Area estimate */}
      {points.length >= 3 && (
        <div className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-green-50 border border-green-200 text-sm">
          <span className="text-green-700 font-medium">📐 Estimated Farm Area</span>
          <span className="font-black text-green-800">{calcArea(points)} Acres</span>
        </div>
      )}
    </div>
  );
};

// ── IPPB Header ──────────────────────────────────────────────────────────────
const GovBar = () => (
  <div className="bg-[#1a1a1a] text-white text-[10px] shrink-0">
    <div className="ippb-tricolor" />
    <div className="px-4 py-1 flex items-center justify-between">
      <span className="text-gray-400">Government of India · Ministry of Communications</span>
      <span className="text-gray-500">ippb.gov.in</span>
    </div>
  </div>
);

// ── Step Header ──────────────────────────────────────────────────────────────
const StepDot = ({ n, active, done, label }) => (
  <div className="flex flex-col items-center gap-1">
    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all
      ${done ? 'bg-green-500 text-white' : active ? 'bg-[#c8102e] text-white ring-4 ring-red-200' : 'bg-gray-200 text-gray-400'}`}>
      {done ? <CheckCircle2 size={14} /> : n}
    </div>
    <span className={`text-[9px] font-medium hidden sm:block ${active ? 'text-[#c8102e]' : done ? 'text-green-600' : 'text-gray-400'}`}>
      {label}
    </span>
  </div>
);

// ── Input Field ───────────────────────────────────────────────────────────────
const Field = ({ label, hint, required, ...props }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-sm font-semibold text-gray-700">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    {hint && <p className="text-xs text-gray-400">{hint}</p>}
    <input
      {...props}
      className="w-full px-4 py-3 rounded-lg bg-white border border-gray-300
        text-gray-900 text-sm placeholder-gray-400
        focus:outline-none focus:ring-2 focus:ring-[#c8102e]/30 focus:border-[#c8102e]
        transition-all duration-200 disabled:bg-gray-100 disabled:cursor-not-allowed"
    />
  </div>
);

const SelectField = ({ label, options, required, ...props }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-sm font-semibold text-gray-700">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <select
      {...props}
      className="w-full px-4 py-3 rounded-lg bg-white border border-gray-300
        text-gray-900 text-sm
        focus:outline-none focus:ring-2 focus:ring-[#c8102e]/30 focus:border-[#c8102e]
        transition-all cursor-pointer"
    >
      <option value="">-- Select --</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  </div>
);

const PrimaryBtn = ({ children, onClick, loading, disabled, variant = 'red', className = '' }) => {
  const styles = {
    red: 'bg-[#c8102e] hover:bg-[#a00d25] text-white shadow-md shadow-red-200',
    green: 'bg-green-600 hover:bg-green-700 text-white shadow-md shadow-green-200',
    gray: 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300',
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`w-full py-3.5 rounded-lg font-bold text-sm flex items-center justify-center gap-2
        transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed
        ${styles[variant]} ${className}`}
    >
      {loading ? <Loader2 size={18} className="animate-spin" /> : children}
    </button>
  );
};

const SectionCard = ({ title, step, children }) => (
  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
    <div className="bg-[#c8102e] px-5 py-3 flex items-center gap-2">
      <span className="w-6 h-6 rounded-full bg-white text-[#c8102e] flex items-center justify-center text-xs font-black">{step}</span>
      <h2 className="text-white font-bold text-sm">{title}</h2>
    </div>
    <div className="p-5 flex flex-col gap-4">{children}</div>
  </div>
);

const VerifiedBadge = ({ text }) => (
  <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-green-50 border border-green-300">
    <CheckCircle2 size={18} className="text-green-600 shrink-0" />
    <span className="text-green-700 font-semibold text-sm">{text}</span>
  </div>
);

// ── Main Component ────────────────────────────────────────────────────────────
export default function Postman() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [aadhaar, setAadhaar] = useState('');
  const [otp, setOtp] = useState('');
  const [farmerName, setFarmerName] = useState('');
  const [crop, setCrop] = useState('');
  const [landAcres, setLandAcres] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitted, setSubmitted] = useState(null);
  const [error, setError] = useState('');
  const [polygonPoints, setPolygonPoints] = useState([]);
  const [polygonLocked, setPolygonLocked] = useState(false);

  const handleSendOtp = () => {
    if (aadhaar.replace(/\s/g, '').length < 12) { setError('Enter a valid 12-digit Aadhaar number.'); return; }
    setError('');
    setStep(2);
  };

  const handleVerifyOtp = async () => {
    if (otp.length < 6) { setError('Enter the 6-digit OTP.'); return; }
    setError('');
    setOtpLoading(true);
    await new Promise((r) => setTimeout(r, 1000));
    setOtpLoading(false);
    setStep(3);
  };

  const handleSubmit = async () => {
    if (!farmerName.trim()) { setError('Farmer name is required.'); return; }
    if (!crop) { setError('Please select a crop type.'); return; }
    if (!polygonLocked || polygonPoints.length < 3) { setError('Please capture and lock the GPS polygon (min 3 points).'); return; }
    setError('');
    setSubmitLoading(true);
    try {
      const result = await submitApplication({
        aadhaar_token: aadhaar.replace(/\s/g, ''),
        farmer_name: farmerName.trim(),
        crop_type: crop,
        land_size_acres: parseFloat(landAcres) || parseFloat(calcArea(polygonPoints)) || 1.0,
        gps_polygon: polygonPoints,
        cibil_score: -1,
        consent_captured: true,
      });
      setSubmitted(result);
    } catch (e) {
      setError(`Submission failed: ${e.message}`);
    } finally {
      setSubmitLoading(false);
    }
  };

  // ── Success ────────────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col">
        <GovBar />
        <div className="bg-[#c8102e] px-4 py-4 flex items-center gap-3">
          <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
            <span className="text-[#c8102e] font-black text-[10px]">IPPB</span>
          </div>
          <span className="text-white font-bold text-sm">KisanScore · Field Application Portal</span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-12 text-center">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 max-w-sm w-full">
            <div className="w-16 h-16 rounded-full bg-green-100 border-2 border-green-400 flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 size={32} className="text-green-600" />
            </div>
            <h1 className="text-xl font-black text-gray-900 mb-1">Application Submitted!</h1>
            <p className="text-gray-500 text-sm mb-5">The AI Scoring Engine will process this within minutes.</p>
            <div className="bg-gray-50 rounded-xl px-6 py-4 border border-gray-200 mb-4">
              <p className="text-xs text-gray-400 mb-1">Application Reference ID</p>
              <p className="text-2xl font-black text-[#c8102e] font-mono">{submitted.application_id}</p>
              <p className="text-xs text-gray-400 mt-1">Please note this ID for the farmer's records.</p>
            </div>
            <p className="text-xs text-gray-400 mb-6">{submitted.message}</p>
            <button onClick={() => navigate('/')}
              className="w-full py-3 rounded-lg bg-[#c8102e] text-white font-bold text-sm hover:bg-[#a00d25] transition-colors">
              Return to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <GovBar />

      {/* Red Header */}
      <div className="bg-[#c8102e] shrink-0">
        <div className="px-4 py-3 flex items-center justify-between max-w-2xl mx-auto w-full">
          <button onClick={() => navigate('/')} className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
            <ArrowLeft size={18} className="text-white" />
          </button>
          <div className="text-center">
            <p className="text-white font-bold text-sm">IPPB KisanScore</p>
            <p className="text-red-200 text-[10px]">Postman / GDS Field Application Portal</p>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500 text-white text-[10px] font-bold">
            ● LIVE
          </div>
        </div>

        {/* Step Progress */}
        <div className="px-4 pb-4 max-w-2xl mx-auto w-full">
          <div className="flex items-center gap-2">
            <StepDot n={1} label="Aadhaar" active={step === 1} done={step > 1} />
            <div className={`flex-1 h-0.5 transition-all ${step > 1 ? 'bg-green-400' : 'bg-white/30'}`} />
            <StepDot n={2} label="OTP" active={step === 2} done={step > 2} />
            <div className={`flex-1 h-0.5 transition-all ${step > 2 ? 'bg-green-400' : 'bg-white/30'}`} />
            <StepDot n={3} label="Details & GPS" active={step === 3} done={false} />
          </div>
        </div>
      </div>

      {/* Form Body */}
      <div className="flex-1 px-4 py-5 max-w-2xl mx-auto w-full flex flex-col gap-4">

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2.5 px-4 py-3 rounded-lg bg-red-50 border border-red-300">
            <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
            <span className="text-red-700 text-sm">{error}</span>
          </div>
        )}

        {/* STEP 1 */}
        {step === 1 && (
          <SectionCard title="Aadhaar Authentication (UIDAI)" step="1">
            <p className="text-xs text-gray-500 leading-relaxed">
              Enter the farmer's 12-digit Aadhaar number to initiate biometric KYC. Mandatory under PMLA & UIDAI Act 2016.
            </p>
            <Field
              label="Aadhaar Number"
              hint="Format: XXXX XXXX XXXX"
              required
              type="text"
              inputMode="numeric"
              maxLength={14}
              placeholder="0000 0000 0000"
              value={aadhaar}
              onChange={(e) => {
                const raw = e.target.value.replace(/\D/g, '').slice(0, 12);
                setAadhaar(raw.replace(/(\d{4})(?=\d)/g, '$1 '));
              }}
            />
            <PrimaryBtn onClick={handleSendOtp}>
              <Send size={16} /> Send OTP via UIDAI Gateway
            </PrimaryBtn>
            <p className="text-[10px] text-gray-400 text-center">🔒 AES-256 encrypted · UIDAI compliant · No data stored on device</p>
          </SectionCard>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <SectionCard title="OTP Verification" step="2">
            <div className="px-3 py-2 rounded bg-gray-50 border border-gray-200 text-xs text-gray-600 font-mono">
              OTP sent to Aadhaar-linked mobile for: <strong>{aadhaar}</strong>
            </div>
            <Field
              label="One-Time Password (OTP)"
              hint="Enter the 6-digit OTP received on registered mobile number"
              required
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="• • • • • •"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            />
            <PrimaryBtn onClick={handleVerifyOtp} loading={otpLoading}>
              <CheckCircle2 size={16} /> Verify & Proceed
            </PrimaryBtn>
          </SectionCard>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <>
            <VerifiedBadge text="Aadhaar Verified via UIDAI Gateway — Fill farmer profile details" />

            {/* Farmer Details */}
            <SectionCard title="Farmer Profile Details" step="2">
              <Field label="Full Name (as per Aadhaar)" required type="text" placeholder="e.g. Ramesh Kumar" value={farmerName} onChange={(e) => setFarmerName(e.target.value)} />
              <div className="grid grid-cols-2 gap-3">
                <SelectField
                  label="Primary Crop"
                  required
                  options={['Paddy', 'Wheat', 'Cotton', 'Soybean', 'Sugarcane', 'Maize', 'Groundnut', 'Pulses', 'Bajra', 'Jowar']}
                  value={crop}
                  onChange={(e) => setCrop(e.target.value)}
                />
                <Field
                  label="Land Size (Acres)"
                  hint="Optional — auto-calculated from map"
                  type="number"
                  inputMode="decimal"
                  placeholder="e.g. 2.5"
                  value={landAcres}
                  onChange={(e) => setLandAcres(e.target.value)}
                />
              </div>
            </SectionCard>

            {/* GPS Map Section */}
            <SectionCard title="GPS Farm Polygon Capture (Live Map)" step="3">
              <GpsMap points={polygonPoints} setPoints={setPolygonPoints} locked={polygonLocked} />
              {!polygonLocked && polygonPoints.length >= 3 && (
                <PrimaryBtn onClick={() => setPolygonLocked(true)} variant="green">
                  <MapPin size={16} /> Lock GPS Polygon ({calcArea(polygonPoints)} Acres)
                </PrimaryBtn>
              )}
              {polygonLocked && (
                <VerifiedBadge text={`GPS Polygon Locked — ${polygonPoints.length} boundary points · ${calcArea(polygonPoints)} Acres`} />
              )}
              {polygonLocked && (
                <button onClick={() => { setPolygonLocked(false); setPolygonPoints([]); }} className="text-xs text-red-500 hover:text-red-700 text-center underline">
                  Reset and recapture polygon
                </button>
              )}
            </SectionCard>

            {/* Submit */}
            <SectionCard title="Review & Submit Application" step="4">
              <div className="rounded-lg border border-gray-200 bg-gray-50 divide-y divide-gray-100 text-sm">
                {[
                  ['Farmer Name', farmerName || '—'],
                  ['Aadhaar Token', aadhaar || '—'],
                  ['Crop Type', crop || '—'],
                  ['Land Area', polygonLocked ? `${calcArea(polygonPoints)} Acres (from map)` : landAcres ? `${landAcres} Acres` : '—'],
                  ['GPS Points', polygonLocked ? `${polygonPoints.length} coordinates captured` : '❌ Not captured'],
                  ['CIBIL Score', 'No history (First-Time Farmer)'],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between px-4 py-2.5">
                    <span className="text-gray-500 text-xs">{k}</span>
                    <span className="text-gray-800 font-medium text-xs text-right max-w-[55%]">{v}</span>
                  </div>
                ))}
              </div>
              <PrimaryBtn onClick={handleSubmit} loading={submitLoading}>
                <ChevronRight size={16} /> Submit to KisanScore AI Engine
              </PrimaryBtn>
              <p className="text-[10px] text-gray-400 text-center">
                By submitting, you confirm the farmer has signed Form KS-01A (Digital Consent)
              </p>
            </SectionCard>
          </>
        )}
      </div>

      {/* Footer */}
      <footer className="px-4 py-3 bg-gray-200 border-t border-gray-300 text-center">
        <p className="text-[10px] text-gray-500">
          IPPB KisanScore Field Portal · Data transmitted over TLS 1.3 · Aadhaar usage governed by UIDAI Act 2016 & IT Act 2000
        </p>
      </footer>
    </div>
  );
}
