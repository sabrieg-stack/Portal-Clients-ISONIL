import React, { useState, useRef, useEffect } from 'react';
import { 
  Phone, 
  Mail, 
  MapPin, 
  MessageCircle, 
  Globe, 
  LogOut, 
  ArrowLeft, 
  ArrowRight,
  Shield,
  Building2,
  Palette,
  ChevronDown,
  Sparkles,
  Clock,
  ExternalLink,
  ChevronUp,
  Headphones,
  LayoutGrid,
  FolderKanban,
  Check
} from 'lucide-react';
import { Language, User, LayoutModel, ThemeColor, NotificationItem } from '../types';
import { translations } from '../i18n/translations';
import { NotificationCenter } from './NotificationCenter';

interface HeaderProps {
  lang: Language;
  onLanguageChange: (lang: Language) => void;
  currentUser: User | null;
  isAuthScreen?: boolean;
  activeAdminSubView?: 'dashboard' | 'workspace';
  onAdminSubViewChange?: (view: 'dashboard' | 'workspace') => void;
  onLogout: () => void;
  onBack?: () => void;
  canGoBack?: boolean;
  onShowAuthModal?: () => void;
  layoutModel: LayoutModel;
  onLayoutChange: (model: LayoutModel) => void;
  themeColor: ThemeColor;
  onThemeChange: (theme: ThemeColor) => void;
  notifications: NotificationItem[];
  onMarkAllNotificationsRead: () => void;
  onSelectNotification: (notif: NotificationItem) => void;
}

export const Header: React.FC<HeaderProps> = ({
  lang,
  onLanguageChange,
  currentUser,
  isAuthScreen = false,
  activeAdminSubView = 'workspace',
  onAdminSubViewChange,
  onLogout,
  onBack,
  canGoBack = false,
  layoutModel,
  onLayoutChange,
  themeColor,
  onThemeChange,
  notifications,
  onMarkAllNotificationsRead,
  onSelectNotification,
}) => {
  const t = translations[lang];

  // Dropdown states
  const [showContactMenu, setShowContactMenu] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const contactMenuRef = useRef<HTMLDivElement>(null);
  const themeMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (contactMenuRef.current && !contactMenuRef.current.contains(event.target as Node)) {
        setShowContactMenu(false);
      }
      if (themeMenuRef.current && !themeMenuRef.current.contains(event.target as Node)) {
        setShowThemeMenu(false);
      }
    }
    if (showContactMenu || showThemeMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showContactMenu, showThemeMenu]);

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent("Centre Andalousie El Jadida Maroc")}`;
  const whatsappUrl = "https://wa.me/212710738409";
  const phoneCallUrl = "tel:+212710738409";
  const emailMailtoUrl = "mailto:contact@isonil.com?subject=Demande%20Portail%20Clients%20ISONIL";

  const themeOptions: { id: ThemeColor; label: string; color: string }[] = [
    { id: 'beige', label: t.themeBeige, color: '#DFC57B' },
    { id: 'silver', label: t.themeSilver, color: '#A9DDF1' },
    { id: 'bronze', label: t.themeBronze, color: '#f59e0b' },
    { id: 'navy', label: t.themeNavy, color: '#79C8E8' },
    { id: 'emerald', label: t.themeEmerald, color: '#10b981' },
  ];

  const activeThemeObj = themeOptions.find((o) => o.id === themeColor) || themeOptions[0];

  // Login screen header: Only the official ISONIL logo image + Language Switcher (AR / FR)
  if (!currentUser || isAuthScreen) {
    return (
      <header className="sticky top-0 z-40 bg-[#0B192C]/95 backdrop-blur-md border-b border-[#79C8E8]/20 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center shrink-0">
            <img 
              src="/logo.png" 
              alt="ISONIL" 
              className="h-10 md:h-11 w-auto object-contain select-none"
            />
          </div>

          <button
            type="button"
            onClick={() => onLanguageChange(lang === 'ar' ? 'fr' : 'ar')}
            className="h-9 flex items-center gap-2 px-3.5 rounded-xl bg-[#112239] hover:bg-[#162942] text-white border border-[#79C8E8]/30 transition-all font-semibold text-xs cursor-pointer"
            title={t.switchLanguage}
            aria-label={t.switchLanguage}
          >
            <Globe className="w-3.5 h-3.5 text-[#DFC57B]" />
            <span>{lang === 'ar' ? 'Français' : 'العربية'}</span>
          </button>
        </div>
      </header>
    );
  }

  const showLayoutSelector = currentUser.role !== 'admin' || activeAdminSubView === 'workspace';

  // Authenticated Portal Header: Visually balanced single top bar with uniform 36px (h-9) controls
  return (
    <header className="sticky top-0 z-40 bg-[#0B192C]/95 backdrop-blur-md border-b border-[#79C8E8]/20 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 md:px-6 min-h-[64px] py-2 flex flex-wrap lg:flex-nowrap items-center justify-between gap-3">
        
        {/* Left: Back Button + Logo Only + Admin View Switcher */}
        <div className="flex items-center gap-3 min-w-0">
          {canGoBack && onBack && (
            <button
              onClick={onBack}
              className="h-9 flex items-center gap-1.5 px-3 rounded-xl bg-[#112239] hover:bg-[#162942] text-slate-200 hover:text-white border border-[#79C8E8]/25 transition-colors text-xs font-semibold cursor-pointer shrink-0"
              title={t.back}
            >
              {lang === 'ar' ? <ArrowRight className="w-3.5 h-3.5 theme-text" /> : <ArrowLeft className="w-3.5 h-3.5 theme-text" />}
              <span className="hidden xl:inline">{t.back}</span>
            </button>
          )}

          {/* Brand Logo Only (Text removed as requested) */}
          <div className="flex items-center shrink-0">
            <img 
              src="/logo.png" 
              alt="ISONIL" 
              className="h-9 md:h-10 w-auto object-contain select-none"
            />
          </div>

          {/* Admin Sub-View Switcher Integrated into the Single Header */}
          {currentUser.role === 'admin' && onAdminSubViewChange && (
            <div className="h-9 flex items-center gap-1 bg-[#112239] p-1 rounded-xl border border-[#79C8E8]/25 ms-1">
              <button
                onClick={() => onAdminSubViewChange('dashboard')}
                className={`h-7 flex items-center gap-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeAdminSubView === 'dashboard'
                    ? 'theme-btn font-bold shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-[#162942]'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>{lang === 'ar' ? 'لوحة القيادة' : 'Tableau de bord'}</span>
              </button>
              <button
                onClick={() => onAdminSubViewChange('workspace')}
                className={`h-7 flex items-center gap-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeAdminSubView === 'workspace'
                    ? 'theme-btn font-bold shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-[#162942]'
                }`}
              >
                <FolderKanban className="w-3.5 h-3.5" />
                <span>{lang === 'ar' ? 'بوابة المرفقات' : 'Boîte Fichiers'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Right / Unified Toolbar: All items balanced at h-9 (36px) */}
        <div className="flex flex-wrap items-center justify-end gap-2 ms-auto">
          
          {/* Single Layout Model Selector */}
          {showLayoutSelector && (
            <div className="h-9 flex items-center gap-1.5 bg-[#112239] px-3 rounded-xl border border-[#79C8E8]/25" title={t.layoutModelsTitle}>
              <Sparkles className="w-3.5 h-3.5 theme-text shrink-0" />
              <select
                value={layoutModel}
                onChange={(e) => onLayoutChange(e.target.value as LayoutModel)}
                className="bg-transparent theme-text text-xs font-bold focus:outline-none cursor-pointer max-w-[155px] sm:max-w-[185px] truncate"
                title={t.layoutModelsTitle}
              >
                <option value="horizontal" className="bg-[#112239] text-white">{t.layoutHorizontal}</option>
                <option value="sidebar" className="bg-[#112239] text-white">{t.layoutSidebar}</option>
                <option value="grid" className="bg-[#112239] text-white">{t.layoutGrid}</option>
                <option value="timeline" className="bg-[#112239] text-white">{t.layoutTimeline}</option>
                <option value="compact" className="bg-[#112239] text-white">{t.layoutCompact}</option>
              </select>
            </div>
          )}

          {/* Theme Color Dropdown Menu (قائمة منسدلة للألوان بدلاً من المصفوفة) */}
          <div className="relative" ref={themeMenuRef}>
            <button
              type="button"
              onClick={() => setShowThemeMenu(!showThemeMenu)}
              className="h-9 flex items-center gap-2 px-3 rounded-xl bg-[#112239] hover:bg-[#162942] text-slate-200 border border-[#79C8E8]/25 transition-all text-xs font-semibold cursor-pointer"
              title={t.themeColorTitle}
            >
              <Palette className="w-3.5 h-3.5 theme-text shrink-0" />
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0 border border-white/40"
                style={{ backgroundColor: activeThemeObj.color }}
              />
              <span className="hidden md:inline max-w-[95px] truncate">{activeThemeObj.label}</span>
              {showThemeMenu ? (
                <ChevronUp className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              )}
            </button>

            {showThemeMenu && (
              <div
                className={`absolute top-full mt-2 w-48 bg-[#112239] border border-[#79C8E8]/30 rounded-2xl p-1.5 shadow-2xl z-50 backdrop-blur-xl ${
                  lang === 'ar' ? 'left-0' : 'right-0'
                }`}
              >
                <div className="px-2.5 py-1.5 text-[10px] font-bold text-[#A9DDF1] uppercase tracking-wider border-b border-[#79C8E8]/15 mb-1">
                  {t.themeColorTitle}
                </div>
                {themeOptions.map((opt) => {
                  const isSelected = themeColor === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        onThemeChange(opt.id);
                        setShowThemeMenu(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-[#0B192C] text-white font-bold'
                          : 'text-slate-300 hover:bg-[#162942] hover:text-white'
                      }`}
                    >
                      <span className="flex items-center gap-2.5 truncate">
                        <span
                          className="w-3 h-3 rounded-full shrink-0 border border-white/30"
                          style={{ backgroundColor: opt.color }}
                        />
                        <span className="truncate">{opt.label}</span>
                      </span>
                      {isSelected && <Check className="w-3.5 h-3.5 theme-text shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Unified Contact Dropdown */}
          <div className="relative" ref={contactMenuRef}>
            <button
              type="button"
              onClick={() => setShowContactMenu(!showContactMenu)}
              className="h-9 flex items-center gap-1.5 px-3 rounded-xl bg-[#112239] hover:bg-[#162942] text-slate-200 border border-[#79C8E8]/25 transition-all font-semibold text-xs cursor-pointer"
              title={t.contactDetailsTitle}
            >
              <Headphones className="w-3.5 h-3.5 theme-text shrink-0" />
              <span className="hidden xl:inline">{t.contactDetailsMenu}</span>
              {showContactMenu ? (
                <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              )}
            </button>

            {showContactMenu && (
              <div 
                className={`absolute top-full mt-2 w-80 sm:w-96 bg-[#112239] border border-[#79C8E8]/30 rounded-2xl p-4 shadow-2xl z-50 backdrop-blur-xl ${
                  lang === 'ar' ? 'left-0 sm:right-0 sm:left-auto' : 'right-0 sm:left-0 sm:right-auto'
                }`}
              >
                <div className="border-b border-[#79C8E8]/20 pb-2.5 mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Headphones className="w-4 h-4 theme-text" />
                    <h4 className="font-bold text-white text-xs uppercase tracking-wider">
                      {t.contactDetailsTitle}
                    </h4>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#0B192C] text-emerald-400 border border-emerald-900 font-mono">
                    {lang === 'ar' ? 'متاح الآن' : 'DISPONIBLE'}
                  </span>
                </div>

                <div className="space-y-2.5 text-xs">
                  <a
                    href={phoneCallUrl}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-[#0B192C] hover:bg-[#162942] border border-[#79C8E8]/25 transition-colors group cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-[#162942] flex items-center justify-center theme-text group-hover:scale-110 transition-transform">
                        <Phone className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">{t.callUs}</span>
                        <span className="font-mono font-bold text-white dir-ltr block">{t.companyPhone}</span>
                      </div>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-white" />
                  </a>

                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-2.5 rounded-xl bg-[#0B192C] hover:bg-[#162942] border border-[#79C8E8]/25 transition-colors group cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-[#162942] flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                        <MessageCircle className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">{t.whatsappUs}</span>
                        <span className="font-mono font-bold text-emerald-400 dir-ltr block">+212 7 10 73 84 09</span>
                      </div>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-white" />
                  </a>

                  <a
                    href={emailMailtoUrl}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-[#0B192C] hover:bg-[#162942] border border-[#79C8E8]/25 transition-colors group cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-[#162942] flex items-center justify-center theme-text group-hover:scale-110 transition-transform">
                        <Mail className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">{t.sendEmail}</span>
                        <span className="font-mono text-white block">{t.companyEmail}</span>
                      </div>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-white" />
                  </a>

                  <a
                    href={googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start justify-between p-2.5 rounded-xl bg-[#0B192C] hover:bg-[#162942] border border-[#79C8E8]/25 transition-colors group cursor-pointer"
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-[#162942] flex items-center justify-center theme-text shrink-0 mt-0.5 group-hover:scale-110 transition-transform">
                        <MapPin className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-slate-400 block text-[10px]">{t.headquartersAddressLabel}</span>
                        <span className="text-slate-200 block text-[11px] leading-snug">{t.companyAddress}</span>
                      </div>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-white shrink-0 ms-2 mt-1" />
                  </a>
                </div>

                <div className="mt-3 pt-2.5 border-t border-[#79C8E8]/20 flex items-center gap-2 text-[11px] text-slate-300">
                  <Clock className="w-3.5 h-3.5 theme-text shrink-0" />
                  <span>{t.workingHoursLabel}: <strong className="text-white">{t.workingHoursVal}</strong></span>
                </div>
              </div>
            )}
          </div>

          {/* Language Switcher */}
          <button
            type="button"
            onClick={() => onLanguageChange(lang === 'ar' ? 'fr' : 'ar')}
            className="h-9 flex items-center gap-1.5 px-3 rounded-xl bg-[#112239] hover:bg-[#162942] text-slate-200 border border-[#79C8E8]/25 transition-all font-semibold text-xs cursor-pointer"
            title={t.switchLanguage}
          >
            <Globe className="w-3.5 h-3.5 theme-text" />
            <span>{lang === 'ar' ? 'FR' : 'عربي'}</span>
          </button>

          {/* Notifications Center */}
          <NotificationCenter
            lang={lang}
            notifications={notifications}
            onMarkAllRead={onMarkAllNotificationsRead}
            onSelectNotification={onSelectNotification}
          />

          {/* User Profile Capsule */}
          <div className="h-9 flex items-center gap-2 px-2.5 rounded-xl bg-[#112239] border border-[#79C8E8]/25">
            <div className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
              currentUser.role === 'admin' 
                ? 'theme-bg-subtle theme-text theme-border border' 
                : 'bg-sky-950 text-sky-400 border border-sky-800'
            }`}>
              {currentUser.role === 'admin' ? <Shield className="w-3.5 h-3.5" /> : <Building2 className="w-3.5 h-3.5" />}
            </div>
            <div className="hidden md:flex flex-col text-start justify-center">
              <span className="text-[11px] font-semibold text-white max-w-[115px] truncate leading-none mb-0.5">
                {currentUser.companyName}
              </span>
              <span className="text-[10px] theme-text truncate max-w-[115px] leading-none">
                {currentUser.fullName}
              </span>
            </div>
          </div>

          {/* Logout Button */}
          <button
            type="button"
            onClick={onLogout}
            className="h-9 flex items-center gap-1.5 px-3 rounded-xl bg-[#112239] hover:bg-[#E50914]/20 text-slate-200 hover:text-white border border-[#79C8E8]/25 hover:border-[#E50914]/40 transition-colors text-xs font-semibold cursor-pointer"
            title={t.logout}
          >
            <LogOut className={`w-3.5 h-3.5 text-slate-300 ${lang === 'ar' ? 'rotate-180' : ''}`} />
            <span className="hidden xl:inline">{t.logout}</span>
          </button>

        </div>
      </div>
    </header>
  );
};
