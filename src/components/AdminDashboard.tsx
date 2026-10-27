import React, { useState, useMemo } from 'react';
import { 
  Building2, 
  Users, 
  HardDrive, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Send, 
  Plus, 
  FileText, 
  Image as ImageIcon, 
  Video, 
  Search,
  Sparkles,
  MapPin,
  RotateCcw,
  Download,
  Calendar,
  AlertTriangle,
  Archive,
  MessageCircle,
  Mail,
  ExternalLink,
  Upload,
  Settings,
  Link2,
  Copy,
  Check,
  ShieldCheck,
  Trash2,
  Eye,
  ChevronDown,
  ChevronUp,
  PieChart,
  LogIn,
  Activity,
  Database
} from 'lucide-react';
import { Attachment, AttachmentCategory, Language, PendingRegistration, Project, ProjectCategory, User, BackupSnapshot, AuditLogEntry, AuditLogCategory } from '../types';
import { translations } from '../i18n/translations';

interface AdminDashboardProps {
  lang: Language;
  users: User[];
  projects: Project[];
  attachments: Attachment[];
  pendingRegistrations: PendingRegistration[];
  backups: BackupSnapshot[];
  onApproveAccount: (registrationId: string) => void;
  onRejectAccount: (registrationId: string) => void;
  onDispatchAttachment: (newAttachment: Attachment) => void;
  onOpenViewer: (attachment: Attachment) => void;
  onCreateProject: (projectData: Omit<Project, 'id' | 'totalStorageBytes'>) => void;
  onDeleteProject?: (projectId: string) => void;
  onDeleteClient?: (clientId: string) => void;
  onDeleteAttachment?: (attachmentId: string) => void;
  onCreateBackup: (note?: string) => void;
  onRestoreBackup: (snapshotId: string) => void;
  onImportBackup?: (jsonStr: string) => void;
  showAdminLinkOnClient?: boolean;
  onToggleShowAdminLink?: (show: boolean) => void;
  auditLogs?: AuditLogEntry[];
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  lang,
  users,
  projects,
  attachments,
  pendingRegistrations,
  backups,
  onApproveAccount,
  onRejectAccount,
  onDispatchAttachment,
  onOpenViewer,
  onCreateProject,
  onDeleteProject,
  onDeleteClient,
  onDeleteAttachment,
  onCreateBackup,
  onRestoreBackup,
  showAdminLinkOnClient = false,
  onToggleShowAdminLink,
  auditLogs = [],
}) => {
  const t = translations[lang];

  type AdminTab = 'projects' | 'pending' | 'dispatch' | 'clients' | 'backups' | 'audit' | 'settings';
  const [activeTab, setActiveTab] = useState<AdminTab>(projects.length === 0 ? 'projects' : 'pending');
  const [copiedAdminUrl, setCopiedAdminUrl] = useState(false);

  // New Project Form State
  const [newProjName, setNewProjName] = useState('');
  const [newProjLocation, setNewProjLocation] = useState('');
  const [newProjType, setNewProjType] = useState<ProjectCategory>('tuyauterie');
  const [newProjClientId, setNewProjClientId] = useState<string>('');
  const [newProjDesc, setNewProjDesc] = useState('');
  const [projectCreatedSuccess, setProjectCreatedSuccess] = useState(false);

  // Dispatch form state
  const clientUsers = useMemo(() => users.filter((u) => u.role === 'client'), [users]);
  const [targetProjectId, setTargetProjectId] = useState<string>(projects[0]?.id || '');
  const [dispatchTitle, setDispatchTitle] = useState('');
  const [dispatchCategory, setDispatchCategory] = useState<AttachmentCategory>('document');
  const [dispatchNotes, setDispatchNotes] = useState('');
  const [dispatchChannel, setDispatchChannel] = useState<'email' | 'whatsapp' | 'both'>('both');
  const [dispatchFile, setDispatchFile] = useState<File | null>(null);
  const [dispatchFileDataUrl, setDispatchFileDataUrl] = useState<string | null>(null);
  const [dispatchSuccess, setDispatchSuccess] = useState(false);
  const [lastWhatsappUrl, setLastWhatsappUrl] = useState<string | null>(null);
  const [clientSearch, setClientSearch] = useState('');

  // Backup Form State
  const [backupNote, setBackupNote] = useState('');
  const [selectedBackupForRestore, setSelectedBackupForRestore] = useState<BackupSnapshot | null>(null);
  const [restoreConfirmedSuccess, setRestoreConfirmedSuccess] = useState(false);

  // Project Attachments Drawer & Destructive Action Confirmation State
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);
  const [confirmDeleteTarget, setConfirmDeleteTarget] = useState<{
    type: 'project' | 'client' | 'attachment';
    id: string;
    name: string;
    subtext?: string;
    relatedProjectsCount?: number;
    relatedAttachmentsCount?: number;
  } | null>(null);
  const [deleteSuccessMessage, setDeleteSuccessMessage] = useState<string | null>(null);

  const handleConfirmDeleteAction = () => {
    if (!confirmDeleteTarget) return;
    if (confirmDeleteTarget.type === 'project' && onDeleteProject) {
      onDeleteProject(confirmDeleteTarget.id);
      setDeleteSuccessMessage(
        lang === 'ar'
          ? `تم حذف المشروع "${confirmDeleteTarget.name}" وجميع المرفقات المرتبطة به بنجاح.`
          : `Le projet "${confirmDeleteTarget.name}" et ses documents associés ont été supprimés.`
      );
    } else if (confirmDeleteTarget.type === 'client' && onDeleteClient) {
      onDeleteClient(confirmDeleteTarget.id);
      setDeleteSuccessMessage(
        lang === 'ar'
          ? `تم حذف حساب العميل "${confirmDeleteTarget.name}" والمشاريع والمرفقات المرتبطة به بنجاح.`
          : `Le compte client "${confirmDeleteTarget.name}" et ses données associées ont été supprimés.`
      );
    } else if (confirmDeleteTarget.type === 'attachment' && onDeleteAttachment) {
      onDeleteAttachment(confirmDeleteTarget.id);
      setDeleteSuccessMessage(
        lang === 'ar'
          ? `تم حذف المرفق "${confirmDeleteTarget.name}" نهائياً بنجاح.`
          : `Le document "${confirmDeleteTarget.name}" a été supprimé définitivement.`
      );
    }
    setConfirmDeleteTarget(null);
    setTimeout(() => {
      setDeleteSuccessMessage(null);
    }, 4000);
  };

  // Flexible storage usage calculation (includes active + 30-day recoverable trash files, without arbitrary fixed cap)
  const totalStorageBytes = useMemo(() => {
    return attachments.reduce((acc, curr) => acc + curr.fileSizeBytes, 0);
  }, [attachments]);

  const formattedStorage = useMemo(() => {
    if (totalStorageBytes >= 1024 * 1024 * 1024) {
      return `${(totalStorageBytes / (1024 * 1024 * 1024)).toFixed(2)} Go`;
    }
    return `${(totalStorageBytes / (1024 * 1024)).toFixed(2)} Mo`;
  }, [totalStorageBytes]);

  // Attachment Analytics State & Distribution (PDF vs Images)
  const [hoveredAnalyticsSlice, setHoveredAnalyticsSlice] = useState<'pdf' | 'image' | null>(null);
  const [analyticsProjectFilter, setAnalyticsProjectFilter] = useState<string>('all');

  const attachmentAnalytics = useMemo(() => {
    const activeAttachments = attachments.filter((att) => {
      if (att.folder === 'trash') return false;
      if (analyticsProjectFilter !== 'all' && att.projectId !== analyticsProjectFilter) return false;
      return true;
    });

    const pdfFiles = activeAttachments.filter(
      (att) =>
        att.previewType === 'pdf' ||
        att.category === 'document' ||
        /\.pdf$/i.test(att.fileName)
    );

    const imageFiles = activeAttachments.filter(
      (att) =>
        !pdfFiles.some((p) => p.id === att.id) &&
        (att.previewType === 'image' ||
          att.category === 'photo' ||
          /\.(jpg|jpeg|png|webp|gif|svg|bmp)$/i.test(att.fileName))
    );

    const pdfCount = pdfFiles.length;
    const imageCount = imageFiles.length;
    const totalCompared = pdfCount + imageCount;

    const pdfPercent = totalCompared > 0 ? Math.round((pdfCount / totalCompared) * 100) : 0;
    const imagePercent = totalCompared > 0 ? 100 - pdfPercent : 0;

    const pdfBytes = pdfFiles.reduce((acc, item) => acc + (item.fileSizeBytes || 0), 0);
    const imageBytes = imageFiles.reduce((acc, item) => acc + (item.fileSizeBytes || 0), 0);

    const formatBytes = (bytes: number) => {
      if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} Mo`;
      if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
      return `${bytes} o`;
    };

    // SVG Pie Chart geometry helper (center 100,100, radius 82)
    const createPieSlicePath = (startAngleDeg: number, endAngleDeg: number, radius = 82) => {
      const cx = 100;
      const cy = 100;
      const clampedSpan = Math.min(Math.max(endAngleDeg - startAngleDeg, 0), 359.99);
      const startRad = ((startAngleDeg - 90) * Math.PI) / 180;
      const endRad = ((startAngleDeg + clampedSpan - 90) * Math.PI) / 180;

      const x1 = cx + radius * Math.cos(startRad);
      const y1 = cy + radius * Math.sin(startRad);
      const x2 = cx + radius * Math.cos(endRad);
      const y2 = cy + radius * Math.sin(endRad);
      const largeArcFlag = clampedSpan > 180 ? 1 : 0;

      return `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
    };

    const pdfAngle = totalCompared > 0 ? (pdfCount / totalCompared) * 360 : 0;

    return {
      pdfFiles,
      imageFiles,
      pdfCount,
      imageCount,
      totalCompared,
      pdfPercent,
      imagePercent,
      pdfSizeFormatted: formatBytes(pdfBytes),
      imageSizeFormatted: formatBytes(imageBytes),
      totalSizeFormatted: formatBytes(pdfBytes + imageBytes),
      pdfAngle,
      pdfSlicePath: pdfCount > 0 && imageCount > 0 ? createPieSlicePath(0, pdfAngle) : '',
      imageSlicePath: pdfCount > 0 && imageCount > 0 ? createPieSlicePath(pdfAngle, 360) : '',
    };
  }, [attachments, analyticsProjectFilter]);

  // Audit Log State, Filtering & Export
  const [auditCategoryFilter, setAuditCategoryFilter] = useState<'all' | AuditLogCategory>('all');
  const [auditSearchQuery, setAuditSearchQuery] = useState('');
  const [showAllAuditRows, setShowAllAuditRows] = useState(false);

  const auditCounts = useMemo(() => {
    const login = auditLogs.filter((l) => l.category === 'login').length;
    const download = auditLogs.filter((l) => l.category === 'download').length;
    const modification = auditLogs.filter((l) => l.category === 'modification').length;
    return {
      total: auditLogs.length,
      login,
      download,
      modification,
    };
  }, [auditLogs]);

  const filteredAuditLogs = useMemo(() => {
    const q = auditSearchQuery.trim().toLowerCase();
    return auditLogs.filter((entry) => {
      if (auditCategoryFilter !== 'all' && entry.category !== auditCategoryFilter) {
        return false;
      }
      if (!q) return true;
      return (
        entry.actorName.toLowerCase().includes(q) ||
        entry.actorEmail.toLowerCase().includes(q) ||
        entry.targetName.toLowerCase().includes(q) ||
        entry.action.toLowerCase().includes(q) ||
        entry.details.toLowerCase().includes(q)
      );
    });
  }, [auditLogs, auditCategoryFilter, auditSearchQuery]);

  const handleExportAuditLogCsv = () => {
    const headers = ['Timestamp (ISO)', 'Category', 'Action', 'Actor Name', 'Actor Email', 'Role', 'Target', 'Details'];
    const escapeCsv = (val: string) => `"${String(val || '').replace(/"/g, '""')}"`;
    const rows = filteredAuditLogs.map((log) => [
      escapeCsv(log.timestamp),
      escapeCsv(log.category),
      escapeCsv(log.action),
      escapeCsv(log.actorName),
      escapeCsv(log.actorEmail),
      escapeCsv(log.actorRole),
      escapeCsv(log.targetName),
      escapeCsv(log.details),
    ]);
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ISONIL_Audit_Log_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatAuditTimestamp = (iso: string) => {
    try {
      const d = new Date(iso);
      const datePart = d.toLocaleDateString(lang === 'ar' ? 'ar-MA' : 'fr-FR', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
      });
      const timePart = d.toLocaleTimeString(lang === 'ar' ? 'ar-MA' : 'fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      return { datePart, timePart };
    } catch {
      return { datePart: iso.slice(0, 10), timePart: iso.slice(11, 19) };
    }
  };

  // Find target project and client
  const activeTargetProject = projects.find((p) => p.id === targetProjectId) || projects[0];
  const activeTargetClient = clientUsers.find((c) => c.id === activeTargetProject?.clientId);

  const handleDispatchFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setDispatchFile(file);
    if (!dispatchTitle) {
      setDispatchTitle(file.name.replace(/\.[^/.]+$/, '').replace(/[_|-]/g, ' '));
    }
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (['jpg', 'jpeg', 'png', 'webp'].includes(ext)) setDispatchCategory('photo');
    else if (['mp4', 'mov', 'avi', 'webm'].includes(ext)) setDispatchCategory('video');
    else if (['pdf', 'doc', 'docx', 'xls', 'xlsx'].includes(ext)) setDispatchCategory('document');

    if (file.size <= 15 * 1024 * 1024) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') setDispatchFileDataUrl(reader.result);
      };
      reader.readAsDataURL(file);
    } else {
      setDispatchFileDataUrl(URL.createObjectURL(file));
    }
  };

  // Handle Project Creation
  const handleCreateProjectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjName || !newProjLocation) return;

    const assignedClient = clientUsers.find((c) => c.id === newProjClientId);

    onCreateProject({
      name: newProjName,
      location: newProjLocation,
      type: newProjType,
      clientId: newProjClientId || 'general',
      clientName: assignedClient ? assignedClient.companyName : 'Général / ISONIL',
      status: 'in_progress',
      startDate: new Date().toISOString().split('T')[0],
      completionPercentage: 0,
      description: newProjDesc,
    });

    setProjectCreatedSuccess(true);
    setNewProjName('');
    setNewProjLocation('');
    setNewProjDesc('');

    setTimeout(() => {
      setProjectCreatedSuccess(false);
    }, 2500);
  };

  // Handle Dispatch submission
  const handleDispatchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dispatchTitle || !targetProjectId) return;

    const proj = projects.find((p) => p.id === targetProjectId);
    if (!proj) return;

    const newAttachment: Attachment = {
      id: `att-dispatch-${Date.now()}`,
      projectId: proj.id,
      projectName: proj.name,
      clientId: proj.clientId,
      senderType: 'admin',
      senderName: 'Direction ISONIL Maroc',
      title: dispatchTitle.trim(),
      category: dispatchCategory,
      fileUrl: dispatchFileDataUrl || '/1000127391_10ae27f3.jpg',
      fileName: dispatchFile ? dispatchFile.name : `ISONIL_Rapport_${Date.now()}.pdf`,
      fileSizeBytes: dispatchFile ? dispatchFile.size : 4200000,
      uploadedAt: new Date().toISOString(),
      folder: 'sent',
      starred: true,
      notes: dispatchNotes.trim(),
      previewType: dispatchCategory === 'photo' ? 'image' : dispatchCategory === 'video' ? 'video' : 'pdf',
      downloadCount: 0,
    };

    onDispatchAttachment(newAttachment);
    setDispatchSuccess(true);

    // If channel includes WhatsApp, generate optional manual launch link (never forced automatically)
    if (dispatchChannel === 'whatsapp' || dispatchChannel === 'both') {
      const clientPhone = activeTargetClient?.phone || '+212710738409';
      const cleanPhone = clientPhone.replace(/[^0-9]/g, '');
      const waMsg = `${t.whatsappPreviewMessage}\n\n*${dispatchTitle}*\nProjet: ${proj.name}\n${dispatchNotes ? `Notes: ${dispatchNotes}\n` : ''}`;
      setLastWhatsappUrl(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(waMsg)}`);
    } else {
      setLastWhatsappUrl(null);
    }

    setDispatchTitle('');
    setDispatchNotes('');
    setDispatchFile(null);
    setDispatchFileDataUrl(null);

    setTimeout(() => {
      setDispatchSuccess(false);
    }, 5000);
  };

  const handleDownloadBackupJson = (snap: BackupSnapshot) => {
    const blob = new Blob([snap.payloadJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ISONIL_Backup_${snap.timestamp.replace(/[:.]/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleConfirmRestore = () => {
    if (!selectedBackupForRestore) return;
    onRestoreBackup(selectedBackupForRestore.id);
    setRestoreConfirmedSuccess(true);
    setTimeout(() => {
      setSelectedBackupForRestore(null);
      setRestoreConfirmedSuccess(false);
    }, 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {deleteSuccessMessage && (
        <div className="p-4 rounded-2xl bg-emerald-950/80 border border-emerald-700 text-emerald-300 text-xs font-semibold flex items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{deleteSuccessMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setDeleteSuccessMessage(null)}
            className="text-emerald-400 hover:text-white text-xs font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* 1. TOP EXECUTIVE KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#112239] border border-[#79C8E8]/25 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#A9DDF1]">{lang === 'ar' ? 'إجمالي المشاريع' : 'Total Projets'}</span>
            <div className="w-8 h-8 rounded-xl bg-[#0B192C] border border-[#DFC57B]/40 flex items-center justify-center text-[#DFC57B]">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-white mt-2 font-mono">{projects.length}</p>
          <p className="text-[11px] text-slate-300 mt-1">{lang === 'ar' ? 'مشاريع حية وموثقة' : 'Chantiers actifs'}</p>
        </div>

        <div className="bg-[#112239] border border-[#79C8E8]/25 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#A9DDF1]">{lang === 'ar' ? 'العملاء المعتمدين' : 'Clients Actifs'}</span>
            <div className="w-8 h-8 rounded-xl bg-[#0B192C] border border-[#79C8E8]/40 flex items-center justify-center text-[#79C8E8]">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-white mt-2 font-mono">{clientUsers.length}</p>
          <p className="text-[11px] text-slate-300 mt-1">{lang === 'ar' ? 'شركات صناعية وطاقية' : 'Comptes certifiés'}</p>
        </div>

        <div className="bg-[#112239] border border-[#79C8E8]/25 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#A9DDF1]">{lang === 'ar' ? 'طلبات بانتظار التفعيل' : 'En Attente'}</span>
            <div className="w-8 h-8 rounded-xl bg-[#0B192C] border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-white mt-2 font-mono">{pendingRegistrations.length}</p>
          <p className="text-[11px] text-amber-300 mt-1">{lang === 'ar' ? 'تتطلب مراجعة المشرف' : 'Validation requise'}</p>
        </div>

        <div className="bg-[#112239] border border-[#79C8E8]/25 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#A9DDF1]">{lang === 'ar' ? 'المساحة المستخدمة' : 'Stockage Utilisé'}</span>
            <div className="w-8 h-8 rounded-xl bg-[#0B192C] border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <HardDrive className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <p className="text-2xl font-black text-white font-mono">{formattedStorage}</p>
          </div>
          <p className="text-[11px] text-emerald-400 mt-1 font-medium">{t.unlimitedStorageBadge}</p>
        </div>
      </div>

      {/* 1.5 ATTACHMENT ANALYTICS SECTION (PDF vs Images Pie Chart) */}
      <div className="bg-[#112239] border border-[#79C8E8]/25 rounded-2xl p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-5 border-b border-[#79C8E8]/15">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0B192C] border border-[#DFC57B]/40 flex items-center justify-center text-[#DFC57B] shrink-0">
              <PieChart className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-extrabold text-white tracking-tight">
                  {lang === 'ar' ? 'تحليلات المرفقات — Attachment Analytics' : 'Attachment Analytics — Répartition des Fichiers'}
                </h2>
                <span className="px-2 py-0.5 rounded-md bg-[#0B192C] border border-[#79C8E8]/30 text-[10px] font-mono text-[#79C8E8]">
                  PDF vs Images
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                {lang === 'ar'
                  ? 'توزيع أنواع الملفات المرفقة في البوابة (ملفات PDF الهندسية مقابل الصور الميدانية)'
                  : 'Distribution des types de pièces jointes actives (Documents PDF vs Images de chantier)'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-[11px] text-slate-300 font-medium whitespace-nowrap">
              {lang === 'ar' ? 'نطاق التحليل:' : 'Périmètre :'}
            </label>
            <select
              value={analyticsProjectFilter}
              onChange={(e) => setAnalyticsProjectFilter(e.target.value)}
              className="px-3 py-1.5 bg-[#0B192C] border border-[#79C8E8]/30 rounded-xl text-xs text-white focus:outline-none focus:border-[#DFC57B]"
            >
              <option value="all">
                {lang === 'ar' ? `جميع المشاريع (${projects.length})` : `Tous les projets (${projects.length})`}
              </option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Interactive SVG Pie Chart */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center bg-[#0B192C]/70 border border-[#79C8E8]/15 rounded-2xl p-5">
            <div className="relative w-52 h-52 flex items-center justify-center">
              <svg
                viewBox="0 0 200 200"
                className="w-full h-full drop-shadow-lg overflow-visible"
                role="img"
                aria-label="Attachment Analytics Pie Chart: PDF vs Images"
              >
                {attachmentAnalytics.totalCompared === 0 ? (
                  <circle
                    cx="100"
                    cy="100"
                    r="82"
                    fill="none"
                    stroke="#334155"
                    strokeWidth="18"
                    strokeDasharray="6 4"
                  />
                ) : attachmentAnalytics.pdfCount > 0 && attachmentAnalytics.imageCount === 0 ? (
                  <circle
                    cx="100"
                    cy="100"
                    r="82"
                    fill="#DFC57B"
                    stroke="#0B192C"
                    strokeWidth="3"
                    className="transition-transform duration-200 origin-center hover:scale-[1.03] cursor-pointer"
                    onMouseEnter={() => setHoveredAnalyticsSlice('pdf')}
                    onMouseLeave={() => setHoveredAnalyticsSlice(null)}
                  />
                ) : attachmentAnalytics.imageCount > 0 && attachmentAnalytics.pdfCount === 0 ? (
                  <circle
                    cx="100"
                    cy="100"
                    r="82"
                    fill="#79C8E8"
                    stroke="#0B192C"
                    strokeWidth="3"
                    className="transition-transform duration-200 origin-center hover:scale-[1.03] cursor-pointer"
                    onMouseEnter={() => setHoveredAnalyticsSlice('image')}
                    onMouseLeave={() => setHoveredAnalyticsSlice(null)}
                  />
                ) : (
                  <>
                    {/* PDF Slice */}
                    <path
                      d={attachmentAnalytics.pdfSlicePath}
                      fill="#DFC57B"
                      stroke="#0B192C"
                      strokeWidth="3"
                      className={`transition-all duration-200 origin-center cursor-pointer ${
                        hoveredAnalyticsSlice === 'pdf'
                          ? 'scale-[1.04] opacity-100'
                          : hoveredAnalyticsSlice === 'image'
                          ? 'opacity-65'
                          : 'opacity-95 hover:opacity-100'
                      }`}
                      onMouseEnter={() => setHoveredAnalyticsSlice('pdf')}
                      onMouseLeave={() => setHoveredAnalyticsSlice(null)}
                    >
                      <title>{`PDF: ${attachmentAnalytics.pdfCount} (${attachmentAnalytics.pdfPercent}%)`}</title>
                    </path>

                    {/* Images Slice */}
                    <path
                      d={attachmentAnalytics.imageSlicePath}
                      fill="#79C8E8"
                      stroke="#0B192C"
                      strokeWidth="3"
                      className={`transition-all duration-200 origin-center cursor-pointer ${
                        hoveredAnalyticsSlice === 'image'
                          ? 'scale-[1.04] opacity-100'
                          : hoveredAnalyticsSlice === 'pdf'
                          ? 'opacity-65'
                          : 'opacity-95 hover:opacity-100'
                      }`}
                      onMouseEnter={() => setHoveredAnalyticsSlice('image')}
                      onMouseLeave={() => setHoveredAnalyticsSlice(null)}
                    >
                      <title>{`Images: ${attachmentAnalytics.imageCount} (${attachmentAnalytics.imagePercent}%)`}</title>
                    </path>
                  </>
                )}

                {/* Inner Donut Cutout for Clean Executive Readout */}
                <circle
                  cx="100"
                  cy="100"
                  r="44"
                  fill="#0B192C"
                  stroke="rgba(121, 200, 232, 0.25)"
                  strokeWidth="2"
                />
              </svg>

              {/* Center Dynamic Readout */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-2">
                {hoveredAnalyticsSlice === 'pdf' ? (
                  <>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#DFC57B]">PDF</span>
                    <span className="text-xl font-black text-white font-mono">
                      {attachmentAnalytics.pdfPercent}%
                    </span>
                    <span className="text-[10px] text-slate-300 font-mono">
                      {attachmentAnalytics.pdfCount} {lang === 'ar' ? 'ملف' : 'fichiers'}
                    </span>
                  </>
                ) : hoveredAnalyticsSlice === 'image' ? (
                  <>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#79C8E8]">
                      {lang === 'ar' ? 'صور' : 'Images'}
                    </span>
                    <span className="text-xl font-black text-white font-mono">
                      {attachmentAnalytics.imagePercent}%
                    </span>
                    <span className="text-[10px] text-slate-300 font-mono">
                      {attachmentAnalytics.imageCount} {lang === 'ar' ? 'صورة' : 'fichiers'}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-[10px] font-semibold text-slate-400">
                      {lang === 'ar' ? 'الإجمالي' : 'Total'}
                    </span>
                    <span className="text-xl font-black text-white font-mono">
                      {attachmentAnalytics.totalCompared}
                    </span>
                    <span className="text-[10px] text-[#A9DDF1] font-mono">
                      {attachmentAnalytics.totalSizeFormatted}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Interactive Legend Pills */}
            <div className="flex items-center justify-center gap-4 mt-4 flex-wrap">
              <button
                type="button"
                onMouseEnter={() => setHoveredAnalyticsSlice('pdf')}
                onMouseLeave={() => setHoveredAnalyticsSlice(null)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs transition-all cursor-pointer ${
                  hoveredAnalyticsSlice === 'pdf'
                    ? 'bg-[#DFC57B]/20 border-[#DFC57B] text-white'
                    : 'bg-[#112239] border-[#DFC57B]/30 text-slate-200'
                }`}
              >
                <span className="w-3 h-3 rounded-sm bg-[#DFC57B] inline-block shrink-0" />
                <span className="font-bold">PDF</span>
                <span className="font-mono text-[#DFC57B] font-bold">
                  {attachmentAnalytics.pdfPercent}% ({attachmentAnalytics.pdfCount})
                </span>
              </button>

              <button
                type="button"
                onMouseEnter={() => setHoveredAnalyticsSlice('image')}
                onMouseLeave={() => setHoveredAnalyticsSlice(null)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs transition-all cursor-pointer ${
                  hoveredAnalyticsSlice === 'image'
                    ? 'bg-[#79C8E8]/20 border-[#79C8E8] text-white'
                    : 'bg-[#112239] border-[#79C8E8]/30 text-slate-200'
                }`}
              >
                <span className="w-3 h-3 rounded-sm bg-[#79C8E8] inline-block shrink-0" />
                <span className="font-bold">{lang === 'ar' ? 'الصور (Images)' : 'Images'}</span>
                <span className="font-mono text-[#79C8E8] font-bold">
                  {attachmentAnalytics.imagePercent}% ({attachmentAnalytics.imageCount})
                </span>
              </button>
            </div>
          </div>

          {/* Detailed PDF vs Images Breakdown Cards */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* PDF Documents Card */}
            <div
              onMouseEnter={() => setHoveredAnalyticsSlice('pdf')}
              onMouseLeave={() => setHoveredAnalyticsSlice(null)}
              className={`bg-[#0B192C] border rounded-2xl p-4 transition-all ${
                hoveredAnalyticsSlice === 'pdf'
                  ? 'border-[#DFC57B] shadow-lg shadow-[#DFC57B]/10'
                  : 'border-[#DFC57B]/30'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#DFC57B]/15 border border-[#DFC57B]/40 flex items-center justify-center text-[#DFC57B]">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-extrabold text-white">
                      {lang === 'ar' ? 'ملفات ومستندات PDF' : 'Documents PDF'}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      {lang === 'ar' ? 'التقارير، المخططات، والشهادات' : 'Rapports, plans & devis'}
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-[#DFC57B]/15 text-[#DFC57B] font-mono text-xs font-black">
                  {attachmentAnalytics.pdfPercent}%
                </span>
              </div>

              <div className="flex items-baseline justify-between mb-2">
                <div>
                  <span className="text-2xl font-black text-white font-mono">
                    {attachmentAnalytics.pdfCount}
                  </span>
                  <span className="text-xs text-slate-300 ms-1.5">
                    {lang === 'ar' ? 'ملف PDF' : 'fichiers PDF'}
                  </span>
                </div>
                <span className="text-xs font-mono text-[#DFC57B] font-semibold">
                  {attachmentAnalytics.pdfSizeFormatted}
                </span>
              </div>

              <div className="w-full h-2 rounded-full bg-[#112239] overflow-hidden mb-3">
                <div
                  className="h-full bg-[#DFC57B] rounded-full transition-all duration-500"
                  style={{ width: `${attachmentAnalytics.pdfPercent}%` }}
                />
              </div>

              {attachmentAnalytics.pdfFiles.length > 0 ? (
                <div className="space-y-1.5 pt-2 border-t border-white/10">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase">
                    {lang === 'ar' ? 'أحدث ملفات PDF:' : 'Derniers fichiers PDF :'}
                  </p>
                  {attachmentAnalytics.pdfFiles.slice(0, 2).map((att) => (
                    <button
                      key={att.id}
                      type="button"
                      onClick={() => onOpenViewer(att)}
                      className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-[#112239]/80 hover:bg-[#112239] text-start text-[11px] text-slate-200 hover:text-white transition-colors cursor-pointer"
                    >
                      <span className="truncate font-medium">{att.title}</span>
                      <Eye className="w-3.5 h-3.5 text-[#DFC57B] shrink-0" />
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-slate-400 pt-2 border-t border-white/10">
                  {lang === 'ar' ? 'لا توجد ملفات PDF حالياً' : 'Aucun document PDF'}
                </p>
              )}
            </div>

            {/* Images Card */}
            <div
              onMouseEnter={() => setHoveredAnalyticsSlice('image')}
              onMouseLeave={() => setHoveredAnalyticsSlice(null)}
              className={`bg-[#0B192C] border rounded-2xl p-4 transition-all ${
                hoveredAnalyticsSlice === 'image'
                  ? 'border-[#79C8E8] shadow-lg shadow-[#79C8E8]/10'
                  : 'border-[#79C8E8]/30'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#79C8E8]/15 border border-[#79C8E8]/40 flex items-center justify-center text-[#79C8E8]">
                    <ImageIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-extrabold text-white">
                      {lang === 'ar' ? 'الصور الفوتوغرافية (Images)' : 'Images & Photos'}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      {lang === 'ar' ? 'توثيق الأوراش والعزل الحراري' : 'Suivi visuel & chantiers'}
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-[#79C8E8]/15 text-[#79C8E8] font-mono text-xs font-black">
                  {attachmentAnalytics.imagePercent}%
                </span>
              </div>

              <div className="flex items-baseline justify-between mb-2">
                <div>
                  <span className="text-2xl font-black text-white font-mono">
                    {attachmentAnalytics.imageCount}
                  </span>
                  <span className="text-xs text-slate-300 ms-1.5">
                    {lang === 'ar' ? 'صورة مرفقة' : 'fichiers image'}
                  </span>
                </div>
                <span className="text-xs font-mono text-[#79C8E8] font-semibold">
                  {attachmentAnalytics.imageSizeFormatted}
                </span>
              </div>

              <div className="w-full h-2 rounded-full bg-[#112239] overflow-hidden mb-3">
                <div
                  className="h-full bg-[#79C8E8] rounded-full transition-all duration-500"
                  style={{ width: `${attachmentAnalytics.imagePercent}%` }}
                />
              </div>

              {attachmentAnalytics.imageFiles.length > 0 ? (
                <div className="space-y-1.5 pt-2 border-t border-white/10">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase">
                    {lang === 'ar' ? 'أحدث الصور المرفقة:' : 'Dernières images :'}
                  </p>
                  {attachmentAnalytics.imageFiles.slice(0, 2).map((att) => (
                    <button
                      key={att.id}
                      type="button"
                      onClick={() => onOpenViewer(att)}
                      className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-[#112239]/80 hover:bg-[#112239] text-start text-[11px] text-slate-200 hover:text-white transition-colors cursor-pointer"
                    >
                      <span className="truncate font-medium">{att.title}</span>
                      <Eye className="w-3.5 h-3.5 text-[#79C8E8] shrink-0" />
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-slate-400 pt-2 border-t border-white/10">
                  {lang === 'ar' ? 'لا توجد صور مرفقة حالياً' : 'Aucune image'}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2. ADMIN NAVIGATION TABS */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-[#112239] border border-[#79C8E8]/25 rounded-2xl">
        <button
          onClick={() => setActiveTab('projects')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'projects'
              ? 'bg-[#DFC57B] text-[#0B192C] font-bold shadow-md'
              : 'text-slate-200 hover:bg-[#162942] hover:text-white'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>{lang === 'ar' ? 'إدارة المشاريع وإضافتها' : 'Chantiers & Projets'}</span>
          <span className="px-1.5 py-0.2 rounded-full bg-black/20 text-[10px] font-mono">
            {projects.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('pending')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'pending'
              ? 'bg-[#DFC57B] text-[#0B192C] font-bold shadow-md'
              : 'text-slate-200 hover:bg-[#162942] hover:text-white'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>{lang === 'ar' ? 'طلبات التسجيل الجديدة' : 'Demandes d\'Accès'}</span>
          {pendingRegistrations.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 text-[10px] font-bold">
              {pendingRegistrations.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('dispatch')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'dispatch'
              ? 'bg-[#DFC57B] text-[#0B192C] font-bold shadow-md'
              : 'text-slate-200 hover:bg-[#162942] hover:text-white'
          }`}
        >
          <Send className={`w-4 h-4 ${lang === 'ar' ? 'rotate-180' : ''}`} />
          <span>{lang === 'ar' ? 'إرسال مرفقات للعملاء (صادر الإدارة)' : 'Expédition Client (Sortant)'}</span>
        </button>

        <button
          onClick={() => setActiveTab('clients')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'clients'
              ? 'bg-[#DFC57B] text-[#0B192C] font-bold shadow-md'
              : 'text-slate-200 hover:bg-[#162942] hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>{lang === 'ar' ? 'سجل الشركات والعملاء' : 'Répertoire Clients'}</span>
          <span className="px-1.5 py-0.2 rounded-full bg-black/20 text-[10px] font-mono">
            {clientUsers.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('backups')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'backups'
              ? 'bg-[#DFC57B] text-[#0B192C] font-bold shadow-md'
              : 'text-slate-200 hover:bg-[#162942] hover:text-white'
          }`}
        >
          <Archive className="w-4 h-4" />
          <span>{t.backupTitle}</span>
          <span className="px-1.5 py-0.2 rounded-full bg-black/20 text-[10px] font-mono">
            {backups.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'audit'
              ? 'bg-[#DFC57B] text-[#0B192C] font-bold shadow-md'
              : 'text-slate-200 hover:bg-[#162942] hover:text-white'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>{lang === 'ar' ? 'سجل التدقيق الأمني (Audit Log)' : 'Audit Log & Sécurité'}</span>
          <span className="px-1.5 py-0.2 rounded-full bg-black/20 text-[10px] font-mono">
            {auditLogs.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'settings'
              ? 'bg-[#DFC57B] text-[#0B192C] font-bold shadow-md'
              : 'text-slate-200 hover:bg-[#162942] hover:text-white'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>{lang === 'ar' ? 'إعدادات مسار الإدارة' : 'Paramètres d\'Accès'}</span>
        </button>
      </div>

      {/* AUDIT LOG SECTION (Always visible when 'audit' tab is active, and shown as a live security monitor in the dashboard) */}
      <div className="bg-[#112239] border border-[#79C8E8]/25 rounded-2xl p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 mb-5 border-b border-[#79C8E8]/15">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0B192C] border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-extrabold text-white tracking-tight">
                  {lang === 'ar' ? 'سجل التدقيق الأمني — Audit Log' : 'Audit Log — Surveillance & Sécurité'}
                </h2>
                <span className="px-2 py-0.5 rounded-md bg-emerald-950/80 border border-emerald-700/60 text-[10px] font-mono text-emerald-400">
                  {lang === 'ar' ? 'مراقبة فورية' : 'Monitoring Actif'}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                {lang === 'ar'
                  ? 'تتبع دقيق لعمليات تسجيل دخول المستخدمين، تنزيل الملفات، والتوقيت الزمني لتعديل أو حذف البيانات'
                  : 'Traçabilité horodatée des connexions utilisateurs, téléchargements de fichiers et modifications de données'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute top-1/2 -translate-y-1/2 start-3 pointer-events-none" />
              <input
                type="text"
                value={auditSearchQuery}
                onChange={(e) => setAuditSearchQuery(e.target.value)}
                placeholder={lang === 'ar' ? 'بحث بالمستخدم أو الملف أو الحدث...' : 'Rechercher utilisateur, fichier, action...'}
                className="ps-8 pe-3 py-1.5 bg-[#0B192C] border border-[#79C8E8]/30 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-[#DFC57B] w-56 sm:w-64"
              />
            </div>

            {/* Export CSV Button */}
            <button
              type="button"
              onClick={handleExportAuditLogCsv}
              className="px-3 py-1.5 rounded-xl bg-[#0B192C] hover:bg-[#162942] border border-[#DFC57B]/40 text-xs font-bold text-[#DFC57B] flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{lang === 'ar' ? 'تصدير السجل (CSV)' : 'Exporter CSV'}</span>
            </button>
          </div>
        </div>

        {/* Category Filter Bar + Metric Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <button
            type="button"
            onClick={() => setAuditCategoryFilter('all')}
            className={`flex items-center justify-between p-3 rounded-xl border text-start transition-all cursor-pointer ${
              auditCategoryFilter === 'all'
                ? 'bg-[#DFC57B]/15 border-[#DFC57B] text-white shadow-md'
                : 'bg-[#0B192C] border-[#79C8E8]/20 text-slate-300 hover:border-[#79C8E8]/40'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Activity className="w-4 h-4 text-[#DFC57B]" />
              <div>
                <p className="text-[11px] font-bold text-white">
                  {lang === 'ar' ? 'جميع الأحداث' : 'Tous les événements'}
                </p>
                <p className="text-[10px] text-slate-400">All Events</p>
              </div>
            </div>
            <span className="text-sm font-black font-mono text-[#DFC57B]">{auditCounts.total}</span>
          </button>

          <button
            type="button"
            onClick={() => setAuditCategoryFilter('login')}
            className={`flex items-center justify-between p-3 rounded-xl border text-start transition-all cursor-pointer ${
              auditCategoryFilter === 'login'
                ? 'bg-emerald-500/15 border-emerald-400 text-white shadow-md'
                : 'bg-[#0B192C] border-[#79C8E8]/20 text-slate-300 hover:border-emerald-500/40'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <LogIn className="w-4 h-4 text-emerald-400" />
              <div>
                <p className="text-[11px] font-bold text-white">
                  {lang === 'ar' ? 'تسجيلات الدخول' : 'Connexions'}
                </p>
                <p className="text-[10px] text-slate-400">User Logins</p>
              </div>
            </div>
            <span className="text-sm font-black font-mono text-emerald-400">{auditCounts.login}</span>
          </button>

          <button
            type="button"
            onClick={() => setAuditCategoryFilter('download')}
            className={`flex items-center justify-between p-3 rounded-xl border text-start transition-all cursor-pointer ${
              auditCategoryFilter === 'download'
                ? 'bg-[#79C8E8]/15 border-[#79C8E8] text-white shadow-md'
                : 'bg-[#0B192C] border-[#79C8E8]/20 text-slate-300 hover:border-[#79C8E8]/40'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Download className="w-4 h-4 text-[#79C8E8]" />
              <div>
                <p className="text-[11px] font-bold text-white">
                  {lang === 'ar' ? 'تنزيلات الملفات' : 'Téléchargements'}
                </p>
                <p className="text-[10px] text-slate-400">File Downloads</p>
              </div>
            </div>
            <span className="text-sm font-black font-mono text-[#79C8E8]">{auditCounts.download}</span>
          </button>

          <button
            type="button"
            onClick={() => setAuditCategoryFilter('modification')}
            className={`flex items-center justify-between p-3 rounded-xl border text-start transition-all cursor-pointer ${
              auditCategoryFilter === 'modification'
                ? 'bg-amber-500/15 border-amber-400 text-white shadow-md'
                : 'bg-[#0B192C] border-[#79C8E8]/20 text-slate-300 hover:border-amber-500/40'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Database className="w-4 h-4 text-amber-400" />
              <div>
                <p className="text-[11px] font-bold text-white">
                  {lang === 'ar' ? 'تعديلات البيانات' : 'Modifications'}
                </p>
                <p className="text-[10px] text-slate-400">Data Modifications</p>
              </div>
            </div>
            <span className="text-sm font-black font-mono text-amber-400">{auditCounts.modification}</span>
          </button>
        </div>

        {/* Chronological Audit Table */}
        <div className="overflow-x-auto rounded-xl border border-[#79C8E8]/20 bg-[#0B192C]">
          <table className="w-full text-start border-collapse">
            <thead>
              <tr className="border-b border-[#79C8E8]/20 bg-[#112239]/70 text-[11px] font-bold text-[#A9DDF1]">
                <th className="py-3 px-4 text-start whitespace-nowrap">
                  {lang === 'ar' ? 'التوقيت الزمني (Timestamp)' : 'Horodatage (Timestamp)'}
                </th>
                <th className="py-3 px-4 text-start whitespace-nowrap">
                  {lang === 'ar' ? 'النوع والعملية' : 'Catégorie & Action'}
                </th>
                <th className="py-3 px-4 text-start whitespace-nowrap">
                  {lang === 'ar' ? 'المستخدم (Actor)' : 'Utilisateur & Rôle'}
                </th>
                <th className="py-3 px-4 text-start whitespace-nowrap">
                  {lang === 'ar' ? 'العنصر المستهدف' : 'Cible / Ressource'}
                </th>
                <th className="py-3 px-4 text-start">
                  {lang === 'ar' ? 'تفاصيل العملية' : 'Détails de l\'Opération'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs">
              {filteredAuditLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    {lang === 'ar'
                      ? 'لا توجد سجلات تدقيق مطابقة لمعايير البحث الحالية.'
                      : 'Aucune entrée d\'audit ne correspond aux critères sélectionnés.'}
                  </td>
                </tr>
              ) : (
                (activeTab === 'audit' || showAllAuditRows
                  ? filteredAuditLogs
                  : filteredAuditLogs.slice(0, 6)
                ).map((entry) => {
                  const { datePart, timePart } = formatAuditTimestamp(entry.timestamp);
                  const isCritical = entry.severity === 'critical' || entry.action.includes('DELETED');

                  return (
                    <tr
                      key={entry.id}
                      className="hover:bg-[#112239]/50 transition-colors"
                    >
                      {/* Timestamp */}
                      <td className="py-3 px-4 whitespace-nowrap align-top">
                        <div className="flex flex-col font-mono">
                          <span className="text-white font-bold text-[11px]">{datePart}</span>
                          <span className="text-[10px] text-[#79C8E8]">{timePart}</span>
                        </div>
                      </td>

                      {/* Category & Action Badge */}
                      <td className="py-3 px-4 whitespace-nowrap align-top">
                        <div className="flex flex-col items-start gap-1">
                          {entry.category === 'login' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-950/90 border border-emerald-700/60 text-emerald-300 text-[10px] font-bold">
                              <LogIn className="w-3 h-3" />
                              <span>{lang === 'ar' ? 'تسجيل دخول' : 'Connexion'}</span>
                            </span>
                          ) : entry.category === 'download' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-sky-950/90 border border-[#79C8E8]/50 text-[#79C8E8] text-[10px] font-bold">
                              <Download className="w-3 h-3" />
                              <span>{lang === 'ar' ? 'تنزيل ملف' : 'Téléchargement'}</span>
                            </span>
                          ) : (
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md border text-[10px] font-bold ${
                                isCritical
                                  ? 'bg-red-950/90 border-red-700/60 text-red-300'
                                  : 'bg-amber-950/80 border-amber-700/60 text-[#DFC57B]'
                              }`}
                            >
                              <Database className="w-3 h-3" />
                              <span>
                                {isCritical
                                  ? lang === 'ar'
                                    ? 'حذف بيانات'
                                    : 'Suppression'
                                  : lang === 'ar'
                                  ? 'تعديل بيانات'
                                  : 'Modification'}
                              </span>
                            </span>
                          )}
                          <span className="text-[10px] font-mono text-slate-400">{entry.action}</span>
                        </div>
                      </td>

                      {/* Actor */}
                      <td className="py-3 px-4 whitespace-nowrap align-top">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-white text-xs">{entry.actorName}</span>
                            <span
                              className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${
                                entry.actorRole === 'admin'
                                  ? 'bg-[#DFC57B]/20 text-[#DFC57B] border border-[#DFC57B]/40'
                                  : 'bg-[#79C8E8]/15 text-[#79C8E8] border border-[#79C8E8]/30'
                              }`}
                            >
                              {entry.actorRole === 'admin'
                                ? lang === 'ar'
                                  ? 'إدارة'
                                  : 'Admin'
                                : lang === 'ar'
                                ? 'عميل'
                                : 'Client'}
                            </span>
                          </div>
                          <span className="text-[11px] font-mono text-slate-400">{entry.actorEmail}</span>
                        </div>
                      </td>

                      {/* Target Resource */}
                      <td className="py-3 px-4 align-top max-w-[220px]">
                        <span className="font-mono text-[11px] text-[#A9DDF1] font-semibold break-all">
                          {entry.targetName}
                        </span>
                      </td>

                      {/* Modification / Event Details */}
                      <td className="py-3 px-4 align-top text-slate-200 leading-relaxed min-w-[240px]">
                        {entry.details}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Show More / Show Less Toggle when more than 6 logs exist */}
        {filteredAuditLogs.length > 6 && activeTab !== 'audit' && (
          <div className="mt-3 flex justify-center">
            <button
              type="button"
              onClick={() => setShowAllAuditRows((prev) => !prev)}
              className="px-4 py-1.5 rounded-xl bg-[#0B192C] hover:bg-[#162942] border border-[#79C8E8]/30 text-xs font-semibold text-[#79C8E8] flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {showAllAuditRows ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5" />
                  <span>{lang === 'ar' ? 'عرض أحدث 6 أحداث فقط' : 'Afficher uniquement les 6 derniers'}</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5" />
                  <span>
                    {lang === 'ar'
                      ? `عرض السجل الكامل (${filteredAuditLogs.length} حدثاً)`
                      : `Afficher tout le journal (${filteredAuditLogs.length} entrées)`}
                  </span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* TAB 1: PROJECTS MANAGEMENT */}
      {activeTab === 'projects' && (
        <div className="space-y-6">
          <div className="bg-[#112239] border border-[#79C8E8]/25 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center gap-2 mb-4 text-[#DFC57B] font-bold text-sm">
              <Plus className="w-4 h-4" />
              <span>{t.createNewProject}</span>
            </div>

            {projectCreatedSuccess && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{t.projectCreatedSuccess}</span>
              </div>
            )}

            <form onSubmit={handleCreateProjectSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-white mb-1">
                    {t.projectName} *
                  </label>
                  <input
                    type="text"
                    required
                    value={newProjName}
                    onChange={(e) => setNewProjName(e.target.value)}
                    placeholder={t.projectNamePlaceholder}
                    className="w-full px-3 py-2 bg-[#0B192C] border border-[#79C8E8]/30 rounded-xl text-xs text-white focus:outline-none focus:border-[#DFC57B]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-white mb-1">
                    {t.projectLocation} *
                  </label>
                  <input
                    type="text"
                    required
                    value={newProjLocation}
                    onChange={(e) => setNewProjLocation(e.target.value)}
                    placeholder={t.projectLocationPlaceholder}
                    className="w-full px-3 py-2 bg-[#0B192C] border border-[#79C8E8]/30 rounded-xl text-xs text-white focus:outline-none focus:border-[#DFC57B]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-white mb-1">
                    {t.projectType}
                  </label>
                  <select
                    value={newProjType}
                    onChange={(e) => setNewProjType(e.target.value as ProjectCategory)}
                    className="w-full px-3 py-2 bg-[#0B192C] border border-[#79C8E8]/30 rounded-xl text-xs text-white focus:outline-none focus:border-[#DFC57B]"
                  >
                    <option value="tuyauterie">{t.typeTuyauterie}</option>
                    <option value="cuves">{t.typeCuves}</option>
                    <option value="conduits">{t.typeConduits}</option>
                    <option value="chaudieres">{t.typeChaudieres}</option>
                    <option value="batiment">{t.typeBatiment}</option>
                    <option value="autre">{t.typeAutre}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-white mb-1">
                    {t.projectClient}
                  </label>
                  <select
                    value={newProjClientId}
                    onChange={(e) => setNewProjClientId(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0B192C] border border-[#79C8E8]/30 rounded-xl text-xs text-white focus:outline-none focus:border-[#DFC57B]"
                  >
                    <option value="">{lang === 'ar' ? 'مشروع عام أو تعيين لاحق' : 'Projet Général / Non assigné'}</option>
                    {clientUsers.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.companyName} ({client.fullName})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-white mb-1">
                  {t.projectDescription}
                </label>
                <textarea
                  rows={2}
                  value={newProjDesc}
                  onChange={(e) => setNewProjDesc(e.target.value)}
                  placeholder={lang === 'ar' ? 'المواصفات الفنية ومجال العمل الميداني...' : 'Détails du cahier des charges...'}
                  className="w-full px-3 py-2 bg-[#0B192C] border border-[#79C8E8]/30 rounded-xl text-xs text-white focus:outline-none focus:border-[#DFC57B] resize-none"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-[#DFC57B] hover:bg-[#d4b663] text-[#0B192C] font-bold text-xs shadow-md transition-all cursor-pointer"
                >
                  {t.createNewProject}
                </button>
              </div>
            </form>
          </div>

          <div className="bg-[#112239] border border-[#79C8E8]/25 rounded-2xl shadow-xl overflow-hidden">
            <div className="p-4 bg-[#0B192C] border-b border-[#79C8E8]/20 flex items-center justify-between">
              <h4 className="text-xs font-bold text-[#DFC57B] uppercase tracking-wider">
                {lang === 'ar' ? 'قائمة المشاريع الميدانية' : 'Chantiers En Cours'}
              </h4>
              <span className="text-xs text-[#A9DDF1] font-mono">{projects.length} {lang === 'ar' ? 'مشروع' : 'projets'}</span>
            </div>

            {projects.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <Building2 className="w-10 h-10 mx-auto mb-2 opacity-40 text-[#79C8E8]" />
                <p className="text-xs font-semibold text-white">{t.noProjectsYet}</p>
                <p className="text-[11px] text-slate-400 mt-1">{t.noProjectsDesc}</p>
              </div>
            ) : (
              <div className="divide-y divide-[#79C8E8]/15">
                {projects.map((proj) => {
                  const projAttachments = attachments.filter((a) => a.projectId === proj.id);
                  const activeProjAttachments = projAttachments.filter((a) => a.folder !== 'trash');
                  const isExpanded = expandedProjectId === proj.id;

                  return (
                    <div key={proj.id} className="transition-colors">
                      <div className="p-4 hover:bg-[#162942]/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-sm truncate">{proj.name}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#0B192C] text-[#DFC57B] border border-[#DFC57B]/40 font-mono">
                              {proj.type}
                            </span>
                          </div>
                          <p className="text-xs text-slate-300 mt-0.5 flex items-center gap-2 flex-wrap">
                            <MapPin className="w-3.5 h-3.5 text-[#79C8E8]" />
                            <span>{proj.location}</span>
                            <span>·</span>
                            <span className="text-[#A9DDF1] font-medium">{proj.clientName}</span>
                          </p>
                        </div>

                        <div className="flex items-center gap-2.5 text-xs text-slate-300 shrink-0 flex-wrap">
                          <button
                            type="button"
                            onClick={() => setExpandedProjectId(isExpanded ? null : proj.id)}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#0B192C] hover:bg-[#162942] border border-[#79C8E8]/25 text-white font-mono transition-colors cursor-pointer"
                            title={lang === 'ar' ? 'عرض وإدارة مرفقات المشروع' : 'Voir et gérer les fichiers du projet'}
                          >
                            <span>
                              {activeProjAttachments.length} {lang === 'ar' ? 'مرفقات' : 'docs'}
                            </span>
                            {isExpanded ? (
                              <ChevronUp className="w-3.5 h-3.5 text-[#DFC57B]" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5 text-[#79C8E8]" />
                            )}
                          </button>

                          <span className="text-emerald-400 font-semibold hidden md:inline">
                            {lang === 'ar' ? 'قيد التنفيذ' : 'En cours'}
                          </span>

                          {onDeleteProject && (
                            <button
                              type="button"
                              onClick={() =>
                                setConfirmDeleteTarget({
                                  type: 'project',
                                  id: proj.id,
                                  name: proj.name,
                                  subtext: `${proj.location} — ${proj.clientName}`,
                                  relatedAttachmentsCount: projAttachments.length,
                                })
                              }
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-950/50 hover:bg-red-600 text-red-300 hover:text-white border border-red-800/60 text-xs font-bold transition-all cursor-pointer"
                              title={lang === 'ar' ? 'حذف المشروع' : 'Supprimer le projet'}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>{lang === 'ar' ? 'حذف المشروع' : 'Supprimer'}</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Expandable Project Attachments List */}
                      {isExpanded && (
                        <div className="bg-[#0B192C]/90 border-t border-[#79C8E8]/15 px-4 py-3 space-y-2">
                          <div className="flex items-center justify-between text-[11px] font-bold text-[#DFC57B]">
                            <span>
                              {lang === 'ar'
                                ? `المرفقات والملفات المرتبطة بمشروع: ${proj.name}`
                                : `Fichiers associés au projet : ${proj.name}`}
                            </span>
                            <span className="font-mono text-slate-400">
                              {projAttachments.length} {lang === 'ar' ? 'ملف' : 'fichiers'}
                            </span>
                          </div>

                          {projAttachments.length === 0 ? (
                            <p className="text-xs text-slate-400 py-2">
                              {lang === 'ar'
                                ? 'لا توجد مرفقات مسجلة لهذا المشروع حالياً.'
                                : 'Aucun fichier rattaché à ce projet.'}
                            </p>
                          ) : (
                            <div className="divide-y divide-[#79C8E8]/10">
                              {projAttachments.map((att) => (
                                <div
                                  key={att.id}
                                  className="py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                                >
                                  <div className="min-w-0 flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-[#79C8E8] shrink-0" />
                                    <div className="min-w-0">
                                      <p className="text-white font-semibold truncate">{att.title}</p>
                                      <p className="text-[11px] text-slate-400 truncate font-mono">
                                        {att.fileName} · {(att.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => onOpenViewer(att)}
                                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#112239] hover:bg-[#162942] text-[#79C8E8] border border-[#79C8E8]/30 text-[11px] font-semibold cursor-pointer"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                      <span>{lang === 'ar' ? 'معاينة' : 'Aperçu'}</span>
                                    </button>

                                    {onDeleteAttachment && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setConfirmDeleteTarget({
                                            type: 'attachment',
                                            id: att.id,
                                            name: att.title,
                                            subtext: `${att.fileName} (${proj.name})`,
                                          })
                                        }
                                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-950/50 hover:bg-red-600 text-red-300 hover:text-white border border-red-800/60 text-[11px] font-bold transition-colors cursor-pointer"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        <span>{lang === 'ar' ? 'حذف المرفق' : 'Supprimer'}</span>
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: PENDING REGISTRATIONS */}
      {activeTab === 'pending' && (
        <div className="bg-[#112239] border border-[#79C8E8]/25 rounded-2xl shadow-xl overflow-hidden">
          <div className="p-4 bg-[#0B192C] border-b border-[#79C8E8]/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <h4 className="text-xs font-bold text-[#DFC57B] uppercase tracking-wider">
                {lang === 'ar' ? 'طلبات التسجيل بانتظار الاعتماد والموافقة' : 'Demandes d\'inscription'}
              </h4>
            </div>
            <span className="text-xs text-amber-400 font-mono font-bold">
              {pendingRegistrations.length} {lang === 'ar' ? 'طلبات جديدة' : 'en attente'}
            </span>
          </div>

          {pendingRegistrations.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-emerald-400 opacity-60" />
              <p className="text-sm font-semibold text-white">
                {lang === 'ar' ? 'لا توجد طلبات تسجيل معلقة حالياً' : 'Aucune demande en attente'}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {lang === 'ar' ? 'جميع حسابات العملاء مراجعة ومحدثة بالكامل.' : 'Tous les comptes sont à jour.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#79C8E8]/15">
              {pendingRegistrations.map((p) => (
                <div key={p.id} className="p-4 sm:p-5 hover:bg-[#162942]/50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <h5 className="font-bold text-white text-sm">{p.companyName}</h5>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#0B192C] text-[#DFC57B] border border-[#DFC57B]/40 font-mono">
                        {p.projectType}
                      </span>
                    </div>
                    <p className="text-xs text-slate-200">
                      {p.fullName} · <span className="text-[#79C8E8] font-mono">{p.phone}</span> · <span className="text-slate-300">{p.email}</span>
                    </p>
                    <p className="text-xs text-slate-400 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#79C8E8]" />
                      <span>{p.city}</span>
                      <span>·</span>
                      <span>{new Date(p.requestedAt).toLocaleString()}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => onApproveAccount(p.id)}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{lang === 'ar' ? 'تفعيل الحساب' : 'Valider'}</span>
                    </button>
                    <button
                      onClick={() => onRejectAccount(p.id)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#0B192C] hover:bg-[#E50914]/25 hover:text-[#E50914] text-slate-300 text-xs font-semibold border border-[#79C8E8]/25 transition-all cursor-pointer"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>{lang === 'ar' ? 'رفض' : 'Refuser'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: DISPATCH ATTACHMENTS */}
      {activeTab === 'dispatch' && (
        <div className="bg-[#112239] border border-[#79C8E8]/25 rounded-2xl p-6 shadow-xl max-w-3xl mx-auto">
          <div className="flex items-center gap-2 mb-3 text-[#DFC57B] font-bold text-sm">
            <Send className={`w-4 h-4 ${lang === 'ar' ? 'rotate-180' : ''}`} />
            <span>{t.dispatchToClient}</span>
          </div>

          <p className="text-xs text-slate-300 mb-5 leading-relaxed">
            {lang === 'ar' 
              ? 'تعتبر هذه المرفقات عناصر صادرة من الإدارة، وتظهر مباشرة في صندوق الوارد المخصص للعميل المستهدف.'
              : 'Ces fichiers apparaîtront directement dans la boîte de réception du client sélectionné.'}
          </p>

          {dispatchSuccess && (
            <div className="mb-5 p-4 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{lang === 'ar' ? 'تم توجيه ونشر المرفق في حساب العميل بنجاح!' : 'Document expédié avec succès.'}</span>
              </div>

              {lastWhatsappUrl && (
                <div className="pt-2 border-t border-emerald-800/60 flex items-center justify-between">
                  <span>{lang === 'ar' ? 'اختياري — مشاركة إشعار عبر واتساب:' : 'Optionnel — notifier via WhatsApp :'}</span>
                  <a
                    href={lastWhatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>{t.whatsappSendBtn}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleDispatchSubmit} className="space-y-4">
            {/* Target Project Selection */}
            <div>
              <label className="block text-xs font-semibold text-white mb-1">
                {t.project} *
              </label>
              <select
                required
                value={targetProjectId}
                onChange={(e) => setTargetProjectId(e.target.value)}
                className="w-full px-3 py-2 bg-[#0B192C] border border-[#79C8E8]/30 rounded-xl text-xs text-white focus:outline-none focus:border-[#DFC57B]"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.clientName})
                  </option>
                ))}
              </select>
            </div>

            {activeTargetClient && (
              <div className="p-3 bg-[#0B192C] rounded-xl border border-[#79C8E8]/25 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-[#79C8E8]" />
                  <span className="text-slate-400">{t.registeredEmail}:</span>
                  <span className="text-white font-mono font-semibold">{activeTargetClient.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-slate-400">{t.registeredPhone}:</span>
                  <span className="text-emerald-400 font-mono font-semibold dir-ltr">{activeTargetClient.phone}</span>
                </div>
              </div>
            )}

            {/* File Picker for Dispatch */}
            <div>
              <label className="block text-xs font-semibold text-white mb-1.5">
                {lang === 'ar' ? 'اختيار الملف المراد إرساله للعميل' : 'Sélectionner le fichier à expédier'}
              </label>
              <label className="flex items-center justify-between px-4 py-3 rounded-xl bg-[#0B192C] border border-dashed border-[#79C8E8]/40 hover:border-[#DFC57B] cursor-pointer transition-colors text-xs">
                <span className="flex items-center gap-2 text-slate-200 truncate">
                  <Upload className="w-4 h-4 text-[#DFC57B] shrink-0" />
                  <span className="truncate">
                    {dispatchFile ? dispatchFile.name : (lang === 'ar' ? 'اضغط لاختيار ملف (PDF، صورة، فيديو)...' : 'Cliquer pour choisir un fichier...')}
                  </span>
                </span>
                {dispatchFile && (
                  <span className="text-[#DFC57B] font-mono text-[11px] shrink-0 ms-2">
                    {(dispatchFile.size / (1024 * 1024)).toFixed(2)} MB
                  </span>
                )}
                <input type="file" onChange={handleDispatchFileChange} className="hidden" />
              </label>
            </div>

            <div>
              <label className="block text-xs font-semibold text-white mb-1.5">
                {t.dispatchChannelTitle} *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setDispatchChannel('email')}
                  className={`flex items-center justify-center gap-2 p-2.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    dispatchChannel === 'email'
                      ? 'bg-[#DFC57B] text-[#0B192C] border-[#DFC57B] font-bold shadow-md'
                      : 'bg-[#0B192C] border-[#79C8E8]/25 text-slate-200'
                  }`}
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>{t.dispatchChannelEmail}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDispatchChannel('whatsapp')}
                  className={`flex items-center justify-center gap-2 p-2.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    dispatchChannel === 'whatsapp'
                      ? 'bg-emerald-600 text-white border-emerald-500 font-bold shadow-md'
                      : 'bg-[#0B192C] border-[#79C8E8]/25 text-slate-200'
                  }`}
                >
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{t.dispatchChannelWhatsapp}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDispatchChannel('both')}
                  className={`flex items-center justify-center gap-2 p-2.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    dispatchChannel === 'both'
                      ? 'bg-[#DFC57B] text-[#0B192C] border-[#DFC57B] font-bold shadow-md'
                      : 'bg-[#0B192C] border-[#79C8E8]/25 text-slate-200'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{t.dispatchChannelBoth}</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-white mb-1">
                {t.attachmentTitle} *
              </label>
              <input
                type="text"
                required
                value={dispatchTitle}
                onChange={(e) => setDispatchTitle(e.target.value)}
                placeholder={lang === 'ar' ? 'مثال: تقرير الفحص والشهادة الحرارية المعتمدة...' : 'Titre du document officiel...'}
                className="w-full px-3 py-2 bg-[#0B192C] border border-[#79C8E8]/30 rounded-xl text-xs text-white focus:outline-none focus:border-[#DFC57B]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-white mb-1">
                {t.attachmentCategory}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'document', label: t.categoryDocument, icon: FileText },
                  { id: 'photo', label: t.categoryPhoto, icon: ImageIcon },
                  { id: 'video', label: t.categoryVideo, icon: Video },
                  { id: 'note', label: t.categoryNote, icon: FileText },
                ].map((c) => {
                  const Icon = c.icon;
                  const isSel = dispatchCategory === c.id;
                  return (
                    <button
                      type="button"
                      key={c.id}
                      onClick={() => setDispatchCategory(c.id as any)}
                      className={`flex items-center gap-2 p-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                        isSel
                          ? 'bg-[#DFC57B] text-[#0B192C] border-[#DFC57B] font-bold shadow-md'
                          : 'bg-[#0B192C] border-[#79C8E8]/25 text-slate-200'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{c.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-white mb-1">
                {t.attachmentNotes}
              </label>
              <textarea
                rows={3}
                value={dispatchNotes}
                onChange={(e) => setDispatchNotes(e.target.value)}
                placeholder={lang === 'ar' ? 'تعليمات فنية للعميل أو تفاصيل الفحص...' : 'Observations techniques...'}
                className="w-full px-3 py-2 bg-[#0B192C] border border-[#79C8E8]/30 rounded-xl text-xs text-white focus:outline-none focus:border-[#DFC57B] resize-none"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-[#DFC57B] hover:bg-[#d4b663] text-[#0B192C] font-bold text-xs shadow-md transition-all cursor-pointer flex items-center gap-2"
              >
                <Send className={`w-4 h-4 ${lang === 'ar' ? 'rotate-180' : ''}`} />
                <span>{lang === 'ar' ? 'نشر وإرسال الصادر للعميل' : 'Publier et expédier au client'}</span>
              </button>
            </div>
          </form>

          {/* Manage All Attachments Section */}
          <div className="mt-8 pt-6 border-t border-[#79C8E8]/20">
            <div className="flex items-center justify-between mb-3">
              <h5 className="text-xs font-bold text-[#DFC57B] uppercase tracking-wider">
                {lang === 'ar' ? 'سجل المرفقات المنشورة (معاينة وحذف)' : 'Documents Publiés (Aperçu & Suppression)'}
              </h5>
              <span className="text-xs font-mono text-[#A9DDF1]">
                {attachments.length} {lang === 'ar' ? 'ملف' : 'fichiers'}
              </span>
            </div>

            {attachments.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">
                {lang === 'ar' ? 'لا توجد مرفقات منشورة حالياً.' : 'Aucun document publié.'}
              </p>
            ) : (
              <div className="divide-y divide-[#79C8E8]/15 bg-[#0B192C] rounded-xl border border-[#79C8E8]/20 overflow-hidden">
                {attachments.map((att) => (
                  <div
                    key={att.id}
                    className="p-3 hover:bg-[#162942]/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-white truncate">{att.title}</p>
                      <p className="text-[11px] text-slate-400 truncate">
                        {att.projectName} · <span className="font-mono text-[#79C8E8]">{att.fileName}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => onOpenViewer(att)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#112239] hover:bg-[#162942] text-[#79C8E8] border border-[#79C8E8]/30 text-[11px] font-semibold cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>{lang === 'ar' ? 'معاينة' : 'Aperçu'}</span>
                      </button>
                      {onDeleteAttachment && (
                        <button
                          type="button"
                          onClick={() =>
                            setConfirmDeleteTarget({
                              type: 'attachment',
                              id: att.id,
                              name: att.title,
                              subtext: `${att.fileName} — ${att.projectName}`,
                            })
                          }
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-950/50 hover:bg-red-600 text-red-300 hover:text-white border border-red-800/60 text-[11px] font-bold transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>{lang === 'ar' ? 'حذف المرفق' : 'Supprimer'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: CLIENTS DIRECTORY */}
      {activeTab === 'clients' && (
        <div className="bg-[#112239] border border-[#79C8E8]/25 rounded-2xl shadow-xl overflow-hidden">
          <div className="p-4 bg-[#0B192C] border-b border-[#79C8E8]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h4 className="text-xs font-bold text-[#DFC57B] uppercase tracking-wider">
              {lang === 'ar' ? 'سجل الشركات والعملاء المسجلين' : 'Entreprises & Clients'}
            </h4>
            <div className="relative w-full sm:max-w-xs">
              <Search className={`w-4 h-4 text-[#79C8E8] absolute top-1/2 -translate-y-1/2 ${lang === 'ar' ? 'right-3' : 'left-3'}`} />
              <input
                type="text"
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
                placeholder={lang === 'ar' ? 'البحث عن شركة...' : 'Filtrer les clients...'}
                className={`w-full py-1.5 bg-[#112239] border border-[#79C8E8]/30 rounded-xl text-xs text-white focus:outline-none focus:border-[#DFC57B] ${
                  lang === 'ar' ? 'pr-9 pl-3' : 'pl-9 pr-3'
                }`}
              />
            </div>
          </div>

          {clientUsers.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Users className="w-10 h-10 mx-auto mb-2 opacity-40 text-[#79C8E8]" />
              <p className="text-xs font-semibold text-white">
                {lang === 'ar' ? 'لا توجد حسابات عملاء مسجلة حالياً' : 'Aucun compte client enregistré'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#79C8E8]/15">
              {clientUsers
                .filter(
                  (u) =>
                    u.companyName.toLowerCase().includes(clientSearch.toLowerCase()) ||
                    u.fullName.toLowerCase().includes(clientSearch.toLowerCase()) ||
                    u.email.toLowerCase().includes(clientSearch.toLowerCase())
                )
                .map((u) => {
                  const clientProjs = projects.filter(
                    (p) => p.clientId === u.id || (u.assignedProjectIds && u.assignedProjectIds.includes(p.id))
                  );
                  const clientProjIds = new Set(clientProjs.map((p) => p.id));
                  const clientAtts = attachments.filter(
                    (a) => a.clientId === u.id || (u.uid && a.clientId === u.uid) || clientProjIds.has(a.projectId)
                  );

                  return (
                    <div
                      key={u.id}
                      className="p-4 hover:bg-[#162942]/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">{u.companyName}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-800">
                            {lang === 'ar' ? 'نشط' : 'Actif'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 mt-0.5">
                          <span>{u.fullName}</span> · <span className="font-mono text-[#79C8E8]">{u.phone}</span> ·{' '}
                          <span>{u.email}</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-3 text-xs shrink-0 flex-wrap">
                        <span className="px-2.5 py-1 rounded-md bg-[#0B192C] text-[#DFC57B] font-mono">
                          {clientProjs.length} {lang === 'ar' ? 'مشروع مخصص' : 'projets'}
                        </span>
                        <span className="px-2.5 py-1 rounded-md bg-[#0B192C] text-[#A9DDF1] font-mono">
                          {clientAtts.length} {lang === 'ar' ? 'مرفق' : 'fichiers'}
                        </span>
                        {onDeleteClient && (
                          <button
                            type="button"
                            onClick={() =>
                              setConfirmDeleteTarget({
                                type: 'client',
                                id: u.id,
                                name: u.companyName,
                                subtext: `${u.fullName} (${u.email})`,
                                relatedProjectsCount: clientProjs.length,
                                relatedAttachmentsCount: clientAtts.length,
                              })
                            }
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-950/50 hover:bg-red-600 text-red-300 hover:text-white border border-red-800/60 text-xs font-bold transition-all cursor-pointer"
                            title={lang === 'ar' ? 'حذف حساب العميل' : 'Supprimer le compte client'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>{lang === 'ar' ? 'حذف العميل' : 'Supprimer le client'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: BACKUP & RESTORE */}
      {activeTab === 'backups' && (
        <div className="space-y-6">
          <div className="bg-[#112239] border border-[#79C8E8]/25 rounded-2xl p-6 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-[#DFC57B] font-bold text-sm">
                  <Archive className="w-5 h-5 text-[#79C8E8]" />
                  <span>{t.backupTitle}</span>
                </div>
                <p className="text-xs text-slate-300 mt-1 max-w-xl">
                  {t.backupDesc}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => onCreateBackup(backupNote || undefined)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#DFC57B] hover:bg-[#d4b663] text-[#0B192C] font-bold text-xs shadow-md transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>{t.createBackupBtn}</span>
                </button>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-[#79C8E8]/20 flex items-center gap-3">
              <input
                type="text"
                value={backupNote}
                onChange={(e) => setBackupNote(e.target.value)}
                placeholder={lang === 'ar' ? 'ملاحظة توثيقية اختيارية لهذه النسخة...' : 'Note descriptive pour ce point de restauration...'}
                className="flex-1 px-3 py-2 bg-[#0B192C] border border-[#79C8E8]/30 rounded-xl text-xs text-white focus:outline-none focus:border-[#DFC57B]"
              />
            </div>
          </div>

          <div className="bg-[#112239] border border-[#79C8E8]/25 rounded-2xl shadow-xl overflow-hidden">
            <div className="p-4 bg-[#0B192C] border-b border-[#79C8E8]/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#DFC57B]" />
                <h4 className="text-xs font-bold text-[#DFC57B] uppercase tracking-wider">
                  {lang === 'ar' ? 'سجل نقاط الاستعادة والنسخ المؤرخة' : 'Points de Restauration Horodatés'}
                </h4>
              </div>
              <span className="text-xs text-[#A9DDF1] font-mono">
                {backups.length} {lang === 'ar' ? 'نسخ محفوظة' : 'sauvegardes'}
              </span>
            </div>

            {backups.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <Archive className="w-10 h-10 mx-auto mb-2 opacity-40 text-[#79C8E8]" />
                <p className="text-xs font-semibold text-white">{t.noBackupsYet}</p>
              </div>
            ) : (
              <div className="divide-y divide-[#79C8E8]/15">
                {backups.map((snap) => (
                  <div key={snap.id} className="p-4 sm:p-5 hover:bg-[#162942]/50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-white text-sm font-mono">{snap.dateFormatted || snap.timestamp}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#0B192C] text-[#DFC57B] border border-[#DFC57B]/40 font-mono">
                          ID: {snap.id}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300">
                        {snap.note ? <span className="text-white">{snap.note} · </span> : null}
                        <span className="font-mono text-[#A9DDF1]">{snap.projectsCount} {lang === 'ar' ? 'مشاريع' : 'projets'}</span> · 
                        <span className="font-mono text-[#A9DDF1]"> {snap.attachmentsCount} {lang === 'ar' ? 'مرفقات' : 'fichiers'}</span> · 
                        <span className="font-mono text-[#A9DDF1]"> {snap.usersCount} {lang === 'ar' ? 'مستخدمين' : 'utilisateurs'}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleDownloadBackupJson(snap)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0B192C] hover:bg-[#162942] text-white border border-[#79C8E8]/30 text-xs font-semibold cursor-pointer"
                        title={t.exportJson}
                      >
                        <Download className="w-3.5 h-3.5 text-[#79C8E8]" />
                        <span>{t.exportJson}</span>
                      </button>

                      <button
                        onClick={() => setSelectedBackupForRestore(snap)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#DFC57B] hover:bg-[#d4b663] text-[#0B192C] text-xs font-bold shadow-md cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>{t.restoreBackupBtn}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* RESTORE CONFIRMATION MODAL */}
      {selectedBackupForRestore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#112239] border border-[#79C8E8]/30 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-amber-400 mb-3">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h4 className="font-bold text-white text-base">
                {lang === 'ar' ? 'تأكيد استدعاء واستعادة النسخة' : 'Confirmer la Restauration'}
              </h4>
            </div>

            <p className="text-xs text-slate-200 mb-4 leading-relaxed">
              {t.restoreConfirm}
            </p>

            <div className="p-3 bg-[#0B192C] rounded-xl border border-[#79C8E8]/25 mb-4 text-xs font-mono space-y-1 text-slate-300">
              <p><strong className="text-white">{t.backupDate}:</strong> {selectedBackupForRestore.dateFormatted}</p>
              <p><strong className="text-white">{t.backupContents}:</strong> {selectedBackupForRestore.projectsCount} {lang === 'ar' ? 'مشاريع' : 'projets'} - {selectedBackupForRestore.attachmentsCount} {lang === 'ar' ? 'مرفقات' : 'docs'}</p>
            </div>

            {restoreConfirmedSuccess ? (
              <div className="text-center py-4 text-emerald-400 text-xs font-semibold flex items-center justify-center gap-2">
                <CheckCircle2 className="w-5 h-5" />
                <span>{t.restoreSuccess}</span>
              </div>
            ) : (
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedBackupForRestore(null)}
                  className="px-4 py-2 rounded-xl bg-[#0B192C] text-slate-200 text-xs font-medium cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRestore}
                  className="px-4 py-2 rounded-xl bg-[#DFC57B] text-[#0B192C] text-xs font-bold cursor-pointer"
                >
                  {t.confirm}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 6: ACCESS & ROUTE SETTINGS */}
      {activeTab === 'settings' && (
        <div className="bg-[#112239] border border-[#79C8E8]/25 rounded-2xl p-6 shadow-xl space-y-6 max-w-4xl mx-auto">
          <div className="flex items-center gap-2 mb-2 text-[#DFC57B] font-bold text-sm">
            <Settings className="w-4 h-4" />
            <span>{lang === 'ar' ? 'إعدادات مسار دخول الإدارة وبوابة العملاء' : 'Paramètres d\'accès et route administration'}</span>
          </div>

          {/* Section 1: Dedicated Admin URL info */}
          <div className="p-4 rounded-xl bg-[#0B192C] border border-[#79C8E8]/20 space-y-2">
            <div className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
              <div>
                <h5 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Link2 className="w-3.5 h-3.5 text-[#DFC57B]" />
                  <span>{lang === 'ar' ? 'الرابط المباشر المستقل لدخول الإدارة' : 'URL dédiée de connexion administrateur'}</span>
                </h5>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  {lang === 'ar' 
                    ? 'مسار مخصص للإدارة المركزية فقط. يتيح تسجيل دخول المسؤولين مباشرة دون خلط مع واجهة العملاء.'
                    : 'Route dédiée exclusivement à la direction pour se connecter en toute indépendance.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const adminUrl = typeof window !== 'undefined' ? `${window.location.origin}/#admin` : 'https://isonil.com/#admin';
                  navigator.clipboard.writeText(adminUrl);
                  setCopiedAdminUrl(true);
                  setTimeout(() => setCopiedAdminUrl(false), 2500);
                }}
                className="px-3 py-1.5 rounded-lg bg-[#112239] hover:bg-[#162942] border border-[#79C8E8]/30 text-xs text-white font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              >
                {copiedAdminUrl ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">{lang === 'ar' ? 'تم النسخ' : 'Copié'}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-[#DFC57B]" />
                    <span>{lang === 'ar' ? 'نسخ الرابط' : 'Copier l\'URL'}</span>
                  </>
                )}
              </button>
            </div>
            <div className="px-3 py-2 rounded-lg bg-[#162942] border border-[#79C8E8]/15 font-mono text-xs text-[#79C8E8] break-all select-all">
              {typeof window !== 'undefined' ? `${window.location.origin}/#admin` : 'https://isonil.com/#admin'}
            </div>
          </div>

          {/* Section 2: Toggle Show/Hide Admin link on client interface */}
          <div className="p-4 rounded-xl bg-[#0B192C] border border-[#79C8E8]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1 max-w-xl">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white">
                  {lang === 'ar' ? 'إظهار خيار دخول الإدارة في واجهة العملاء' : 'Afficher le lien d\'administration sur l\'interface client'}
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  showAdminLinkOnClient ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}>
                  {showAdminLinkOnClient ? (lang === 'ar' ? 'مفعّل' : 'Actif') : (lang === 'ar' ? 'مخفي (الافتراضي)' : 'Masqué (Défaut)')}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                {lang === 'ar'
                  ? 'عند التعطيل (الوضع الافتراضي والموصى به)، لا يظهر أي تبويب أو خيار لدخول الإدارة على شاشة العملاء. عند التفعيل، يظهر رابط سري في أسفل شاشة الدخول.'
                  : 'Par défaut, aucun onglet d\'administration n\'apparaît sur l\'écran client. Si activé, un lien discret apparaît pour naviguer vers la connexion administrateur.'}
              </p>
              <p className="text-[10px] text-amber-300/90 flex items-center gap-1 pt-1">
                <AlertTriangle className="w-3 h-3 shrink-0" />
                <span>
                  {lang === 'ar'
                    ? 'تنبيه أمني: إخفاء الرابط مجرد خيار تنظيمي، وتظل الحماية والصلاحيات مفروضة بدقة من خلال مصادقة Firebase.'
                    : 'Rappel de sécurité : masquer le lien est un choix ergonomique ; la sécurité est garantie par Firebase RBAC.'}
                </span>
              </p>
            </div>

            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={showAdminLinkOnClient || false}
                onChange={(e) => onToggleShowAdminLink && onToggleShowAdminLink(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#DFC57B]"></div>
            </label>
          </div>
        </div>
      )}

      {/* DESTRUCTIVE ACTION CONFIRMATION MODAL (Delete Project / Delete Client / Delete Attachment) */}
      {confirmDeleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#112239] border border-red-500/40 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-red-400 mb-3">
              <div className="w-10 h-10 rounded-xl bg-red-950/80 border border-red-700/60 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h4 className="font-bold text-white text-base">
                  {confirmDeleteTarget.type === 'project'
                    ? lang === 'ar'
                      ? 'تأكيد حذف المشروع نهائياً'
                      : 'Confirmer la suppression du projet'
                    : confirmDeleteTarget.type === 'client'
                    ? lang === 'ar'
                      ? 'تأكيد حذف حساب العميل نهائياً'
                      : 'Confirmer la suppression du compte client'
                    : lang === 'ar'
                    ? 'تأكيد حذف المرفق نهائياً'
                    : 'Confirmer la suppression du document'}
                </h4>
                <p className="text-[11px] text-red-300">
                  {lang === 'ar'
                    ? 'هذا الإجراء نهائي ولا يمكن التراجع عنه في قاعدة البيانات.'
                    : 'Cette action est irréversible dans la base de données.'}
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-[#0B192C] rounded-xl border border-[#79C8E8]/25 mb-4 space-y-1.5 text-xs">
              <p className="font-bold text-[#DFC57B] text-sm">{confirmDeleteTarget.name}</p>
              {confirmDeleteTarget.subtext && (
                <p className="text-slate-300 font-mono text-[11px]">{confirmDeleteTarget.subtext}</p>
              )}

              {confirmDeleteTarget.type === 'project' && (
                <p className="text-amber-300 text-[11px] pt-1 border-t border-[#79C8E8]/15">
                  {lang === 'ar'
                    ? `سيتم حذف المشروع وإزالة ${confirmDeleteTarget.relatedAttachmentsCount || 0} من المرفقات المرتبطة به من قاعدة البيانات.`
                    : `Ce projet ainsi que ses ${confirmDeleteTarget.relatedAttachmentsCount || 0} documents associés seront supprimés.`}
                </p>
              )}

              {confirmDeleteTarget.type === 'client' && (
                <p className="text-amber-300 text-[11px] pt-1 border-t border-[#79C8E8]/15">
                  {lang === 'ar'
                    ? `سيتم حذف حساب العميل مع ${confirmDeleteTarget.relatedProjectsCount || 0} مشاريع و ${confirmDeleteTarget.relatedAttachmentsCount || 0} مرفقات مرتبطة به.`
                    : `Ce compte client ainsi que ${confirmDeleteTarget.relatedProjectsCount || 0} projets et ${confirmDeleteTarget.relatedAttachmentsCount || 0} documents associés seront supprimés.`}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmDeleteTarget(null)}
                className="px-4 py-2 rounded-xl bg-[#0B192C] hover:bg-[#162942] border border-[#79C8E8]/25 text-slate-200 text-xs font-semibold cursor-pointer"
              >
                {lang === 'ar' ? 'إلغاء' : 'Annuler'}
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteAction}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{lang === 'ar' ? 'تأكيد الحذف النهائي' : 'Supprimer définitivement'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

