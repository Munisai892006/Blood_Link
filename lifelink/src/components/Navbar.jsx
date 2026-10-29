import React, { useState } from 'react';
import { 
  Heart, Shield, AlertTriangle, Activity, Database, Users, 
  Search, Cpu, CheckCircle, Globe, HelpCircle, Bell, LogIn, LogOut, 
  UserCheck, Menu, X, ChevronDown, QrCode, RefreshCw
} from 'lucide-react';
import { translations } from '../i18n';

// Registered Member Roles for Directory & Verification References
export const USER_ROLES = [
  { id: 'DONOR', name: 'Vikram Sharma', email: 'donor@bloodlink.org', badge: 'Verified Donor (O-)' },
  { id: 'HOSPITAL_REQUESTER', name: 'Dr. Priya Varma', email: 'requester@aiims.org', badge: 'AIIMS ER Requester' },
  { id: 'HOSPITAL_ADMIN', name: 'Rajesh Nambiar', email: 'admin@aiims.org', badge: 'AIIMS Facility Admin' },
  { id: 'BLOOD_BANK_OPERATOR', name: 'Sunita Reddy', email: 'operator@redcross.org', badge: 'Red Cross Inventory Lead' },
  { id: 'VERIFICATION_REVIEWER', name: 'Dr. Ananya Sen', email: 'reviewer@bloodlink.org', badge: 'Clinical Verifier' },
  { id: 'EMERGENCY_COORDINATOR', name: 'Karthik Raman', email: 'coordinator@bloodlink.org', badge: 'Disaster Ops Lead' },
  { id: 'VOLUNTEER', name: 'Amit Patel', email: 'volunteer@bloodlink.org', badge: 'Logistics Captain' },
  { id: 'FRAUD_REVIEWER', name: 'Meera Iyer', email: 'fraud@bloodlink.org', badge: 'Integrity Analyst' },
  { id: 'SYSTEM_ADMIN', name: 'Platform Administrator', email: 'sysadmin@bloodlink.org', badge: 'SuperAdmin' }
];

export default function Navbar({ 
  currentUser,
  currentRole,
  language, 
  onLanguageChange, 
  activeTab, 
  onTabChange,
  onOpenAssistant,
  onOpenNotifications,
  onOpenLogin,
  onOpenQRScanner,
  onLogout,
  unreadNotificationsCount = 0
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const t = translations[language] || translations.en;

  const roleId = currentUser?.role || currentRole?.id || null;
  const isAuthenticated = !!currentUser && roleId !== 'PUBLIC_VISITOR';

  // Role-gated operational navigation items (Section 1 of User Prompt)
  const navItems = [
    { id: 'donor', label: t.nav_donor || 'Donor Hub', icon: Users, allowedRoles: ['DONOR', 'SYSTEM_ADMIN'] },
    { id: 'hospital', label: t.nav_hospital || 'Hospital ER Triage', icon: Activity, allowedRoles: ['HOSPITAL_REQUESTER', 'HOSPITAL_ADMIN', 'EMERGENCY_COORDINATOR', 'SYSTEM_ADMIN'] },
    { id: 'matching', label: t.nav_matching || 'Donor Matching', icon: Search, allowedRoles: ['HOSPITAL_REQUESTER', 'HOSPITAL_ADMIN', 'EMERGENCY_COORDINATOR', 'SYSTEM_ADMIN'] },
    { id: 'inventory', label: t.nav_inventory || 'Inventory & Transfers', icon: Database, allowedRoles: ['BLOOD_BANK_OPERATOR', 'HOSPITAL_ADMIN', 'EMERGENCY_COORDINATOR', 'SYSTEM_ADMIN'] },
    { id: 'ops', label: t.nav_ops || 'Mission Control', icon: Activity, allowedRoles: ['EMERGENCY_COORDINATOR', 'SYSTEM_ADMIN'] },
    { id: 'incidents', label: t.nav_incidents || 'Logistics & Incidents', icon: AlertTriangle, allowedRoles: ['EMERGENCY_COORDINATOR', 'VOLUNTEER', 'SYSTEM_ADMIN'] },
    { id: 'review', label: t.nav_review || 'Clinical Verification', icon: Shield, allowedRoles: ['VERIFICATION_REVIEWER', 'FRAUD_REVIEWER', 'SYSTEM_ADMIN'] },
    { id: 'simulation', label: t.nav_sim || 'Digital Twin Sim', icon: Cpu, allowedRoles: ['EMERGENCY_COORDINATOR', 'SYSTEM_ADMIN'] },
    { id: 'public', label: 'Public Services', icon: Heart, allowedRoles: ['*'] }
  ];

  const visibleNavItems = isAuthenticated
    ? navItems.filter(item => item.allowedRoles.includes('*') || item.allowedRoles.includes(roleId))
    : [];

  const handleTabClick = (tabId) => {
    onTabChange(tabId);
    setMobileMenuOpen(false);
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
      {/* Top Banner: Emergency helpline & Language switch */}
      <div className="bg-slate-900 text-white text-xs px-4 py-1.5 flex flex-wrap items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="font-medium text-slate-200">{t.emergency_hotline}</span>
          <span className="text-slate-400">|</span>
          <span className="text-slate-300">Hyderabad Emergency Triage Grid</span>
        </div>

        <div className="flex items-center space-x-4 mt-1 sm:mt-0">
          <div className="flex items-center space-x-1.5 bg-slate-800 px-2.5 py-0.5 rounded border border-slate-700">
            <Globe className="w-3.5 h-3.5 text-slate-300" />
            <select
              value={language}
              onChange={(e) => onLanguageChange(e.target.value)}
              className="bg-transparent text-white text-xs font-medium focus:outline-none cursor-pointer"
            >
              <option value="en" className="bg-slate-900 text-white">English (EN)</option>
              <option value="te" className="bg-slate-900 text-white">తెలుగు (TE)</option>
              <option value="hi" className="bg-slate-900 text-white">हिन्दी (HI)</option>
            </select>
          </div>

          <button
            onClick={onOpenAssistant}
            className="flex items-center space-x-1 text-slate-200 hover:text-white bg-blood-700 hover:bg-blood-600 px-2.5 py-0.5 rounded text-xs transition font-semibold"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>AI Assistant</span>
          </button>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo & Brand (clicking takes to public portal if unauthenticated, or main dashboard if logged in) */}
          <div 
            className="flex items-center space-x-3 cursor-pointer" 
            onClick={() => handleTabClick(isAuthenticated ? (visibleNavItems[0]?.id || 'public') : 'login')}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blood-700 to-rose-500 flex items-center justify-center shadow-md shadow-rose-200 text-white">
              <Heart className="w-6 h-6 fill-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-black text-xl tracking-tight text-slate-900">BLOOD<span className="text-blood-600">LINK</span></span>
                <span className="bg-blood-100 text-blood-800 text-[10px] font-extrabold px-1.5 py-0.5 rounded">3.0</span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">Emergency Blood Donor & Clinical Resilience Grid</p>
            </div>
          </div>

          {/* Right Header Navigation & Actions */}
          <div className="flex items-center space-x-2.5">
            {/* Unauthenticated View: Public Services Link & Sign In Button */}
            {!isAuthenticated && (
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => handleTabClick('public')}
                  className="text-xs font-semibold text-slate-700 hover:text-blood-700 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition hidden sm:flex items-center space-x-1"
                >
                  <Heart className="w-3.5 h-3.5 text-blood-600" />
                  <span>Public Services</span>
                </button>

                <button
                  onClick={onOpenLogin}
                  className="bg-blood-600 hover:bg-blood-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition shadow-md shadow-rose-200 flex items-center space-x-1.5"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Sign In / Register</span>
                </button>
              </div>
            )}

            {/* Authenticated View: QR Scanner, Notification Bell & Account Profile Pill */}
            {isAuthenticated && (
              <>
                {/* QR Scanner Trigger */}
                <button
                  onClick={onOpenQRScanner}
                  className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-rose-50 hover:text-blood-700 rounded-xl transition border border-slate-200 hover:border-rose-200"
                  title="Open Digital ID & QR Scanner"
                >
                  <QrCode className="w-4 h-4 text-blood-600" />
                  <span className="hidden md:inline">Scan QR</span>
                </button>

                <button
                  onClick={onOpenNotifications}
                  className="relative p-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                  title="Open Notifications & Alerts"
                >
                  <Bell className="w-4 h-4" />
                  {unreadNotificationsCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-600 text-white text-[9px] font-black rounded-full flex items-center justify-center animate-pulse shadow-sm">
                      {unreadNotificationsCount}
                    </span>
                  )}
                </button>

                {/* Authenticated User Profile Pill */}
                <div className="flex items-center space-x-2 bg-slate-100 pl-3 pr-1.5 py-1.5 rounded-2xl border border-slate-200">
                  <div className="text-left hidden sm:block pr-1">
                    <div className="text-xs font-bold text-slate-900 leading-tight truncate max-w-[140px]">
                      {currentUser?.full_name || 'Member'}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono flex items-center space-x-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                      <span>{roleId.replace(/_/g, ' ')}</span>
                    </div>
                  </div>

                  {/* Switch Account Action */}
                  <button
                    onClick={onOpenLogin}
                    className="p-1.5 text-slate-500 hover:text-blood-700 hover:bg-white rounded-xl transition shadow-2xs border border-transparent hover:border-slate-200"
                    title="Switch Role or Sign In as Different Member"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={onLogout}
                    className="p-1.5 text-slate-500 hover:text-rose-700 hover:bg-white rounded-xl transition shadow-2xs border border-transparent hover:border-slate-200"
                    title="Sign Out of Session"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>

                {/* Mobile Menu Toggle Button */}
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="lg:hidden p-2 text-slate-600 hover:text-slate-900 bg-slate-100 rounded-xl"
                >
                  {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Authenticated Tab Navigation Bar (Desktop) */}
        {isAuthenticated && visibleNavItems.length > 0 && (
          <nav className="hidden lg:flex space-x-1 overflow-x-auto pb-2 scrollbar-none border-t border-slate-100 pt-2">
            {visibleNavItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabClick(item.id)}
                  className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                    isActive
                      ? 'bg-blood-50 text-blood-700 font-bold border border-blood-200 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-blood-600' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        )}

        {/* Mobile Navigation Drawer */}
        {isAuthenticated && mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-200 py-3 space-y-1">
            <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Navigation — {roleId.replace(/_/g, ' ')}
            </div>
            {visibleNavItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabClick(item.id)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-medium transition ${
                    isActive
                      ? 'bg-blood-50 text-blood-800 font-bold'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-4 h-4 text-blood-600" />
                  <span>{item.label}</span>
                </button>
              );
            })}
            <div className="pt-2 border-t border-slate-100">
              <button
                onClick={() => { setMobileMenuOpen(false); onLogout(); }}
                className="w-full flex items-center space-x-3 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out ({currentUser?.full_name || 'Member'})</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
