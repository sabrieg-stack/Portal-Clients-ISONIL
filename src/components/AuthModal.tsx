import React, { useState, useMemo } from 'react';
import { 
  Lock, 
  Mail, 
  KeyRound, 
  ArrowLeft,
  ArrowRight,
  CheckCircle2, 
  AlertCircle,
  Building2,
  ShieldCheck,
  UserPlus,
  Chrome,
  Loader2,
  Globe
} from 'lucide-react';
import { Language, User, ProjectCategory, PendingRegistration } from '../types';
import { translations } from '../i18n/translations';
import {
  auth,
  googleProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  firebaseSignOut,
  checkIsFirebaseAdmin,
  registerAdminInFirestore,
  fetchVerifiedUserFromFirestore,
  syncUserToFirestore,
} from '../firebase';

interface AuthModalProps {
  lang: Language;
  onLanguageChange?: (lang: Language) => void;
  users: User[];
  pendingRegistrations?: PendingRegistration[];
  onLoginSuccess: (user: User) => void;
  onRegisterAdminAccount?: (adminUser: User) => void;
  onRequestAccount: (data: Omit<PendingRegistration, 'id' | 'requestedAt'>) => void;
  onUpdateUserPassword?: (email: string, newPass: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  lang,
  onLanguageChange,
  users,
  pendingRegistrations = [],
  onLoginSuccess,
  onRegisterAdminAccount,
  onRequestAccount,
  onUpdateUserPassword,
}) => {
  const t = translations[lang];

  type AuthTab = 'client-login' | 'admin-login' | 'register' | 'forgot-password';
  const [activeTab, setActiveTab] = useState<AuthTab>('client-login');

  const existingAdmins = useMemo(
    () => users.filter((u) => u.role === 'admin' && u.status === 'active'),
    [users]
  );

  // Explicit opt-in toggle if admin wants to open the new-admin registration form
  const [showAdminSetupMode, setShowAdminSetupMode] = useState<boolean>(false);

  // Login form state (never auto-trigger login from browser autofill)
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isSubmittingAuth, setIsSubmittingAuth] = useState<boolean>(false);

  // Admin account setup form state
  const [adminSetupName, setAdminSetupName] = useState('');
  const [adminSetupCompany, setAdminSetupCompany] = useState('ISONIL Maroc');
  const [adminSetupEmail, setAdminSetupEmail] = useState('');
  const [adminSetupPhone, setAdminSetupPhone] = useState('+212710738409');
  const [adminSetupPassword, setAdminSetupPassword] = useState('');
  const [adminSetupConfirmPassword, setAdminSetupConfirmPassword] = useState('');

  // Client Register form state
  const [regFullName, setRegFullName] = useState('');
  const [regCompany, setRegCompany] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regCity, setRegCity] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regProjectType, setRegProjectType] = useState<ProjectCategory>('tuyauterie');
  const [regNotes, setRegNotes] = useState('');
  const [regSubmitted, setRegSubmitted] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);

  // Forgot Password / Password Reset Flow State
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetStep, setResetStep] = useState<'request' | 'email-sent' | 'create-new'>('request');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccessAlert, setPasswordSuccessAlert] = useState<string | null>(null);

  // 1. Handle Email & Password Login (Single submission, visible loading, strict role & status check)
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingAuth) return;
    setLoginError(null);

    const emailTrim = loginEmail.trim().toLowerCase();
    const passwordVal = loginPassword;
    const targetRole = activeTab === 'admin-login' ? 'admin' : 'client';

    if (!emailTrim || !passwordVal) {
      setLoginError(
        lang === 'ar'
          ? 'يرجى إدخال البريد الإلكتروني وكلمة المرور.'
          : 'Veuillez saisir votre adresse e-mail et votre mot de passe.'
      );
      return;
    }

    if (passwordVal.length < 4) {
      setLoginError(t.loginError);
      return;
    }

    setIsSubmittingAuth(true);

    try {
      // Step A: Check if a client registration request is still pending approval
      if (targetRole === 'client') {
        const isPendingRequest = pendingRegistrations.some(
          (p) => p.email.trim().toLowerCase() === emailTrim
        );
        if (isPendingRequest) {
          setLoginError(t.pendingActivationAlert);
          return;
        }
      }

      // Step B: Try Firebase Auth Email/Password sign-in if configured on the Firebase project
      let fbAuthenticatedUser: User | null = null;
      let fbErrorCode: string | null = null;
      try {
        const fbCred = await signInWithEmailAndPassword(auth, emailTrim, passwordVal);
        if (fbCred.user) {
          fbAuthenticatedUser = await fetchVerifiedUserFromFirestore(fbCred.user);
        }
      } catch (err: unknown) {
        if (err && typeof err === 'object' && 'code' in err) {
          fbErrorCode = String((err as { code: string }).code);
        }
      }

      if (fbErrorCode === 'auth/unauthorized-domain') {
        setLoginError(
          lang === 'ar'
            ? 'النطاق الحالي (isonil.com) غير مصرح به في إعدادات Firebase Console. يرجى إضافة نطاق الموقع إلى Authorized Domains في Firebase Console.'
            : 'Le domaine (isonil.com) n\'est pas autorisé dans Firebase Console. Veuillez l\'ajouter dans Authentication > Settings > Authorized domains.'
        );
        return;
      }

      // Step C: Match against verified user records
      const matchedUser =
        (fbAuthenticatedUser && fbAuthenticatedUser.role === targetRole ? fbAuthenticatedUser : null) ||
        users.find((u) => u.email.trim().toLowerCase() === emailTrim && u.role === targetRole);

      if (matchedUser) {
        if (matchedUser.status === 'pending') {
          setLoginError(t.pendingActivationAlert);
          return;
        }

        if (matchedUser.status === 'suspended') {
          setLoginError(
            lang === 'ar'
              ? 'تم إيقاف أو تجميد هذا الحساب من قبل الإدارة.'
              : 'Ce compte a été suspendu ou désactivé par la direction.'
          );
          return;
        }

        // If authenticated via local user record, verify password strictly
        if (!fbAuthenticatedUser && (!matchedUser.password || passwordVal !== matchedUser.password)) {
          setLoginError(
            lang === 'ar'
              ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة. يرجى التحقق والمحاولة مجدداً.'
              : 'Adresse e-mail ou mot de passe incorrect. Veuillez réessayer.'
          );
          return;
        }

        // Connect user to Firebase Auth if not already connected
        if (!fbAuthenticatedUser && passwordVal.length >= 6) {
          try {
            const cred = await createUserWithEmailAndPassword(auth, emailTrim, passwordVal);
            if (cred.user) {
              matchedUser.uid = cred.user.uid;
              syncUserToFirestore(matchedUser, cred.user.uid).catch(() => {});
            }
          } catch {
            // ignore if already exists or blocked
          }
        }

        onLoginSuccess({
          ...matchedUser,
          role: matchedUser.role === 'admin' ? 'admin' : 'client',
        });
        return;
      }

      // Step D: Check if the email belongs to the opposite role to provide a clear RBAC error
      const wrongRoleUser =
        (fbAuthenticatedUser && fbAuthenticatedUser.role !== targetRole ? fbAuthenticatedUser : null) ||
        users.find((u) => u.email.trim().toLowerCase() === emailTrim);

      if (wrongRoleUser) {
        setLoginError(
          targetRole === 'admin'
            ? (lang === 'ar'
                ? 'هذا الحساب مسجل كحساب عميل ولا يملك صلاحية الدخول إلى لوحة الإدارة.'
                : 'Ce compte est enregistré comme client et n\'est pas autorisé à accéder à l\'administration.')
            : (lang === 'ar'
                ? 'هذا البريد مخصص للإدارة. يرجى استخدام تبويب «دخول الإدارة».'
                : 'Cet e-mail appartient à l\'administration. Veuillez utiliser l\'onglet Administration.')
        );
        return;
      }

      // Step E: If Admin tab is used when no admin account has been registered yet, initialize the first admin account
      if (targetRole === 'admin' && existingAdmins.length === 0 && passwordVal.length >= 6) {
        let adminUid = auth.currentUser?.uid;
        if (!adminUid) {
          try {
            const cred = await createUserWithEmailAndPassword(auth, emailTrim, passwordVal);
            adminUid = cred.user.uid;
          } catch (createErr: unknown) {
            const cCode = createErr && typeof createErr === 'object' && 'code' in createErr ? String((createErr as { code: string }).code) : '';
            if (cCode === 'auth/email-already-in-use') {
              try {
                const cred = await signInWithEmailAndPassword(auth, emailTrim, passwordVal);
                adminUid = cred.user.uid;
              } catch {
                // ignore
              }
            }
          }
        }
        const newAdmin = await registerAdminInFirestore({
          uid: adminUid || `admin-${Date.now()}`,
          email: emailTrim,
          fullName: emailTrim.split('@')[0] || 'Direction ISONIL',
          companyName: 'ISONIL Maroc',
          phone: '+212710738409',
          password: passwordVal,
        });
        if (onRegisterAdminAccount) {
          onRegisterAdminAccount(newAdmin);
        }
        onLoginSuccess(newAdmin);
        return;
      }

      setLoginError(t.loginError);
    } catch (err) {
      console.error('Login error:', err);
      setLoginError(
        lang === 'ar'
          ? 'حدث خطأ أثناء الاتصال بخدمة المصادقة. يرجى المحاولة مرة أخرى.'
          : 'Erreur de connexion au service d\'authentification. Veuillez réessayer.'
      );
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  // 2. Handle Admin Account Creation / Linking Form
  const handleAdminSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingAuth) return;
    setLoginError(null);

    const emailTrim = adminSetupEmail.trim().toLowerCase();
    if (!adminSetupName.trim() || !emailTrim || !adminSetupPassword) {
      setLoginError(
        lang === 'ar'
          ? 'يرجى تعبئة الاسم والبريد الإلكتروني وكلمة المرور.'
          : 'Veuillez remplir tous les champs obligatoires.'
      );
      return;
    }

    if (adminSetupPassword.length < 6) {
      setLoginError(
        lang === 'ar'
          ? 'يجب أن تتكون كلمة المرور من 6 أحرف على الأقل.'
          : 'Le mot de passe doit comporter au moins 6 caractères.'
      );
      return;
    }

    if (adminSetupPassword !== adminSetupConfirmPassword) {
      setLoginError(t.passwordMismatch);
      return;
    }

    setIsSubmittingAuth(true);
    try {
      let adminUid = auth.currentUser?.uid;
      if (!adminUid) {
        try {
          const cred = await createUserWithEmailAndPassword(auth, emailTrim, adminSetupPassword);
          adminUid = cred.user.uid;
        } catch (createErr: unknown) {
          const cCode = createErr && typeof createErr === 'object' && 'code' in createErr ? String((createErr as { code: string }).code) : '';
          if (cCode === 'auth/email-already-in-use') {
            try {
              const cred = await signInWithEmailAndPassword(auth, emailTrim, adminSetupPassword);
              adminUid = cred.user.uid;
            } catch {
              // ignore
            }
          } else if (cCode === 'auth/unauthorized-domain') {
            setLoginError(
              lang === 'ar'
                ? 'النطاق الحالي (isonil.com) غير مصرح به في إعدادات Firebase Console. يرجى إضافة نطاق الموقع إلى Authorized Domains في Firebase Console.'
                : 'Le domaine (isonil.com) n\'est pas autorisé dans Firebase Console. Veuillez l\'ajouter dans Authentication > Settings > Authorized domains.'
            );
            return;
          }
        }
      }

      const adminId = adminUid || `admin-${Date.now()}`;
      const newAdmin = await registerAdminInFirestore({
        uid: adminId,
        email: emailTrim,
        fullName: adminSetupName.trim(),
        companyName: adminSetupCompany.trim() || 'ISONIL Maroc',
        phone: adminSetupPhone.trim() || '+212710738409',
        password: adminSetupPassword,
      });

      if (onRegisterAdminAccount) {
        onRegisterAdminAccount(newAdmin);
      }
      setShowAdminSetupMode(false);
      onLoginSuccess(newAdmin);
    } catch (err) {
      console.error('Admin setup error:', err);
      setLoginError(
        lang === 'ar'
          ? 'حدث خطأ أثناء حفظ حساب الإدارة. يرجى المحاولة مرة أخرى.'
          : 'Erreur lors de la configuration du compte administrateur.'
      );
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  // 3. Handle Firebase Google Authentication (Both Admin & Client)
  const handleFirebaseGoogleSignIn = async (mode: 'client-login' | 'admin-login' | 'admin-setup') => {
    if (isSubmittingAuth) return;
    setLoginError(null);
    setIsSubmittingAuth(true);

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const fbUser = result.user;
      const emailLower = (fbUser.email || '').trim().toLowerCase();

      if (!emailLower) {
        setLoginError(
          lang === 'ar'
            ? 'تعذر قراءة البريد الإلكتروني من حساب Google.'
            : 'Impossible de récupérer l\'adresse e-mail Google.'
        );
        return;
      }

      if (mode === 'admin-setup') {
        const newAdmin = await registerAdminInFirestore({
          uid: fbUser.uid,
          email: emailLower,
          fullName: fbUser.displayName || emailLower.split('@')[0],
          companyName: adminSetupCompany.trim() || 'ISONIL Maroc',
          phone: fbUser.phoneNumber || adminSetupPhone || '+212710738409',
          password: adminSetupPassword || undefined,
        });

        if (onRegisterAdminAccount) {
          onRegisterAdminAccount(newAdmin);
        }
        setShowAdminSetupMode(false);
        onLoginSuccess(newAdmin);
        return;
      }

      if (mode === 'admin-login') {
        const isFirestoreAdmin = await checkIsFirebaseAdmin(fbUser.uid, emailLower);
        const matchedLocalAdmin = users.find(
          (u) =>
            u.role === 'admin' &&
            u.status === 'active' &&
            (u.id === fbUser.uid || u.uid === fbUser.uid || u.email.trim().toLowerCase() === emailLower)
        );

        if (isFirestoreAdmin || matchedLocalAdmin || existingAdmins.length === 0) {
          const verifiedAdmin = await registerAdminInFirestore({
            uid: fbUser.uid,
            email: emailLower,
            fullName: matchedLocalAdmin?.fullName || fbUser.displayName || 'Direction ISONIL',
            companyName: matchedLocalAdmin?.companyName || 'ISONIL Maroc',
            phone: matchedLocalAdmin?.phone || fbUser.phoneNumber || '+212710738409',
            password: matchedLocalAdmin?.password,
          });
          if (onRegisterAdminAccount) {
            onRegisterAdminAccount(verifiedAdmin);
          }
          onLoginSuccess(verifiedAdmin);
          return;
        }

        await firebaseSignOut(auth);
        setLoginError(
          lang === 'ar'
            ? `الحساب (${emailLower}) غير مخول بصلاحيات الإدارة.`
            : `Le compte (${emailLower}) n'est pas autorisé en tant qu'administrateur.`
        );
        return;
      }

      if (mode === 'client-login') {
        const isPending = pendingRegistrations.some(
          (p) => p.email.trim().toLowerCase() === emailLower
        );
        if (isPending) {
          await firebaseSignOut(auth);
          setLoginError(t.pendingActivationAlert);
          return;
        }

        const firestoreUser = await fetchVerifiedUserFromFirestore(fbUser);
        const matchedClient =
          (firestoreUser && firestoreUser.role === 'client' ? firestoreUser : null) ||
          users.find(
            (u) =>
              u.role === 'client' &&
              (u.id === fbUser.uid || u.uid === fbUser.uid || u.email.trim().toLowerCase() === emailLower)
          );

        if (matchedClient) {
          if (matchedClient.status === 'pending') {
            await firebaseSignOut(auth);
            setLoginError(t.pendingActivationAlert);
            return;
          }
          if (matchedClient.status === 'suspended') {
            await firebaseSignOut(auth);
            setLoginError(
              lang === 'ar'
                ? 'تم تجميد هذا الحساب من قبل الإدارة.'
                : 'Ce compte a été suspendu par la direction.'
            );
            return;
          }

          const updatedClient: User = {
            ...matchedClient,
            uid: fbUser.uid,
            role: 'client',
          };
          await syncUserToFirestore(updatedClient, fbUser.uid);
          onLoginSuccess(updatedClient);
          return;
        }

        await firebaseSignOut(auth);
        setRegFullName(fbUser.displayName || '');
        setRegEmail(emailLower);
        setRegPhone(fbUser.phoneNumber || '');
        setActiveTab('register');
        setRegError(
          lang === 'ar'
            ? `تم التحقق من بريدكم (${emailLower}). يرجى استكمال بيانات الشركة أدناه لإرسال طلب تفعيل حسابكم.`
            : `E-mail (${emailLower}) vérifié. Veuillez compléter ce formulaire pour demander l'activation de votre compte.`
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes('auth/popup-closed-by-user')) {
        if (msg.includes('auth/unauthorized-domain')) {
          setLoginError(
            lang === 'ar'
              ? 'النطاق الحالي (isonil.com) غير مصرح به في Firebase Console. يرجى إضافته في Authentication > Settings > Authorized domains.'
              : 'Le domaine (isonil.com) n\'est pas autorisé dans Firebase Console. Veuillez l\'ajouter dans Authentication > Settings > Authorized domains.'
          );
        } else {
          setLoginError(
            lang === 'ar'
              ? 'تعذر إتمام تسجيل الدخول عبر Google. يرجى استخدام البريد الإلكتروني وكلمة المرور.'
              : 'Échec de connexion Google. Veuillez utiliser votre e-mail et mot de passe.'
          );
        }
      }
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  // 4. Handle Client Registration Request
  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);

    const emailTrim = regEmail.trim().toLowerCase();
    if (!regFullName.trim() || !regCompany.trim() || !emailTrim || !regPhone.trim()) return;

    if (!regPassword || regPassword.length < 6) {
      setRegError(
        lang === 'ar'
          ? 'يرجى تعيين كلمة مرور لا تقل عن 6 أحرف لاستخدامها عند دخولكم للبوابة.'
          : 'Veuillez définir un mot de passe d\'au moins 6 caractères.'
      );
      return;
    }

    const alreadyExists =
      users.some((u) => u.email.trim().toLowerCase() === emailTrim) ||
      pendingRegistrations.some((p) => p.email.trim().toLowerCase() === emailTrim);

    if (alreadyExists) {
      setRegError(
        lang === 'ar'
          ? 'هذا البريد الإلكتروني مسجل بالفعل أو قيد المراجعة.'
          : 'Cet e-mail est déjà enregistré ou en cours de validation.'
      );
      return;
    }

    onRequestAccount({
      fullName: regFullName.trim(),
      companyName: regCompany.trim(),
      email: emailTrim,
      phone: regPhone.trim(),
      city: regCity.trim() || 'Maroc',
      projectType: regProjectType,
      notes: regNotes.trim(),
      password: regPassword,
    });

    setRegSubmitted(true);
  };

  // Forgot Password handlers
  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;
    setResetStep('email-sent');
  };

  const handleOpenResetFromEmail = () => {
    setResetStep('create-new');
    setPasswordError(null);
  };

  const handleApplyNewPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (!newPassword || newPassword.length < 6) {
      setPasswordError(
        lang === 'ar'
          ? 'يجب أن تتكون كلمة المرور من 6 أحرف على الأقل.'
          : 'Le mot de passe doit comporter au moins 6 caractères.'
      );
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordError(t.passwordMismatch);
      return;
    }

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
    }, 1800);
  };

  return (
    <div className="min-h-[calc(100vh-80px)] py-8 px-4 flex items-center justify-center">
      <div className="w-full max-w-xl bg-[#161b22] border border-[#30363d] rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl">
        
        {/* Header Navigation Tabs */}
        <div className="flex border-b border-[#30363d] bg-[#0B192C]/90 p-2 gap-1.5">
          <button
            type="button"
            onClick={() => { 
              setActiveTab('client-login'); 
              setLoginError(null); 
            }}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs md:text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'client-login'
                ? 'theme-btn font-bold shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-[#21262d]'
            }`}
          >
            {t.clientLoginTab}
          </button>

          <button
            type="button"
            onClick={() => { 
              setActiveTab('admin-login'); 
              setShowAdminSetupMode(false);
              setLoginError(null); 
            }}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs md:text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'admin-login'
                ? 'theme-btn font-bold shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-[#21262d]'
            }`}
          >
            {t.adminLoginTab}
          </button>

          <button
            type="button"
            onClick={() => { 
              setActiveTab('register'); 
              setRegSubmitted(false); 
              setRegError(null);
            }}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs md:text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'register'
                ? 'theme-btn font-bold shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-[#21262d]'
            }`}
          >
            {t.requestAccountTab}
          </button>
        </div>

        {/* Card Content Body */}
        <div className="p-6 md:p-8">

          {/* TAB 1: CUSTOMER LOGIN */}
          {activeTab === 'client-login' && (
            <div>
              <div className="mb-5 text-center">
                <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-[#21262d] theme-border border theme-text mb-2.5 shadow-inner">
                  <KeyRound className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-bold text-[#DFC57B] mb-1">
                  {t.clientLoginTab}
                </h2>
                <p className="text-xs text-slate-300 max-w-sm mx-auto">
                  {lang === 'ar'
                    ? 'الوصول الآمن إلى مشاريعكم وملفاتكم المعتمدة'
                    : 'Accès sécurisé à vos projets et documents'}
                </p>
              </div>

              {loginError && (
                <div className="mb-4 p-3.5 rounded-xl bg-red-950/70 border border-[#E50914]/60 text-red-200 text-xs flex items-center gap-2.5" role="alert">
                  <AlertCircle className="w-4 h-4 text-[#E50914] shrink-0" />
                  <span>{loginError}</span>
                </div>
              )}

              <form onSubmit={handleLoginSubmit} autoComplete="off" className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                    {t.emailLabel}
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      disabled={isSubmittingAuth}
                      autoComplete="username"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="votre-email@entreprise.ma"
                      className="w-full px-4 py-2.5 rounded-xl bg-[#0d1117] border border-[#30363d] focus:border-theme focus:outline-none text-white text-sm placeholder:text-slate-500 transition-colors"
                    />
                    <Mail className={`absolute top-3 w-4 h-4 text-slate-400 pointer-events-none ${lang === 'ar' ? 'left-3' : 'right-3'}`} />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-200">
                      {t.passwordLabel}
                    </label>
                    <button
                      type="button"
                      onClick={() => { 
                        setActiveTab('forgot-password'); 
                        setResetStep('request');
                        setPasswordError(null);
                      }}
                      className="text-xs text-[#79C8E8] hover:underline transition-colors cursor-pointer"
                    >
                      {t.forgotPassword}
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type="password"
                      required
                      disabled={isSubmittingAuth}
                      autoComplete="current-password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full px-4 py-2.5 rounded-xl bg-[#0d1117] border border-[#30363d] focus:border-theme focus:outline-none text-white text-sm placeholder:text-slate-500 transition-colors"
                    />
                    <Lock className={`absolute top-3 w-4 h-4 text-slate-400 pointer-events-none ${lang === 'ar' ? 'left-3' : 'right-3'}`} />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingAuth}
                  className="w-full py-3 px-4 rounded-xl theme-btn font-bold text-sm transition-all shadow-lg cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {isSubmittingAuth ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{lang === 'ar' ? 'جاري التحقق والدخول...' : 'Connexion en cours...'}</span>
                    </>
                  ) : (
                    <span>{t.loginButton}</span>
                  )}
                </button>
              </form>

              <div className="relative flex py-3 items-center">
                <div className="flex-grow border-t border-[#30363d]" />
                <span className="flex-shrink mx-3 text-[11px] text-slate-400">
                  {lang === 'ar' ? 'أو' : 'Ou'}
                </span>
                <div className="flex-grow border-t border-[#30363d]" />
              </div>

              <button
                type="button"
                disabled={isSubmittingAuth}
                onClick={() => handleFirebaseGoogleSignIn('client-login')}
                className="w-full py-2.5 px-4 rounded-xl bg-[#0d1117] hover:bg-[#21262d] border border-[#30363d] text-white font-semibold text-xs md:text-sm flex items-center justify-center gap-2.5 transition-all cursor-pointer disabled:opacity-60"
              >
                <Chrome className="w-4 h-4 text-[#79C8E8]" />
                <span>
                  {lang === 'ar' ? 'الدخول عبر حساب Google' : 'Continuer avec Google'}
                </span>
              </button>
            </div>
          )}

          {/* TAB 2: ADMIN LOGIN */}
          {activeTab === 'admin-login' && (
            <div>
              <div className="mb-5 text-center">
                <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-[#21262d] theme-border border theme-text mb-2.5 shadow-inner">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-bold text-[#DFC57B] mb-1">
                  {showAdminSetupMode
                    ? (lang === 'ar' ? 'إعداد حساب إدارة جديد' : 'Configuration Compte Administrateur')
                    : t.adminLoginTab}
                </h2>
                <p className="text-xs text-slate-300 max-w-md mx-auto">
                  {lang === 'ar'
                    ? 'لوحة الإدارة المركزية للمشاريع والعملاء والمرفقات'
                    : 'Console de gestion des projets, clients et documents'}
                </p>
              </div>

              {loginError && (
                <div className="mb-4 p-3.5 rounded-xl bg-red-950/70 border border-[#E50914]/60 text-red-200 text-xs flex items-center gap-2.5" role="alert">
                  <AlertCircle className="w-4 h-4 text-[#E50914] shrink-0" />
                  <span>{loginError}</span>
                </div>
              )}

              {showAdminSetupMode ? (
                <form onSubmit={handleAdminSetupSubmit} autoComplete="off" className="space-y-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-200 mb-1">
                        {lang === 'ar' ? 'اسم المسؤول *' : 'Nom complet *'}
                      </label>
                      <input
                        type="text"
                        required
                        value={adminSetupName}
                        onChange={(e) => setAdminSetupName(e.target.value)}
                        placeholder={lang === 'ar' ? 'الاسم الكامل' : 'Nom complet'}
                        className="w-full px-3.5 py-2 rounded-xl bg-[#0d1117] border border-[#30363d] focus:border-theme focus:outline-none text-white text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-200 mb-1">
                        {lang === 'ar' ? 'الشركة *' : 'Société *'}
                      </label>
                      <input
                        type="text"
                        required
                        value={adminSetupCompany}
                        onChange={(e) => setAdminSetupCompany(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl bg-[#0d1117] border border-[#30363d] focus:border-theme focus:outline-none text-white text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-200 mb-1">
                      {t.emailLabel} *
                    </label>
                    <input
                      type="email"
                      required
                      value={adminSetupEmail}
                      onChange={(e) => setAdminSetupEmail(e.target.value)}
                      placeholder="admin@domaine.com"
                      className="w-full px-3.5 py-2 rounded-xl bg-[#0d1117] border border-[#30363d] focus:border-theme focus:outline-none text-white text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-200 mb-1">
                        {t.passwordLabel} *
                      </label>
                      <input
                        type="password"
                        required
                        value={adminSetupPassword}
                        onChange={(e) => setAdminSetupPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-3.5 py-2 rounded-xl bg-[#0d1117] border border-[#30363d] focus:border-theme focus:outline-none text-white text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-200 mb-1">
                        {t.confirmPasswordLabel} *
                      </label>
                      <input
                        type="password"
                        required
                        value={adminSetupConfirmPassword}
                        onChange={(e) => setAdminSetupConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-3.5 py-2 rounded-xl bg-[#0d1117] border border-[#30363d] focus:border-theme focus:outline-none text-white text-xs"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingAuth}
                    className="w-full py-2.5 px-4 rounded-xl theme-btn font-bold text-xs md:text-sm transition-all cursor-pointer shadow-md flex items-center justify-center gap-2"
                  >
                    {isSubmittingAuth && <Loader2 className="w-4 h-4 animate-spin" />}
                    <span>
                      {lang === 'ar' ? 'حفظ وتفعيل حساب الإدارة' : 'Enregistrer le compte Administrateur'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowAdminSetupMode(false);
                      setLoginError(null);
                    }}
                    className="w-full text-center text-xs text-[#79C8E8] hover:underline pt-1 cursor-pointer"
                  >
                    {t.backToLogin}
                  </button>
                </form>
              ) : (
                <div>
                  <form onSubmit={handleLoginSubmit} autoComplete="off" className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                        {t.emailLabel}
                      </label>
                      <div className="relative">
                        <input
                          type="email"
                          required
                          disabled={isSubmittingAuth}
                          autoComplete="username"
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          placeholder="admin@domaine.com"
                          className="w-full px-4 py-2.5 rounded-xl bg-[#0d1117] border border-[#30363d] focus:border-theme focus:outline-none text-white text-sm placeholder:text-slate-500 transition-colors"
                        />
                        <Mail className={`absolute top-3 w-4 h-4 text-slate-400 pointer-events-none ${lang === 'ar' ? 'left-3' : 'right-3'}`} />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                        {t.passwordLabel}
                      </label>
                      <div className="relative">
                        <input
                          type="password"
                          required
                          disabled={isSubmittingAuth}
                          autoComplete="current-password"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          placeholder="••••••••••••"
                          className="w-full px-4 py-2.5 rounded-xl bg-[#0d1117] border border-[#30363d] focus:border-theme focus:outline-none text-white text-sm placeholder:text-slate-500 transition-colors"
                        />
                        <Lock className={`absolute top-3 w-4 h-4 text-slate-400 pointer-events-none ${lang === 'ar' ? 'left-3' : 'right-3'}`} />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmittingAuth}
                      className="w-full py-3 px-4 rounded-xl theme-btn font-bold text-sm transition-all shadow-lg cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                      {isSubmittingAuth ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>{lang === 'ar' ? 'جاري التحقق والدخول...' : 'Connexion en cours...'}</span>
                        </>
                      ) : (
                        <span>{t.loginButton}</span>
                      )}
                    </button>
                  </form>

                  <div className="relative flex py-3 items-center">
                    <div className="flex-grow border-t border-[#30363d]" />
                    <span className="flex-shrink mx-3 text-[11px] text-slate-400">
                      {lang === 'ar' ? 'أو' : 'Ou'}
                    </span>
                    <div className="flex-grow border-t border-[#30363d]" />
                  </div>

                  <button
                    type="button"
                    disabled={isSubmittingAuth}
                    onClick={() => handleFirebaseGoogleSignIn('admin-login')}
                    className="w-full py-2.5 px-4 rounded-xl bg-[#0d1117] hover:bg-[#21262d] border border-[#30363d] text-white font-semibold text-xs md:text-sm flex items-center justify-center gap-2.5 transition-all cursor-pointer disabled:opacity-60"
                  >
                    <Chrome className="w-4 h-4 text-[#79C8E8]" />
                    <span>
                      {lang === 'ar' ? 'الدخول للإدارة عبر حساب Google' : 'Connexion Administrateur via Google'}
                    </span>
                  </button>

                  <div className="mt-4 pt-3 border-t border-[#21262d] text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAdminSetupMode(true);
                        setLoginError(null);
                      }}
                      className="inline-flex items-center gap-1.5 text-xs text-[#79C8E8] hover:underline cursor-pointer"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>
                        {lang === 'ar' ? 'تأسيس أو ربط حساب إدارة جديد' : 'Configurer un nouveau compte administrateur'}
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: REQUEST ACCOUNT */}
          {activeTab === 'register' && (
            <div>
              {regSubmitted ? (
                <div className="text-center py-6">
                  <div className="w-16 h-16 rounded-full bg-emerald-950/80 border border-emerald-700 text-emerald-400 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-9 h-9" />
                  </div>
                  <h3 className="text-xl font-bold text-[#DFC57B] mb-2">{t.requestSuccessTitle}</h3>
                  <p className="text-xs md:text-sm text-slate-200 leading-relaxed mb-6">
                    {t.requestSuccessDesc}
                  </p>

                  <button
                    type="button"
                    onClick={() => setActiveTab('client-login')}
                    className="px-6 py-2.5 rounded-xl theme-btn font-bold text-xs cursor-pointer shadow-md"
                  >
                    {t.backToLogin}
                  </button>
                </div>
              ) : (
                <div>
                  <div className="mb-4">
                    <h3 className="text-lg font-bold text-[#DFC57B] mb-1">{t.requestAccountTab}</h3>
                    <p className="text-xs text-slate-300">
                      {lang === 'ar'
                        ? 'قم بتعبئة بيانات منشأتكم وتعيين كلمة المرور لطلب تفعيل مساحة عمل خاصة بكم.'
                        : 'Formulez votre demande d\'ouverture d\'espace client.'}
                    </p>
                  </div>

                  {regError && (
                    <div className="mb-4 p-3 rounded-xl bg-amber-950/60 border border-amber-700 text-amber-200 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{regError}</span>
                    </div>
                  )}

                  <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-200 mb-1">
                          {t.fullNameLabel} *
                        </label>
                        <input
                          type="text"
                          required
                          value={regFullName}
                          onChange={(e) => setRegFullName(e.target.value)}
                          placeholder="Mohamed Alami"
                          className="w-full px-3 py-2 rounded-xl bg-[#0d1117] border border-[#30363d] focus:border-theme focus:outline-none text-white text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-200 mb-1">
                          {t.companyNameLabel} *
                        </label>
                        <input
                          type="text"
                          required
                          value={regCompany}
                          onChange={(e) => setRegCompany(e.target.value)}
                          placeholder="Société / Entreprise"
                          className="w-full px-3 py-2 rounded-xl bg-[#0d1117] border border-[#30363d] focus:border-theme focus:outline-none text-white text-xs"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-200 mb-1">
                          {t.emailLabel} *
                        </label>
                        <input
                          type="email"
                          required
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          placeholder="contact@entreprise.ma"
                          className="w-full px-3 py-2 rounded-xl bg-[#0d1117] border border-[#30363d] focus:border-theme focus:outline-none text-white text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-200 mb-1">
                          {t.phoneLabel} *
                        </label>
                        <input
                          type="tel"
                          required
                          value={regPhone}
                          onChange={(e) => setRegPhone(e.target.value)}
                          placeholder="+212600000000"
                          className="w-full px-3 py-2 rounded-xl bg-[#0d1117] border border-[#30363d] focus:border-theme focus:outline-none text-white text-xs"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-200 mb-1">
                          {t.passwordLabel} *
                        </label>
                        <input
                          type="password"
                          required
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full px-3 py-2 rounded-xl bg-[#0d1117] border border-[#30363d] focus:border-theme focus:outline-none text-white text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-200 mb-1">
                          {t.cityLabel}
                        </label>
                        <input
                          type="text"
                          value={regCity}
                          onChange={(e) => setRegCity(e.target.value)}
                          placeholder="El Jadida, Jorf Lasfar..."
                          className="w-full px-3 py-2 rounded-xl bg-[#0d1117] border border-[#30363d] focus:border-theme focus:outline-none text-white text-xs"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-200 mb-1">
                        {t.projectTypeLabel}
                      </label>
                      <select
                        value={regProjectType}
                        onChange={(e) => setRegProjectType(e.target.value as ProjectCategory)}
                        className="w-full px-3 py-2 rounded-xl bg-[#0d1117] border border-[#30363d] focus:border-theme focus:outline-none text-white text-xs"
                      >
                        <option value="tuyauterie">{t.typeTuyauterie}</option>
                        <option value="conduits">{t.typeConduits}</option>
                        <option value="cuves">{t.typeCuves}</option>
                        <option value="batiment">{t.typeBatiment}</option>
                        <option value="chaudieres">{t.typeChaudieres}</option>
                        <option value="autre">{t.typeAutre}</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-200 mb-1">
                        {lang === 'ar' ? 'ملاحظات المشروع' : 'Précisions sur les besoins'}
                      </label>
                      <textarea
                        rows={2}
                        value={regNotes}
                        onChange={(e) => setRegNotes(e.target.value)}
                        placeholder={lang === 'ar' ? 'ملاحظات فنية أو تفاصيل الموقع...' : 'Observations techniques particulières...'}
                        className="w-full px-3 py-2 rounded-xl bg-[#0d1117] border border-[#30363d] focus:border-theme focus:outline-none text-white text-xs resize-none"
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

          {/* TAB 4: FORGOT PASSWORD */}
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
                <h3 className="text-base font-bold text-[#DFC57B]">{t.forgotPasswordTitle}</h3>
              </div>

              {resetStep === 'request' && (
                <form onSubmit={handleForgotSubmit} className="space-y-4">
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {t.forgotPasswordDesc}
                  </p>

                  <div>
                    <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                      {t.emailLabel} *
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        required
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="votre-email@entreprise.ma"
                        className="w-full px-4 py-2.5 rounded-xl bg-[#0d1117] border border-[#30363d] focus:border-theme focus:outline-none text-white text-xs"
                      />
                      <Mail className={`absolute top-3 w-4 h-4 text-slate-400 pointer-events-none ${lang === 'ar' ? 'left-3' : 'right-3'}`} />
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

              {resetStep === 'email-sent' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-[#0d1117] border border-[#30363d]">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs mb-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>{t.resetEmailSentTitle}</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed mb-3">
                      {t.resetEmailSentDesc} <strong className="theme-text font-mono">{forgotEmail}</strong>
                    </p>

                    <div className="p-4 rounded-xl bg-[#161b22] border theme-border space-y-3">
                      <p className="text-xs text-slate-200 font-medium">
                        {t.simulatedEmailSubject}
                      </p>

                      <button
                        type="button"
                        onClick={handleOpenResetFromEmail}
                        className="w-full py-2.5 px-4 rounded-xl theme-btn font-bold text-xs flex items-center justify-center gap-2 shadow-lg cursor-pointer"
                      >
                        <KeyRound className="w-4 h-4" />
                        <span>{t.clickHereToReset}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {resetStep === 'create-new' && (
                <div className="space-y-4">
                  <div className="mb-2">
                    <h4 className="text-sm font-bold text-white mb-0.5">{t.resetPasswordTitle}</h4>
                    <p className="text-xs text-slate-300">
                      {t.resetPasswordDesc} (<span className="theme-text font-mono">{forgotEmail}</span>)
                    </p>
                  </div>

                  {passwordError && (
                    <div className="p-3 rounded-xl bg-red-950/60 border border-[#E50914] text-red-200 text-xs flex items-center gap-2">
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
                      <label className="block text-xs font-semibold text-slate-200 mb-1">
                        {t.newPasswordLabel} *
                      </label>
                      <div className="relative">
                        <input
                          type="password"
                          required
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="••••••••••••"
                          className="w-full px-3 py-2 rounded-xl bg-[#0d1117] border border-[#30363d] focus:border-theme focus:outline-none text-white text-xs"
                        />
                        <Lock className={`absolute top-2.5 w-4 h-4 text-slate-400 pointer-events-none ${lang === 'ar' ? 'left-3' : 'right-3'}`} />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-200 mb-1">
                        {t.confirmPasswordLabel} *
                      </label>
                      <div className="relative">
                        <input
                          type="password"
                          required
                          value={confirmNewPassword}
                          onChange={(e) => setConfirmNewPassword(e.target.value)}
                          placeholder="••••••••••••"
                          className="w-full px-3 py-2 rounded-xl bg-[#0d1117] border border-[#30363d] focus:border-theme focus:outline-none text-white text-xs"
                        />
                        <Lock className={`absolute top-2.5 w-4 h-4 text-slate-400 pointer-events-none ${lang === 'ar' ? 'left-3' : 'right-3'}`} />
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

        {/* Footer info & Language Switcher */}
        <div className="px-6 py-3 bg-[#0B192C] border-t border-[#30363d] flex items-center justify-between text-[11px] text-slate-300">
          <span className="flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-[#DFC57B]" />
            <span>ISONIL Maroc — El Jadida</span>
          </span>
          {onLanguageChange && (
            <button
              type="button"
              onClick={() => onLanguageChange(lang === 'ar' ? 'fr' : 'ar')}
              className="flex items-center gap-1 text-[#79C8E8] hover:underline font-semibold cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{lang === 'ar' ? 'Français' : 'العربية'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
