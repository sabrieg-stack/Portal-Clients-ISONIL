import React, { useState, useMemo, useEffect } from 'react';
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
  Share2,
  Clock,
  ChevronRight,
  Film,
  FileCheck2,
  FolderOpen,
  ArrowRight,
  RotateCcw,
  X
} from 'lucide-react';
import { Attachment, AttachmentCategory, Language, MailboxFolder, Project, User, LayoutModel } from '../types';
import { translations } from '../i18n/translations';
import { triggerNativeShare } from '../firebase';

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
  onRestoreAttachment?: (attachmentId: string) => void;
  onCreateNewProject?: () => void;
  customFolders?: string[];
  onAddCustomFolder?: (folderName: string) => void;
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export const MailboxWorkspace: React.FC<MailboxWorkspaceProps> = ({
  lang,
  currentUser,
  clientProjects,
  attachments,
  layoutModel,
  onOpenViewer,
  onOpenUpload,
  onToggleStar,
  onDeleteAttachment,
  onRestoreAttachment,
  customFolders: propCustomFolders,
  onAddCustomFolder,
}) => {
  const t = translations[lang];

  // Filters state
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<AttachmentCategory | 'all'>('all');
  const [activeFolder, setActiveFolder] = useState<MailboxFolder | 'starred'>('inbox');
  const [selectedCustomSection, setSelectedCustomSection] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy] = useState<'date-desc' | 'date-asc' | 'size'>('date-desc');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [localCustomFolders, setLocalCustomFolders] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('isonil_portal_custom_folders_v1');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // In Model 3 (Grid): active project dossier filter (if user clicked on a project card)
  const [gridActiveProjectId, setGridActiveProjectId] = useState<string | null>(null);

  const customFolders = useMemo(() => {
    const combined = new Set<string>([...localCustomFolders, ...(propCustomFolders || [])]);
    attachments.forEach((a) => {
      if (a.customSection) combined.add(a.customSection);
    });
    return Array.from(combined);
  }, [localCustomFolders, propCustomFolders, attachments]);

  useEffect(() => {
    try {
      localStorage.setItem('isonil_portal_custom_folders_v1', JSON.stringify(localCustomFolders));
    } catch {
      // ignore storage errors
    }
  }, [localCustomFolders]);

  const handleCreateCustomFolder = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newFolderName.trim();
    if (!clean) return;
    if (!localCustomFolders.includes(clean)) {
      setLocalCustomFolders((prev) => [...prev, clean]);
    }
    if (onAddCustomFolder) onAddCustomFolder(clean);
    setSelectedCustomSection(clean);
    setNewFolderName('');
    setShowNewFolderModal(false);
  };

  const formatBytes = (bytes: number): string => {
    if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} Go`;
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} Mo`;
    return `${(bytes / 1024).toFixed(1)} Ko`;
  };

  const getRemainingRecoveryDays = (deletedAt?: string): number => {
    if (!deletedAt) return 30;
    const elapsed = Date.now() - new Date(deletedAt).getTime();
    return Math.max(0, Math.ceil((THIRTY_DAYS_MS - elapsed) / (24 * 60 * 60 * 1000)));
  };

  const isRecoverableInTrash = (att: Attachment): boolean => {
    if (att.folder !== 'trash') return false;
    return getRemainingRecoveryDays(att.deletedAt) > 0;
  };

  const clientProjectIds = useMemo(() => new Set(clientProjects.map((p) => p.id)), [clientProjects]);

  // Strict Bidirectional mail logic + 30-day Trash support
  const isAttachmentInFolder = (att: Attachment, folder: MailboxFolder | 'starred'): boolean => {
    if (folder === 'trash') {
      return isRecoverableInTrash(att);
    }
    // Exclude trashed items from regular folders
    if (att.folder === 'trash') return false;

    if (folder === 'starred') return !!att.starred;

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
      if (selectedCustomSection && att.customSection !== selectedCustomSection) return false;
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
  }, [attachments, clientProjectIds, selectedProjectId, gridActiveProjectId, selectedCategory, selectedCustomSection, activeFolder, searchQuery, sortBy, currentUser.role]);

  // Counts for folders
  const folderCounts = useMemo(() => {
    const accessible = attachments.filter((a) => currentUser.role === 'admin' || clientProjectIds.has(a.projectId));
    return {
      inbox: accessible.filter((a) => isAttachmentInFolder(a, 'inbox')).length,
      sent: accessible.filter((a) => isAttachmentInFolder(a, 'sent')).length,
      starred: accessible.filter((a) => isAttachmentInFolder(a, 'starred')).length,
      trash: accessible.filter((a) => isAttachmentInFolder(a, 'trash')).length,
    };
  }, [attachments, clientProjectIds, currentUser.role]);

  const handleQuickShare = async (e: React.MouseEvent, att: Attachment) => {
    e.stopPropagation();
    const normalizedUrl =
      !att.fileUrl || att.fileUrl.includes('/public/assets/aistudio/1000127391_10ae27f3.jpg')
        ? '/1000127391_10ae27f3.jpg'
        : att.fileUrl;
    const res = await triggerNativeShare({
      ...att,
      fileUrl: normalizedUrl,
    });
    if (res === 'unsupported') {
      onOpenViewer(att);
    }
  };

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
    const resolvedThumb =
      !att.fileUrl || att.fileUrl.includes('/public/assets/aistudio/1000127391_10ae27f3.jpg')
        ? '/1000127391_10ae27f3.jpg'
        : att.fileUrl;
    return (
      <div className={`relative ${sizeClass} rounded-xl bg-black border border-[#79C8E8]/30 overflow-hidden flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform`}>
        {att.category === 'photo' ? (
          <img 
            src={resolvedThumb} 
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
          <div className="w-full h-full bg-gradient-to-br from-red-950/70 to-[#0B192C] flex flex-col items-center justify-center p-1 text-center">
            <FileText className="w-5 h-5 text-red-400" />
            <span className="text-[8px] font-mono font-bold text-red-300 mt-0.5">PDF</span>
          </div>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-amber-950/70 to-[#0B192C] flex items-center justify-center">
            <FileCheck2 className="w-5 h-5 text-amber-400" />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* 1. UPPER FILTER BAR: Projects, Categories & Publish Action */}
      <div className="bg-[#112239] border border-[#79C8E8]/25 rounded-2xl p-4 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#0B192C] border border-[#DFC57B]/40 flex items-center justify-center text-[#DFC57B] shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <label className="block text-[11px] font-semibold text-[#A9DDF1] mb-0.5">
                {t.filterByProject}
              </label>
              <select
                value={selectedProjectId}
                onChange={(e) => {
                  setSelectedProjectId(e.target.value);
                  setGridActiveProjectId(null);
                }}
                className="bg-[#0B192C] border border-[#79C8E8]/30 text-white text-xs font-semibold rounded-xl px-3 py-1.5 focus:outline-none focus:border-[#DFC57B] cursor-pointer min-w-[230px]"
              >
                <option value="all">{t.allProjects} ({clientProjects.length})</option>
                {clientProjects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedCustomSection && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0B192C] border border-[#DFC57B]/40 text-[#DFC57B] text-xs font-semibold">
                <FolderOpen className="w-3.5 h-3.5" />
                <span>{selectedCustomSection}</span>
                <button
                  type="button"
                  onClick={() => setSelectedCustomSection(null)}
                  className="ms-1 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-[#0B192C] rounded-xl border border-[#79C8E8]/25">
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
                        ? 'bg-[#DFC57B] text-[#0B192C] font-bold shadow-md'
                        : 'text-slate-200 hover:text-white hover:bg-[#162942]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => onOpenUpload(selectedProjectId !== 'all' ? selectedProjectId : undefined)}
              className="flex items-center gap-2 py-2 px-4 rounded-xl bg-[#DFC57B] hover:bg-[#d4b663] text-[#0B192C] font-bold text-xs shadow-md transition-all cursor-pointer shrink-0"
              title={t.newAttachment}
            >
              <Plus className="w-4 h-4" />
              <span>{t.newAttachment}</span>
            </button>
          </div>

        </div>
      </div>

      {/* 3. LAYOUT MODEL 1: HORIZONTAL STREAM */}
      {layoutModel === 'horizontal' && (
        <div className="space-y-4">
          <div className="bg-[#112239] border border-[#79C8E8]/25 rounded-2xl p-3 shadow-md flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setActiveFolder('inbox')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeFolder === 'inbox'
                    ? 'bg-[#DFC57B] text-[#0B192C] font-bold shadow-md'
                    : 'bg-[#0B192C] text-slate-200 hover:bg-[#162942]'
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
                    ? 'bg-[#DFC57B] text-[#0B192C] font-bold shadow-md'
                    : 'bg-[#0B192C] text-slate-200 hover:bg-[#162942]'
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
                    ? 'bg-[#DFC57B] text-[#0B192C] font-bold shadow-md'
                    : 'bg-[#0B192C] text-slate-200 hover:bg-[#162942]'
                }`}
              >
                <Star className="w-4 h-4 text-amber-400" />
                <span>{t.starred}</span>
                <span className="px-1.5 py-0.2 rounded-full bg-black/20 text-[10px] font-mono">
                  {folderCounts.starred}
                </span>
              </button>

              <button
                onClick={() => setActiveFolder('trash')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeFolder === 'trash'
                    ? 'bg-[#E50914] text-white font-bold shadow-md'
                    : 'bg-[#0B192C] text-slate-200 hover:bg-[#162942]'
                }`}
              >
                <Trash2 className="w-4 h-4" />
                <span>{t.trash} (30j)</span>
                <span className="px-1.5 py-0.2 rounded-full bg-black/20 text-[10px] font-mono">
                  {folderCounts.trash}
                </span>
              </button>
            </div>

            <div className="relative w-full sm:max-w-xs">
              <Search className={`w-4 h-4 text-[#79C8E8] absolute top-1/2 -translate-y-1/2 ${lang === 'ar' ? 'right-3' : 'left-3'}`} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.searchPlaceholder}
                className={`w-full py-1.5 bg-[#0B192C] border border-[#79C8E8]/30 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-[#DFC57B] ${
                  lang === 'ar' ? 'pr-9 pl-3' : 'pl-9 pr-3'
                }`}
              />
            </div>
          </div>

          {/* List with Thumbnails and Visual Badges */}
          <div className="bg-[#112239] border border-[#79C8E8]/25 rounded-2xl shadow-xl overflow-hidden divide-y divide-[#79C8E8]/15">
            {filteredAttachments.length === 0 ? (
              <div className="py-16 text-center text-slate-400">
                <FileQuestion className="w-12 h-12 mx-auto mb-3 opacity-40 text-[#79C8E8]" />
                <p className="text-sm font-semibold text-white">{t.noAttachmentsFound}</p>
                <p className="text-xs text-[#A9DDF1] mt-1">{t.noAttachmentsSub}</p>
              </div>
            ) : (
              filteredAttachments.map((att) => (
                <div
                  key={att.id}
                  onClick={() => onOpenViewer(att)}
                  className="p-3 sm:p-4 hover:bg-[#162942]/80 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleStar(att.id);
                      }}
                      className="text-slate-400 hover:text-amber-400 transition-colors p-1"
                    >
                      <Star className={`w-4 h-4 ${att.starred ? 'text-amber-400 fill-amber-400' : ''}`} />
                    </button>

                    {/* Thumbnail Box */}
                    {renderThumbnailBox(att, "w-12 h-12 sm:w-14 sm:h-14")}

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-white text-sm truncate group-hover:text-[#DFC57B] transition-colors">
                          {att.title}
                        </span>
                        {renderVisualBadge(att.category, att.fileName)}
                        {att.customSection && (
                          <span className="px-2 py-0.5 rounded bg-[#0B192C] text-[#79C8E8] border border-[#79C8E8]/30 text-[10px]">
                            {att.customSection}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-300 truncate mt-1">
                        <span className="text-[#A9DDF1] font-medium">{att.projectName}</span>
                        <span className="mx-1.5">·</span>
                        <span>{att.fileName}</span>
                        {att.folder === 'trash' && (
                          <span className="ms-2 text-amber-300 font-semibold">
                            ({lang === 'ar' ? `متبقي ${getRemainingRecoveryDays(att.deletedAt)} يوم للاستعادة` : `${getRemainingRecoveryDays(att.deletedAt)}j restants`})
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 text-xs text-slate-300 self-end sm:self-center shrink-0">
                    <span className="font-mono text-[11px] text-[#DFC57B] font-semibold">
                      {formatBytes(att.fileSizeBytes)}
                    </span>
                    <span className="text-slate-400">
                      {new Date(att.uploadedAt).toLocaleDateString()}
                    </span>

                    {att.folder === 'trash' && onRestoreAttachment && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRestoreAttachment(att.id);
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold flex items-center gap-1"
                        title={lang === 'ar' ? 'استعادة الملف' : 'Restaurer'}
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>{lang === 'ar' ? 'استعادة' : 'Restaurer'}</span>
                      </button>
                    )}

                    <button
                      onClick={(e) => handleQuickShare(e, att)}
                      className="p-1.5 rounded-lg bg-[#0B192C] hover:bg-[#162942] text-[#79C8E8] border border-[#79C8E8]/30 transition-colors"
                      title={t.share}
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenViewer(att);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-[#0B192C] hover:bg-[#162942] text-white text-xs font-semibold border border-[#79C8E8]/30 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5 inline me-1 text-[#DFC57B]" />
                      <span>{lang === 'ar' ? 'معاينة' : 'Ouvrir'}</span>
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteAttachment(att.id);
                      }}
                      className="p-1.5 rounded-lg bg-[#0B192C] hover:bg-[#E50914]/25 text-slate-300 hover:text-[#E50914] border border-[#79C8E8]/25 transition-colors"
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

      {/* 4. LAYOUT MODEL 2: CLASSIC SPLIT SIDEBAR (Preserves the established sidebar structure + custom sections + 30-day trash) */}
      {layoutModel === 'sidebar' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          <div className={`${sidebarCollapsed ? 'md:col-span-1' : 'md:col-span-3'} space-y-4`}>
            <div className="bg-[#112239] border border-[#79C8E8]/25 rounded-2xl p-4 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                {!sidebarCollapsed && (
                  <h4 className="text-xs font-bold text-[#DFC57B] uppercase tracking-wider">
                    {lang === 'ar' ? 'صناديق البريد والمجلدات' : 'Dossiers & Boîtes'}
                  </h4>
                )}
                <button
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className="p-1.5 rounded-lg bg-[#0B192C] text-slate-300 hover:text-white cursor-pointer ms-auto"
                >
                  {sidebarCollapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
                </button>
              </div>

              <div className="space-y-1.5">
                {[
                  { id: 'inbox', label: t.inbox, icon: Inbox, count: folderCounts.inbox },
                  { id: 'sent', label: t.sent, icon: Send, count: folderCounts.sent },
                  { id: 'starred', label: t.starred, icon: Star, count: folderCounts.starred },
                  { id: 'trash', label: `${t.trash} (30j)`, icon: Trash2, count: folderCounts.trash },
                ].map((f) => {
                  const Icon = f.icon;
                  const isActive = activeFolder === f.id && !selectedCustomSection;
                  return (
                    <button
                      key={f.id}
                      onClick={() => {
                        setActiveFolder(f.id as any);
                        setSelectedCustomSection(null);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-[#DFC57B] text-[#0B192C] font-bold shadow-md'
                          : 'text-slate-200 hover:bg-[#162942] hover:text-white'
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

              {/* Custom Sections / Folders inside Sidebar */}
              {!sidebarCollapsed && (
                <div className="mt-5 pt-4 border-t border-[#79C8E8]/20">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-[#A9DDF1] uppercase tracking-wider">
                      {t.customFolders}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowNewFolderModal(true)}
                      className="p-1 rounded-lg bg-[#0B192C] text-[#DFC57B] hover:bg-[#162942] cursor-pointer"
                      title={t.addCustomFolder}
                    >
                      <FolderPlus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {customFolders.length === 0 ? (
                    <button
                      type="button"
                      onClick={() => setShowNewFolderModal(true)}
                      className="w-full py-2 px-3 rounded-xl border border-dashed border-[#79C8E8]/30 text-[11px] text-slate-300 hover:text-white hover:border-[#DFC57B] transition-colors text-start cursor-pointer"
                    >
                      + {t.addCustomFolder}
                    </button>
                  ) : (
                    <div className="space-y-1">
                      {customFolders.map((sec) => {
                        const isSecActive = selectedCustomSection === sec;
                        return (
                          <button
                            key={sec}
                            type="button"
                            onClick={() => setSelectedCustomSection(isSecActive ? null : sec)}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                              isSecActive
                                ? 'bg-[#79C8E8] text-[#0B192C] font-bold'
                                : 'text-slate-200 hover:bg-[#162942]'
                            }`}
                          >
                            <span className="flex items-center gap-2 truncate">
                              <FolderOpen className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">{sec}</span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className={`${sidebarCollapsed ? 'md:col-span-11' : 'md:col-span-9'}`}>
            <div className="bg-[#112239] border border-[#79C8E8]/25 rounded-2xl shadow-xl overflow-hidden divide-y divide-[#79C8E8]/15">
              {filteredAttachments.length === 0 ? (
                <div className="py-16 text-center text-slate-400">
                  <FileQuestion className="w-12 h-12 mx-auto mb-3 opacity-40 text-[#79C8E8]" />
                  <p className="text-sm font-semibold text-white">{t.noAttachmentsFound}</p>
                </div>
              ) : (
                filteredAttachments.map((att) => (
                  <div
                    key={att.id}
                    onClick={() => onOpenViewer(att)}
                    className="p-3 sm:p-4 hover:bg-[#162942]/80 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleStar(att.id);
                        }}
                        className="text-slate-400 hover:text-amber-400 transition-colors p-1"
                      >
                        <Star className={`w-4 h-4 ${att.starred ? 'text-amber-400 fill-amber-400' : ''}`} />
                      </button>

                      {renderThumbnailBox(att, "w-12 h-12")}

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-white text-sm truncate group-hover:text-[#DFC57B] transition-colors">
                            {att.title}
                          </span>
                          {renderVisualBadge(att.category, att.fileName)}
                          {att.customSection && (
                            <span className="px-2 py-0.5 rounded bg-[#0B192C] text-[#79C8E8] border border-[#79C8E8]/30 text-[10px]">
                              {att.customSection}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-300 truncate mt-1">
                          <span>{att.projectName}</span>
                          <span className="mx-1.5">·</span>
                          <span className="font-mono text-[#DFC57B]">{formatBytes(att.fileSizeBytes)}</span>
                          {att.folder === 'trash' && (
                            <span className="ms-2 text-amber-300 font-semibold">
                              ({lang === 'ar' ? `متبقي ${getRemainingRecoveryDays(att.deletedAt)} يوم` : `${getRemainingRecoveryDays(att.deletedAt)}j`})
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-300">
                      <span>{new Date(att.uploadedAt).toLocaleDateString()}</span>
                      {att.folder === 'trash' && onRestoreAttachment && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onRestoreAttachment(att.id);
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold flex items-center gap-1"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>{lang === 'ar' ? 'استعادة' : 'Restaurer'}</span>
                        </button>
                      )}
                      <button
                        onClick={(e) => handleQuickShare(e, att)}
                        className="p-1.5 rounded-lg bg-[#0B192C] hover:bg-[#162942] text-[#79C8E8] border border-[#79C8E8]/30"
                        title={t.share}
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenViewer(att);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-[#0B192C] hover:bg-[#162942] text-white text-xs font-semibold border border-[#79C8E8]/30"
                      >
                        {lang === 'ar' ? 'عرض' : 'Ouvrir'}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteAttachment(att.id);
                        }}
                        className="p-1.5 rounded-lg bg-[#0B192C] hover:bg-[#E50914]/25 text-slate-300 hover:text-[#E50914] border border-[#79C8E8]/25"
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
        </div>
      )}

      {/* 5. LAYOUT MODEL 3: INTERACTIVE PROJECT CARD GRID */}
      {layoutModel === 'grid' && (
        <div className="space-y-6">
          {gridActiveProjectId && (
            <div className="flex items-center justify-between bg-[#112239] border border-[#79C8E8]/30 p-3 rounded-2xl">
              <button
                onClick={() => setGridActiveProjectId(null)}
                className="flex items-center gap-2 text-xs font-bold text-[#DFC57B] hover:underline cursor-pointer"
              >
                <ArrowRight className={`w-4 h-4 ${lang === 'fr' ? 'rotate-180' : ''}`} />
                <span>{t.backToProjectsGrid}</span>
              </button>
              <span className="text-xs text-white font-bold">
                {clientProjects.find((p) => p.id === gridActiveProjectId)?.name}
              </span>
            </div>
          )}

          {!gridActiveProjectId && clientProjects.length > 0 && selectedProjectId === 'all' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {clientProjects.map((proj) => {
                const projFiles = attachments.filter((a) => a.projectId === proj.id && a.folder !== 'trash');
                const photosCount = projFiles.filter((a) => a.category === 'photo').length;
                const videosCount = projFiles.filter((a) => a.category === 'video').length;
                const docsCount = projFiles.filter((a) => a.category === 'document').length;
                const totalBytes = projFiles.reduce((acc, c) => acc + c.fileSizeBytes, 0);

                return (
                  <div
                    key={proj.id}
                    onClick={() => setGridActiveProjectId(proj.id)}
                    className="bg-[#112239] border border-[#79C8E8]/25 rounded-2xl p-5 shadow-xl hover:border-[#DFC57B] transition-all cursor-pointer flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full bg-[#0B192C] text-[#DFC57B] border border-[#DFC57B]/40">
                          {proj.type}
                        </span>
                        <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          <span>{lang === 'ar' ? 'نشط' : 'Actif'}</span>
                        </span>
                      </div>

                      <h4 className="font-bold text-base text-[#DFC57B] group-hover:text-white transition-colors mb-1">
                        {proj.name}
                      </h4>
                      <p className="text-xs text-slate-300 mb-4 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-[#79C8E8]" />
                        <span>{proj.clientName} · {proj.location}</span>
                      </p>

                      <div className="grid grid-cols-3 gap-2 bg-[#0B192C] p-2.5 rounded-xl border border-[#79C8E8]/20 mb-4 text-center text-xs">
                        <div className="flex flex-col items-center">
                          <ImageIcon className="w-4 h-4 text-cyan-400 mb-1" />
                          <span className="font-mono font-bold text-white">{photosCount}</span>
                          <span className="text-[10px] text-slate-400">{t.categoryPhoto}</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <Film className="w-4 h-4 text-purple-400 mb-1" />
                          <span className="font-mono font-bold text-white">{videosCount}</span>
                          <span className="text-[10px] text-slate-400">{t.categoryVideo}</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <FileText className="w-4 h-4 text-red-400 mb-1" />
                          <span className="font-mono font-bold text-white">{docsCount}</span>
                          <span className="text-[10px] text-slate-400">{t.categoryDocument}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-[#79C8E8]/20 flex items-center justify-between text-xs text-slate-300">
                      <span className="font-mono text-[#DFC57B] font-bold">{formatBytes(totalBytes)}</span>
                      <span className="flex items-center gap-1 font-semibold text-[#A9DDF1] group-hover:text-[#DFC57B]">
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
              <div className="col-span-full py-16 text-center text-slate-400 bg-[#112239] border border-[#79C8E8]/25 rounded-2xl">
                <FileQuestion className="w-12 h-12 mx-auto mb-3 opacity-40 text-[#79C8E8]" />
                <p className="text-sm font-semibold text-white">{t.noAttachmentsFound}</p>
              </div>
            ) : (
              filteredAttachments.map((att) => {
                const resolvedImg =
                  !att.fileUrl || att.fileUrl.includes('/public/assets/aistudio/1000127391_10ae27f3.jpg')
                    ? '/1000127391_10ae27f3.jpg'
                    : att.fileUrl;
                return (
                  <div
                    key={att.id}
                    onClick={() => onOpenViewer(att)}
                    className="bg-[#112239] border border-[#79C8E8]/25 rounded-2xl p-4 shadow-xl hover:border-[#DFC57B] transition-all cursor-pointer flex flex-col justify-between group relative"
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
                          className="text-slate-400 hover:text-amber-400 p-1"
                        >
                          <Star className={`w-4 h-4 ${att.starred ? 'text-amber-400 fill-amber-400' : ''}`} />
                        </button>
                      </div>

                      <h4 className="font-bold text-sm text-white group-hover:text-[#DFC57B] transition-colors line-clamp-1 mb-1">
                        {att.title}
                      </h4>
                      <p className="text-xs text-[#A9DDF1] mb-3 line-clamp-1">
                        {att.projectName}
                      </p>

                      <div className="w-full h-36 rounded-xl bg-black border border-[#79C8E8]/25 overflow-hidden flex items-center justify-center mb-3 relative">
                        {att.category === 'photo' ? (
                          <img 
                            src={resolvedImg} 
                            alt={att.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
                          />
                        ) : att.category === 'video' || att.fileName.endsWith('.mp4') || att.fileName.endsWith('.mov') || att.fileName.endsWith('.avi') ? (
                          <div className="w-full h-full bg-gradient-to-br from-purple-950 via-black to-[#0B192C] flex flex-col items-center justify-center text-purple-400 relative">
                            <Film className="w-10 h-10 mb-1" />
                            <span className="text-[10px] font-mono font-bold bg-black/60 px-2 py-0.5 rounded text-purple-300">
                              VIDEO · 1080p FULL HD
                            </span>
                            <span className="absolute bottom-2 right-2 text-[10px] font-mono text-slate-300 bg-black/70 px-1.5 rounded">
                              {formatBytes(att.fileSizeBytes)}
                            </span>
                          </div>
                        ) : att.category === 'document' || att.fileName.endsWith('.pdf') ? (
                          <div className="w-full h-full bg-gradient-to-br from-red-950/60 via-[#112239] to-black flex flex-col items-center justify-center p-3 text-center">
                            <FileText className="w-10 h-10 text-red-400 mb-1" />
                            <span className="text-xs font-bold text-white line-clamp-1">{att.fileName}</span>
                            <span className="text-[10px] font-mono text-red-300 mt-1">DOCUMENT PDF</span>
                          </div>
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-amber-950/50 via-[#112239] to-black p-4 flex flex-col justify-center">
                            <FileCheck2 className="w-8 h-8 text-amber-400 mb-1" />
                            <p className="text-xs text-slate-200 line-clamp-2 leading-relaxed">
                              {att.notes || (lang === 'ar' ? 'مذكرة تقنية مؤرشفة.' : 'Note technique archivée.')}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-[#79C8E8]/20 flex items-center justify-between text-xs text-slate-300">
                      <span className="font-mono text-[#DFC57B] font-bold">{formatBytes(att.fileSizeBytes)}</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={(e) => handleQuickShare(e, att)}
                          className="p-1.5 rounded bg-[#0B192C] hover:bg-[#162942] text-[#79C8E8]"
                          title={t.share}
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenViewer(att);
                          }}
                          className="px-2.5 py-1 rounded bg-[#0B192C] hover:bg-[#162942] text-white text-xs font-semibold"
                        >
                          {lang === 'ar' ? 'معاينة' : 'Ouvrir'}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteAttachment(att.id);
                          }}
                          className="p-1 rounded bg-[#0B192C] hover:bg-[#E50914]/25 text-slate-300 hover:text-[#E50914]"
                          title={t.deleteAttachment}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* 6. LAYOUT MODEL 4: TIMELINE DOSSIER */}
      {layoutModel === 'timeline' && (
        <div className="bg-[#112239] border border-[#79C8E8]/25 rounded-2xl p-6 shadow-xl">
          <div className="mb-6 pb-4 border-b border-[#79C8E8]/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#DFC57B]" />
              <h4 className="text-sm font-bold text-[#DFC57B] uppercase tracking-wider">
                {t.layoutTimeline}
              </h4>
            </div>
            <span className="text-xs text-[#A9DDF1] font-mono">
              {filteredAttachments.length} {lang === 'ar' ? 'أحداث موثقة' : 'événements archivés'}
            </span>
          </div>

          {filteredAttachments.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <FileQuestion className="w-12 h-12 mx-auto mb-3 opacity-40 text-[#79C8E8]" />
              <p className="text-sm font-semibold text-white">{t.noAttachmentsFound}</p>
            </div>
          ) : (
            <div className="relative border-s border-[#79C8E8]/30 ms-4 space-y-8">
              {filteredAttachments.map((att) => (
                <div key={att.id} className="relative ps-6 group cursor-pointer" onClick={() => onOpenViewer(att)}>
                  <span className="absolute -start-3 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-[#0B192C] border-2 border-[#DFC57B] text-[#DFC57B] shadow-md group-hover:scale-125 transition-transform">
                    {renderThumbnailBox(att, "w-4 h-4 rounded-full")}
                  </span>

                  <div className="bg-[#0B192C] border border-[#79C8E8]/25 group-hover:border-[#DFC57B] rounded-2xl p-4 transition-all">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-3">
                        {renderThumbnailBox(att, "w-10 h-10")}
                        <div>
                          <span className="font-bold text-sm text-white group-hover:text-[#DFC57B] transition-colors block">
                            {att.title}
                          </span>
                          <span className="text-xs text-[#A9DDF1]">{att.projectName}</span>
                        </div>
                        {renderVisualBadge(att.category, att.fileName)}
                      </div>
                      <span className="text-xs font-mono text-slate-300">
                        {new Date(att.uploadedAt).toLocaleString()}
                      </span>
                    </div>

                    {att.notes && (
                      <p className="text-xs text-slate-200 bg-[#112239] p-2.5 rounded-xl border border-[#79C8E8]/20 my-3">
                        {att.notes}
                      </p>
                    )}

                    <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-[#79C8E8]/15">
                      <span>{t.uploadedBy}: <strong className="text-[#DFC57B]">{att.senderName}</strong></span>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-white">{formatBytes(att.fileSizeBytes)}</span>
                        <button
                          onClick={(e) => handleQuickShare(e, att)}
                          className="text-[#79C8E8] hover:text-white p-1"
                          title={t.share}
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteAttachment(att.id);
                          }}
                          className="text-slate-400 hover:text-[#E50914] p-1"
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

      {/* 7. LAYOUT MODEL 5: COMPACT DATA TABLE */}
      {layoutModel === 'compact' && (
        <div className="bg-[#112239] border border-[#79C8E8]/25 rounded-2xl shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-start">
              <thead className="bg-[#0B192C] border-b border-[#79C8E8]/25 text-[#DFC57B] uppercase font-semibold">
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
              <tbody className="divide-y divide-[#79C8E8]/15">
                {filteredAttachments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      {t.noAttachmentsFound}
                    </td>
                  </tr>
                ) : (
                  filteredAttachments.map((att) => (
                    <tr
                      key={att.id}
                      onClick={() => onOpenViewer(att)}
                      className="hover:bg-[#162942]/70 transition-colors cursor-pointer group"
                    >
                      <td className="p-3 ps-4 font-semibold text-white group-hover:text-[#DFC57B] transition-colors truncate max-w-[240px]">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleStar(att.id);
                            }}
                            className="text-slate-400 hover:text-amber-400"
                          >
                            <Star className={`w-3.5 h-3.5 ${att.starred ? 'text-amber-400 fill-amber-400' : ''}`} />
                          </button>
                          {renderThumbnailBox(att, "w-8 h-8 rounded-lg")}
                          <span className="truncate">{att.title}</span>
                        </div>
                      </td>
                      <td className="p-3 text-slate-200 truncate max-w-[160px]">{att.projectName}</td>
                      <td className="p-3">
                        {renderVisualBadge(att.category, att.fileName)}
                      </td>
                      <td className="p-3 font-mono text-[#DFC57B] font-semibold">{formatBytes(att.fileSizeBytes)}</td>
                      <td className="p-3 text-slate-300 truncate max-w-[140px]">{att.senderName}</td>
                      <td className="p-3 text-slate-400 font-mono">{new Date(att.uploadedAt).toLocaleDateString()}</td>
                      <td className="p-3 pe-4 text-end">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={(e) => handleQuickShare(e, att)}
                            className="p-1.5 rounded bg-[#0B192C] hover:bg-[#162942] text-[#79C8E8]"
                            title={t.share}
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenViewer(att);
                            }}
                            className="px-2.5 py-1 rounded bg-[#0B192C] hover:bg-[#162942] text-white text-xs font-semibold"
                          >
                            {lang === 'ar' ? 'معاينة' : 'Ouvrir'}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteAttachment(att.id);
                            }}
                            className="p-1 rounded bg-[#0B192C] hover:bg-[#E50914]/25 text-slate-300 hover:text-[#E50914]"
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

      {/* NEW CUSTOM SECTION / FOLDER MODAL */}
      {showNewFolderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-[#112239] border border-[#79C8E8]/30 rounded-2xl p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold text-[#DFC57B] text-sm flex items-center gap-2">
                <FolderPlus className="w-4 h-4 text-[#79C8E8]" />
                <span>{t.addCustomFolder}</span>
              </h4>
              <button
                type="button"
                onClick={() => setShowNewFolderModal(false)}
                className="p-1 rounded bg-[#0B192C] text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateCustomFolder} className="space-y-3">
              <input
                type="text"
                required
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder={t.folderNamePlaceholder}
                className="w-full px-3 py-2 rounded-xl bg-[#0B192C] border border-[#79C8E8]/30 text-white text-xs focus:border-[#DFC57B] focus:outline-none"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewFolderModal(false)}
                  className="px-3 py-1.5 rounded-xl bg-[#0B192C] text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-[#DFC57B] text-[#0B192C] text-xs font-bold cursor-pointer"
                >
                  {t.createFolderBtn}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
