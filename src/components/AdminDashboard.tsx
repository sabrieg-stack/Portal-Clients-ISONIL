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
  Database, 
  ShieldCheck, 
  FileText, 
  Image as ImageIcon, 
  Video, 
  Layers, 
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
  Trash2
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
  onCreateBackup,
  onRestoreBackup,
}) => {
  const t = translations[lang];

  type AdminTab = 'projects' | 'pending' | 'dispatch' | 'clients' | 'backups';
  const [activeTab, setActiveTab] = useState<AdminTab>(projects.length === 0 ? 'projects' : 'pending');

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
  const [dispatchSuccess, setDispatchSuccess] = useState(false);
  const [lastWhatsappUrl, setLastWhatsappUrl] = useState<string | null>(null);
  const [clientSearch, setClientSearch] = useState('');

  // Backup Form State
  const [backupNote, setBackupNote] = useState('');
  const [selectedBackupForRestore, setSelectedBackupForRestore] = useState<BackupSnapshot | null>(null);
  const [restoreConfirmedSuccess, setRestoreConfirmedSuccess] = useState(false);

  // Storage calculations
  const totalStorageBytes = useMemo(() => {
    return attachments.reduce((acc, curr) => acc + curr.fileSizeBytes, 0);
  }, [attachments]);

  const storageGB = (totalStorageBytes / (1024 * 1024 * 1024)).toFixed(2);
  const maxStorageGB = 100;
  const storagePercentage = Math.min(100, Math.round((parseFloat(storageGB) / maxStorageGB) * 100));

  // Find target project and client
  const activeTargetProject = projects.find((p) => p.id === targetProjectId) || projects[0];
  const activeTargetClient = clientUsers.find((c) => c.id === activeTargetProject?.clientId);

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
      title: dispatchTitle,
      category: dispatchCategory,
      fileUrl: '/public/assets/aistudio/1000127391_10ae27f3.jpg',
      fileName: `ISONIL_Rapport_${Date.now()}.pdf`,
      fileSizeBytes: 12400000,
      uploadedAt: new Date().toISOString(),
      folder: 'sent',
      starred: true,
      notes: dispatchNotes,
      previewType: dispatchCategory === 'photo' ? 'image' : dispatchCategory === 'video' ? 'video' : 'pdf',
      downloadCount: 0,
    };

    onDispatchAttachment(newAttachment);
    setDispatchSuccess(true);

    // If channel includes WhatsApp, generate direct launch URL
    if (dispatchChannel === 'whatsapp' || dispatchChannel === 'both') {
      const clientPhone = activeTargetClient?.phone || '+212710738409';
      const cleanPhone = clientPhone.replace(/[^0-9]/g, '');
      const waMsg = `${t.whatsappPreviewMessage}\n\n*${dispatchTitle}*\nProjet: ${proj.name}\n${dispatchNotes ? `Notes: ${dispatchNotes}\n` : ''}Plateforme: https://portal.isonil.com/dossier/${proj.id}`;
      setLastWhatsappUrl(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(waMsg)}`);
    } else {
      setLastWhatsappUrl(null);
    }

    setDispatchTitle('');
    setDispatchNotes('');

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
        <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">{lang === 'ar' ? 'إجمالي المشاريع' : 'Total Projets'}</span>
            <div className="w-8 h-8 rounded-xl bg-[#21262d] theme-border border flex items-center justify-center theme-text">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-white mt-2 font-mono">{projects.length}</p>
          <p className="text-[11px] text-slate-500 mt-1">{lang === 'ar' ? 'مشاريع حية وموثقة' : 'Chantiers actifs'}</p>
        </div>

        <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">{lang === 'ar' ? 'العملاء المعتمدين' : 'Clients Actifs'}</span>
            <div className="w-8 h-8 rounded-xl bg-[#21262d] border border-sky-800/40 flex items-center justify-center text-sky-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-white mt-2 font-mono">{clientUsers.length}</p>
          <p className="text-[11px] text-slate-500 mt-1">{lang === 'ar' ? 'شركات صناعية وطاقية' : 'Comptes certifiés'}</p>
        </div>

        <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">{lang === 'ar' ? 'طلبات بانتظار التفعيل' : 'En Attente'}</span>
            <div className="w-8 h-8 rounded-xl bg-[#21262d] border border-amber-800/40 flex items-center justify-center text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-white mt-2 font-mono">{pendingRegistrations.length}</p>
          <p className="text-[11px] text-amber-400/80 mt-1">{lang === 'ar' ? 'تتطلب مراجعة المشرف' : 'Validation requise'}</p>
        </div>

        <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">{lang === 'ar' ? 'المساحة المستخدمة' : 'Stockage'}</span>
            <div className="w-8 h-8 rounded-xl bg-[#21262d] border border-emerald-800/40 flex items-center justify-center text-emerald-400">
              <HardDrive className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <p className="text-2xl font-black text-white font-mono">{storageGB} <span className="text-xs text-slate-400">Go</span></p>
            <span className="text-xs text-slate-500 font-mono">/ {maxStorageGB} Go</span>
          </div>
          <div className="w-full bg-[#0d1117] rounded-full h-1.5 mt-2 overflow-hidden border border-[#30363d]">
            <div className="bg-theme h-full rounded-full" style={{ width: `${storagePercentage}%` }} />
          </div>
        </div>
      </div>

      {/* 2. ADMIN NAVIGATION TABS */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-[#161b22] border border-[#30363d] rounded-2xl">
        <button
          onClick={() => setActiveTab('projects')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'projects'
              ? 'theme-btn font-bold shadow-md'
              : 'text-slate-300 hover:bg-[#21262d] hover:text-white'
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
              ? 'theme-btn font-bold shadow-md'
              : 'text-slate-300 hover:bg-[#21262d] hover:text-white'
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
              ? 'theme-btn font-bold shadow-md'
              : 'text-slate-300 hover:bg-[#21262d] hover:text-white'
          }`}
        >
          <Send className={`w-4 h-4 ${lang === 'ar' ? 'rotate-180' : ''}`} />
          <span>{lang === 'ar' ? 'إرسال مرفقات للعملاء (صادر الإدارة)' : 'Expédition Client (Sortant)'}</span>
        </button>

        <button
          onClick={() => setActiveTab('clients')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'clients'
              ? 'theme-btn font-bold shadow-md'
              : 'text-slate-300 hover:bg-[#21262d] hover:text-white'
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
              ? 'theme-btn font-bold shadow-md'
              : 'text-slate-300 hover:bg-[#21262d] hover:text-white'
          }`}
        >
          <Archive className="w-4 h-4" />
          <span>{t.backupTitle}</span>
          <span className="px-1.5 py-0.2 rounded-full bg-black/20 text-[10px] font-mono">
            {backups.length}
          </span>
        </button>
      </div>

      {/* TAB 1: PROJECTS MANAGEMENT */}
      {activeTab === 'projects' && (
        <div className="space-y-6">
          <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6 shadow-xl">
            <div className="flex items-center gap-2 mb-4 theme-text font-bold text-sm">
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
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {t.projectName} *
                  </label>
                  <input
                    type="text"
                    required
                    value={newProjName}
                    onChange={(e) => setNewProjName(e.target.value)}
                    placeholder={t.projectNamePlaceholder}
                    className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded-xl text-xs text-white focus:outline-none focus:border-theme"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {t.projectLocation} *
                  </label>
                  <input
                    type="text"
                    required
                    value={newProjLocation}
                    onChange={(e) => setNewProjLocation(e.target.value)}
                    placeholder={t.projectLocationPlaceholder}
                    className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded-xl text-xs text-white focus:outline-none focus:border-theme"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {t.projectType}
                  </label>
                  <select
                    value={newProjType}
                    onChange={(e) => setNewProjType(e.target.value as ProjectCategory)}
                    className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded-xl text-xs text-white focus:outline-none focus:border-theme"
                  >
                    <option value="tuyauterie">Tuyauteries & Réseaux Vapeur</option>
                    <option value="cuves">Cuves & Réservoirs Thermiques</option>
                    <option value="conduits">Gaines & Conduits de Ventilation</option>
                    <option value="chaudieres">Chaudières & Échangeurs Industriels</option>
                    <option value="batiment">Bâtiment Industriel & Toitures</option>
                    <option value="autre">Autre Isolation Spécifique</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {t.projectClient}
                  </label>
                  <select
                    value={newProjClientId}
                    onChange={(e) => setNewProjClientId(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded-xl text-xs text-white focus:outline-none focus:border-theme"
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
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {t.projectDescription}
                </label>
                <textarea
                  rows={2}
                  value={newProjDesc}
                  onChange={(e) => setNewProjDesc(e.target.value)}
                  placeholder={lang === 'ar' ? 'المواصفات الفنية ومجال العمل الميداني...' : 'Détails du cahier des charges...'}
                  className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded-xl text-xs text-white focus:outline-none focus:border-theme resize-none"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl theme-btn font-bold text-xs shadow-md transition-all cursor-pointer"
                >
                  {t.createNewProject}
                </button>
              </div>
            </form>
          </div>

          <div className="bg-[#161b22] border border-[#30363d] rounded-2xl shadow-xl overflow-hidden">
            <div className="p-4 bg-[#0d1117] border-b border-[#30363d] flex items-center justify-between">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                {lang === 'ar' ? 'قائمة المشاريع الميدانية' : 'Chantiers En Cours'}
              </h4>
              <span className="text-xs text-slate-400 font-mono">{projects.length} {lang === 'ar' ? 'مشروع' : 'projets'}</span>
            </div>

            {projects.length === 0 ? (
              <div className="py-12 text-center text-slate-500">
                <Building2 className="w-10 h-10 mx-auto mb-2 opacity-40 text-slate-400" />
                <p className="text-xs font-semibold text-slate-400">{t.noProjectsYet}</p>
                <p className="text-[11px] text-slate-500 mt-1">{t.noProjectsDesc}</p>
              </div>
            ) : (
              <div className="divide-y divide-[#21262d]">
                {projects.map((proj) => (
                  <div key={proj.id} className="p-4 hover:bg-[#21262d]/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm truncate">{proj.name}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#0d1117] theme-text theme-border border font-mono">
                          {proj.type}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 theme-text" />
                        <span>{proj.location}</span>
                        <span>·</span>
                        <span className="text-slate-300 font-medium">{proj.clientName}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-400 shrink-0">
                      <span className="px-2.5 py-1 rounded-md bg-[#0d1117] text-slate-300 font-mono">
                        {attachments.filter((a) => a.projectId === proj.id).length} {lang === 'ar' ? 'مرفقات' : 'docs'}
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
        <div className="bg-[#161b22] border border-[#30363d] rounded-2xl shadow-xl overflow-hidden">
          <div className="p-4 bg-[#0d1117] border-b border-[#30363d] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                {lang === 'ar' ? 'طلبات التسجيل بانتظار الاعتماد والموافقة' : 'Demandes d\'inscription'}
              </h4>
            </div>
            <span className="text-xs text-amber-400 font-mono font-bold">
              {pendingRegistrations.length} {lang === 'ar' ? 'طلبات جديدة' : 'en attente'}
            </span>
          </div>

          {pendingRegistrations.length === 0 ? (
            <div className="py-16 text-center text-slate-500">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-emerald-400 opacity-60" />
              <p className="text-sm font-semibold text-slate-300">
                {lang === 'ar' ? 'لا توجد طلبات تسجيل معلقة حالياً' : 'Aucune demande en attente'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {lang === 'ar' ? 'جميع حسابات العملاء مراجعة ومحدثة بالكامل.' : 'Tous les comptes sont à jour.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#21262d]">
              {pendingRegistrations.map((p) => (
                <div key={p.id} className="p-4 sm:p-5 hover:bg-[#21262d]/40 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <h5 className="font-bold text-white text-sm">{p.companyName}</h5>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#0d1117] theme-text theme-border border font-mono">
                        {p.projectType}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300">
                      {p.fullName} · <span className="theme-text font-mono">{p.phone}</span> · <span className="text-slate-400">{p.email}</span>
                    </p>
                    <p className="text-xs text-slate-400 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-500" />
                      <span>{p.city}</span>
                      <span>·</span>
                      <span className="text-slate-500">{new Date(p.requestedAt).toLocaleString()}</span>
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
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#21262d] hover:bg-red-950/60 hover:text-red-400 text-slate-400 text-xs font-semibold border border-[#30363d] transition-all cursor-pointer"
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

      {/* TAB 3: DISPATCH ATTACHMENTS (صادر الإدارة مع تحديد قناة الإرسال: إيميل أو واتساب) */}
      {activeTab === 'dispatch' && (
        <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6 shadow-xl max-w-3xl mx-auto">
          <div className="flex items-center gap-2 mb-3 theme-text font-bold text-sm">
            <Send className={`w-4 h-4 ${lang === 'ar' ? 'rotate-180' : ''}`} />
            <span>{t.dispatchToClient}</span>
          </div>

          <p className="text-xs text-slate-400 mb-5 leading-relaxed">
            {lang === 'ar' 
              ? 'تعتبر هذه المرفقات عناصر صادرة من الإدارة، وتظهر مباشرة في صندوق الوارد المخصص للعميل المستهدف مع إمكانية توجيه إشعار فوري لبريده الرسمي أو رقم واتساب الخاص به.'
              : 'Ces fichiers apparaîtront directement dans la boîte de réception du client sélectionné.'}
          </p>

          {dispatchSuccess && (
            <div className="mb-5 p-4 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{lang === 'ar' ? 'تم توجيه ونشر المرفق في حساب العميل بنجاح!' : 'Document expédié avec succès.'}</span>
              </div>

              {/* Instant WhatsApp Action if chosen */}
              {lastWhatsappUrl && (
                <div className="pt-2 border-t border-emerald-800/60 flex items-center justify-between">
                  <span>{lang === 'ar' ? 'جاهز للمشاركة الفورية عبر واتساب:' : 'Prêt pour partage WhatsApp :'}</span>
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
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {t.project} *
              </label>
              <select
                required
                value={targetProjectId}
                onChange={(e) => setTargetProjectId(e.target.value)}
                className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded-xl text-xs text-white focus:outline-none focus:border-theme"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.clientName})
                  </option>
                ))}
              </select>
            </div>

            {/* Client Official Contact Verified Pill */}
            {activeTargetClient && (
              <div className="p-3 bg-[#0d1117] rounded-xl border border-[#30363d] flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-slate-400">{t.registeredEmail}:</span>
                  <span className="text-slate-200 font-mono font-semibold">{activeTargetClient.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-slate-400">{t.registeredPhone}:</span>
                  <span className="text-emerald-400 font-mono font-semibold dir-ltr">{activeTargetClient.phone}</span>
                </div>
              </div>
            )}

            {/* Delivery Channel Radio / Pills (إيميل أم واتساب أم كلاهما) */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {t.dispatchChannelTitle} *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setDispatchChannel('email')}
                  className={`flex items-center justify-center gap-2 p-2.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    dispatchChannel === 'email'
                      ? 'theme-btn font-bold shadow-md'
                      : 'bg-[#0d1117] border-[#30363d] text-slate-300'
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
                      : 'bg-[#0d1117] border-[#30363d] text-slate-300'
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
                      ? 'theme-btn font-bold shadow-md'
                      : 'bg-[#0d1117] border-[#30363d] text-slate-300'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{t.dispatchChannelBoth}</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {t.attachmentTitle} *
              </label>
              <input
                type="text"
                required
                value={dispatchTitle}
                onChange={(e) => setDispatchTitle(e.target.value)}
                placeholder={lang === 'ar' ? 'مثال: تقرير الفحص والشهادة الحرارية المعتمدة...' : 'Titre du document officiel...'}
                className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded-xl text-xs text-white focus:outline-none focus:border-theme"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
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
                          ? 'theme-btn font-bold shadow-md'
                          : 'bg-[#0d1117] border-[#30363d] text-slate-300'
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
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {t.attachmentNotes}
              </label>
              <textarea
                rows={3}
                value={dispatchNotes}
                onChange={(e) => setDispatchNotes(e.target.value)}
                placeholder={lang === 'ar' ? 'تعليمات فنية للعميل أو تفاصيل الفحص...' : 'Observations techniques...'}
                className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded-xl text-xs text-white focus:outline-none focus:border-theme resize-none"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl theme-btn font-bold text-xs shadow-md transition-all cursor-pointer flex items-center gap-2"
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
        <div className="bg-[#161b22] border border-[#30363d] rounded-2xl shadow-xl overflow-hidden">
          <div className="p-4 bg-[#0d1117] border-b border-[#30363d] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              {lang === 'ar' ? 'سجل الشركات والعملاء المسجلين' : 'Entreprises & Clients'}
            </h4>
            <div className="relative w-full sm:max-w-xs">
              <Search className={`w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 ${lang === 'ar' ? 'right-3' : 'left-3'}`} />
              <input
                type="text"
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
                placeholder={lang === 'ar' ? 'البحث عن شركة...' : 'Filtrer les clients...'}
                className={`w-full py-1.5 bg-[#161b22] border border-[#30363d] rounded-xl text-xs text-white focus:outline-none focus:border-theme ${
                  lang === 'ar' ? 'pr-9 pl-3' : 'pl-9 pr-3'
                }`}
              />
            </div>
          </div>

          <div className="divide-y divide-[#21262d]">
            {clientUsers.filter((u) => u.companyName.toLowerCase().includes(clientSearch.toLowerCase())).map((u) => (
              <div key={u.id} className="p-4 hover:bg-[#21262d]/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">{u.companyName}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-800">
                      {lang === 'ar' ? 'نشط' : 'Actif'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    <span>{u.fullName}</span> · <span className="font-mono theme-text">{u.phone}</span> · <span>{u.email}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
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
          <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-white font-bold text-sm">
                  <Archive className="w-5 h-5 theme-text" />
                  <span>{t.backupTitle}</span>
                </div>
                <p className="text-xs text-slate-400 mt-1 max-w-xl">
                  {t.backupDesc}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => onCreateBackup(backupNote || undefined)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl theme-btn font-bold text-xs shadow-md transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>{t.createBackupBtn}</span>
                </button>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-[#30363d]/60 flex items-center gap-3">
              <input
                type="text"
                value={backupNote}
                onChange={(e) => setBackupNote(e.target.value)}
                placeholder={lang === 'ar' ? 'ملاحظة توثيقية اختيارية لهذه النسخة...' : 'Note descriptive pour ce point de restauration...'}
                className="flex-1 px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded-xl text-xs text-white focus:outline-none focus:border-theme"
              />
            </div>
          </div>

          <div className="bg-[#161b22] border border-[#30363d] rounded-2xl shadow-xl overflow-hidden">
            <div className="p-4 bg-[#0d1117] border-b border-[#30363d] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 theme-text" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  {lang === 'ar' ? 'سجل نقاط الاستعادة والنسخ المؤرخة' : 'Points de Restauration Horodatés'}
                </h4>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                {backups.length} {lang === 'ar' ? 'نسخ محفوظة' : 'sauvegardes'}
              </span>
            </div>

            {backups.length === 0 ? (
              <div className="py-12 text-center text-slate-500">
                <Archive className="w-10 h-10 mx-auto mb-2 opacity-40 text-slate-400" />
                <p className="text-xs font-semibold text-slate-400">{t.noBackupsYet}</p>
              </div>
            ) : (
              <div className="divide-y divide-[#21262d]">
                {backups.map((snap) => (
                  <div key={snap.id} className="p-4 sm:p-5 hover:bg-[#21262d]/50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-white text-sm font-mono">{snap.dateFormatted || snap.timestamp}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#0d1117] theme-text theme-border border font-mono">
                          ID: {snap.id}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">
                        {snap.note ? <span className="text-slate-200">{snap.note} · </span> : null}
                        <span className="font-mono text-slate-300">{snap.projectsCount} {lang === 'ar' ? 'مشاريع' : 'projets'}</span> · 
                        <span className="font-mono text-slate-300"> {snap.attachmentsCount} {lang === 'ar' ? 'مرفقات' : 'fichiers'}</span> · 
                        <span className="font-mono text-slate-300"> {snap.usersCount} {lang === 'ar' ? 'مستخدمين' : 'utilisateurs'}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleDownloadBackupJson(snap)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#21262d] hover:bg-[#30363d] text-slate-300 hover:text-white border border-[#30363d] text-xs font-semibold cursor-pointer"
                        title={t.exportJson}
                      >
                        <Download className="w-3.5 h-3.5 theme-text" />
                        <span>{t.exportJson}</span>
                      </button>

                      <button
                        onClick={() => setSelectedBackupForRestore(snap)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl theme-btn text-xs font-bold shadow-md cursor-pointer"
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
          <div className="w-full max-w-md bg-[#161b22] border border-[#30363d] rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-amber-400 mb-3">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h4 className="font-bold text-white text-base">
                {lang === 'ar' ? 'تأكيد استدعاء واستعادة النسخة' : 'Confirmer la Restauration'}
              </h4>
            </div>

            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              {t.restoreConfirm}
            </p>

            <div className="p-3 bg-[#0d1117] rounded-xl border border-[#30363d] mb-4 text-xs font-mono space-y-1 text-slate-400">
              <p><strong className="text-slate-200">{t.backupDate}:</strong> {selectedBackupForRestore.dateFormatted}</p>
              <p><strong className="text-slate-200">{t.backupContents}:</strong> {selectedBackupForRestore.projectsCount} {lang === 'ar' ? 'مشاريع' : 'projets'} - {selectedBackupForRestore.attachmentsCount} {lang === 'ar' ? 'مرفقات' : 'docs'}</p>
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
                  className="px-4 py-2 rounded-xl bg-[#21262d] text-slate-300 text-xs font-medium cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRestore}
                  className="px-4 py-2 rounded-xl theme-btn text-xs font-bold cursor-pointer"
                >
                  {t.confirm}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
