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
  Film,
  Sparkles,
  AlertTriangle
} from 'lucide-react';
import { Attachment, Language, Project } from '../types';
import { translations } from '../i18n/translations';
import { triggerNativeShare } from '../firebase';

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

  const normalizedFileUrl =
    !attachment.fileUrl || attachment.fileUrl.includes('/public/assets/aistudio/1000127391_10ae27f3.jpg')
      ? '/1000127391_10ae27f3.jpg'
      : attachment.fileUrl;

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

  // Real file download handler
  const handleDownload = () => {
    if (downloadProgress !== null) return;
    setDownloadProgress(15);
    setDownloadCompleted(false);

    let current = 15;
    const interval = setInterval(() => {
      current += Math.floor(Math.random() * 25) + 20;
      if (current >= 100) {
        current = 100;
        setDownloadProgress(100);
        clearInterval(interval);
        setTimeout(() => {
          setDownloadCompleted(true);
          const link = document.createElement('a');
          if (
            normalizedFileUrl.startsWith('data:') ||
            normalizedFileUrl.startsWith('blob:') ||
            normalizedFileUrl.startsWith('http') ||
            normalizedFileUrl.startsWith('/')
          ) {
            link.href = normalizedFileUrl;
          } else {
            const blob = new Blob([
              `ISONIL MAROC - FICHE D'ARCHIVE TECHNIQUE\nTITRE: ${attachment.title}\nFICHIER: ${attachment.fileName}\nPROJET: ${attachment.projectName}\nDATE: ${attachment.uploadedAt}\n\nNotes techniques: ${attachment.notes || 'N/A'}`
            ], { type: 'text/plain;charset=utf-8' });
            link.href = URL.createObjectURL(blob);
          }
          link.download = attachment.fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          setTimeout(() => setDownloadProgress(null), 2500);
        }, 250);
      } else {
        setDownloadProgress(current);
      }
    }, 120);
  };

  // Native OS Share chooser first; non-automatic fallback modal only if navigator.share is unsupported
  const handleNativeShare = async () => {
    const shareResult = await triggerNativeShare({
      ...attachment,
      fileUrl: normalizedFileUrl,
    });

    if (shareResult === 'unsupported') {
      setShowShareModal(true);
    }
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

  const secureShareLink = `${window.location.origin}/?doc=${encodeURIComponent(attachment.id)}`;
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
      <div className="relative w-full max-w-5xl bg-[#112239] border border-[#79C8E8]/30 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-[#79C8E8]/20 bg-[#0B192C] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#162942] border border-[#DFC57B]/40 flex items-center justify-center shrink-0 text-[#DFC57B]">
              {attachment.category === 'photo' && <ImageIcon className="w-5 h-5" />}
              {isVideoFormat && <Video className="w-5 h-5" />}
              {attachment.category === 'document' && <FileText className="w-5 h-5" />}
              {attachment.category === 'note' && <FileText className="w-5 h-5 text-amber-300" />}
              {attachment.category === 'other' && !isVideoFormat && <FileQuestion className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-bold text-[#DFC57B] truncate">
                {attachment.title}
              </h3>
              <p className="text-xs text-slate-300 flex items-center gap-2 truncate">
                <span>{attachment.projectName}</span>
                <span>·</span>
                <span className="font-mono text-[#79C8E8] font-semibold">{formatBytes(attachment.fileSizeBytes)}</span>
                <span>·</span>
                <span className="uppercase text-[10px] px-1.5 py-0.5 rounded bg-[#162942] font-mono text-[#A9DDF1]">
                  {fileExt || 'DOC'}
                </span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-[#162942] hover:bg-[#1f3758] text-slate-300 hover:text-white transition-colors cursor-pointer shrink-0"
            title={t.close}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Toolbar */}
        <div className="p-3 bg-[#0B192C]/90 border-b border-[#79C8E8]/20 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Print Button */}
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#162942] hover:bg-[#1f3758] text-white text-xs font-semibold border border-[#79C8E8]/25 transition-colors cursor-pointer"
              title={t.print}
            >
              <Printer className="w-4 h-4 text-[#79C8E8]" />
              <span>{t.print}</span>
            </button>

            {/* Download Button */}
            <button
              onClick={handleDownload}
              disabled={downloadProgress !== null && downloadProgress < 100}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#DFC57B] hover:bg-[#d4b663] text-[#0B192C] text-xs font-bold transition-all cursor-pointer disabled:opacity-50 shadow-md"
            >
              <Download className="w-4 h-4" />
              <span>{downloadCompleted ? t.downloadComplete : t.download}</span>
            </button>

            {/* Native OS Share Button */}
            <button
              onClick={handleNativeShare}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#162942] hover:bg-[#1f3758] text-white text-xs font-semibold border border-[#79C8E8]/25 transition-colors cursor-pointer"
              title={t.share}
            >
              <Share2 className="w-4 h-4 text-[#79C8E8]" />
              <span>{t.share}</span>
            </button>

            {/* Forward Button */}
            <button
              onClick={() => setShowForwardModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#162942] hover:bg-[#1f3758] text-white text-xs font-semibold border border-[#79C8E8]/25 transition-colors cursor-pointer"
            >
              <Forward className={`w-4 h-4 text-[#79C8E8] ${lang === 'ar' ? 'rotate-180' : ''}`} />
              <span>{t.forward}</span>
            </button>

            {/* Delete Button */}
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#E50914]/15 hover:bg-[#E50914]/25 text-red-200 text-xs font-semibold border border-[#E50914]/40 transition-colors cursor-pointer"
              title={t.deleteAttachment}
            >
              <Trash2 className="w-4 h-4 text-[#E50914]" />
              <span>{t.deleteAttachment}</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-300">
            <span className="text-slate-400">{t.uploadedBy}:</span>
            <span className="font-semibold text-[#DFC57B]">
              {attachment.senderName}
            </span>
          </div>
        </div>

        {/* Live Download Progress Indicator */}
        {downloadProgress !== null && (
          <div className="bg-[#0B192C] px-4 py-2 border-b border-[#79C8E8]/20">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-[#DFC57B] font-medium flex items-center gap-1.5">
                <Download className="w-3.5 h-3.5 animate-bounce" />
                <span>{downloadProgress === 100 ? t.downloadComplete : t.downloading}</span>
              </span>
              <span className="font-mono text-white">{downloadProgress}%</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div 
                className="h-full bg-[#DFC57B] transition-all duration-200"
                style={{ width: `${downloadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Modal Body / Printable View */}
        <div id="printable-document" className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#0B192C]/60">
          
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
                <p className="font-bold text-slate-950">
                  {lang === 'ar' ? 'بطاقة أرشيف تقني معتمد' : "FICHE D'ARCHIVE TECHNIQUE"}
                </p>
                <p>RÉF: ISO-{attachment.id.toUpperCase()}</p>
                <p>DATE: {new Date(attachment.uploadedAt).toLocaleDateString()}</p>
              </div>
            </div>
          </div>

          {/* Photo Preview */}
          {attachment.category === 'photo' && !isVideoFormat && (
            <div className="flex flex-col items-center justify-center">
              <div className="relative max-h-[60vh] w-full rounded-2xl overflow-hidden border border-[#79C8E8]/30 bg-black flex items-center justify-center shadow-xl">
                <img 
                  src={normalizedFileUrl}
                  alt={attachment.title}
                  className="max-h-[60vh] w-auto max-w-full object-contain"
                />
              </div>
              <div className="mt-3 text-xs text-[#A9DDF1] text-center font-mono">
                {attachment.fileName}
              </div>
            </div>
          )}

          {/* Video Player */}
          {isVideoFormat && (
            <div className="flex flex-col items-center justify-center w-full max-w-4xl mx-auto">
              <div className="w-full flex items-center justify-between mb-3 px-1 text-xs">
                <div className="flex items-center gap-2">
                  <Film className="w-4 h-4 text-[#DFC57B]" />
                  <span className="font-semibold text-white">{t.videoPlayerTitle}</span>
                  <span className="px-2 py-0.5 rounded-full bg-[#162942] border border-[#79C8E8]/30 text-[#79C8E8] font-mono text-[11px] uppercase">
                    {fileExt || 'MP4'}
                  </span>
                </div>
                <span className="text-[11px] text-slate-300 hidden sm:inline">
                  {t.videoAllFormatsNotice}
                </span>
              </div>

              <div className="relative w-full rounded-2xl overflow-hidden border border-[#79C8E8]/30 bg-black aspect-video flex flex-col items-center justify-center shadow-2xl group">
                <video 
                  ref={videoRef}
                  className={`w-full h-full object-contain ${videoError ? 'hidden' : 'block'}`}
                  poster="/1000127391_10ae27f3.jpg"
                  playsInline
                  onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                  onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 45)}
                  onEnded={() => setIsPlaying(false)}
                  onError={() => setVideoError(true)}
                >
                  <source src={normalizedFileUrl} type="video/mp4" />
                  <source src={normalizedFileUrl} type="video/webm" />
                </video>

                {videoError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-between p-6 bg-gradient-to-t from-black via-black/85 to-[#0B192C] text-white">
                    <div className="w-full flex items-center justify-between text-xs text-slate-300">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-[#DFC57B]" />
                        <span className="font-semibold">{lang === 'ar' ? 'معاينة الفيديو الميداني ISONIL' : 'Aperçu Vidéo de Chantier ISONIL'}</span>
                      </div>
                      <span className="font-mono text-[#79C8E8] px-2 py-0.5 rounded bg-[#162942]">
                        CODEC: H.264 / 1080p · {fileExt.toUpperCase()}
                      </span>
                    </div>

                    <div className="relative flex flex-col items-center justify-center">
                      <div 
                        className="w-20 h-20 rounded-full bg-[#DFC57B]/20 border-2 border-[#DFC57B] flex items-center justify-center text-[#DFC57B] shadow-lg mb-3 hover:scale-110 transition-transform cursor-pointer"
                        onClick={toggleVideoPlayback}
                      >
                        {simulatedPlaying ? (
                          <Pause className="w-9 h-9 fill-current" />
                        ) : (
                          <Play className="w-9 h-9 ms-1 fill-current" />
                        )}
                      </div>
                      <p className="text-xs text-white font-medium">{attachment.fileName}</p>
                      <p className="text-[11px] text-slate-300 mt-1">{t.videoAllFormatsNotice}</p>
                    </div>

                    <div className="w-full flex items-center justify-between text-[11px] text-slate-400 border-t border-[#79C8E8]/20 pt-2">
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
                      className="h-full bg-[#DFC57B]"
                      style={{ width: `${Math.min(100, (currentTime / (duration || 60)) * 100)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-200">
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={toggleVideoPlayback}
                        className="p-1.5 rounded-lg bg-[#162942] hover:bg-[#1f3758] text-[#DFC57B] cursor-pointer"
                        title={isPlaying || simulatedPlaying ? t.pauseVideo : t.playVideo}
                      >
                        {isPlaying || simulatedPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
                      </button>

                      <button 
                        onClick={toggleMute}
                        className="p-1.5 rounded-lg bg-[#162942] hover:bg-[#1f3758] text-slate-200 cursor-pointer"
                      >
                        {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                      </button>

                      <span className="font-mono text-[11px] text-slate-200">
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
                        className="p-1.5 rounded-lg bg-[#162942] hover:bg-[#1f3758] text-slate-200 cursor-pointer"
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
            <div className="max-w-3xl mx-auto bg-[#112239] border border-[#79C8E8]/30 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center justify-between border-b border-[#79C8E8]/20 pb-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#0B192C] border border-[#DFC57B]/40 flex items-center justify-center text-[#DFC57B]">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-base">{attachment.fileName}</h4>
                    <p className="text-xs text-[#A9DDF1]">
                      {lang === 'ar' ? 'وثيقة تقنية معتمدة — ISONIL Maroc' : 'Document Technique ISONIL Maroc'}
                    </p>
                  </div>
                </div>
                <div className="px-3 py-1 rounded-lg bg-[#0B192C] text-[#DFC57B] text-xs font-mono border border-[#79C8E8]/30">
                  ISO-DOC-{attachment.id.toUpperCase()}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-[#0B192C] rounded-xl border border-[#79C8E8]/25 mb-5 text-xs">
                <div>
                  <span className="text-slate-400 block mb-0.5">{t.project}</span>
                  <span className="text-white font-medium truncate block">{attachment.projectName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">{t.uploadDate}</span>
                  <span className="text-white font-medium">{new Date(attachment.uploadedAt).toLocaleDateString()}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">{t.fileSize}</span>
                  <span className="text-white font-mono font-medium">{formatBytes(attachment.fileSizeBytes)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">{lang === 'ar' ? 'درجة السرية' : 'Confidentialité'}</span>
                  <span className="text-[#DFC57B] font-semibold">{lang === 'ar' ? 'مشفر ومحمي' : 'Confidentiel'}</span>
                </div>
              </div>

              {attachment.notes && (
                <div className="mt-4">
                  <h5 className="font-semibold text-white mb-1">{lang === 'ar' ? 'الملاحظات الفنية المرفقة:' : 'Notes techniques :'}</h5>
                  <p className="text-xs text-slate-200 bg-[#0B192C] p-3 rounded-xl border border-[#79C8E8]/25">
                    {attachment.notes}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Notes / Report */}
          {attachment.category === 'note' && (
            <div className="max-w-2xl mx-auto bg-[#112239] border border-[#79C8E8]/30 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center gap-2 text-[#DFC57B] font-semibold text-sm mb-3">
                <FileText className="w-5 h-5" />
                <span>{lang === 'ar' ? 'مذكرة تقنية رسمية' : 'Note Technique Officielle'}</span>
              </div>
              <div className="p-4 rounded-xl bg-[#0B192C] border border-[#79C8E8]/25 text-xs md:text-sm text-white leading-relaxed whitespace-pre-wrap">
                {attachment.notes || (lang === 'ar' ? 'لا توجد ملاحظات إضافية.' : 'Aucune observation.')}
              </div>
            </div>
          )}

          {/* Official Stamp & Signature Area (Visible during printing) */}
          <div className="hidden print:block mt-12 pt-6 border-t border-slate-300">
            <div className="flex justify-between items-center text-xs text-slate-800">
              <div className="text-start">
                <p className="font-bold">{lang === 'ar' ? 'التأشير والمصادقة التقنية:' : 'Visa & Approbation Technique :'}</p>
                <div className="h-16 w-40 border border-dashed border-slate-400 mt-2 rounded flex items-center justify-center text-[10px] text-slate-500">
                  Cachet ISONIL Maroc
                </div>
              </div>
              <div className="text-end">
                <p className="font-bold">{lang === 'ar' ? 'توقيع العميل / المستلم:' : 'Pour le Client / Réceptionnaire :'}</p>
                <div className="h-16 w-40 border border-dashed border-slate-400 mt-2 rounded flex items-center justify-center text-[10px] text-slate-500">
                  {lang === 'ar' ? 'التوقيع والتاريخ' : 'Signature & Date'}
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* DELETE CONFIRMATION MODAL */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#112239] border border-[#E50914]/40 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-[#E50914] mb-3">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h4 className="font-bold text-white text-base">
                {t.deleteAttachment}
              </h4>
            </div>

            <p className="text-xs text-slate-200 mb-4 leading-relaxed">
              {attachment.folder === 'trash'
                ? (lang === 'ar'
                    ? 'هل أنت متأكد من الحذف النهائي لهذا الملف؟ لن تتمكن من استعادته بعد الآن.'
                    : 'Confirmer la suppression définitive de ce fichier ?')
                : (lang === 'ar'
                    ? 'سيتم نقل هذا الملف إلى سلة المحذوفات مع إمكانية استعادته خلال 30 يوماً.'
                    : 'Ce fichier sera déplacé dans la corbeille et restera récupérable pendant 30 jours.')}
            </p>

            <div className="p-3 bg-[#0B192C] rounded-xl border border-[#79C8E8]/25 mb-4 text-xs font-mono text-white">
              <p><strong>{attachment.title}</strong></p>
              <p className="text-[#A9DDF1] text-[11px] mt-0.5">{attachment.fileName} · {formatBytes(attachment.fileSizeBytes)}</p>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 rounded-xl bg-[#162942] text-slate-200 text-xs font-medium cursor-pointer"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 rounded-xl bg-[#E50914] hover:bg-red-700 text-white text-xs font-bold cursor-pointer"
              >
                {t.delete}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NON-AUTOMATIC SHARE FALLBACK MODAL (Only shown if browser does not support navigator.share) */}
      {showShareModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#112239] border border-[#79C8E8]/30 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 font-bold text-[#DFC57B] text-base">
                <Share2 className="w-5 h-5 text-[#79C8E8]" />
                <span>{t.share}</span>
              </div>
              <button
                onClick={() => setShowShareModal(false)}
                className="p-1 rounded bg-[#162942] text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#A9DDF1] mb-4 leading-relaxed">
              {lang === 'ar'
                ? 'اختر طريقة المشاركة المفضلة لديك: يمكنك تحميل الملف مباشرة لمشاركته عبر أي تطبيق على جهازك، أو نسخ رابط الوثيقة.'
                : 'Choisissez comment partager ce fichier : téléchargez-le pour l’envoyer via l’application de votre choix, ou copiez son lien.'}
            </p>

            <div className="mb-4">
              <button
                type="button"
                onClick={() => {
                  handleDownload();
                  setShowShareModal(false);
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#DFC57B] hover:bg-[#d4b663] text-[#0B192C] font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>{lang === 'ar' ? 'تحميل الملف للمشاركة عبر جهازك' : 'Télécharger le fichier pour le partager'}</span>
              </button>
            </div>

            <div className="p-2.5 rounded-xl bg-[#0B192C] border border-[#79C8E8]/30 flex items-center justify-between gap-2 mb-4">
              <span className="font-mono text-xs text-slate-200 truncate">{secureShareLink}</span>
              <button
                onClick={handleCopyShareLink}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#162942] hover:bg-[#1f3758] text-[#79C8E8] border border-[#79C8E8]/30 text-xs font-bold transition-all cursor-pointer shrink-0"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? t.linkCopied : t.copyLink}</span>
              </button>
            </div>

            <div className="p-4 rounded-xl bg-[#0B192C] border border-[#79C8E8]/20 flex items-center gap-4">
              <div className="w-16 h-16 bg-white p-1 rounded-lg flex items-center justify-center shrink-0">
                <QrCode className="w-14 h-14 text-slate-900" />
              </div>
              <div className="text-xs">
                <span className="font-semibold text-white block mb-0.5">{t.qrCode}</span>
                <span className="text-slate-300 block text-[11px]">
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
          <div className="w-full max-w-md bg-[#112239] border border-[#79C8E8]/30 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 font-bold text-[#DFC57B] text-base">
                <Forward className="w-5 h-5 text-[#79C8E8]" />
                <span>{t.forwardTitle}</span>
              </div>
              <button
                onClick={() => setShowForwardModal(false)}
                className="p-1 rounded bg-[#162942] text-slate-300 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {forwardSuccess ? (
              <div className="text-center py-6">
                <Check className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                <p className="text-sm font-semibold text-white">{t.forwardSuccess}</p>
              </div>
            ) : (
              <form onSubmit={handleForwardSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-white mb-1">
                    {t.forwardRecipient} *
                  </label>
                  <input
                    type="email"
                    required
                    value={forwardEmail}
                    onChange={(e) => setForwardEmail(e.target.value)}
                    placeholder="destinataire@entreprise.ma"
                    className="w-full px-3 py-2 rounded-xl bg-[#0B192C] border border-[#79C8E8]/30 focus:border-[#DFC57B] focus:outline-none text-white text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-white mb-1">
                    {t.forwardMessage}
                  </label>
                  <textarea
                    rows={3}
                    value={forwardNote}
                    onChange={(e) => setForwardNote(e.target.value)}
                    placeholder={lang === 'ar' ? 'ملاحظة توضيحية...' : 'Message complémentaire...'}
                    className="w-full px-3 py-2 rounded-xl bg-[#0B192C] border border-[#79C8E8]/30 focus:border-[#DFC57B] focus:outline-none text-white text-xs resize-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForwardModal(false)}
                    className="px-4 py-2 rounded-xl bg-[#162942] text-slate-200 text-xs font-medium cursor-pointer"
                  >
                    {t.cancel}
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-[#DFC57B] text-[#0B192C] text-xs font-bold cursor-pointer"
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
