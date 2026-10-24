export type Language = 'ar' | 'fr';

export type UserRole = 'client' | 'admin';

export type AccountStatus = 'active' | 'pending' | 'suspended';

export type LayoutModel = 'horizontal' | 'sidebar' | 'grid' | 'timeline' | 'compact';

export type ThemeColor = 'beige' | 'silver' | 'bronze' | 'navy' | 'emerald';

export interface User {
  id: string;
  uid?: string;
  fullName: string;
  companyName: string;
  email: string;
  phone: string;
  role: UserRole;
  status: AccountStatus;
  createdAt: string;
  assignedProjectIds: string[];
  city?: string;
  notes?: string;
  password?: string;
}

export type ProjectCategory = 'tuyauterie' | 'conduits' | 'cuves' | 'batiment' | 'chaudieres' | 'autre';
export type ProjectStatus = 'in_progress' | 'completed' | 'maintenance';

export interface Project {
  id: string;
  clientId: string;
  clientName: string;
  name: string;
  location: string;
  type: ProjectCategory;
  status: ProjectStatus;
  startDate: string;
  completionPercentage: number;
  totalStorageBytes: number;
  description: string;
}

export type AttachmentCategory = 'photo' | 'video' | 'document' | 'note' | 'other';
export type MailboxFolder = 'inbox' | 'sent' | 'starred' | 'trash';

export interface Attachment {
  id: string;
  projectId: string;
  projectName: string;
  clientId: string;
  senderType: 'client' | 'admin';
  senderName: string;
  title: string;
  category: AttachmentCategory;
  fileUrl: string;
  fileName: string;
  fileSizeBytes: number;
  uploadedAt: string;
  starred?: boolean;
  notes?: string;
  folder?: MailboxFolder;
  previewType?: 'image' | 'video' | 'pdf' | 'text';
  downloadCount?: number;
  videoMimeType?: string;
  deletedAt?: string;
  customSection?: string;
}

export interface PendingRegistration {
  id: string;
  uid?: string;
  fullName: string;
  companyName: string;
  email: string;
  phone: string;
  city: string;
  projectType: ProjectCategory;
  requestedAt: string;
  notes?: string;
  password?: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  date: string;
  read: boolean;
  type: 'attachment' | 'project' | 'account' | 'system';
  targetAttachmentId?: string;
  targetProjectId?: string;
}

export interface BackupSnapshot {
  id: string;
  timestamp: string;
  dateFormatted: string;
  sizeBytes: number;
  projectsCount: number;
  attachmentsCount: number;
  usersCount: number;
  note?: string;
  payloadJson: string;
}
