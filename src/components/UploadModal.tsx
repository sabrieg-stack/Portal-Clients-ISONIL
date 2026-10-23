import React, { useState, useRef } from 'react';
import { 
  X, 
  Upload, 
  CheckCircle2, 
  FileUp,
  Image as ImageIcon,
  Video,
  FileText,
  FileQuestion,
  Sparkles
} from 'lucide-react';
import { Attachment, AttachmentCategory, Language, Project, User } from '../types';
import { translations } from '../i18n/translations';

interface UploadModalProps {
  lang: Language;
  currentUser: User;
  projects: Project[];
  preselectedProjectId?: string;
  onClose: () => void;
  onUploadSuccess: (newAttachment: Attachment) => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  lang,
  currentUser,
  projects,
  preselectedProjectId,
  onClose,
  onUploadSuccess,
}) => {
  const t = translations[lang];

  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    preselectedProjectId || (projects[0]?.id || '')
  );
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<AttachmentCategory>('photo');
  const [notes, setNotes] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selected = Array.from(e.target.files);
      setFiles(selected);
      if (!title && selected[0]) {
        const cleanName = selected[0].name.replace(/\.[^/.]+$/, '').replace(/[_|-]/g, ' ');
        setTitle(cleanName);
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const selected = Array.from(e.dataTransfer.files);
      setFiles(selected);
      if (!title && selected[0]) {
        const cleanName = selected[0].name.replace(/\.[^/.]+$/, '').replace(/[_|-]/g, ' ');
        setTitle(cleanName);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;

    const targetProject = projects.find((p) => p.id === selectedProjectId) || {
      id: 'general',
      name: 'Général / ISONIL Maroc',
      clientId: currentUser.id,
      clientName: currentUser.companyName,
    };

    setIsUploading(true);
    setUploadProgress(5);

    let current = 5;
    const interval = setInterval(() => {
      current += Math.floor(Math.random() * 14) + 12;
      if (current >= 100) {
        current = 100;
        setUploadProgress(100);
        clearInterval(interval);

        setTimeout(() => {
          setIsUploading(false);
          setUploadSuccess(true);

          const uploadedFile = files[0];
          const newAttachment: Attachment = {
            id: `att-${Date.now()}`,
            projectId: targetProject.id,
            projectName: targetProject.name,
            clientId: targetProject.clientId,
            senderType: currentUser.role,
            senderName: currentUser.role === 'admin' ? 'Direction ISONIL Maroc' : currentUser.fullName,
            title,
            category,
            fileUrl: uploadedFile ? URL.createObjectURL(uploadedFile) : '/public/assets/aistudio/1000127391_10ae27f3.jpg',
            fileName: uploadedFile ? uploadedFile.name : `ISONIL_${title.replace(/\s+/g, '_')}.pdf`,
            fileSizeBytes: uploadedFile ? uploadedFile.size : 8500000,
            uploadedAt: new Date().toISOString(),
            folder: currentUser.role === 'admin' ? 'inbox' : 'sent',
            starred: false,
            notes,
            previewType: category === 'photo' ? 'image' : category === 'video' ? 'video' : category === 'note' ? 'text' : 'pdf',
            downloadCount: 0,
          };

          onUploadSuccess(newAttachment);
          setTimeout(() => {
            onClose();
          }, 1200);
        }, 400);
      } else {
        setUploadProgress(current);
      }
    }, 150);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-xl bg-[#161b22] border border-[#30363d] rounded-2xl shadow-2xl overflow-hidden my-6">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#30363d] bg-[#0d1117] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#21262d] theme-border border theme-text flex items-center justify-center">
              <FileUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">{t.uploadModalTitle}</h3>
              <p className="text-xs text-slate-400">{t.unlimitedStorageBadge}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isUploading}
            className="p-1.5 rounded-lg bg-[#21262d] text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 sm:p-6">
          {uploadSuccess ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-emerald-950/80 border border-emerald-700 text-emerald-400 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <h4 className="text-lg font-bold text-white mb-2">{t.uploadSuccess}</h4>
              <p className="text-xs text-slate-400">{title}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Project select */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {t.selectProject} *
                </label>
                <select
                  disabled={isUploading}
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#0d1117] border border-[#30363d] text-slate-100 text-xs focus:border-theme focus:outline-none"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {t.attachmentTitle} *
                </label>
                <input
                  type="text"
                  required
                  disabled={isUploading}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t.attachmentTitlePlaceholder}
                  className="w-full px-3 py-2 rounded-xl bg-[#0d1117] border border-[#30363d] text-slate-100 text-xs focus:border-theme focus:outline-none placeholder:text-slate-600"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {t.attachmentCategory}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'photo', label: t.categoryPhoto, icon: ImageIcon },
                    { id: 'video', label: t.categoryVideo, icon: Video },
                    { id: 'document', label: t.categoryDocument, icon: FileText },
                    { id: 'note', label: t.categoryNote, icon: FileQuestion },
                  ].map((c) => {
                    const Icon = c.icon;
                    const isSelected = category === c.id;
                    return (
                      <button
                        type="button"
                        key={c.id}
                        disabled={isUploading}
                        onClick={() => setCategory(c.id as AttachmentCategory)}
                        className={`flex items-center gap-2 p-2.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                          isSelected
                            ? 'theme-btn font-bold shadow-md'
                            : 'bg-[#0d1117] border-[#30363d] text-slate-300 hover:bg-[#21262d]'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{c.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Drag & Drop Area */}
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-[#30363d] hover:border-theme rounded-2xl p-6 text-center cursor-pointer transition-colors bg-[#0d1117]/60 group"
                >
                  <div className="w-12 h-12 rounded-2xl bg-[#161b22] border border-[#30363d] theme-text flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                    <Upload className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-semibold text-slate-200 mb-1">{t.dropZoneText}</p>
                  <p className="text-[11px] text-slate-400">{t.dropZoneSubtext}</p>
                </div>

                {files.length > 0 && (
                  <div className="mt-2.5 p-2 rounded-xl bg-[#0d1117] border border-[#30363d] flex items-center justify-between text-xs">
                    <span className="text-slate-300 truncate max-w-xs">{files[0].name}</span>
                    <span className="theme-text font-mono text-[11px] font-bold">
                      {(files[0].size / (1024 * 1024)).toFixed(2)} MB
                    </span>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {t.attachmentNotes}
                </label>
                <textarea
                  rows={2}
                  disabled={isUploading}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t.attachmentNotesPlaceholder}
                  className="w-full px-3 py-2 rounded-xl bg-[#0d1117] border border-[#30363d] text-slate-100 text-xs focus:border-theme focus:outline-none resize-none placeholder:text-slate-600"
                />
              </div>

              {/* Upload Progress Bar */}
              {isUploading && (
                <div className="p-3 bg-[#0d1117] rounded-xl border border-[#30363d] space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="theme-text">{t.uploadingInProgress}</span>
                    <span className="font-mono text-slate-200">{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div 
                      className="h-full bg-theme transition-all duration-150"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex justify-end gap-2 pt-2 border-t border-[#30363d]">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isUploading}
                  className="px-4 py-2 rounded-xl bg-[#21262d] hover:bg-[#30363d] text-slate-300 text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={isUploading || !title}
                  className="px-6 py-2.5 rounded-xl theme-btn font-bold text-xs cursor-pointer disabled:opacity-50 shadow-md transition-all"
                >
                  {isUploading ? t.uploadingInProgress : t.startUpload}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
