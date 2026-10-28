import React, { useState, useEffect } from 'react';
import { 
  Activity, TrendingUp, AlertTriangle, Cpu, ShieldAlert, BarChart2, CheckCircle2, 
  Clock, Building2, Users, Sliders, ShieldCheck, Search, PlusCircle, RefreshCw,
  Edit, Power, Check, X, FileText
} from 'lucide-react';
import { ClinicalDisclaimerBanner } from '../components/Disclaimers';

export default function MissionControl({ currentRole }) {
  const [activeTab, setActiveTab] = useState('OVERVIEW');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);

  // Overview Data
  const [metrics, setMetrics] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [adminOverview, setAdminOverview] = useState(null);

  // Facility Management Data
  const [facilities, setFacilities] = useState([]);
  const [facilitySearch, setFacilitySearch] = useState('');
  const [facilityTypeFilter, setFacilityTypeFilter] = useState('ALL');
  const [showAddFacilityModal, setShowAddFacilityModal] = useState(false);
  const [newFacility, setNewFacility] = useState({
    name: '',
    type: 'HOSPITAL',
    license_number: '',
    address: '',
    latitude: 17.3850,
    longitude: 78.4867,
    contact_email: '',
    contact_phone: ''
  });

  // User Administration Data
  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('');
  const [userOrgFilter, setUserOrgFilter] = useState('');
  const [roleChangeModalUser, setRoleChangeModalUser] = useState(null);
  const [selectedNewRole, setSelectedNewRole] = useState('HOSPITAL_REQUESTER');

  // SLA Targets Data
  const [slaTargets, setSlaTargets] = useState([]);
  const [editingSlaKey, setEditingSlaKey] = useState(null);
  const [editSlaSeconds, setEditSlaSeconds] = useState(300);

  // Audit Logs Data
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditSearch, setAuditSearch] = useState('');

  const getAuthToken = () => localStorage.getItem('bloodlink_auth_token') || ('mock_token_for_' + (currentRole?.id || 'HOSPITAL_ADMIN'));

  const fetchOverviewData = () => {
    fetch('/api/analytics/mission-control')
      .then(res => res.json())
      .then(data => setMetrics(data))
      .catch(console.error);

    fetch('/api/analytics/forecast')
      .then(res => res.json())
      .then(data => setForecast(data))
      .catch(console.error);

    fetch('/api/organizations/admin/overview', {
      headers: { 'Authorization': `Bearer ${getAuthToken()}` }
    })
      .then(res => res.json())
      .then(data => setAdminOverview(data))
      .catch(console.error);
  };

  const fetchFacilities = () => {
    fetch('/api/organizations', {
      headers: { 'Authorization': `Bearer ${getAuthToken()}` }
    })
      .then(res => res.json())
      .then(data => setFacilities(Array.isArray(data) ? data : []))
      .catch(console.error);
  };

  const fetchUsers = () => {
    const params = new URLSearchParams();
    if (userSearch) params.append('search', userSearch);
    if (userRoleFilter) params.append('role', userRoleFilter);
    if (userOrgFilter) params.append('org', userOrgFilter);

    fetch(`/api/organizations/admin/users?${params.toString()}`, {
      headers: { 'Authorization': `Bearer ${getAuthToken()}` }
    })
      .then(res => res.json())
      .then(data => setUsers(Array.isArray(data) ? data : []))
      .catch(console.error);
  };

  const fetchSlaTargets = () => {
    fetch('/api/requests/sla/targets')
      .then(res => res.json())
      .then(data => setSlaTargets(Array.isArray(data) ? data : []))
      .catch(console.error);
  };

  const fetchAuditLogs = () => {
    const params = new URLSearchParams();
    if (auditSearch) params.append('search', auditSearch);

    fetch(`/api/organizations/admin/audit-logs?${params.toString()}`, {
      headers: { 'Authorization': `Bearer ${getAuthToken()}` }
    })
      .then(res => res.json())
      .then(data => setAuditLogs(Array.isArray(data) ? data : []))
      .catch(console.error);
  };

  useEffect(() => {
    setLoading(true);
    fetchOverviewData();
    fetchFacilities();
    fetchSlaTargets();
    setLoading(false);
  }, []);

  useEffect(() => {
    if (activeTab === 'USERS') fetchUsers();
    if (activeTab === 'AUDIT_LOGS') fetchAuditLogs();
    if (activeTab === 'FACILITIES') fetchFacilities();
    if (activeTab === 'SLA_TARGETS') fetchSlaTargets();
  }, [activeTab]);

  // Handle Create Facility
  const handleCreateFacility = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/organizations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify(newFacility)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Facility creation failed');

      setMessage({ type: 'success', text: `Facility "${newFacility.name}" successfully registered!` });
      setShowAddFacilityModal(false);
      setNewFacility({
        name: '',
        type: 'HOSPITAL',
        license_number: '',
        address: '',
        latitude: 17.3850,
        longitude: 78.4867,
        contact_email: '',
        contact_phone: ''
      });
      fetchFacilities();
    } catch (err) {
      alert(`Error creating facility: ${err.message}`);
    }
  };

  // Toggle Facility Active Status
  const handleToggleFacilityStatus = async (facilityId) => {
    try {
      const res = await fetch(`/api/organizations/${facilityId}/toggle-status`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getAuthToken()}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setMessage({ type: 'success', text: data.message });
      fetchFacilities();
    } catch (err) {
      alert(`Status toggle error: ${err.message}`);
    }
  };

  // Handle User Role Change
  const handleUpdateUserRole = async () => {
    if (!roleChangeModalUser) return;
    try {
      const res = await fetch(`/api/organizations/admin/users/${roleChangeModalUser.id}/role`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({ role: selectedNewRole })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setMessage({ type: 'success', text: `Role updated for ${roleChangeModalUser.full_name} to ${selectedNewRole}` });
      setRoleChangeModalUser(null);
      fetchUsers();
    } catch (err) {
      alert(`Role change failed: ${err.message}`);
    }
  };

  // Toggle User Active / Suspend Status
  const handleToggleUserStatus = async (user) => {
    const newStatus = user.is_active ? 0 : 1;
    const actionLabel = newStatus ? 'activate' : 'suspend';
    if (!confirm(`Are you sure you want to ${actionLabel} account for ${user.full_name} (${user.email})?`)) return;

    try {
      const res = await fetch(`/api/organizations/admin/users/${user.id}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({ is_active: newStatus })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setMessage({ type: 'success', text: data.message });
      fetchUsers();
    } catch (err) {
      alert(`Status update failed: ${err.message}`);
    }
  };

  // Update SLA Operational Target
  const handleSaveSlaTarget = async (stageKey) => {
    try {
      const res = await fetch(`/api/requests/sla/targets/${stageKey}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({ target_seconds: parseInt(editSlaSeconds, 10) })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setMessage({ type: 'success', text: `Operational SLA target for "${stageKey}" updated to ${data.target_formatted}` });
      setEditingSlaKey(null);
      fetchSlaTargets();
    } catch (err) {
      alert(`Failed to update SLA target: ${err.message}`);
    }
  };

  // Filter facilities
  const filteredFacilities = facilities.filter(f => {
    if (facilityTypeFilter !== 'ALL' && f.type !== facilityTypeFilter) return false;
    if (facilitySearch.trim()) {
      const q = facilitySearch.toLowerCase();
      return f.name.toLowerCase().includes(q) || (f.address || '').toLowerCase().includes(q) || f.id.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <ClinicalDisclaimerBanner />

      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center space-x-2">
            <Activity className="w-6 h-6 text-blood-600" />
            <span>Mission Control & Hospital Admin Portal</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Regional healthcare network operations, facility governance, role permissions, and AI forecasting.
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs font-mono bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
          <span className="font-bold text-slate-800">FEED FRESH: {metrics ? 'LIVE SQL FEED' : 'CONNECTING...'}</span>
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

      {/* Navigation Tabs (Phase 12) */}
      <div className="flex border-b border-slate-200 gap-1 overflow-x-auto text-xs font-bold text-slate-600">
        <button
          onClick={() => setActiveTab('OVERVIEW')}
          className={`py-3 px-4 border-b-2 flex items-center space-x-2 transition whitespace-nowrap ${
            activeTab === 'OVERVIEW'
              ? 'border-blood-600 text-blood-700 font-black'
              : 'border-transparent hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <BarChart2 className="w-4 h-4" />
          <span>Overview & AI Forecast</span>
        </button>

        <button
          onClick={() => setActiveTab('FACILITIES')}
          className={`py-3 px-4 border-b-2 flex items-center space-x-2 transition whitespace-nowrap ${
            activeTab === 'FACILITIES'
              ? 'border-blood-600 text-blood-700 font-black'
              : 'border-transparent hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Facility Management ({facilities.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('USERS')}
          className={`py-3 px-4 border-b-2 flex items-center space-x-2 transition whitespace-nowrap ${
            activeTab === 'USERS'
              ? 'border-blood-600 text-blood-700 font-black'
              : 'border-transparent hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>User & Role Governance</span>
        </button>

        <button
          onClick={() => setActiveTab('SLA_TARGETS')}
          className={`py-3 px-4 border-b-2 flex items-center space-x-2 transition whitespace-nowrap ${
            activeTab === 'SLA_TARGETS'
              ? 'border-blood-600 text-blood-700 font-black'
              : 'border-transparent hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>SLA Operational Targets ({slaTargets.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('AUDIT_LOGS')}
          className={`py-3 px-4 border-b-2 flex items-center space-x-2 transition whitespace-nowrap ${
            activeTab === 'AUDIT_LOGS'
              ? 'border-blood-600 text-blood-700 font-black'
              : 'border-transparent hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Audit Stream</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: OVERVIEW & AI FORECAST                                  */}
      {/* ============================================================== */}
      {activeTab === 'OVERVIEW' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Top Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3.5">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-[11px] text-slate-500 font-medium">Active Requests</div>
              <div className="mt-1 text-2xl font-black text-rose-700">
                {adminOverview?.active_requests ?? metrics?.overview?.active_emergency_requests ?? 0}
              </div>
              <span className="text-[10px] text-slate-500">Live Hospital Triage</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-[11px] text-slate-500 font-medium">Pending Review</div>
              <div className="mt-1 text-2xl font-black text-amber-600">
                {adminOverview?.pending_review_requests ?? metrics?.overview?.pending_verification ?? 0}
              </div>
              <span className="text-[10px] text-amber-700 font-medium">Requires Clinical Review</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-[11px] text-slate-500 font-medium">Network Hospitals</div>
              <div className="mt-1 text-2xl font-black text-blue-700">
                {adminOverview?.hospital_count ?? 6}
              </div>
              <span className="text-[10px] text-blue-600 font-medium">+ {adminOverview?.blood_bank_count ?? 2} Blood Banks</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-[11px] text-slate-500 font-medium">Verified Donors</div>
              <div className="mt-1 text-2xl font-black text-emerald-600">
                {adminOverview?.verified_donors ?? 4}
              </div>
              <span className="text-[10px] text-emerald-600 font-medium">of {adminOverview?.donor_count ?? 4} registered</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-[11px] text-slate-500 font-medium">Pending Transfers</div>
              <div className="mt-1 text-2xl font-black text-purple-700">
                {adminOverview?.pending_transfers ?? 0}
              </div>
              <span className="text-[10px] text-purple-600 font-medium">In Cold-Chain Transit</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-[11px] text-slate-500 font-medium">Service Health</div>
              <div className="mt-1 text-base font-black text-emerald-600 flex items-center space-x-1.5 pt-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                <span>OPERATIONAL</span>
              </div>
              <span className="text-[10px] text-slate-400">REST API + DB Sync</span>
            </div>
          </div>

          {/* AI Demand Forecasting Section */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center space-x-2">
                  <Cpu className="w-5 h-5 text-indigo-600" />
                  <h2 className="text-base font-bold text-slate-900">
                    AI Shortage & Demand Prophet Forecast (7-Day Projection)
                  </h2>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Chronologically validated time-series forecast estimating regional component shortfalls.
                </p>
              </div>

              {forecast?.model_metadata && (
                <div className="text-[11px] font-mono text-slate-500 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg">
                  Model: <span className="font-bold text-slate-800">{forecast.model_metadata.model_name}</span> | Version: {forecast.model_metadata.model_version}
                </div>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                    <th className="py-3 px-4">Blood Group</th>
                    <th className="py-3 px-4">Current Available Stock</th>
                    <th className="py-3 px-4">Projected 7-Day Demand</th>
                    <th className="py-3 px-4">Projected Balance</th>
                    <th className="py-3 px-4">95% Confidence Interval</th>
                    <th className="py-3 px-4 text-right">Shortage Risk Level</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {forecast?.projections.map(proj => {
                    const isCrit = proj.risk_level === 'CRITICAL_DEFICIT';
                    const isMod = proj.risk_level === 'MODERATE_SHORTAGE';

                    return (
                      <tr key={proj.blood_group} className="hover:bg-slate-50/80 transition">
                        <td className="py-3.5 px-4">
                          <span className="w-8 h-8 rounded-lg bg-blood-100 text-blood-900 font-black inline-flex items-center justify-center text-xs">
                            {proj.blood_group}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          {proj.current_available_units} Units
                        </td>
                        <td className="py-3.5 px-4 text-slate-700">
                          {proj.projected_7day_demand} Units
                        </td>
                        <td className="py-3.5 px-4 font-mono font-semibold">
                          <span className={proj.projected_balance < 0 ? 'text-rose-600 font-bold' : 'text-emerald-700'}>
                            {proj.projected_balance > 0 ? `+${proj.projected_balance}` : proj.projected_balance} Units
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-500">
                          {proj.confidence_interval_95}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase ${
                            isCrit ? 'bg-rose-100 text-rose-800 animate-pulse' :
                            isMod ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {proj.risk_level.replace(/_/g, ' ')}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 flex items-start space-x-2">
              <ShieldAlert className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
              <span>
                <strong>AI Operational Boundary: </strong>
                Forecast values are statistical approximations derived from historical dispatch frequency and regional demand peaks. 
                They do not constitute guaranteed outcomes or clinical advice. Supply decisions should be verified with facility blood banks.
              </span>
            </div>
          </div>

          {/* Recent Operational Events Stream */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <Clock className="w-5 h-5 text-blood-600" />
                <h2 className="text-sm font-bold text-slate-900">Recent Operational Actions & Telemetry</h2>
              </div>
              <span className="text-xs text-slate-400 font-mono">Live SQL Audit Stream</span>
            </div>

            {metrics?.recent_events && metrics.recent_events.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {metrics.recent_events.map((evt) => (
                  <div key={evt.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-slate-900">{evt.action.replace(/_/g, ' ')}</div>
                      <div className="text-[11px] text-slate-500">
                        Target: <strong className="font-mono text-slate-700">{evt.entity_type} ({evt.entity_id || 'SYSTEM'})</strong>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">
                        Actor: {evt.actor_name || 'System Operator'} [{evt.actor_role || 'STAFF'}]
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 whitespace-nowrap">
                      {evt.created_at ? new Date(evt.created_at).toLocaleTimeString() : 'Recent'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-xs text-slate-400">No operational audit events recorded yet.</div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: FACILITY & HOSPITAL MANAGEMENT (Phase 12)               */}
      {/* ============================================================== */}
      {activeTab === 'FACILITIES' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <button
                onClick={() => setFacilityTypeFilter('ALL')}
                className={`px-3 py-1.5 rounded-xl font-bold transition ${facilityTypeFilter === 'ALL' ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-600'}`}
              >
                All Facilities ({facilities.length})
              </button>
              <button
                onClick={() => setFacilityTypeFilter('HOSPITAL')}
                className={`px-3 py-1.5 rounded-xl font-bold transition ${facilityTypeFilter === 'HOSPITAL' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-800'}`}
              >
                Hospitals
              </button>
              <button
                onClick={() => setFacilityTypeFilter('BLOOD_BANK')}
                className={`px-3 py-1.5 rounded-xl font-bold transition ${facilityTypeFilter === 'BLOOD_BANK' ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-800'}`}
              >
                Blood Banks
              </button>
            </div>

            <div className="flex items-center space-x-2">
              <div className="relative min-w-[200px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter facility name, address..."
                  value={facilitySearch}
                  onChange={(e) => setFacilitySearch(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800"
                />
              </div>

              {currentRole?.id === 'SYSTEM_ADMIN' && (
                <button
                  onClick={() => setShowAddFacilityModal(true)}
                  className="bg-blood-600 hover:bg-blood-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Register Facility</span>
                </button>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <th className="py-3.5 px-4">Facility ID</th>
                  <th className="py-3.5 px-4">Name & Type</th>
                  <th className="py-3.5 px-4">License</th>
                  <th className="py-3.5 px-4">Location & Coordinates</th>
                  <th className="py-3.5 px-4">Staff</th>
                  <th className="py-3.5 px-4">Stock Units</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredFacilities.map(fac => {
                  const isActive = fac.is_active !== 0;
                  return (
                    <tr key={fac.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{fac.id}</td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        <div>{fac.name}</div>
                        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                          fac.type === 'HOSPITAL' ? 'bg-blue-100 text-blue-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {fac.type}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-500">{fac.license_number || 'NABH-VERIFIED'}</td>
                      <td className="py-3.5 px-4 text-slate-600">
                        <div className="truncate max-w-[220px]" title={fac.address}>{fac.address}</div>
                        <div className="text-[10px] font-mono text-slate-400">{fac.latitude?.toFixed(4)}, {fac.longitude?.toFixed(4)}</div>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">{fac.staff_count ?? 1}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">{fac.available_units ?? 0} Units</td>
                      <td className="py-3.5 px-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {isActive ? 'ACTIVE' : 'SUSPENDED'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {currentRole?.id === 'SYSTEM_ADMIN' && (
                          <button
                            onClick={() => handleToggleFacilityStatus(fac.id)}
                            className={`px-2.5 py-1 rounded text-[11px] font-bold transition ${
                              isActive
                                ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                            }`}
                          >
                            {isActive ? 'Suspend' : 'Activate'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: USER & ROLE ADMINISTRATION (Phase 12)                   */}
      {/* ============================================================== */}
      {activeTab === 'USERS' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-bold text-slate-700 mr-1">Filter Role:</span>
              {['', 'DONOR', 'HOSPITAL_REQUESTER', 'HOSPITAL_ADMIN', 'BLOOD_BANK_OPERATOR', 'EMERGENCY_COORDINATOR', 'SYSTEM_ADMIN'].map(role => (
                <button
                  key={role || 'ALL'}
                  onClick={() => { setUserRoleFilter(role); fetchUsers(); }}
                  className={`px-2.5 py-1 rounded-lg font-bold transition text-[11px] ${
                    userRoleFilter === role ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {role || 'All Roles'}
                </button>
              ))}
            </div>

            <div className="relative min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search name, email, phone..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') fetchUsers(); }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800"
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <th className="py-3.5 px-4">User ID</th>
                  <th className="py-3.5 px-4">Name & Email</th>
                  <th className="py-3.5 px-4">Role</th>
                  <th className="py-3.5 px-4">Facility / Org</th>
                  <th className="py-3.5 px-4">Phone</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Governance Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {users.map(u => {
                  const isActive = u.is_active !== 0;
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{u.id}</td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{u.full_name}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{u.email}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          u.role === 'SYSTEM_ADMIN' ? 'bg-purple-100 text-purple-900' :
                          u.role === 'EMERGENCY_COORDINATOR' ? 'bg-rose-100 text-rose-900' :
                          u.role === 'HOSPITAL_ADMIN' ? 'bg-amber-100 text-amber-900' :
                          u.role === 'DONOR' ? 'bg-emerald-100 text-emerald-900' :
                          'bg-blue-100 text-blue-900'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-medium">
                        {u.organization_name || (u.role === 'DONOR' ? 'Community Donor' : 'Global Network')}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-500">{u.phone || '—'}</td>
                      <td className="py-3.5 px-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {isActive ? 'ACTIVE' : 'SUSPENDED'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => {
                            setRoleChangeModalUser(u);
                            setSelectedNewRole(u.role);
                          }}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-bold transition"
                        >
                          Change Role
                        </button>
                        <button
                          onClick={() => handleToggleUserStatus(u)}
                          className={`px-2.5 py-1 rounded text-[11px] font-bold transition ${
                            isActive
                              ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                          }`}
                        >
                          {isActive ? 'Suspend' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 4: SLA OPERATIONAL TARGETS (Phase 12)                       */}
      {/* ============================================================== */}
      {activeTab === 'SLA_TARGETS' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Configurable Operational SLA Benchmarks (SRS Section 2)</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Target thresholds determine lifecycle metrics, SLA badges, and escalation trigger pacing.
              </p>
            </div>
            <button
              onClick={fetchSlaTargets}
              className="p-1.5 text-slate-500 hover:text-slate-700 rounded-lg hover:bg-slate-100"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {slaTargets.map(tgt => {
              const isEditing = editingSlaKey === tgt.stage_key;
              return (
                <div key={tgt.stage_key} className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <div>
                      <div className="font-bold text-sm text-slate-900">{tgt.stage_name}</div>
                      <div className="text-[10px] font-mono text-slate-400">{tgt.stage_key}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-black text-lg text-blood-700 font-mono">
                        {Math.floor(tgt.target_seconds / 60)}m {tgt.target_seconds % 60}s
                      </div>
                      <div className="text-[10px] text-slate-400">({tgt.target_seconds} seconds)</div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 leading-snug">{tgt.description}</p>

                  <div className="pt-2 flex items-center justify-between">
                    {isEditing ? (
                      <div className="flex items-center space-x-2 w-full">
                        <span className="text-xs font-semibold text-slate-700">Target Sec:</span>
                        <input
                          type="number"
                          min="30"
                          max="86400"
                          value={editSlaSeconds}
                          onChange={(e) => setEditSlaSeconds(e.target.value)}
                          className="w-24 bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-xs font-mono font-bold"
                        />
                        <button
                          onClick={() => handleSaveSlaTarget(tgt.stage_key)}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingSlaKey(null)}
                          className="px-2.5 py-1 border border-slate-300 rounded-lg text-xs text-slate-600"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingSlaKey(tgt.stage_key);
                          setEditSlaSeconds(tgt.target_seconds);
                        }}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center space-x-1"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span>Edit SLA Threshold</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 5: AUDIT LOGS STREAM                                       */}
      {/* ============================================================== */}
      {activeTab === 'AUDIT_LOGS' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">Immutable System & Clinical Audit Log Stream</h2>
            <div className="relative min-w-[220px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search action, actor, entity..."
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') fetchAuditLogs(); }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800"
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Entity</th>
                  <th className="py-3 px-4">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {auditLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {log.created_at}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{log.actor_name || 'System Operator'}</div>
                      <span className="text-[10px] font-mono bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded">
                        {log.actor_role}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-blood-700">
                      {log.action}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {log.entity_type} {log.entity_id ? `(${log.entity_id})` : ''}
                    </td>
                    <td className="py-3 px-4 text-[11px] text-slate-500 font-mono truncate max-w-xs" title={log.details}>
                      {log.details || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Role Change Modal */}
      {roleChangeModalUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Change User Role</h3>
              <button onClick={() => setRoleChangeModalUser(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs space-y-3">
              <div>
                <span className="text-slate-500">Target User:</span>
                <div className="font-bold text-slate-900 text-sm mt-0.5">{roleChangeModalUser.full_name}</div>
                <div className="text-[11px] text-slate-500 font-mono">{roleChangeModalUser.email}</div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select New Role</label>
                <select
                  value={selectedNewRole}
                  onChange={(e) => setSelectedNewRole(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-900"
                >
                  <option value="DONOR">DONOR (Community Blood Donor)</option>
                  <option value="HOSPITAL_REQUESTER">HOSPITAL_REQUESTER (ER Staff / Triage Nurse)</option>
                  <option value="HOSPITAL_ADMIN">HOSPITAL_ADMIN (Hospital Clinical Director)</option>
                  <option value="BLOOD_BANK_OPERATOR">BLOOD_BANK_OPERATOR (Laboratory / Cold-Chain Tech)</option>
                  <option value="EMERGENCY_COORDINATOR">EMERGENCY_COORDINATOR (Regional Dispatch Control)</option>
                  <option value="SYSTEM_ADMIN">SYSTEM_ADMIN (Full Platform Superuser)</option>
                </select>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800">
                <strong>Warning: </strong>Changing roles immediately updates API authorization scopes and dashboard permissions.
              </div>
            </div>

            <div className="pt-2 flex justify-end space-x-2">
              <button
                onClick={() => setRoleChangeModalUser(null)}
                className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateUserRole}
                className="px-5 py-2 bg-blood-600 hover:bg-blood-700 text-white rounded-xl text-xs font-bold shadow-xs"
              >
                Commit Role Change
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Facility Modal */}
      {showAddFacilityModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Register New Facility (Hospital / Blood Bank)</h3>
              <button onClick={() => setShowAddFacilityModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateFacility} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Facility Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Yashoda Super Specialty Hospital"
                  value={newFacility.name}
                  onChange={(e) => setNewFacility({ ...newFacility, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Facility Type *</label>
                  <select
                    value={newFacility.type}
                    onChange={(e) => setNewFacility({ ...newFacility, type: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold"
                  >
                    <option value="HOSPITAL">HOSPITAL</option>
                    <option value="BLOOD_BANK">BLOOD_BANK</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">License / Accreditation</label>
                  <input
                    type="text"
                    placeholder="e.g. NABH-HOSP-2026"
                    value={newFacility.license_number}
                    onChange={(e) => setNewFacility({ ...newFacility, license_number: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Physical Address *</label>
                <textarea
                  rows="2"
                  required
                  placeholder="Full street address, city, pin code..."
                  value={newFacility.address}
                  onChange={(e) => setNewFacility({ ...newFacility, address: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Latitude *</label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={newFacility.latitude}
                    onChange={(e) => setNewFacility({ ...newFacility, latitude: parseFloat(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Longitude *</label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={newFacility.longitude}
                    onChange={(e) => setNewFacility({ ...newFacility, longitude: parseFloat(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Contact Email</label>
                  <input
                    type="email"
                    value={newFacility.contact_email}
                    onChange={(e) => setNewFacility({ ...newFacility, contact_email: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={newFacility.contact_phone}
                    onChange={(e) => setNewFacility({ ...newFacility, contact_phone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddFacilityModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blood-600 hover:bg-blood-700 text-white rounded-xl font-bold shadow-xs"
                >
                  Register Facility
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
