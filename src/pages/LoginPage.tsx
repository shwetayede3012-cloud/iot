import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Mail, 
  User, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  AlertCircle, 
  Loader2, 
  CheckCircle2, 
  Home, 
  ChevronRight, 
  KeyRound, 
  UserPlus, 
  ShieldAlert 
} from 'lucide-react';
import { UserAccount, ViewTab } from '../types';
import { StorageService } from '../services/storageService';

interface LoginPageProps {
  onLoginSuccess: (user: UserAccount) => void;
  onNavigate: (tab: ViewTab) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, onNavigate }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  
  // Login form state
  const [email, setEmail] = useState('admin@iotsecurity.com');
  const [password, setPassword] = useState('AdminSecurityPass2026!');
  
  // Register form state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleQuickFill = (target: 'admin' | 'user') => {
    setErrorMsg('');
    setSuccessMsg('');
    setMode('login');
    if (target === 'admin') {
      setEmail(StorageService.FIXED_ADMIN_EMAIL);
      setPassword(StorageService.FIXED_ADMIN_DEFAULT_PASSWORD);
    } else {
      setEmail('user@iotsecurity.com');
      setPassword('UserSecurityPass2026!');
    }
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!email.trim() || !password.trim()) {
      setErrorMsg('Please enter both your email and password.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      const authResult = StorageService.authenticate(email, password);

      if (authResult.error || !authResult.user) {
        setErrorMsg(authResult.error || 'Authentication failed. Please verify your credentials.');
        return;
      }

      const user = authResult.user;
      StorageService.addNotification({
        title: user.role === 'ADMIN' ? 'Administrator Signed In' : 'User Signed In',
        message: `Session granted for ${user.email} (${user.role}).`,
        type: 'success'
      });

      onLoginSuccess(user);
    }, 450);
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!regName.trim() || !regEmail.trim() || !regPassword.trim()) {
      setErrorMsg('Please complete all registration fields.');
      return;
    }

    if (!regEmail.includes('@') || !regEmail.includes('.')) {
      setErrorMsg('Please provide a valid email address.');
      return;
    }

    if (regEmail.trim().toLowerCase() === StorageService.FIXED_ADMIN_EMAIL.toLowerCase()) {
      setErrorMsg('The administrator account is already fixed. You cannot register another admin account.');
      return;
    }

    if (regPassword.trim().length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      try {
        // Registers user strictly with role: 'USER'
        const newUser = StorageService.registerUser(regName, regEmail, regPassword);
        setSuccessMsg(`Account created successfully for ${newUser.name}! Logging in...`);

        StorageService.setActiveUser(newUser);

        setTimeout(() => {
          onLoginSuccess(newUser);
        }, 500);
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to register account.');
      }
    }, 450);
  };

  return (
    <div className="w-full min-h-screen bg-slate-100 flex flex-col font-sans selection:bg-[#00646e] selection:text-white">
      
      {/* Breadcrumb Header Bar */}
      <div className="w-full bg-[#000028] border-b border-white/10 py-2.5 px-4 sm:px-6 lg:px-8 text-xs text-slate-300">
        <div className="max-w-7xl mx-auto flex items-center gap-2 font-medium">
          <button 
            onClick={() => onNavigate('landing')}
            className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Home</span>
          </button>
          <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
          <button 
            onClick={() => onNavigate('landing')}
            className="hover:text-white transition-colors cursor-pointer"
          >
            SecureIoT AI Platform
          </button>
          <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-white font-semibold">
            {mode === 'login' ? 'Account Sign In' : 'New User Registration'}
          </span>
        </div>
      </div>

      {/* Main Authentication Container */}
      <div className="flex-1 flex items-center justify-center px-4 py-10 sm:py-14">
        <div className="w-full max-w-lg">

          {/* Simple Clean Card */}
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            
            {/* Top Brand Banner */}
            <div className="bg-[#000028] text-white p-6 sm:p-7 border-b border-slate-800 relative">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#00646e] to-[#00e5ff] flex items-center justify-center text-white shadow-[0_0_15px_rgba(0,229,255,0.4)] shrink-0">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                      SecureIoT<span className="text-[#00e5ff]">AI</span>
                    </h1>
                    <p className="text-xs text-slate-300">
                      Adaptive Access Control &bull; Authentication Portal
                    </p>
                  </div>
                </div>

                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800/80 text-[10px] font-mono font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  ZERO-TRUST
                </span>
              </div>

              {/* Simple Mode Switcher (Sign In vs Register) */}
              <div className="mt-6 grid grid-cols-2 gap-2 p-1 rounded-2xl bg-white/10 border border-white/15">
                <button
                  type="button"
                  onClick={() => { setMode('login'); setErrorMsg(''); setSuccessMsg(''); }}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    mode === 'login'
                      ? 'bg-[#00646e] text-white shadow-md border border-[#00e5ff]/40'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <KeyRound className="w-3.5 h-3.5 text-[#00e5ff]" />
                  <span>Sign In</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setMode('register'); setErrorMsg(''); setSuccessMsg(''); }}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    mode === 'register'
                      ? 'bg-[#00646e] text-white shadow-md border border-[#00e5ff]/40'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5 text-[#00e5ff]" />
                  <span>Register User</span>
                </button>
              </div>
            </div>

            {/* Form Body */}
            <div className="p-6 sm:p-8">
              
              {/* Error Message */}
              {errorMsg && (
                <div className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2.5 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span className="font-medium">{errorMsg}</span>
                </div>
              )}

              {/* Success Message */}
              {successMsg && (
                <div className="mb-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2.5 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-medium">{successMsg}</span>
                </div>
              )}

              {/* -------------------- SIGN IN FORM -------------------- */}
              {mode === 'login' ? (
                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="admin@iotsecurity.com or user@iotsecurity.com"
                        className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:border-[#00646e] focus:bg-white focus:ring-2 focus:ring-[#00646e]/20 text-xs text-slate-900 outline-none transition-all placeholder:text-slate-400"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-slate-700">
                        Password
                      </label>
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:border-[#00646e] focus:bg-white focus:ring-2 focus:ring-[#00646e]/20 text-xs text-slate-900 outline-none transition-all placeholder:text-slate-400"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Sign In Button */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full mt-2 py-3 px-6 rounded-full bg-[#00646e] hover:bg-[#00828f] text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span>Verifying credentials...</span>
                      </>
                    ) : (
                      <>
                        <span>Sign In</span>
                        <ArrowRight className="w-4 h-4 text-white" />
                      </>
                    )}
                  </button>

                  {/* Quick Demo Credentials */}
                  <div className="mt-5 pt-4 border-t border-slate-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                        Quick Demo Accounts:
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">1-CLICK FILL</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleQuickFill('admin')}
                        className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                          email === StorageService.FIXED_ADMIN_EMAIL
                            ? 'bg-[#000028] text-white border-transparent shadow-sm'
                            : 'bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold flex items-center gap-1">
                            <KeyRound className="w-3 h-3 text-[#00e5ff]" />
                            <span>Only 1 Admin</span>
                          </span>
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-900/60 text-emerald-300">
                            SOC
                          </span>
                        </div>
                        <div className="text-[10px] opacity-80 mt-1 truncate font-mono">
                          {StorageService.FIXED_ADMIN_EMAIL}
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleQuickFill('user')}
                        className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                          email === 'user@iotsecurity.com'
                            ? 'bg-[#000028] text-white border-transparent shadow-sm'
                            : 'bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold flex items-center gap-1">
                            <User className="w-3 h-3 text-[#00e5ff]" />
                            <span>Demo User</span>
                          </span>
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-900/60 text-cyan-300">
                            USER
                          </span>
                        </div>
                        <div className="text-[10px] opacity-80 mt-1 truncate font-mono">
                          user@iotsecurity.com
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Switch to Register link */}
                  <div className="pt-2 text-center text-xs text-slate-600">
                    Need a new operator account?{' '}
                    <button
                      type="button"
                      onClick={() => { setMode('register'); setErrorMsg(''); setSuccessMsg(''); }}
                      className="font-bold text-[#00646e] hover:underline cursor-pointer"
                    >
                      Register here
                    </button>
                  </div>
                </form>
              ) : (
                /* -------------------- REGISTER USER FORM -------------------- */
                <form onSubmit={handleRegisterSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Full Legal Name
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                      <input
                        type="text"
                        required
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        placeholder="e.g. Alex Rivera"
                        className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:border-[#00646e] focus:bg-white focus:ring-2 focus:ring-[#00646e]/20 text-xs text-slate-900 outline-none transition-all placeholder:text-slate-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                      <input
                        type="email"
                        required
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="alex.rivera@iotsecurity.com"
                        className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:border-[#00646e] focus:bg-white focus:ring-2 focus:ring-[#00646e]/20 text-xs text-slate-900 outline-none transition-all placeholder:text-slate-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Create Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="Min 6 characters"
                        className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:border-[#00646e] focus:bg-white focus:ring-2 focus:ring-[#00646e]/20 text-xs text-slate-900 outline-none transition-all placeholder:text-slate-400"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Role Notice (Zero-Trust Single Admin Enforcement) */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2.5">
                    <ShieldAlert className="w-4 h-4 text-[#00646e] shrink-0 mt-0.5" />
                    <div>
                      <div className="text-[11px] font-bold text-slate-800">
                        Default Role: USER (Standard Access)
                      </div>
                      <div className="text-[10px] text-slate-500 leading-relaxed mt-0.5">
                        In accordance with the Single-Admin security policy, all new accounts are registered with the <span className="font-semibold text-slate-700">USER</span> role. Users cannot select or change their role to ADMIN.
                      </div>
                    </div>
                  </div>

                  {/* Register Button */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full mt-2 py-3 px-6 rounded-full bg-[#00646e] hover:bg-[#00828f] text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span>Registering account...</span>
                      </>
                    ) : (
                      <>
                        <span>Create User Account</span>
                        <ArrowRight className="w-4 h-4 text-white" />
                      </>
                    )}
                  </button>

                  {/* Switch to Login link */}
                  <div className="pt-2 text-center text-xs text-slate-600">
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => { setMode('login'); setErrorMsg(''); setSuccessMsg(''); }}
                      className="font-bold text-[#00646e] hover:underline cursor-pointer"
                    >
                      Sign In here
                    </button>
                  </div>
                </form>
              )}

              {/* Navigation Back */}
              <div className="mt-6 text-center">
                <button
                  onClick={() => onNavigate('landing')}
                  className="text-xs font-semibold text-slate-600 hover:text-[#00646e] transition-colors inline-flex items-center gap-1 cursor-pointer"
                >
                  &larr; Return to SecureIoT AI Platform Overview
                </button>
              </div>

            </div>

          </div>

          {/* Compliance Tagline */}
          <div className="mt-5 text-center text-xs text-slate-500">
            Protected by SecureIoT AI Zero-Trust Gateway &bull; NIST SP 800-207 &bull; Single-Admin Policy
          </div>

        </div>
      </div>

    </div>
  );
};
