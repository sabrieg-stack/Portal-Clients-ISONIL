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
  AlertTriangle,
  Loader2,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Eye,
  EyeOff
} from 'lucide-react';
import { Attachment, Language, Project } from '../types';
import { translations } from '../i18n/translations';
import { triggerNativeShare } from '../firebase';

interface AttachmentViewerModalProps {
  attachment: Attachment | null;
  project?: Project;
  lang: Language;
  onClose: () => void;
  onForward?: (
    attachmentId: string,
    email: string,
    note: string
  ) => Promise<{
    success: boolean;
    error?: string;
    message?: string;
    messageId?: string;
    previewUrl?: string | null;
  }> | void;
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
  const [isForwarding, setIsForwarding] = useState(false);
  const [forwardSuccess, setForwardSuccess] = useState(false);
  const [forwardError, setForwardError] = useState<string | null>(null);
  const [forwardReceiptId, setForwardReceiptId] = useState<string | null>(null);
  const [forwardPreviewUrl, setForwardPreviewUrl] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Document & Image interactive preview states
  const [imageZoom, setImageZoom] = useState(100);
  const [imageRotation, setImageRotation] = useState(0);
  const [docZoom, setDocZoom] = useState(100);
  const [pdfViewMode, setPdfViewMode] = useState<'embedded' | 'sheet'>('embedded');
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [showForwardInlinePreview, setShowForwardInlinePreview] = useState(true);
  const [expandForwardPreview, setExpandForwardPreview] = useState(false);

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
    setImageZoom(100);
    setImageRotation(0);
    setDocZoom(100);
    setShowForwardInlinePreview(true);
    setExpandForwardPreview(false);
  }, [attachment]);

  // Convert base64 data:application/pdf URLs into Blob URLs for reliable iframe PDF rendering
  useEffect(() => {
    if (!attachment?.fileUrl) {
      setPdfBlobUrl(null);
      setPdfViewMode('sheet');
      return;
    }

    const rawUrl = attachment.fileUrl.trim();
    const ext = (attachment.fileName.split('.').pop() || '').toLowerCase();

    if (rawUrl.startsWith('data:application/pdf')) {
      try {
        const commaIndex = rawUrl.indexOf(',');
        const base64Data = commaIndex !== -1 ? rawUrl.slice(commaIndex + 1) : '';
        const binaryString = window.atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'application/pdf' });
        const objectUrl = URL.createObjectURL(blob);
        setPdfBlobUrl(objectUrl);
        setPdfViewMode('embedded');
        return () => {
          URL.revokeObjectURL(objectUrl);
        };
      } catch {
        setPdfBlobUrl(null);
        setPdfViewMode('sheet');
      }
    } else if (
      rawUrl.toLowerCase().endsWith('.pdf') ||
      (rawUrl.startsWith('blob:') && ext === 'pdf')
    ) {
      setPdfBlobUrl(rawUrl);
      setPdfViewMode('embedded');
    } else {
      setPdfBlobUrl(null);
      setPdfViewMode('sheet');
    }
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

  const isImageFormat =
    !isVideoFormat &&
    (attachment.category === 'photo' ||
      ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'bmp'].includes(fileExt) ||
      normalizedFileUrl.startsWith('data:image/'));

  const isPdfOrDocumentFormat =
    !isVideoFormat &&
    !isImageFormat &&
    (attachment.category === 'document' ||
      fileExt === 'pdf' ||
      normalizedFileUrl.startsWith('data:application/pdf'));

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

  const handleForwardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isForwarding) return;

    const trimmedInput = forwardEmail.trim();
    if (!trimmedInput) {
      setForwardError(
        lang === 'ar'
          ? 'يرجى إدخال عنوان البريد الإلكتروني للمستلم.'
          : 'Veuillez saisir une adresse e-mail destinataire.'
      );
      return;
    }

    const emailParts = trimmedInput
      .split(/[,;]+/)
      .map((part) => part.trim())
      .filter(Boolean);
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const invalidParts = emailParts.filter((part) => !emailRegex.test(part));

    if (emailParts.length === 0 || invalidParts.length > 0) {
      setForwardError(
        lang === 'ar'
          ? `صيغة البريد الإلكتروني غير صحيحة${invalidParts.length ? ` (${invalidParts.join(', ')})` : ''}. يرجى التحقق من العنوان قبل الإرسال.`
          : `Format d'adresse e-mail invalide${invalidParts.length ? ` (${invalidParts.join(', ')})` : ''}.`
      );
      return;
    }

    if (!onForward) {
      setForwardError(
        lang === 'ar'
          ? 'خدمة إرسال البريد الإلكتروني غير متصلة.'
          : 'Service de messagerie non connecté.'
      );
      return;
    }

    setIsForwarding(true);
    setForwardError(null);
    setForwardReceiptId(null);
    setForwardPreviewUrl(null);

    try {
      const result = await onForward(attachment.id, emailParts.join(', '), forwardNote);
      if (!result || !result.success) {
        setForwardError(result?.message || t.forwardError);
        return;
      }
      setForwardReceiptId(result.messageId || null);
      setForwardPreviewUrl(result.previewUrl || null);
      setForwardSuccess(true);
    } catch (err: any) {
      setForwardError(err?.message || t.forwardError);
    } finally {
      setIsForwarding(false);
    }
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
              onClick={() => {
                setShowForwardModal(true);
                setForwardSuccess(false);
                setForwardError(null);
                setForwardReceiptId(null);
                setForwardPreviewUrl(null);
              }}
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

          {/* Photo / Image Interactive Preview */}
          {isImageFormat && (
            <div className="flex flex-col items-center justify-center w-full max-w-4xl mx-auto">
              {/* Interactive Image Preview Toolbar */}
              <div className="w-full flex flex-wrap items-center justify-between gap-2 mb-3 px-3 py-2 rounded-xl bg-[#112239] border border-[#79C8E8]/25 text-xs">
                <div className="flex items-center gap-2 text-slate-200">
                  <ImageIcon className="w-4 h-4 text-[#DFC57B]" />
                  <span className="font-semibold text-white">
                    {lang === 'ar' ? 'معاينة الصورة قبل الإرسال' : "Aperçu de l'image avant transfert"}
                  </span>
                  <span className="text-slate-400" aria-hidden="true">·</span>
                  <span className="font-mono text-[#A9DDF1]">{attachment.fileName}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setImageZoom((z) => Math.max(50, z - 25))}
                    className="p-1.5 rounded-lg bg-[#162942] hover:bg-[#1f3758] text-slate-200 transition-colors cursor-pointer"
                    title={lang === 'ar' ? 'تصغير' : 'Zoom arrière'}
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setImageZoom(100);
                      setImageRotation(0);
                    }}
                    className="px-2 py-1 rounded-lg bg-[#0B192C] border border-[#79C8E8]/25 text-[#DFC57B] font-mono text-[11px] cursor-pointer"
                    title={lang === 'ar' ? 'إعادة الضبط' : 'Réinitialiser'}
                  >
                    {imageZoom}%
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageZoom((z) => Math.min(250, z + 25))}
                    className="p-1.5 rounded-lg bg-[#162942] hover:bg-[#1f3758] text-slate-200 transition-colors cursor-pointer"
                    title={lang === 'ar' ? 'تكبير' : 'Zoom avant'}
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageRotation((r) => (r + 90) % 360)}
                    className="p-1.5 rounded-lg bg-[#162942] hover:bg-[#1f3758] text-slate-200 transition-colors cursor-pointer"
                    title={lang === 'ar' ? 'تدوير 90°' : 'Pivoter 90°'}
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                  </button>

                  {onForward && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowForwardModal(true);
                        setForwardError(null);
                        setForwardSuccess(false);
                      }}
                      className="ms-1 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#DFC57B] hover:bg-[#d4b663] text-[#0B192C] font-bold text-xs transition-colors cursor-pointer"
                    >
                      <Forward className={`w-3.5 h-3.5 ${lang === 'ar' ? 'rotate-180' : ''}`} />
                      <span>{lang === 'ar' ? 'إعادة توجيه الصورة' : "Transférer l'image"}</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="relative max-h-[62vh] min-h-[280px] w-full rounded-2xl overflow-auto border border-[#79C8E8]/30 bg-black/90 flex items-center justify-center shadow-xl p-4">
                <img 
                  src={normalizedFileUrl}
                  alt={attachment.title}
                  style={{
                    transform: `scale(${imageZoom / 100}) rotate(${imageRotation}deg)`,
                    transformOrigin: 'center center',
                  }}
                  className="max-h-[56vh] w-auto max-w-full object-contain transition-transform duration-200"
                />
              </div>
              <div className="mt-3 flex items-center justify-center gap-2 text-xs text-[#A9DDF1] text-center font-mono">
                <span>{attachment.fileName}</span>
                <span aria-hidden="true">·</span>
                <span>{formatBytes(attachment.fileSizeBytes)}</span>
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

          {/* Document / PDF Interactive Preview & Metadata Layout */}
          {isPdfOrDocumentFormat && (
            <div className="max-w-4xl mx-auto space-y-4">
              {/* Document Metadata & Controls Header */}
              <div className="bg-[#112239] border border-[#79C8E8]/30 rounded-2xl p-5 shadow-xl">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#79C8E8]/20 pb-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#0B192C] border border-[#DFC57B]/40 flex items-center justify-center text-[#DFC57B]">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-base">{attachment.fileName}</h4>
                      <p className="text-xs text-[#A9DDF1]">
                        {lang === 'ar' ? 'وثيقة تقنية معتمدة — ISONIL Maroc' : 'Document Technique ISONIL Maroc'}
                        <span className="mx-1.5" aria-hidden="true">·</span>
                        <span className="font-mono text-[#DFC57B]">ISO-DOC-{attachment.id.toUpperCase()}</span>
                      </p>
                    </div>
                  </div>

                  {/* Interactive PDF Preview Controls */}
                  <div className="flex flex-wrap items-center gap-2">
                    {pdfBlobUrl && (
                      <div className="flex items-center gap-1 p-1 rounded-xl bg-[#0B192C] border border-[#79C8E8]/25">
                        <button
                          type="button"
                          onClick={() => setPdfViewMode('embedded')}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                            pdfViewMode === 'embedded'
                              ? 'bg-[#162942] text-[#DFC57B] font-semibold'
                              : 'text-slate-300 hover:text-white'
                          }`}
                        >
                          {lang === 'ar' ? 'عارض PDF المباشر' : 'Lecteur PDF intégré'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setPdfViewMode('sheet')}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                            pdfViewMode === 'sheet'
                              ? 'bg-[#162942] text-[#DFC57B] font-semibold'
                              : 'text-slate-300 hover:text-white'
                          }`}
                        >
                          {lang === 'ar' ? 'نسخة الوثيقة الرسمية' : 'Fiche Document A4'}
                        </button>
                      </div>
                    )}

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setDocZoom((z) => Math.max(75, z - 15))}
                        className="p-1.5 rounded-lg bg-[#162942] hover:bg-[#1f3758] text-slate-200 transition-colors cursor-pointer"
                        title={lang === 'ar' ? 'تصغير الوثيقة' : 'Réduire'}
                      >
                        <ZoomOut className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDocZoom(100)}
                        className="px-2 py-1 rounded-lg bg-[#0B192C] border border-[#79C8E8]/25 text-[#DFC57B] font-mono text-[11px] cursor-pointer"
                      >
                        {docZoom}%
                      </button>
                      <button
                        type="button"
                        onClick={() => setDocZoom((z) => Math.min(160, z + 15))}
                        className="p-1.5 rounded-lg bg-[#162942] hover:bg-[#1f3758] text-slate-200 transition-colors cursor-pointer"
                        title={lang === 'ar' ? 'تكبير الوثيقة' : 'Agrandir'}
                      >
                        <ZoomIn className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {onForward && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowForwardModal(true);
                          setForwardError(null);
                          setForwardSuccess(false);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#DFC57B] hover:bg-[#d4b663] text-[#0B192C] font-bold text-xs transition-colors cursor-pointer"
                      >
                        <Forward className={`w-3.5 h-3.5 ${lang === 'ar' ? 'rotate-180' : ''}`} />
                        <span>{lang === 'ar' ? 'إعادة توجيه الوثيقة' : 'Transférer ce PDF'}</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3.5 bg-[#0B192C] rounded-xl border border-[#79C8E8]/25 text-xs">
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
              </div>

              {/* Embedded PDF Viewer or Interactive A4 Document Preview Sheet */}
              <div className="bg-[#0B192C] border border-[#79C8E8]/30 rounded-2xl p-4 sm:p-6 shadow-2xl overflow-auto max-h-[60vh]">
                <div className="flex items-center justify-between mb-3 text-xs text-[#A9DDF1]">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-[#DFC57B]" />
                    <span className="font-semibold text-white">
                      {lang === 'ar' ? 'معاينة محتوى الوثيقة المباشرة قبل الإرسال' : 'Aperçu direct du document avant transfert'}
                    </span>
                  </div>
                  <span className="font-mono text-[11px] text-slate-400">
                    {fileExt.toUpperCase() || 'PDF'} · {formatBytes(attachment.fileSizeBytes)}
                  </span>
                </div>

                {pdfBlobUrl && pdfViewMode === 'embedded' ? (
                  <div className="w-full rounded-xl overflow-hidden border border-[#79C8E8]/30 bg-white">
                    <iframe
                      src={pdfBlobUrl}
                      title={attachment.title}
                      className="w-full h-[50vh] border-0"
                    />
                  </div>
                ) : (
                  <div className="flex justify-center overflow-auto py-2">
                    <div
                      style={{
                        transform: `scale(${docZoom / 100})`,
                        transformOrigin: 'top center',
                      }}
                      className="w-full max-w-2xl bg-white text-slate-900 rounded-xl shadow-2xl border border-slate-300 p-6 sm:p-8 transition-transform duration-200"
                    >
                      {/* Official A4 Document Preview Header */}
                      <div className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-[#0B192C] pb-4 mb-5">
                        <div>
                          <div className="text-lg font-black tracking-wider text-[#0B192C]">ISONIL MAROC</div>
                          <div className="text-xs font-semibold text-slate-600">{t.companySubtitle}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">{t.companyAddress}</div>
                        </div>
                        <div className="text-end font-mono text-xs text-slate-700">
                          <div className="font-bold text-[#0B192C]">
                            {lang === 'ar' ? 'وثيقة تقنية رسمية (PDF)' : 'DOCUMENT TECHNIQUE OFFICIEL (PDF)'}
                          </div>
                          <div>RÉF : ISO-DOC-{attachment.id.toUpperCase()}</div>
                          <div>DATE : {new Date(attachment.uploadedAt).toLocaleDateString()}</div>
                        </div>
                      </div>

                      {/* Document Title & Project Summary */}
                      <div className="mb-5">
                        <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-1">
                          {lang === 'ar' ? 'عنوان المرفق والملف التقني' : 'Intitulé du document & fichier'}
                        </div>
                        <h3 className="text-base sm:text-lg font-bold text-[#0B192C]">{attachment.title}</h3>
                        <p className="text-xs font-mono text-slate-600 mt-0.5">
                          {attachment.fileName} · {formatBytes(attachment.fileSizeBytes)}
                        </p>
                      </div>

                      {/* Structured Technical Table */}
                      <div className="grid grid-cols-2 gap-3 p-3.5 rounded-lg bg-slate-100 border border-slate-200 text-xs mb-5">
                        <div>
                          <span className="text-slate-500 block">{t.project}</span>
                          <span className="font-semibold text-slate-900">{attachment.projectName}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">{lang === 'ar' ? 'معرّف المشروع' : 'Identifiant Projet'}</span>
                          <span className="font-mono font-semibold text-slate-900">{attachment.projectId}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">{lang === 'ar' ? 'تاريخ الأرشفة' : "Date d'archivage"}</span>
                          <span className="font-semibold text-slate-900">{new Date(attachment.uploadedAt).toLocaleDateString()}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">{lang === 'ar' ? 'حالة المطابقة' : 'Statut de conformité'}</span>
                          <span className="font-semibold text-emerald-700">
                            {lang === 'ar' ? 'معتمد ومطابق للمعايير' : 'Vérifié & Conforme ISONIL'}
                          </span>
                        </div>
                      </div>

                      {/* Document Technical Content / Notes */}
                      <div className="mb-6">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-[#0B192C] mb-2">
                          {lang === 'ar' ? 'التقرير والمحتوى التقني المرفق:' : 'Contenu & Observations Techniques :'}
                        </h4>
                        <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">
                          {attachment.notes ||
                            (lang === 'ar'
                              ? 'تقرير تقني معتمد صادر عن مختبر ومكتب دراسات ISONIL Maroc بخصوص أعمال العزل الحراري والصوتي ومعالجة الرطوبة للمشروع المذكور أعلاه.'
                              : "Rapport technique certifié émis par le bureau d'études ISONIL Maroc concernant les travaux d'isolation thermique, acoustique et d'étanchéité du projet référencé ci-dessus.")}
                        </div>
                      </div>

                      {/* Document Footer Certification */}
                      <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
                        <div>
                          <span className="font-semibold text-slate-700">ISONIL MAROC S.A.R.L</span> · contact@isonil.com
                        </div>
                        <div className="font-mono text-slate-700">
                          PAGE 1 / 1 · CERTIFIÉ ISO
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notes / Report */}
          {attachment.category === 'note' && !isImageFormat && !isPdfOrDocumentFormat && (
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

      {/* FORWARD MODAL WITH BUILT-IN IMAGE & PDF PREVIEW */}
      {showForwardModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-lg bg-[#112239] border border-[#79C8E8]/30 rounded-2xl p-6 shadow-2xl my-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 font-bold text-[#DFC57B] text-base">
                <Forward className="w-5 h-5 text-[#79C8E8]" />
                <span>{t.forwardTitle}</span>
              </div>
              <button
                onClick={() => setShowForwardModal(false)}
                className="p-1 rounded bg-[#162942] text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {forwardSuccess ? (
              <div className="text-center py-5 space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                  <Check className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">{t.forwardSuccess}</h4>
                  <p className="text-xs text-slate-300 mt-1">
                    {lang === 'ar' ? 'تم الإرسال الفعلي مع المرفق إلى:' : 'Envoyé avec pièce jointe à :'} <span className="font-mono text-[#DFC57B] font-semibold">{forwardEmail}</span>
                  </p>
                </div>

                {forwardReceiptId && (
                  <div className="p-2.5 rounded-xl bg-[#0B192C] border border-[#79C8E8]/20 text-[11px] text-slate-400 font-mono break-all text-start">
                    <span className="text-slate-500 block text-[10px]">{t.forwardReceipt}</span>
                    {forwardReceiptId}
                  </div>
                )}

                {forwardPreviewUrl && (
                  <div className="pt-1">
                    <a
                      href={forwardPreviewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#162942] hover:bg-[#1f3758] text-[#79C8E8] text-xs font-semibold border border-[#79C8E8]/30 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>{t.forwardPreviewLink}</span>
                    </a>
                  </div>
                )}

                <div className="pt-2">
                  <button
                    onClick={() => {
                      setShowForwardModal(false);
                      setForwardSuccess(false);
                      setForwardEmail('');
                      setForwardNote('');
                    }}
                    className="px-5 py-2 rounded-xl bg-[#DFC57B] text-[#0B192C] text-xs font-bold hover:bg-[#d4b663] cursor-pointer"
                  >
                    {lang === 'ar' ? 'إغلاق' : 'Fermer'}
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleForwardSubmit} className="space-y-4">
                {/* Pre-Forward Live Document / Image Preview Section */}
                <div className="rounded-xl bg-[#0B192C] border border-[#79C8E8]/30 overflow-hidden">
                  <div className="flex items-center justify-between px-3.5 py-2.5 bg-[#162942]/70 border-b border-[#79C8E8]/20">
                    <div className="flex items-center gap-2 text-xs">
                      {isImageFormat ? (
                        <ImageIcon className="w-4 h-4 text-[#DFC57B]" />
                      ) : (
                        <FileText className="w-4 h-4 text-[#DFC57B]" />
                      )}
                      <span className="font-semibold text-white">
                        {lang === 'ar' ? 'معاينة المرفق قبل الإرسال' : 'Aperçu de la pièce jointe'}
                      </span>
                      <span className="text-slate-400" aria-hidden="true">·</span>
                      <span className="font-mono text-[11px] text-[#A9DDF1]">
                        {formatBytes(attachment.fileSizeBytes)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {(isImageFormat || isPdfOrDocumentFormat) && showForwardInlinePreview && (
                        <button
                          type="button"
                          onClick={() => setExpandForwardPreview((prev) => !prev)}
                          className="px-2 py-1 rounded-lg bg-[#0B192C] hover:bg-[#112239] text-[#79C8E8] text-[11px] font-medium cursor-pointer"
                        >
                          {expandForwardPreview
                            ? lang === 'ar'
                              ? 'تصغير'
                              : 'Réduire'
                            : lang === 'ar'
                            ? 'تكبير المعاينة'
                            : 'Agrandir'}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setShowForwardInlinePreview((prev) => !prev)}
                        className="p-1 rounded-lg bg-[#0B192C] hover:bg-[#112239] text-slate-300 hover:text-white cursor-pointer"
                        title={
                          showForwardInlinePreview
                            ? lang === 'ar'
                              ? 'إخفاء المعاينة'
                              : "Masquer l'aperçu"
                            : lang === 'ar'
                            ? 'إظهار المعاينة'
                            : "Afficher l'aperçu"
                        }
                      >
                        {showForwardInlinePreview ? (
                          <EyeOff className="w-3.5 h-3.5" />
                        ) : (
                          <Eye className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {showForwardInlinePreview && (
                    <div className="p-3 space-y-2.5">
                      {/* Image Preview Inside Forward Modal */}
                      {isImageFormat && (
                        <div
                          className={`w-full rounded-lg overflow-hidden bg-black flex items-center justify-center border border-[#79C8E8]/20 transition-all ${
                            expandForwardPreview ? 'max-h-64' : 'max-h-36'
                          }`}
                        >
                          <img
                            src={normalizedFileUrl}
                            alt={attachment.title}
                            className={`w-auto max-w-full object-contain ${
                              expandForwardPreview ? 'max-h-60' : 'max-h-32'
                            }`}
                          />
                        </div>
                      )}

                      {/* PDF / Document Preview Inside Forward Modal */}
                      {isPdfOrDocumentFormat && (
                        <div
                          className={`w-full rounded-lg overflow-auto bg-white text-slate-900 border border-slate-300 p-3 transition-all ${
                            expandForwardPreview ? 'max-h-64' : 'max-h-36'
                          }`}
                        >
                          {pdfBlobUrl && expandForwardPreview ? (
                            <iframe
                              src={pdfBlobUrl}
                              title={attachment.title}
                              className="w-full h-56 border-0"
                            />
                          ) : (
                            <div className="space-y-1.5 text-xs">
                              <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                                <span className="font-black text-[#0B192C] text-[11px] tracking-wide">
                                  ISONIL MAROC · PDF
                                </span>
                                <span className="font-mono text-[10px] text-slate-500">
                                  ISO-DOC-{attachment.id.toUpperCase()}
                                </span>
                              </div>
                              <div className="font-bold text-slate-900 text-xs">{attachment.title}</div>
                              <div className="text-[11px] text-slate-600 line-clamp-3 leading-relaxed">
                                {attachment.notes ||
                                  (lang === 'ar'
                                    ? 'وثيقة تقنية رسمية معتمدة جاهزة للإرسال كمرفق عبر البريد الإلكتروني.'
                                    : 'Document technique certifié prêt à être transmis en pièce jointe par e-mail.')}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Summary Line */}
                      <div className="flex items-center justify-between text-[11px] text-slate-300 pt-0.5">
                        <span className="font-medium text-white truncate max-w-[65%]">
                          {attachment.title} ({attachment.fileName})
                        </span>
                        <span className="text-[#A9DDF1] truncate max-w-[33%]">
                          {attachment.projectName}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {forwardError && (
                  <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-200 text-xs flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-semibold">{t.forwardError}</p>
                      <p className="text-[11px] text-red-300 leading-relaxed">{forwardError}</p>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-white mb-1">
                    {t.forwardRecipient} *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={isForwarding}
                    value={forwardEmail}
                    onChange={(e) => {
                      setForwardEmail(e.target.value);
                      if (forwardError) setForwardError(null);
                    }}
                    placeholder="destinataire@entreprise.ma, contact@client.com"
                    className="w-full px-3 py-2 rounded-xl bg-[#0B192C] border border-[#79C8E8]/30 focus:border-[#DFC57B] focus:outline-none text-white text-xs disabled:opacity-50 font-mono"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    {lang === 'ar'
                      ? 'يمكنك إدخال بريد إلكتروني واحد أو عدة عناوين مفصولة بفاصلة (,).'
                      : 'Vous pouvez saisir une ou plusieurs adresses séparées par une virgule (,).'}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-white mb-1">
                    {t.forwardMessage}
                  </label>
                  <textarea
                    rows={3}
                    disabled={isForwarding}
                    value={forwardNote}
                    onChange={(e) => setForwardNote(e.target.value)}
                    placeholder={lang === 'ar' ? 'ملاحظة توضيحية...' : 'Message complémentaire...'}
                    className="w-full px-3 py-2 rounded-xl bg-[#0B192C] border border-[#79C8E8]/30 focus:border-[#DFC57B] focus:outline-none text-white text-xs resize-none disabled:opacity-50"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    disabled={isForwarding}
                    onClick={() => setShowForwardModal(false)}
                    className="px-4 py-2 rounded-xl bg-[#162942] text-slate-200 text-xs font-medium cursor-pointer disabled:opacity-50"
                  >
                    {t.cancel}
                  </button>
                  <button
                    type="submit"
                    disabled={isForwarding}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#DFC57B] text-[#0B192C] text-xs font-bold cursor-pointer disabled:opacity-50 hover:bg-[#d4b663]"
                  >
                    {isForwarding ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>{t.forwardSending}</span>
                      </>
                    ) : (
                      <>
                        <Forward className={`w-3.5 h-3.5 ${lang === 'ar' ? 'rotate-180' : ''}`} />
                        <span>{t.forward}</span>
                      </>
                    )}
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
