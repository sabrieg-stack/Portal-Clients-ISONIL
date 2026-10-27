import { User, Project, Attachment, PendingRegistration, NotificationItem, BackupSnapshot, ThemeColor, LayoutModel, IconSize } from '../types';

export const INITIAL_USERS: User[] = [
  {
    id: 'client-1',
    fullName: 'Karim Bennani',
    companyName: 'Maroc Phosphore (Jorf Lasfar)',
    email: 'client@isonil.com',
    phone: '+212661234567',
    role: 'client',
    status: 'active',
    createdAt: '2025-01-10T10:00:00Z',
    assignedProjectIds: ['proj-demo-1'],
    city: 'El Jadida',
    password: 'client@isonil2025',
  },
];

export const INITIAL_PROJECTS: Project[] = [
  {
    id: 'proj-demo-1',
    clientId: 'client-1',
    clientName: 'Maroc Phosphore (Jorf Lasfar)',
    name: 'Projet Isolation Tuyauterie Vapeur HP',
    location: 'Plateforme Industrielle Jorf Lasfar',
    type: 'tuyauterie',
    status: 'in_progress',
    startDate: '2025-01-15',
    completionPercentage: 65,
    totalStorageBytes: 6650000,
    description: 'Isolation calorifuge en coquilles de laine de roche avec finition tôle Isoxal sur circuit vapeur haute pression.',
  },
];

export const INITIAL_ATTACHMENTS: Attachment[] = [
  {
    id: 'att-demo-1',
    projectId: 'proj-demo-1',
    projectName: 'Projet Isolation Tuyauterie Vapeur HP',
    clientId: 'client-1',
    title: 'Rapport de Réception Calorifuge - Ligne Vapeur HP',
    fileName: 'Rapport_Controle_Calorifuge_Vapeur.pdf',
    fileSizeBytes: 2450000,
    category: 'document',
    uploadedAt: '2025-02-10T14:30:00Z',
    senderType: 'admin',
    senderName: 'Direction ISONIL Maroc',
    fileUrl: '/1000127391_10ae27f3.jpg',
    starred: true,
    folder: 'inbox',
    notes: 'PV de conformité thermique et étanchéité tôle Isoxal 0.8mm avec thermographie infrarouge conforme.',
  },
  {
    id: 'att-demo-2',
    projectId: 'proj-demo-1',
    projectName: 'Projet Isolation Tuyauterie Vapeur HP',
    clientId: 'client-1',
    title: 'Plans Isométriques et Calfeutrement Ligne 14-B',
    fileName: 'Plan_Isometric_Tuyauterie_Ligne14.jpg',
    fileSizeBytes: 4200000,
    category: 'photo',
    uploadedAt: '2025-02-12T11:15:00Z',
    senderType: 'admin',
    senderName: 'Direction ISONIL Maroc',
    fileUrl: '/1000127391_10ae27f3.jpg',
    starred: false,
    folder: 'inbox',
    notes: 'Détails des points fixes et des boîtes à vannes démontables.',
  },
];

export const INITIAL_PENDING_REGISTRATIONS: PendingRegistration[] = [];

export const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-welcome',
    title: 'مرحباً بكم في بوابة ISONIL Maroc',
    message: 'تم تفعيل مساحة العمل الرقمية المشتركة بنجاح لحفظ وتوثيق مشاريع العزل الحراري.',
    date: new Date().toISOString(),
    read: false,
    type: 'system',
  },
];

export const INITIAL_BACKUPS: BackupSnapshot[] = [
  {
    id: 'backup-init',
    timestamp: new Date().toISOString(),
    dateFormatted: new Date().toLocaleDateString('fr-MA', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
    sizeBytes: 1048576,
    projectsCount: 1,
    attachmentsCount: 2,
    usersCount: 1,
    note: 'Point de restauration initial système',
    payloadJson: JSON.stringify({ users: INITIAL_USERS, projects: INITIAL_PROJECTS, attachments: INITIAL_ATTACHMENTS, pending: [] }),
  },
];

export const INITIAL_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: 'audit-init-1',
    timestamp: '2025-02-12T11:15:00Z',
    category: 'modification',
    action: 'ATTACHMENT_UPLOADED',
    actorName: 'Direction ISONIL Maroc',
    actorEmail: 'admin@isonil.com',
    actorRole: 'admin',
    targetName: 'Plan_Isometric_Tuyauterie_Ligne14.jpg',
    details: 'Publication de pièce jointe dans le projet "Projet Isolation Tuyauterie Vapeur HP" (4.01 Mo)',
    severity: 'info',
  },
  {
    id: 'audit-init-2',
    timestamp: '2025-02-11T09:42:18Z',
    category: 'download',
    action: 'FILE_DOWNLOAD',
    actorName: 'Karim Bennani — Maroc Phosphore (Jorf Lasfar)',
    actorEmail: 'client@isonil.com',
    actorRole: 'client',
    targetName: 'Rapport_Controle_Calorifuge_Vapeur.pdf',
    details: 'Téléchargement du rapport technique PDF (2.34 Mo) depuis l\'espace client',
    severity: 'info',
  },
  {
    id: 'audit-init-3',
    timestamp: '2025-02-11T09:38:05Z',
    category: 'login',
    action: 'USER_LOGIN',
    actorName: 'Karim Bennani — Maroc Phosphore (Jorf Lasfar)',
    actorEmail: 'client@isonil.com',
    actorRole: 'client',
    targetName: 'Portail Client ISONIL',
    details: 'Authentification réussie (Session vérifiée)',
    severity: 'info',
  },
  {
    id: 'audit-init-4',
    timestamp: '2025-02-10T14:30:00Z',
    category: 'modification',
    action: 'ATTACHMENT_UPLOADED',
    actorName: 'Direction ISONIL Maroc',
    actorEmail: 'admin@isonil.com',
    actorRole: 'admin',
    targetName: 'Rapport_Controle_Calorifuge_Vapeur.pdf',
    details: 'Création et expédition du document PDF pour "Projet Isolation Tuyauterie Vapeur HP"',
    severity: 'info',
  },
  {
    id: 'audit-init-5',
    timestamp: '2025-01-15T08:00:00Z',
    category: 'modification',
    action: 'PROJECT_CREATED',
    actorName: 'Direction ISONIL Maroc',
    actorEmail: 'admin@isonil.com',
    actorRole: 'admin',
    targetName: 'Projet Isolation Tuyauterie Vapeur HP',
    details: 'Initialisation du chantier sur Plateforme Industrielle Jorf Lasfar (Client: Maroc Phosphore)',
    severity: 'info',
  },
];

// Local storage keys (v4 for backup, theme, session, and notifications support)
const USERS_STORAGE_KEY = 'isonil_portal_users_v4';
const PROJECTS_STORAGE_KEY = 'isonil_portal_projects_v4';
const ATTACHMENTS_STORAGE_KEY = 'isonil_portal_attachments_v4';
const PENDING_STORAGE_KEY = 'isonil_portal_pending_v4';
const NOTIFICATIONS_STORAGE_KEY = 'isonil_portal_notifications_v4';
const BACKUPS_STORAGE_KEY = 'isonil_portal_backups_v4';
const AUDIT_LOGS_STORAGE_KEY = 'isonil_portal_audit_logs_v1';
const THEME_STORAGE_KEY = 'isonil_portal_theme_v5';
const LAYOUT_STORAGE_KEY = 'isonil_portal_layout_v5';
const ICON_SIZE_STORAGE_KEY = 'isonil_portal_icon_size_v1';
const SESSION_STORAGE_KEY = 'isonil_portal_session_v4';

export function loadStoredUsers(): User[] {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // Remove any previously hardcoded placeholder admin-1 (contact@isonil.com) so no admin email is ever assumed
        const cleaned = parsed.filter(
          (u: User) => !(u.id === 'admin-1' && u.email?.toLowerCase() === 'contact@isonil.com' && u.password === 'admin@isonil2025')
        );
        return cleaned;
      }
    }
  } catch (e) {
    console.error('Error loading users', e);
  }
  return INITIAL_USERS;
}

export function saveStoredUsers(users: User[]) {
  try {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  } catch (e) {
    console.error('Error saving users', e);
  }
}

export interface StoredSession {
  userId: string;
  email: string;
  role: 'admin' | 'client';
  loginAt: string;
}

export function saveStoredCurrentSession(session: StoredSession | null) {
  try {
    if (!session) {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    } else {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    }
  } catch (e) {
    console.error('Error saving current session', e);
  }
}

/**
 * Loads verified active session.
 * - Never defaults to admin.
 * - Checks dedicated session and Firebase Auth tokens.
 * - Role is STRICTLY verified from registered database record.
 * - Returns User or null.
 */
export function loadVerifiedStoredSession(): User | null {
  try {
    const users = loadStoredUsers();

    // 1. Check dedicated ISONIL session
    const raw = localStorage.getItem(SESSION_STORAGE_KEY) || sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<StoredSession>;
      if (parsed && (parsed.userId || parsed.email)) {
        const matched = users.find((u) => 
          (parsed.userId && u.id === parsed.userId) ||
          (parsed.email && u.email.toLowerCase() === parsed.email.toLowerCase())
        );

        if (matched && matched.status === 'active') {
          // Verify role from verified database record only; NEVER trust or promote from arbitrary session
          return {
            ...matched,
            role: matched.role === 'admin' ? 'admin' : 'client',
          };
        }
      }
    }

    // 2. Check existing Firebase Auth sessions without granting admin solely because session exists
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('firebase:authUser:') || key === 'firebase_auth_user')) {
        const fbRaw = localStorage.getItem(key);
        if (fbRaw) {
          try {
            const fbUser = JSON.parse(fbRaw);
            const email = (fbUser.email || '').trim().toLowerCase();
            const uid = fbUser.uid || '';
            if (email || uid) {
              const matched = users.find((u) =>
                (uid && u.id === uid) ||
                (email && u.email.toLowerCase() === email)
              );
              // CRITICAL: role is strictly determined by verified record, never assumed
              if (matched && matched.status === 'active') {
                return {
                  ...matched,
                  role: matched.role === 'admin' ? 'admin' : 'client',
                };
              }
            }
          } catch {
            // ignore non-json
          }
        }
      }
    }
  } catch (e) {
    console.error('Error verifying stored session', e);
  }

  // Never assign or assume the admin role by default!
  return null;
}

export function loadStoredProjects(): Project[] {
  try {
    const raw = localStorage.getItem(PROJECTS_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading projects', e);
  }
  return INITIAL_PROJECTS;
}

export function saveStoredProjects(projects: Project[]) {
  try {
    localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
  } catch (e) {
    console.error('Error saving projects', e);
  }
}

export function loadStoredAttachments(): Attachment[] {
  try {
    const raw = localStorage.getItem(ATTACHMENTS_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading attachments', e);
  }
  return INITIAL_ATTACHMENTS;
}

export function saveStoredAttachments(attachments: Attachment[]) {
  try {
    localStorage.setItem(ATTACHMENTS_STORAGE_KEY, JSON.stringify(attachments));
  } catch (e) {
    console.error('Error saving attachments', e);
  }
}

export function loadStoredPending(): PendingRegistration[] {
  try {
    const raw = localStorage.getItem(PENDING_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading pending registrations', e);
  }
  return INITIAL_PENDING_REGISTRATIONS;
}

export function saveStoredPending(pending: PendingRegistration[]) {
  try {
    localStorage.setItem(PENDING_STORAGE_KEY, JSON.stringify(pending));
  } catch (e) {
    console.error('Error saving pending registrations', e);
  }
}

export function loadStoredNotifications(): NotificationItem[] {
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading notifications', e);
  }
  return INITIAL_NOTIFICATIONS;
}

export function saveStoredNotifications(notifs: NotificationItem[]) {
  try {
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifs));
  } catch (e) {
    console.error('Error saving notifications', e);
  }
}

export function loadStoredBackups(): BackupSnapshot[] {
  try {
    const raw = localStorage.getItem(BACKUPS_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading backups', e);
  }
  return INITIAL_BACKUPS;
}

export function saveStoredBackups(backups: BackupSnapshot[]) {
  try {
    localStorage.setItem(BACKUPS_STORAGE_KEY, JSON.stringify(backups));
  } catch (e) {
    console.error('Error saving backups', e);
  }
}

export function loadStoredTheme(): ThemeColor {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    if (raw === 'white' || raw === 'charcoal-navy' || raw === 'petroleum-green' || raw === 'isonil-original') {
      return raw;
    }
  } catch (e) {
    console.error('Error loading theme', e);
  }
  return 'isonil-original';
}

export function saveStoredTheme(theme: ThemeColor) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch (e) {
    console.error('Error saving theme', e);
  }
}

export function loadStoredLayout(): LayoutModel {
  try {
    const raw = localStorage.getItem(LAYOUT_STORAGE_KEY);
    if (raw === 'classic' || raw === 'vertical-cards' || raw === 'creative') {
      return raw;
    }
  } catch (e) {
    console.error('Error loading layout', e);
  }
  return 'classic';
}

export function saveStoredLayout(layout: LayoutModel) {
  try {
    localStorage.setItem(LAYOUT_STORAGE_KEY, layout);
  } catch (e) {
    console.error('Error saving layout', e);
  }
}

export function loadStoredIconSize(): IconSize {
  try {
    const raw = localStorage.getItem(ICON_SIZE_STORAGE_KEY);
    if (raw === 'small' || raw === 'medium' || raw === 'large') {
      return raw;
    }
  } catch (e) {
    console.error('Error loading icon size', e);
  }
  return 'medium';
}

export function saveStoredIconSize(size: IconSize) {
  try {
    localStorage.setItem(ICON_SIZE_STORAGE_KEY, size);
  } catch (e) {
    console.error('Error saving icon size', e);
  }
}

export function loadStoredAuditLogs(): AuditLogEntry[] {
  try {
    const raw = localStorage.getItem(AUDIT_LOGS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error('Error loading audit logs', e);
  }
  return INITIAL_AUDIT_LOGS;
}

export function saveStoredAuditLogs(logs: AuditLogEntry[]) {
  try {
    localStorage.setItem(AUDIT_LOGS_STORAGE_KEY, JSON.stringify(logs.slice(0, 500)));
  } catch (e) {
    console.error('Error saving audit logs', e);
  }
}

