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
  Check,
  SlidersHorizontal
} from 'lucide-react';
import { Language, User, LayoutModel, ThemeColor, IconSize, NotificationItem } from '../types';
import { translations } from '../i18n/translations';
import { NotificationCenter } from './NotificationCenter';

interface HeaderProps {
  lang: Language;
  onLanguageChange: (lang: Language) => void;
  currentUser: User | null;
  isAuthScreen?: boolean;
  isAdminPortalRoute?: boolean;
  onNavigateToClientRoute?: () => void;
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
  iconSize?: IconSize;
  onIconSizeChange?: (size: IconSize) => void;
  notifications: NotificationItem[];
  onMarkAllNotificationsRead: () => void;
  onSelectNotification: (notif: NotificationItem) => void;
}

export const Header: React.FC<HeaderProps> = ({
  lang,
  onLanguageChange,
  currentUser,
  isAuthScreen = false,
  isAdminPortalRoute = false,
  onNavigateToClientRoute,
  activeAdminSubView = 'workspace',
  onAdminSubViewChange,
  onLogout,
  onBack,
  canGoBack = false,
  layoutModel,
  onLayoutChange,
  themeColor,
  onThemeChange,
  iconSize = 'medium',
  onIconSizeChange,
  notifications,
  onMarkAllNotificationsRead,
  onSelectNotification,
}) => {
  const t = translations[lang];

  // Dropdown states
  const [showContactMenu, setShowContactMenu] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const contactMenuRef = useRef<HTMLDivElement>(null);
  const settingsMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (contactMenuRef.current && !contactMenuRef.current.contains(event.target as Node)) {
        setShowContactMenu(false);
      }
      if (settingsMenuRef.current && !settingsMenuRef.current.contains(event.target as Node)) {
        setShowSettingsMenu(false);
      }
    }
    if (showContactMenu || showSettingsMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showContactMenu, showSettingsMenu]);

  const whatsappUrl = "https://wa.me/212710738409";
  const phoneCallUrl = "tel:+212710738409";
  const emailMailtoUrl = "mailto:contact@isonil.com?subject=Demande%20Portail%20Clients%20ISONIL";

  const themeOptions: { id: ThemeColor; label: string; color: string; border?: string }[] = [
    { id: 'white', label: t.themeWhite, color: '#FFFFFF', border: '#CBD5E1' },
    { id: 'charcoal-navy', label: t.themeCharcoalNavy, color: '#26313A' },
    { id: 'petroleum-green', label: t.themePetroleumGreen, color: '#14564F' },
    { id: 'isonil-original', label: t.themeIsonilOriginal, color: '#151921' },
  ];

  const activeThemeObj = themeOptions.find((o) => o.id === themeColor) || themeOptions[0];

  // Login screen header: Official ISONIL logo image + Single Language Switcher (AR / FR)
  if (!currentUser || isAuthScreen) {
    return (
      <header className="sticky top-0 z-40 bg-[#0B192C]/95 backdrop-blur-md border-b border-[#79C8E8]/20 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 shrink-0">
            <img 
              src="/logo.png" 
              alt="ISONIL" 
              className="h-10 md:h-11 w-auto object-contain select-none"
            />
            {isAdminPortalRoute && (
              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#112239] border border-[#DFC57B]/40 text-[#DFC57B] text-[11px] font-bold">
                <Shield className="w-3 h-3" />
                <span>{lang === 'ar' ? 'بوابة الإدارة' : 'Administration'}</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isAdminPortalRoute && onNavigateToClientRoute && (
              <button
                type="button"
                onClick={onNavigateToClientRoute}
                className="h-9 hidden md:flex items-center gap-1.5 px-3 rounded-xl bg-[#112239] hover:bg-[#162942] text-slate-300 hover:text-white border border-[#79C8E8]/25 text-xs font-semibold transition-colors cursor-pointer"
                title={lang === 'ar' ? 'الرجوع إلى بوابة العملاء' : 'Retour au portail clients'}
              >
                {lang === 'ar' ? <ArrowRight className="w-3 h-3" /> : <ArrowLeft className="w-3 h-3" />}
                <span>{lang === 'ar' ? 'بوابة العملاء' : 'Portail Clients'}</span>
              </button>
            )}

            {/* Exactly ONE authoritative Language Switcher on the login screen */}
            <button
              type="button"
              onClick={() => onLanguageChange(lang === 'ar' ? 'fr' : 'ar')}
              className="h-9 flex items-center gap-2 px-3.5 rounded-xl bg-[#112239] hover:bg-[#162942] text-white border border-[#79C8E8]/30 transition-all font-semibold text-xs cursor-pointer shadow-sm"
              title={t.switchLanguage}
              aria-label={t.switchLanguage}
            >
              <Globe className="w-3.5 h-3.5 text-[#DFC57B]" />
              <span>{lang === 'ar' ? 'Français' : 'العربية'}</span>
            </button>
          </div>
        </div>
      </header>
    );
  }

  // Authenticated Portal Header: Unified, clean single top bar with fixed element ordering
  return (
    <header className="sticky top-0 z-40 bg-[#0B192C]/95 backdrop-blur-md border-b border-[#79C8E8]/20 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between gap-3">
        
        {/* Left / Start: Brand Logo & Admin Sub-View Switcher (Fixed Position) */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center shrink-0">
            <img 
              src="/logo.png" 
              alt="ISONIL" 
              className="h-9 md:h-10 w-auto object-contain select-none"
            />
          </div>

          {/* Admin Sub-View Switcher: Consistent across all admin screens on desktop */}
          {currentUser.role === 'admin' && onAdminSubViewChange && (
            <div className="h-9 hidden sm:flex items-center gap-1 bg-[#112239] p-1 rounded-xl border border-[#79C8E8]/25">
              <button
                type="button"
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
                type="button"
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

        {/* Right / End: Fixed Order Toolbar across ALL portal pages */}
        <div className="flex items-center justify-end gap-2 shrink-0">
          
          {/* 1. UI Settings Dropdown (Layout, Themes, Icon Sizes in one clean popover) */}
          <div className="relative" ref={settingsMenuRef}>
            <button
              type="button"
              onClick={() => setShowSettingsMenu(!showSettingsMenu)}
              className="h-9 flex items-center gap-2 px-2.5 sm:px-3 rounded-xl bg-[#112239] hover:bg-[#162942] text-slate-200 border border-[#79C8E8]/25 transition-all text-xs font-semibold cursor-pointer shrink-0"
              title={t.uiSettingsTitle}
              aria-label={t.uiSettingsTitle}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 theme-text shrink-0" />
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0 border border-white/40 shadow-xs"
                style={{ backgroundColor: activeThemeObj.color }}
              />
              <span className="hidden lg:inline text-xs font-semibold text-slate-200">
                {t.uiSettingsTitle}
              </span>
              {showSettingsMenu ? (
                <ChevronUp className="w-3 h-3 text-slate-400 shrink-0" />
              ) : (
                <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
              )}
            </button>

            {showSettingsMenu && (
              <div
                className={`absolute top-full mt-2 w-72 sm:w-80 bg-[#112239] border border-[#79C8E8]/30 rounded-2xl p-3.5 shadow-2xl z-50 backdrop-blur-xl ${
                  lang === 'ar' ? 'left-0' : 'right-0'
                }`}
              >
                {/* Popover Header */}
                <div className="pb-2.5 mb-3 border-b border-[#79C8E8]/20 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 theme-text" />
                    <h4 className="font-bold text-white text-xs uppercase tracking-wider">
                      {t.uiSettingsTitle}
                    </h4>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {activeThemeObj.label}
                  </span>
                </div>

                {/* Section A: Theme Selection (4 Themes) */}
                <div className="mb-3.5">
                  <div className="flex items-center gap-1.5 mb-2 text-[11px] font-bold text-slate-300">
                    <Palette className="w-3.5 h-3.5 theme-text" />
                    <span>{t.themeSectionTitle}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {themeOptions.map((opt) => {
                      const isSelected = themeColor === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => onThemeChange(opt.id)}
                          className={`flex items-center justify-between p-2 rounded-xl text-[11px] font-semibold border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[#0B192C] text-white border-[#DFC57B] shadow-sm ring-1 ring-[#DFC57B]/40'
                              : 'bg-[#0B192C]/50 text-slate-300 border-[#79C8E8]/15 hover:bg-[#162942] hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span
                              className="w-3 h-3 rounded-full shrink-0 border border-white/40"
                              style={{ backgroundColor: opt.color }}
                            />
                            <span className="truncate">{opt.label}</span>
                          </div>
                          {isSelected && <Check className="w-3 h-3 theme-text shrink-0 ms-1" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Section B: Sidebar / Layout Modes (3 Modes) */}
                <div className="mb-3.5 pt-3 border-t border-[#79C8E8]/15">
                  <div className="flex items-center gap-1.5 mb-2 text-[11px] font-bold text-slate-300">
                    <LayoutGrid className="w-3.5 h-3.5 theme-text" />
                    <span>{t.layoutSectionTitle}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: 'classic', label: t.layoutClassic },
                      { id: 'vertical-cards', label: t.layoutVerticalCards },
                      { id: 'creative', label: t.layoutCreative },
                    ].map((item) => {
                      const isSelected = layoutModel === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => onLayoutChange(item.id as LayoutModel)}
                          className={`py-1.5 px-2 rounded-xl text-[11px] font-bold text-center truncate border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[#DFC57B] text-[#0B192C] border-[#DFC57B] shadow-sm'
                              : 'bg-[#0B192C] text-slate-300 border-[#79C8E8]/15 hover:bg-[#162942] hover:text-white'
                          }`}
                          title={item.label}
                        >
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Section C: Icon Size Selection (3 Levels) */}
                {onIconSizeChange && (
                  <div className="pt-3 border-t border-[#79C8E8]/15">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-300">
                        <Sparkles className="w-3.5 h-3.5 theme-text" />
                        <span>{t.iconSizeSectionTitle}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {iconSize === 'small' ? t.iconSizeSmall : iconSize === 'large' ? t.iconSizeLarge : t.iconSizeMedium}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { id: 'small', label: t.iconSizeSmall, short: lang === 'ar' ? 'صغير' : 'Petite' },
                        { id: 'medium', label: t.iconSizeMedium, short: lang === 'ar' ? 'متوسط' : 'Moyenne' },
                        { id: 'large', label: t.iconSizeLarge, short: lang === 'ar' ? 'كبير' : 'Grande' },
                      ].map((size) => {
                        const isSelected = iconSize === size.id;
                        return (
                          <button
                            key={size.id}
                            type="button"
                            onClick={() => onIconSizeChange(size.id as IconSize)}
                            className={`py-1.5 px-2 rounded-xl text-[11px] font-bold text-center border transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-[#DFC57B] text-[#0B192C] border-[#DFC57B] shadow-sm'
                                : 'bg-[#0B192C] text-slate-300 border-[#79C8E8]/15 hover:bg-[#162942] hover:text-white'
                            }`}
                            title={size.label}
                          >
                            {size.short}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 2. Contact Details: Icon-only per User Request Point 5 */}
          <div className="relative" ref={contactMenuRef}>
            <button
              type="button"
              onClick={() => setShowContactMenu(!showContactMenu)}
              className="h-9 w-9 flex items-center justify-center rounded-xl bg-[#112239] hover:bg-[#162942] text-slate-200 border border-[#79C8E8]/25 transition-all cursor-pointer shrink-0"
              title={t.contactDetailsTitle}
              aria-label={t.contactDetailsTitle}
            >
              <Headphones className="w-4 h-4 theme-text" />
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

                  {/* Company Address - Plain static text only, unclickable and not linked to Google Maps */}
                  <div
                    className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[#0B192C] border border-[#79C8E8]/25 select-text"
                  >
                    <div className="w-7 h-7 rounded-lg bg-[#162942] flex items-center justify-center theme-text shrink-0 mt-0.5">
                      <MapPin className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-slate-400 block text-[10px]">{t.headquartersAddressLabel}</span>
                      <span className="text-slate-200 block text-[11px] leading-snug">{t.companyAddress}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-[#79C8E8]/20 flex items-center gap-2 text-[11px] text-slate-300">
                  <Clock className="w-3.5 h-3.5 theme-text shrink-0" />
                  <span>{t.workingHoursLabel}: <strong className="text-white">{t.workingHoursVal}</strong></span>
                </div>
              </div>
            )}
          </div>

          {/* 3. Language Switcher */}
          <button
            type="button"
            onClick={() => onLanguageChange(lang === 'ar' ? 'fr' : 'ar')}
            className="h-9 flex items-center gap-1.5 px-2.5 rounded-xl bg-[#112239] hover:bg-[#162942] text-slate-200 border border-[#79C8E8]/25 transition-all font-semibold text-xs cursor-pointer shrink-0"
            title={t.switchLanguage}
            aria-label={t.switchLanguage}
          >
            <Globe className="w-3.5 h-3.5 theme-text" />
            <span>{lang === 'ar' ? 'FR' : 'عربي'}</span>
          </button>

          {/* 4. Notifications Center */}
          <NotificationCenter
            lang={lang}
            notifications={notifications}
            onMarkAllRead={onMarkAllNotificationsRead}
            onSelectNotification={onSelectNotification}
          />

          {/* 5. User Profile Capsule */}
          <div className="h-9 flex items-center gap-2 px-2.5 rounded-xl bg-[#112239] border border-[#79C8E8]/25 shrink-0">
            <div className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
              currentUser.role === 'admin' 
                ? 'theme-bg-subtle theme-text theme-border border' 
                : 'bg-sky-950 text-sky-400 border border-sky-800'
            }`}>
              {currentUser.role === 'admin' ? <Shield className="w-3.5 h-3.5" /> : <Building2 className="w-3.5 h-3.5" />}
            </div>
            <div className="hidden md:flex flex-col text-start justify-center">
              <span className="text-[11px] font-semibold text-white max-w-[110px] truncate leading-none mb-0.5">
                {currentUser.companyName}
              </span>
              <span className="text-[10px] theme-text truncate max-w-[110px] leading-none">
                {currentUser.fullName}
              </span>
            </div>
          </div>

          {/* 6. Logout Button: Icon-only per User Request Point 5 */}
          <button
            type="button"
            onClick={onLogout}
            className="h-9 w-9 flex items-center justify-center rounded-xl bg-[#112239] hover:bg-[#E50914]/20 text-slate-200 hover:text-white border border-[#79C8E8]/25 hover:border-[#E50914]/40 transition-colors cursor-pointer shrink-0"
            title={t.logout}
            aria-label={t.logout}
          >
            <LogOut className={`w-4 h-4 text-slate-300 ${lang === 'ar' ? 'rotate-180' : ''}`} />
          </button>

        </div>
      </div>

      {/* Mobile-only Admin Switcher Bar (Structured 2-row discipline on mobile) */}
      {currentUser.role === 'admin' && onAdminSubViewChange && (
        <div className="sm:hidden px-4 pb-2 pt-0.5 flex items-center justify-center border-t border-[#79C8E8]/10 bg-[#0B192C]">
          <div className="h-8.5 w-full flex items-center justify-center gap-1 bg-[#112239] p-1 rounded-xl border border-[#79C8E8]/25">
            <button
              type="button"
              onClick={() => onAdminSubViewChange('dashboard')}
              className={`flex-1 h-7 flex items-center justify-center gap-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
                activeAdminSubView === 'dashboard'
                  ? 'theme-btn font-bold shadow-sm'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>{lang === 'ar' ? 'لوحة القيادة' : 'Tableau de bord'}</span>
            </button>
            <button
              type="button"
              onClick={() => onAdminSubViewChange('workspace')}
              className={`flex-1 h-7 flex items-center justify-center gap-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
                activeAdminSubView === 'workspace'
                  ? 'theme-btn font-bold shadow-sm'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <FolderKanban className="w-3.5 h-3.5" />
              <span>{lang === 'ar' ? 'المرفقات' : 'Fichiers'}</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
