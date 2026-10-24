import React, { useState, useEffect } from 'react';
import { 
  Heart, Shield, Activity, Users, Database, AlertTriangle, 
  UserCheck, Lock, Mail, Eye, EyeOff, ArrowRight, CheckCircle, 
  KeyRound, RefreshCw, Sparkles, Building, Phone, MapPin
} from 'lucide-react';
import { USER_ROLES } from '../components/Navbar';
import { ClinicalDisclaimerBanner } from '../components/Disclaimers';

export default function LoginLandingPortal({ 
  onLoginSuccess, 
  onExplorePublic, 
  initialRoleSlug, 
  initialTab = 'directory' 
}) {
  const [activeTab, setActiveTab] = useState(initialTab); // 'directory' | 'credentials' | 'register' | 'forgot'
  const [selectedRole, setSelectedRole] = useState(() => {
    if (initialRoleSlug) {
      const match = USER_ROLES.find(r => r.id.toLowerCase().includes(initialRoleSlug.toLowerCase()));
      if (match) return match;
    }
    return USER_ROLES[1]; // Verified Donor default
  });

  // Credentials State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Register State
  const [regRole, setRegRole] = useState('DONOR');
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regBloodGroup, setRegBloodGroup] = useState('O-');
  const [regLocality, setRegLocality] = useState('Banjara Hills, Hyderabad');
  const [regOrgName, setRegOrgName] = useState('Care Emergency Hospital');
  const [regOrgType, setRegOrgType] = useState('HOSPITAL');
  const [regConsentAlerts, setRegConsentAlerts] = useState(true);

  // Forgot Password State
  const [forgotEmail, setForgotEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [forgotStep, setForgotStep] = useState(1);

  // Update when initialRoleSlug changes
  useEffect(() => {
    if (initialRoleSlug) {
      const match = USER_ROLES.find(r => r.id.toLowerCase().includes(initialRoleSlug.toLowerCase()));
      if (match) {
        setSelectedRole(match);
        setEmail(match.email);
        setPassword('Password@123');
      }
    }
  }, [initialRoleSlug]);

  const handleSelectRoleForCredentials = (role) => {
    if (role.id === 'PUBLIC_VISITOR') {
      onExplorePublic();
      return;
    }
    setSelectedRole(role);
    setEmail(role.email);
    setPassword('Password@123');
    setActiveTab('credentials');
    setErrorMessage('');
    setSuccessMessage('');
  };

  const handleFastLogin = async (role) => {
    if (role.id === 'PUBLIC_VISITOR') {
      onExplorePublic();
      return;
    }

    setLoading(true);
    setErrorMessage('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: role.email, password: 'Password@123' })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Authentication failed');

      if (rememberMe) {
        localStorage.setItem('bloodlink_auth_token', data.token);
        localStorage.setItem('bloodlink_user', JSON.stringify(data.user));
      }

      onLoginSuccess(data.user, data.token, data.user.role);
    } catch (err) {
      setErrorMessage(err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleCredentialLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Invalid email or password');

      if (rememberMe) {
        localStorage.setItem('bloodlink_auth_token', data.token);
        localStorage.setItem('bloodlink_user', JSON.stringify(data.user));
      }

      setSuccessMessage(`Welcome back, ${data.user.full_name}! Redirecting...`);
      setTimeout(() => {
        onLoginSuccess(data.user, data.token, data.user.role);
      }, 300);
    } catch (err) {
      setErrorMessage(err.message || 'Sign in failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (regPassword !== regConfirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }
    if (regPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const payload = {
        email: regEmail,
        password: regPassword,
        full_name: regFullName,
        role: regRole,
        phone: regPhone,
        blood_group: regRole === 'DONOR' ? regBloodGroup : undefined,
        address_locality: regLocality,
        consent_emergency_alerts: regConsentAlerts ? 1 : 0,
        organization_name: regRole === 'HOSPITAL_REQUESTER' ? regOrgName : undefined,
        organization_type: regRole === 'HOSPITAL_REQUESTER' ? regOrgType : undefined
      };

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Registration failed');

      localStorage.setItem('bloodlink_auth_token', data.token);
      localStorage.setItem('bloodlink_user', JSON.stringify(data.user));

      setSuccessMessage('Registration successful! Launching your verified dashboard...');
      setTimeout(() => {
        onLoginSuccess(data.user, data.token, data.user.role);
      }, 500);
    } catch (err) {
      setErrorMessage(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to request reset OTP');

      setForgotStep(2);
      if (data.otp_code) {
        setOtpCode(data.otp_code);
        setSuccessMessage(`Recovery OTP sent to ${forgotEmail} (Demonstration Code: ${data.otp_code})`);
      } else {
        setSuccessMessage(`Recovery code dispatched to ${forgotEmail}. Please check your inbox.`);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Password reset request failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmNewPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }
    setLoading(true);
    setErrorMessage('');
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail, otp_code: otpCode, new_password: newPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Password reset failed');

      setSuccessMessage('Password reset successfully! You may now sign in.');
      setActiveTab('credentials');
      setEmail(forgotEmail);
      setPassword(newPassword);
      setForgotStep(1);
    } catch (err) {
      setErrorMessage(err.message || 'Reset failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-200">
      <ClinicalDisclaimerBanner />

      {/* Main Portal Hero */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-blood-950 text-white rounded-3xl p-8 sm:p-12 shadow-2xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-rose-500/15 to-transparent pointer-events-none"></div>

        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center space-x-2 bg-blood-800/80 border border-blood-500/40 px-3 py-1 rounded-full text-xs font-semibold text-rose-200">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Telangana Regional Emergency Health Network • Secure Gateway</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
            BLOOD<span className="text-rose-500">LINK</span> 3.0 Portal
          </h1>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-2xl">
            Coordinating verified donor outreach, emergency hospital blood requests, cold-chain transport, and auditable transfusion tracking across Telangana. Please select your accredited role or sign in.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3 text-xs">
            <button
              onClick={() => setActiveTab('directory')}
              className={`px-4 py-2 rounded-xl font-bold transition flex items-center space-x-1.5 ${
                activeTab === 'directory' ? 'bg-white text-slate-900 shadow-md' : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              <Users className="w-4 h-4 text-blood-500" />
              <span>10-Role Directory</span>
            </button>

            <button
              onClick={() => setActiveTab('credentials')}
              className={`px-4 py-2 rounded-xl font-bold transition flex items-center space-x-1.5 ${
                activeTab === 'credentials' ? 'bg-white text-slate-900 shadow-md' : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              <Lock className="w-4 h-4 text-rose-400" />
              <span>Password Sign In</span>
            </button>

            <button
              onClick={() => setActiveTab('register')}
              className={`px-4 py-2 rounded-xl font-bold transition flex items-center space-x-1.5 ${
                activeTab === 'register' ? 'bg-white text-slate-900 shadow-md' : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              <UserCheck className="w-4 h-4 text-emerald-400" />
              <span>Register New Member</span>
            </button>

            <button
              onClick={onExplorePublic}
              className="px-4 py-2 rounded-xl font-bold text-rose-300 hover:text-white bg-blood-900/60 hover:bg-blood-900 border border-blood-700/60 transition flex items-center space-x-1.5"
            >
              <span>Explore Public Portal</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-semibold animate-in fade-in">
          ⚠️ {errorMessage}
        </div>
      )}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs font-semibold animate-in fade-in">
          ✓ {successMessage}
        </div>
      )}

      {/* TAB 1: Role Entry Directory */}
      {activeTab === 'directory' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Choose Your Operational Portal</h2>
              <p className="text-xs text-slate-500">
                Select your designated healthcare responsibility for fast access or customized authentication.
              </p>
            </div>
            <span className="text-[11px] font-mono font-bold bg-slate-200 text-slate-800 px-2.5 py-1 rounded-full self-start sm:self-auto">
              10 RBAC Classes Active
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {USER_ROLES.map((role) => {
              const isPub = role.id === 'PUBLIC_VISITOR';
              return (
                <div
                  key={role.id}
                  className="p-5 bg-white rounded-3xl border border-slate-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 group"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        {role.badge}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">
                        {role.id.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <h3 className="text-sm font-black text-slate-900 group-hover:text-blood-700 transition">
                      {role.name}
                    </h3>
                    <p className="text-xs text-slate-500 font-mono text-[11px]">
                      {role.email}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                    <button
                      onClick={() => handleFastLogin(role)}
                      disabled={loading}
                      className="flex-1 py-2 bg-blood-600 hover:bg-blood-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center justify-center space-x-1"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-rose-200" />
                      <span>{isPub ? 'Explore Public' : '1-Click Access'}</span>
                    </button>

                    {!isPub && (
                      <button
                        onClick={() => handleSelectRoleForCredentials(role)}
                        className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs transition"
                        title="Sign in with custom password"
                      >
                        <Lock className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: Credential Sign In Form */}
      {activeTab === 'credentials' && (
        <div className="max-w-md mx-auto bg-white p-8 rounded-3xl border border-slate-200 shadow-xl space-y-6">
          <div className="text-center space-y-1 border-b border-slate-100 pb-4">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-blood-100 text-blood-700 flex items-center justify-center shadow-xs">
              <Lock className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-black text-slate-900 mt-2">Member Sign In</h2>
            <p className="text-xs text-slate-500">
              Sign in with your verified BloodLink network credentials
            </p>
          </div>

          <form onSubmit={handleCredentialLogin} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Email or Username</label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. donor@bloodlink.org"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 pl-9 text-slate-900 focus:ring-2 focus:ring-blood-500"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-slate-700">Password</label>
                <button
                  type="button"
                  onClick={() => setActiveTab('forgot')}
                  className="text-blood-700 hover:underline text-[11px]"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your account password"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 pl-9 pr-9 text-slate-900 focus:ring-2 focus:ring-blood-500"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-slate-400 hover:text-slate-600 absolute right-3 top-3"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-slate-600">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded text-blood-600 focus:ring-blood-500"
                />
                <span>Remember this workstation</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blood-600 hover:bg-blood-700 text-white rounded-xl font-bold transition shadow-md shadow-rose-200 flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {loading ? (
                <span>Authenticating Session...</span>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>Sign In to BloodLink</span>
                </>
              )}
            </button>

            <div className="pt-2 text-center text-slate-500 text-[11px] space-y-2">
              <p>
                Don't have an accredited account?{' '}
                <button
                  type="button"
                  onClick={() => setActiveTab('register')}
                  className="text-blood-700 font-bold hover:underline"
                >
                  Register here
                </button>
              </p>
              <p>
                or{' '}
                <button
                  type="button"
                  onClick={() => setActiveTab('directory')}
                  className="text-slate-700 font-medium hover:underline"
                >
                  switch to 1-Click Fast Directory
                </button>
              </p>
            </div>
          </form>
        </div>
      )}

      {/* TAB 3: Multi-Role Registration Form */}
      {activeTab === 'register' && (
        <div className="max-w-xl mx-auto bg-white p-8 rounded-3xl border border-slate-200 shadow-xl space-y-6">
          <div className="text-center space-y-1 border-b border-slate-100 pb-4">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-xs">
              <UserCheck className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-black text-slate-900 mt-2">New Member Onboarding</h2>
            <p className="text-xs text-slate-500">
              Join the Telangana emergency blood coordination network
            </p>
          </div>

          <form onSubmit={handleRegister} className="space-y-4 text-xs">
            {/* Role Selection */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Account Category</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'DONOR', label: 'Verified Donor' },
                  { id: 'HOSPITAL_REQUESTER', label: 'Hospital ER Staff' },
                  { id: 'VOLUNTEER', label: 'Logistics Volunteer' }
                ].map(r => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setRegRole(r.id)}
                    className={`py-2 px-3 rounded-xl border text-center font-bold transition ${
                      regRole === r.id
                        ? 'bg-blood-50 border-blood-500 text-blood-700 shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Legal Name</label>
                <input
                  type="text"
                  required
                  value={regFullName}
                  onChange={(e) => setRegFullName(e.target.value)}
                  placeholder="e.g. Dr. Ramesh Kumar"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Official Email Address</label>
                <input
                  type="email"
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="name@organization.org"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mobile Contact Phone</label>
                <input
                  type="tel"
                  required
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  placeholder="+91-9876543210"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Locality / City Zone</label>
                <input
                  type="text"
                  required
                  value={regLocality}
                  onChange={(e) => setRegLocality(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900"
                />
              </div>
            </div>

            {/* Role specific extras */}
            {regRole === 'DONOR' && (
              <div className="p-3.5 bg-rose-50/60 rounded-2xl border border-rose-200 space-y-2">
                <label className="block font-bold text-blood-900">Declared Blood Group</label>
                <select
                  value={regBloodGroup}
                  onChange={(e) => setRegBloodGroup(e.target.value)}
                  className="w-full bg-white border border-rose-300 rounded-xl px-3 py-2 font-bold text-blood-800"
                >
                  <option value="O-">O- (Universal Red Blood Cell Donor)</option>
                  <option value="O+">O+</option>
                  <option value="A-">A-</option>
                  <option value="A+">A+</option>
                  <option value="B-">B-</option>
                  <option value="B+">B+</option>
                  <option value="AB-">AB-</option>
                  <option value="AB+">AB+</option>
                </select>
                <p className="text-[10px] text-slate-500">
                  Self-declared status is initialized. Official lab confirmation will be verified during initial clinical donation.
                </p>
              </div>
            )}

            {regRole === 'HOSPITAL_REQUESTER' && (
              <div className="p-3.5 bg-blue-50/60 rounded-2xl border border-blue-200 space-y-2">
                <label className="block font-bold text-blue-900">Healthcare Facility Affiliation</label>
                <input
                  type="text"
                  required
                  value={regOrgName}
                  onChange={(e) => setRegOrgName(e.target.value)}
                  placeholder="e.g. Care Emergency Trauma Center"
                  className="w-full bg-white border border-blue-300 rounded-xl px-3 py-2 text-slate-900"
                />
                <p className="text-[10px] text-blue-700">
                  New facility affiliations will be held in PENDING state until verified by a clinical reviewer.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Create Password</label>
                <input
                  type="password"
                  required
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Confirm Password</label>
                <input
                  type="password"
                  required
                  value={regConfirmPassword}
                  onChange={(e) => setRegConfirmPassword(e.target.value)}
                  placeholder="Repeat password"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900"
                />
              </div>
            </div>

            <label className="flex items-start space-x-2 pt-2 cursor-pointer">
              <input
                type="checkbox"
                checked={regConsentAlerts}
                onChange={(e) => setRegConsentAlerts(e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded text-blood-600 focus:ring-blood-500"
              />
              <span className="text-[11px] text-slate-600 leading-snug">
                I consent to receive automated emergency triage outreach and agree to the BloodLink medical safety terms and privacy policy.
              </span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blood-600 hover:bg-blood-700 text-white rounded-xl font-bold transition shadow-md shadow-rose-200 flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {loading ? (
                <span>Registering Account...</span>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Complete Registration</span>
                </>
              )}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setActiveTab('credentials')}
                className="text-blood-700 font-bold text-xs hover:underline"
              >
                Already have an account? Sign In
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 4: Password Recovery / Reset */}
      {activeTab === 'forgot' && (
        <div className="max-w-md mx-auto bg-white p-8 rounded-3xl border border-slate-200 shadow-xl space-y-6">
          <div className="text-center space-y-1 border-b border-slate-100 pb-4">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shadow-xs">
              <KeyRound className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-black text-slate-900 mt-2">Password Recovery</h2>
            <p className="text-xs text-slate-500">
              {forgotStep === 1 ? 'Enter your registered email to receive a recovery code' : 'Enter the 6-digit verification code and set a new password'}
            </p>
          </div>

          {forgotStep === 1 ? (
            <form onSubmit={handleSendOtp} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Registered Account Email</label>
                <input
                  type="email"
                  required
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="e.g. donor@bloodlink.org"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-slate-900"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition shadow-xs"
              >
                {loading ? 'Sending Recovery Code...' : 'Send Recovery Code'}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('credentials')}
                  className="text-slate-500 hover:text-slate-800 text-xs font-medium"
                >
                  Return to Sign In
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">6-Digit Recovery Code</label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="e.g. 123456"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-center font-mono font-bold text-lg tracking-widest text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">New Password</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  required
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-blood-600 hover:bg-blood-700 text-white rounded-xl font-bold transition shadow-xs"
              >
                {loading ? 'Updating Password...' : 'Set New Password & Sign In'}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
