import React, { useState, useEffect } from 'react';
import { 
  Activity, PlusCircle, CheckCircle2, XCircle, AlertTriangle, Clock, MapPin, 
  Search, ShieldCheck, Zap, FileText, Droplet, UserCheck, RefreshCw, Check, 
  ArrowRight, ShieldAlert, Compass, CheckSquare, AlertOctagon, History, QrCode, Award
} from 'lucide-react';
import { ClinicalDisclaimerBanner } from '../components/Disclaimers';
import QRScannerModal from '../components/QRScannerModal';

export default function HospitalPortal({ currentRole, onNavigate, navContext }) {
  const [requests, setRequests] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [manifestData, setManifestData] = useState(null);
  const [timelineData, setTimelineData] = useState(null);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [message, setMessage] = useState(null);

  // Filter & Search State
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Candidate Donor Responses State (SRS Section 3)
  const [responsesModalReq, setResponsesModalReq] = useState(null);
  const [donorResponses, setDonorResponses] = useState([]);
  const [loadingResponses, setLoadingResponses] = useState(false);
  const [reviewNoteInput, setReviewNoteInput] = useState({});

  // Bedside Crossmatch & Transfusion State (Phase 7)
  const [bedsideModalReq, setBedsideModalReq] = useState(null);
  const [bedsideHistory, setBedsideHistory] = useState([]);
  const [loadingBedsideHistory, setLoadingBedsideHistory] = useState(false);
  const [unitIdentifier, setUnitIdentifier] = useState('');
  const [unitBloodGroup, setUnitBloodGroup] = useState('O-');
  const [unitComponent, setUnitComponent] = useState('RED_BLOOD_CELLS');
  const [manifestRef, setManifestRef] = useState('');
  const [clinicianName, setClinicianName] = useState(currentRole?.name || 'Dr. Attending Physician');
  const [clinicianId, setClinicianId] = useState(currentRole?.id || 'STAFF-CLINICAL-01');
  const [identityCheckPassed, setIdentityCheckPassed] = useState(false);
  const [labelVerificationPassed, setLabelVerificationPassed] = useState(false);
  const [crossmatchResult, setCrossmatchResult] = useState('COMPATIBLE');
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [exceptionReason, setExceptionReason] = useState('');
  const [transfuseUnitsNow, setTransfuseUnitsNow] = useState(1);
  const [commitTransfusionAfterCheck, setCommitTransfusionAfterCheck] = useState(true);
  const [bedsideSubmitting, setBedsideSubmitting] = useState(false);

  // Form State for Create Request
  const [targetOrgId, setTargetOrgId] = useState('');
  const [patientRef, setPatientRef] = useState('');
  const [bloodGroup, setBloodGroup] = useState('O-');
  const [bloodComponent, setBloodComponent] = useState('RED_BLOOD_CELLS');
  const [units, setUnits] = useState(3);
  const [urgency, setUrgency] = useState('CRITICAL_EMERGENCY');
  const [justification, setJustification] = useState('');
  const [department, setDepartment] = useState('Trauma ICU Bay 1');
  const [deliveryAddress, setDeliveryAddress] = useState('AIIMS Apex Emergency Trauma Hospital, Hyderabad');
  const [requiredBy, setRequiredBy] = useState(() => {
    const d = new Date();
    d.setHours(d.getHours() + 4);
    return d.toISOString().replace('T', ' ').substring(0, 19);
  });

  const getAuthToken = () => localStorage.getItem('bloodlink_auth_token') || ('mock_token_for_' + (currentRole?.id || 'HOSPITAL_REQUESTER'));

  const fetchRequests = () => {
    fetch('/api/requests', {
      headers: { 'Authorization': `Bearer ${getAuthToken()}` }
    })
      .then(res => res.json())
      .then(data => {
        setRequests(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  const fetchOrganizations = () => {
    fetch('/api/organizations', {
      headers: { 'Authorization': `Bearer ${getAuthToken()}` }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setOrganizations(data);
          if (data.length > 0 && !targetOrgId) {
            setTargetOrgId(data[0].id);
          }
        }
      })
      .catch(err => console.error('Failed to load facilities:', err));
  };

  useEffect(() => {
    fetchRequests();
    fetchOrganizations();

    // Auto-refresh requests list without requiring manual page reload (Part 2, Section 3)
    const pollInterval = setInterval(() => {
      fetchRequests();
    }, 4000);

    return () => clearInterval(pollInterval);
  }, [currentRole]);

  // Deep-link from notification navigation
  useEffect(() => {
    if (navContext?.requestId) {
      setSearchQuery(navContext.requestId);
      setActiveFilter('ALL');
      handleViewTimeline(navContext.requestId);
    }
  }, [navContext]);

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    setMessage(null);
    setIsSubmitting(true);

    try {
      const payload = {
        patient_reference: patientRef,
        blood_group: bloodGroup,
        blood_component: bloodComponent,
        units_requested: parseInt(units, 10),
        urgency_level: urgency,
        clinical_justification: justification,
        hospital_department: department,
        delivery_address: deliveryAddress,
        required_by: requiredBy
      };

      if (['EMERGENCY_COORDINATOR', 'SYSTEM_ADMIN'].includes(currentRole?.id) && targetOrgId) {
        payload.organization_id = targetOrgId;
      }

      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Creation failed');
      }

      setShowCreateModal(false);
      setMessage({ type: 'success', text: `Emergency request ${data.id} created successfully in PENDING_REVIEW state.` });
      fetchRequests();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFastTrack = async (requestId) => {
    const reason = prompt('Fast-Track Emergency Triage (FR-REQ-009): Enter clinical supervisor justification (e.g. Catastrophic Hemorrhagic Shock Bay 1):', 'Immediate Threat to Life - Exsanguinating trauma');
    if (!reason) return;

    try {
      const res = await fetch(`/api/requests/${requestId}/fast-track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({ clinicalJustification: reason, secondaryApprover: currentRole?.name || 'Triage Attending' })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setMessage({ type: 'success', text: `Request ${requestId} fast-tracked to VERIFIED and Stage 1 outreach triggered!` });
      fetchRequests();
    } catch (err) {
      alert(`Fast-track error: ${err.message}`);
    }
  };

  const handleOpenBedsideModal = async (req) => {
    setBedsideModalReq(req);
    setUnitBloodGroup(req.blood_group);
    setUnitComponent(req.blood_component);
    setManifestRef(`MAN-${req.id}`);
    setUnitIdentifier(`BAG-${req.id.substring(4)}-${Math.floor(100 + Math.random() * 900)}`);
    setIdentityCheckPassed(false);
    setLabelVerificationPassed(false);
    setCrossmatchResult('COMPATIBLE');
    setClinicalNotes('');
    setExceptionReason('');
    setTransfuseUnitsNow(Math.min(1, req.units_requested - req.units_fulfilled));
    
    // Fetch historical checks
    fetchBedsideHistory(req.id);
  };

  const fetchBedsideHistory = async (requestId) => {
    setLoadingBedsideHistory(true);
    try {
      const res = await fetch(`/api/requests/${requestId}/bedside-checks`, {
        headers: { 'Authorization': `Bearer ${getAuthToken()}` }
      });
      const data = await res.json();
      setBedsideHistory(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch bedside checks:', err);
    } finally {
      setLoadingBedsideHistory(false);
    }
  };

  const handleSubmitBedsideCheck = async (e) => {
    e.preventDefault();
    if (!identityCheckPassed || !labelVerificationPassed) {
      alert('Mandatory Safety Verification: Both positive patient identity check and bag label verification must be confirmed.');
      return;
    }

    if (crossmatchResult === 'INCOMPATIBLE') {
      if (!exceptionReason) {
        alert('Please enter the clinical agglutination reason/findings explaining the incompatibility determination.');
        return;
      }
    }

    setBedsideSubmitting(true);
    try {
      // 1. Record Bedside Crossmatch
      const res = await fetch(`/api/requests/${bedsideModalReq.id}/bedside-crossmatch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({
          unit_identifier: unitIdentifier,
          blood_component: unitComponent,
          blood_group: unitBloodGroup,
          manifest_reference: manifestRef,
          responsible_clinician_id: clinicianId,
          responsible_clinician_name: clinicianName,
          identity_check_passed: identityCheckPassed,
          label_verification_passed: labelVerificationPassed,
          crossmatch_result: crossmatchResult,
          clinical_notes: clinicalNotes,
          exception_reason: exceptionReason
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Bedside crossmatch failed');

      // 2. If Compatible and user selected to commit transfusion units
      if (crossmatchResult !== 'INCOMPATIBLE' && commitTransfusionAfterCheck && transfuseUnitsNow > 0) {
        const transRes = await fetch(`/api/requests/${bedsideModalReq.id}/record-transfusion`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getAuthToken()}`
          },
          body: JSON.stringify({
            unitsDelivered: parseInt(transfuseUnitsNow, 10),
            notes: `Bedside unit ${unitIdentifier} (${crossmatchResult}) verified by ${clinicianName}. Notes: ${clinicalNotes}`
          })
        });
        const transData = await transRes.json();
        if (!transRes.ok) throw new Error(transData.message || 'Transfusion logging failed');
      }

      setMessage({
        type: 'success',
        text: `Bedside check recorded for unit ${unitIdentifier} (${crossmatchResult}). Transfusion logs updated.`
      });
      setBedsideModalReq(null);
      fetchRequests();
    } catch (err) {
      alert(`Bedside Verification Blocked: ${err.message}`);
    } finally {
      setBedsideSubmitting(false);
    }
  };

  const handleViewManifest = async (requestId) => {
    try {
      const res = await fetch(`/api/requests/${requestId}/manifest`);
      const data = await res.json();
      setManifestData(data);
    } catch (err) {
      alert(`Manifest fetch error: ${err.message}`);
    }
  };

  const handleViewTimeline = async (requestId) => {
    setTimelineLoading(true);
    try {
      const res = await fetch(`/api/requests/${requestId}/timeline`, {
        headers: { 'Authorization': `Bearer ${getAuthToken()}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to fetch timeline');
      setTimelineData(data);
    } catch (err) {
      alert(`Timeline error: ${err.message}`);
    } finally {
      setTimelineLoading(false);
    }
  };

  const handleViewResponses = async (req) => {
    setResponsesModalReq(req);
    setLoadingResponses(true);
    try {
      const res = await fetch(`/api/requests/${req.id}/responses`, {
        headers: { 'Authorization': `Bearer ${getAuthToken()}` }
      });
      const data = await res.json();
      setDonorResponses(Array.isArray(data) ? data : []);
    } catch (err) {
      alert(`Failed to load donor responses: ${err.message}`);
    } finally {
      setLoadingResponses(false);
    }
  };

  const handleReviewDecision = async (donorId, decision) => {
    const note = reviewNoteInput[donorId] || (decision === 'SELECTED_FOR_COORDINATION' ? 'Accepted by triage. Report to Trauma Bay 3.' : 'Declined: Sufficient current stock.');
    try {
      const res = await fetch(`/api/requests/${responsesModalReq.id}/responses/${donorId}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({ decision, notes: note })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      handleViewResponses(responsesModalReq);
      fetchRequests();
    } catch (err) {
      alert(`Review error: ${err.message}`);
    }
  };

  const handleConfirmCollection = async (donorId) => {
    const note = prompt('Enter donor reception / phlebotomy bay notes:', 'Donor verified, vitals stable, pre-donation assessment completed');
    if (!note) return;

    try {
      const res = await fetch(`/api/requests/${responsesModalReq.id}/responses/${donorId}/confirm-collection`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({ notes: note })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      handleViewResponses(responsesModalReq);
      fetchRequests();
    } catch (err) {
      alert(`Confirmation error: ${err.message}`);
    }
  };

  const handleCompleteDonation = async (donorId, donorName) => {
    const units = prompt(`Confirm physical donation completed for ${donorName}.\nEnter units collected:`, '1');
    if (units === null) return;

    try {
      const res = await fetch('/api/donors/log-donation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({
          donor_id: donorId,
          blood_component: responsesModalReq?.blood_component || 'WHOLE_BLOOD',
          units_donated: parseInt(units, 10) || 1,
          hemoglobin_g_dl: 14.5,
          notes: `Emergency bedside collection verified for request ${responsesModalReq?.id}`
        })
      });

      const data = await res.json();
      if (res.ok) {
        alert(`Physical donation verified and official certificate issued!\n\nCertificate Hash: ${data.certificate_hash}\nDonor notification dispatched.`);
        handleViewResponses(responsesModalReq);
        fetchRequests();
      } else {
        alert(`Failed to log donation: ${data.message || data.error}`);
      }
    } catch (err) {
      alert(`Error logging donation: ${err.message}`);
    }
  };

  const handleStateTransition = async (requestId, targetState, reason = '') => {
    try {
      const res = await fetch(`/api/requests/${requestId}/transition`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({ targetState, reason })
      });

      const data = await res.json();
      if (!res.ok) {
        alert(`State transition error: ${data.message}`);
      } else {
        fetchRequests();
      }
    } catch (err) {
      alert(`Network error: ${err.message}`);
    }
  };

  // Filter and Search logic
  const filteredRequests = requests.filter(req => {
    // 1. Tab status filter
    if (activeFilter === 'PENDING_REVIEW' && req.status !== 'PENDING_REVIEW') return false;
    if (activeFilter === 'IN_MATCHING' && !['VERIFIED', 'MATCHING'].includes(req.status)) return false;
    if (activeFilter === 'RESPONSES' && (req.donor_response_count === 0 && !req.has_responses)) return false;
    if (activeFilter === 'FULFILLED' && !['PARTIALLY_FULFILLED', 'FULFILLED'].includes(req.status)) return false;
    if (activeFilter === 'CANCELLED' && !['CANCELLED', 'EXPIRED', 'REJECTED'].includes(req.status)) return false;

    // 2. Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchId = req.id.toLowerCase().includes(q);
      const matchPatient = (req.patient_reference || '').toLowerCase().includes(q);
      const matchBg = req.blood_group.toLowerCase().includes(q);
      const matchDept = (req.hospital_department || '').toLowerCase().includes(q);
      const matchOrg = (req.organization_name || '').toLowerCase().includes(q);
      return matchId || matchPatient || matchBg || matchDept || matchOrg;
    }

    return true;
  });

  const countPending = requests.filter(r => r.status === 'PENDING_REVIEW').length;
  const countMatching = requests.filter(r => ['VERIFIED', 'MATCHING'].includes(r.status)).length;
  const countFulfilled = requests.filter(r => ['PARTIALLY_FULFILLED', 'FULFILLED'].includes(r.status)).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <ClinicalDisclaimerBanner />

      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center space-x-2">
            <Activity className="w-6 h-6 text-blood-600" />
            <span>Emergency Request & Triage Management</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Authoritative lifecycle triage for participating hospital emergency rooms & trauma centers.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowQRScanner(true)}
            className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center space-x-2 border border-slate-300 transition"
          >
            <QrCode className="w-4 h-4 text-blood-600" />
            <span>Scan Donor ID / QR</span>
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blood-600 hover:bg-blood-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs flex items-center space-x-2 shadow-md shadow-rose-200 transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Blood Request</span>
          </button>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-xl text-xs font-medium flex items-center justify-between ${
          message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
        }`}>
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-slate-600 font-bold ml-4">✕</button>
        </div>
      )}

      {/* Filters and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Tab Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <button
              onClick={() => setActiveFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl font-bold transition ${
                activeFilter === 'ALL'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              All Requests ({requests.length})
            </button>
            <button
              onClick={() => setActiveFilter('PENDING_REVIEW')}
              className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center space-x-1.5 ${
                activeFilter === 'PENDING_REVIEW'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
              }`}
            >
              <span>Review Queue</span>
              {countPending > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeFilter === 'PENDING_REVIEW' ? 'bg-white text-amber-700' : 'bg-amber-200 text-amber-900'}`}>
                  {countPending}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveFilter('IN_MATCHING')}
              className={`px-3 py-1.5 rounded-xl font-bold transition ${
                activeFilter === 'IN_MATCHING'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-blue-50 text-blue-800 hover:bg-blue-100'
              }`}
            >
              In Matching ({countMatching})
            </button>
            <button
              onClick={() => setActiveFilter('RESPONSES')}
              className={`px-3 py-1.5 rounded-xl font-bold transition ${
                activeFilter === 'RESPONSES'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-purple-50 text-purple-800 hover:bg-purple-100'
              }`}
            >
              Donor Responses
            </button>
            <button
              onClick={() => setActiveFilter('FULFILLED')}
              className={`px-3 py-1.5 rounded-xl font-bold transition ${
                activeFilter === 'FULFILLED'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
              }`}
            >
              Fulfilled ({countFulfilled})
            </button>
            <button
              onClick={() => setActiveFilter('CANCELLED')}
              className={`px-3 py-1.5 rounded-xl font-bold transition ${
                activeFilter === 'CANCELLED'
                  ? 'bg-slate-700 text-white shadow-xs'
                  : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
              }`}
            >
              Cancelled / Closed
            </button>
          </div>

          {/* Search Box */}
          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search ID, MRN, blood, ward..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blood-500/20"
            />
          </div>
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">Hospital Request Queue</h2>
          <span className="text-xs text-slate-500">{filteredRequests.length} of {requests.length} Requests Listed</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <th className="py-3.5 px-4">Request ID</th>
                <th className="py-3.5 px-4">Patient Ref</th>
                <th className="py-3.5 px-4">Component & Group</th>
                <th className="py-3.5 px-4">Units Needed</th>
                <th className="py-3.5 px-4">Urgency</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Department / Hospital</th>
                <th className="py-3.5 px-4 text-right">Lifecycle Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400">
                    No emergency requests match current filter criteria.
                  </td>
                </tr>
              ) : (
                filteredRequests.map(req => {
                  const isUrgent = req.urgency_level === 'CRITICAL_EMERGENCY';
                  return (
                    <tr key={req.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {req.id}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-500">
                        {req.patient_reference || 'PT-ANON'}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        <span className="inline-block px-2 py-0.5 rounded bg-blood-100 text-blood-800 font-bold mr-1.5">
                          {req.blood_group}
                        </span>
                        <span>{req.blood_component.replace(/_/g, ' ')}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-900">{req.units_fulfilled}</span> / {req.units_requested} Units
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${
                          isUrgent ? 'bg-rose-100 text-rose-800 animate-pulse' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {req.urgency_level.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          req.status === 'PENDING_REVIEW' ? 'bg-amber-100 text-amber-800' :
                          req.status === 'VERIFIED' ? 'bg-blue-100 text-blue-800' :
                          req.status === 'MATCHING' ? 'bg-indigo-100 text-indigo-800 animate-pulse' :
                          req.status === 'FULFILLED' ? 'bg-emerald-100 text-emerald-800' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {req.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">
                        <div className="font-medium text-slate-800">{req.organization_name}</div>
                        <div className="text-[11px]">{req.hospital_department}</div>
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                        {req.status === 'PENDING_REVIEW' && (
                          <>
                            <button
                              onClick={() => handleStateTransition(req.id, 'VERIFIED')}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-semibold transition"
                            >
                              Verify
                            </button>
                            <button
                              onClick={() => handleFastTrack(req.id)}
                              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded text-[11px] font-semibold transition inline-flex items-center space-x-1"
                              title="Fast-Track Immediate Emergency Triage (FR-REQ-009)"
                            >
                              <span>⚡ Fast-Track</span>
                            </button>
                          </>
                        )}

                        {req.status === 'VERIFIED' && (
                          <button
                            onClick={() => handleStateTransition(req.id, 'MATCHING')}
                            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[11px] font-semibold transition"
                          >
                            Start Outreach
                          </button>
                        )}

                        {/* Geo-Match Donors (Connects to MatchingPortal with target requestId) */}
                        {['VERIFIED', 'MATCHING', 'PARTIALLY_FULFILLED'].includes(req.status) && (
                          <button
                            onClick={() => onNavigate && onNavigate('matching', { requestId: req.id })}
                            className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 rounded text-[11px] font-bold transition inline-flex items-center space-x-1"
                            title="Open Geo-Spatial Radar for this request"
                          >
                            <Compass className="w-3 h-3 text-purple-700" />
                            <span>Geo-Match</span>
                          </button>
                        )}

                        {/* Donor Response Coordination Button (SRS Section 3) */}
                        <button
                          onClick={() => handleViewResponses(req)}
                          className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded text-[11px] font-bold transition"
                          title="View and coordinate incoming donor responses"
                        >
                          Responses
                        </button>

                        {/* Phase 7: Bedside Crossmatch & Transfusion Check */}
                        {['MATCHING', 'PARTIALLY_FULFILLED', 'VERIFIED'].includes(req.status) && (
                          <button
                            onClick={() => handleOpenBedsideModal(req)}
                            className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-[11px] font-bold transition shadow-2xs inline-flex items-center space-x-1"
                            title="Bedside Arrival & Clinical Crossmatch Check"
                          >
                            <Droplet className="w-3 h-3" />
                            <span>+ Bedside Check</span>
                          </button>
                        )}

                        <button
                          onClick={() => handleViewManifest(req.id)}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-medium transition"
                          title="View Cold-Chain Dispatch Manifest"
                        >
                          Manifest
                        </button>

                        <button
                          onClick={() => handleViewTimeline(req.id)}
                          className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded text-[11px] font-bold transition"
                          title="View Lifecycle Timeline & Acceptance Timers"
                        >
                          Timeline & SLA
                        </button>

                        {['PENDING_REVIEW', 'VERIFIED', 'MATCHING', 'PARTIALLY_FULFILLED'].includes(req.status) && (
                          <button
                            onClick={() => handleStateTransition(req.id, 'CANCELLED', 'Cancelled by hospital ER')}
                            className="px-2 py-1 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded text-[11px] font-semibold transition"
                          >
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PHASE 7: Bedside Arrival & Clinical Crossmatch Check Modal */}
      {bedsideModalReq && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 space-y-5 shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Bedside Arrival & Clinical Crossmatch Check</h3>
                  <p className="text-[11px] text-slate-500 font-mono">
                    {bedsideModalReq.id} • Demanded: {bedsideModalReq.blood_group} ({bedsideModalReq.blood_component.replace(/_/g, ' ')})
                  </p>
                </div>
              </div>
              <button onClick={() => setBedsideModalReq(null)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitBedsideCheck} className="flex-1 overflow-y-auto pr-1 space-y-4 text-xs">
              {/* Unit & Label Details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Unit / Bag Identifier *</label>
                  <input
                    type="text"
                    required
                    value={unitIdentifier}
                    onChange={(e) => setUnitIdentifier(e.target.value)}
                    placeholder="e.g. BAG-HYD-904-A"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-mono font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Unit Blood Group *</label>
                  <select
                    value={unitBloodGroup}
                    onChange={(e) => setUnitBloodGroup(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold"
                  >
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Manifest Reference</label>
                  <input
                    type="text"
                    value={manifestRef}
                    onChange={(e) => setManifestRef(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-mono"
                  />
                </div>
              </div>

              {/* Responsible Clinician Identification */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Responsible Clinician Name *</label>
                  <input
                    type="text"
                    required
                    value={clinicianName}
                    onChange={(e) => setClinicianName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Clinician Staff ID / License</label>
                  <input
                    type="text"
                    value={clinicianId}
                    onChange={(e) => setClinicianId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-mono"
                  />
                </div>
              </div>

              {/* Mandatory Positive Two-Identifier & Label Checks */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
                <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider block">
                  Mandatory Pre-Transfusion Safety Protocols (FR-BED-002)
                </span>

                <label className="flex items-start space-x-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={identityCheckPassed}
                    onChange={(e) => setIdentityCheckPassed(e.target.checked)}
                    className="mt-0.5 rounded text-blood-600 focus:ring-blood-500 w-4 h-4"
                  />
                  <span className="text-slate-700 leading-snug">
                    <strong>Positive Two-Identifier Patient Check:</strong> Verified patient's full name, medical record number (MRN), and wristband against chart at bedside.
                  </span>
                </label>

                <label className="flex items-start space-x-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={labelVerificationPassed}
                    onChange={(e) => setLabelVerificationPassed(e.target.checked)}
                    className="mt-0.5 rounded text-blood-600 focus:ring-blood-500 w-4 h-4"
                  />
                  <span className="text-slate-700 leading-snug">
                    <strong>Bag Label Verification:</strong> Verified unit blood group, donor barcode, component integrity, and expiration date on blood bag.
                  </span>
                </label>
              </div>

              {/* Crossmatch Result Determination */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Clinical Crossmatch Determination *</label>
                <select
                  value={crossmatchResult}
                  onChange={(e) => setCrossmatchResult(e.target.value)}
                  className={`w-full border rounded-xl px-3 py-2 font-bold ${
                    crossmatchResult === 'COMPATIBLE' ? 'bg-emerald-50 text-emerald-900 border-emerald-300' :
                    crossmatchResult === 'INCOMPATIBLE' ? 'bg-rose-50 text-rose-900 border-rose-300' :
                    'bg-amber-50 text-amber-900 border-amber-300'
                  }`}
                >
                  <option value="COMPATIBLE">COMPATIBLE (Serologically compatible - Safe to infuse)</option>
                  <option value="INCOMPATIBLE">INCOMPATIBLE (Agglutination / Reaction - QUARANTINE UNIT)</option>
                  <option value="EMERGENCY_UN_CROSSMATCHED_RELEASE">EMERGENCY UN-CROSSMATCHED RELEASE (O- Exsanguination protocol)</option>
                  <option value="PENDING_LAB_CONFIRMATION">PENDING LAB CONFIRMATION (Standby)</option>
                </select>
              </div>

              {/* Strict Incompatible Safety Warning */}
              {crossmatchResult === 'INCOMPATIBLE' && (
                <div className="p-4 bg-rose-50 border-2 border-rose-400 rounded-2xl text-rose-900 space-y-2 animate-in fade-in">
                  <div className="flex items-center space-x-2 text-rose-800 font-black">
                    <AlertOctagon className="w-5 h-5 text-rose-600" />
                    <span>CLINICAL SAFETY BLOCK: TRANSFUSION PROHIBITED</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Serological agglutination indicates ABO/Rh or atypical antibody incompatibility. Administration of this unit will cause acute intravascular hemolysis.
                    <strong> This unit must be immediately quarantined and returned to the blood bank.</strong>
                  </p>
                  <div>
                    <label className="block font-bold text-rose-900 mb-1">Agglutination Findings / Reason for Incompatibility *</label>
                    <textarea
                      rows="2"
                      required
                      value={exceptionReason}
                      onChange={(e) => setExceptionReason(e.target.value)}
                      placeholder="Specify agglutination reaction grade, crossmatch tube observations..."
                      className="w-full bg-white border border-rose-300 rounded-xl p-2 text-rose-900"
                    />
                  </div>
                </div>
              )}

              {/* Compatible / Emergency Options */}
              {crossmatchResult !== 'INCOMPATIBLE' && (
                <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center space-x-2 cursor-pointer font-bold text-emerald-900">
                      <input
                        type="checkbox"
                        checked={commitTransfusionAfterCheck}
                        onChange={(e) => setCommitTransfusionAfterCheck(e.target.checked)}
                        className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                      />
                      <span>Immediately Commit Transfusion Fulfillment Log</span>
                    </label>

                    {commitTransfusionAfterCheck && (
                      <div className="flex items-center space-x-2">
                        <span className="text-[11px] text-emerald-800 font-medium">Units Infused:</span>
                        <input
                          type="number"
                          min="1"
                          max={Math.max(1, bedsideModalReq.units_requested - bedsideModalReq.units_fulfilled)}
                          value={transfuseUnitsNow}
                          onChange={(e) => setTransfuseUnitsNow(e.target.value)}
                          className="w-16 bg-white border border-emerald-300 rounded-lg px-2 py-1 text-center font-bold text-emerald-900"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Bedside Clinical Notes</label>
                <textarea
                  rows="2"
                  value={clinicalNotes}
                  onChange={(e) => setClinicalNotes(e.target.value)}
                  placeholder="Record patient baseline vitals, infusion rate, cannulation site..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5"
                />
              </div>

              {/* Historical Bedside Checks for this request */}
              {bedsideHistory.length > 0 && (
                <div className="pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider flex items-center space-x-1">
                      <History className="w-3.5 h-3.5 text-slate-500" />
                      <span>Recorded Bedside Crossmatches ({bedsideHistory.length})</span>
                    </span>
                  </div>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto">
                    {bedsideHistory.map(chk => (
                      <div key={chk.id} className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-[10px] flex items-center justify-between">
                        <div>
                          <strong className="text-slate-900">{chk.unit_identifier}</strong> ({chk.blood_group}) • Clinician: {chk.responsible_clinician_name}
                          <div className="text-slate-500">{chk.created_at}</div>
                        </div>
                        <span className={`px-2 py-0.5 rounded font-bold ${
                          chk.crossmatch_result === 'COMPATIBLE' ? 'bg-emerald-100 text-emerald-800' :
                          chk.crossmatch_result === 'INCOMPATIBLE' ? 'bg-rose-100 text-rose-800' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {chk.crossmatch_result}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Form Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  Full clinical verification logged to audit stream.
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setBedsideModalReq(null)}
                    className="px-4 py-2 border border-slate-300 rounded-xl font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={bedsideSubmitting}
                    className={`px-5 py-2 rounded-xl font-bold text-white shadow-xs transition ${
                      crossmatchResult === 'INCOMPATIBLE'
                        ? 'bg-rose-700 hover:bg-rose-800'
                        : 'bg-blood-600 hover:bg-blood-700 shadow-rose-200'
                    }`}
                  >
                    {bedsideSubmitting ? 'Verifying...' : crossmatchResult === 'INCOMPATIBLE' ? 'Record Quarantine Alert' : 'Verify & Record Bedside Check'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Candidate Donor Responses & Coordination Modal (SRS Section 3) */}
      {responsesModalReq && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Donor Responses & Bedside Coordination</h3>
                  <p className="text-[11px] text-slate-500 font-mono">
                    {responsesModalReq.id} • {responsesModalReq.blood_group} ({responsesModalReq.blood_component.replace(/_/g, ' ')})
                  </p>
                </div>
              </div>
              <button onClick={() => setResponsesModalReq(null)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 space-y-3 py-1">
              {loadingResponses ? (
                <div className="text-center py-8 text-xs text-slate-400">Loading candidate responses...</div>
              ) : donorResponses.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs space-y-2">
                  <Clock className="w-8 h-8 mx-auto text-slate-300" />
                  <p>No candidate donors have submitted arrival responses yet for this request.</p>
                  <p className="text-[11px] text-slate-500">Dispatch Stage 1 outreach alerts to notify nearby compatible donors.</p>
                </div>
              ) : (
                donorResponses.map(resp => {
                  const isSelected = resp.review_status === 'SELECTED_FOR_COORDINATION';
                  const isDeclined = resp.review_status === 'DECLINED_BY_HOSPITAL';
                  const isArrived = !!resp.collection_confirmed_at;

                  return (
                    <div 
                      key={resp.donor_id}
                      className={`p-4 rounded-2xl border text-xs space-y-3 transition ${
                        isSelected 
                          ? 'bg-emerald-50/60 border-emerald-300 shadow-xs' 
                          : isDeclined 
                            ? 'bg-slate-50 border-slate-200 opacity-60' 
                            : 'bg-white border-slate-200 shadow-2xs'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-sm text-slate-900">{resp.donor_name}</span>
                          <span className="font-mono text-[10px] font-bold bg-blood-100 text-blood-800 px-2 py-0.5 rounded">
                            {resp.donor_blood_group}
                          </span>
                          <span className="text-[11px] text-slate-500">~{resp.distance_km} km away</span>
                        </div>

                        <div className="flex items-center space-x-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            isSelected ? 'bg-emerald-100 text-emerald-800' : isDeclined ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {resp.review_status.replace(/_/g, ' ')}
                          </span>
                        </div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1 text-[11px] text-slate-700">
                        <div className="flex items-center justify-between">
                          <span>Donor Availability Response: <strong className="text-slate-900">{resp.response}</strong></span>
                          <span className="text-[10px] text-slate-400 font-mono">{resp.response_timestamp}</span>
                        </div>
                        <div>Stated ETA & Notes: <span className="font-medium text-slate-800">{resp.notes || 'No extra notes provided.'}</span></div>
                        {resp.reviewed_at && (
                          <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-200/60">
                            Reviewed by {resp.reviewer_name || 'ER Attending'} at {resp.reviewed_at}: {resp.review_notes}
                          </div>
                        )}
                        {resp.collection_confirmed_at && (
                          <div className="text-[10px] text-emerald-700 font-bold flex items-center space-x-1">
                            <Check className="w-3.5 h-3.5" />
                            <span>Arrival and Bedside Collection Confirmed at {resp.collection_confirmed_at}</span>
                          </div>
                        )}
                      </div>

                      {/* Hospital Review Actions */}
                      <div className="flex items-center justify-end space-x-2 pt-1">
                        {!isSelected && !isDeclined && (
                          <>
                            <button
                              onClick={() => handleReviewDecision(resp.donor_id, 'DECLINED_BY_HOSPITAL')}
                              className="px-3 py-1.5 border border-slate-300 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold text-[11px]"
                            >
                              Decline
                            </button>
                            <button
                              onClick={() => handleReviewDecision(resp.donor_id, 'SELECTED_FOR_COORDINATION')}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-[11px] shadow-xs"
                            >
                              Accept for Coordination
                            </button>
                          </>
                        )}

                        {isSelected && !isArrived && (
                          <button
                            onClick={() => handleConfirmCollection(resp.donor_id)}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-[11px] shadow-xs flex items-center space-x-1"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Confirm Bay Arrival</span>
                          </button>
                        )}

                        {isSelected && isArrived && (
                          <button
                            onClick={() => handleCompleteDonation(resp.donor_id, resp.donor_name)}
                            className="px-3 py-1.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white rounded-xl font-bold text-[11px] shadow-xs flex items-center space-x-1.5"
                          >
                            <Award className="w-3.5 h-3.5" />
                            <span>Complete Donation & Issue Verified Certificate</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="border-t border-slate-100 pt-3 flex justify-between items-center text-xs">
              <span className="text-slate-500">Responses recorded with server timestamps. Clinical suitability subject to crossmatch.</span>
              <button
                onClick={() => setResponsesModalReq(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl font-semibold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Acceptance-Time Dashboard & Request Timeline Modal */}
      {timelineData && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-5 shadow-2xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shadow-xs">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Acceptance Timers & Lifecycle Audit</h3>
                  <p className="text-[11px] text-slate-500 font-mono">
                    {timelineData.request.id} • {timelineData.request.blood_group} ({timelineData.request.blood_component.replace(/_/g, ' ')})
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleViewTimeline(timelineData.request.id)}
                  disabled={timelineLoading}
                  className="p-1.5 text-slate-500 hover:text-indigo-600 rounded-lg hover:bg-slate-100 transition"
                  title="Refresh Timers"
                >
                  <RefreshCw className={`w-4 h-4 ${timelineLoading ? 'animate-spin text-indigo-600' : ''}`} />
                </button>
                <button onClick={() => setTimelineData(null)} className="text-slate-400 hover:text-slate-600">
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Scrollable Container */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-5">
              {/* Acceptance-Time Dashboard Metrics Panel */}
              {timelineData.metrics && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
                      <span>Operational Acceptance Metrics</span>
                      <span className="text-[10px] text-slate-400 font-normal lowercase">(derived from real DB timestamps)</span>
                    </span>
                    <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase ${
                      timelineData.metrics.sla_status === 'OVERDUE'
                        ? 'bg-rose-100 text-rose-800 border border-rose-300 animate-pulse'
                        : timelineData.metrics.sla_status === 'APPROACHING_DEADLINE'
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : timelineData.metrics.sla_status === 'FULFILLED_ON_TIME'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-blue-100 text-blue-800'
                    }`}>
                      SLA: {timelineData.metrics.sla_status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  {/* 4-Card Metrics Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                      <div className="text-[10px] text-slate-500 font-medium">Request Age</div>
                      <div className="text-base font-black text-slate-900 mt-0.5">{timelineData.metrics.request_age || '0s'}</div>
                      <div className="text-[9px] text-slate-400 mt-1">Since submission</div>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                      <div className="text-[10px] text-slate-500 font-medium">To 1st Notification</div>
                      <div className="text-base font-black text-slate-900 mt-0.5">
                        {timelineData.metrics.time_to_first_notification || 'Pending'}
                      </div>
                      <div className="text-[9px] text-slate-400 mt-1" title={timelineData.metrics.time_to_first_notification_definition}>
                        Dispatch queued
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                      <div className="text-[10px] text-slate-500 font-medium">To 1st Donor Resp</div>
                      <div className="text-base font-black text-slate-900 mt-0.5">
                        {timelineData.metrics.time_to_first_donor_response || 'Waiting'}
                      </div>
                      <div className="text-[9px] text-slate-400 mt-1">First response logged</div>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                      <div className="text-[10px] text-slate-500 font-medium">To Hospital Confirm</div>
                      <div className="text-base font-black text-slate-900 mt-0.5">
                        {timelineData.metrics.time_to_hospital_confirmation || 'Pending'}
                      </div>
                      <div className="text-[9px] text-slate-400 mt-1" title={timelineData.metrics.time_to_hospital_confirmation_definition}>
                        Triage accepted
                      </div>
                    </div>
                  </div>

                  {/* Secondary Metrics Bar */}
                  <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-2xl flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div>
                      <span className="text-slate-500 text-[11px]">Current Waiting Time: </span>
                      <strong className="text-indigo-900">{timelineData.metrics.current_waiting_time || 'None'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[11px]">Time to Fulfilment: </span>
                      <strong className="text-indigo-900">{timelineData.metrics.time_to_fulfillment || 'In Progress'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[11px]">Deadline Remaining: </span>
                      <strong className={timelineData.metrics.time_remaining_seconds < 0 ? 'text-rose-700' : 'text-indigo-900'}>
                        {timelineData.metrics.time_remaining || 'None Configured'}
                      </strong>
                    </div>
                  </div>

                  {/* Configured Operational Targets Reference Table */}
                  {timelineData.metrics.stage_target_breakdown && (
                    <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
                      <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-[11px] font-bold text-slate-700">
                        <span>Configured Operational Targets (SRS Section 2 Targets)</span>
                        <span className="text-[10px] font-normal text-slate-500">Operational benchmarks, not clinical guarantees</span>
                      </div>
                      <table className="w-full text-left text-[11px] border-collapse">
                        <thead>
                          <tr className="border-b border-slate-100 text-slate-400 font-medium">
                            <th className="py-2 px-3">Workflow Stage</th>
                            <th className="py-2 px-3">Target</th>
                            <th className="py-2 px-3">Actual Elapsed</th>
                            <th className="py-2 px-3 text-right">Target Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                          {timelineData.metrics.stage_target_breakdown.map(t => (
                            <tr key={t.stage_key} className="hover:bg-slate-50">
                              <td className="py-2 px-3 font-medium text-slate-900">{t.stage_name}</td>
                              <td className="py-2 px-3 font-mono text-slate-500">{t.target_formatted}</td>
                              <td className="py-2 px-3 font-mono font-bold text-slate-800">{t.actual_formatted || '—'}</td>
                              <td className="py-2 px-3 text-right">
                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${
                                  t.status === 'MET' 
                                    ? 'bg-emerald-100 text-emerald-800' 
                                    : t.status === 'EXCEEDED' 
                                      ? 'bg-rose-100 text-rose-800' 
                                      : 'bg-slate-100 text-slate-500'
                                }`}>
                                  {t.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Chronological Event Timeline */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  Complete Chronological Event Trace ({timelineData.events.length} Events Recorded)
                </span>

                {timelineData.events.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-400">No recorded events found.</div>
                ) : (
                  <div className="space-y-2.5">
                    {timelineData.events.map((evt, idx) => (
                      <div key={evt.id || idx} className="relative pl-6 pb-3 border-l-2 border-indigo-200 last:border-l-0 last:pb-0">
                        <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-indigo-600 border-2 border-white shadow-xs"></div>
                        <div className="text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900">{evt.title}</span>
                            <span className="text-[10px] text-slate-400 font-mono">{evt.timestamp}</span>
                          </div>
                          <p className="text-[11px] text-slate-600 leading-snug">{evt.description}</p>
                          <div className="flex items-center space-x-2 text-[10px] text-slate-500 pt-0.5">
                            <span>Actor: <strong>{evt.actor}</strong> [{evt.role}]</span>
                            {evt.badge && (
                              <span className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded font-mono font-bold">
                                {evt.badge}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-slate-100 pt-3 flex justify-end">
              <button
                onClick={() => setTimelineData(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold"
              >
                Close Dashboard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cold-Chain Dispatch Manifest Modal */}
      {manifestData && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-slate-800" />
                <h3 className="text-base font-bold text-slate-900">Cold-Chain Dispatch Manifest</h3>
              </div>
              <button onClick={() => setManifestData(null)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50 space-y-2 text-xs font-mono text-slate-800">
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span>Manifest: <strong>{manifestData.manifest_id}</strong></span>
                <span className="bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded">{manifestData.urgency}</span>
              </div>
              <div>Destination: <strong>{manifestData.hospital}</strong></div>
              <div>Address: {manifestData.delivery_address}</div>
              <div>Required Blood: <strong>{manifestData.blood_group} ({manifestData.blood_component})</strong></div>
              <div>Units: <strong>{manifestData.units_demanded} Units</strong></div>
              <div className="p-2 bg-blue-50 border border-blue-200 rounded text-blue-900 font-sans text-[11px]">
                <strong>Mandatory Temperature: </strong>{manifestData.temperature_requirements}
              </div>
              <div className="text-[10px] text-slate-500 pt-1">
                Verification Hash: {manifestData.qr_verification_code}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800"
              >
                Print Official Slip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Request Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <Activity className="w-5 h-5 text-blood-600" />
                <span>Submit Emergency Blood Request</span>
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRequest} className="space-y-4 text-xs">
              {/* Facility Picker for Coordinators and Admins */}
              {['EMERGENCY_COORDINATOR', 'SYSTEM_ADMIN'].includes(currentRole?.id) && organizations.length > 0 && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Target Hospital Facility *</label>
                  <select
                    value={targetOrgId}
                    onChange={(e) => {
                      setTargetOrgId(e.target.value);
                      const org = organizations.find(o => o.id === e.target.value);
                      if (org) {
                        setDeliveryAddress(org.address || deliveryAddress);
                      }
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-900"
                  >
                    {organizations.map(org => (
                      <option key={org.id} value={org.id}>
                        {org.name} ({org.type}) — {org.address?.substring(0, 30)}...
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Blood Group</label>
                  <select
                    value={bloodGroup}
                    onChange={(e) => setBloodGroup(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-bold"
                  >
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Component Needed</label>
                  <select
                    value={bloodComponent}
                    onChange={(e) => setBloodComponent(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900"
                  >
                    <option value="RED_BLOOD_CELLS">Packed Red Blood Cells (RBC)</option>
                    <option value="WHOLE_BLOOD">Whole Blood</option>
                    <option value="PLATELETS">Platelets (RDP/SDP)</option>
                    <option value="FRESH_FROZEN_PLASMA">Fresh Frozen Plasma (FFP)</option>
                    <option value="CRYOPRECIPITATE">Cryoprecipitate</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Units Demanded</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={units}
                    onChange={(e) => setUnits(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Urgency Classification</label>
                  <select
                    value={urgency}
                    onChange={(e) => setUrgency(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold text-rose-700"
                  >
                    <option value="CRITICAL_EMERGENCY">CRITICAL EMERGENCY (Life Threat / Code Red)</option>
                    <option value="URGENT">URGENT (Surgery Standby / Active Bleed)</option>
                    <option value="NORMAL">NORMAL (Scheduled / Elective Procedure)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Patient Reference (Anonymized MRN / Trauma ID)</label>
                <input
                  type="text"
                  placeholder="e.g. PT-TR-2026-904"
                  value={patientRef}
                  onChange={(e) => setPatientRef(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Clinical Justification & Indications</label>
                <textarea
                  rows="2"
                  placeholder="Describe patient hemodynamic state, estimated blood loss, acute indications..."
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Department / Ward</label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Required By (Deadline)</label>
                  <input
                    type="text"
                    value={requiredBy}
                    onChange={(e) => setRequiredBy(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Delivery Address</label>
                <input
                  type="text"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2"
                />
              </div>

              <div className="pt-4 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-blood-600 hover:bg-blood-700 text-white rounded-xl font-bold shadow-md shadow-rose-200 transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit for Clinical Verification'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Hospital Triage QR Scanner Modal */}
      <QRScannerModal
        isOpen={showQRScanner}
        onClose={() => setShowQRScanner(false)}
        onScanSuccess={(cred) => {
          setMessage({
            type: 'success',
            text: `✅ Verified ${cred.credential_type}: ${cred.display_name} (${cred.verified_blood_group || 'Verified Credential'})`
          });
          setShowQRScanner(false);
        }}
      />
    </div>
  );
}
