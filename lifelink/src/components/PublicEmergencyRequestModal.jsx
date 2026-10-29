import React, { useState } from 'react';
import {
  AlertCircle, CheckCircle2, Copy, ExternalLink, Heart,
  Hospital, Phone, ShieldAlert, User, Clock, MapPin, X, Loader2, Info
} from 'lucide-react';
import LocationSearchSelector from './LocationSearchSelector';

export default function PublicEmergencyRequestModal({ isOpen, onClose, onTrackRequest }) {
  const [formData, setFormData] = useState({
    patient_reference: '',
    use_privacy_reference: false,
    hospital_name: "Nizam's Institute of Medical Sciences (NIMS)",
    hospital_department: 'ICU / Acute Trauma Center',
    delivery_address: 'Punjagutta, Hyderabad, Telangana 500082',
    delivery_latitude: 17.4222,
    delivery_longitude: 78.4528,
    blood_group: 'O-',
    blood_component: 'RED_BLOOD_CELLS',
    units_requested: 2,
    urgency_level: 'CRITICAL_EMERGENCY',
    required_by_hours: 4,
    requester_name: '',
    requester_phone: '',
    requester_relationship: 'Relative/Family Member',
    clinical_justification: '',
    consent_acknowledged: false
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submissionResult, setSubmissionResult] = useState(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleLocationSelect = (loc) => {
    if (!loc) return;
    setFormData((prev) => ({
      ...prev,
      hospital_name: loc.name,
      delivery_address: `${loc.name}, ${loc.locality}, ${loc.city}, ${loc.state} ${loc.postal_code || ''}`.trim(),
      delivery_latitude: loc.latitude || 17.4065,
      delivery_longitude: loc.longitude || 78.4772
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.requester_name || formData.requester_name.trim().length < 2) {
      setError('Please provide your full name as the requester.');
      return;
    }

    const cleanPhone = formData.requester_phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 10) {
      setError('Please enter a valid 10-digit telephone number for hospital emergency verification.');
      return;
    }

    if (!formData.consent_acknowledged) {
      setError('You must confirm the emergency consent declaration before dispatching.');
      return;
    }

    setLoading(true);

    try {
      const requiredByTime = new Date(Date.now() + (parseInt(formData.required_by_hours, 10) || 4) * 3600000).toISOString();
      const patientRef = formData.use_privacy_reference
        ? `PATIENT-REF-${Math.floor(1000 + Math.random() * 9000)}`
        : (formData.patient_reference.trim() || `PATIENT-${Math.floor(1000 + Math.random() * 9000)}`);

      const payload = {
        patient_reference: patientRef,
        hospital_name: formData.hospital_name,
        hospital_department: formData.hospital_department,
        delivery_address: formData.delivery_address,
        delivery_latitude: formData.delivery_latitude,
        delivery_longitude: formData.delivery_longitude,
        blood_group: formData.blood_group,
        blood_component: formData.blood_component,
        units_requested: parseInt(formData.units_requested, 10),
        urgency_level: formData.urgency_level,
        required_by: requiredByTime,
        requester_name: formData.requester_name,
        requester_phone: formData.requester_phone,
        requester_relationship: formData.requester_relationship,
        clinical_justification: formData.clinical_justification || 'Emergency request submitted via BloodLink public portal.',
        consent_acknowledged: true
      };

      const res = await fetch('/api/requests/public', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to submit emergency request.');
      }

      setSubmissionResult(data);
    } catch (err) {
      setError(err.message || 'Network error while submitting emergency request.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyReceipt = () => {
    if (!submissionResult) return;
    const text = `BLOODLINK EMERGENCY REFERENCE: ${submissionResult.reference_id}\nACCESS PIN: ${submissionResult.access_pin}\nHospital: ${submissionResult.hospital_name}\nBlood Group: ${submissionResult.blood_group} (${submissionResult.units_requested} units)\nTrack: ${window.location.origin}/#/track/${submissionResult.reference_id}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl shadow-rose-950/30 overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-rose-950/60 to-slate-900 border-b border-rose-900/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Emergency Blood Request
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  No Login Required
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Direct dispatch to Regional Blood Banks, Hospitals & Volunteer Donors
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

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {submissionResult ? (
            /* Success Receipt View */
            <div className="space-y-6 animate-in zoom-in-95 duration-200">
              <div className="p-5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-center space-y-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                <h3 className="text-xl font-bold text-emerald-200">
                  Emergency Request Dispatched!
                </h3>
                <p className="text-xs text-emerald-300/80 max-w-md mx-auto">
                  {submissionResult.message || 'Your emergency blood requirement has been received and routed to regional hospital coordinators and nearby donors.'}
                </p>
              </div>

              <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                      Emergency Reference ID
                    </span>
                    <span className="text-xl font-mono font-bold text-rose-400">
                      {submissionResult.reference_id}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                      Private Tracking PIN
                    </span>
                    <span className="text-xl font-mono font-bold text-amber-400">
                      {submissionResult.access_pin}
                    </span>
                  </div>
                </div>

                <div className="text-xs text-slate-300 space-y-1.5 bg-slate-900/60 p-3 rounded-lg border border-slate-800/80">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Hospital:</span>
                    <span className="font-medium text-slate-200">{submissionResult.hospital_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Blood Component:</span>
                    <span className="font-medium text-slate-200">{submissionResult.blood_group} ({submissionResult.units_requested} units)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Initial Verification Status:</span>
                    <span className="font-semibold text-amber-300">SUBMITTED_PENDING_VERIFICATION</span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-500/30 flex items-start gap-2.5 text-xs text-amber-300">
                  <Info className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    <strong>Important:</strong> Save your Reference ID and PIN. You can use them on the public portal to track donor responses, hospital acceptance, and dispatch progress.
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={handleCopyReceipt}
                  className="flex-1 py-3 px-4 rounded-xl font-medium text-sm bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center justify-center gap-2 transition-colors"
                >
                  <Copy className="w-4 h-4" />
                  {copied ? 'Copied to Clipboard!' : 'Copy Reference & PIN'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onTrackRequest) {
                      onTrackRequest(submissionResult.reference_id, submissionResult.access_pin);
                    }
                  }}
                  className="flex-1 py-3 px-4 rounded-xl font-semibold text-sm bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center gap-2 transition-colors shadow-lg shadow-rose-900/30"
                >
                  <ExternalLink className="w-4 h-4" />
                  Track Request Live
                </button>
              </div>
            </div>
          ) : (
            /* Submission Form View */
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="p-3.5 rounded-xl bg-rose-950/50 border border-rose-500/50 flex items-start gap-3 text-xs text-rose-200">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                  <span>{error}</span>
                </div>
              )}

              {/* Patient Details & Privacy */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-rose-400" />
                    Patient / Emergency Reference
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.use_privacy_reference}
                      onChange={(e) => setFormData({ ...formData, use_privacy_reference: e.target.checked })}
                      className="rounded bg-slate-800 border-slate-700 text-rose-600 focus:ring-rose-500"
                    />
                    <span>Privacy-preserving reference</span>
                  </label>
                </div>
                {!formData.use_privacy_reference ? (
                  <input
                    type="text"
                    value={formData.patient_reference}
                    onChange={(e) => setFormData({ ...formData, patient_reference: e.target.value })}
                    placeholder="e.g. Ramesh K. / Trauma Bed 3 / ICU-904"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                ) : (
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-400 font-mono">
                    🛡️ System will assign anonymous token (e.g. PATIENT-REF-4819). Real patient name will not appear publicly.
                  </div>
                )}
              </div>

              {/* Hospital & GIS Search */}
              <div className="space-y-3">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Hospital className="w-3.5 h-3.5 text-rose-400" />
                  Hospital & Location (Verified Database)
                </label>
                <LocationSearchSelector
                  value={formData.hospital_name}
                  onSelect={handleLocationSelect}
                  placeholder="Type hospital name or locality (e.g. NIMS, Apollo, Osmania, Banjara Hills)..."
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Hospital Department / Ward</label>
                    <input
                      type="text"
                      value={formData.hospital_department}
                      onChange={(e) => setFormData({ ...formData, hospital_department: e.target.value })}
                      placeholder="e.g. Emergency Room, ICU, OT-3"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 text-xs focus:ring-2 focus:ring-rose-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Delivery Address & Area</label>
                    <input
                      type="text"
                      value={formData.delivery_address}
                      onChange={(e) => setFormData({ ...formData, delivery_address: e.target.value })}
                      placeholder="e.g. Punjagutta, Hyderabad 500082"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 text-xs focus:ring-2 focus:ring-rose-500"
                    />
                  </div>
                </div>
              </div>

              {/* Blood Group, Component & Units */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1.5">
                    Blood Group
                  </label>
                  <select
                    value={formData.blood_group}
                    onChange={(e) => setFormData({ ...formData, blood_group: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-rose-400 font-bold text-sm focus:ring-2 focus:ring-rose-500"
                  >
                    {['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'].map((bg) => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1.5">
                    Blood Component
                  </label>
                  <select
                    value={formData.blood_component}
                    onChange={(e) => setFormData({ ...formData, blood_component: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 text-sm focus:ring-2 focus:ring-rose-500"
                  >
                    <option value="RED_BLOOD_CELLS">Packed Red Cells (PRBC)</option>
                    <option value="WHOLE_BLOOD">Whole Blood</option>
                    <option value="PLATELETS">Platelets (RDP / SDP)</option>
                    <option value="PLASMA">Fresh Frozen Plasma (FFP)</option>
                    <option value="CRYOPRECIPITATE">Cryoprecipitate</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1.5">
                    Units Needed
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={formData.units_requested}
                    onChange={(e) => setFormData({ ...formData, units_requested: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 font-bold text-sm focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>

              {/* Urgency & Required By Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1.5">
                    Urgency Level
                  </label>
                  <select
                    value={formData.urgency_level}
                    onChange={(e) => setFormData({ ...formData, urgency_level: e.target.value })}
                    className={`w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-rose-500 ${
                      formData.urgency_level === 'CRITICAL_EMERGENCY' ? 'text-rose-400' : 'text-amber-400'
                    }`}
                  >
                    <option value="CRITICAL_EMERGENCY">🚨 Critical Emergency (&lt; 2 hrs)</option>
                    <option value="URGENT">⚠️ Urgent (Within 4-6 hrs)</option>
                    <option value="NORMAL">📅 Scheduled / 24 hrs</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1.5">
                    Required Within
                  </label>
                  <select
                    value={formData.required_by_hours}
                    onChange={(e) => setFormData({ ...formData, required_by_hours: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 text-sm focus:ring-2 focus:ring-rose-500"
                  >
                    <option value="2">2 Hours (Immediate Transfusion)</option>
                    <option value="4">4 Hours (Standard ER Window)</option>
                    <option value="8">8 Hours (Surgical Reserve)</option>
                    <option value="24">24 Hours (Next Day Procedure)</option>
                  </select>
                </div>
              </div>

              {/* Requester Contact Details (No Login, for Verification) */}
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-rose-400" />
                  Your Contact Information (For Hospital Verification Only)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Your Full Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.requester_name}
                      onChange={(e) => setFormData({ ...formData, requester_name: e.target.value })}
                      placeholder="e.g. Priya Sharma"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 text-xs focus:ring-2 focus:ring-rose-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Contact Phone (10 digits) *</label>
                    <input
                      type="tel"
                      required
                      value={formData.requester_phone}
                      onChange={(e) => setFormData({ ...formData, requester_phone: e.target.value })}
                      placeholder="e.g. 9876543210"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 text-xs focus:ring-2 focus:ring-rose-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Relationship to Patient</label>
                    <select
                      value={formData.requester_relationship}
                      onChange={(e) => setFormData({ ...formData, requester_relationship: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 text-xs focus:ring-2 focus:ring-rose-500"
                    >
                      <option value="Relative/Family Member">Relative / Family Member</option>
                      <option value="Friend/Colleague">Friend / Colleague</option>
                      <option value="Attending Clinician/Nurse">Attending Clinician / Nurse</option>
                      <option value="Hospital Social Worker">Hospital Social Worker</option>
                      <option value="Good Samaritan Volunteer">Good Samaritan Volunteer</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Optional Clinical Reason */}
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Clinical Justification / Additional Notes (Optional)
                </label>
                <textarea
                  rows="2"
                  value={formData.clinical_justification}
                  onChange={(e) => setFormData({ ...formData, clinical_justification: e.target.value })}
                  placeholder="e.g. Severe postpartum hemorrhage / Dengue thrombocytopenia with active bleeding / Major road traffic accident..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 text-xs focus:ring-2 focus:ring-rose-500"
                ></textarea>
              </div>

              {/* Consent Checkbox */}
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-start gap-3">
                <input
                  type="checkbox"
                  id="consent"
                  required
                  checked={formData.consent_acknowledged}
                  onChange={(e) => setFormData({ ...formData, consent_acknowledged: e.target.checked })}
                  className="mt-1 rounded bg-slate-900 border-slate-700 text-rose-600 focus:ring-rose-500"
                />
                <label htmlFor="consent" className="text-xs text-slate-400 cursor-pointer">
                  I solemnly declare that this is an authentic medical emergency request for an active patient. I authorize BloodLink's triage coordinators and verified hospital staff to contact me via phone for coordination.
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-900/40 flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Dispatching to Regional Network...
                    </>
                  ) : (
                    <>
                      <ShieldAlert className="w-4 h-4" />
                      Submit Emergency Request Now
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
