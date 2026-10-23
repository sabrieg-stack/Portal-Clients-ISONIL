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
  Headphones
} from 'lucide-react';
import { Language, User, LayoutModel, ThemeColor, NotificationItem } from '../types';
import { translations } from '../i18n/translations';
import { NotificationCenter } from './NotificationCenter';

interface HeaderProps {
  lang: Language;
  onLanguageChange: (lang: Language) => void;
  currentUser: User | null;
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
  onLogout,
  onBack,
  canGoBack = false,
  onShowAuthModal,
  layoutModel,
  onLayoutChange,
  themeColor,
  onThemeChange,
  notifications,
  onMarkAllNotificationsRead,
  onSelectNotification,
}) => {
  const t = translations[lang];

  // Contact Dropdown state
  const [showContactMenu, setShowContactMenu] = useState(false);
  const contactMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (contactMenuRef.current && !contactMenuRef.current.contains(event.target as Node)) {
        setShowContactMenu(false);
      }
    }
    if (showContactMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showContactMenu]);

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent("Centre Andalousie El Jadida Maroc")}`;
  const whatsappUrl = "https://wa.me/212710738409";
  const phoneCallUrl = "tel:+212710738409";
  const emailMailtoUrl = "mailto:contact@isonil.com?subject=Demande%20Portail%20Clients%20ISONIL";

  const themeOptions: { id: ThemeColor; label: string; color: string }[] = [
    { id: 'beige', label: t.themeBeige, color: '#d4b996' },
    { id: 'silver', label: t.themeSilver, color: '#cbd5e1' },
    { id: 'bronze', label: t.themeBronze, color: '#f59e0b' },
    { id: 'navy', label: t.themeNavy, color: '#38bdf8' },
    { id: 'emerald', label: t.themeEmerald, color: '#10b981' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#0d1117]/95 backdrop-blur-md border-b border-[#21262d] shadow-lg">
      
      {/* 1. TOP MICRO-BAR: Single Unified Contact Dropdown + Color Palette + Language Switcher */}
      <div className="bg-[#161b22]/95 border-b border-[#21262d] py-1.5 px-4 md:px-8 text-xs text-slate-300">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          
          {/* Unified Contact Methods Dropdown Menu (بيانات التواصل) */}
          <div className="relative" ref={contactMenuRef}>
            <button
              onClick={() => setShowContactMenu(!showContactMenu)}
              className="flex items-center gap-2 px-3 py-1 rounded-lg bg-[#21262d] hover:bg-[#30363d] text-slate-200 border border-[#30363d] transition-all font-medium cursor-pointer"
              title={t.contactDetailsTitle}
            >
              <Headphones className="w-3.5 h-3.5 theme-text" />
              <span className="font-semibold text-xs">{t.contactDetailsMenu}</span>
              {showContactMenu ? (
                <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              )}
            </button>

            {/* Contact Dropdown Popover */}
            {showContactMenu && (
              <div 
                className={`absolute top-full mt-2 w-80 sm:w-96 bg-[#161b22] border border-[#30363d] rounded-2xl p-4 shadow-2xl z-50 backdrop-blur-xl ${
                  lang === 'ar' ? 'right-0' : 'left-0'
                }`}
              >
                <div className="border-b border-[#21262d] pb-2.5 mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Headphones className="w-4 h-4 theme-text" />
                    <h4 className="font-bold text-white text-xs uppercase tracking-wider">
                      {t.contactDetailsTitle}
                    </h4>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#0d1117] text-emerald-400 border border-emerald-900 font-mono">
                    DISPONIBLE
                  </span>
                </div>

                <div className="space-y-2.5 text-xs">
                  {/* Phone */}
                  <a
                    href={phoneCallUrl}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-[#0d1117] hover:bg-[#21262d] border border-[#30363d] transition-colors group cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-[#21262d] flex items-center justify-center theme-text group-hover:scale-110 transition-transform">
                        <Phone className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">{t.callUs}</span>
                        <span className="font-mono font-bold text-slate-100 dir-ltr block">{t.companyPhone}</span>
                      </div>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-white" />
                  </a>

                  {/* WhatsApp */}
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-2.5 rounded-xl bg-[#0d1117] hover:bg-[#21262d] border border-[#30363d] transition-colors group cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-[#21262d] flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                        <MessageCircle className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">{t.whatsappUs}</span>
                        <span className="font-mono font-bold text-emerald-400 dir-ltr block">+212 7 10 73 84 09</span>
                      </div>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-white" />
                  </a>

                  {/* Email */}
                  <a
                    href={emailMailtoUrl}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-[#0d1117] hover:bg-[#21262d] border border-[#30363d] transition-colors group cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-[#21262d] flex items-center justify-center theme-text group-hover:scale-110 transition-transform">
                        <Mail className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">{t.sendEmail}</span>
                        <span className="font-mono text-slate-100 block">{t.companyEmail}</span>
                      </div>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-white" />
                  </a>

                  {/* Headquarters Address on Map */}
                  <a
                    href={googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start justify-between p-2.5 rounded-xl bg-[#0d1117] hover:bg-[#21262d] border border-[#30363d] transition-colors group cursor-pointer"
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-[#21262d] flex items-center justify-center theme-text shrink-0 mt-0.5 group-hover:scale-110 transition-transform">
                        <MapPin className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-slate-400 block text-[10px]">{t.headquartersAddressLabel}</span>
                        <span className="text-slate-200 block text-[11px] leading-snug">{t.companyAddress}</span>
                      </div>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-white shrink-0 ms-2 mt-1" />
                  </a>
                </div>

                {/* Working hours info */}
                <div className="mt-3 pt-2.5 border-t border-[#21262d] flex items-center gap-2 text-[11px] text-slate-400">
                  <Clock className="w-3.5 h-3.5 theme-text shrink-0" />
                  <span>{t.workingHoursLabel}: <strong className="text-slate-300">{t.workingHoursVal}</strong></span>
                </div>
              </div>
            )}
          </div>

          {/* Right Controls: Dynamic 5-Theme Color Swatches + Language Switcher */}
          <div className="flex items-center gap-3 ms-auto">
            {/* Color Themes Palette Bar */}
            <div 
              className="flex items-center gap-2 bg-[#0d1117] px-2.5 py-1 rounded-xl border border-[#30363d]" 
              title={t.themeColorTitle}
            >
              <Palette className="w-3.5 h-3.5 theme-text" />
              <div className="flex items-center gap-1.5">
                {themeOptions.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => onThemeChange(opt.id)}
                    style={{ backgroundColor: opt.color }}
                    className={`w-4 h-4 rounded-full transition-all cursor-pointer relative ${
                      themeColor === opt.id 
                        ? 'ring-2 ring-white ring-offset-1 ring-offset-[#0d1117] scale-110 shadow-md' 
                        : 'opacity-50 hover:opacity-100 hover:scale-105'
                    }`}
                    title={opt.label}
                    aria-label={opt.label}
                  />
                ))}
              </div>
            </div>

            {/* Language Switcher */}
            <button
              onClick={() => onLanguageChange(lang === 'ar' ? 'fr' : 'ar')}
              className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#21262d] hover:bg-[#30363d] text-slate-200 border border-[#30363d] transition-all font-medium text-xs cursor-pointer"
              title={t.switchLanguage}
            >
              <Globe className="w-3.5 h-3.5 theme-text" />
              <span>{lang === 'ar' ? 'Français' : 'العربية'}</span>
            </button>
          </div>

        </div>
      </div>

      {/* 2. MAIN HEADER BAR */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-3 flex items-center justify-between gap-4">
        {/* Left: Back button + ISONIL Logo only (No redundant text) */}
        <div className="flex items-center gap-4">
          {canGoBack && onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#21262d] hover:bg-[#30363d] text-slate-300 hover:text-white border border-[#30363d] transition-colors text-xs font-medium cursor-pointer"
              title={t.back}
            >
              {lang === 'ar' ? <ArrowRight className="w-4 h-4 theme-text" /> : <ArrowLeft className="w-4 h-4 theme-text" />}
              <span className="hidden sm:inline">{t.back}</span>
            </button>
          )}

          {/* Logo only - without redundant text next to it */}
          <div className="flex items-center">
            <img 
              src="/logo.png" 
              alt="ISONIL" 
              className="h-9 md:h-11 w-auto object-contain select-none"
            />
          </div>
        </div>

        {/* Center / Right: Persistent Layout Switcher Dropdown (5 Models) + Notifications + User */}
        <div className="flex items-center gap-3">
          {/* 5-Models Quick Switcher Dropdown (Always visible to both Admin and Client) */}
          <div className="hidden md:flex items-center gap-2 bg-[#161b22] px-2.5 py-1.5 rounded-xl border border-[#30363d]">
            <Sparkles className="w-3.5 h-3.5 theme-text" />
            <select
              value={layoutModel}
              onChange={(e) => onLayoutChange(e.target.value as LayoutModel)}
              className="bg-transparent theme-text text-xs font-bold focus:outline-none cursor-pointer max-w-[210px] truncate"
              title={t.layoutModelsTitle}
            >
              <option value="horizontal" className="bg-[#161b22] text-white">1. {t.layoutHorizontal}</option>
              <option value="sidebar" className="bg-[#161b22] text-white">2. {t.layoutSidebar}</option>
              <option value="grid" className="bg-[#161b22] text-white">3. {t.layoutGrid}</option>
              <option value="timeline" className="bg-[#161b22] text-white">4. {t.layoutTimeline}</option>
              <option value="compact" className="bg-[#161b22] text-white">5. {t.layoutCompact}</option>
            </select>
          </div>

          {/* Incoming Notifications Center */}
          <NotificationCenter
            lang={lang}
            notifications={notifications}
            onMarkAllRead={onMarkAllNotificationsRead}
            onSelectNotification={onSelectNotification}
          />

          {currentUser ? (
            <div className="flex items-center gap-3">
              {/* User profile capsule */}
              <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-[#161b22] border border-[#30363d]">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                  currentUser.role === 'admin' 
                    ? 'theme-bg-subtle theme-text theme-border border' 
                    : 'bg-sky-950 text-sky-400 border border-sky-800'
                }`}>
                  {currentUser.role === 'admin' ? <Shield className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
                </div>
                <div className="flex flex-col text-start">
                  <span className="text-xs font-semibold text-slate-100 max-w-[120px] sm:max-w-[160px] truncate">
                    {currentUser.companyName}
                  </span>
                  <span className="text-[10px] theme-text truncate max-w-[120px] sm:max-w-[160px]">
                    {currentUser.fullName}
                  </span>
                </div>
              </div>

              {/* Logout button */}
              <button
                onClick={onLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#21262d] hover:bg-[#30363d] text-slate-300 hover:text-white border border-[#30363d] transition-colors text-xs font-medium cursor-pointer"
                title={t.logout}
              >
                <LogOut className={`w-4 h-4 text-slate-400 ${lang === 'ar' ? 'rotate-180' : ''}`} />
                <span className="hidden sm:inline">{t.logout}</span>
              </button>
            </div>
          ) : (
            <button
              onClick={onShowAuthModal}
              className="flex items-center gap-2 px-4 py-2 rounded-xl theme-btn font-bold text-xs md:text-sm shadow-md transition-all cursor-pointer"
            >
              <span>{t.login}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
