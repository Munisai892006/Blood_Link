import React, { useState, useEffect } from 'react';
import { Heart, Activity, AlertTriangle, ShieldCheck, Clock, MapPin, Users, ArrowRight, Award, CheckCircle, Shield, ShieldAlert, Search } from 'lucide-react';
import { ClinicalDisclaimerBanner } from '../components/Disclaimers';
import InteractiveMap from '../components/InteractiveMap';
import PublicEmergencyRequestModal from '../components/PublicEmergencyRequestModal';
import TrackRequestModal from '../components/TrackRequestModal';

export default function PublicPortal({ onNavigate, language }) {
  const [metrics, setMetrics] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals for Public Emergency Request & Request Tracker
  const [isPublicRequestOpen, setIsPublicRequestOpen] = useState(false);
  const [isTrackModalOpen, setIsTrackModalOpen] = useState(false);
  const [selectedTrackRef, setSelectedTrackRef] = useState('');
  const [selectedTrackPin, setSelectedTrackPin] = useState('');

  // Certificate Verification state
  const [certHash, setCertHash] = useState('');
  const [certResult, setCertResult] = useState(null);
  const [verifying, setVerifying] = useState(false);

  const handleVerify = async (e) => {
    e?.preventDefault();
    if (!certHash.trim()) return;
    setVerifying(true);
    setCertResult(null);

    try {
      const res = await fetch(`/api/donors/certificates/verify/${encodeURIComponent(certHash.trim())}`);
      const data = await res.json();
      setCertResult(data);
    } catch (err) {
      setCertResult({ valid: false, message: 'Verification lookup failed. Check network connection.' });
    } finally {
      setVerifying(false);
    }
  };

  useEffect(() => {
    fetch('/api/analytics/mission-control')
      .then(res => res.json())
      .then(data => setMetrics(data))
      .catch(err => console.error(err));

    fetch('/api/requests')
      .then(res => res.json())
      .then(data => {
        // Filter out cancelled, expired, or fully fulfilled requests from the active stream (Phase 10)
        const active = (Array.isArray(data) ? data : []).filter(r =>
          ['PENDING_REVIEW', 'VERIFIED', 'MATCHING', 'PARTIALLY_FULFILLED'].includes(r.status)
        );
        setRequests(active.slice(0, 5));
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Clinical Safety Disclaimer */}
      <ClinicalDisclaimerBanner />

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blood-900 via-blood-800 to-rose-900 rounded-3xl p-8 sm:p-12 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-rose-500/20 to-transparent pointer-events-none"></div>
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center space-x-2 bg-blood-700/60 border border-blood-500/40 px-3 py-1 rounded-full text-xs font-semibold text-rose-200">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Telangana Regional Emergency Network Active</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
            Every Second Counts When Blood Saves Lives.
          </h1>
          <p className="text-rose-100 text-sm sm:text-base leading-relaxed max-w-2xl">
            BloodLink 3.0 bridges hospitals, verified community donors, and regional blood banks with real-time geographic coordination, zero-compromise privacy, and auditable safety.
          </p>

          <div className="pt-4 flex flex-wrap gap-4">
            <button
              onClick={() => setIsPublicRequestOpen(true)}
              className="bg-white text-blood-900 hover:bg-rose-50 font-bold px-6 py-3 rounded-xl shadow-lg transition flex items-center space-x-2 text-sm shadow-rose-950/20"
            >
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              <span>Create Emergency Request (No Login)</span>
            </button>
            <button
              onClick={() => {
                setSelectedTrackRef('');
                setSelectedTrackPin('');
                setIsTrackModalOpen(true);
              }}
              className="bg-slate-900/80 hover:bg-slate-900 border border-slate-700/60 text-white font-semibold px-5 py-3 rounded-xl transition flex items-center space-x-2 text-sm shadow-md"
            >
              <Search className="w-4 h-4 text-rose-400" />
              <span>Track Request Live</span>
            </button>
            <button
              onClick={() => onNavigate('donor')}
              className="bg-blood-700/80 hover:bg-blood-700 border border-blood-500/50 text-white font-semibold px-5 py-3 rounded-xl transition flex items-center space-x-2 text-sm"
            >
              <Heart className="w-4 h-4 fill-rose-300" />
              <span>Donor Availability Hub</span>
            </button>
          </div>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Active Emergencies</span>
            <Activity className="w-4 h-4 text-rose-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">
            {metrics ? metrics.overview.active_emergency_requests : '...'}
          </div>
          <span className="text-[11px] text-rose-600 font-medium">Live Hospital Feeds</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Fulfillment Rate</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">
            {metrics ? metrics.overview.fulfillment_percentage : '94%'}
          </div>
          <span className="text-[11px] text-emerald-600 font-medium">Regional Traumas Met</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Verified Donors On-Call</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">
            {metrics ? metrics.overview.available_donors_online : '...'}
          </div>
          <span className="text-[11px] text-blue-600 font-medium">Privacy Masked</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Disaster Incidents</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">
            {metrics ? metrics.overview.active_incidents : '1'}
          </div>
          <span className="text-[11px] text-amber-600 font-medium">Multi-Casualty Active</span>
        </div>
      </div>

      {/* Interactive Regional GIS Radar Map */}
      <InteractiveMap />

      {/* Real-time Shortage Radar & Active Requests */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Shortage Radar */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs lg:col-span-1 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-900 text-base flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blood-600"></span>
              <span>Regional Blood Inventory Radar</span>
            </h2>
            <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">LIVE FEED</span>
          </div>
          <p className="text-xs text-slate-500">
            Aggregated usable stock across participating regional blood banks in Hyderabad.
          </p>

          <div className="space-y-3 pt-2">
            {(metrics?.stock_by_blood_group || [
              { blood_group: 'O-', units: 8 },
              { blood_group: 'A+', units: 6 },
              { blood_group: 'B+', units: 12 },
              { blood_group: 'AB-', units: 2 },
            ]).map(item => {
              const isDeficit = item.units < 5;
              const isO = item.blood_group === 'O-';
              return (
                <div key={item.blood_group} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center space-x-3">
                    <span className="w-9 h-9 rounded-lg bg-blood-100 text-blood-800 font-extrabold flex items-center justify-center text-sm shadow-xs">
                      {item.blood_group}
                    </span>
                    <div>
                      <div className="text-xs font-semibold text-slate-900">
                        {isO ? 'Universal RBC Donor' : 'Standard Component'}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {isDeficit ? '⚠️ Deficit Alert' : 'Adequate Operating Reserve'}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-slate-900">{item.units} Units</div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${isDeficit ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                      {isDeficit ? 'CRITICAL' : 'SAFE'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2">
            <button
              onClick={() => onNavigate('inventory')}
              className="w-full py-2.5 text-xs font-semibold text-blood-700 bg-blood-50 hover:bg-blood-100 rounded-xl transition flex items-center justify-center space-x-1"
            >
              <span>Explore Full Blood Bank Inventory</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Active Emergency Requests Stream */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-slate-900 text-base">Active Emergency Requests</h2>
              <p className="text-xs text-slate-500">Live triage tracker across regional emergency departments</p>
            </div>
            <button
              onClick={() => onNavigate('hospital')}
              className="text-xs font-semibold text-blood-700 hover:text-blood-800 flex items-center space-x-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {requests.map(req => {
              const isUrgent = req.urgency_level === 'CRITICAL_EMERGENCY';
              return (
                <div key={req.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                        {req.id}
                      </span>
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase ${
                        isUrgent ? 'bg-rose-100 text-rose-800 animate-pulse' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {req.urgency_level.replace('_', ' ')}
                      </span>
                      <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-semibold">
                        {req.status}
                      </span>
                    </div>

                    <div className="text-sm font-semibold text-slate-900 flex items-center space-x-2">
                      <span>{req.blood_group} ({req.blood_component.replace(/_/g, ' ')})</span>
                      <span className="text-slate-400">•</span>
                      <span className="text-blood-700 font-bold">{req.units_requested} Units Needed</span>
                    </div>

                    <div className="text-xs text-slate-500 flex items-center space-x-3">
                      <span className="flex items-center space-x-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>{req.organization_name}</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>Required by: {req.required_by}</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2">
                    <div className="text-xs text-slate-500">
                      Fulfilled: <span className="font-bold text-slate-900">{req.units_fulfilled} / {req.units_requested}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setSelectedTrackRef(req.id);
                          setSelectedTrackPin('');
                          setIsTrackModalOpen(true);
                        }}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition"
                      >
                        Track Status
                      </button>
                      <button
                        onClick={() => onNavigate('matching', { requestId: req.id })}
                        className="px-3 py-1.5 bg-blood-600 hover:bg-blood-700 text-white rounded-lg text-xs font-semibold transition flex items-center space-x-1"
                      >
                        <span>Geo-Match Donors</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Public Certificate Verification Tool (Zero-PII) */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-blood-100 text-blood-700 flex items-center justify-center">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Verify Voluntary Blood Donation Certificate
                </h3>
                <p className="text-xs text-slate-500">
                  Instant tamper-evident verification for employers, educational institutes, and community coordinators
                </p>
              </div>
            </div>

            <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 self-start sm:self-auto">
              ✓ Zero-PII Leakage Protocol
            </span>
          </div>

          <form onSubmit={handleVerify} className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              placeholder="Enter official certificate hash (e.g. CERT-BL-2026-VIKRAM-001)"
              value={certHash}
              onChange={(e) => setCertHash(e.target.value)}
              className="flex-1 text-xs bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 font-mono text-slate-900 focus:ring-2 focus:ring-blood-500"
            />
            <button
              type="submit"
              disabled={verifying || !certHash.trim()}
              className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition disabled:opacity-50 shadow-xs"
            >
              {verifying ? 'Checking Ledger...' : 'Verify Authenticity'}
            </button>
          </form>

          {certResult && (
            <div className={`p-4 rounded-2xl border text-xs space-y-2 animate-in fade-in duration-200 ${
              certResult.valid ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950' : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}>
              {certResult.valid ? (
                <>
                  <div className="flex items-center space-x-2 text-emerald-800 font-bold text-sm">
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                    <span>Official BloodLink 3.0 Certificate Verified</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2 text-[11px] border-t border-emerald-200">
                    <div>Facility: <strong className="text-slate-900">{certResult.facility_name} ({certResult.facility_city})</strong></div>
                    <div>Donation Date: <strong className="text-slate-900">{certResult.donation_date}</strong></div>
                    <div>Blood Component: <strong className="text-slate-900">{certResult.blood_component} ({certResult.units_donated} Unit)</strong></div>
                    <div>Hemoglobin: <strong className="text-slate-900">{certResult.hemoglobin_g_dl} g/dL</strong></div>
                    <div>Donor Name: <strong className="text-slate-900">{certResult.donor_initials} (Protected)</strong></div>
                    <div>Certificate Hash: <strong className="font-mono text-blood-700">{certResult.certificate_hash}</strong></div>
                  </div>
                  <p className="text-[10px] text-emerald-800 pt-1">
                    Certified under National Blood Safety regulations and logged into BloodLink audit ledger.
                  </p>
                </>
              ) : (
                <div className="font-medium text-rose-800">
                  ❌ {certResult.message || 'Certificate not found. Ensure the hash was copied accurately.'}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Public Emergency Request Modal (No Login Required) */}
      <PublicEmergencyRequestModal
        isOpen={isPublicRequestOpen}
        onClose={() => setIsPublicRequestOpen(false)}
        onTrackRequest={(ref, pin) => {
          setSelectedTrackRef(ref);
          setSelectedTrackPin(pin);
          setIsTrackModalOpen(true);
        }}
      />

      {/* Live Request Tracker Modal */}
      <TrackRequestModal
        isOpen={isTrackModalOpen}
        onClose={() => setIsTrackModalOpen(false)}
        initialRef={selectedTrackRef}
        initialPin={selectedTrackPin}
      />
    </div>
  );
}
