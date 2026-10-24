import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  getDocFromServer, 
  setDoc, 
  deleteDoc, 
  collection, 
  getDocs, 
  query, 
  where 
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { User, Project, Attachment, PendingRegistration } from './types';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Validate connection to Firestore on boot
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

function sanitizeId(rawId: string): string {
  return rawId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 128) || 'item_1';
}

export async function checkIsFirebaseAdmin(uid: string, email?: string | null): Promise<boolean> {
  try {
    const adminDoc = await getDoc(doc(db, 'admins', sanitizeId(uid)));
    if (adminDoc.exists()) return true;
    if (email && email.trim().toLowerCase() === 'sabri.eg@gmail.com') {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export async function registerAdminInFirestore(params: {
  uid: string;
  email: string;
  fullName: string;
  companyName: string;
  phone?: string;
  password?: string;
}): Promise<User> {
  const cleanUid = sanitizeId(params.uid);
  const now = new Date().toISOString();
  const adminRecord = {
    uid: cleanUid,
    email: params.email.trim().toLowerCase().slice(0, 254),
    fullName: (params.fullName.trim() || 'Direction ISONIL').slice(0, 150),
    companyName: (params.companyName.trim() || 'ISONIL Maroc').slice(0, 150),
    createdAt: now,
  };

  if (auth.currentUser && auth.currentUser.uid === params.uid) {
    try {
      await setDoc(doc(db, 'admins', cleanUid), adminRecord);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `admins/${cleanUid}`);
    }
  }

  const adminUser: User = {
    id: cleanUid,
    uid: cleanUid,
    fullName: adminRecord.fullName,
    companyName: adminRecord.companyName,
    email: adminRecord.email,
    phone: (params.phone || '+212710738409').slice(0, 40),
    role: 'admin',
    status: 'active',
    createdAt: now,
    assignedProjectIds: [],
    city: 'El Jadida',
    ...(params.password ? { password: params.password.slice(0, 128) } : {}),
  };

  if (auth.currentUser) {
    try {
      await syncUserToFirestore(adminUser, cleanUid);
    } catch {
      // Local store retains record
    }
  }

  return adminUser;
}

export async function syncUserToFirestore(user: User, uid?: string): Promise<void> {
  if (!auth.currentUser) return;
  const docId = sanitizeId(user.id);
  const payload: Record<string, unknown> = {
    id: docId,
    fullName: (user.fullName || 'Utilisateur').slice(0, 150),
    companyName: (user.companyName || 'Entreprise').slice(0, 150),
    email: user.email.trim().toLowerCase().slice(0, 254),
    phone: (user.phone || '+212600000000').slice(0, 40),
    role: user.role === 'admin' ? 'admin' : 'client',
    status: user.status || 'active',
    createdAt: (user.createdAt || new Date().toISOString()).slice(0, 64),
    assignedProjectIds: Array.isArray(user.assignedProjectIds)
      ? user.assignedProjectIds.slice(0, 100).map((id) => String(id).slice(0, 128))
      : [],
  };
  if (uid || user.uid) payload.uid = sanitizeId(uid || user.uid || '');
  if (user.city) payload.city = user.city.slice(0, 100);
  if (user.notes) payload.notes = user.notes.slice(0, 1000);
  if (user.password) payload.password = user.password.slice(0, 128);

  try {
    await setDoc(doc(db, 'users', docId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${docId}`);
  }
}

export async function syncProjectToFirestore(project: Project, clientEmail?: string): Promise<void> {
  if (!auth.currentUser) return;
  const docId = sanitizeId(project.id);
  const payload: Record<string, unknown> = {
    id: docId,
    clientId: sanitizeId(project.clientId || 'general'),
    clientName: (project.clientName || 'Client').slice(0, 150),
    name: (project.name || 'Projet').slice(0, 200),
    location: (project.location || 'Maroc').slice(0, 200),
    type: project.type || 'tuyauterie',
    status: project.status || 'in_progress',
    startDate: (project.startDate || new Date().toISOString().split('T')[0]).slice(0, 40),
    completionPercentage: Math.min(100, Math.max(0, Number(project.completionPercentage) || 0)),
    totalStorageBytes: Math.max(0, Number(project.totalStorageBytes) || 0),
    description: (project.description || '').slice(0, 2000),
  };
  if (clientEmail) {
    payload.clientEmail = clientEmail.trim().toLowerCase().slice(0, 254);
  }

  try {
    await setDoc(doc(db, 'projects', docId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `projects/${docId}`);
  }
}

export async function syncAttachmentToFirestore(attachment: Attachment, clientEmail?: string): Promise<void> {
  if (!auth.currentUser) return;
  if (attachment.fileUrl && attachment.fileUrl.length > 850000) {
    return;
  }
  const docId = sanitizeId(attachment.id);
  const validCategories = ['photo', 'video', 'document', 'note', 'other'];
  const normalizedCategory = validCategories.includes(attachment.category) ? attachment.category : 'document';

  const payload: Record<string, unknown> = {
    id: docId,
    projectId: sanitizeId(attachment.projectId || 'proj-1'),
    projectName: (attachment.projectName || 'Projet').slice(0, 200),
    clientId: sanitizeId(attachment.clientId || 'client-1'),
    senderType: attachment.senderType === 'admin' ? 'admin' : 'client',
    senderName: (attachment.senderName || 'ISONIL').slice(0, 150),
    title: (attachment.title || 'Document').slice(0, 250),
    category: normalizedCategory,
    fileUrl: (attachment.fileUrl || '/logo.png').slice(0, 850000),
    fileName: (attachment.fileName || 'document.pdf').slice(0, 255),
    fileSizeBytes: Math.max(0, Number(attachment.fileSizeBytes) || 0),
    uploadedAt: (attachment.uploadedAt || new Date().toISOString()).slice(0, 64),
  };
  if (clientEmail) payload.clientEmail = clientEmail.trim().toLowerCase().slice(0, 254);
  if (typeof attachment.starred === 'boolean') payload.starred = attachment.starred;
  if (attachment.notes) payload.notes = attachment.notes.slice(0, 2000);
  if (attachment.folder) payload.folder = attachment.folder;
  if (attachment.previewType) payload.previewType = attachment.previewType.slice(0, 30);
  if (attachment.deletedAt) payload.deletedAt = attachment.deletedAt.slice(0, 64);
  if (attachment.customSection) payload.customSection = attachment.customSection.slice(0, 120);

  try {
    await setDoc(doc(db, 'attachments', docId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `attachments/${docId}`);
  }
}

export async function deleteAttachmentFromFirestore(attachmentId: string): Promise<void> {
  if (!auth.currentUser) return;
  const docId = sanitizeId(attachmentId);
  try {
    await deleteDoc(doc(db, 'attachments', docId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `attachments/${docId}`);
  }
}

export async function syncPendingRegistrationToFirestore(pending: PendingRegistration): Promise<void> {
  const docId = sanitizeId(pending.id);
  const payload: Record<string, unknown> = {
    id: docId,
    fullName: (pending.fullName || 'Client').slice(0, 150),
    companyName: (pending.companyName || 'Entreprise').slice(0, 150),
    email: pending.email.trim().toLowerCase().slice(0, 254),
    phone: (pending.phone || '+212600000000').slice(0, 40),
    city: (pending.city || 'Maroc').slice(0, 100),
    projectType: pending.projectType || 'tuyauterie',
    requestedAt: (pending.requestedAt || new Date().toISOString()).slice(0, 64),
  };
  if (pending.notes) payload.notes = pending.notes.slice(0, 1000);
  if (pending.password) payload.password = pending.password.slice(0, 128);

  try {
    await setDoc(doc(db, 'pendingRegistrations', docId), payload);
  } catch {
    // Local store keeps pending request
  }
}

export async function deletePendingRegistrationFromFirestore(registrationId: string): Promise<void> {
  if (!auth.currentUser) return;
  const docId = sanitizeId(registrationId);
  try {
    await deleteDoc(doc(db, 'pendingRegistrations', docId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `pendingRegistrations/${docId}`);
  }
}

export async function fetchVerifiedUserFromFirestore(fbUser: FirebaseUser): Promise<User | null> {
  const cleanUid = sanitizeId(fbUser.uid);
  const emailLower = (fbUser.email || '').trim().toLowerCase();

  // 1. Check if this UID or verified owner is an Admin
  const isAdmin = await checkIsFirebaseAdmin(cleanUid, emailLower);
  if (isAdmin) {
    try {
      const userDoc = await getDoc(doc(db, 'users', cleanUid));
      if (userDoc.exists()) {
        const data = userDoc.data() as User;
        return { ...data, role: 'admin', status: 'active' };
      }
      const adminDoc = await getDoc(doc(db, 'admins', cleanUid));
      if (adminDoc.exists()) {
        const aData = adminDoc.data();
        return {
          id: cleanUid,
          uid: cleanUid,
          fullName: aData.fullName || fbUser.displayName || 'Direction ISONIL',
          companyName: aData.companyName || 'ISONIL Maroc',
          email: aData.email || emailLower,
          phone: '+212710738409',
          role: 'admin',
          status: 'active',
          createdAt: aData.createdAt || new Date().toISOString(),
          assignedProjectIds: [],
        };
      }
      if (emailLower === 'sabri.eg@gmail.com') {
        return {
          id: cleanUid,
          uid: cleanUid,
          fullName: fbUser.displayName || 'Direction ISONIL',
          companyName: 'ISONIL Maroc',
          email: emailLower,
          phone: '+212710738409',
          role: 'admin',
          status: 'active',
          createdAt: new Date().toISOString(),
          assignedProjectIds: [],
        };
      }
    } catch {
      // Continue to fallback check
    }
  }

  // 2. Check /users/{uid} directly
  try {
    const directUserDoc = await getDoc(doc(db, 'users', cleanUid));
    if (directUserDoc.exists()) {
      const data = directUserDoc.data() as User;
      return {
        ...data,
        role: isAdmin && data.role === 'admin' ? 'admin' : 'client',
      };
    }
  } catch {
    // Continue to email query
  }

  // 3. Query /users by verified email
  if (emailLower && fbUser.emailVerified) {
    try {
      const q = query(collection(db, 'users'), where('email', '==', emailLower));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const docData = snap.docs[0].data() as User;
        return {
          ...docData,
          role: isAdmin && docData.role === 'admin' ? 'admin' : 'client',
        };
      }
    } catch {
      // Ignore query errors
    }
  }

  return null;
}

/**
 * Native OS Sharing helper:
 * Invokes navigator.share with the actual file if supported by the browser/device,
 * or with title/text/url if supported. Never forces WhatsApp or email.
 */
export async function triggerNativeShare(attachment: Attachment): Promise<'shared' | 'aborted' | 'unsupported'> {
  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') {
    return 'unsupported';
  }

  try {
    // Attempt to share the actual file if fileUrl is a data URL or fetchable path
    if (attachment.fileUrl && typeof navigator.canShare === 'function') {
      try {
        const response = await fetch(attachment.fileUrl);
        const blob = await response.blob();
        const mimeType = blob.type || (attachment.category === 'photo' ? 'image/jpeg' : attachment.category === 'video' ? 'video/mp4' : 'application/pdf');
        const fileObj = new File([blob], attachment.fileName || 'document', { type: mimeType });
        if (navigator.canShare({ files: [fileObj] })) {
          await navigator.share({
            files: [fileObj],
            title: attachment.title,
            text: `${attachment.title} — ${attachment.projectName}`,
          });
          return 'shared';
        }
      } catch {
        // Fall through to metadata share via native sheet
      }
    }

    await navigator.share({
      title: attachment.title,
      text: `${attachment.title} (${attachment.projectName})`,
      url: window.location.origin,
    });
    return 'shared';
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      return 'aborted';
    }
    return 'unsupported';
  }
}

export {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  firebaseSignOut,
  onAuthStateChanged,
};
export type { FirebaseUser };
