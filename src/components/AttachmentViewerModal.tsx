import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Printer, 
  Download, 
  Share2, 
  Forward, 
  Trash2,
  Check, 
  Copy, 
  QrCode, 
  FileText, 
  Image as ImageIcon, 
  Video, 
  FileQuestion, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize2, 
  AlertCircle,
  Film,
  Sparkles,
  Info,
  AlertTriangle,
  Building2,
  ShieldCheck
} from 'lucide-react';
import { Attachment, Language, Project } from '../types';
import { translations } from '../i18n/translations';

interface AttachmentViewerModalProps {
  attachment: Attachment | null;
  project?: Project;
  lang: Language;
  onClose: () => void;
  onForward?: (attachmentId: string, email: string, note: string) => void;
  onDelete?: (attachmentId: string) => void;
}

export const AttachmentViewerModal: React.FC<AttachmentViewerModalProps> = ({
  attachment,
  project,
  lang,
  onClose,
  onForward,
  onDelete,
}) => {
  const t = translations[lang];

  // Action states
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [downloadCompleted, setDownloadCompleted] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [forwardEmail, setForwardEmail] = useState('');
  const [forwardNote, setForwardNote] = useState('');
  const [forwardSuccess, setForwardSuccess] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Video player state
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(45);
  const [videoError, setVideoError] = useState(false);
  const [simulatedPlaying, setSimulatedPlaying] = useState(false);

  useEffect(() => {
    setVideoError(false);
    setIsPlaying(false);
    setSimulatedPlaying(false);
    setCurrentTime(0);
    setShowDeleteConfirm(false);
  }, [attachment]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (simulatedPlaying) {
      timer = setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= 60) return 0;
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [simulatedPlaying]);

  if (!attachment) return null;

  const formatBytes = (bytes: number): string => {
    if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} Go`;
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} Mo`;
    return `${(bytes / 1024).toFixed(1)} Ko`;
  };

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remainingSecs = Math.floor(sec % 60);
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  const fileExt = (attachment.fileName.split('.').pop() || '').toLowerCase();
  const isVideoFormat = 
    attachment.category === 'video' || 
    ['mp4', 'mov', 'avi', 'mkv', 'webm', 'wmv', 'flv', 'm4v', '3gp'].includes(fileExt);

  // Handle simulated download
  const handleDownload = () => {
    if (downloadProgress !== null) return;
    setDownloadProgress(10);
    setDownloadCompleted(false);

    let current = 10;
    const interval = setInterval(() => {
      current += Math.floor(Math.random() * 20) + 15;
      if (current >= 100) {
        current = 100;
        setDownloadProgress(100);
        clearInterval(interval);
        setTimeout(() => {
          setDownloadCompleted(true);
          const blob = new Blob([
            `ISONIL MAROC - FICHE D'ARCHIVE TECHNIQUE\nTITRE: ${attachment.title}\nFICHIER: ${attachment.fileName}\nPROJET: ${attachment.projectName}\nDATE: ${attachment.uploadedAt}\n\nNotes techniques: ${attachment.notes || 'N/A'}`
          ], { type: 'text/plain;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = attachment.fileUrl && attachment.fileUrl.startsWith('/public') ? attachment.fileUrl : url;
          link.download = attachment.fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          setTimeout(() => setDownloadProgress(null), 3000);
        }, 300);
      } else {
        setDownloadProgress(current);
      }
    }, 150);
  };

  // Robust Print Handler
  const handlePrint = () => {
    window.print();
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(attachment.id);
      onClose();
    }
  };

  const secureShareLink = `https://portal.isonil.com/share/secure/${attachment.id}?sig=iso_${Date.now()}`;
  const handleCopyShareLink = () => {
    navigator.clipboard.writeText(secureShareLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleForwardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forwardEmail) return;
    if (onForward) onForward(attachment.id, forwardEmail, forwardNote);
    setForwardSuccess(true);
    setTimeout(() => {
      setShowForwardModal(false);
      setForwardSuccess(false);
      setForwardEmail('');
      setForwardNote('');
    }, 2000);
  };

  const toggleVideoPlayback = () => {
    if (videoRef.current && !videoError) {
      if (videoRef.current.paused) {
        videoRef.current.play().then(() => {
          setIsPlaying(true);
        }).catch(() => {
          setVideoError(true);
          setSimulatedPlaying(true);
        });
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    } else {
      setSimulatedPlaying(!simulatedPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    } else {
      setIsMuted(!isMuted);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-[#161b22] border border-[#30363d] rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-[#30363d] bg-[#0d1117] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#21262d] theme-border border flex items-center justify-center shrink-0 theme-text">
              {attachment.category === 'photo' && <ImageIcon className="w-5 h-5" />}
              {isVideoFormat && <Video className="w-5 h-5" />}
              {attachment.category === 'document' && <FileText className="w-5 h-5" />}
              {attachment.category === 'note' && <FileText className="w-5 h-5 text-amber-300" />}
              {attachment.category === 'other' && !isVideoFormat && <FileQuestion className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-bold text-white truncate">
                {attachment.title}
              </h3>
              <p className="text-xs text-slate-400 flex items-center gap-2 truncate">
                <span>{attachment.projectName}</span>
                <span>·</span>
                <span className="font-mono theme-text font-semibold">{formatBytes(attachment.fileSizeBytes)}</span>
                <span>·</span>
                <span className="uppercase text-[10px] px-1.5 py-0.5 rounded bg-[#21262d] font-mono text-slate-300">
                  {fileExt || 'DOC'}
                </span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-[#21262d] hover:bg-[#30363d] text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
            title={t.close}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Toolbar */}
        <div className="p-3 bg-[#0d1117]/80 border-b border-[#30363d] flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Print Button */}
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#21262d] hover:bg-[#30363d] text-slate-200 text-xs font-semibold border border-[#30363d] transition-colors cursor-pointer"
              title={t.print}
            >
              <Printer className="w-4 h-4 theme-text" />
              <span>{t.print}</span>
            </button>

            {/* Download Button */}
            <button
              onClick={handleDownload}
              disabled={downloadProgress !== null && downloadProgress < 100}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl theme-btn text-xs font-bold transition-all cursor-pointer disabled:opacity-50 shadow-md"
            >
              <Download className="w-4 h-4" />
              <span>{downloadCompleted ? t.downloadComplete : t.download}</span>
            </button>

            {/* Share Button */}
            <button
              onClick={() => setShowShareModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#21262d] hover:bg-[#30363d] text-slate-200 text-xs font-semibold border border-[#30363d] transition-colors cursor-pointer"
            >
              <Share2 className="w-4 h-4 theme-text" />
              <span>{t.share}</span>
            </button>

            {/* Forward Button */}
            <button
              onClick={() => setShowForwardModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#21262d] hover:bg-[#30363d] text-slate-200 text-xs font-semibold border border-[#30363d] transition-colors cursor-pointer"
            >
              <Forward className={`w-4 h-4 theme-text ${lang === 'ar' ? 'rotate-180' : ''}`} />
              <span>{t.forward}</span>
            </button>

            {/* Delete Button (زر حذف المرفق) */}
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-950/40 hover:bg-red-900/60 text-red-400 hover:text-red-300 text-xs font-semibold border border-red-800/50 transition-colors cursor-pointer"
              title={t.deleteAttachment}
            >
              <Trash2 className="w-4 h-4" />
              <span>{t.deleteAttachment}</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="text-slate-500">{t.uploadedBy}:</span>
            <span className="font-semibold theme-text">
              {attachment.senderName}
            </span>
          </div>
        </div>

        {/* Live Download Progress Indicator */}
        {downloadProgress !== null && (
          <div className="bg-[#0d1117] px-4 py-2 border-b border-[#30363d]">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="theme-text font-medium flex items-center gap-1.5">
                <Download className="w-3.5 h-3.5 animate-bounce" />
                <span>{downloadProgress === 100 ? t.downloadComplete : t.downloading}</span>
              </span>
              <span className="font-mono text-slate-300">{downloadProgress}%</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div 
                className="h-full bg-theme transition-all duration-200"
                style={{ width: `${downloadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Modal Body / Printable View */}
        <div id="printable-document" className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#0d1117]/50">
          
          {/* Printable Official ISONIL Letterhead (Appears in Print) */}
          <div className="hidden print:block mb-8 border-b-2 border-slate-900 pb-5">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-black text-slate-950 tracking-wider">ISONIL MAROC</h1>
                <p className="text-xs font-semibold text-slate-700">{t.companySubtitle}</p>
                <p className="text-[11px] text-slate-600 mt-1">{t.companyAddress}</p>
                <p className="text-[11px] text-slate-600">Tél: +212 7 10 73 84 09 · contact@isonil.com</p>
              </div>
              <div className="text-end text-xs text-slate-700 font-mono">
                <p className="font-bold text-slate-950">FICHE D'ARCHIVE TECHNIQUE</p>
                <p>RÉF: ISO-{attachment.id.toUpperCase()}</p>
                <p>DATE: {new Date(attachment.uploadedAt).toLocaleDateString()}</p>
              </div>
            </div>
          </div>

          {/* Photo Preview */}
          {attachment.category === 'photo' && !isVideoFormat && (
            <div className="flex flex-col items-center justify-center">
              <div className="relative max-h-[60vh] w-full rounded-2xl overflow-hidden border border-[#30363d] bg-black flex items-center justify-center shadow-xl">
                <img 
                  src={attachment.fileUrl || '/public/assets/aistudio/1000127391_10ae27f3.jpg'}
                  alt={attachment.title}
                  className="max-h-[60vh] w-auto max-w-full object-contain"
                />
              </div>
              <div className="mt-3 text-xs text-slate-400 text-center font-mono">
                {attachment.fileName}
              </div>
            </div>
          )}

          {/* Video Player */}
          {isVideoFormat && (
            <div className="flex flex-col items-center justify-center w-full max-w-4xl mx-auto">
              <div className="w-full flex items-center justify-between mb-3 px-1 text-xs">
                <div className="flex items-center gap-2">
                  <Film className="w-4 h-4 theme-text" />
                  <span className="font-semibold text-white">{t.videoPlayerTitle}</span>
                  <span className="px-2 py-0.5 rounded-full bg-[#21262d] border border-[#30363d] theme-text font-mono text-[11px] uppercase">
                    {fileExt || 'MP4'}
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 hidden sm:inline">
                  {t.videoAllFormatsNotice}
                </span>
              </div>

              <div className="relative w-full rounded-2xl overflow-hidden border border-[#30363d] bg-black aspect-video flex flex-col items-center justify-center shadow-2xl group">
                <video 
                  ref={videoRef}
                  className={`w-full h-full object-contain ${videoError ? 'hidden' : 'block'}`}
                  poster="/public/assets/aistudio/1000127391_10ae27f3.jpg"
                  playsInline
                  onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                  onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 45)}
                  onEnded={() => setIsPlaying(false)}
                  onError={() => setVideoError(true)}
                >
                  <source src={attachment.fileUrl} type="video/mp4" />
                  <source src={attachment.fileUrl} type="video/webm" />
                </video>

                {videoError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-between p-6 bg-gradient-to-t from-black via-black/85 to-[#0d1117] text-white">
                    <div className="w-full flex items-center justify-between text-xs text-slate-300">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 theme-text" />
                        <span className="font-semibold">{lang === 'ar' ? 'معاينة الفيديو الميداني ISONIL' : 'Aperçu Vidéo de Chantier ISONIL'}</span>
                      </div>
                      <span className="font-mono theme-text px-2 py-0.5 rounded bg-[#21262d]">
                        CODEC: H.264 / 1080p · {fileExt.toUpperCase()}
                      </span>
                    </div>

                    <div className="relative flex flex-col items-center justify-center">
                      <div 
                        className="w-20 h-20 rounded-full theme-bg-subtle theme-border-solid border-2 flex items-center justify-center theme-text shadow-lg mb-3 hover:scale-110 transition-transform cursor-pointer"
                        onClick={toggleVideoPlayback}
                      >
                        {simulatedPlaying ? (
                          <Pause className="w-9 h-9 fill-current" />
                        ) : (
                          <Play className="w-9 h-9 ms-1 fill-current" />
                        )}
                      </div>
                      <p className="text-xs text-slate-300 font-medium">{attachment.fileName}</p>
                      <p className="text-[11px] text-slate-400 mt-1">{t.videoAllFormatsNotice}</p>
                    </div>

                    <div className="w-full flex items-center justify-between text-[11px] text-slate-400 border-t border-[#30363d]/50 pt-2">
                      <span>{attachment.projectName}</span>
                      <span>{formatBytes(attachment.fileSizeBytes)}</span>
                    </div>
                  </div>
                )}

                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/95 via-black/80 to-transparent p-3 pt-6 flex flex-col gap-2">
                  <div 
                    className="w-full bg-slate-700/60 hover:bg-slate-700 h-1.5 rounded-full overflow-hidden cursor-pointer relative"
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const pos = (e.clientX - rect.left) / rect.width;
                      const targetSec = pos * (duration || 60);
                      if (videoRef.current && !videoError) {
                        videoRef.current.currentTime = targetSec;
                      }
                      setCurrentTime(targetSec);
                    }}
                  >
                    <div 
                      className="h-full bg-theme"
                      style={{ width: `${Math.min(100, (currentTime / (duration || 60)) * 100)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-200">
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={toggleVideoPlayback}
                        className="p-1.5 rounded-lg bg-[#21262d] hover:bg-[#30363d] theme-text cursor-pointer"
                        title={isPlaying || simulatedPlaying ? t.pauseVideo : t.playVideo}
                      >
                        {isPlaying || simulatedPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
                      </button>

                      <button 
                        onClick={toggleMute}
                        className="p-1.5 rounded-lg bg-[#21262d] hover:bg-[#30363d] text-slate-300 cursor-pointer"
                      >
                        {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                      </button>

                      <span className="font-mono text-[11px] text-slate-300">
                        {formatSeconds(currentTime)} / {formatSeconds(duration || 60)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded-md font-mono hidden sm:inline">
                        FULL HD 60 FPS
                      </span>
                      <button 
                        onClick={() => {
                          if (videoRef.current?.requestFullscreen) {
                            videoRef.current.requestFullscreen();
                          }
                        }}
                        className="p-1.5 rounded-lg bg-[#21262d] hover:bg-[#30363d] text-slate-300 cursor-pointer"
                        title={t.fullScreen}
                      >
                        <Maximize2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Document / PDF layout */}
          {attachment.category === 'document' && !isVideoFormat && (
            <div className="max-w-3xl mx-auto bg-[#161b22] border border-[#30363d] rounded-2xl p-6 shadow-xl">
              <div className="flex items-center justify-between border-b border-[#30363d] pb-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#0d1117] theme-border border flex items-center justify-center theme-text">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-100 text-base">{attachment.fileName}</h4>
                    <p className="text-xs text-slate-400">Document Technique ISONIL Maroc</p>
                  </div>
                </div>
                <div className="px-3 py-1 rounded-lg bg-[#0d1117] theme-text text-xs font-mono border border-[#30363d]">
                  ISO-DOC-{attachment.id.toUpperCase()}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-[#0d1117] rounded-xl border border-[#30363d] mb-5 text-xs">
                <div>
                  <span className="text-slate-500 block mb-0.5">{t.project}</span>
                  <span className="text-slate-200 font-medium truncate block">{attachment.projectName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5">{t.uploadDate}</span>
                  <span className="text-slate-200 font-medium">{new Date(attachment.uploadedAt).toLocaleDateString()}</span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5">{t.fileSize}</span>
                  <span className="text-slate-200 font-mono font-medium">{formatBytes(attachment.fileSizeBytes)}</span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5">{lang === 'ar' ? 'درجة السرية' : 'Confidentialité'}</span>
                  <span className="theme-text font-semibold">{lang === 'ar' ? 'مشفر ومحمي' : 'Confidentiel'}</span>
                </div>
              </div>

              {attachment.notes && (
                <div className="mt-4">
                  <h5 className="font-semibold text-slate-200 mb-1">{lang === 'ar' ? 'الملاحظات الفنية المرفقة:' : 'Notes techniques :'}</h5>
                  <p className="text-xs text-slate-300 bg-[#0d1117] p-3 rounded-xl border border-[#30363d]">
                    {attachment.notes}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Notes / Report */}
          {attachment.category === 'note' && (
            <div className="max-w-2xl mx-auto bg-[#161b22] border border-[#30363d] rounded-2xl p-6 shadow-xl">
              <div className="flex items-center gap-2 theme-text font-semibold text-sm mb-3">
                <FileText className="w-5 h-5" />
                <span>{lang === 'ar' ? 'مذكرة تقنية رسمية' : 'Note Technique Officielle'}</span>
              </div>
              <div className="p-4 rounded-xl bg-[#0d1117] border border-[#30363d] text-xs md:text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
                {attachment.notes || (lang === 'ar' ? 'لا توجد ملاحظات إضافية.' : 'Aucune observation.')}
              </div>
            </div>
          )}

          {/* Official Stamp & Signature Area (Visible during printing) */}
          <div className="hidden print:block mt-12 pt-6 border-t border-slate-300">
            <div className="flex justify-between items-center text-xs text-slate-800">
              <div className="text-start">
                <p className="font-bold">Visa & Approbation Technique :</p>
                <div className="h-16 w-40 border border-dashed border-slate-400 mt-2 rounded flex items-center justify-center text-[10px] text-slate-500">
                  Cachet ISONIL Maroc
                </div>
              </div>
              <div className="text-end">
                <p className="font-bold">Pour le Client / Réceptionnaire :</p>
                <div className="h-16 w-40 border border-dashed border-slate-400 mt-2 rounded flex items-center justify-center text-[10px] text-slate-500">
                  Signature & Date
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* DELETE CONFIRMATION MODAL */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#161b22] border border-[#30363d] rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-red-400 mb-3">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h4 className="font-bold text-white text-base">
                {t.deleteAttachment}
              </h4>
            </div>

            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              {t.deleteConfirm}
            </p>

            <div className="p-3 bg-[#0d1117] rounded-xl border border-[#30363d] mb-4 text-xs font-mono text-slate-300">
              <p><strong>{attachment.title}</strong></p>
              <p className="text-slate-500 text-[11px] mt-0.5">{attachment.fileName} · {formatBytes(attachment.fileSizeBytes)}</p>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 rounded-xl bg-[#21262d] text-slate-300 text-xs font-medium cursor-pointer"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold cursor-pointer"
              >
                {t.delete}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SHARE MODAL */}
      {showShareModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#161b22] border border-[#30363d] rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 font-bold text-white text-base">
                <Share2 className="w-5 h-5 theme-text" />
                <span>{t.share}</span>
              </div>
              <button
                onClick={() => setShowShareModal(false)}
                className="p-1 rounded bg-[#21262d] text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-2.5 rounded-xl bg-[#0d1117] border border-[#30363d] flex items-center justify-between gap-2 mb-4">
              <span className="font-mono text-xs text-slate-300 truncate">{secureShareLink}</span>
              <button
                onClick={handleCopyShareLink}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg theme-btn text-xs font-bold transition-all cursor-pointer shrink-0"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? t.linkCopied : t.copyLink}</span>
              </button>
            </div>

            <div className="p-4 rounded-xl bg-[#0d1117] border border-[#30363d] flex items-center gap-4">
              <div className="w-16 h-16 bg-white p-1 rounded-lg flex items-center justify-center shrink-0">
                <QrCode className="w-14 h-14 text-slate-900" />
              </div>
              <div className="text-xs">
                <span className="font-semibold text-slate-200 block mb-0.5">{t.qrCode}</span>
                <span className="text-slate-400 block text-[11px]">
                  {lang === 'ar' ? 'مسح فوري بالكاميرا للوصول إلى الوثيقة' : 'Scan rapide pour accès sécurisé'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FORWARD MODAL */}
      {showForwardModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#161b22] border border-[#30363d] rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 font-bold text-white text-base">
                <Forward className="w-5 h-5 theme-text" />
                <span>{t.forwardTitle}</span>
              </div>
              <button
                onClick={() => setShowForwardModal(false)}
                className="p-1 rounded bg-[#21262d] text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {forwardSuccess ? (
              <div className="text-center py-6">
                <Check className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-100">{t.forwardSuccess}</p>
              </div>
            ) : (
              <form onSubmit={handleForwardSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {t.forwardRecipient} *
                  </label>
                  <input
                    type="email"
                    required
                    value={forwardEmail}
                    onChange={(e) => setForwardEmail(e.target.value)}
                    placeholder="destinataire@entreprise.ma"
                    className="w-full px-3 py-2 rounded-xl bg-[#0d1117] border border-[#30363d] focus:border-theme focus:outline-none text-slate-100 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {t.forwardMessage}
                  </label>
                  <textarea
                    rows={3}
                    value={forwardNote}
                    onChange={(e) => setForwardNote(e.target.value)}
                    placeholder={lang === 'ar' ? 'ملاحظة توضيحية...' : 'Message complémentaire...'}
                    className="w-full px-3 py-2 rounded-xl bg-[#0d1117] border border-[#30363d] focus:border-theme focus:outline-none text-slate-100 text-xs resize-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForwardModal(false)}
                    className="px-4 py-2 rounded-xl bg-[#21262d] text-slate-300 text-xs font-medium cursor-pointer"
                  >
                    {t.cancel}
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl theme-btn text-xs font-bold cursor-pointer"
                  >
                    {t.forward}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
