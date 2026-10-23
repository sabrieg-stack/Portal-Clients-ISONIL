import { User, Project, Attachment, PendingRegistration, NotificationItem, BackupSnapshot, ThemeColor, LayoutModel } from '../types';

export const INITIAL_USERS: User[] = [
  {
    id: 'admin-1',
    fullName: 'Direction ISONIL',
    companyName: 'ISONIL Maroc',
    email: 'contact@isonil.com',
    phone: '+212710738409',
    role: 'admin',
    status: 'active',
    createdAt: '2025-01-01T00:00:00Z',
    assignedProjectIds: [],
    city: 'El Jadida',
  },
];

export const INITIAL_PROJECTS: Project[] = [];

export const INITIAL_ATTACHMENTS: Attachment[] = [];

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
    projectsCount: 0,
    attachmentsCount: 0,
    usersCount: 1,
    note: 'Point de restauration initial système',
    payloadJson: JSON.stringify({ users: INITIAL_USERS, projects: [], attachments: [], pending: [] }),
  },
];

// Local storage keys (v4 for backup, theme, and notifications support)
const USERS_STORAGE_KEY = 'isonil_portal_users_v4';
const PROJECTS_STORAGE_KEY = 'isonil_portal_projects_v4';
const ATTACHMENTS_STORAGE_KEY = 'isonil_portal_attachments_v4';
const PENDING_STORAGE_KEY = 'isonil_portal_pending_v4';
const NOTIFICATIONS_STORAGE_KEY = 'isonil_portal_notifications_v4';
const BACKUPS_STORAGE_KEY = 'isonil_portal_backups_v4';
const THEME_STORAGE_KEY = 'isonil_portal_theme_v4';
const LAYOUT_STORAGE_KEY = 'isonil_portal_layout_v4';

export function loadStoredUsers(): User[] {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
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
    if (raw === 'beige' || raw === 'silver' || raw === 'bronze' || raw === 'navy' || raw === 'emerald') {
      return raw;
    }
  } catch (e) {
    console.error('Error loading theme', e);
  }
  return 'beige';
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
    if (raw === 'horizontal' || raw === 'sidebar' || raw === 'grid' || raw === 'timeline' || raw === 'compact') {
      return raw;
    }
  } catch (e) {
    console.error('Error loading layout', e);
  }
  return 'horizontal';
}

export function saveStoredLayout(layout: LayoutModel) {
  try {
    localStorage.setItem(LAYOUT_STORAGE_KEY, layout);
  } catch (e) {
    console.error('Error saving layout', e);
  }
}
