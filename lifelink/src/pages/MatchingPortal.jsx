import React, { useState, useEffect } from 'react';
import { Search, MapPin, Send, Shield, AlertCircle, Moon, CheckCircle, Navigation, Radio, History, Layers, UserCheck, CheckSquare, Square } from 'lucide-react';
import { ClinicalDisclaimerBanner } from '../components/Disclaimers';

export default function MatchingPortal({ currentRole, navContext }) {
  const [requests, setRequests] = useState([]);
  const [selectedRequestId, setSelectedRequestId] = useState(() => navContext?.requestId || 'REQ-2026-001');
  const [selectedStage, setSelectedStage] = useState(1);
  const [matchData, setMatchData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dispatchResult, setDispatchResult] = useState(null);
  const [selectedCandidateIds, setSelectedCandidateIds] = useState(new Set());
  const [selectingDonor, setSelectingDonor] = useState(false);

  useEffect(() => {
    if (navContext?.requestId) {
      setSelectedRequestId(navContext.requestId);
    }
  }, [navContext]);

  useEffect(() => {
    fetch('/api/requests')
      .then(res => res.json())
      .then(data => {
        setRequests(data);
        if (data.length > 0 && !selectedRequestId) {
          setSelectedRequestId(navContext?.requestId || data[0].id);
        }
      });
  }, []);

  const getAuthToken = () => localStorage.getItem('bloodlink_auth_token') || ('mock_token_for_' + (currentRole?.id || 'HOSPITAL_REQUESTER'));

  const loadCandidates = (reqId, stage) => {
    if (!reqId) return;
    setLoading(true);
    setDispatchResult(null);

    fetch(`/api/requests/${reqId}/candidates?stage=${stage}`, {
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`
      }
    })
      .then(res => res.json())
      .then(data => {
        setMatchData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    if (selectedRequestId) {
      loadCandidates(selectedRequestId, selectedStage);
    }
  }, [selectedRequestId, selectedStage, currentRole]);

  const handleDispatchEscalation = async () => {
    try {
      const res = await fetch(`/api/requests/${selectedRequestId}/escalate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({ stage: selectedStage })
      });

      const data = await res.json();
      if (res.ok) {
        if (data.is_duplicate_prevented || data.outreach_dispatched === 0) {
          setDispatchResult({
            type: 'info',
            text: data.message || 'All eligible donors in this stage have already been contacted. No duplicate notifications were sent.'
          });
        } else {
          setDispatchResult({
            type: 'success',
            text: data.message || `Stage ${selectedStage} (${data.stage_radius_km || (selectedStage === 1 ? 5 : selectedStage === 2 ? 15 : selectedStage === 3 ? 30 : 50)} km) escalation dispatched! Sent outreach alerts to ${data.outreach_dispatched} eligible donors.`
          });
        }
        loadCandidates(selectedRequestId, selectedStage);
      } else {
        setDispatchResult({ type: 'error', text: data.message });
      }
    } catch (err) {
      setDispatchResult({ type: 'error', text: err.message });
    }
  };

  const handleSelectDonor = async (donorId) => {
    try {
      setSelectingDonor(true);
      const res = await fetch(`/api/requests/${selectedRequestId}/select-donor/${donorId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({ notes: 'Selected for bedside coordination via Matching Portal' })
      });

      const data = await res.json();
      if (res.ok) {
        setDispatchResult({
          type: 'success',
          text: data.message || `Donor selected for coordination! Hospital triage and donor have been notified.`
        });
        loadCandidates(selectedRequestId, selectedStage);
      } else {
        setDispatchResult({ type: 'error', text: data.message || 'Failed to select donor for coordination.' });
      }
    } catch (err) {
      setDispatchResult({ type: 'error', text: err.message });
    } finally {
      setSelectingDonor(false);
    }
  };

  const toggleCandidateSelection = (donorId) => {
    setSelectedCandidateIds(prev => {
      const next = new Set(prev);
      if (next.has(donorId)) next.delete(donorId);
      else next.add(donorId);
      return next;
    });
  };

  const handleBatchSelectDonors = async () => {
    const candidatesToSelect = matchData?.candidates?.filter(c => 
      !c.is_selected_for_coordination && (selectedCandidateIds.size === 0 || selectedCandidateIds.has(c.donor_id))
    ) || [];

    if (candidatesToSelect.length === 0) {
      setDispatchResult({ type: 'info', text: 'All candidate donors are already selected for coordination.' });
      return;
    }

    setSelectingDonor(true);
    let count = 0;
    for (const c of candidatesToSelect) {
      try {
        await fetch(`/api/requests/${selectedRequestId}/select-donor/${c.donor_id}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getAuthToken()}`
          },
          body: JSON.stringify({ notes: 'Batch selected for coordination' })
        });
        count++;
      } catch (e) {
        console.error(e);
      }
    }

    setSelectingDonor(false);
    setDispatchResult({
      type: 'success',
      text: `Successfully selected ${count} donor(s) for coordination and dispatched bedside alerts.`
    });
    setSelectedCandidateIds(new Set());
    loadCandidates(selectedRequestId, selectedStage);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <ClinicalDisclaimerBanner />

      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center space-x-2">
            <Search className="w-6 h-6 text-blood-600" />
            <span>Geographic Donor Matching & Escalation Engine</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Haversine spatial proximity matching with multi-stage radius expansion and privacy masking (SRS Section 7).
          </p>
        </div>

        {/* Request Selector */}
        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold text-slate-600">Select Request:</span>
          <select
            value={selectedRequestId}
            onChange={(e) => setSelectedRequestId(e.target.value)}
            className="text-xs font-bold bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800"
          >
            {requests.map(r => (
              <option key={r.id} value={r.id}>
                {r.id} [{r.blood_group} {r.blood_component.replace(/_/g, ' ')}] - {r.status}
              </option>
            ))}
          </select>
        </div>
      </div>

      {dispatchResult && (
        <div className={`p-4 rounded-xl text-xs font-medium border ${
          dispatchResult.type === 'success'
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
            : dispatchResult.type === 'info'
            ? 'bg-blue-50 text-blue-800 border-blue-200'
            : 'bg-rose-50 text-rose-800 border-rose-200'
        }`}>
          {dispatchResult.text}
        </div>
      )}

      {/* Multi-Stage Radius Escalation Selector (SRS Section 7) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
            <Radio className="w-4 h-4 text-blood-600" />
            <span>Perimeter Radius Escalation</span>
          </span>
          <span className="text-xs text-slate-500">
            Perimeter expansion activates outer rings when immediate local threshold requires reinforcement
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { stage: 1, radius: '5 km', label: 'Stage 1: Immediate Vicinity', desc: '0 - 5 km perimeter' },
            { stage: 2, radius: '15 km', label: 'Stage 2: Metropolitan Core', desc: '5 - 15 km perimeter' },
            { stage: 3, radius: '30 km', label: 'Stage 3: Suburban Belt', desc: '15 - 30 km perimeter' },
            { stage: 4, radius: '50 km', label: 'Stage 4: Regional Deep Search', desc: '30 - 50 km perimeter' }
          ].map(s => {
            const isSelected = selectedStage === s.stage;
            return (
              <button
                key={s.stage}
                onClick={() => setSelectedStage(s.stage)}
                className={`p-3.5 rounded-2xl border text-left transition ${
                  isSelected
                    ? 'bg-blood-50 border-blood-500 text-blood-900 shadow-xs ring-1 ring-blood-400'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="text-xl font-black">{s.radius}</div>
                  {isSelected && <span className="w-2 h-2 rounded-full bg-blood-600 animate-ping"></span>}
                </div>
                <div className="text-xs font-bold mt-0.5">{s.label}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">{s.desc}</div>
              </button>
            );
          })}
        </div>

        {/* Stage Summary Statistics Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div className="text-[10px] text-slate-500 font-medium">Selected Radius</div>
            <div className="text-base font-black text-slate-900 mt-0.5">{matchData?.stage_radius_km || 5} km</div>
            <div className="text-[10px] text-slate-400">Stage {selectedStage}</div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div className="text-[10px] text-slate-500 font-medium">Cumulative Candidates</div>
            <div className="text-base font-black text-blood-700 mt-0.5">{matchData?.total_candidates_found || 0} Donors</div>
            <div className="text-[10px] text-slate-400">All within ≤ {matchData?.stage_radius_km || 5} km</div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div className="text-[10px] text-slate-500 font-medium">Newly Included in Ring</div>
            <div className="text-base font-black text-indigo-700 mt-0.5">+{matchData?.newly_included_count || 0} Donors</div>
            <div className="text-[10px] text-slate-400">Between {matchData?.prev_stage_radius_km || 0} - {matchData?.stage_radius_km || 5} km</div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div className="text-[10px] text-slate-500 font-medium">Outreach History</div>
            <div className="text-base font-black text-slate-900 mt-0.5">
              {matchData?.escalation_history?.length || 0} Stages
            </div>
            <div className="text-[10px] text-slate-400">Dispatched previously</div>
          </div>
        </div>

        {/* Prior Escalation History Records */}
        {matchData?.escalation_history && matchData.escalation_history.length > 0 && (
          <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/70 text-xs space-y-1.5">
            <div className="font-bold text-slate-700 flex items-center space-x-1.5">
              <History className="w-3.5 h-3.5 text-slate-500" />
              <span>Prior Escalation Dispatches for {selectedRequestId}</span>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {matchData.escalation_history.map(h => (
                <div key={h.stage} className="bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-[11px] flex items-center space-x-2">
                  <span className="font-bold text-slate-900">Stage {h.stage}</span>
                  <span className="text-slate-500 font-mono">({h.donors_notified} notified)</span>
                  <span className="text-[10px] text-slate-400">{h.dispatched_at}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Matching Results & Privacy-Masked Candidates */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Cumulative Candidate Donors ({matchData?.total_candidates_found || 0})
            </h2>
            <p className="text-xs text-slate-500">
              Spatial Haversine calculation for {matchData?.blood_group_needed} RBC compatibility within ≤ {matchData?.stage_radius_km || 5} km.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleBatchSelectDonors}
              disabled={selectingDonor || !matchData?.candidates?.some(c => !c.is_selected_for_coordination)}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-3 py-2 rounded-xl text-xs flex items-center space-x-1.5 transition shadow-xs disabled:opacity-50"
            >
              <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Select All Eligible for Coordination</span>
            </button>

            <button
              onClick={handleDispatchEscalation}
              className="bg-blood-600 hover:bg-blood-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center space-x-2 transition shadow-xs"
            >
              <Send className="w-4 h-4" />
              <span>Dispatch Stage {selectedStage} Alerts ({matchData?.stage_radius_km} km)</span>
            </button>
          </div>
        </div>

        {/* Candidate List */}
        {loading ? (
          <div className="text-center py-8 text-xs text-slate-500">Calculating Haversine proximity...</div>
        ) : matchData?.candidates.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-500">
            No compatible donors found within {matchData?.stage_radius_km} km. Consider expanding to the next escalation stage.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {matchData?.candidates.map(candidate => {
              const status = candidate.detailed_status || (candidate.is_already_notified ? 'NOTIFICATION SENT' : 'NEW — NOT CONTACTED');
              const isSelected = candidate.is_selected_for_coordination;

              const statusColor = 
                status === 'SELECTED FOR COORDINATION' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                status === 'WILLING TO HELP' ? 'bg-teal-100 text-teal-800 border-teal-300' :
                status === 'NOTIFICATION SENT' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                status === 'INVITATION QUEUED' ? 'bg-purple-100 text-purple-800 border-purple-300' :
                status === 'UNABLE TO DONATE' ? 'bg-rose-100 text-rose-800 border-rose-300' :
                status === 'WITHDRAWN' ? 'bg-slate-200 text-slate-800 border-slate-300' :
                'bg-slate-100 text-slate-700 border-slate-200';

              return (
                <div 
                  key={candidate.donor_id} 
                  className={`p-4 rounded-2xl border space-y-3 transition ${
                    isSelected
                      ? 'bg-emerald-50/50 border-emerald-300 shadow-xs'
                      : candidate.is_new_in_stage 
                        ? 'bg-indigo-50/50 border-indigo-200 shadow-2xs' 
                        : 'bg-slate-50/50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={isSelected || selectedCandidateIds.has(candidate.donor_id)}
                        disabled={isSelected}
                        onChange={() => toggleCandidateSelection(candidate.donor_id)}
                        className="rounded border-slate-300 text-blood-600 focus:ring-blood-500 w-3.5 h-3.5 cursor-pointer disabled:opacity-50"
                        title={isSelected ? 'Already selected for coordination' : 'Select donor'}
                      />
                      <span className="font-bold text-sm text-slate-900">{candidate.full_name}</span>
                      {candidate.is_new_in_stage && (
                        <span className="text-[9px] font-black bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded">
                          NEW IN RING
                        </span>
                      )}
                    </div>
                    <span className="w-8 h-8 rounded-lg bg-blood-100 text-blood-800 font-extrabold flex items-center justify-center text-xs">
                      {candidate.blood_group}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-600">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Proximity Distance:</span>
                      <span className="font-bold text-slate-900 flex items-center space-x-1">
                        <Navigation className="w-3 h-3 text-blood-600" />
                        <span>{candidate.distance_km} km away</span>
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Locality:</span>
                      <span className="font-medium text-slate-800">{candidate.address_locality}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Current Status:</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${statusColor}`}>
                        {status}
                      </span>
                    </div>
                  </div>

                  {/* Individual Donor Selection Action (Instruction #5) */}
                  <div className="pt-2 border-t border-slate-200/70">
                    {isSelected ? (
                      <div className="w-full py-1.5 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl text-center font-bold text-xs flex items-center justify-center space-x-1.5 shadow-2xs">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Selected for Coordination</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleSelectDonor(candidate.donor_id)}
                        disabled={selectingDonor}
                        className="w-full py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 transition shadow-xs disabled:opacity-50"
                      >
                        <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Select for Coordination</span>
                      </button>
                    )}
                  </div>

                  {/* Privacy Badge */}
                  <div className="pt-1.5 border-t border-slate-200/50 flex items-center justify-between text-[11px]">
                    <span className="flex items-center space-x-1 text-emerald-700">
                      <Shield className="w-3 h-3" />
                      <span>GPS Privacy Masked</span>
                    </span>

                    {candidate.quiet_hours_active && (
                      <span className="flex items-center space-x-1 text-indigo-700 font-medium">
                        <Moon className="w-3 h-3" />
                        <span>In Quiet Hours</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
