import React, { useState, useEffect } from 'react';
import { ChevronRight, ShieldCheck, Flame, Compass, Globe } from 'lucide-react';
import { Language } from '../types';
import { translations } from '../i18n/translations';

interface CinematicWelcomeProps {
  lang: Language;
  onLanguageChange?: (lang: Language) => void;
  onFinish: () => void;
}

export const CinematicWelcome: React.FC<CinematicWelcomeProps> = ({
  lang,
  onLanguageChange,
  onFinish,
}) => {
  const [secondsLeft, setSecondsLeft] = useState(3);
  const t = translations[lang];

  useEffect(() => {
    if (secondsLeft <= 0) {
      onFinish();
      return;
    }

    const timer = setInterval(() => {
      setSecondsLeft((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [secondsLeft, onFinish]);

  const progressPercent = ((3 - secondsLeft) / 3) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B192C] overflow-hidden select-none">
      {/* Background professional worker image in ISONIL uniform */}
      <div 
        className="absolute inset-0 bg-cover bg-center transition-transform duration-[3000ms] ease-out scale-105"
        style={{
          backgroundImage: `url('/1000127391_10ae27f3.jpg')`,
          filter: 'brightness(0.55) contrast(1.12)',
        }}
      />

      {/* Subtle translucent visual treatment */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0B192C] via-[#0B192C]/70 to-[#0B192C]/85" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-[#0B192C]/45 to-[#0B192C]/95" />

      {/* Top Bar with Official ISONIL Logo, Language Switcher, and Skip Button */}
      <div className="absolute top-0 left-0 right-0 p-5 md:p-8 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <img 
            src="/logo.png" 
            alt="ISONIL" 
            className="h-10 md:h-12 w-auto object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]"
          />
        </div>

        <div className="flex items-center gap-2.5">
          {onLanguageChange && (
            <button
              type="button"
              onClick={() => onLanguageChange(lang === 'ar' ? 'fr' : 'ar')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#161b22]/90 hover:bg-[#21262d] text-white font-semibold text-xs md:text-sm backdrop-blur-md border border-[#30363d] transition-all cursor-pointer shadow-lg"
              title={t.switchLanguage}
            >
              <Globe className="w-4 h-4 text-[#DFC57B]" />
              <span>{lang === 'ar' ? 'Français' : 'العربية'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={onFinish}
            className="group flex items-center gap-2 px-5 py-2 rounded-full bg-[#161b22]/90 hover:bg-[#DFC57B] text-white hover:text-slate-950 font-bold text-xs md:text-sm backdrop-blur-md border border-[#30363d] hover:border-[#DFC57B] transition-all duration-300 shadow-xl cursor-pointer"
          >
            <span>{t.cinematicSkip}</span>
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-white/20 text-xs font-mono">
              {secondsLeft}s
            </span>
            <ChevronRight className={`w-4 h-4 transition-transform duration-300 ${lang === 'ar' ? 'rotate-180 group-hover:-translate-x-1' : 'group-hover:translate-x-1'}`} />
          </button>
        </div>
      </div>

      {/* Center Welcome Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center flex flex-col items-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#161b22]/90 border border-[#DFC57B]/35 text-[#DFC57B] text-xs md:text-sm font-semibold tracking-wide backdrop-blur-md mb-6 shadow-2xl">
          <Flame className="w-4 h-4 text-[#DFC57B]" />
          <span>{t.companySubtitle}</span>
          <span className="text-slate-500">·</span>
          <span>{lang === 'ar' ? 'الجديدة، المغرب' : 'El Jadida, Maroc'}</span>
        </div>

        <h1 className="text-3xl md:text-5xl font-extrabold text-[#DFC57B] tracking-tight leading-tight md:leading-snug drop-shadow-[0_4px_24px_rgba(0,0,0,0.9)] max-w-3xl mb-4">
          {t.cinematicTitle}
        </h1>

        <p className="text-white/90 text-base md:text-lg font-normal max-w-2xl leading-relaxed drop-shadow-md mb-8">
          {t.cinematicSubtitle}
        </p>

        {/* Smooth 3-second progress bar */}
        <div className="w-full max-w-md bg-slate-900/80 rounded-full h-2 overflow-hidden border border-[#30363d] backdrop-blur-sm shadow-inner mb-6">
          <div 
            className="h-full bg-gradient-to-r from-[#DFC57B] to-[#79C8E8] transition-all duration-1000 ease-linear rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4 text-xs md:text-sm text-slate-300">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#79C8E8]" />
            <span>{lang === 'ar' ? 'معايير الجودة والسلامة الصناعية المعتمدة' : 'Conformité Qualité & Sécurité Industrielle'}</span>
          </span>
          <span className="text-slate-600">·</span>
          <span className="flex items-center gap-1.5">
            <Compass className="w-4 h-4 text-[#DFC57B]" />
            <span>{lang === 'ar' ? 'الجرف الأصفر والمناطق الصناعية' : 'Jorf Lasfar & Régions Industrielles'}</span>
          </span>
        </div>
      </div>

      {/* Bottom indicator */}
      <div className="absolute bottom-6 text-center text-slate-400 text-xs z-10 font-mono tracking-wider">
        {lang === 'ar' ? 'إيزونيل المغرب — بوابة العملاء والأرشيف الهندسي' : 'ISONIL MAROC — PORTAIL CLIENTS & ARCHIVES'}
      </div>
    </div>
  );
};
