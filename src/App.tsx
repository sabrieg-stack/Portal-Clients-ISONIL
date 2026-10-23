import React, { useState, useEffect } from 'react';
import { Language, User, Project, Attachment, PendingRegistration, LayoutModel, ThemeColor, NotificationItem, BackupSnapshot } from './types';
import { translations } from './i18n/translations';
import { 
  loadStoredUsers, 
  saveStoredUsers, 
  loadStoredProjects, 
  saveStoredProjects, 
  loadStoredAttachments, 
  saveStoredAttachments, 
  loadStoredPending, 
  saveStoredPending,
  loadStoredNotifications,
  saveStoredNotifications,
  loadStoredBackups,
  saveStoredBackups,
  loadStoredTheme,
  saveStoredTheme,
  loadStoredLayout,
  saveStoredLayout
} from './data/mockData';
import { CinematicWelcome } from './components/CinematicWelcome';
import { Header } from './components/Header';
import { AuthModal } from './components/AuthModal';
import { MailboxWorkspace } from './components/MailboxWorkspace';
import { AdminDashboard } from './components/AdminDashboard';
import { AttachmentViewerModal } from './components/AttachmentViewerModal';
import { UploadModal } from './components/UploadModal';

const THEME_HEX: Record<ThemeColor, { accent: string; hover: string; glow: string; border: string; contrast: string }> = {
  beige: { accent: '#d4b996', hover: '#c5a882', glow: 'rgba(212, 185, 150, 0.25)', border: 'rgba(212, 185, 150, 0.45)', contrast: '#0d1117' },
  silver: { accent: '#cbd5e1', hover: '#94a3b8', glow: 'rgba(203, 213, 225, 0.25)', border: 'rgba(203, 213, 225, 0.45)', contrast: '#0f172a' },
  bronze: { accent: '#f59e0b', hover: '#d97706', glow: 'rgba(245, 158, 11, 0.25)', border: 'rgba(245, 158, 11, 0.45)', contrast: '#0f172a' },
  navy: { accent: '#38bdf8', hover: '#0284c7', glow: 'rgba(56, 189, 248, 0.25)', border: 'rgba(56, 189, 248, 0.45)', contrast: '#0f172a' },
  emerald: { accent: '#10b981', hover: '#059669', glow: 'rgba(16, 185, 129, 0.25)', border: 'rgba(16, 185, 129, 0.45)', contrast: '#ffffff' },
};

export default function App() {
  // 1. Language state
  const [lang, setLang] = useState<Language>('ar');

  // 2. Cinematic Welcome Splash
  const [showCinematic, setShowCinematic] = useState<boolean>(true);

  // 3. Layout Model (5 actual design choices user can switch between)
  const [layoutModel, setLayoutModel] = useState<LayoutModel>(() => loadStoredLayout());

  // 4. Color Theme (100% dynamic CSS variable synchronization)
  const [themeColor, setThemeColor] = useState<ThemeColor>(() => loadStoredTheme());

  // 5. Clean Core Data Stores
  const [users, setUsers] = useState<User[]>(() => loadStoredUsers());
  const [projects, setProjects] = useState<Project[]>(() => loadStoredProjects());
  const [attachments, setAttachments] = useState<Attachment[]>(() => loadStoredAttachments());
  const [pendingRegistrations, setPendingRegistrations] = useState<PendingRegistration[]>(() => loadStoredPending());
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => loadStoredNotifications());
  const [backups, setBackups] = useState<BackupSnapshot[]>(() => loadStoredBackups());

  // 6. Current Session
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const loaded = loadStoredUsers();
    return loaded.find((u) => u.role === 'admin') || null;
  });

  // 7. Admin active sub-view
  const [activeAdminSubView, setActiveAdminSubView] = useState<'dashboard' | 'workspace'>('workspace');

  // 8. Modals
  const [selectedAttachmentForViewer, setSelectedAttachmentForViewer] = useState<Attachment | null>(null);
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [uploadPreselectedProjectId, setUploadPreselectedProjectId] = useState<string | undefined>(undefined);
  const [showAuthModalManually, setShowAuthModalManually] = useState<boolean>(false);

  // Sync document direction and lang
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);

  // Sync active theme color attribute & CSS custom variables dynamically
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', themeColor);
    const themeDef = THEME_HEX[themeColor] || THEME_HEX.beige;
    document.documentElement.style.setProperty('--theme-accent', themeDef.accent);
    document.documentElement.style.setProperty('--theme-accent-hover', themeDef.hover);
    document.documentElement.style.setProperty('--theme-accent-glow', themeDef.glow);
    document.documentElement.style.setProperty('--theme-accent-border', themeDef.border);
    document.documentElement.style.setProperty('--theme-text-contrast', themeDef.contrast);
    saveStoredTheme(themeColor);
  }, [themeColor]);

  // Persist layout model
  useEffect(() => {
    saveStoredLayout(layoutModel);
  }, [layoutModel]);

  // Persist data stores
  useEffect(() => {
    saveStoredUsers(users);
  }, [users]);

  useEffect(() => {
    saveStoredProjects(projects);
  }, [projects]);

  useEffect(() => {
    saveStoredAttachments(attachments);
  }, [attachments]);

  useEffect(() => {
    saveStoredPending(pendingRegistrations);
  }, [pendingRegistrations]);

  useEffect(() => {
    saveStoredNotifications(notifications);
  }, [notifications]);

  useEffect(() => {
    saveStoredBackups(backups);
  }, [backups]);

  // Handler: Language switch
  const handleLanguageChange = (newLang: Language) => {
    setLang(newLang);
  };

  // Handler: Login Success
  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setShowAuthModalManually(false);
  };

  // Handler: Logout
  const handleLogout = () => {
    setCurrentUser(null);
    setShowAuthModalManually(true);
  };

  // Handler: Update User Password (from Forgot Password flow)
  const handleUpdateUserPassword = (email: string, newPass: string) => {
    const emailTrim = email.trim().toLowerCase();
    setUsers((prev) => {
      const exists = prev.some((u) => u.email.toLowerCase() === emailTrim);
      if (exists) {
        return prev.map((u) => (u.email.toLowerCase() === emailTrim ? { ...u, password: newPass } : u));
      } else {
        // Create client user record with updated password if not registered yet
        const newUser: User = {
          id: `client-${Date.now()}`,
          fullName: emailTrim.split('@')[0],
          companyName: 'Client ISONIL',
          email: emailTrim,
          phone: '+212600000000',
          role: 'client',
          status: 'active',
          createdAt: new Date().toISOString(),
          assignedProjectIds: [],
          password: newPass,
        };
        return [...prev, newUser];
      }
    });

    // Push notification
    const notif: NotificationItem = {
      id: `notif-${Date.now()}`,
      title: lang === 'ar' ? 'تم تحديث كلمة المرور' : 'Mot de passe mis à jour',
      message: lang === 'ar' 
        ? `تم بنجاح تعيين كلمة مرور جديدة لحسابكم المرتبط بالبريد: ${emailTrim}.`
        : `Mot de passe réinitialisé pour ${emailTrim}.`,
      date: new Date().toISOString(),
      read: false,
      type: 'account',
    };
    setNotifications((prev) => [notif, ...prev]);
  };

  // Handler: Request New Account
  const handleRequestAccount = (data: Omit<PendingRegistration, 'id' | 'requestedAt'>) => {
    const newPending: PendingRegistration = {
      id: `pend-${Date.now()}`,
      requestedAt: new Date().toISOString(),
      ...data,
    };
    setPendingRegistrations((prev) => [newPending, ...prev]);

    // Push notification for admin
    const notif: NotificationItem = {
      id: `notif-${Date.now()}`,
      title: lang === 'ar' ? `طلب فتح حساب جديد: ${data.companyName}` : `Nouvelle demande d'accès: ${data.companyName}`,
      message: lang === 'ar' 
        ? `قام المسؤول ${data.fullName} بطلب تسجيل حساب لشركة ${data.companyName}. يرجى مراجعة الطلب والموافقة عليه.`
        : `Demande formulée par ${data.fullName} pour l'entreprise ${data.companyName}.`,
      date: new Date().toISOString(),
      read: false,
      type: 'account',
    };
    setNotifications((prev) => [notif, ...prev]);
  };

  // Handler: Create Project
  const handleCreateProject = (projectData: Omit<Project, 'id' | 'totalStorageBytes'>) => {
    const newProject: Project = {
      id: `proj-${Date.now()}`,
      totalStorageBytes: 0,
      ...projectData,
    };
    setProjects((prev) => [newProject, ...prev]);

    const notif: NotificationItem = {
      id: `notif-${Date.now()}`,
      title: lang === 'ar' ? `مشروع جديد: ${newProject.name}` : `Nouveau projet créé: ${newProject.name}`,
      message: lang === 'ar' 
        ? `تم تدشين المشروع بنجاح في الموقع: ${newProject.location}.`
        : `Projet initialisé sur le site: ${newProject.location}.`,
      date: new Date().toISOString(),
      read: false,
      type: 'project',
      targetProjectId: newProject.id,
    };
    setNotifications((prev) => [notif, ...prev]);
  };

  // Handler: Admin approves account
  const handleApproveAccount = (registrationId: string) => {
    const targetPending = pendingRegistrations.find((p) => p.id === registrationId);
    if (!targetPending) return;

    const newClientId = `client-${Date.now()}`;
    const newProjectId = `proj-${Date.now()}`;

    const newProject: Project = {
      id: newProjectId,
      clientId: newClientId,
      clientName: targetPending.companyName,
      name: `Projet ${targetPending.companyName}`,
      location: targetPending.city || 'Maroc',
      type: targetPending.projectType,
      status: 'in_progress',
      startDate: new Date().toISOString().split('T')[0],
      completionPercentage: 0,
      totalStorageBytes: 0,
      description: `Travaux d'isolation calorifuge pour ${targetPending.companyName}`,
    };

    const newClientUser: User = {
      id: newClientId,
      fullName: targetPending.fullName,
      companyName: targetPending.companyName,
      email: targetPending.email,
      phone: targetPending.phone,
      role: 'client',
      status: 'active',
      createdAt: new Date().toISOString(),
      assignedProjectIds: [newProjectId],
      city: targetPending.city,
      notes: targetPending.notes,
    };

    setUsers((prev) => [...prev, newClientUser]);
    setProjects((prev) => [...prev, newProject]);
    setPendingRegistrations((prev) => prev.filter((p) => p.id !== registrationId));

    const notif: NotificationItem = {
      id: `notif-${Date.now()}`,
      title: lang === 'ar' ? `تم اعتماد وتفعيل حساب: ${targetPending.companyName}` : `Compte activé: ${targetPending.companyName}`,
      message: lang === 'ar' 
        ? `تم إنشاء مساحة العمل المخصصة وتعيين المشروع الأولي بنجاح.`
        : `Espace client dédié configuré avec succès.`,
      date: new Date().toISOString(),
      read: false,
      type: 'account',
    };
    setNotifications((prev) => [notif, ...prev]);
  };

  // Handler: Admin rejects account
  const handleRejectAccount = (registrationId: string) => {
    setPendingRegistrations((prev) => prev.filter((p) => p.id !== registrationId));
  };

  // Handler: Upload/Publish new attachment
  const handleUploadSuccess = (newAttachment: Attachment) => {
    setAttachments((prev) => [newAttachment, ...prev]);

    const notif: NotificationItem = {
      id: `notif-${Date.now()}`,
      title: lang === 'ar' ? `نشر مرفق جديد: ${newAttachment.title}` : `Nouveau document publié: ${newAttachment.title}`,
      message: lang === 'ar'
        ? `تم نشر ملف جديد (${newAttachment.category}) بواسطة ${newAttachment.senderName} لمشروع ${newAttachment.projectName}.`
        : `Nouveau fichier (${newAttachment.category}) publié par ${newAttachment.senderName} pour le projet ${newAttachment.projectName}.`,
      date: new Date().toISOString(),
      read: false,
      type: 'attachment',
      targetAttachmentId: newAttachment.id,
      targetProjectId: newAttachment.projectId,
    };
    setNotifications((prev) => [notif, ...prev]);
  };

  // Handler: Toggle Star
  const handleToggleStar = (attachmentId: string) => {
    setAttachments((prev) =>
      prev.map((att) => (att.id === attachmentId ? { ...att, starred: !att.starred } : att))
    );
  };

  // Handler: Delete attachment (زر حذف المرفق)
  const handleDeleteAttachment = (attachmentId: string) => {
    const target = attachments.find((a) => a.id === attachmentId);
    setAttachments((prev) => prev.filter((att) => att.id !== attachmentId));

    if (selectedAttachmentForViewer?.id === attachmentId) {
      setSelectedAttachmentForViewer(null);
    }

    const notif: NotificationItem = {
      id: `notif-${Date.now()}`,
      title: lang === 'ar' ? 'تم حذف المرفق' : 'Pièce jointe supprimée',
      message: lang === 'ar' 
        ? `تم حذف ${target?.title || 'المرفق'} بنجاح من الأرشيف الرقمي.`
        : `Document supprimé avec succès de l'archive.`,
      date: new Date().toISOString(),
      read: false,
      type: 'system',
    };
    setNotifications((prev) => [notif, ...prev]);
  };

  // Handler: Forward attachment
  const handleForwardAttachment = (attachmentId: string, email: string, note: string) => {
    setAttachments((prev) =>
      prev.map((att) => {
        if (att.id === attachmentId) {
          return {
            ...att,
            notes: (att.notes ? att.notes + '\n\n' : '') + `[Transféré à: ${email}] ${note}`,
          };
        }
        return att;
      })
    );
  };

  // Handler: Notifications actions
  const handleMarkAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleSelectNotification = (notif: NotificationItem) => {
    setNotifications((prev) => prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n)));

    if (notif.targetAttachmentId) {
      const att = attachments.find((a) => a.id === notif.targetAttachmentId);
      if (att) {
        setSelectedAttachmentForViewer(att);
        return;
      }
    }

    if (notif.targetProjectId) {
      setActiveAdminSubView('workspace');
    }
  };

  // Handler: Backup & Restore
  const handleCreateBackup = (note?: string) => {
    const payload = JSON.stringify({
      users,
      projects,
      attachments,
      pendingRegistrations,
    });

    const now = new Date();
    const dateFormatted = now.toLocaleDateString(lang === 'ar' ? 'ar-MA' : 'fr-MA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const newSnapshot: BackupSnapshot = {
      id: `backup-${Date.now()}`,
      timestamp: now.toISOString(),
      dateFormatted,
      sizeBytes: payload.length,
      projectsCount: projects.length,
      attachmentsCount: attachments.length,
      usersCount: users.length,
      note: note || (lang === 'ar' ? 'نسخة احتياطية يدوية' : 'Sauvegarde manuelle'),
      payloadJson: payload,
    };

    setBackups((prev) => [newSnapshot, ...prev]);

    const notif: NotificationItem = {
      id: `notif-${Date.now()}`,
      title: lang === 'ar' ? 'تم إنشاء نسخة احتياطية' : 'Point de restauration créé',
      message: lang === 'ar' 
        ? `تم بنجاح حفظ وتأمين كافة بيانات المشاريع والمرفقات المؤرخة في ${dateFormatted}.`
        : `Sauvegarde système complète enregistrée avec succès.`,
      date: new Date().toISOString(),
      read: false,
      type: 'system',
    };
    setNotifications((prev) => [notif, ...prev]);
  };

  const handleRestoreBackup = (snapshotId: string) => {
    const snap = backups.find((b) => b.id === snapshotId);
    if (!snap) return;

    try {
      const parsed = JSON.parse(snap.payloadJson);
      if (parsed.users) setUsers(parsed.users);
      if (parsed.projects) setProjects(parsed.projects);
      if (parsed.attachments) setAttachments(parsed.attachments);
      if (parsed.pendingRegistrations) setPendingRegistrations(parsed.pendingRegistrations);

      const notif: NotificationItem = {
        id: `notif-${Date.now()}`,
        title: lang === 'ar' ? 'تمت استعادة البيانات بنجاح' : 'Données restaurées avec succès',
        message: lang === 'ar'
          ? `تم استدعاء النسخة المؤرخة ${snap.dateFormatted} واسترجاع جميع السجلات.`
          : `Restauration complète effectuée selon le point ${snap.dateFormatted}.`,
        date: new Date().toISOString(),
        read: false,
        type: 'system',
      };
      setNotifications((prev) => [notif, ...prev]);
    } catch (e) {
      console.error('Failed to parse backup JSON', e);
    }
  };

  // Filter projects belonging to current user
  const clientProjects = React.useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'admin') return projects;
    return projects.filter((p) => currentUser.assignedProjectIds.includes(p.id));
  }, [currentUser, projects]);

  return (
    <div className="min-h-screen bg-[#0d1117] text-slate-100 flex flex-col font-sans selection:bg-theme selection:text-slate-950">
      {/* 1. CINEMATIC WELCOME SCREEN */}
      {showCinematic && (
        <CinematicWelcome
          lang={lang}
          onFinish={() => setShowCinematic(false)}
        />
      )}

      {/* 2. CORPORATE HEADER */}
      <Header
        lang={lang}
        onLanguageChange={handleLanguageChange}
        currentUser={currentUser}
        onLogout={handleLogout}
        onShowAuthModal={() => setShowAuthModalManually(true)}
        canGoBack={currentUser !== null && currentUser.role === 'admin' && activeAdminSubView === 'dashboard'}
        onBack={() => setActiveAdminSubView('workspace')}
        layoutModel={layoutModel}
        onLayoutChange={setLayoutModel}
        themeColor={themeColor}
        onThemeChange={setThemeColor}
        notifications={notifications}
        onMarkAllNotificationsRead={handleMarkAllNotificationsRead}
        onSelectNotification={handleSelectNotification}
      />

      {/* 3. MAIN WORKSPACE / AUTH VIEW */}
      <main className="flex-1">
        {!currentUser || showAuthModalManually ? (
          <AuthModal
            lang={lang}
            users={users}
            onLoginSuccess={handleLoginSuccess}
            onRequestAccount={handleRequestAccount}
            onUpdateUserPassword={handleUpdateUserPassword}
          />
        ) : currentUser.role === 'admin' ? (
          <div>
            {/* Admin Switcher Bar between Workspace and Management Console */}
            <div className="bg-[#161b22] border-b border-[#30363d] px-4 md:px-8 py-2.5">
              <div className="max-w-7xl mx-auto flex items-center justify-between text-xs">
                <span className="font-semibold theme-text flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-theme animate-pulse" />
                  <span>{lang === 'ar' ? 'جلسة إدارة مركزية — إيزونيل المغرب' : 'Session Direction ISONIL Maroc'}</span>
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveAdminSubView('workspace')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      activeAdminSubView === 'workspace'
                        ? 'theme-btn font-bold shadow-md'
                        : 'bg-[#0d1117] text-slate-300 hover:text-white'
                    }`}
                  >
                    {lang === 'ar' ? 'بوابة المرفقات ونماذج العرض' : 'Boîte Fichiers & Modèles'}
                  </button>
                  <button
                    onClick={() => setActiveAdminSubView('dashboard')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      activeAdminSubView === 'dashboard'
                        ? 'theme-btn font-bold shadow-md'
                        : 'bg-[#0d1117] text-slate-300 hover:text-white'
                    }`}
                  >
                    {lang === 'ar' ? 'لوحة القيادة والمشاريع والنسخ الاحتياطي' : 'Tableau de bord & Sauvegardes'}
                  </button>
                </div>
              </div>
            </div>

            {activeAdminSubView === 'dashboard' ? (
              <AdminDashboard
                lang={lang}
                users={users}
                projects={projects}
                attachments={attachments}
                pendingRegistrations={pendingRegistrations}
                backups={backups}
                onApproveAccount={handleApproveAccount}
                onRejectAccount={handleRejectAccount}
                onDispatchAttachment={handleUploadSuccess}
                onOpenViewer={(att) => setSelectedAttachmentForViewer(att)}
                onCreateProject={handleCreateProject}
                onCreateBackup={handleCreateBackup}
                onRestoreBackup={handleRestoreBackup}
              />
            ) : (
              <MailboxWorkspace
                lang={lang}
                currentUser={currentUser}
                clientProjects={projects}
                attachments={attachments}
                layoutModel={layoutModel}
                onLayoutChange={setLayoutModel}
                onOpenViewer={(att) => setSelectedAttachmentForViewer(att)}
                onOpenUpload={(projId) => {
                  setUploadPreselectedProjectId(projId);
                  setShowUploadModal(true);
                }}
                onToggleStar={handleToggleStar}
                onDeleteAttachment={handleDeleteAttachment}
                onCreateNewProject={() => setActiveAdminSubView('dashboard')}
              />
            )}
          </div>
        ) : (
          /* Client User View */
          <MailboxWorkspace
            lang={lang}
            currentUser={currentUser}
            clientProjects={clientProjects}
            attachments={attachments}
            layoutModel={layoutModel}
            onLayoutChange={setLayoutModel}
            onOpenViewer={(att) => setSelectedAttachmentForViewer(att)}
            onOpenUpload={(projId) => {
              setUploadPreselectedProjectId(projId);
              setShowUploadModal(true);
            }}
            onToggleStar={handleToggleStar}
            onDeleteAttachment={handleDeleteAttachment}
          />
        )}
      </main>

      {/* 4. ATTACHMENT VIEWER MODAL */}
      {selectedAttachmentForViewer && (
        <AttachmentViewerModal
          attachment={selectedAttachmentForViewer}
          project={projects.find((p) => p.id === selectedAttachmentForViewer.projectId)}
          lang={lang}
          onClose={() => setSelectedAttachmentForViewer(null)}
          onForward={handleForwardAttachment}
          onDelete={handleDeleteAttachment}
        />
      )}

      {/* 5. UPLOAD / PUBLISH MODAL */}
      {showUploadModal && currentUser && (
        <UploadModal
          lang={lang}
          currentUser={currentUser}
          projects={clientProjects.length > 0 ? clientProjects : projects}
          preselectedProjectId={uploadPreselectedProjectId}
          onClose={() => setShowUploadModal(false)}
          onUploadSuccess={handleUploadSuccess}
        />
      )}

      {/* 6. CORPORATE FOOTER */}
      <footer className="border-t border-[#21262d] bg-[#0d1117] py-6 px-4 md:px-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-400">ISONIL Maroc</span>
            <span>·</span>
            <span>{translations[lang].companySubtitle}</span>
          </div>
          <div className="flex items-center gap-4 text-[11px] font-mono text-slate-500">
            <span>Centre Andalousie, El Jadida</span>
            <span>·</span>
            <span>contact@isonil.com</span>
            <span>·</span>
            <span>+212710738409</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
