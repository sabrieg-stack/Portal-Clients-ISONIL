import React, { useState, useRef, useEffect } from 'react';
import { 
  Bell, 
  Check, 
  CheckCheck, 
  FileText, 
  Video, 
  Image as ImageIcon, 
  Building2, 
  ShieldCheck, 
  ExternalLink,
  X
} from 'lucide-react';
import { Language, NotificationItem } from '../types';
import { translations } from '../i18n/translations';

interface NotificationCenterProps {
  lang: Language;
  notifications: NotificationItem[];
  onMarkAllRead: () => void;
  onSelectNotification: (notif: NotificationItem) => void;
  onClearNotifications?: () => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  lang,
  notifications,
  onMarkAllRead,
  onSelectNotification,
}) => {
  const t = translations[lang];
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Close when clicked outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleNotificationClick = (notif: NotificationItem) => {
    onSelectNotification(notif);
    setIsOpen(false);
  };

  const getIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'attachment':
        return <FileText className="w-4 h-4 text-[#d4b996]" />;
      case 'project':
        return <Building2 className="w-4 h-4 text-sky-400" />;
      case 'account':
        return <ShieldCheck className="w-4 h-4 text-emerald-400" />;
      default:
        return <Bell className="w-4 h-4 text-amber-400" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl bg-[#21262d] hover:bg-[#30363d] text-slate-300 hover:text-white border border-[#30363d] transition-all cursor-pointer focus:outline-none"
        title={t.notificationsTitle}
        aria-label={t.notificationsTitle}
      >
        <Bell className="w-4 h-4 text-[#d4b996]" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-[#d4b996] text-[10px] font-bold text-slate-950 ring-2 ring-[#0d1117] animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div 
          className={`absolute ${
            lang === 'ar' ? 'left-0 sm:left-auto sm:right-auto right-0' : 'right-0'
          } mt-2 w-80 sm:w-96 bg-[#161b22] border border-[#30363d] rounded-2xl shadow-2xl z-50 overflow-hidden backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150`}
        >
          {/* Header */}
          <div className="p-3.5 border-b border-[#30363d] bg-[#0d1117] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-[#d4b996]" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                {t.notificationsTitle}
              </h4>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-[#d4b996]/20 text-[#d4b996] border border-[#d4b996]/40 text-[10px] font-mono">
                  {unreadCount} {t.unreadCount}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={onMarkAllRead}
                  className="text-[11px] text-[#d4b996] hover:underline flex items-center gap-1 cursor-pointer"
                  title={t.markAllRead}
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>{t.markAllRead}</span>
                </button>
              )}
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#21262d] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-[#21262d]">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                <Bell className="w-8 h-8 mx-auto mb-2 text-slate-600 opacity-50" />
                <p>{t.noNotifications}</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-3 transition-colors cursor-pointer flex items-start gap-3 hover:bg-[#21262d]/70 ${
                    !notif.read ? 'bg-[#0d1117]/60' : 'opacity-80'
                  }`}
                >
                  <div className="w-8 h-8 rounded-xl bg-[#21262d] border border-[#30363d] flex items-center justify-center shrink-0 mt-0.5">
                    {getIcon(notif.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <p className={`text-xs font-semibold truncate ${!notif.read ? 'text-white' : 'text-slate-300'}`}>
                        {notif.title}
                      </p>
                      {!notif.read && (
                        <span className="w-2 h-2 rounded-full bg-[#d4b996] shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                      {notif.message}
                    </p>
                    <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-500">
                      <span>{new Date(notif.date).toLocaleDateString(lang === 'ar' ? 'ar-MA' : 'fr-FR', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}</span>
                      {(notif.targetAttachmentId || notif.targetProjectId) && (
                        <span className="text-[#d4b996] flex items-center gap-1 font-medium hover:underline">
                          <span>{lang === 'ar' ? 'عرض مباشر' : 'Ouvrir'}</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
