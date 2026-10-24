import React from 'react';
import { 
  ShieldAlert, 
  Lock, 
  ArrowRight, 
  ArrowLeft, 
  LogOut, 
  Building2, 
  Mail, 
  User as UserIcon, 
  CheckCircle2, 
  PhoneCall, 
  MessageSquare,
  ShieldCheck
} from 'lucide-react';
import { Language, User } from '../types';

interface UnauthorizedViewProps {
  lang: Language;
  currentUser: User;
  attemptedPath?: string;
  onReturnToClientWorkspace: () => void;
  onSignOutAndSwitchAccount: () => void;
}

export const UnauthorizedView: React.FC<UnauthorizedViewProps> = ({
  lang,
  currentUser,
  attemptedPath = '/#admin',
  onReturnToClientWorkspace,
  onSignOutAndSwitchAccount,
}) => {
  const isAr = lang === 'ar';

  return (
    <div className="min-h-[calc(100vh-140px)] flex items-center justify-center p-4 md:p-8 animate-fadeIn">
      <div className="w-full max-w-2xl bg-[#112239] border border-amber-500/30 rounded-3xl p-6 md:p-10 shadow-2xl relative overflow-hidden backdrop-blur-xl">
        {/* Subtle glowing background ambient */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#79C8E8]/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20"></div>

        <div className="relative z-10 flex flex-col items-center text-center space-y-6">
          {/* Top Security Icon Badge */}
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center shadow-lg shadow-amber-500/10">
              <ShieldAlert className="w-10 h-10 text-amber-400 animate-pulse" />
            </div>
            <div className="absolute -bottom-1 -end-1 w-7 h-7 rounded-full bg-[#0B192C] border border-amber-500/40 flex items-center justify-center">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
            </div>
          </div>

          {/* 403 Forbidden Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/35 text-amber-300 text-xs font-mono font-bold tracking-wider uppercase">
            <span>HTTP 403 · {isAr ? 'وصول مقيد للإدارة فقط' : 'Accès Direction Restreint'}</span>
          </div>

          {/* Title & Description */}
          <div className="space-y-2 max-w-lg">
            <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">
              {isAr ? 'غير مصرح بالدخول إلى بوابة الإدارة' : 'Accès Non Autorisé à la Direction'}
            </h2>
            <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
              {isAr
                ? `لقد حاولت الوصول إلى المسار المخصص للإدارة (${attemptedPath})، ولكن حسابك الحالي مصرح له فقط بالدخول إلى بوابة ومساحة عمل العملاء.`
                : `Vous tentez d'accéder à la route d'administration (${attemptedPath}). Votre compte actuel est authentifié comme client et ne dispose pas des privilèges administrateur.`}
            </p>
          </div>

          {/* Authenticated Account Details Card */}
          <div className="w-full bg-[#0B192C]/90 border border-[#79C8E8]/20 rounded-2xl p-5 text-start space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                {isAr ? 'بيانات الجلسة الموثقة' : 'Session Authentifiée'}
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[11px] font-semibold">
                <ShieldCheck className="w-3 h-3" />
                <span>{isAr ? 'موثق عبر Firestore' : 'Vérifié via Firestore'}</span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="flex items-center gap-2.5 text-slate-300">
                <UserIcon className="w-4 h-4 text-[#DFC57B] shrink-0" />
                <span className="truncate">
                  <strong className="text-white">{currentUser.fullName}</strong>
                </span>
              </div>

              <div className="flex items-center gap-2.5 text-slate-300">
                <Building2 className="w-4 h-4 text-[#DFC57B] shrink-0" />
                <span className="truncate">{currentUser.companyName}</span>
              </div>

              <div className="flex items-center gap-2.5 text-slate-300">
                <Mail className="w-4 h-4 text-[#79C8E8] shrink-0" />
                <span className="truncate font-mono">{currentUser.email}</span>
              </div>

              <div className="flex items-center gap-2.5 text-slate-300">
                <span className="w-4 h-4 flex items-center justify-center font-bold text-slate-400 shrink-0">#</span>
                <span>
                  {isAr ? 'الدور المعتمد:' : 'Rôle attribué:'}{' '}
                  <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold uppercase font-mono text-[10px]">
                    {currentUser.role}
                  </span>
                </span>
              </div>
            </div>

            <div className="pt-2 text-[11px] text-slate-300 flex items-center gap-2 border-t border-slate-800/80">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>
                {isAr
                  ? 'مشاريعك وتقاريرك وملفاتك الصناعية محفوظة بالكامل في مساحة عمل العميل الخاصة بك.'
                  : 'Vos projets et documents techniques restent accessibles en toute sécurité dans votre espace client.'}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="w-full flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={onReturnToClientWorkspace}
              className="w-full sm:w-auto flex-1 h-11 px-6 rounded-xl bg-[#DFC57B] hover:bg-[#d4b663] text-[#0B192C] font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-[#DFC57B]/20 cursor-pointer"
            >
              {isAr ? (
                <>
                  <ArrowRight className="w-4 h-4" />
                  <span>الذهاب إلى مساحة عمل العميل</span>
                </>
              ) : (
                <>
                  <ArrowLeft className="w-4 h-4" />
                  <span>Accéder à mon espace client</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onSignOutAndSwitchAccount}
              className="w-full sm:w-auto h-11 px-5 rounded-xl bg-[#0B192C] hover:bg-[#162942] text-slate-200 hover:text-white border border-[#79C8E8]/30 font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4 text-amber-400" />
              <span>{isAr ? 'تسجيل الخروج والتبديل لحساب مشرف' : 'Changer de compte administrateur'}</span>
            </button>
          </div>

          {/* Direct Support Contacts */}
          <div className="pt-4 border-t border-[#79C8E8]/15 w-full flex flex-wrap items-center justify-center gap-4 text-[11px] text-slate-300">
            <span className="text-slate-300">
              {isAr ? 'هل تحتاج إلى مساعدة أو ترقية صلاحيات؟' : 'Besoin d\'assistance technique ?'}
            </span>
            <a
              href="tel:+212710738409"
              className="inline-flex items-center gap-1 text-[#79C8E8] hover:underline"
            >
              <PhoneCall className="w-3 h-3" />
              <span>+212710738409</span>
            </a>
            <a
              href="mailto:contact@isonil.com"
              className="inline-flex items-center gap-1 text-[#79C8E8] hover:underline"
            >
              <Mail className="w-3 h-3" />
              <span>contact@isonil.com</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
