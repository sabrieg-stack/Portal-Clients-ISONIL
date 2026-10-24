import React, { useState } from 'react';
import { 
  Lock, 
  Mail, 
  Building, 
  KeyRound, 
  ArrowLeft,
  ArrowRight,
  ShieldAlert, 
  CheckCircle2, 
  AlertCircle,
  Building2,
  ExternalLink,
  Sparkles,
  ShieldCheck,
  Send
} from 'lucide-react';
import { Language, User, ProjectCategory, PendingRegistration } from '../types';
import { translations } from '../i18n/translations';

interface AuthModalProps {
  lang: Language;
  users: User[];
  onLoginSuccess: (user: User) => void;
  onRequestAccount: (data: Omit<PendingRegistration, 'id' | 'requestedAt'>) => void;
  onUpdateUserPassword?: (email: string, newPass: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  lang,
  users,
  onLoginSuccess,
  onRequestAccount,
  onUpdateUserPassword,
}) => {
  const t = translations[lang];

  type AuthTab = 'client-login' | 'admin-login' | 'register' | 'forgot-password';
  const [activeTab, setActiveTab] = useState<AuthTab>('client-login');

  // Login form state (empty by default; never assume admin role or credentials)
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);

  // Register form state
  const [regFullName, setRegFullName] = useState('');
  const [regCompany, setRegCompany] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regCity, setRegCity] = useState('');
  const [regProjectType, setRegProjectType] = useState<ProjectCategory>('tuyauterie');
  const [regNotes, setRegNotes] = useState('');
  const [regSubmitted, setRegSubmitted] = useState(false);

  // Forgot Password / Password Reset Flow State
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetStep, setResetStep] = useState<'request' | 'email-sent' | 'create-new'>('request');
  const [generatedResetLink, setGeneratedResetLink] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccessAlert, setPasswordSuccessAlert] = useState<string | null>(null);

  // Handle Login: determine role strictly from authenticated account and credentials
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    const emailTrim = loginEmail.trim().toLowerCase();
    const targetRole = activeTab === 'admin-login' ? 'admin' : 'client';

    const matchedUser = users.find(
      (u) => u.email.toLowerCase() === emailTrim && u.role === targetRole
    );

    if (!matchedUser) {
      setLoginError(t.loginError);
      return;
    }

    if (matchedUser.status === 'pending') {
      setLoginError(t.pendingActivationAlert);
      return;
    }

    if (matchedUser.status === 'suspended') {
      setLoginError(lang === 'ar' ? 'تم تجميد هذا الحساب من قبل الإدارة.' : 'Ce compte a été suspendu par la direction.');
      return;
    }

    // Verify password strictly
    const expectedPassword = matchedUser.password || (matchedUser.role === 'admin' ? 'admin@isonil2025' : 'client@isonil2025');
    if (loginPassword !== expectedPassword) {
      setLoginError(lang === 'ar' ? 'كلمة المرور المدخلة غير صحيحة.' : 'Mot de passe incorrect.');
      return;
    }

    // Authenticate user with verified role
    onLoginSuccess(matchedUser);
  };

  // Handle Register Request
  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regFullName || !regCompany || !regEmail || !regPhone) return;

    onRequestAccount({
      fullName: regFullName,
      companyName: regCompany,
      email: regEmail,
      phone: regPhone,
      city: regCity || 'Maroc',
      projectType: regProjectType,
      notes: regNotes,
    });

    setRegSubmitted(true);
  };

  // Step 1: Send recovery link to client's email
  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;

    const token = Math.random().toString(36).substring(2, 12);
    const generatedLink = `https://portal.isonil.com/auth/reset-password?token=${token}&email=${encodeURIComponent(forgotEmail)}`;
    setGeneratedResetLink(generatedLink);
    setResetStep('email-sent');
  };

  // Step 2 -> Step 3: User clicks the link received in their email
  const handleOpenResetFromEmail = () => {
    setResetStep('create-new');
    setPasswordError(null);
  };

  // Step 3: Apply & Confirm New Password
  const handleApplyNewPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (!newPassword || newPassword.length < 6) {
      setPasswordError(lang === 'ar' ? 'يجب أن تتكون كلمة المرور من 6 أحرف على الأقل.' : 'Le mot de passe doit comporter au moins 6 caractères.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordError(t.passwordMismatch);
      return;
    }

    // Persist new password
    if (onUpdateUserPassword) {
      onUpdateUserPassword(forgotEmail, newPassword);
    }

    setPasswordSuccessAlert(t.passwordResetSuccessAlert);

    setTimeout(() => {
      setActiveTab('client-login');
      setLoginEmail(forgotEmail);
      setLoginPassword(newPassword);
      setResetStep('request');
      setNewPassword('');
      setConfirmNewPassword('');
      setPasswordSuccessAlert(null);
    }, 2200);
  };

  return (
    <div className="min-h-[calc(100vh-100px)] py-10 px-4 flex items-center justify-center">
      <div className="w-full max-w-xl bg-[#161b22] border border-[#30363d] rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl">
        
        {/* Header Tabs */}
        <div className="flex border-b border-[#30363d] bg-[#0d1117]/80 p-2 gap-1.5">
          <button
            onClick={() => { 
              setActiveTab('client-login'); 
              setLoginError(null); 
              setLoginEmail(''); 
              setLoginPassword(''); 
            }}
            className={`flex-1 py-3 px-3 rounded-xl text-xs md:text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'client-login'
                ? 'theme-btn font-bold shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-[#21262d]'
            }`}
          >
            {t.clientLoginTab}
          </button>

          <button
            onClick={() => { 
              setActiveTab('admin-login'); 
              setLoginError(null); 
              setLoginEmail(''); 
              setLoginPassword(''); 
            }}
            className={`flex-1 py-3 px-3 rounded-xl text-xs md:text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'admin-login'
                ? 'theme-btn font-bold shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-[#21262d]'
            }`}
          >
            {t.adminLoginTab}
          </button>

          <button
            onClick={() => { 
              setActiveTab('register'); 
              setRegSubmitted(false); 
            }}
            className={`flex-1 py-3 px-3 rounded-xl text-xs md:text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'register'
                ? 'theme-btn font-bold shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-[#21262d]'
            }`}
          >
            {t.requestAccountTab}
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 md:p-8">

          {/* TAB 1 & 2: Client or Admin Login */}
          {(activeTab === 'client-login' || activeTab === 'admin-login') && (
            <div>
              <div className="mb-6 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#21262d] theme-border border theme-text mb-3 shadow-inner">
                  <KeyRound className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-bold text-white mb-1">
                  {activeTab === 'admin-login' ? t.adminLoginTab : t.clientLoginTab}
                </h2>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  {activeTab === 'admin-login'
                    ? (lang === 'ar' ? 'جلسة إشراف مركزية للتحكم في المشاريع والمرفقات' : 'Console de supervision et de dispatching centralisé')
                    : (lang === 'ar' ? 'الوصول إلى الأرشيف الميداني ومرفقات مشروعاتكم' : 'Accès à votre espace projet et documentation')}
                </p>
              </div>

              {loginError && (
                <div className="mb-4 p-3.5 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs flex items-center gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{loginError}</span>
                </div>
              )}

              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    {t.emailLabel}
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder={activeTab === 'admin-login' ? 'contact@isonil.com' : 'votre-email@entreprise.ma'}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#0d1117] border border-[#30363d] focus:border-theme focus:outline-none text-slate-100 text-sm placeholder:text-slate-600 transition-colors"
                    />
                    <Mail className={`absolute top-3 w-4 h-4 text-slate-500 pointer-events-none ${lang === 'ar' ? 'left-3' : 'right-3'}`} />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-300">
                      {t.passwordLabel}
                    </label>
                    {activeTab === 'client-login' && (
                      <button
                        type="button"
                        onClick={() => { 
                          setActiveTab('forgot-password'); 
                          setResetStep('request');
                          setPasswordError(null);
                        }}
                        className="text-xs theme-text hover:underline transition-colors cursor-pointer"
                      >
                        {t.forgotPassword}
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="password"
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full px-4 py-2.5 rounded-xl bg-[#0d1117] border border-[#30363d] focus:border-theme focus:outline-none text-slate-100 text-sm placeholder:text-slate-600 transition-colors"
                    />
                    <Lock className={`absolute top-3 w-4 h-4 text-slate-500 pointer-events-none ${lang === 'ar' ? 'left-3' : 'right-3'}`} />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 px-4 rounded-xl theme-btn font-bold text-sm transition-all shadow-lg cursor-pointer mt-2"
                >
                  {t.loginButton}
                </button>
              </form>
            </div>
          )}

          {/* TAB 3: Request Account (Registration Form) */}
          {activeTab === 'register' && (
            <div>
              {regSubmitted ? (
                <div className="text-center py-6">
                  <div className="w-16 h-16 rounded-full bg-emerald-950/80 border border-emerald-700 text-emerald-400 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-9 h-9" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">{t.requestSuccessTitle}</h3>
                  <p className="text-xs md:text-sm text-slate-300 leading-relaxed mb-6">
                    {t.requestSuccessDesc}
                  </p>

                  <button
                    onClick={() => setActiveTab('client-login')}
                    className="px-6 py-2.5 rounded-xl theme-btn font-bold text-xs cursor-pointer shadow-md"
                  >
                    {t.backToLogin}
                  </button>
                </div>
              ) : (
                <div>
                  <div className="mb-5">
                    <h3 className="text-lg font-bold text-white mb-1">{t.requestAccountTab}</h3>
                    <p className="text-xs text-slate-400">
                      {lang === 'ar' ? 'قم بتعبئة بيانات منشأتكم لطلب تفعيل مساحة عمل خاصة بكم.' : 'Formulez votre demande d\'ouverture d\'espace client.'}
                    </p>
                  </div>

                  <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">
                          {t.fullNameLabel} *
                        </label>
                        <input
                          type="text"
                          required
                          value={regFullName}
                          onChange={(e) => setRegFullName(e.target.value)}
                          placeholder="Ex: Mohamed Alami"
                          className="w-full px-3 py-2 rounded-xl bg-[#0d1117] border border-[#30363d] focus:border-theme focus:outline-none text-slate-100 text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">
                          {t.companyNameLabel} *
                        </label>
                        <input
                          type="text"
                          required
                          value={regCompany}
                          onChange={(e) => setRegCompany(e.target.value)}
                          placeholder="Ex: OCP / Centrale Danone..."
                          className="w-full px-3 py-2 rounded-xl bg-[#0d1117] border border-[#30363d] focus:border-theme focus:outline-none text-slate-100 text-xs"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">
                          {t.emailLabel} *
                        </label>
                        <input
                          type="email"
                          required
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          placeholder="contact@entreprise.ma"
                          className="w-full px-3 py-2 rounded-xl bg-[#0d1117] border border-[#30363d] focus:border-theme focus:outline-none text-slate-100 text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">
                          {t.phoneLabel} *
                        </label>
                        <input
                          type="tel"
                          required
                          value={regPhone}
                          onChange={(e) => setRegPhone(e.target.value)}
                          placeholder="+212600000000"
                          className="w-full px-3 py-2 rounded-xl bg-[#0d1117] border border-[#30363d] focus:border-theme focus:outline-none text-slate-100 text-xs"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">
                          {t.cityLabel}
                        </label>
                        <input
                          type="text"
                          value={regCity}
                          onChange={(e) => setRegCity(e.target.value)}
                          placeholder="El Jadida, Jorf Lasfar..."
                          className="w-full px-3 py-2 rounded-xl bg-[#0d1117] border border-[#30363d] focus:border-theme focus:outline-none text-slate-100 text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">
                          {t.projectTypeLabel}
                        </label>
                        <select
                          value={regProjectType}
                          onChange={(e) => setRegProjectType(e.target.value as ProjectCategory)}
                          className="w-full px-3 py-2 rounded-xl bg-[#0d1117] border border-[#30363d] focus:border-theme focus:outline-none text-slate-100 text-xs"
                        >
                          <option value="tuyauterie">{t.typeTuyauterie}</option>
                          <option value="conduits">{t.typeConduits}</option>
                          <option value="cuves">{t.typeCuves}</option>
                          <option value="batiment">{t.typeBatiment}</option>
                          <option value="chaudieres">{t.typeChaudieres}</option>
                          <option value="autre">{t.typeAutre}</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        {lang === 'ar' ? 'نبذة عن متطلبات العزل' : 'Précisions sur les besoins'}
                      </label>
                      <textarea
                        rows={2}
                        value={regNotes}
                        onChange={(e) => setRegNotes(e.target.value)}
                        placeholder={lang === 'ar' ? 'ملاحظات فنية أو تفاصيل الموقع...' : 'Observations techniques particulières...'}
                        className="w-full px-3 py-2 rounded-xl bg-[#0d1117] border border-[#30363d] focus:border-theme focus:outline-none text-slate-100 text-xs resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 px-4 rounded-xl theme-btn font-bold text-xs md:text-sm transition-all shadow-md cursor-pointer mt-1"
                    >
                      {t.submitRequest}
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: COMPLETE FORGOT PASSWORD & RESTORE LINK FLOW */}
          {activeTab === 'forgot-password' && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('client-login');
                    setResetStep('request');
                    setPasswordError(null);
                  }}
                  className="p-1 rounded-md bg-[#21262d] hover:bg-[#30363d] text-slate-300 transition-colors cursor-pointer"
                  title={t.back}
                >
                  {lang === 'ar' ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
                </button>
                <h3 className="text-base font-bold text-white">{t.forgotPasswordTitle}</h3>
              </div>

              {/* STEP 1: Enter email to request recovery link */}
              {resetStep === 'request' && (
                <form onSubmit={handleForgotSubmit} className="space-y-4">
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {t.forgotPasswordDesc}
                  </p>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      {t.emailLabel} *
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        required
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="votre-email@entreprise.ma"
                        className="w-full px-4 py-2.5 rounded-xl bg-[#0d1117] border border-[#30363d] focus:border-theme focus:outline-none text-slate-100 text-xs"
                      />
                      <Mail className={`absolute top-3 w-4 h-4 text-slate-500 pointer-events-none ${lang === 'ar' ? 'left-3' : 'right-3'}`} />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 rounded-xl theme-btn font-bold text-xs transition-colors cursor-pointer shadow-md"
                  >
                    {t.sendResetLink}
                  </button>
                </form>
              )}

              {/* STEP 2: Simulated Incoming Official Email with Direct Clickable Reset Link */}
              {resetStep === 'email-sent' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="p-4 rounded-xl bg-[#0d1117] border border-[#30363d]">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs mb-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>{t.resetEmailSentTitle}</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed mb-3">
                      {t.resetEmailSentDesc} <strong className="theme-text font-mono">{forgotEmail}</strong>
                    </p>

                    {/* Official ISONIL Message Card Simulator */}
                    <div className="p-4 rounded-xl bg-[#161b22] border theme-border space-y-3">
                      <div className="flex items-center justify-between border-b border-[#30363d] pb-2 text-[11px] text-slate-400">
                        <span className="font-semibold text-white">De : noreply@isonil.com</span>
                        <span className="font-mono text-slate-500">Maintenant</span>
                      </div>
                      
                      <p className="text-xs text-slate-200 font-medium">
                        {t.simulatedEmailSubject}
                      </p>

                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        {lang === 'ar' 
                          ? 'تلقينا طلباً لاستعادة وتعيين كلمة المرور لحسابكم. للبدء في تعيين كلمة المرور الجديدة، يرجى الضغط على الرابط الآمن أدناه:'
                          : 'Nous avons reçu une demande de réinitialisation de votre mot de passe. Veuillez cliquer sur le bouton ci-dessous pour définir votre nouveau mot de passe :'}
                      </p>

                      {/* Direct Clickable Action Link to create new password */}
                      <button
                        type="button"
                        onClick={handleOpenResetFromEmail}
                        className="w-full py-2.5 px-4 rounded-xl theme-btn font-bold text-xs flex items-center justify-center gap-2 shadow-lg cursor-pointer hover:scale-[1.01] transition-transform"
                      >
                        <KeyRound className="w-4 h-4" />
                        <span>{t.clickHereToReset}</span>
                      </button>

                      <p className="text-[10px] text-slate-500 text-center font-mono">
                        Lien sécurisé SSL/TLS · Valide 24 heures
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: Create & Confirm New Password */}
              {resetStep === 'create-new' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="mb-2">
                    <h4 className="text-sm font-bold text-white mb-0.5">{t.resetPasswordTitle}</h4>
                    <p className="text-xs text-slate-400">
                      {t.resetPasswordDesc} (<span className="theme-text font-mono">{forgotEmail}</span>)
                    </p>
                  </div>

                  {passwordError && (
                    <div className="p-3 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{passwordError}</span>
                    </div>
                  )}

                  {passwordSuccessAlert && (
                    <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-700 text-emerald-300 text-xs flex items-center gap-2 font-semibold">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>{passwordSuccessAlert}</span>
                    </div>
                  )}

                  <form onSubmit={handleApplyNewPasswordSubmit} className="space-y-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        {t.newPasswordLabel} *
                      </label>
                      <div className="relative">
                        <input
                          type="password"
                          required
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="••••••••••••"
                          className="w-full px-3 py-2 rounded-xl bg-[#0d1117] border border-[#30363d] focus:border-theme focus:outline-none text-slate-100 text-xs"
                        />
                        <Lock className={`absolute top-2.5 w-4 h-4 text-slate-500 pointer-events-none ${lang === 'ar' ? 'left-3' : 'right-3'}`} />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        {t.confirmPasswordLabel} *
                      </label>
                      <div className="relative">
                        <input
                          type="password"
                          required
                          value={confirmNewPassword}
                          onChange={(e) => setConfirmNewPassword(e.target.value)}
                          placeholder="••••••••••••"
                          className="w-full px-3 py-2 rounded-xl bg-[#0d1117] border border-[#30363d] focus:border-theme focus:outline-none text-slate-100 text-xs"
                        />
                        <Lock className={`absolute top-2.5 w-4 h-4 text-slate-500 pointer-events-none ${lang === 'ar' ? 'left-3' : 'right-3'}`} />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 px-4 rounded-xl theme-btn font-bold text-xs transition-colors cursor-pointer shadow-md mt-2"
                    >
                      {t.applyNewPasswordBtn}
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer info & Security pledge */}
        <div className="px-6 py-3.5 bg-[#0d1117] border-t border-[#30363d] flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 theme-text" />
            <span>ISONIL Maroc — Centre Andalousie, El Jadida</span>
          </span>
          <span className="font-mono text-slate-500">v4.0 Secure</span>
        </div>
      </div>
    </div>
  );
};
