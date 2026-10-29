import React, { useState } from 'react';
import { 
  X, Lock, Mail, Shield, User, Heart, Activity, Database, 
  Search, Cpu, CheckCircle, AlertCircle, ArrowRight, LogIn, KeyRound, 
  RefreshCw, Check, Eye, EyeOff, UserPlus, Building2, Phone, MapPin
} from 'lucide-react';

export const ALL_MEMBERS = [
  {
    roleId: 'DONOR',
    name: 'Vikram Sharma',
    title: 'Verified Blood Donor (O- Universal)',
    org: 'Community Hero Network',
    email: 'donor@bloodlink.org',
    password: 'Password@123',
    badge: 'Donor Portal',
    icon: Heart,
    color: 'from-rose-500 to-blood-700',
    description: 'Manages personal donation availability, quiet hours, digital ID card, and DPDP privacy export.'
  },
  {
    roleId: 'HOSPITAL_REQUESTER',
    name: 'Dr. Priya Varma',
    title: 'Senior ER Triage Physician',
    org: 'AIIMS Apex Emergency Trauma',
    email: 'requester@aiims.org',
    password: 'Password@123',
    badge: 'Hospital Portal',
    icon: Activity,
    color: 'from-red-600 to-rose-700',
    description: 'Submits emergency blood requests, initiates Code Red fast-track, and logs transfusions.'
  },
  {
    roleId: 'HOSPITAL_ADMIN',
    name: 'Rajesh K. Nambiar',
    title: 'Hospital Facility Director',
    org: 'AIIMS Apex Emergency Trauma',
    email: 'admin@aiims.org',
    password: 'Password@123',
    badge: 'Hospital Admin',
    icon: Activity,
    color: 'from-blue-600 to-indigo-700',
    description: 'Oversees hospital request quotas, clinical department staff, and multi-tenant isolation.'
  },
  {
    roleId: 'BLOOD_BANK_OPERATOR',
    name: 'Sunita Reddy',
    title: 'Chief Blood Bank Officer',
    org: 'Red Cross Regional Blood Bank',
    email: 'operator@redcross.org',
    password: 'Password@123',
    badge: 'Inventory Hub',
    icon: Database,
    color: 'from-emerald-600 to-teal-700',
    description: 'Manages blood batches, intake, QA viral markers release, and inter-facility transfers.'
  },
  {
    roleId: 'VERIFICATION_REVIEWER',
    name: 'Dr. Ananya Sen',
    title: 'Clinical Verification Lead',
    org: 'Medical Governance Board',
    email: 'reviewer@bloodlink.org',
    password: 'Password@123',
    badge: 'Review Portal',
    icon: Shield,
    color: 'from-purple-600 to-violet-700',
    description: 'Reviews pending emergency requests, checks hospital credentials, and authorizes matching.'
  },
  {
    roleId: 'EMERGENCY_COORDINATOR',
    name: 'Karthik Raman',
    title: 'Regional Disaster Ops Lead',
    org: 'State Disaster Response Force',
    email: 'coordinator@bloodlink.org',
    password: 'Password@123',
    badge: 'Mission Control',
    icon: Search,
    color: 'from-amber-500 to-orange-600',
    description: 'Coordinates mass casualty incidents, monitors demand forecasts, and directs green corridors.'
  },
  {
    roleId: 'VOLUNTEER',
    name: 'Amit Patel',
    title: 'Civilian Logistics Captain',
    org: 'Volunteer Rapid Response Unit',
    email: 'volunteer@bloodlink.org',
    password: 'Password@123',
    badge: 'Logistics Tasks',
    icon: User,
    color: 'from-teal-500 to-cyan-600',
    description: 'Executes non-clinical community transport, donor escort, and logistics task checkpoints.'
  },
  {
    roleId: 'FRAUD_REVIEWER',
    name: 'Meera Iyer',
    title: 'Compliance & Integrity Analyst',
    org: 'Audit & Anti-Fraud Unit',
    email: 'fraud@bloodlink.org',
    password: 'Password@123',
    badge: 'Security Audit',
    icon: AlertCircle,
    color: 'from-slate-600 to-zinc-800',
    description: 'Audits algorithmic duplicate admissions, velocity flags, and confirms policy compliance.'
  },
  {
    roleId: 'SYSTEM_ADMIN',
    name: 'System Administrator',
    title: 'Infrastructure & Security Admin',
    org: 'BloodLink Platform Operations',
    email: 'sysadmin@bloodlink.org',
    password: 'Password@123',
    badge: 'SuperAdmin',
    icon: Cpu,
    color: 'from-slate-800 to-black',
    description: 'Manages platform roles, security parameters, system configurations, and master audit trails.'
  },
  {
    roleId: 'PUBLIC_VISITOR',
    name: 'General Public Citizen',
    title: 'Community Observer',
    org: 'Public Community Zone',
    email: 'visitor@bloodlink.org',
    password: 'Password@123',
    badge: 'Public View',
    icon: Heart,
    color: 'from-slate-500 to-slate-700',
    description: 'Views public blood availability ticker, non-sensitive stats, and emergency hotlines.'
  }
];

export default function LoginModal({ isOpen, onClose, onLoginSuccess, initialTab = 'directory' }) {
  const [activeTab, setActiveTab] = useState(initialTab); // 'directory' | 'credentials' | 'register' | 'reset'
  
  // Credentials Login Form State
  const [email, setEmail] = useState(() => localStorage.getItem('bloodlink_remember_email') || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => !!localStorage.getItem('bloodlink_remember_email'));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Registration Form State (Phase 2.B)
  const [regRole, setRegRole] = useState('DONOR'); // 'DONOR' | 'HOSPITAL_REQUESTER' | 'BLOOD_BANK_OPERATOR' | 'VOLUNTEER'
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  
  // Donor specific registration fields
  const [regBloodGroup, setRegBloodGroup] = useState('O+');
  const [regLocality, setRegLocality] = useState('Hyderabad Central');
  const [regConsentAlerts, setRegConsentAlerts] = useState(true);

  // Organization registration fields (Hospital & Blood Bank)
  const [regOrgName, setRegOrgName] = useState('');
  const [regOrgLicense, setRegOrgLicense] = useState('');
  const [regOrgAddress, setRegOrgAddress] = useState('');

  // Volunteer registration fields
  const [regAvailability, setRegAvailability] = useState('Weekdays & Weekends');
  const [regTransport, setRegTransport] = useState('Two-Wheeler');

  // Password reset state (Phase 2.A & C)
  const [resetEmail, setResetEmail] = useState('');
  const [resetStep, setResetStep] = useState(1);
  const [resetToken, setResetToken] = useState('');
  const [simulatedOtp, setSimulatedOtp] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetSuccessMsg, setResetSuccessMsg] = useState(null);

  if (!isOpen) return null;

  const handleMemberQuickLogin = async (member) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: member.email, password: member.password })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Login failed');

      localStorage.setItem('bloodlink_auth_token', data.token);
      localStorage.setItem('bloodlink_user', JSON.stringify(data.user));

      onLoginSuccess(data.user, data.token, member.roleId);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCredentialsSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Invalid email or password.');

      localStorage.setItem('bloodlink_auth_token', data.token);
      localStorage.setItem('bloodlink_user', JSON.stringify(data.user));

      if (rememberMe) {
        localStorage.setItem('bloodlink_remember_email', email);
      } else {
        localStorage.removeItem('bloodlink_remember_email');
      }

      onLoginSuccess(data.user, data.token, data.user.role);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (regPassword !== regConfirmPassword) {
      setError('Passwords do not match. Please verify your password entry.');
      return;
    }

    if (regPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        role: regRole,
        full_name: regFullName,
        email: regEmail,
        phone: regPhone,
        password: regPassword,
        blood_group: regBloodGroup,
        address_locality: regLocality,
        consent_emergency_alerts: regConsentAlerts ? 1 : 0,
        organization_name: regOrgName || null,
        license_number: regOrgLicense || null,
        organization_address: regOrgAddress || null,
        availability: regAvailability,
        transport_mode: regTransport
      };

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Registration failed.');

      localStorage.setItem('bloodlink_auth_token', data.token);
      localStorage.setItem('bloodlink_user', JSON.stringify(data.user));

      onLoginSuccess(data.user, data.token, data.user.role);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setResetToken(data.reset_token);
      setSimulatedOtp(data.simulated_otp);
      setOtpInput(data.simulated_otp);
      setResetStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reset_token: resetToken,
          otp_code: otpInput,
          new_password: newPassword
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setResetSuccessMsg('Password updated successfully! You can now sign in with your new password.');
      setResetStep(1);
      setTimeout(() => {
        setActiveTab('credentials');
        setPassword(newPassword);
        setEmail(resetEmail);
      }, 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-200">
        
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50 rounded-t-3xl">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blood-700 to-rose-600 text-white flex items-center justify-center shadow-md shadow-rose-200">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">BloodLink 3.0 Member Authentication</h2>
              <p className="text-xs text-slate-500">Secure role-based authentication, member onboarding, and credential recovery.</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Controls */}
        <div className="flex border-b border-slate-200 px-6 pt-3 space-x-4 bg-white text-xs font-bold overflow-x-auto">
          <button
            onClick={() => { setActiveTab('directory'); setError(null); }}
            className={`pb-3 px-2 border-b-2 transition whitespace-nowrap ${
              activeTab === 'directory'
                ? 'border-blood-600 text-blood-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Select Member Account (10 Roles)
          </button>
          <button
            onClick={() => { setActiveTab('credentials'); setError(null); }}
            className={`pb-3 px-2 border-b-2 transition flex items-center space-x-1.5 whitespace-nowrap ${
              activeTab === 'credentials'
                ? 'border-blood-600 text-blood-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>
          <button
            onClick={() => { setActiveTab('register'); setError(null); }}
            className={`pb-3 px-2 border-b-2 transition flex items-center space-x-1.5 whitespace-nowrap ${
              activeTab === 'register'
                ? 'border-blood-600 text-blood-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Register Account</span>
          </button>
          <button
            onClick={() => { setActiveTab('reset'); setError(null); }}
            className={`pb-3 px-2 border-b-2 transition flex items-center space-x-1.5 whitespace-nowrap ${
              activeTab === 'reset'
                ? 'border-blood-600 text-blood-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Password Reset (OTP)</span>
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {resetSuccessMsg && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{resetSuccessMsg}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* TAB 1: Member Fast Directory */}
          {activeTab === 'directory' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {ALL_MEMBERS.map((m) => {
                const IconComponent = m.icon;
                return (
                  <div 
                    key={m.roleId}
                    className="p-4 rounded-2xl border border-slate-200 hover:border-blood-300 bg-slate-50/70 hover:bg-white hover:shadow-md transition-all flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2.5">
                          <div className={`w-8 h-8 rounded-lg bg-gradient-to-tr ${m.color} text-white flex items-center justify-center shadow-xs`}>
                            <IconComponent className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-black text-slate-900 text-xs">{m.name}</div>
                            <div className="text-[10px] text-slate-500 font-medium">{m.title}</div>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700">
                          {m.badge}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-600 leading-relaxed mb-3">
                        {m.description}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[10px] font-mono text-slate-400 truncate max-w-[170px]">
                        {m.email}
                      </span>
                      <button
                        onClick={() => handleMemberQuickLogin(m)}
                        disabled={loading}
                        className="px-3.5 py-1.5 bg-slate-900 group-hover:bg-blood-600 text-white text-xs font-bold rounded-xl transition flex items-center space-x-1 shadow-xs"
                      >
                        <span>Sign In</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 2: Credentials Sign In */}
          {activeTab === 'credentials' && (
            <div className="max-w-md mx-auto py-6">
              <form onSubmit={handleCredentialsSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="email"
                      required
                      placeholder="e.g. donor@bloodlink.org or requester@aiims.org"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blood-500"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-semibold text-slate-700">Account Password</label>
                    <button
                      type="button"
                      onClick={() => { setActiveTab('reset'); setResetEmail(email); }}
                      className="text-[11px] text-blood-700 hover:underline font-semibold"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="Enter password (default: Password@123)"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-9 pr-10 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blood-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded text-blood-600 focus:ring-blood-500"
                    />
                    <span className="text-slate-600 text-[11px]">Remember my email on this device</span>
                  </label>
                </div>

                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900">
                  <strong>Testing Tip:</strong> All pre-seeded accounts use default password <code>Password@123</code>.
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-blood-600 hover:bg-blood-700 text-white font-bold rounded-xl text-xs transition shadow-md shadow-rose-200 flex items-center justify-center space-x-1.5"
                >
                  <LogIn className="w-4 h-4" />
                  <span>{loading ? 'Authenticating...' : 'Sign In to Account'}</span>
                </button>

                <div className="text-center pt-2">
                  <span className="text-slate-500 text-[11px]">Don't have an account yet? </span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('register')}
                    className="text-[11px] text-blood-700 hover:underline font-bold"
                  >
                    Register new profile
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: Registration (Phase 2.B) */}
          {activeTab === 'register' && (
            <div className="max-w-xl mx-auto py-4">
              <form onSubmit={handleRegisterSubmit} className="space-y-4 text-xs">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Create a New BloodLink Account</h3>
                  <p className="text-slate-500 text-[11px]">Select your stakeholder profile to complete compliant registration.</p>
                </div>

                {/* Role Selector */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">Account Type</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setRegRole('DONOR')}
                      className={`p-2.5 rounded-xl border text-left flex items-center space-x-2 transition ${
                        regRole === 'DONOR'
                          ? 'border-blood-600 bg-rose-50/80 text-blood-900 font-bold'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <Heart className="w-4 h-4 text-blood-600 shrink-0" />
                      <div>
                        <div className="text-xs">Blood Donor</div>
                        <div className="text-[10px] text-slate-500 font-normal">Emergency matching</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRegRole('HOSPITAL_REQUESTER')}
                      className={`p-2.5 rounded-xl border text-left flex items-center space-x-2 transition ${
                        regRole === 'HOSPITAL_REQUESTER'
                          ? 'border-blood-600 bg-rose-50/80 text-blood-900 font-bold'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <Building2 className="w-4 h-4 text-indigo-600 shrink-0" />
                      <div>
                        <div className="text-xs">Hospital / Clinic</div>
                        <div className="text-[10px] text-slate-500 font-normal">ER requests</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRegRole('VOLUNTEER')}
                      className={`p-2.5 rounded-xl border text-left flex items-center space-x-2 transition ${
                        regRole === 'VOLUNTEER'
                          ? 'border-blood-600 bg-rose-50/80 text-blood-900 font-bold'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <User className="w-4 h-4 text-teal-600 shrink-0" />
                      <div>
                        <div className="text-xs">Volunteer</div>
                        <div className="text-[10px] text-slate-500 font-normal">Logistics aid</div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Common Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Full Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Dr. Rajesh Reddy or Sneha Rao"
                      value={regFullName}
                      onChange={(e) => setRegFullName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blood-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Contact Phone</label>
                    <input
                      type="tel"
                      required
                      placeholder="+91-9876543210"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blood-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email Address (Login Username)</label>
                  <input
                    type="email"
                    required
                    placeholder="name@domain.com"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blood-500"
                  />
                </div>

                {/* Donor Specific Fields */}
                {regRole === 'DONOR' && (
                  <div className="p-3.5 bg-rose-50/60 rounded-2xl border border-blood-200 space-y-3">
                    <span className="font-bold text-blood-900 text-xs flex items-center space-x-1.5">
                      <Heart className="w-3.5 h-3.5" />
                      <span>Donor Profile Credentials</span>
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">Blood Group</label>
                        <select
                          value={regBloodGroup}
                          onChange={(e) => setRegBloodGroup(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-800"
                        >
                          <option value="O+">O Positive (O+)</option>
                          <option value="O-">O Negative (O- Universal)</option>
                          <option value="A+">A Positive (A+)</option>
                          <option value="A-">A Negative (A-)</option>
                          <option value="B+">B Positive (B+)</option>
                          <option value="B-">B Negative (B-)</option>
                          <option value="AB+">AB Positive (AB+)</option>
                          <option value="AB-">AB Negative (AB-)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">Locality / City</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Jubilee Hills, Hyderabad"
                          value={regLocality}
                          onChange={(e) => setRegLocality(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl"
                        />
                      </div>
                    </div>

                    <label className="flex items-center space-x-2 pt-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={regConsentAlerts}
                        onChange={(e) => setRegConsentAlerts(e.target.checked)}
                        className="rounded text-blood-600 focus:ring-blood-500"
                      />
                      <span className="text-[11px] text-slate-700">
                        I consent to receive high-priority emergency blood outreach alerts per configured quiet hours.
                      </span>
                    </label>
                  </div>
                )}

                {/* Hospital / Clinic Specific Fields */}
                {regRole === 'HOSPITAL_REQUESTER' && (
                  <div className="p-3.5 bg-blue-50/60 rounded-2xl border border-blue-200 space-y-3">
                    <span className="font-bold text-blue-900 text-xs flex items-center space-x-1.5">
                      <Building2 className="w-3.5 h-3.5" />
                      <span>Facility & Clinical Credentials</span>
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">Healthcare Facility Name</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. City General Hospital"
                          value={regOrgName}
                          onChange={(e) => setRegOrgName(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">Clinical License #</label>
                        <input
                          type="text"
                          required
                          placeholder="MCI / State Board Reg #"
                          value={regOrgLicense}
                          onChange={(e) => setRegOrgLicense(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Facility Address & ER Corridor</label>
                      <input
                        type="text"
                        required
                        placeholder="Street, District, Pincode"
                        value={regOrgAddress}
                        onChange={(e) => setRegOrgAddress(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl"
                      />
                    </div>
                  </div>
                )}

                {/* Volunteer Specific Fields */}
                {regRole === 'VOLUNTEER' && (
                  <div className="p-3.5 bg-teal-50/60 rounded-2xl border border-teal-200 space-y-3">
                    <span className="font-bold text-teal-900 text-xs flex items-center space-x-1.5">
                      <User className="w-3.5 h-3.5" />
                      <span>Logistics & Availability Preferences</span>
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">Availability Window</label>
                        <select
                          value={regAvailability}
                          onChange={(e) => setRegAvailability(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-800"
                        >
                          <option value="Weekdays & Weekends">Flexible (Weekdays & Weekends)</option>
                          <option value="Weekends Only">Weekends Only</option>
                          <option value="Night Emergencies">Night Emergencies / On-call</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">Transport Mode</label>
                        <select
                          value={regTransport}
                          onChange={(e) => setRegTransport(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-800"
                        >
                          <option value="Two-Wheeler">Two-Wheeler (Rapid Courier)</option>
                          <option value="Four-Wheeler">Four-Wheeler (Safe Cold Box)</option>
                          <option value="Public Transit">Public Transit / Walking Escort</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Password Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Account Password</label>
                    <div className="relative">
                      <input
                        type={showRegPassword ? 'text' : 'password'}
                        required
                        minLength={8}
                        placeholder="At least 8 characters"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        className="w-full pl-3 pr-10 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blood-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegPassword(!showRegPassword)}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                      >
                        {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Confirm Password</label>
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      required
                      minLength={8}
                      placeholder="Re-enter password"
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blood-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-blood-600 hover:bg-blood-700 text-white font-bold rounded-xl text-xs transition shadow-md shadow-rose-200 flex items-center justify-center space-x-1.5"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{loading ? 'Creating Account & Enforcing Verification...' : 'Complete Registration'}</span>
                </button>

                <div className="text-center pt-1">
                  <span className="text-slate-500 text-[11px]">Already have an approved account? </span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('credentials')}
                    className="text-[11px] text-blood-700 hover:underline font-bold"
                  >
                    Sign In
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 4: Password Reset (FR-AUTH-003) */}
          {activeTab === 'reset' && (
            <div className="max-w-md mx-auto py-6">
              {resetStep === 1 ? (
                <form onSubmit={handleRequestOtp} className="space-y-4 text-xs">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm mb-1">Reset Your Account Password</h3>
                    <p className="text-slate-500 text-[11px]">
                      Enter your registered email address. A one-time verification OTP will be issued under FR-AUTH-003.
                    </p>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Registered Email</label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. donor@bloodlink.org"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition flex items-center justify-center space-x-1.5"
                  >
                    <span>{loading ? 'Generating Security OTP...' : 'Send Verification OTP'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('credentials')}
                      className="text-[11px] text-blood-700 hover:underline font-semibold"
                    >
                      Back to Sign In
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleExecuteReset} className="space-y-4 text-xs">
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-[11px] text-emerald-900">
                    <strong>OTP Dispatched!</strong> For local testing, your verification code is: <code className="bg-white px-2 py-0.5 rounded font-mono font-bold text-slate-900">{simulatedOtp}</code>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">6-Digit OTP Code</label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={otpInput}
                      onChange={(e) => setOtpInput(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-center tracking-widest font-black text-sm"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">New Secure Password</label>
                    <input
                      type="password"
                      required
                      minLength={8}
                      placeholder="At least 8 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setResetStep(1)}
                      className="px-4 py-2 border border-slate-300 rounded-xl text-slate-600 hover:bg-slate-50 font-semibold"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 py-2 bg-blood-600 hover:bg-blood-700 text-white font-bold rounded-xl text-xs transition shadow-xs"
                    >
                      {loading ? 'Updating Password...' : 'Confirm & Save Password'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-3xl text-center text-[11px] text-slate-500">
          Role-Based Access Control (RBAC) & Contact Verification enforced per BloodLink 3.0 SRS v1.0 specifications.
        </div>
      </div>
    </div>
  );
}
