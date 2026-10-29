import React, { useState, useEffect } from 'react';
import {
  Search, ShieldCheck, Clock, CheckCircle2, AlertCircle,
  Building2, Heart, Users, RefreshCw, X, Loader2, ArrowRight
} from 'lucide-react';

const STAGES = [
  { key: 'SUBMITTED', label: 'Submitted & Queued', desc: 'Request submitted to triage network' },
  { key: 'VERIFIED', label: 'Clinically Verified', desc: 'Hospital triage desk verified emergency' },
  { key: 'MATCHING', label: 'Spatial Matching', desc: 'Active radar search within 50km' },
  { key: 'OUTREACH', label: 'Donor Outreach', desc: 'Invitations dispatched to matching donors' },
  { key: 'ACCEPTED', label: 'Donor Responded', desc: 'Candidate donors confirmed willingness' },
  { key: 'EN_ROUTE', label: 'In Transit', desc: 'Donor en route to medical facility' },
  { key: 'ARRIVED', label: 'Arrived & Screened', desc: 'Screening and hemoglobin check passed' },
  { key: 'COLLECTED', label: 'Unit Collected', desc: 'Blood component drawn and safety checked' },
  { key: 'FULFILLED', label: 'Fulfilled & Issued', desc: 'Bedside transfusion complete, certificate generated' }
];

export default function TrackRequestModal({ isOpen, onClose, initialRef = '', initialPin = '' }) {
  const [referenceId, setReferenceId] = useState(initialRef);
  const [accessPin, setAccessPin] = useState(initialPin);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [requestData, setRequestData] = useState(null);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  useEffect(() => {
    if (initialRef) {
      setReferenceId(initialRef);
      if (initialPin) {
        setAccessPin(initialPin);
        handleTrack(initialRef, initialPin);
      }
    }
  }, [initialRef, initialPin]);

  if (!isOpen) return null;

  const handleTrack = async (ref = referenceId, pin = accessPin) => {
    if (!ref || ref.trim().length < 5) {
      setError('Please enter a valid Reference ID (e.g. REQ-2026-1234).');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/requests/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reference_id: ref.trim(),
          access_pin: pin ? pin.trim() : undefined
        })
      });

      const data = await res.json();
      if (!res.ok || !data.found) {
        throw new Error(data.message || 'No matching emergency request found.');
      }

      setRequestData(data);
      setLastRefreshed(new Date().toLocaleTimeString());
    } catch (err) {
      setError(err.message || 'Unable to retrieve tracking details.');
      setRequestData(null);
    } finally {
      setLoading(false);
    }
  };

  // Determine active stage index (0-8)
  const getStageIndex = (status, verificationStatus, timeline = []) => {
    if (status === 'FULFILLED') return 8;
    if (timeline.some(e => e.event_type?.includes('DONATION_COLLECTED') || e.event_type?.includes('DONATION_RECORDED'))) return 7;
    if (timeline.some(e => e.event_type?.includes('ARRIVED') || e.event_type?.includes('SCREENING'))) return 6;
    if (timeline.some(e => e.event_type?.includes('EN_ROUTE'))) return 5;
    if (requestData?.donor_willingness_responses > 0 || timeline.some(e => e.event_type?.includes('DONOR_RESPONSE'))) return 4;
    if (status === 'MATCHING' || requestData?.matched_donors_contacted > 0) return 3;
    if (verificationStatus === 'VERIFIED' || status === 'VERIFIED') return 1;
    return 0; // SUBMITTED
  };

  const currentStageIndex = requestData
    ? getStageIndex(requestData.status, requestData.display_status, requestData.timeline)
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl shadow-rose-950/20 overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 to-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Live Emergency Request Tracker
              </h2>
              <p className="text-xs text-slate-400">
                End-to-End Realtime Hospital & Donor Matching Pipeline
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Search Bar / Tracking Input */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Reference ID *
                </label>
                <input
                  type="text"
                  value={referenceId}
                  onChange={(e) => setReferenceId(e.target.value)}
                  placeholder="e.g. REQ-2026-7842"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-rose-400 font-mono font-bold text-sm focus:ring-2 focus:ring-rose-500 uppercase"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Access PIN or Phone (Optional)
                </label>
                <input
                  type="text"
                  value={accessPin}
                  onChange={(e) => setAccessPin(e.target.value)}
                  placeholder="6-digit PIN or phone number"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 font-mono text-sm focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-slate-400">
                🔒 Privacy Protected — Personal donor contact information is never disclosed publicly.
              </span>
              <button
                type="button"
                onClick={() => handleTrack()}
                disabled={loading}
                className="px-5 py-2 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                Track Status
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-950/50 border border-rose-500/50 flex items-start gap-3 text-xs text-rose-200">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Results Display */}
          {requestData && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Summary Card */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                  <div>
                    <span className="text-xs font-mono font-bold text-rose-400 block">
                      {requestData.reference_id}
                    </span>
                    <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-slate-400" />
                      {requestData.hospital_name || 'Regional Medical Facility'}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                      {requestData.blood_group} ({requestData.units_requested} Units)
                    </span>
                    <button
                      type="button"
                      onClick={() => handleTrack()}
                      className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800"
                      title="Refresh"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800/80">
                    <span className="text-[10px] text-slate-400 block uppercase">Status</span>
                    <span className="text-xs font-bold text-amber-400 block mt-0.5">
                      {requestData.display_status || requestData.status}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800/80">
                    <span className="text-[10px] text-slate-400 block uppercase">Units Fulfilled</span>
                    <span className="text-xs font-bold text-emerald-400 block mt-0.5">
                      {requestData.units_fulfilled} / {requestData.units_requested}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800/80">
                    <span className="text-[10px] text-slate-400 block uppercase">Donors Contacted</span>
                    <span className="text-xs font-bold text-blue-400 block mt-0.5">
                      {requestData.matched_donors_contacted || 0}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800/80">
                    <span className="text-[10px] text-slate-400 block uppercase">Donors Accepted</span>
                    <span className="text-xs font-bold text-purple-400 block mt-0.5">
                      {requestData.donor_willingness_responses || 0}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 text-xs text-slate-300">
                  <p className="italic">{requestData.public_safe_summary}</p>
                </div>
              </div>

              {/* 9-Stage Progress Timeline */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    9-Stage Coordination Progression
                  </h4>
                  {lastRefreshed && (
                    <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                      <Clock className="w-3 h-3" /> Synced at {lastRefreshed}
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  {STAGES.map((stage, idx) => {
                    const isPassed = idx < currentStageIndex;
                    const isCurrent = idx === currentStageIndex;
                    const isPending = idx > currentStageIndex;

                    return (
                      <div
                        key={stage.key}
                        className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                          isCurrent
                            ? 'bg-rose-950/30 border-rose-500/50 shadow-md shadow-rose-950/40'
                            : isPassed
                            ? 'bg-emerald-950/20 border-emerald-500/30 text-slate-300'
                            : 'bg-slate-950/40 border-slate-800/60 text-slate-400'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            isPassed
                              ? 'bg-emerald-500 text-slate-950'
                              : isCurrent
                              ? 'bg-rose-500 text-white animate-pulse'
                              : 'bg-slate-800 text-slate-400'
                          }`}>
                            {isPassed ? '✓' : idx + 1}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-semibold ${
                                isCurrent ? 'text-rose-200' : isPassed ? 'text-slate-200' : 'text-slate-400'
                              }`}>
                                {stage.label}
                              </span>
                              {isCurrent && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 uppercase">
                                  Current Active Step
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              {stage.desc}
                            </p>
                          </div>
                        </div>

                        <div>
                          {isPassed ? (
                            <span className="text-[10px] text-emerald-400 font-semibold uppercase">Completed</span>
                          ) : isCurrent ? (
                            <span className="text-[10px] text-rose-400 font-semibold uppercase animate-pulse">In Progress</span>
                          ) : (
                            <span className="text-[10px] text-slate-400 uppercase">Pending</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
