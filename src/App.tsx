import React, { useState, useEffect } from 'react';
import { Language, User, Project, Attachment, PendingRegistration, LayoutModel, ThemeColor, IconSize, NotificationItem, BackupSnapshot } from './types';
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
  saveStoredLayout,
  loadStoredIconSize,
  saveStoredIconSize,
  loadVerifiedStoredSession,
  saveStoredCurrentSession
} from './data/mockData';
import { CinematicWelcome } from './components/CinematicWelcome';
import { Header } from './components/Header';
import { AuthModal } from './components/AuthModal';
import { MailboxWorkspace } from './components/MailboxWorkspace';
import { AdminDashboard } from './components/AdminDashboard';
import { AttachmentViewerModal } from './components/AttachmentViewerModal';
import { UploadModal } from './components/UploadModal';
import { UnauthorizedView } from './components/UnauthorizedView';
import {
  auth,
  onAuthStateChanged,
  firebaseSignOut,
  checkIsFirebaseAdmin,
  fetchVerifiedUserFromFirestore,
  fetchProjectsFromFirestore,
  fetchAttachmentsFromFirestore,
  fetchPendingRegistrationsFromFirestore,
  fetchUsersFromFirestore,
  syncUserToFirestore,
  syncProjectToFirestore,
  syncAttachmentToFirestore,
  deleteAttachmentFromFirestore,
  syncPendingRegistrationToFirestore,
  deletePendingRegistrationFromFirestore,
} from './firebase';

const THEME_HEX: Record<ThemeColor, { 
  accent: string; 
  hover: string; 
  glow: string; 
  border: string; 
  contrast: string;
  bgMain: string;
  bgSurface: string;
  bgSubtle: string;
  bgHover: string;
  textMain: string;
  textMuted: string;
}> = {
  'white': { 
    accent: '#DFC57B', 
    hover: '#C9AF66', 
    glow: 'rgba(223, 197, 123, 0.25)', 
    border: '#CBD5E1', 
    contrast: '#172B3A',
    bgMain: '#FFFFFF',
    bgSurface: '#F8FAFC',
    bgSubtle: '#F1F5F9',
    bgHover: '#E2E8F0',
    textMain: '#172B3A',
    textMuted: '#475569',
  },
  'charcoal-navy': { 
    accent: '#DFC57B', 
    hover: '#d4b663', 
    glow: 'rgba(223, 197, 123, 0.22)', 
    border: 'rgba(121, 200, 232, 0.35)', 
    contrast: '#0B192C',
    bgMain: '#26313A',
    bgSurface: '#1E272E',
    bgSubtle: '#192026',
    bgHover: '#323F49',
    textMain: '#FFFFFF',
    textMuted: '#94A3B8',
  },
  'petroleum-green': { 
    accent: '#B8E0D8', 
    hover: '#9FD3C7', 
    glow: 'rgba(184, 224, 216, 0.25)', 
    border: 'rgba(184, 224, 216, 0.38)', 
    contrast: '#0E433D',
    bgMain: '#14564F',
    bgSurface: '#0E433D',
    bgSubtle: '#09322D',
    bgHover: '#1A6961',
    textMain: '#FFFFFF',
    textMuted: '#CBD5E1',
  },
  'isonil-original': { 
    accent: '#DFC57B', 
    hover: '#d4b663', 
    glow: 'rgba(223, 197, 123, 0.22)', 
    border: 'rgba(121, 200, 232, 0.45)', 
    contrast: '#0B192C',
    bgMain: '#0B192C',
    bgSurface: '#112239',
    bgSubtle: '#071220',
    bgHover: '#162942',
    textMain: '#FFFFFF',
    textMuted: '#94A3B8',
  },
};

const checkIsAdminRoute = (): boolean => {
  if (typeof window === 'undefined') return false;
  const hash = (window.location.hash || '').toLowerCase();
  const path = (window.location.pathname || '').toLowerCase();
  const search = (window.location.search || '').toLowerCase();
  return (
    hash.includes('admin') ||
    path.endsWith('/admin') ||
    path.includes('/admin/') ||
    search.includes('portal=admin') ||
    search.includes('role=admin')
  );
};

export default function App() {
  // 1. Language state persisted across sessions
  const [lang, setLang] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('isonil_portal_lang_v1');
      if (saved === 'ar' || saved === 'fr') return saved;
    } catch {
      // ignore
    }
    return 'ar';
  });

  // 2. Cinematic Welcome Splash
  const [showCinematic, setShowCinematic] = useState<boolean>(true);

  // 3. Layout Model (3 design choices: classic, vertical-cards, creative)
  const [layoutModel, setLayoutModel] = useState<LayoutModel>(() => loadStoredLayout());

  // 4. Color Theme (4 comprehensive themes)
  const [themeColor, setThemeColor] = useState<ThemeColor>(() => loadStoredTheme());

  // 4.1 Icon Size (small, medium, large)
  const [iconSize, setIconSize] = useState<IconSize>(() => loadStoredIconSize());

  // 5. Clean Core Data Stores
  const [users, setUsers] = useState<User[]>(() => loadStoredUsers());
  const [projects, setProjects] = useState<Project[]>(() => loadStoredProjects());
  const [attachments, setAttachments] = useState<Attachment[]>(() => loadStoredAttachments());
  const [pendingRegistrations, setPendingRegistrations] = useState<PendingRegistration[]>(() => loadStoredPending());
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => loadStoredNotifications());
  const [backups, setBackups] = useState<BackupSnapshot[]>(() => loadStoredBackups());

  // 6. Current Session: initialized strictly from verified session or null (never default to admin)
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    return loadVerifiedStoredSession();
  });

  // 7. Admin active sub-view: strictly check if current verified session has admin role
  const [activeAdminSubView, setActiveAdminSubView] = useState<'dashboard' | 'workspace'>(() => {
    const session = loadVerifiedStoredSession();
    return session?.role === 'admin' ? 'dashboard' : 'workspace';
  });

  // 8. Modals
  const [selectedAttachmentForViewer, setSelectedAttachmentForViewer] = useState<Attachment | null>(null);
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [uploadPreselectedProjectId, setUploadPreselectedProjectId] = useState<string | undefined>(undefined);
  const [showAuthModalManually, setShowAuthModalManually] = useState<boolean>(false);

  // 9. Separate Admin Portal Route State & Setting
  const [isAdminPortalRoute, setIsAdminPortalRoute] = useState<boolean>(() => checkIsAdminRoute());
  const [showAdminLinkOnClient, setShowAdminLinkOnClient] = useState<boolean>(() => {
    try {
      return localStorage.getItem('isonil_show_admin_link') === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const handleLocationChange = () => {
      setIsAdminPortalRoute(checkIsAdminRoute());
    };
    window.addEventListener('hashchange', handleLocationChange);
    window.addEventListener('popstate', handleLocationChange);
    return () => {
      window.removeEventListener('hashchange', handleLocationChange);
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, []);

  const navigateToAdminRoute = () => {
    window.location.hash = '#admin';
    setIsAdminPortalRoute(true);
  };

  const navigateToClientRoute = () => {
    if (window.location.hash.includes('admin')) {
      window.location.hash = '';
    }
    setIsAdminPortalRoute(false);
  };

  const handleToggleShowAdminLink = (show: boolean) => {
    setShowAdminLinkOnClient(show);
    try {
      localStorage.setItem('isonil_show_admin_link', show ? 'true' : 'false');
    } catch {
      // ignore
    }
  };

  // Sync document direction and lang
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    try {
      localStorage.setItem('isonil_portal_lang_v1', lang);
    } catch {
      // ignore
    }
  }, [lang]);

  // Sync active theme color attribute & CSS custom variables dynamically
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', themeColor);
    const themeDef = THEME_HEX[themeColor] || THEME_HEX['isonil-original'];
    document.documentElement.style.setProperty('--theme-accent', themeDef.accent);
    document.documentElement.style.setProperty('--theme-accent-hover', themeDef.hover);
    document.documentElement.style.setProperty('--theme-accent-glow', themeDef.glow);
    document.documentElement.style.setProperty('--theme-accent-border', themeDef.border);
    document.documentElement.style.setProperty('--theme-text-contrast', themeDef.contrast);
    document.documentElement.style.setProperty('--bg-main', themeDef.bgMain);
    document.documentElement.style.setProperty('--bg-surface', themeDef.bgSurface);
    document.documentElement.style.setProperty('--bg-subtle', themeDef.bgSubtle);
    document.documentElement.style.setProperty('--bg-hover', themeDef.bgHover);
    document.documentElement.style.setProperty('--text-main', themeDef.textMain);
    document.documentElement.style.setProperty('--text-muted', themeDef.textMuted);
    saveStoredTheme(themeColor);
  }, [themeColor]);

  // Sync icon size attribute & persistence
  useEffect(() => {
    document.documentElement.setAttribute('data-icon-size', iconSize);
    saveStoredIconSize(iconSize);
  }, [iconSize]);

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

  // Listen to Firebase Auth state changes and explicitly verify role from Firestore database
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        // Clear active session if user signed out of Firebase
        setCurrentUser((prev) => {
          if (prev?.uid) {
            saveStoredCurrentSession(null);
            return null;
          }
          return prev;
        });
        return;
      }

      try {
        // Explicitly verify user and role from Firestore database
        const verifiedRemoteUser = await fetchVerifiedUserFromFirestore(fbUser);
        
        if (verifiedRemoteUser) {
          // Check if account was suspended
          if (verifiedRemoteUser.status === 'suspended') {
            await firebaseSignOut(auth).catch(() => {});
            saveStoredCurrentSession(null);
            setCurrentUser(null);
            return;
          }

          // Strict role determination verified against Firestore
          const isVerifiedAdmin =
            verifiedRemoteUser.role === 'admin' &&
            (await checkIsFirebaseAdmin(fbUser.uid, fbUser.email));
          const verifiedRole: 'admin' | 'client' = isVerifiedAdmin ? 'admin' : 'client';

          const resolvedUser: User = {
            ...verifiedRemoteUser,
            uid: fbUser.uid,
            role: verifiedRole,
          };

          // Update users cache
          setUsers((prev) => {
            const exists = prev.some(
              (u) => u.id === resolvedUser.id || u.email.toLowerCase() === resolvedUser.email.toLowerCase()
            );
            if (exists) {
              return prev.map((u) =>
                u.id === resolvedUser.id || u.email.toLowerCase() === resolvedUser.email.toLowerCase()
                  ? { ...u, ...resolvedUser }
                  : u
              );
            }
            return [...prev, resolvedUser];
          });

          // Prevent automatic admin dashboard entry for client-role accounts
          if (verifiedRole === 'client') {
            setActiveAdminSubView('workspace');
          } else if (verifiedRole === 'admin') {
            setActiveAdminSubView((current) => (current === 'workspace' ? 'workspace' : 'dashboard'));
          }

          // Save strictly verified role to session storage
          saveStoredCurrentSession({
            userId: resolvedUser.id,
            email: resolvedUser.email,
            role: verifiedRole,
            loginAt: new Date().toISOString(),
          });

          // Explicitly update currentUser state with verified role from Firestore (never keep unverified prevCurrent role)
          setCurrentUser(resolvedUser);
        }
      } catch (err) {
        console.error('Error verifying Firebase session with Firestore:', err);
      }
    });
    return () => unsubscribe();
  }, []);

  // Synchronize projects, attachments, and users from Firestore when an authenticated session is active
  useEffect(() => {
    if (!currentUser) return;
    let isMounted = true;
    const loadRemoteData = async () => {
      try {
        const [remoteProjects, remoteAttachments] = await Promise.all([
          fetchProjectsFromFirestore(currentUser),
          fetchAttachmentsFromFirestore(currentUser),
        ]);
        if (!isMounted) return;
        if (remoteProjects.length > 0) {
          setProjects((prev) => {
            const map = new Map(prev.map((p) => [p.id, p]));
            remoteProjects.forEach((p) => map.set(p.id, p));
            return Array.from(map.values());
          });
        }
        if (remoteAttachments.length > 0) {
          setAttachments((prev) => {
            const map = new Map(prev.map((a) => [a.id, a]));
            remoteAttachments.forEach((a) => map.set(a.id, a));
            return Array.from(map.values());
          });
        }
        if (currentUser.role === 'admin') {
          const [remotePending, remoteUsers] = await Promise.all([
            fetchPendingRegistrationsFromFirestore(),
            fetchUsersFromFirestore(),
          ]);
          if (!isMounted) return;
          if (remotePending.length > 0) {
            setPendingRegistrations((prev) => {
              const map = new Map(prev.map((p) => [p.id, p]));
              remotePending.forEach((p) => map.set(p.id, p));
              return Array.from(map.values());
            });
          }
          if (remoteUsers.length > 0) {
            setUsers((prev) => {
              const map = new Map(prev.map((u) => [u.id, u]));
              remoteUsers.forEach((u) => map.set(u.id, u));
              return Array.from(map.values());
            });
          }
        }
      } catch (err) {
        console.warn('Error loading remote Firestore data:', err);
      }
    };
    loadRemoteData();
    return () => {
      isMounted = false;
    };
  }, [currentUser]);

  // Handler: Language switch
  const handleLanguageChange = (newLang: Language) => {
    setLang(newLang);
  };

  // Handler: Register or Link Admin Account
  const handleRegisterAdminAccount = (adminUser: User) => {
    setUsers((prev) => {
      const emailLower = adminUser.email.trim().toLowerCase();
      const exists = prev.some(
        (u) => u.id === adminUser.id || u.email.trim().toLowerCase() === emailLower
      );
      if (exists) {
        return prev.map((u) =>
          u.id === adminUser.id || u.email.trim().toLowerCase() === emailLower
            ? { ...u, ...adminUser, role: 'admin', status: 'active' }
            : u
        );
      }
      return [{ ...adminUser, role: 'admin', status: 'active' }, ...prev];
    });
  };

  // Handler: Admin Sub-View Switch (enforces admin privilege check before switching to dashboard)
  const handleAdminSubViewChange = (view: 'dashboard' | 'workspace') => {
    if (currentUser?.role !== 'admin') {
      setActiveAdminSubView('workspace');
      return;
    }
    setActiveAdminSubView(view);
  };

  // Handler: Login Success (determines role strictly from authenticated account and verified permissions)
  const handleLoginSuccess = async (user: User) => {
    let verifiedRole: 'admin' | 'client' = user.role === 'admin' ? 'admin' : 'client';
    if (verifiedRole === 'admin') {
      const isActuallyAdmin = await checkIsFirebaseAdmin(user.uid || user.id, user.email);
      if (!isActuallyAdmin) {
        verifiedRole = 'client';
      }
    }

    const authenticatedUser: User = {
      ...user,
      role: verifiedRole,
    };

    saveStoredCurrentSession({
      userId: authenticatedUser.id,
      email: authenticatedUser.email,
      role: verifiedRole,
      loginAt: new Date().toISOString(),
    });

    if (verifiedRole === 'admin') {
      setActiveAdminSubView('dashboard');
    } else {
      // Explicitly prevent automatic admin dashboard entry for client-role accounts
      setActiveAdminSubView('workspace');
    }

    setCurrentUser(authenticatedUser);
    setShowAuthModalManually(false);
  };

  // Handler: Logout (clears local & Firebase session and returns to login screen)
  const handleLogout = async () => {
    try {
      await firebaseSignOut(auth);
    } catch {
      // ignore sign-out error
    }
    saveStoredCurrentSession(null);
    setCurrentUser(null);
    setShowAuthModalManually(true);
  };

  // Handler: Update User Password (from Forgot Password flow)
  const handleUpdateUserPassword = (email: string, newPass: string) => {
    const emailTrim = email.trim().toLowerCase();
    setUsers((prev) => {
      const exists = prev.some((u) => u.email.toLowerCase() === emailTrim);
      if (exists) {
        return prev.map((u) => {
          if (u.email.toLowerCase() === emailTrim) {
            const updated = { ...u, password: newPass };
            syncUserToFirestore(updated, updated.uid).catch(() => {});
            return updated;
          }
          return u;
        });
      } else {
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
        syncUserToFirestore(newUser).catch(() => {});
        return [...prev, newUser];
      }
    });

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
    syncPendingRegistrationToFirestore(newPending).catch(() => {});

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
    const assignedClient = users.find((u) => u.id === newProject.clientId);
    syncProjectToFirestore(newProject, assignedClient?.email).catch(() => {});

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

  // Handler: Admin approves account (preserves client password and syncs to Firestore)
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
      ...(targetPending.password ? { password: targetPending.password } : {}),
    };

    setUsers((prev) => [...prev, newClientUser]);
    setProjects((prev) => [...prev, newProject]);
    setPendingRegistrations((prev) => prev.filter((p) => p.id !== registrationId));

    syncUserToFirestore(newClientUser).catch(() => {});
    syncProjectToFirestore(newProject, newClientUser.email).catch(() => {});
    deletePendingRegistrationFromFirestore(registrationId).catch(() => {});

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
    deletePendingRegistrationFromFirestore(registrationId).catch(() => {});
  };

  // Handler: Upload/Publish new attachment
  const handleUploadSuccess = (newAttachment: Attachment) => {
    setAttachments((prev) => [newAttachment, ...prev]);
    const assignedClient = users.find((u) => u.id === newAttachment.clientId);
    syncAttachmentToFirestore(newAttachment, assignedClient?.email).catch(() => {});

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
      prev.map((att) => {
        if (att.id === attachmentId) {
          const updated = { ...att, starred: !att.starred };
          const assignedClient = users.find((u) => u.id === updated.clientId);
          syncAttachmentToFirestore(updated, assignedClient?.email).catch(() => {});
          return updated;
        }
        return att;
      })
    );
  };

  // Handler: Soft-delete to 30-day recovery trash, or permanently delete if already in trash
  const handleDeleteAttachment = (attachmentId: string) => {
    const target = attachments.find((a) => a.id === attachmentId);
    if (!target) return;

    if (target.folder === 'trash') {
      // Permanent delete
      setAttachments((prev) => prev.filter((att) => att.id !== attachmentId));
      deleteAttachmentFromFirestore(attachmentId).catch(() => {});
    } else {
      // Soft delete (recoverable for 30 days)
      const trashed: Attachment = {
        ...target,
        folder: 'trash',
        deletedAt: new Date().toISOString(),
      };
      setAttachments((prev) => prev.map((att) => (att.id === attachmentId ? trashed : att)));
      const assignedClient = users.find((u) => u.id === trashed.clientId);
      syncAttachmentToFirestore(trashed, assignedClient?.email).catch(() => {});
    }

    if (selectedAttachmentForViewer?.id === attachmentId) {
      setSelectedAttachmentForViewer(null);
    }

    const notif: NotificationItem = {
      id: `notif-${Date.now()}`,
      title:
        target.folder === 'trash'
          ? (lang === 'ar' ? 'تم الحذف النهائي للمرفق' : 'Fichier supprimé définitivement')
          : (lang === 'ar' ? 'تم نقل المرفق إلى سلة المحذوفات (30 يوماً)' : 'Fichier déplacé dans la corbeille (30j)'),
      message: lang === 'ar' 
        ? `الملف "${target.title}" متاح للاستعادة لمدة 30 يوماً قبل الحذف النهائي.`
        : `Le fichier "${target.title}" reste récupérable pendant 30 jours.`,
      date: new Date().toISOString(),
      read: false,
      type: 'system',
    };
    setNotifications((prev) => [notif, ...prev]);
  };

  // Handler: Restore attachment from 30-day trash
  const handleRestoreAttachment = (attachmentId: string) => {
    setAttachments((prev) =>
      prev.map((att) => {
        if (att.id === attachmentId) {
          const restored: Attachment = {
            ...att,
            folder: att.senderType === 'admin' ? 'inbox' : 'sent',
            deletedAt: undefined,
          };
          const assignedClient = users.find((u) => u.id === restored.clientId);
          syncAttachmentToFirestore(restored, assignedClient?.email).catch(() => {});
          return restored;
        }
        return att;
      })
    );
  };

  // Handler: Real Forward attachment via Email Service
  const handleForwardAttachment = async (
    attachmentId: string,
    email: string,
    note: string
  ): Promise<{
    success: boolean;
    error?: string;
    message?: string;
    messageId?: string;
    previewUrl?: string | null;
  }> => {
    const targetAtt = attachments.find((a) => a.id === attachmentId);
    if (!targetAtt) {
      return {
        success: false,
        error: 'NOT_FOUND',
        message: lang === 'ar' ? 'المرفق غير موجود' : 'Fichier introuvable',
      };
    }

    try {
      const response = await fetch('/api/forward-attachment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          attachment: targetAtt,
          recipientEmail: email,
          note,
          senderEmail: currentUser?.email || 'contact@isonil.com',
          senderName: currentUser?.fullName || 'Direction ISONIL',
          senderRole: currentUser?.role || 'client',
          clientId: currentUser?.id,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Only update local notes if real delivery succeeded
        const timestamp = new Date().toLocaleTimeString(lang === 'ar' ? 'ar-MA' : 'fr-FR', {
          hour: '2-digit',
          minute: '2-digit',
        });
        const transferLog = `[${timestamp} - Transféré à: ${email}] ${note}`.trim();

        setAttachments((prev) =>
          prev.map((att) => {
            if (att.id === attachmentId) {
              const updatedAtt = {
                ...att,
                notes: (att.notes ? att.notes + '\n\n' : '') + transferLog,
              };
              const assignedClient = users.find((u) => u.id === updatedAtt.clientId);
              syncAttachmentToFirestore(updatedAtt, assignedClient?.email).catch(() => {});
              return updatedAtt;
            }
            return att;
          })
        );

        // Add a notification item
        const newNotif: NotificationItem = {
          id: `notif-${Date.now()}`,
          title: lang === 'ar' ? 'تم إرسال المرفق بنجاح' : 'Document transféré avec succès',
          message:
            lang === 'ar'
              ? `تم إرسال «${targetAtt.title}» إلى ${email}`
              : `«${targetAtt.title}» envoyé à ${email}`,
          date: new Date().toISOString(),
          read: false,
          type: 'attachment',
          targetAttachmentId: attachmentId,
        };
        setNotifications((prev) => [newNotif, ...prev]);

        return {
          success: true,
          messageId: data.messageId,
          previewUrl: data.previewUrl,
          message: data.message,
        };
      } else {
        return {
          success: false,
          error: data.error || 'DELIVERY_FAILED',
          message:
            data.message ||
            (lang === 'ar' ? 'فشل إرسال البريد الإلكتروني' : "Échec de l'envoi de l'e-mail"),
        };
      }
    } catch (err: any) {
      return {
        success: false,
        error: 'NETWORK_ERROR',
        message:
          lang === 'ar'
            ? `تعذر الاتصال بخدمة البريد: ${err?.message || 'خطأ في الشبكة'}`
            : `Impossible de contacter le service de messagerie: ${err?.message || 'Erreur réseau'}`,
      };
    }
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
    return projects.filter(
      (p) =>
        currentUser.assignedProjectIds.includes(p.id) ||
        p.clientId === currentUser.id
    );
  }, [currentUser, projects]);

  // Strict RBAC: Filter attachments belonging to client projects or assigned to client
  const clientAttachments = React.useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'admin') return attachments;
    const clientProjectIds = new Set(clientProjects.map((p) => p.id));
    return attachments.filter(
      (att) =>
        clientProjectIds.has(att.projectId) ||
        att.clientId === currentUser.id ||
        (currentUser.uid && att.clientId === currentUser.uid)
    );
  }, [currentUser, attachments, clientProjects]);

  return (
    <div className="min-h-screen bg-[#0B192C] text-white flex flex-col font-sans selection:bg-[#DFC57B] selection:text-[#0B192C]">
      {/* 1. CINEMATIC WELCOME SCREEN */}
      {showCinematic && (
        <CinematicWelcome
          lang={lang}
          onLanguageChange={handleLanguageChange}
          onFinish={() => setShowCinematic(false)}
        />
      )}

      {/* 2. CORPORATE HEADER */}
      <Header
        lang={lang}
        onLanguageChange={handleLanguageChange}
        currentUser={currentUser}
        isAuthScreen={!currentUser || showAuthModalManually}
        isAdminPortalRoute={isAdminPortalRoute}
        onNavigateToClientRoute={navigateToClientRoute}
        activeAdminSubView={activeAdminSubView}
        onAdminSubViewChange={handleAdminSubViewChange}
        onLogout={handleLogout}
        onShowAuthModal={() => setShowAuthModalManually(true)}
        canGoBack={currentUser !== null && currentUser.role === 'admin' && activeAdminSubView === 'dashboard'}
        onBack={() => setActiveAdminSubView('workspace')}
        layoutModel={layoutModel}
        onLayoutChange={setLayoutModel}
        themeColor={themeColor}
        onThemeChange={setThemeColor}
        iconSize={iconSize}
        onIconSizeChange={setIconSize}
        notifications={notifications}
        onMarkAllNotificationsRead={handleMarkAllNotificationsRead}
        onSelectNotification={handleSelectNotification}
      />

      {/* 3. MAIN WORKSPACE / AUTH VIEW */}
      <main className="flex-1">
        {!currentUser || showAuthModalManually ? (
          <AuthModal
            lang={lang}
            onLanguageChange={handleLanguageChange}
            users={users}
            pendingRegistrations={pendingRegistrations}
            onLoginSuccess={handleLoginSuccess}
            onRegisterAdminAccount={handleRegisterAdminAccount}
            onRequestAccount={handleRequestAccount}
            onUpdateUserPassword={handleUpdateUserPassword}
            isAdminPortalRoute={isAdminPortalRoute}
            onNavigateToAdminRoute={navigateToAdminRoute}
            onNavigateToClientRoute={navigateToClientRoute}
            showAdminLinkOnClient={showAdminLinkOnClient}
          />
        ) : currentUser.role !== 'admin' && isAdminPortalRoute ? (
          /* DEDICATED UNAUTHORIZED STATE: Client account attempting to access admin route */
          <UnauthorizedView
            lang={lang}
            currentUser={currentUser}
            attemptedPath={window.location.hash || '/#admin'}
            onReturnToClientWorkspace={navigateToClientRoute}
            onSignOutAndSwitchAccount={async () => {
              await handleLogout();
              navigateToAdminRoute();
            }}
          />
        ) : currentUser.role === 'admin' ? (
          <div>
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
                showAdminLinkOnClient={showAdminLinkOnClient}
                onToggleShowAdminLink={handleToggleShowAdminLink}
              />
            ) : (
              <MailboxWorkspace
                lang={lang}
                currentUser={currentUser}
                clientProjects={projects}
                attachments={attachments}
                layoutModel={layoutModel}
                iconSize={iconSize}
                onLayoutChange={setLayoutModel}
                onOpenViewer={(att) => setSelectedAttachmentForViewer(att)}
                onOpenUpload={(projId) => {
                  setUploadPreselectedProjectId(projId);
                  setShowUploadModal(true);
                }}
                onToggleStar={handleToggleStar}
                onDeleteAttachment={handleDeleteAttachment}
                onRestoreAttachment={handleRestoreAttachment}
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
            attachments={clientAttachments}
            layoutModel={layoutModel}
            iconSize={iconSize}
            onLayoutChange={setLayoutModel}
            onOpenViewer={(att) => setSelectedAttachmentForViewer(att)}
            onOpenUpload={(projId) => {
              setUploadPreselectedProjectId(projId);
              setShowUploadModal(true);
            }}
            onToggleStar={handleToggleStar}
            onDeleteAttachment={handleDeleteAttachment}
            onRestoreAttachment={handleRestoreAttachment}
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
          projects={currentUser.role === 'admin' ? projects : clientProjects}
          preselectedProjectId={uploadPreselectedProjectId}
          onClose={() => setShowUploadModal(false)}
          onUploadSuccess={handleUploadSuccess}
        />
      )}

      {/* 6. CORPORATE FOOTER */}
      <footer className="border-t border-[#79C8E8]/20 bg-[#0B192C] py-6 px-4 md:px-8 text-xs text-slate-300">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#DFC57B]">ISONIL Maroc</span>
            <span>·</span>
            <span className="text-[#A9DDF1]">{translations[lang].companySubtitle}</span>
          </div>
          <div className="flex items-center gap-4 text-[11px] font-mono text-slate-300">
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
