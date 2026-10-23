import React, { useState, useMemo } from 'react';
import { 
  Inbox, 
  Send, 
  Star, 
  Trash2, 
  Plus, 
  Search, 
  Filter, 
  FileText, 
  Image as ImageIcon, 
  Video, 
  FileQuestion, 
  Eye, 
  Building2, 
  FolderPlus,
  PanelLeftClose,
  PanelLeft,
  Calendar,
  Sparkles,
  Layers,
  ArrowUpDown,
  Download,
  Share2,
  Clock,
  ChevronDown,
  Info,
  ChevronRight,
  ExternalLink,
  Film,
  FileCheck2,
  FolderOpen,
  ArrowRight
} from 'lucide-react';
import { Attachment, AttachmentCategory, Language, MailboxFolder, Project, User, LayoutModel } from '../types';
import { translations } from '../i18n/translations';

interface MailboxWorkspaceProps {
  lang: Language;
  currentUser: User;
  clientProjects: Project[];
  attachments: Attachment[];
  layoutModel: LayoutModel;
  onLayoutChange: (model: LayoutModel) => void;
  onOpenViewer: (attachment: Attachment) => void;
  onOpenUpload: (projectId?: string) => void;
  onToggleStar: (attachmentId: string) => void;
  onDeleteAttachment: (attachmentId: string) => void;
  onCreateNewProject?: () => void;
}

export const MailboxWorkspace: React.FC<MailboxWorkspaceProps> = ({
  lang,
  currentUser,
  clientProjects,
  attachments,
  layoutModel,
  onLayoutChange,
  onOpenViewer,
  onOpenUpload,
  onToggleStar,
  onDeleteAttachment,
  onCreateNewProject,
}) => {
  const t = translations[lang];

  // Filters state
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<AttachmentCategory | 'all'>('all');
  const [activeFolder, setActiveFolder] = useState<MailboxFolder | 'starred'>('inbox');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'size'>('date-desc');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [customFolders, setCustomFolders] = useState<string[]>([]);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // In Model 3 (Grid): active project dossier filter (if user clicked on a project card)
  const [gridActiveProjectId, setGridActiveProjectId] = useState<string | null>(null);

  const formatBytes = (bytes: number): string => {
    if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} Go`;
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} Mo`;
    return `${(bytes / 1024).toFixed(1)} Ko`;
  };

  const clientProjectIds = useMemo(() => new Set(clientProjects.map((p) => p.id)), [clientProjects]);

  // Strict Bidirectional mail logic
  const isAttachmentInFolder = (att: Attachment, folder: MailboxFolder | 'starred'): boolean => {
    if (folder === 'starred') return !!att.starred;
    if (folder === 'trash') return false;

    if (currentUser.role === 'admin') {
      if (folder === 'inbox') return att.senderType === 'client';
      if (folder === 'sent') return att.senderType === 'admin';
    } else {
      if (folder === 'inbox') return att.senderType === 'admin';
      if (folder === 'sent') return att.senderType === 'client';
    }
    return true;
  };

  const filteredAttachments = useMemo(() => {
    return attachments.filter((att) => {
      if (currentUser.role === 'client' && !clientProjectIds.has(att.projectId)) return false;
      if (selectedProjectId !== 'all' && att.projectId !== selectedProjectId) return false;
      if (gridActiveProjectId && att.projectId !== gridActiveProjectId) return false;
      if (selectedCategory !== 'all' && att.category !== selectedCategory) return false;
      if (!isAttachmentInFolder(att, activeFolder)) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = att.title.toLowerCase().includes(q);
        const matchesFile = att.fileName.toLowerCase().includes(q);
        const matchesProject = att.projectName.toLowerCase().includes(q);
        const matchesNotes = att.notes?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesFile && !matchesProject && !matchesNotes) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'date-desc') return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
      if (sortBy === 'date-asc') return new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime();
      if (sortBy === 'size') return b.fileSizeBytes - a.fileSizeBytes;
      return 0;
    });
  }, [attachments, clientProjectIds, selectedProjectId, gridActiveProjectId, selectedCategory, activeFolder, searchQuery, sortBy, currentUser.role]);

  // Counts for folders
  const folderCounts = useMemo(() => {
    const accessible = attachments.filter((a) => currentUser.role === 'admin' || clientProjectIds.has(a.projectId));
    return {
      inbox: accessible.filter((a) => isAttachmentInFolder(a, 'inbox')).length,
      sent: accessible.filter((a) => isAttachmentInFolder(a, 'sent')).length,
      starred: accessible.filter((a) => a.starred).length,
      trash: 0,
    };
  }, [attachments, clientProjectIds, currentUser.role]);

  // Visual type badge component
  const renderVisualBadge = (category: AttachmentCategory, fileName: string) => {
    const ext = (fileName.split('.').pop() || '').toUpperCase();
    if (category === 'video' || ['MP4', 'MOV', 'AVI', 'MKV', 'WEBM'].includes(ext)) {
      return (
        <span className="px-2 py-0.5 rounded-md bg-purple-950/80 text-purple-300 border border-purple-700/60 font-mono text-[10px] font-bold inline-flex items-center gap-1 shadow-sm">
          <Film className="w-2.5 h-2.5" />
          <span>{ext || 'MP4'}</span>
        </span>
      );
    }
    if (category === 'document' || ext === 'PDF') {
      return (
        <span className="px-2 py-0.5 rounded-md bg-red-950/80 text-red-300 border border-red-700/60 font-mono text-[10px] font-bold inline-flex items-center gap-1 shadow-sm">
          <FileText className="w-2.5 h-2.5" />
          <span>PDF</span>
        </span>
      );
    }
    if (category === 'photo' || ['JPG', 'PNG', 'JPEG', 'WEBP'].includes(ext)) {
      return (
        <span className="px-2 py-0.5 rounded-md bg-cyan-950/80 text-cyan-300 border border-cyan-700/60 font-mono text-[10px] font-bold inline-flex items-center gap-1 shadow-sm">
          <ImageIcon className="w-2.5 h-2.5" />
          <span>IMG</span>
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-md bg-amber-950/80 text-amber-300 border border-amber-700/60 font-mono text-[10px] font-bold inline-flex items-center gap-1 shadow-sm">
        <FileCheck2 className="w-2.5 h-2.5" />
        <span>NOTE</span>
      </span>
    );
  };

  // Thumbnail preview box component
  const renderThumbnailBox = (att: Attachment, sizeClass: string = "w-14 h-14") => {
    const isVid = att.category === 'video' || att.fileName.endsWith('.mp4') || att.fileName.endsWith('.mov') || att.fileName.endsWith('.avi') || att.fileName.endsWith('.mkv');
    return (
      <div className={`relative ${sizeClass} rounded-xl bg-black border border-[#30363d] overflow-hidden flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform`}>
        {att.category === 'photo' ? (
          <img 
            src={att.fileUrl || '/public/assets/aistudio/1000127391_10ae27f3.jpg'} 
            alt={att.title} 
            className="w-full h-full object-cover" 
          />
        ) : isVid ? (
          <div className="w-full h-full bg-gradient-to-br from-purple-950/80 to-black flex items-center justify-center relative">
            <Film className="w-5 h-5 text-purple-400" />
            <span className="absolute inset-0 flex items-center justify-center bg-black/30">
              <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                <span className="w-0 h-0 border-y-[4px] border-y-transparent border-s-[7px] border-s-white ms-0.5" />
              </span>
            </span>
          </div>
        ) : att.category === 'document' ? (
          <div className="w-full h-full bg-gradient-to-br from-red-950/70 to-[#0d1117] flex flex-col items-center justify-center p-1 text-center">
            <FileText className="w-5 h-5 text-red-400" />
            <span className="text-[8px] font-mono font-bold text-red-300 mt-0.5">PDF</span>
          </div>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-amber-950/70 to-[#0d1117] flex items-center justify-center">
            <FileCheck2 className="w-5 h-5 text-amber-400" />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* 1. PERSISTENT 5-MODEL SELECTOR DROPDOWN & BIDIRECTIONAL NOTICE */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-4 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 theme-text" />
              <h3 className="text-xs md:text-sm font-bold text-white uppercase tracking-wider">
                {t.layoutModelsTitle}
              </h3>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {layoutModel === 'horizontal' && t.layoutDescHorizontal}
              {layoutModel === 'sidebar' && t.layoutDescSidebar}
              {layoutModel === 'grid' && t.layoutDescGrid}
              {layoutModel === 'timeline' && t.layoutDescTimeline}
              {layoutModel === 'compact' && t.layoutDescCompact}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <select
                value={layoutModel}
                onChange={(e) => onLayoutChange(e.target.value as LayoutModel)}
                className="bg-[#0d1117] border border-[#30363d] theme-text text-xs font-bold rounded-xl px-4 py-2 focus:outline-none focus:border-theme cursor-pointer pe-9 appearance-none shadow-md"
              >
                <option value="horizontal">{t.layoutHorizontal}</option>
                <option value="sidebar">{t.layoutSidebar}</option>
                <option value="grid">{t.layoutGrid}</option>
                <option value="timeline">{t.layoutTimeline}</option>
                <option value="compact">{t.layoutCompact}</option>
              </select>
              <ChevronDown className="w-4 h-4 theme-text absolute top-1/2 -translate-y-1/2 end-3 pointer-events-none" />
            </div>

            {/* "نشر" Button (Replaced from 'إرفاق ملف جديد') */}
            <button
              onClick={() => onOpenUpload(selectedProjectId !== 'all' ? selectedProjectId : undefined)}
              className="flex items-center gap-2 py-2 px-5 rounded-xl theme-btn font-bold text-xs shadow-md transition-all cursor-pointer shrink-0"
              title={t.newAttachment}
            >
              <Plus className="w-4 h-4" />
              <span>{t.newAttachment}</span>
            </button>
          </div>
        </div>

        {/* Bidirectional Mail Info Banner */}
        <div className="mt-3.5 pt-3 border-t border-[#21262d] flex items-center gap-2 text-xs text-slate-400">
          <Info className="w-4 h-4 theme-text shrink-0" />
          <span>
            {currentUser.role === 'admin' ? t.bidirectionalNoticeAdmin : t.bidirectionalNoticeClient}
          </span>
        </div>
      </div>

      {/* 2. UPPER FILTER BAR: Projects & Categories */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-4 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#21262d] theme-border border flex items-center justify-center theme-text shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <label className="block text-[11px] font-semibold text-slate-400 mb-0.5">
                {t.filterByProject}
              </label>
              <select
                value={selectedProjectId}
                onChange={(e) => {
                  setSelectedProjectId(e.target.value);
                  setGridActiveProjectId(null);
                }}
                className="bg-[#0d1117] border border-[#30363d] text-slate-100 text-xs font-semibold rounded-xl px-3 py-1.5 focus:outline-none focus:border-theme cursor-pointer min-w-[240px]"
              >
                <option value="all">{t.allProjects} ({clientProjects.length})</option>
                {clientProjects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-[#0d1117] rounded-xl border border-[#30363d]">
            {[
              { id: 'all', label: t.categoryAll, icon: Filter },
              { id: 'photo', label: t.categoryPhoto, icon: ImageIcon },
              { id: 'video', label: t.categoryVideo, icon: Video },
              { id: 'document', label: t.categoryDocument, icon: FileText },
              { id: 'note', label: t.categoryNote, icon: FileText },
              { id: 'other', label: t.categoryOther, icon: FileQuestion },
            ].map((cat) => {
              const Icon = cat.icon;
              const isActive = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id as AttachmentCategory | 'all')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'theme-btn font-bold shadow-md'
                      : 'text-slate-300 hover:text-white hover:bg-[#21262d]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

        </div>
      </div>

      {/* 3. LAYOUT MODEL 1: HORIZONTAL STREAM (النمط الرأسي العلوي) */}
      {layoutModel === 'horizontal' && (
        <div className="space-y-4">
          <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-3 shadow-md flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setActiveFolder('inbox')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeFolder === 'inbox'
                    ? 'theme-btn font-bold shadow-md'
                    : 'bg-[#0d1117] text-slate-300 hover:bg-[#21262d]'
                }`}
              >
                <Inbox className="w-4 h-4" />
                <span>{t.inbox}</span>
                <span className="px-1.5 py-0.2 rounded-full bg-black/20 text-[10px] font-mono">
                  {folderCounts.inbox}
                </span>
              </button>

              <button
                onClick={() => setActiveFolder('sent')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeFolder === 'sent'
                    ? 'theme-btn font-bold shadow-md'
                    : 'bg-[#0d1117] text-slate-300 hover:bg-[#21262d]'
                }`}
              >
                <Send className={`w-4 h-4 ${lang === 'ar' ? 'rotate-180' : ''}`} />
                <span>{t.sent}</span>
                <span className="px-1.5 py-0.2 rounded-full bg-black/20 text-[10px] font-mono">
                  {folderCounts.sent}
                </span>
              </button>

              <button
                onClick={() => setActiveFolder('starred')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeFolder === 'starred'
                    ? 'theme-btn font-bold shadow-md'
                    : 'bg-[#0d1117] text-slate-300 hover:bg-[#21262d]'
                }`}
              >
                <Star className="w-4 h-4 text-amber-400" />
                <span>{t.starred}</span>
                <span className="px-1.5 py-0.2 rounded-full bg-black/20 text-[10px] font-mono">
                  {folderCounts.starred}
                </span>
              </button>
            </div>

            <div className="relative w-full sm:max-w-xs">
              <Search className={`w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 ${lang === 'ar' ? 'right-3' : 'left-3'}`} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.searchPlaceholder}
                className={`w-full py-1.5 bg-[#0d1117] border border-[#30363d] rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-theme ${
                  lang === 'ar' ? 'pr-9 pl-3' : 'pl-9 pr-3'
                }`}
              />
            </div>
          </div>

          {/* List with Thumbnails and Visual Badges */}
          <div className="bg-[#161b22] border border-[#30363d] rounded-2xl shadow-xl overflow-hidden divide-y divide-[#21262d]">
            {filteredAttachments.length === 0 ? (
              <div className="py-16 text-center text-slate-500">
                <FileQuestion className="w-12 h-12 mx-auto mb-3 opacity-40 text-slate-400" />
                <p className="text-sm font-semibold text-slate-400">{t.noAttachmentsFound}</p>
                <p className="text-xs text-slate-500 mt-1">{t.noAttachmentsSub}</p>
              </div>
            ) : (
              filteredAttachments.map((att) => (
                <div
                  key={att.id}
                  onClick={() => onOpenViewer(att)}
                  className="p-3 sm:p-4 hover:bg-[#21262d]/60 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleStar(att.id);
                      }}
                      className="text-slate-500 hover:text-amber-400 transition-colors p-1"
                    >
                      <Star className={`w-4 h-4 ${att.starred ? 'text-amber-400 fill-amber-400' : ''}`} />
                    </button>

                    {/* Thumbnail Box */}
                    {renderThumbnailBox(att, "w-12 h-12 sm:w-14 sm:h-14")}

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-100 text-sm truncate group-hover:theme-text transition-colors">
                          {att.title}
                        </span>
                        {renderVisualBadge(att.category, att.fileName)}
                      </div>
                      <p className="text-xs text-slate-400 truncate mt-1">
                        <span className="text-slate-300 font-medium">{att.projectName}</span>
                        <span className="mx-1.5">·</span>
                        <span>{att.fileName}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-400 self-end sm:self-center shrink-0">
                    <span className="font-mono text-[11px] theme-text font-semibold">
                      {formatBytes(att.fileSizeBytes)}
                    </span>
                    <span className="text-slate-500">
                      {new Date(att.uploadedAt).toLocaleDateString()}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenViewer(att);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-[#21262d] hover:bg-[#30363d] text-slate-200 text-xs font-semibold border border-[#30363d] transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5 inline me-1 theme-text" />
                      <span>{lang === 'ar' ? 'معاينة' : 'Ouvrir'}</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(t.deleteConfirm)) {
                          onDeleteAttachment(att.id);
                        }
                      }}
                      className="p-1.5 rounded-lg bg-[#21262d] hover:bg-red-950/60 text-slate-400 hover:text-red-400 border border-[#30363d] transition-colors"
                      title={t.deleteAttachment}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 4. LAYOUT MODEL 2: CLASSIC SPLIT SIDEBAR (القائمة الجانبية الكلاسيكية) */}
      {layoutModel === 'sidebar' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          <div className={`${sidebarCollapsed ? 'md:col-span-1' : 'md:col-span-3'} space-y-4`}>
            <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-4 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                {!sidebarCollapsed && (
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    {lang === 'ar' ? 'صناديق البريد والمجلدات' : 'Dossiers & Boîtes'}
                  </h4>
                )}
                <button
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className="p-1.5 rounded-lg bg-[#0d1117] text-slate-400 hover:text-white cursor-pointer ms-auto"
                >
                  {sidebarCollapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
                </button>
              </div>

              <div className="space-y-1.5">
                {[
                  { id: 'inbox', label: t.inbox, icon: Inbox, count: folderCounts.inbox },
                  { id: 'sent', label: t.sent, icon: Send, count: folderCounts.sent },
                  { id: 'starred', label: t.starred, icon: Star, count: folderCounts.starred },
                ].map((f) => {
                  const Icon = f.icon;
                  const isActive = activeFolder === f.id;
                  return (
                    <button
                      key={f.id}
                      onClick={() => setActiveFolder(f.id as any)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        isActive
                          ? 'theme-btn font-bold shadow-md'
                          : 'text-slate-300 hover:bg-[#21262d] hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon className={`w-4 h-4 shrink-0 ${f.id === 'sent' && lang === 'ar' ? 'rotate-180' : ''}`} />
                        {!sidebarCollapsed && <span className="truncate">{f.label}</span>}
                      </div>
                      {!sidebarCollapsed && (
                        <span className="px-1.5 py-0.5 rounded-full bg-black/20 text-[10px] font-mono">
                          {f.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className={`${sidebarCollapsed ? 'md:col-span-11' : 'md:col-span-9'}`}>
            <div className="bg-[#161b22] border border-[#30363d] rounded-2xl shadow-xl overflow-hidden divide-y divide-[#21262d]">
              {filteredAttachments.length === 0 ? (
                <div className="py-16 text-center text-slate-500">
                  <FileQuestion className="w-12 h-12 mx-auto mb-3 opacity-40 text-slate-400" />
                  <p className="text-sm font-semibold text-slate-400">{t.noAttachmentsFound}</p>
                </div>
              ) : (
                filteredAttachments.map((att) => (
                  <div
                    key={att.id}
                    onClick={() => onOpenViewer(att)}
                    className="p-3 sm:p-4 hover:bg-[#21262d]/60 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleStar(att.id);
                        }}
                        className="text-slate-500 hover:text-amber-400 transition-colors p-1"
                      >
                        <Star className={`w-4 h-4 ${att.starred ? 'text-amber-400 fill-amber-400' : ''}`} />
                      </button>

                      {renderThumbnailBox(att, "w-12 h-12")}

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-100 text-sm truncate group-hover:theme-text transition-colors">
                            {att.title}
                          </span>
                          {renderVisualBadge(att.category, att.fileName)}
                        </div>
                        <p className="text-xs text-slate-400 truncate mt-1">
                          <span>{att.projectName}</span>
                          <span className="mx-1.5">·</span>
                          <span className="font-mono theme-text">{formatBytes(att.fileSizeBytes)}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      <span>{new Date(att.uploadedAt).toLocaleDateString()}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenViewer(att);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-[#21262d] hover:bg-[#30363d] text-slate-200 text-xs font-semibold border border-[#30363d]"
                      >
                        {lang === 'ar' ? 'عرض' : 'Ouvrir'}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 5. LAYOUT MODEL 3: INTERACTIVE PROJECT CARD GRID (شبكة بطاقات المشاريع التفاعلية) */}
      {layoutModel === 'grid' && (
        <div className="space-y-6">
          {/* Back button if user drilled into a specific project */}
          {gridActiveProjectId && (
            <div className="flex items-center justify-between bg-[#161b22] border border-[#30363d] p-3 rounded-2xl">
              <button
                onClick={() => setGridActiveProjectId(null)}
                className="flex items-center gap-2 text-xs font-bold theme-text hover:underline cursor-pointer"
              >
                <ArrowRight className={`w-4 h-4 ${lang === 'fr' ? 'rotate-180' : ''}`} />
                <span>{t.backToProjectsGrid}</span>
              </button>
              <span className="text-xs text-slate-300 font-bold">
                {clientProjects.find((p) => p.id === gridActiveProjectId)?.name}
              </span>
            </div>
          )}

          {/* If no project is selected, show Interactive Project Dossier Cards */}
          {!gridActiveProjectId && clientProjects.length > 0 && selectedProjectId === 'all' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {clientProjects.map((proj) => {
                const projFiles = attachments.filter((a) => a.projectId === proj.id);
                const photosCount = projFiles.filter((a) => a.category === 'photo').length;
                const videosCount = projFiles.filter((a) => a.category === 'video').length;
                const docsCount = projFiles.filter((a) => a.category === 'document').length;
                const totalBytes = projFiles.reduce((acc, c) => acc + c.fileSizeBytes, 0);

                return (
                  <div
                    key={proj.id}
                    onClick={() => setGridActiveProjectId(proj.id)}
                    className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 shadow-xl hover:theme-border transition-all cursor-pointer flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full bg-[#0d1117] theme-text theme-border border">
                          {proj.type}
                        </span>
                        <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          <span>{lang === 'ar' ? 'نشط' : 'Actif'}</span>
                        </span>
                      </div>

                      <h4 className="font-bold text-base text-white group-hover:theme-text transition-colors mb-1">
                        {proj.name}
                      </h4>
                      <p className="text-xs text-slate-400 mb-4 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-500" />
                        <span>{proj.clientName} · {proj.location}</span>
                      </p>

                      {/* Summary Badges Grid for Project Media */}
                      <div className="grid grid-cols-3 gap-2 bg-[#0d1117] p-2.5 rounded-xl border border-[#21262d] mb-4 text-center text-xs">
                        <div className="flex flex-col items-center">
                          <ImageIcon className="w-4 h-4 text-cyan-400 mb-1" />
                          <span className="font-mono font-bold text-slate-200">{photosCount}</span>
                          <span className="text-[10px] text-slate-500">{t.categoryPhoto}</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <Film className="w-4 h-4 text-purple-400 mb-1" />
                          <span className="font-mono font-bold text-slate-200">{videosCount}</span>
                          <span className="text-[10px] text-slate-500">{t.categoryVideo}</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <FileText className="w-4 h-4 text-red-400 mb-1" />
                          <span className="font-mono font-bold text-slate-200">{docsCount}</span>
                          <span className="text-[10px] text-slate-500">{t.categoryDocument}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-[#30363d] flex items-center justify-between text-xs text-slate-400">
                      <span className="font-mono theme-text font-bold">{formatBytes(totalBytes)}</span>
                      <span className="flex items-center gap-1 font-semibold text-slate-300 group-hover:theme-text">
                        <span>{t.openProjectDossier}</span>
                        <ChevronRight className={`w-3.5 h-3.5 ${lang === 'ar' ? 'rotate-180' : ''}`} />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Media Cards Grid for Files */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredAttachments.length === 0 ? (
              <div className="col-span-full py-16 text-center text-slate-500 bg-[#161b22] border border-[#30363d] rounded-2xl">
                <FileQuestion className="w-12 h-12 mx-auto mb-3 opacity-40 text-slate-400" />
                <p className="text-sm font-semibold text-slate-400">{t.noAttachmentsFound}</p>
              </div>
            ) : (
              filteredAttachments.map((att) => (
                <div
                  key={att.id}
                  onClick={() => onOpenViewer(att)}
                  className="bg-[#161b22] border border-[#30363d] rounded-2xl p-4 shadow-xl hover:theme-border transition-all cursor-pointer flex flex-col justify-between group relative"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {renderVisualBadge(att.category, att.fileName)}
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleStar(att.id);
                        }}
                        className="text-slate-500 hover:text-amber-400 p-1"
                      >
                        <Star className={`w-4 h-4 ${att.starred ? 'text-amber-400 fill-amber-400' : ''}`} />
                      </button>
                    </div>

                    <h4 className="font-bold text-sm text-white group-hover:theme-text transition-colors line-clamp-1 mb-1">
                      {att.title}
                    </h4>
                    <p className="text-xs text-slate-400 mb-3 line-clamp-1">
                      {att.projectName}
                    </p>

                    {/* Rich Visual Card Preview regardless of format */}
                    <div className="w-full h-36 rounded-xl bg-black border border-[#30363d] overflow-hidden flex items-center justify-center mb-3 relative">
                      {att.category === 'photo' ? (
                        <img 
                          src={att.fileUrl || '/public/assets/aistudio/1000127391_10ae27f3.jpg'} 
                          alt={att.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
                        />
                      ) : att.category === 'video' || att.fileName.endsWith('.mp4') || att.fileName.endsWith('.mov') || att.fileName.endsWith('.avi') ? (
                        <div className="w-full h-full bg-gradient-to-br from-purple-950 via-black to-[#0d1117] flex flex-col items-center justify-center text-purple-400 relative">
                          <Film className="w-10 h-10 mb-1" />
                          <span className="text-[10px] font-mono font-bold bg-black/60 px-2 py-0.5 rounded text-purple-300">
                            VIDEO · 1080p FULL HD
                          </span>
                          <span className="absolute bottom-2 right-2 text-[10px] font-mono text-slate-400 bg-black/70 px-1.5 rounded">
                            {formatBytes(att.fileSizeBytes)}
                          </span>
                        </div>
                      ) : att.category === 'document' || att.fileName.endsWith('.pdf') ? (
                        <div className="w-full h-full bg-gradient-to-br from-red-950/60 via-[#161b22] to-black flex flex-col items-center justify-center p-3 text-center">
                          <FileText className="w-10 h-10 text-red-400 mb-1" />
                          <span className="text-xs font-bold text-slate-200 line-clamp-1">{att.fileName}</span>
                          <span className="text-[10px] font-mono text-red-300 mt-1">DOCUMENT TECHNIQUE PDF</span>
                        </div>
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-amber-950/50 via-[#161b22] to-black p-4 flex flex-col justify-center">
                          <FileCheck2 className="w-8 h-8 text-amber-400 mb-1" />
                          <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                            {att.notes || 'Note technique archivée.'}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#30363d] flex items-center justify-between text-xs text-slate-400">
                    <span className="font-mono theme-text font-bold">{formatBytes(att.fileSizeBytes)}</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenViewer(att);
                        }}
                        className="px-2.5 py-1 rounded bg-[#21262d] hover:bg-[#30363d] text-slate-200 text-xs font-semibold"
                      >
                        {lang === 'ar' ? 'معاينة' : 'Ouvrir'}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(t.deleteConfirm)) {
                            onDeleteAttachment(att.id);
                          }
                        }}
                        className="p-1 rounded bg-[#21262d] hover:bg-red-950/60 text-slate-400 hover:text-red-400"
                        title={t.deleteAttachment}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 6. LAYOUT MODEL 4: TIMELINE DOSSIER (الأرشيف الزمني للأحداث والمرفقات) */}
      {layoutModel === 'timeline' && (
        <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6 shadow-xl">
          <div className="mb-6 pb-4 border-b border-[#30363d] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 theme-text" />
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                {t.layoutTimeline}
              </h4>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              {filteredAttachments.length} {lang === 'ar' ? 'أحداث موثقة' : 'événements archivés'}
            </span>
          </div>

          {filteredAttachments.length === 0 ? (
            <div className="py-16 text-center text-slate-500">
              <FileQuestion className="w-12 h-12 mx-auto mb-3 opacity-40 text-slate-400" />
              <p className="text-sm font-semibold text-slate-400">{t.noAttachmentsFound}</p>
            </div>
          ) : (
            <div className="relative border-s border-[#30363d] ms-4 space-y-8">
              {filteredAttachments.map((att) => (
                <div key={att.id} className="relative ps-6 group cursor-pointer" onClick={() => onOpenViewer(att)}>
                  <span className="absolute -start-3 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-[#0d1117] theme-border-solid border-2 theme-text shadow-md group-hover:scale-125 transition-transform">
                    {renderThumbnailBox(att, "w-4 h-4 rounded-full")}
                  </span>

                  <div className="bg-[#0d1117] border border-[#30363d] group-hover:theme-border rounded-2xl p-4 transition-all">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-3">
                        {renderThumbnailBox(att, "w-10 h-10")}
                        <div>
                          <span className="font-bold text-sm text-white group-hover:theme-text transition-colors block">
                            {att.title}
                          </span>
                          <span className="text-xs text-slate-400">{att.projectName}</span>
                        </div>
                        {renderVisualBadge(att.category, att.fileName)}
                      </div>
                      <span className="text-xs font-mono text-slate-400">
                        {new Date(att.uploadedAt).toLocaleString()}
                      </span>
                    </div>

                    {att.notes && (
                      <p className="text-xs text-slate-300 bg-[#161b22] p-2.5 rounded-xl border border-[#21262d] my-3">
                        {att.notes}
                      </p>
                    )}

                    <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-[#21262d]">
                      <span>{t.uploadedBy}: <strong className="theme-text">{att.senderName}</strong></span>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-slate-300">{formatBytes(att.fileSizeBytes)}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(t.deleteConfirm)) {
                              onDeleteAttachment(att.id);
                            }
                          }}
                          className="text-slate-500 hover:text-red-400 p-1"
                          title={t.deleteAttachment}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 7. LAYOUT MODEL 5: COMPACT DATA TABLE (جدول البيانات المدمج عالي الكثافة) */}
      {layoutModel === 'compact' && (
        <div className="bg-[#161b22] border border-[#30363d] rounded-2xl shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-start">
              <thead className="bg-[#0d1117] border-b border-[#30363d] text-slate-400 uppercase font-semibold">
                <tr>
                  <th className="p-3 ps-4 text-start">{t.attachmentTitle}</th>
                  <th className="p-3 text-start">{t.project}</th>
                  <th className="p-3 text-start">{t.attachmentCategory}</th>
                  <th className="p-3 text-start">{t.fileSize}</th>
                  <th className="p-3 text-start">{t.uploadedBy}</th>
                  <th className="p-3 text-start">{t.uploadDate}</th>
                  <th className="p-3 pe-4 text-end">{lang === 'ar' ? 'الإجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#21262d]">
                {filteredAttachments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500">
                      {t.noAttachmentsFound}
                    </td>
                  </tr>
                ) : (
                  filteredAttachments.map((att) => (
                    <tr
                      key={att.id}
                      onClick={() => onOpenViewer(att)}
                      className="hover:bg-[#21262d]/70 transition-colors cursor-pointer group"
                    >
                      <td className="p-3 ps-4 font-semibold text-white group-hover:theme-text transition-colors truncate max-w-[240px]">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleStar(att.id);
                            }}
                            className="text-slate-500 hover:text-amber-400"
                          >
                            <Star className={`w-3.5 h-3.5 ${att.starred ? 'text-amber-400 fill-amber-400' : ''}`} />
                          </button>
                          {renderThumbnailBox(att, "w-8 h-8 rounded-lg")}
                          <span className="truncate">{att.title}</span>
                        </div>
                      </td>
                      <td className="p-3 text-slate-300 truncate max-w-[160px]">{att.projectName}</td>
                      <td className="p-3">
                        {renderVisualBadge(att.category, att.fileName)}
                      </td>
                      <td className="p-3 font-mono theme-text font-semibold">{formatBytes(att.fileSizeBytes)}</td>
                      <td className="p-3 text-slate-400 truncate max-w-[140px]">{att.senderName}</td>
                      <td className="p-3 text-slate-500 font-mono">{new Date(att.uploadedAt).toLocaleDateString()}</td>
                      <td className="p-3 pe-4 text-end">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenViewer(att);
                            }}
                            className="px-2.5 py-1 rounded bg-[#21262d] hover:bg-[#30363d] text-slate-200 text-xs font-semibold"
                          >
                            {lang === 'ar' ? 'معاينة' : 'Ouvrir'}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm(t.deleteConfirm)) {
                                onDeleteAttachment(att.id);
                              }
                            }}
                            className="p-1 rounded bg-[#21262d] hover:bg-red-950/60 text-slate-400 hover:text-red-400"
                            title={t.deleteAttachment}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};
