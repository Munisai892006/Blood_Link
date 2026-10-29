import React, { useState, useEffect } from 'react';
import { ShieldCheck, AlertCircle, FileText, CheckCircle, XCircle, Search, Eye, Check, X, ShieldAlert, UserCheck } from 'lucide-react';
import { ClinicalDisclaimerBanner } from '../components/Disclaimers';

export default function VerificationFraudPortal({ currentRole }) {
  const [fraudFlags, setFraudFlags] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [pendingDonors, setPendingDonors] = useState([]);
  const [activeTab, setActiveTab] = useState('requests'); // 'requests' | 'donors' | 'fraud' | 'audit'
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);

  const getAuthToken = () => localStorage.getItem('bloodlink_auth_token') || ('mock_token_for_' + currentRole.id);

  const fetchData = () => {
    // 1. Pending Emergency Requests needing Verification (FR-REQ-003)
    fetch('/api/requests?status=PENDING_REVIEW', {
      headers: { 'Authorization': `Bearer ${getAuthToken()}` }
    })
      .then(res => res.json())
      .then(data => setPendingRequests(Array.isArray(data) ? data : []))
      .catch(err => console.error(err));

    // 2. Pending Donor Profiles needing Verification (FR-DON-004)
    fetch('/api/auth/pending-donors', {
      headers: { 'Authorization': `Bearer ${getAuthToken()}` }
    })
      .then(res => res.json())
      .then(data => setPendingDonors(Array.isArray(data) ? data : []))
      .catch(err => console.error(err));

    // 3. Fraud Flags
    fetch('/api/analytics/fraud', {
      headers: { 'Authorization': `Bearer ${getAuthToken()}` }
    })
      .then(res => res.json())
      .then(data => setFraudFlags(Array.isArray(data) ? data : []))
      .catch(err => console.error(err));

    // 4. Audit Logs
    fetch('/api/analytics/audit-logs', {
      headers: { 'Authorization': `Bearer ${getAuthToken()}` }
    })
      .then(res => res.json())
      .then(data => {
        setAuditLogs(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => console.error(err));
  };

  useEffect(() => {
    fetchData();
  }, [currentRole]);

  const handleVerifyRequest = async (requestId, isApproved) => {
    const targetState = isApproved ? 'VERIFIED' : 'REJECTED';
    const reason = isApproved 
      ? 'Clinical verification completed: Patient necessity and medical licensing verified.' 
      : 'Verification rejected: Incomplete clinical justification or unverified facility credentials.';

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
      if (!res.ok) throw new Error(data.message);

      setMessage({
        type: 'success',
        text: `Request ${requestId} has been ${targetState}. Targeted notifications automatically dispatched to requester and disaster coordinators.`
      });
      fetchData();
    } catch (err) {
      alert(`Action error: ${err.message}`);
    }
  };

  const handleVerifyDonor = async (donorUserId, isApproved) => {
    const status = isApproved ? 'VERIFIED' : 'REJECTED';
    try {
      const res = await fetch(`/api/auth/verify-donor/${donorUserId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({ status })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Donor verification failed');

      setMessage({
        type: 'success',
        text: `Donor ${donorUserId} verification status updated to ${status}. Notification dispatched to donor profile.`
      });
      fetchData();
    } catch (err) {
      alert(`Action error: ${err.message}`);
    }
  };

  const handleResolveFlag = async (flagId, status, reviewNotes) => {
    try {
      const res = await fetch(`/api/analytics/fraud/${flagId}/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({ status, reviewNotes })
      });

      if (res.ok) {
        setMessage({ type: 'success', text: `Fraud flag ${flagId} status updated to ${status}.` });
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <ClinicalDisclaimerBanner />

      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
            <ShieldCheck className="w-6 h-6 text-blood-600" />
            <span>Clinical Verification & Fraud Review Command</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Authorizes emergency requests, reviews donor eligibility proofs, resolves algorithmic flags, and audits sensitive actions.
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex flex-wrap bg-slate-100 p-1 rounded-xl gap-1">
          <button
            onClick={() => setActiveTab('requests')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'requests' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Pending Clinical Requests ({pendingRequests.length})
          </button>
          <button
            onClick={() => setActiveTab('donors')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'donors' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Pending Donors ({pendingDonors.length})
          </button>
          <button
            onClick={() => setActiveTab('fraud')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'fraud' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Fraud & Duplicate Signals ({fraudFlags.length})
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'audit' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Audit Trail ({auditLogs.length})
          </button>
        </div>
      </div>

      {message && (
        <div className="p-4 rounded-xl text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center justify-between">
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="text-emerald-600 font-bold ml-2">✕</button>
        </div>
      )}

      {/* TAB 1: Pending Emergency Requests for Clinical Verification */}
      {activeTab === 'requests' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden p-6 space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <ShieldAlert className="w-4 h-4 text-blood-600" />
                <span>Emergency Requests Requiring Clinical Verification (FR-REQ-003)</span>
              </h2>
              <p className="text-xs text-slate-500">
                Approving a request promotes it to VERIFIED and automatically notifies requesters and coordinators.
              </p>
            </div>
            <span className="text-xs font-mono font-bold bg-amber-100 text-amber-900 px-2.5 py-1 rounded-md">
              {pendingRequests.length} PENDING REVIEW
            </span>
          </div>

          {pendingRequests.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              All active requests have been verified or fulfilled. No pending reviews in queue.
            </div>
          ) : (
            <div className="space-y-3">
              {pendingRequests.map(r => (
                <div key={r.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 hover:border-slate-300 transition space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-bold text-xs bg-white text-slate-900 px-2.5 py-1 rounded border border-slate-300">
                        {r.id}
                      </span>
                      <span className="text-xs font-bold text-slate-900">{r.organization_name}</span>
                      <span className="text-[10px] bg-rose-100 text-rose-800 font-black px-2 py-0.5 rounded uppercase">
                        {r.urgency_level}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-500">
                      Required by: <strong className="text-slate-800">{r.required_by}</strong>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-white p-3 rounded-xl border border-slate-200">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Blood Group</span>
                      <span className="font-black text-blood-700 text-sm">{r.blood_group}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Component</span>
                      <span className="font-semibold text-slate-800">{r.blood_component.replace(/_/g, ' ')}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Quantity Demanded</span>
                      <span className="font-black text-slate-900">{r.units_requested} Units</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Department</span>
                      <span className="font-medium text-slate-700">{r.hospital_department}</span>
                    </div>
                  </div>

                  {r.clinical_justification && (
                    <div className="text-[11px] text-slate-600 bg-amber-50/70 p-2.5 rounded-lg border border-amber-200">
                      <strong>Clinical Justification:</strong> {r.clinical_justification}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-slate-200/60">
                    <span className="text-[11px] text-slate-400">
                      Submitted by: <strong>{r.requester_name}</strong>
                    </span>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleVerifyRequest(r.id, false)}
                        className="px-3.5 py-1.5 bg-white hover:bg-rose-50 text-rose-700 hover:text-rose-800 rounded-xl text-xs font-semibold border border-rose-200 transition flex items-center space-x-1"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>

                      <button
                        onClick={() => handleVerifyRequest(r.id, true)}
                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1 shadow-xs"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Approve & Authorize Matching</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Unverified Donors Queue (FR-DON-004) */}
      {activeTab === 'donors' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden p-6 space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-blood-600" />
                <span>Unverified Donor Profiles Queue (FR-DON-004, AC-003)</span>
              </h2>
              <p className="text-xs text-slate-500">
                Review self-declared donor blood group and contact verification before enabling priority emergency matching.
              </p>
            </div>
            <span className="text-xs font-mono font-bold bg-amber-100 text-amber-900 px-2.5 py-1 rounded-md">
              {pendingDonors.length} PENDING REVIEW
            </span>
          </div>

          {pendingDonors.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              All registered donor profiles have been verified. No pending donor reviews in queue.
            </div>
          ) : (
            <div className="space-y-3">
              {pendingDonors.map(d => (
                <div key={d.id || d.user_id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 hover:border-slate-300 transition space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-bold text-xs bg-white text-slate-900 px-2.5 py-1 rounded border border-slate-300">
                        {d.id || d.user_id}
                      </span>
                      <span className="text-xs font-bold text-slate-900">{d.full_name}</span>
                      <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded uppercase">
                        {d.verification_status}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-500">
                      Registered: <strong className="text-slate-800">{d.registered_at ? new Date(d.registered_at).toLocaleDateString() : 'Recent'}</strong>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-white p-3 rounded-xl border border-slate-200">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Declared Blood Group</span>
                      <span className="font-black text-blood-700 text-sm">{d.blood_group}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Contact Info</span>
                      <span className="font-semibold text-slate-800 block truncate">{d.email}</span>
                      <span className="text-[10px] text-slate-500">{d.phone}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Locality / Radius</span>
                      <span className="font-semibold text-slate-800">{d.address_locality || 'Hyderabad Central'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Quiet Hours Protocol</span>
                      <span className="font-semibold text-slate-700">{d.quiet_hours_start || '22:00'} - {d.quiet_hours_end || '07:00'}</span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-1 gap-2">
                    <div className="text-[11px] text-slate-500">
                      Donor Consent: <strong>Emergency Outreaches Approved</strong> (Quiet Hours & Geofence active)
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleVerifyDonor(d.user_id || d.id, false)}
                        className="px-3.5 py-1.5 bg-white hover:bg-rose-50 text-rose-700 hover:text-rose-800 rounded-xl text-xs font-semibold border border-rose-200 transition flex items-center space-x-1"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Reject Identity</span>
                      </button>

                      <button
                        onClick={() => handleVerifyDonor(d.user_id || d.id, true)}
                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1 shadow-xs"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Verify & Authorize Donor</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Fraud Queue */}
      {activeTab === 'fraud' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-4 p-6">
          <div className="border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-amber-600" />
              <h2 className="text-sm font-bold text-slate-900">Configured Pattern Review Queue (FR-FRD-001)</h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              <strong>Procedural Safeguard (FR-FRD-003): </strong>
              Algorithmic duplicate flags are not treated as proof of misconduct. No automatic punitive actions are taken without human review.
            </p>
          </div>

          <div className="space-y-4">
            {fraudFlags.map(flag => {
              const isPending = flag.status === 'PENDING_REVIEW';
              return (
                <div key={flag.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-slate-900 bg-slate-200 px-2 py-0.5 rounded">
                      {flag.id}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                      isPending ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-800'
                    }`}>
                      {flag.status}
                    </span>
                  </div>

                  <div className="text-xs font-bold text-slate-900">{flag.flag_reason}</div>

                  {flag.evidence_payload && (
                    <div className="p-2.5 bg-white rounded-lg border border-slate-200 font-mono text-[11px] text-slate-700">
                      Evidence: {flag.evidence_payload}
                    </div>
                  )}

                  {isPending && (
                    <div className="pt-2 flex gap-2">
                      <button
                        onClick={() => handleResolveFlag(flag.id, 'DISMISSED', 'Verified as separate legitimate patient admission.')}
                        className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-semibold transition"
                      >
                        Dismiss as False Positive
                      </button>
                      <button
                        onClick={() => handleResolveFlag(flag.id, 'ACTION_TAKEN', 'Contacted ER triage; merged duplicate request.')}
                        className="px-3 py-1.5 bg-blood-600 hover:bg-blood-700 text-white rounded-lg text-xs font-semibold transition"
                      >
                        Record Action Taken
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: Audit Log Tab (FR-PRV-003) */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900">Protected Security & Operational Audit Log</h2>
            <p className="text-xs text-slate-500">Every sensitive action is cryptographically logged with actor, timestamp, and sanitized details.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <th className="py-3 px-4">Audit ID</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Actor & Role</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Entity</th>
                  <th className="py-3 px-4">Sanitized Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px] text-slate-700">
                {auditLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-bold text-slate-900">{log.id}</td>
                    <td className="py-3 px-4 text-slate-500">{log.created_at}</td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{log.actor_name || log.actor_id}</div>
                      <div className="text-[10px] text-slate-500">{log.actor_role}</div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-blood-700">{log.action}</td>
                    <td className="py-3 px-4 text-slate-800">{log.entity_type}: {log.entity_id}</td>
                    <td className="py-3 px-4 text-slate-600 max-w-xs truncate" title={log.details}>
                      {log.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
