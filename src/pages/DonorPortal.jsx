import React, { useState, useEffect } from 'react';
import { 
  Heart, Bell, Moon, Shield, CheckCircle, Clock, MapPin, AlertCircle, 
  Save, Award, QrCode, Download, Trash2, X, FileText, Check, ArrowRight, 
  ExternalLink, ShieldCheck 
} from 'lucide-react';
import { ClinicalDisclaimerBanner } from '../components/Disclaimers';
import QRScannerModal from '../components/QRScannerModal';

export default function DonorPortal({ currentRole, language, navContext }) {
  const [profile, setProfile] = useState(null);
  const [historyData, setHistoryData] = useState({ total_donations: 0, milestone_badge: 'Bronze Contributor', history: [] });
  const [cardData, setCardData] = useState(null);
  const [showCardModal, setShowCardModal] = useState(false);
  const [cardVerificationResult, setCardVerificationResult] = useState(null);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showDeletionModal, setShowDeletionModal] = useState(false);
  const [deletionReason, setDeletionReason] = useState('');
  const [deletionStatus, setDeletionStatus] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  // Form state (Phase 3)
  const [bloodGroup, setBloodGroup] = useState('O-');
  const [availability, setAvailability] = useState('AVAILABLE');
  const [quietHoursStart, setQuietHoursStart] = useState('22:00');
  const [quietHoursEnd, setQuietHoursEnd] = useState('07:00');
  const [preferredLang, setPreferredLang] = useState('en');
  const [consentAlerts, setConsentAlerts] = useState(true);
  const [locality, setLocality] = useState('Himayatnagar, Hyderabad');

  // Certificate Viewer & Verification State
  const [selectedCertificate, setSelectedCertificate] = useState(null);
  const [verifyHashInput, setVerifyHashInput] = useState('');
  const [verificationResult, setVerificationResult] = useState(null);
  const [verifyingHash, setVerifyingHash] = useState(false);

  // Real Matched Requests & Focused Request Details (Phase 5)
  const [matchedRequests, setMatchedRequests] = useState([]);
  const [focusedRequest, setFocusedRequest] = useState(null);
  const [focusedTimeline, setFocusedTimeline] = useState([]);
  const [loadingFocused, setLoadingFocused] = useState(false);
  const [focusedError, setFocusedError] = useState(null);

  // Match response state
  const [responding, setResponding] = useState(false);
  const [etaMinutes, setEtaMinutes] = useState(30);

  const getAuthToken = () => localStorage.getItem('bloodlink_auth_token') || ('mock_token_for_' + (currentRole?.id || 'DONOR'));

  useEffect(() => {
    fetchDonorProfile();
    fetchHistory();
    fetchDigitalCard();
    fetchMyMatches();
  }, [currentRole]);

  // Deep link handler from Notification Navigation (Phase 5)
  useEffect(() => {
    if (navContext?.requestId) {
      loadFocusedRequest(navContext.requestId);
    }
    if (navContext?.certHash) {
      setVerifyHashInput(navContext.certHash);
      handleVerifyCertificate(navContext.certHash);
    }
  }, [navContext]);

  const fetchDonorProfile = () => {
    fetch('/api/auth/me', {
      headers: { 'Authorization': `Bearer ${getAuthToken()}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data && data.user) {
          const p = data.donor_profile || {};
          setProfile({
            id: p.id || 'PRF-DON-01',
            user_id: data.user.id,
            full_name: data.user.full_name,
            blood_group: p.blood_group || 'O-',
            verification_status: p.verification_status || 'SELF_DECLARED',
            availability_status: p.availability_status || 'AVAILABLE',
            quiet_hours_start: p.quiet_hours_start || '22:00',
            quiet_hours_end: p.quiet_hours_end || '07:00',
            preferred_language: p.preferred_language || 'en',
            consent_emergency_alerts: p.consent_emergency_alerts ?? 1,
            address_locality: p.address_locality || 'Hyderabad Central',
            last_donation_date: p.last_donation_date || null
          });
          setBloodGroup(p.blood_group || 'O-');
          setAvailability(p.availability_status || 'AVAILABLE');
          setQuietHoursStart(p.quiet_hours_start || '22:00');
          setQuietHoursEnd(p.quiet_hours_end || '07:00');
          setPreferredLang(p.preferred_language || 'en');
          setConsentAlerts(p.consent_emergency_alerts !== 0);
          setLocality(p.address_locality || 'Hyderabad Central');
        }
      })
      .catch(err => console.error('Failed to load profile:', err));
  };

  const fetchHistory = () => {
    fetch('/api/donors/my-history', {
      headers: { 'Authorization': `Bearer ${getAuthToken()}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data && data.history) {
          setHistoryData(data);
        }
      })
      .catch(err => console.error('Failed to load history:', err));
  };

  const fetchDigitalCard = () => {
    fetch('/api/donors/digital-card', {
      headers: { 'Authorization': `Bearer ${getAuthToken()}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data && !data.error) {
          setCardData(data);
        }
      })
      .catch(err => console.error('Failed to load digital card:', err));
  };

  const fetchMyMatches = () => {
    fetch('/api/requests/donor/my-matches', {
      headers: { 'Authorization': `Bearer ${getAuthToken()}` }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setMatchedRequests(data);
          // If no specific request is focused and matches exist, pre-select the first active one
          if (!focusedRequest && data.length > 0) {
            loadFocusedRequest(data[0].request_id);
          }
        }
      })
      .catch(err => console.error('Failed to load matches:', err));
  };

  const loadFocusedRequest = async (requestId) => {
    setLoadingFocused(true);
    setFocusedError(null);
    try {
      const res = await fetch(`/api/requests/${requestId}`, {
        headers: { 'Authorization': `Bearer ${getAuthToken()}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Unable to retrieve request record.');

      setFocusedRequest(data);

      // Fetch request timeline
      const tRes = await fetch(`/api/requests/${requestId}/timeline`, {
        headers: { 'Authorization': `Bearer ${getAuthToken()}` }
      });
      const tData = await tRes.json();
      if (tRes.ok && tData.events) {
        setFocusedTimeline(tData.events);
      }
    } catch (err) {
      setFocusedError(err.message);
    } finally {
      setLoadingFocused(false);
    }
  };

  const handleVerifyCertificate = async (hashToVerify) => {
    const hash = (hashToVerify || verifyHashInput || '').trim();
    if (!hash) return;
    setVerifyingHash(true);
    setVerificationResult(null);
    try {
      const res = await fetch(`/api/donors/certificates/verify/${encodeURIComponent(hash)}`);
      const data = await res.json();
      setVerificationResult(data);
    } catch (err) {
      setVerificationResult({ valid: false, message: 'Verification lookup failed: ' + err.message });
    } finally {
      setVerifyingHash(false);
    }
  };

  const handleRespondMatch = async (requestId, responseType) => {
    setResponding(true);
    try {
      const res = await fetch(`/api/requests/${requestId}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({
          response: responseType,
          eta_minutes: etaMinutes,
          notes: responseType === 'ACCEPTED' ? `Donor dispatched via personal transport. ETA ${etaMinutes}m.` : 'Donor indicated unavailable.'
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to submit response');

      fetchMyMatches();
      loadFocusedRequest(requestId);
    } catch (err) {
      alert(`Response error: ${err.message}`);
    } finally {
      setResponding(false);
    }
  };

  const handleWithdrawMatch = async (requestId) => {
    const reason = prompt('Reason for response withdrawal (e.g. transport delay, sudden schedule conflict):', 'Transport delay / unavailable');
    if (!reason) return;
    try {
      const res = await fetch(`/api/requests/${requestId}/withdraw-response`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({ reason })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      alert('Your response has been withdrawn. ER triage has been notified.');
      fetchMyMatches();
      loadFocusedRequest(requestId);
    } catch (err) {
      alert(`Withdrawal error: ${err.message}`);
    }
  };

  const handleSavePreferences = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    // Validation (Phase 3)
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!timeRegex.test(quietHoursStart) || !timeRegex.test(quietHoursEnd)) {
      setSaving(false);
      setMessage({ type: 'error', text: 'Quiet Hours Start and End must be in valid HH:MM format.' });
      return;
    }

    try {
      const res = await fetch('/api/auth/donor-profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({
          blood_group: bloodGroup,
          availability_status: availability,
          quiet_hours_start: quietHoursStart,
          quiet_hours_end: quietHoursEnd,
          preferred_language: preferredLang,
          consent_emergency_alerts: consentAlerts ? 1 : 0,
          address_locality: locality
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to update preferences.');
      }

      setSaving(false);
      setMessage({ type: 'success', text: 'Donor preferences, availability, and quiet hours saved successfully!' });
      fetchDonorProfile();
    } catch (err) {
      setSaving(false);
      setMessage({ type: 'error', text: err.message || 'Failed to update preferences.' });
    }
  };

  const handleExportData = async () => {
    try {
      const res = await fetch('/api/donors/export/json', {
        headers: { 'Authorization': `Bearer ${getAuthToken()}` }
      });
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bloodlink_personal_data_export_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to export personal data archive: ' + err.message);
    }
  };

  const handleExportCSV = async () => {
    try {
      const res = await fetch('/api/donors/export/csv', {
        headers: { 'Authorization': `Bearer ${getAuthToken()}` }
      });
      const text = await res.text();
      const blob = new Blob([text], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bloodlink_donations_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to export CSV: ' + err.message);
    }
  };

  const handleRequestDeletion = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/privacy/request-deletion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({ reason: deletionReason || 'Right to be forgotten requested' })
      });
      const data = await res.json();
      setDeletionStatus(data);
    } catch (err) {
      alert('Failed to submit deletion request: ' + err.message);
    }
  };

  // Find match metadata for focused request
  const focusedMatch = matchedRequests.find(m => m.request_id === focusedRequest?.id) ||
    focusedRequest?.matches?.find(m => m.donor_id === profile?.user_id);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <ClinicalDisclaimerBanner />

      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blood-700 to-rose-500 text-white flex items-center justify-center font-black text-2xl shadow-md shadow-rose-200">
            {bloodGroup}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold text-slate-900">
                {profile?.full_name || currentRole?.name || 'Community Donor'}
              </h1>
              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center space-x-1 ${
                profile?.verification_status === 'VERIFIED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}>
                <CheckCircle className="w-3 h-3" />
                <span>{profile?.verification_status === 'VERIFIED' ? 'Verified Blood Group' : 'Self-Declared'}</span>
              </span>
              <span className="bg-amber-100 text-amber-900 text-[11px] font-black px-2.5 py-0.5 rounded-full flex items-center space-x-1">
                <Award className="w-3 h-3 text-amber-600" />
                <span>{historyData.milestone_badge}</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Locality: <strong>{profile?.address_locality || locality}</strong> • Verified Lifetime Donations: <strong>{historyData.total_donations}</strong>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setCardVerificationResult(null);
              setShowCardModal(true);
            }}
            className="flex items-center space-x-1.5 bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-2 rounded-xl text-xs font-semibold shadow-xs transition"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Digital ID Card</span>
          </button>

          <button
            onClick={() => setShowQRScanner(true)}
            className="flex items-center space-x-1.5 bg-blood-600 hover:bg-blood-700 text-white px-3.5 py-2 rounded-xl text-xs font-semibold shadow-xs transition"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Scan QR</span>
          </button>

          <button
            onClick={handleExportData}
            className="flex items-center space-x-1 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl text-xs font-medium border border-slate-300 transition"
            title="Export complete GDPR/DPDP personal data archive (JSON)"
          >
            <Download className="w-3.5 h-3.5" />
            <span>JSON</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center space-x-1 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl text-xs font-medium border border-slate-300 transition"
            title="Export donation logs as spreadsheet (CSV)"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>

          <div className="flex items-center space-x-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
            <span className="text-xs font-medium text-slate-600">Status:</span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${
              availability === 'AVAILABLE' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
            }`}>
              ● {availability}
            </span>
          </div>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-xl text-xs font-medium ${
          message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800'
        }`}>
          {message.text}
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Availability & Quiet Hours Preferences Form */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Donor Availability & Quiet Hours</h2>
              <p className="text-xs text-slate-500">Configure when and how coordinators may contact you during emergencies.</p>
            </div>
            <Shield className="w-5 h-5 text-blood-600" />
          </div>

          <form onSubmit={handleSavePreferences} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Availability Mode</label>
                <select
                  value={availability}
                  onChange={(e) => setAvailability(e.target.value)}
                  className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-blood-500"
                >
                  <option value="AVAILABLE">AVAILABLE — Ready for eligible emergency outreach</option>
                  <option value="PAUSED">PAUSED — Temporarily unavailable</option>
                  <option value="BUSY">BUSY — Travelling or temporarily deferring availability</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700">Blood Group</label>
                  <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                    profile?.verification_status === 'VERIFIED' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                  }`}>
                    {profile?.verification_status === 'VERIFIED' ? '✓ VERIFIED' : 'SELF-DECLARED'}
                  </span>
                </div>
                <select
                  value={bloodGroup}
                  onChange={(e) => setBloodGroup(e.target.value)}
                  className="w-full text-xs font-bold bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-blood-500"
                >
                  <option value="O-">O− (Universal RBC Donor)</option>
                  <option value="O+">O+</option>
                  <option value="A-">A−</option>
                  <option value="A+">A+</option>
                  <option value="B-">B−</option>
                  <option value="B+">B+</option>
                  <option value="AB-">AB−</option>
                  <option value="AB+">AB+</option>
                </select>
              </div>
            </div>

            {/* Quiet Hours Section (Phase 3) */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center space-x-2 text-xs font-bold text-slate-800">
                <Moon className="w-4 h-4 text-indigo-600" />
                <span>Quiet Hours Protection (Cross-Midnight Supported)</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Non-critical emergency outreach is automatically suppressed between these hours to respect your sleep and well-being.
                Only lawful, verified <strong>CRITICAL EMERGENCY (Threat to Life)</strong> calls may bypass quiet hours with explicit clinical justification.
              </p>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <span className="block text-[11px] font-medium text-slate-600 mb-1">Quiet Hours Start</span>
                  <input
                    type="time"
                    value={quietHoursStart}
                    onChange={(e) => setQuietHoursStart(e.target.value)}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-indigo-500 font-mono"
                    required
                  />
                </div>
                <div>
                  <span className="block text-[11px] font-medium text-slate-600 mb-1">Quiet Hours End</span>
                  <input
                    type="time"
                    value={quietHoursEnd}
                    onChange={(e) => setQuietHoursEnd(e.target.value)}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-indigo-500 font-mono"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Notification Language and Locality */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Preferred Notification Language</label>
                <select
                  value={preferredLang}
                  onChange={(e) => setPreferredLang(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5"
                >
                  <option value="en">English</option>
                  <option value="te">తెలుగు (Telugu)</option>
                  <option value="hi">हिन्दी (Hindi)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Locality Display (Public Mask)</label>
                <input
                  type="text"
                  value={locality}
                  onChange={(e) => setLocality(e.target.value)}
                  placeholder="e.g. Himayatnagar, Hyderabad"
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Only approximate neighborhood is shared. Exact GPS coordinates and home address remain strictly private.
                </span>
              </div>
            </div>

            {/* Emergency Outreach Consent */}
            <div className="p-4 bg-rose-50/50 rounded-xl border border-rose-100 flex items-start space-x-3">
              <input
                type="checkbox"
                id="consentAlerts"
                checked={consentAlerts}
                onChange={(e) => setConsentAlerts(e.target.checked)}
                className="mt-0.5 rounded text-blood-600 focus:ring-blood-500 w-4 h-4 cursor-pointer"
              />
              <label htmlFor="consentAlerts" className="text-xs text-slate-700 cursor-pointer">
                <span className="font-bold text-slate-900 block mb-0.5">Emergency Outreach Consent</span>
                “I consent to receive automated emergency outreach SMS and app alerts when critical blood matches occur within my area.”
                <span className="block text-[10px] text-slate-500 mt-1">Consent Policy Version: v1.0 • You may revoke consent at any time.</span>
              </label>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 bg-blood-600 hover:bg-blood-700 text-white rounded-xl text-xs font-bold transition flex items-center space-x-2 shadow-md shadow-rose-200 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Saving to Database...' : 'Save Preferences'}</span>
              </button>
            </div>
          </form>

          {/* Confirmed Donation History Section */}
          <div className="border-t border-slate-100 pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                  <Award className="w-4 h-4 text-amber-500" />
                  <span>Confirmed Donation History & Verified Certificates</span>
                </h3>
                <p className="text-[11px] text-slate-500">Official certificates issued by licensed blood bank facilities</p>
              </div>
              <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                {historyData.total_donations} Record(s)
              </span>
            </div>

            {historyData.history.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-slate-200">
                No confirmed hospital donations recorded yet. When a licensed hospital verifies your donation, official certificates will appear here.
              </div>
            ) : (
              <div className="space-y-2.5">
                {historyData.history.map(item => (
                  <div key={item.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="font-bold text-slate-900 flex items-center space-x-2">
                        <span>{item.facility_name}</span>
                        <span className="text-[10px] font-mono bg-emerald-100 text-emerald-800 px-2 py-0.2 rounded">VERIFIED</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Date: <strong>{item.donation_date}</strong> • {item.units_donated} Unit(s) {item.blood_component.replace(/_/g, ' ')} • Hb: {item.hemoglobin_g_dl} g/dL
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 mt-1">
                        Hash: {item.certificate_hash}
                      </div>
                    </div>

                    <button
                      onClick={() => setSelectedCertificate(item)}
                      className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-slate-800 text-xs font-semibold transition flex items-center space-x-1 shrink-0 self-start sm:self-auto"
                    >
                      <FileText className="w-3.5 h-3.5 text-blood-600" />
                      <span>View Official Certificate</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Active Emergency Outreach / Focused Request (Phase 5) */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm flex items-center space-x-2">
                <Bell className="w-4 h-4 text-blood-600" />
                <span>Nearby Emergency Request</span>
              </h3>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                focusedRequest ? 'bg-rose-100 text-rose-800 animate-pulse' : 'bg-slate-100 text-slate-600'
              }`}>
                {focusedRequest ? 'ACTIVE TRIAGE' : 'NO ACTIVE ALERTS'}
              </span>
            </div>

            {loadingFocused && (
              <div className="text-center py-8 text-xs text-slate-400">Loading emergency request details...</div>
            )}

            {focusedError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-1">
                <div className="font-bold">Request Lookup Error</div>
                <p>{focusedError}</p>
              </div>
            )}

            {focusedRequest && !loadingFocused && (
              <div className="p-4 rounded-xl bg-blood-50 border border-blood-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold bg-white text-blood-900 px-2 py-0.5 rounded">
                    {focusedRequest.id}
                  </span>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${
                    focusedRequest.urgency_level === 'CRITICAL_EMERGENCY' ? 'bg-rose-200 text-rose-900' : 'bg-amber-100 text-amber-900'
                  }`}>
                    {focusedRequest.urgency_level.replace(/_/g, ' ')}
                  </span>
                </div>

                <div className="text-xs font-bold text-slate-900">
                  {focusedRequest.organization_name || 'Hospital Emergency Center'}
                </div>

                <div className="text-xs text-slate-700 font-semibold">
                  Needed: <strong className="text-blood-700">{focusedRequest.blood_group} ({focusedRequest.blood_component.replace(/_/g, ' ')})</strong> • {focusedRequest.units_requested} Units Requested ({focusedRequest.units_fulfilled || 0} Fulfilled)
                </div>

                {focusedRequest.clinical_justification && (
                  <p className="text-[11px] text-slate-600 italic bg-white/70 p-2 rounded-lg border border-blood-100">
                    "{focusedRequest.clinical_justification}"
                  </p>
                )}

                <div className="text-[10px] text-slate-500 space-y-1">
                  <div className="flex items-center space-x-1">
                    <MapPin className="w-3 h-3 text-blood-500 shrink-0" />
                    <span>{focusedRequest.delivery_address}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                    <span>Required by: <strong>{focusedRequest.required_by}</strong></span>
                  </div>
                </div>

                {/* Response State & 5-Stage Checklist */}
                {focusedMatch?.outreach_status === 'ACCEPTED' ? (
                  <div className="pt-2 p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold text-emerald-800">
                      <span className="flex items-center space-x-1.5">
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                        <span>Response Logged: Willingness Stated</span>
                      </span>
                      <span className="text-[10px] bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full font-mono font-bold">
                        ACCEPTED
                      </span>
                    </div>

                    {/* 5-Stage Progression Checklist (Phase 6 & AC-026) */}
                    <div className="bg-white p-3 rounded-xl border border-emerald-100 space-y-2 text-[11px]">
                      <div className="font-bold text-slate-800">Workflow Progression Checklist:</div>
                      <div className="space-y-1.5 text-slate-600">
                        <div className="flex items-center space-x-2 text-emerald-700 font-semibold">
                          <Check className="w-3.5 h-3.5" />
                          <span>1. Willingness expressed by donor</span>
                        </div>
                        <div className="flex items-center space-x-2 text-emerald-700 font-semibold">
                          <Check className="w-3.5 h-3.5" />
                          <span>2. Server registered & dispatched to ER triage</span>
                        </div>
                        <div className="flex items-center space-x-2 text-indigo-700 font-bold">
                          <Clock className="w-3.5 h-3.5 text-indigo-600" />
                          <span>3. Hospital review: {focusedMatch?.review_status || 'PENDING_REVIEW'}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-slate-500">
                          <span className={`w-3.5 h-3.5 rounded-full inline-flex items-center justify-center text-[9px] ${
                            focusedMatch?.collection_confirmed_at ? 'bg-emerald-600 text-white' : 'border border-slate-300'
                          }`}>
                            {focusedMatch?.collection_confirmed_at ? '✓' : ''}
                          </span>
                          <span>4. Bedside arrival & crossmatch check {focusedMatch?.collection_confirmed_at ? '(CONFIRMED)' : ''}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-slate-500">
                          <span className={`w-3.5 h-3.5 rounded-full inline-flex items-center justify-center text-[9px] ${
                            focusedRequest.status === 'FULFILLED' ? 'bg-emerald-600 text-white' : 'border border-slate-300'
                          }`}>
                            {focusedRequest.status === 'FULFILLED' ? '✓' : ''}
                          </span>
                          <span>5. Donation completed & certificate issued</span>
                        </div>
                      </div>
                    </div>

                    <p className="text-[11px] text-emerald-900 leading-snug">
                      Proceed to <strong>{focusedRequest.organization_name} (Triage Wing)</strong>. Present your Digital QR Code at the registration desk.
                    </p>

                    <div className="text-[10px] text-emerald-700 flex items-center justify-between pt-1 border-t border-emerald-200">
                      <span>Ref: {focusedRequest.id}</span>
                      <button
                        onClick={() => handleWithdrawMatch(focusedRequest.id)}
                        className="text-rose-700 underline font-semibold hover:text-rose-900"
                      >
                        Withdraw Response
                      </button>
                    </div>
                  </div>
                ) : focusedMatch?.outreach_status === 'DECLINED' ? (
                  <div className="pt-2 p-3 bg-slate-100 rounded-xl border border-slate-200 space-y-1.5 text-xs text-slate-700">
                    <div className="flex items-center justify-between font-bold">
                      <span>Response: Declined</span>
                      <button
                        onClick={() => handleRespondMatch(focusedRequest.id, 'ACCEPTED')}
                        className="text-blood-700 underline text-[10px]"
                      >
                        Change to Accept
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Thank you for updating your status promptly so ER triage could alert other candidate donors.
                    </p>
                  </div>
                ) : (
                  <div className="pt-2 space-y-2.5">
                    <div className="flex items-center justify-between text-[11px] text-slate-600">
                      <span>Your Estimated Arrival Time:</span>
                      <select
                        value={etaMinutes}
                        onChange={(e) => setEtaMinutes(Number(e.target.value))}
                        className="bg-white border border-slate-300 rounded px-2 py-0.5 text-xs font-bold text-slate-800 font-mono"
                      >
                        <option value={15}>15 minutes</option>
                        <option value={30}>30 minutes</option>
                        <option value={45}>45 minutes</option>
                        <option value={60}>60 minutes</option>
                      </select>
                    </div>

                    <div className="flex gap-2">
                      <button
                        disabled={responding}
                        onClick={() => handleRespondMatch(focusedRequest.id, 'ACCEPTED')}
                        className="flex-1 py-2 bg-blood-600 hover:bg-blood-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-50 shadow-xs"
                      >
                        {responding ? 'Confirming...' : 'I Can Help'}
                      </button>
                      <button
                        disabled={responding}
                        onClick={() => handleRespondMatch(focusedRequest.id, 'DECLINED')}
                        className="px-4 py-2 bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-medium transition disabled:opacity-50"
                      >
                        Unable to Donate
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* List other matched requests */}
            {matchedRequests.length > 0 && (
              <div className="border-t border-slate-100 pt-3 space-y-2">
                <span className="text-[11px] font-bold text-slate-700 block">Matched Emergency Requests ({matchedRequests.length}):</span>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {matchedRequests.map(m => (
                    <div
                      key={m.match_id || m.request_id}
                      className={`w-full p-2.5 rounded-xl text-xs flex items-center justify-between transition border ${
                        focusedRequest?.id === m.request_id ? 'bg-blood-50 border-blood-300' : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                      }`}
                    >
                      <div>
                        <div className="font-mono font-bold text-slate-900">{m.request_id}</div>
                        <div className="text-slate-500 text-[10px]">{m.hospital_name || 'Hospital Emergency Bay'} • {m.distance_km} km</div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          m.outreach_status === 'ACCEPTED' ? 'bg-emerald-100 text-emerald-800' :
                          m.outreach_status === 'DECLINED' ? 'bg-rose-100 text-rose-800' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {m.outreach_status}
                        </span>

                        <button
                          onClick={() => loadFocusedRequest(m.request_id)}
                          className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-[11px] font-bold text-blood-700 transition"
                        >
                          View Request
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Privacy Guarantee Card */}
          <div className="bg-slate-900 text-white p-5 rounded-2xl space-y-3 shadow-md">
            <div className="flex items-center space-x-2 text-xs font-bold text-emerald-400">
              <Shield className="w-4 h-4" />
              <span>Privacy-by-Design Guaranteed</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Your exact street address and GPS coordinates are strictly protected (FR-DON-007, AC-009). Only approved proximity radii (e.g. 5km, 15km) and neighborhood locality are visible during triage.
            </p>
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
              <span>GDPR / DPDP Ready</span>
              <button
                onClick={handleExportData}
                className="text-emerald-400 hover:underline flex items-center space-x-1"
              >
                <span>Download Archive</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Digital Donor Card Modal (Phase 4) */}
      {showCardModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-200">
            <div className="bg-gradient-to-br from-slate-900 via-blood-950 to-slate-900 text-white p-6 relative">
              <button
                onClick={() => setShowCardModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white bg-white/10 p-1.5 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center space-x-2 text-rose-400 text-xs font-mono font-bold uppercase tracking-wider mb-2">
                <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
                <span>National Blood Emergency Network</span>
              </div>

              <div className="flex items-center justify-between mt-4">
                <div>
                  <h3 className="text-xl font-black tracking-tight">{cardData?.full_name || profile?.full_name || 'Community Donor'}</h3>
                  <p className="text-xs text-slate-300">
                    Member ID: <strong className="text-white font-mono">{cardData?.member_id || `BL-MEM-${profile?.user_id?.replace(/^USR-/, '')}`}</strong>
                  </p>
                </div>
                <div className="w-14 h-14 bg-blood-600 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-blood-900/50">
                  {cardData?.blood_group || bloodGroup}
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between text-xs border-t border-white/10 pt-4">
                <div>
                  <span className="text-[10px] text-slate-400 block">Milestone Badge</span>
                  <span className="font-bold text-amber-400">{cardData?.milestone_badge || historyData.milestone_badge}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Status</span>
                  <span className="font-bold text-emerald-400">● {cardData?.cooldown_status || 'ELIGIBLE'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Donations</span>
                  <span className="font-bold text-white">{cardData?.total_lifetime_donations || historyData.total_donations} Units</span>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4 bg-slate-50">
              <div className="flex items-center justify-center p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
                <div className="text-center space-y-2 w-full">
                  <div className="w-36 h-36 mx-auto bg-slate-100 rounded-xl flex items-center justify-center border-2 border-dashed border-slate-300">
                    <QrCode className="w-24 h-24 text-slate-800" />
                  </div>
                  <div className="text-[10px] font-mono text-slate-500 break-all px-2">
                    {cardData?.qr_verification_code || cardData?.qr_verification_hash || `BL-VHASH-${profile?.user_id}`}
                  </div>
                  <p className="text-[11px] text-slate-600 font-medium">
                    Scan at any participating hospital triage bay for contactless check-in.
                  </p>
                </div>
              </div>

              {/* Live Verification Check */}
              {cardVerificationResult ? (
                <div className="p-3 bg-emerald-50 text-emerald-900 rounded-xl border border-emerald-200 text-xs font-semibold flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <span>Registry Validated: <strong>{cardVerificationResult.credential_validity}</strong></span>
                    <div className="text-[10px] text-slate-500 font-normal">
                      Verified by {cardVerificationResult.issuing_authority}
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={async () => {
                    const code = cardData?.qr_verification_code || cardData?.qr_verification_hash || `BL-VHASH-${profile?.user_id}`;
                    try {
                      const res = await fetch(`/api/auth/verify-credential/${encodeURIComponent(code)}`);
                      const data = await res.json();
                      setCardVerificationResult(data);
                    } catch (_) {}
                  }}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 shadow-sm"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Verify Credential Authenticity</span>
                </button>
              )}

              <div className="text-[11px] text-slate-500 text-center">
                Issued by BloodLink 3.0 Clinical Authority under ISO/IEC 29148 standards.
              </div>

              <button
                onClick={() => {
                  window.print();
                }}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>Print / Download Digital ID Card</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Official Certificate Viewer Modal */}
      {selectedCertificate && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-8 shadow-2xl border-4 border-amber-300/60 space-y-6 relative animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setSelectedCertificate(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 bg-slate-100 p-1.5 rounded-full"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="text-center space-y-2 border-b-2 border-amber-200 pb-5">
              <div className="inline-flex items-center space-x-2 text-blood-700 font-extrabold text-xs uppercase tracking-widest bg-rose-50 px-3 py-1 rounded-full border border-rose-200">
                <Heart className="w-3.5 h-3.5 fill-blood-600 text-blood-600" />
                <span>BloodLink 3.0 Clinical Authority</span>
              </div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                Certificate of Voluntary Blood Donation
              </h2>
              <p className="text-xs text-slate-500 font-serif italic">
                In recognition of a selfless, life-saving gift to the regional emergency blood reserve
              </p>
            </div>

            <div className="text-center space-y-4 py-2">
              <p className="text-xs text-slate-500">This official certificate is proudly presented to:</p>
              <h3 className="text-xl font-black text-slate-900 tracking-wide border-b border-dashed border-slate-300 pb-2 max-w-md mx-auto">
                {profile?.full_name || 'Community Donor'}
              </h3>

              <p className="text-xs text-slate-700 leading-relaxed max-w-lg mx-auto">
                for donating <strong>{selectedCertificate.units_donated} Unit(s)</strong> of{' '}
                <strong>{selectedCertificate.blood_component.replace(/_/g, ' ')}</strong> at{' '}
                <strong>{selectedCertificate.facility_name}</strong> on{' '}
                <strong>{selectedCertificate.donation_date}</strong>.
              </p>

              <div className="grid grid-cols-3 gap-3 p-3 bg-amber-50/50 rounded-2xl border border-amber-200/80 text-xs font-mono">
                <div>
                  <span className="text-[10px] text-slate-400 block font-sans">Blood Group</span>
                  <span className="font-bold text-blood-700 text-sm">{bloodGroup}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-sans">Hemoglobin</span>
                  <span className="font-bold text-emerald-700 text-sm">{selectedCertificate.hemoglobin_g_dl} g/dL</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-sans">Clinical Status</span>
                  <span className="font-bold text-slate-800 text-sm">Certified Safe</span>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 text-left border-t border-slate-100">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Cryptographic Hash</span>
                  <span className="text-xs font-mono font-bold text-slate-900">{selectedCertificate.certificate_hash}</span>
                  <p className="text-[10px] text-slate-500">Tamper-evident verification hash logged to audit ledger.</p>
                </div>
                <div className="w-16 h-16 bg-slate-100 rounded-xl flex items-center justify-center border border-slate-200 shrink-0">
                  <QrCode className="w-12 h-12 text-slate-800" />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedCertificate(null)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 text-xs font-medium"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-md"
              >
                <Download className="w-4 h-4" />
                <span>Print / Download PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Donor Hub QR Scanner Modal */}
      <QRScannerModal
        isOpen={showQRScanner}
        onClose={() => setShowQRScanner(false)}
        onScanSuccess={(cred) => {
          setMessage({
            type: 'success',
            text: `✅ Verified ${cred.credential_type}: ${cred.display_name} (${cred.verified_blood_group || 'Verified'})`
          });
          setShowQRScanner(false);
        }}
      />
    </div>
  );
}