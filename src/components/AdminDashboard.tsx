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
  ShieldCheck
} from 'lucide-react';
import { Attachment, AttachmentCategory, Language, PendingRegistration, Project, ProjectCategory, User, BackupSnapshot } from '../types';
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
  onCreateBackup: (note?: string) => void;
  onRestoreBackup: (snapshotId: string) => void;
  onImportBackup?: (jsonStr: string) => void;
  showAdminLinkOnClient?: boolean;
  onToggleShowAdminLink?: (show: boolean) => void;
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
  onCreateProject,
  onCreateBackup,
  onRestoreBackup,
  showAdminLinkOnClient = false,
  onToggleShowAdminLink,
}) => {
  const t = translations[lang];

  type AdminTab = 'projects' | 'pending' | 'dispatch' | 'clients' | 'backups' | 'settings';
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
                {projects.map((proj) => (
                  <div key={proj.id} className="p-4 hover:bg-[#162942]/60 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm truncate">{proj.name}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#0B192C] text-[#DFC57B] border border-[#DFC57B]/40 font-mono">
                          {proj.type}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-0.5 flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-[#79C8E8]" />
                        <span>{proj.location}</span>
                        <span>·</span>
                        <span className="text-[#A9DDF1] font-medium">{proj.clientName}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-300 shrink-0">
                      <span className="px-2.5 py-1 rounded-md bg-[#0B192C] text-white font-mono">
                        {attachments.filter((a) => a.projectId === proj.id && a.folder !== 'trash').length} {lang === 'ar' ? 'مرفقات' : 'docs'}
                      </span>
                      <span className="text-emerald-400 font-semibold">{lang === 'ar' ? 'قيد التنفيذ' : 'En cours'}</span>
                    </div>
                  </div>
                ))}
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

          <div className="divide-y divide-[#79C8E8]/15">
            {clientUsers.filter((u) => u.companyName.toLowerCase().includes(clientSearch.toLowerCase())).map((u) => (
              <div key={u.id} className="p-4 hover:bg-[#162942]/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">{u.companyName}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-800">
                      {lang === 'ar' ? 'نشط' : 'Actif'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">
                    <span>{u.fullName}</span> · <span className="font-mono text-[#79C8E8]">{u.phone}</span> · <span>{u.email}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs text-[#DFC57B] font-mono">
                  <span>{projects.filter((p) => p.clientId === u.id).length} {lang === 'ar' ? 'مشروع مخصص' : 'projets'}</span>
                </div>
              </div>
            ))}
          </div>
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

    </div>
  );
};
