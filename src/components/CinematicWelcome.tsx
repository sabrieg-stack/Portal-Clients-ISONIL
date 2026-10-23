import React, { useState, useEffect } from 'react';
import { ChevronRight, ShieldCheck, Flame, Compass } from 'lucide-react';
import { Language } from '../types';
import { translations } from '../i18n/translations';

interface CinematicWelcomeProps {
  lang: Language;
  onFinish: () => void;
}

export const CinematicWelcome: React.FC<CinematicWelcomeProps> = ({ lang, onFinish }) => {
  const [secondsLeft, setSecondsLeft] = useState(4);
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

  const progressPercent = ((4 - secondsLeft) / 4) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black overflow-hidden select-none">
      {/* Background cinematic image with slow zoom & drift */}
      <div 
        className="absolute inset-0 bg-cover bg-center transition-transform duration-[4000ms] ease-out scale-105"
        style={{
          backgroundImage: `url('/public/assets/aistudio/1000127391_10ae27f3.jpg')`,
          filter: 'brightness(0.60) contrast(1.15)',
        }}
      />

      {/* Industrial high-contrast gradient scrims */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0d1117] via-[#0d1117]/65 to-[#0d1117]/85" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-[#0d1117]/40 to-[#0d1117]/95" />

      {/* Top Bar with Company Quick Info and Skip Button */}
      <div className="absolute top-0 left-0 right-0 p-6 md:p-8 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <img 
            src="/public/assets/aistudio/1000127389_fa23437c.png" 
            alt="ISONIL Logo" 
            className="h-10 md:h-12 w-auto object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]"
          />
        </div>

        {/* Skip button with beige styling */}
        <button
          onClick={onFinish}
          className="group flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#161b22]/90 hover:bg-[#d4b996] text-white hover:text-slate-950 font-bold text-sm backdrop-blur-md border border-[#30363d] hover:border-[#d4b996] transition-all duration-300 shadow-xl cursor-pointer"
        >
          <span>{t.cinematicSkip}</span>
          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-white/20 text-xs font-mono">
            {secondsLeft}s
          </span>
          <ChevronRight className={`w-4 h-4 transition-transform duration-300 ${lang === 'ar' ? 'rotate-180 group-hover:-translate-x-1' : 'group-hover:translate-x-1'}`} />
        </button>
      </div>

      {/* Center Cinematic Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center flex flex-col items-center">
        {/* Quality trust markers in warm beige */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#161b22]/90 border border-[#d4b996]/30 text-[#d4b996] text-xs md:text-sm font-semibold tracking-wide backdrop-blur-md mb-6 shadow-2xl">
          <Flame className="w-4 h-4 text-[#d4b996] animate-pulse" />
          <span>{t.companySubtitle}</span>
          <span className="text-slate-500">·</span>
          <span>El Jadida, Maroc</span>
        </div>

        <h1 className="text-3xl md:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-tight md:leading-snug drop-shadow-[0_4px_24px_rgba(0,0,0,0.9)] max-w-3xl mb-4">
          {t.cinematicTitle}
        </h1>

        <p className="text-slate-300 text-base md:text-xl font-normal max-w-2xl leading-relaxed drop-shadow-md mb-8">
          {t.cinematicSubtitle}
        </p>

        {/* Visual progress bar in warm beige / sand */}
        <div className="w-full max-w-md bg-slate-900/80 rounded-full h-2 overflow-hidden border border-[#30363d] backdrop-blur-sm shadow-inner mb-6">
          <div 
            className="h-full bg-gradient-to-r from-[#d4b996] to-[#eadbc8] transition-all duration-1000 ease-linear rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="flex items-center gap-6 text-xs md:text-sm text-slate-400">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>ISO 9001 / OHSAS Compliant</span>
          </span>
          <span className="text-slate-600">·</span>
          <span className="flex items-center gap-1.5">
            <Compass className="w-4 h-4 text-[#d4b996]" />
            <span>Jorf Lasfar & Régions Industrielles</span>
          </span>
        </div>
      </div>

      {/* Bottom indicator */}
      <div className="absolute bottom-6 text-center text-slate-500 text-xs z-10 font-mono tracking-wider">
        ISONIL MAROC — PORTAL CLIENTS & ARCHIVES
      </div>
    </div>
  );
};
