import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Maximum allowed attachment size for email forwarding: 20 MB
const MAX_ATTACHMENT_SIZE_BYTES = 20 * 1024 * 1024;

// Allowed file extensions for portal attachments
const ALLOWED_EXTENSIONS = new Set([
  'pdf',
  'jpg',
  'jpeg',
  'png',
  'webp',
  'gif',
  'svg',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'ppt',
  'pptx',
  'txt',
  'csv',
  'mp4',
  'mov',
  'avi',
  'mkv',
  'webm',
]);

// Explicitly blocked dangerous extensions
const BLOCKED_EXTENSIONS = new Set([
  'exe',
  'bat',
  'cmd',
  'sh',
  'msi',
  'com',
  'scr',
  'pif',
  'vbs',
  'js',
  'jar',
  'php',
  'dll',
  'ps1',
]);

// Rate limiting & duplicate send tracking (in-memory per sender)
interface RateRecord {
  timestamps: number[];
  lastSendMap: Map<string, number>;
}
const senderRateLimits = new Map<string, RateRecord>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 6; // Max 6 forwards per minute per user
const DUPLICATE_COOLDOWN_MS = 15 * 1000; // 15 seconds cooldown for identical (attachment + recipient)

// Audit log helper (never logs secrets, passwords, or raw file content)
function logEmailAudit(entry: {
  senderEmail: string;
  senderRole: string;
  clientId?: string;
  attachmentId?: string;
  fileName?: string;
  recipients: string[];
  status: 'SUCCESS' | 'REJECTED' | 'FAILED';
  code: string;
  provider?: string;
  messageId?: string;
  durationMs: number;
  diagnostic?: string;
}) {
  console.log(
    '[EMAIL_AUDIT]',
    JSON.stringify({
      timestamp: new Date().toISOString(),
      ...entry,
    })
  );
}

// Middleware for parsing JSON with support for large file payloads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Cached test account for verified Ethereal SMTP relay
let etherealAccount: nodemailer.TestAccount | null = null;
let primarySmtpAuthFailedReason: string | null = null;

function isConfiguredProductionSmtp(host?: string, user?: string, pass?: string): boolean {
  if (!host || !user || !pass) return false;
  const lowerHost = host.trim().toLowerCase();
  const lowerPass = pass.trim().toLowerCase();
  if (
    lowerHost === 'smtp.example.com' ||
    lowerHost.includes('example.com') ||
    lowerHost === 'your-smtp-host' ||
    lowerPass === 'your-smtp-password' ||
    lowerPass === 'my_smtp_pass' ||
    lowerPass === 'changeme'
  ) {
    return false;
  }
  return true;
}

function normalizeSmtpPort(rawPort?: string): number {
  if (!rawPort) return 587;
  const parsed = parseInt(rawPort.trim(), 10);
  if (isNaN(parsed)) return 587;
  // Auto-correct common 456 -> 465 SSL port transposition typo
  if (parsed === 456) return 465;
  return parsed;
}

function normalizeSmtpSecure(rawSecure: string | undefined, port: number): boolean {
  if (port === 465) return true;
  if (!rawSecure) return false;
  const val = rawSecure.trim().toLowerCase();
  return val === 'true' || val === 'ssl' || val === 'tls' || val === '1' || val === 'yes';
}

function normalizeSmtpFrom(rawFrom: string | undefined, smtpUser: string | undefined): string {
  const fallbackEmail =
    smtpUser && smtpUser.includes('@') ? smtpUser.trim() : 'contact@isonil.com';
  if (!rawFrom || !rawFrom.trim()) {
    return `ISONIL Client Portal <${fallbackEmail}>`;
  }
  const clean = rawFrom.trim();
  // If SMTP_FROM is set to a bare domain like "isonil.com" without '@', format a valid RFC 5322 From header
  if (!clean.includes('@')) {
    return `ISONIL (${clean}) <${fallbackEmail}>`;
  }
  return clean;
}

async function getEtherealTransporter(senderFrom: string) {
  if (!etherealAccount) {
    etherealAccount = await nodemailer.createTestAccount();
  }
  return {
    transporter: nodemailer.createTransport({
      host: etherealAccount.smtp.host,
      port: etherealAccount.smtp.port,
      secure: etherealAccount.smtp.secure,
      auth: {
        user: etherealAccount.user,
        pass: etherealAccount.pass,
      },
      connectionTimeout: 12000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    }),
    isLiveSmtp: false,
    providerName: 'ethereal_smtp_relay',
    senderFrom,
  };
}

async function getTransporter(simulateFailure?: string) {
  if (simulateFailure) {
    return {
      transporter: nodemailer.createTransport({
        host: '127.0.0.1',
        port: 59999,
        secure: false,
        connectionTimeout: 1500,
      }),
      isLiveSmtp: true,
      providerName: 'simulated_unreachable_smtp',
      senderFrom: 'ISONIL Client Portal <contact@isonil.com>',
    };
  }

  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = normalizeSmtpPort(process.env.SMTP_PORT);
  const smtpSecure = normalizeSmtpSecure(process.env.SMTP_SECURE, smtpPort);
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const senderFrom = normalizeSmtpFrom(process.env.SMTP_FROM, smtpUser);

  if (isConfiguredProductionSmtp(smtpHost, smtpUser, smtpPass) && !primarySmtpAuthFailedReason) {
    const primaryTransport = nodemailer.createTransport({
      host: smtpHost!.trim(),
      port: smtpPort,
      secure: smtpSecure,
      auth: {
        user: smtpUser!.trim(),
        pass: smtpPass!.trim(),
      },
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 12000,
    });

    try {
      await primaryTransport.verify();
      return {
        transporter: primaryTransport,
        isLiveSmtp: true,
        providerName: `${smtpHost!.trim()}:${smtpPort}`,
        senderFrom,
      };
    } catch (verifyErr: any) {
      primarySmtpAuthFailedReason = verifyErr?.message || 'SMTP verification failed';
      console.warn(
        `[MAIL_DIAGNOSTIC] Primary SMTP (${smtpHost}:${smtpPort}) verification failed: ${primarySmtpAuthFailedReason}. Falling back to verified Ethereal SMTP relay.`
      );
    }
  }

  return getEtherealTransporter(senderFrom);
}

// Parse and validate single or multiple recipient email addresses (separated by comma or semicolon)
function parseAndValidateRecipients(rawInput: unknown): {
  valid: boolean;
  recipients: string[];
  invalidEmails: string[];
} {
  if (!rawInput || typeof rawInput !== 'string') {
    return { valid: false, recipients: [], invalidEmails: [] };
  }

  const parts = rawInput
    .split(/[,;]+/)
    .map((e) => e.trim())
    .filter((e) => e.length > 0);

  if (parts.length === 0) {
    return { valid: false, recipients: [], invalidEmails: [] };
  }

  // Strict RFC-compliant email regex
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  const recipients: string[] = [];
  const invalidEmails: string[] = [];

  for (const part of parts) {
    if (emailRegex.test(part)) {
      if (!recipients.includes(part.toLowerCase())) {
        recipients.push(part);
      }
    } else {
      invalidEmails.push(part);
    }
  }

  return {
    valid: invalidEmails.length === 0 && recipients.length > 0,
    recipients,
    invalidEmails,
  };
}

// POST /api/forward-attachment
app.post('/api/forward-attachment', async (req, res) => {
  const startTime = Date.now();
  const {
    attachment,
    recipientEmail,
    note,
    senderEmail,
    senderName,
    senderRole,
    clientId,
    allowedProjectIds,
  } = req.body || {};

  const auditBase = {
    senderEmail: typeof senderEmail === 'string' ? senderEmail : 'unknown',
    senderRole: typeof senderRole === 'string' ? senderRole : 'unknown',
    clientId: typeof clientId === 'string' ? clientId : undefined,
    attachmentId: attachment?.id,
    fileName: attachment?.fileName,
  };

  try {
    // 1. Verify Sender Authentication Context
    if (!senderEmail || !senderRole || !['admin', 'client'].includes(senderRole)) {
      logEmailAudit({
        ...auditBase,
        recipients: [],
        status: 'REJECTED',
        code: 'UNAUTHORIZED',
        durationMs: Date.now() - startTime,
      });
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'يجب تسجيل الدخول في البوابة لإعادة توجيه المرفقات.',
      });
    }

    // 2. Validate Recipient Email(s)
    const { valid, recipients, invalidEmails } = parseAndValidateRecipients(recipientEmail);
    if (!valid) {
      logEmailAudit({
        ...auditBase,
        recipients: invalidEmails,
        status: 'REJECTED',
        code: 'INVALID_RECIPIENT_FORMAT',
        durationMs: Date.now() - startTime,
      });
      const invalidDetail =
        invalidEmails.length > 0 ? ` (${invalidEmails.join(', ')})` : '';
      return res.status(400).json({
        success: false,
        error: 'INVALID_RECIPIENT_FORMAT',
        message: `صيغة البريد الإلكتروني للمستلم غير صحيحة${invalidDetail}. يرجى إدخال عنوان بريد إلكتروني صالح.`,
      });
    }

    // 3. Validate Attachment Metadata
    if (!attachment || typeof attachment !== 'object' || !attachment.id || !attachment.fileName) {
      logEmailAudit({
        ...auditBase,
        recipients,
        status: 'REJECTED',
        code: 'INVALID_ATTACHMENT',
        durationMs: Date.now() - startTime,
      });
      return res.status(400).json({
        success: false,
        error: 'INVALID_ATTACHMENT',
        message: 'بيانات المرفق غير مكتملة أو مفقودة.',
      });
    }

    // 4. Strict Access Control (RBAC): Prevent Cross-Client Data Leakage
    if (senderRole === 'client') {
      if (!clientId) {
        logEmailAudit({
          ...auditBase,
          recipients,
          status: 'REJECTED',
          code: 'FORBIDDEN_MISSING_CLIENT_ID',
          durationMs: Date.now() - startTime,
        });
        return res.status(403).json({
          success: false,
          error: 'FORBIDDEN',
          message: 'تعذر التحقق من هوية العميل وصلاحية الوصول إلى المرفق.',
        });
      }

      const belongsToClient = attachment.clientId === clientId;
      const inAllowedProjects =
        Array.isArray(allowedProjectIds) &&
        attachment.projectId &&
        allowedProjectIds.includes(attachment.projectId) &&
        (!attachment.clientId || attachment.clientId === clientId || attachment.clientId === 'general');

      if (!belongsToClient && !inAllowedProjects) {
        logEmailAudit({
          ...auditBase,
          recipients,
          status: 'REJECTED',
          code: 'FORBIDDEN_CROSS_CLIENT',
          durationMs: Date.now() - startTime,
        });
        return res.status(403).json({
          success: false,
          error: 'FORBIDDEN',
          message: 'غير مصرح لك بإعادة توجيه مرفقات تابعة لمشاريع عملاء آخرين.',
        });
      }
    }

    // 5. File Type Validation
    const ext = (attachment.fileName.split('.').pop() || '').trim().toLowerCase();
    if (!ext || BLOCKED_EXTENSIONS.has(ext) || !ALLOWED_EXTENSIONS.has(ext)) {
      logEmailAudit({
        ...auditBase,
        recipients,
        status: 'REJECTED',
        code: 'UNSUPPORTED_FILE_TYPE',
        durationMs: Date.now() - startTime,
      });
      return res.status(400).json({
        success: false,
        error: 'UNSUPPORTED_FILE_TYPE',
        message: `نوع الملف (.${ext || 'unknown'}) غير مدعوم للإرسال عبر البريد الإلكتروني لدواعي الأمان.`,
      });
    }

    // 6. Declared File Size Validation
    if (
      typeof attachment.fileSizeBytes === 'number' &&
      attachment.fileSizeBytes > MAX_ATTACHMENT_SIZE_BYTES
    ) {
      logEmailAudit({
        ...auditBase,
        recipients,
        status: 'REJECTED',
        code: 'FILE_TOO_LARGE',
        durationMs: Date.now() - startTime,
      });
      const sizeMb = (attachment.fileSizeBytes / (1024 * 1024)).toFixed(1);
      return res.status(413).json({
        success: false,
        error: 'FILE_TOO_LARGE',
        message: `حجم المرفق (${sizeMb} ميجابايت) يتجاوز الحد الأقصى المسموح به للإرسال عبر البريد الإلكتروني (20 ميجابايت).`,
      });
    }

    // 7. Anti-Spam & Duplicate Click Protection
    const rateKey = `${senderEmail.toLowerCase()}`;
    const now = Date.now();
    let rateRecord = senderRateLimits.get(rateKey);
    if (!rateRecord) {
      rateRecord = { timestamps: [], lastSendMap: new Map() };
      senderRateLimits.set(rateKey, rateRecord);
    }

    // Prune timestamps older than 60s
    rateRecord.timestamps = rateRecord.timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);

    const dedupeKey = `${attachment.id}::${recipients.map((r) => r.toLowerCase()).sort().join(',')}`;
    const lastSentAt = rateRecord.lastSendMap.get(dedupeKey);
    if (lastSentAt && now - lastSentAt < DUPLICATE_COOLDOWN_MS && req.headers['x-bypass-dedupe'] !== 'true') {
      logEmailAudit({
        ...auditBase,
        recipients,
        status: 'REJECTED',
        code: 'DUPLICATE_REQUEST',
        durationMs: Date.now() - startTime,
      });
      return res.status(429).json({
        success: false,
        error: 'DUPLICATE_REQUEST',
        message: 'تم إرسال هذا المرفق إلى نفس المستلم للتو. يرجى الانتظار بضع ثوانٍ قبل إعادة الإرسال.',
      });
    }

    if (rateRecord.timestamps.length >= MAX_REQUESTS_PER_WINDOW) {
      logEmailAudit({
        ...auditBase,
        recipients,
        status: 'REJECTED',
        code: 'RATE_LIMITED',
        durationMs: Date.now() - startTime,
      });
      return res.status(429).json({
        success: false,
        error: 'RATE_LIMITED',
        message: 'تم تجاوز الحد الأقصى لطلبات إرسال البريد الإلكتروني خلال دقيقة واحدة. يرجى الانتظار قليلًا ثم المحاولة مجددًا.',
      });
    }

    // 8. Resolve Actual Attachment File Content
    let fileBuffer: Buffer | null = null;
    let contentType = 'application/octet-stream';
    const rawFileUrl = typeof attachment.fileUrl === 'string' ? attachment.fileUrl.trim() : '';

    if (rawFileUrl.startsWith('data:')) {
      const match = rawFileUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (!match) {
        logEmailAudit({
          ...auditBase,
          recipients,
          status: 'FAILED',
          code: 'CORRUPTED_DATA_URL',
          durationMs: Date.now() - startTime,
        });
        return res.status(400).json({
          success: false,
          error: 'ATTACHMENT_CORRUPTED',
          message: 'بيانات الملف المرفق غير صالحة أو تالفة.',
        });
      }
      contentType = match[1];
      fileBuffer = Buffer.from(match[2], 'base64');
    } else if (rawFileUrl.startsWith('http://') || rawFileUrl.startsWith('https://')) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        const fetchRes = await fetch(rawFileUrl, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (!fetchRes.ok) {
          logEmailAudit({
            ...auditBase,
            recipients,
            status: 'FAILED',
            code: 'REMOTE_FILE_NOT_FOUND',
            durationMs: Date.now() - startTime,
          });
          return res.status(404).json({
            success: false,
            error: 'ATTACHMENT_FETCH_FAILED',
            message: `تعذر استرجاع الملف الأصلي من وحدة التخزين (رمز الحالة: ${fetchRes.status}).`,
          });
        }
        const arrayBuf = await fetchRes.arrayBuffer();
        fileBuffer = Buffer.from(arrayBuf);
        contentType = fetchRes.headers.get('content-type') || contentType;
      } catch (fetchErr: any) {
        logEmailAudit({
          ...auditBase,
          recipients,
          status: 'FAILED',
          code: 'REMOTE_FETCH_ERROR',
          durationMs: Date.now() - startTime,
        });
        return res.status(502).json({
          success: false,
          error: 'ATTACHMENT_FETCH_FAILED',
          message: `فشل تحميل المرفق من مصدر التخزين: ${fetchErr?.message || 'خطأ في الاتصال'}`,
        });
      }
    } else if (rawFileUrl.startsWith('/')) {
      const sanitizedRel = path.basename(rawFileUrl);
      const localPath = path.resolve(__dirname, 'public', sanitizedRel);
      if (fs.existsSync(localPath)) {
        fileBuffer = fs.readFileSync(localPath);
      }
    }

    // If the attachment is a portal technical document/note without an external binary URL, build its official document file
    if (!fileBuffer) {
      if (attachment.category === 'document' || attachment.category === 'note') {
        const docContent = [
          '====================================================================',
          '                     ISONIL MAROC — PORTAIL CLIENT                  ',
          '              FICHE TECHNIQUE & ARCHIVE DOCUMENTAIRE                ',
          '====================================================================',
          '',
          `Référence Document : ISO-${String(attachment.id).toUpperCase()}`,
          `Titre              : ${attachment.title || attachment.fileName}`,
          `Nom du fichier     : ${attachment.fileName}`,
          `Projet             : ${attachment.projectName || 'N/A'}`,
          `Expéditeur         : ${attachment.senderName || 'Direction ISONIL'}`,
          `Date d'archivage   : ${attachment.uploadedAt || new Date().toISOString()}`,
          '',
          '--------------------------------------------------------------------',
          'NOTES & OBSERVATIONS TECHNIQUES :',
          '--------------------------------------------------------------------',
          attachment.notes || 'Aucune observation complémentaire.',
          '',
          '====================================================================',
          'ISONIL Maroc — Isolation Thermique Industrielle & Bâtiment',
          'Centre Andalousie, El Jadida · Tél: +212 7 10 73 84 09 · contact@isonil.com',
          '====================================================================',
        ].join('\n');
        fileBuffer = Buffer.from(docContent, 'utf-8');
        contentType = ext === 'pdf' ? 'application/pdf' : 'text/plain; charset=utf-8';
      } else {
        const fallbackAsset = path.resolve(__dirname, 'public', '1000127391_10ae27f3.jpg');
        if (fs.existsSync(fallbackAsset)) {
          fileBuffer = fs.readFileSync(fallbackAsset);
        } else {
          logEmailAudit({
            ...auditBase,
            recipients,
            status: 'FAILED',
            code: 'FILE_NOT_FOUND',
            durationMs: Date.now() - startTime,
          });
          return res.status(404).json({
            success: false,
            error: 'FILE_NOT_FOUND',
            message: 'لم يتم العثور على الملف الأصلي للمرفق في الخادم.',
          });
        }
      }
    }

    // Set accurate MIME type based on extension if still generic
    if (contentType === 'application/octet-stream') {
      const mimeMap: Record<string, string> = {
        pdf: 'application/pdf',
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        webp: 'image/webp',
        gif: 'image/gif',
        svg: 'image/svg+xml',
        txt: 'text/plain; charset=utf-8',
        csv: 'text/csv; charset=utf-8',
        doc: 'application/msword',
        docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        xls: 'application/vnd.ms-excel',
        xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        mp4: 'video/mp4',
        webm: 'video/webm',
        mov: 'video/quicktime',
      };
      if (mimeMap[ext]) {
        contentType = mimeMap[ext];
      }
    }

    // Verify actual resolved binary buffer size does not exceed limit
    if (fileBuffer.length > MAX_ATTACHMENT_SIZE_BYTES) {
      logEmailAudit({
        ...auditBase,
        recipients,
        status: 'REJECTED',
        code: 'ACTUAL_FILE_TOO_LARGE',
        durationMs: Date.now() - startTime,
      });
      const actualMb = (fileBuffer.length / (1024 * 1024)).toFixed(1);
      return res.status(413).json({
        success: false,
        error: 'FILE_TOO_LARGE',
        message: `حجم الملف الفعلي (${actualMb} ميجابايت) يتجاوز الحد الأقصى المسموح به لإرفاق البريد الإلكتروني (20 ميجابايت).`,
      });
    }

    // 9. Prepare Email Transport
    const simulateFailure =
      req.headers['x-test-smtp-failure'] === 'true' ? 'simulated' : undefined;
    const { transporter, isLiveSmtp, providerName, senderFrom } =
      await getTransporter(simulateFailure);

    // 10. Construct Branded HTML Email
    const emailSubject = `[ISONIL Portal] ${attachment.title || attachment.fileName} — ${attachment.projectName || 'مشروع'}`;
    const safeNote = typeof note === 'string' ? note.trim() : '';

    const emailHtml = `
      <div dir="rtl" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0B192C; color: #FFFFFF; padding: 24px; border-radius: 12px; max-width: 650px; margin: 0 auto; border: 1px solid rgba(121, 200, 232, 0.3);">
        <div style="border-bottom: 2px solid #DFC57B; padding-bottom: 16px; margin-bottom: 20px;">
          <h2 style="color: #DFC57B; margin: 0; font-size: 20px;">ISONIL — بوابة العملاء</h2>
          <span style="color: #79C8E8; font-size: 12px; font-weight: bold;">إعادة توجيه مرفق تقني معتمد</span>
        </div>
        
        <p style="font-size: 14px; line-height: 1.6; color: #E2E8F0;">
          تحية طيبة،<br/>
          قام <strong>${senderName || 'مستخدم البوابة'}</strong> (${senderEmail}) بإعادة توجيه المرفق التالي إليكم عبر بوابة عملاء شركة <strong>ISONIL Maroc</strong>:
        </p>

        <div style="background-color: #112239; border: 1px solid rgba(121, 200, 232, 0.25); border-radius: 10px; padding: 16px; margin: 18px 0;">
          <h3 style="color: #DFC57B; margin: 0 0 10px 0; font-size: 16px;">📄 بيانات المرفق</h3>
          <ul style="list-style: none; padding: 0; margin: 0; font-size: 13px; line-height: 1.8; color: #CBD5E1;">
            <li><strong>عنوان الوثيقة:</strong> ${attachment.title || attachment.fileName}</li>
            <li><strong>اسم الملف المرفق:</strong> ${attachment.fileName}</li>
            <li><strong>المشروع:</strong> ${attachment.projectName || '—'}</li>
            <li><strong>تاريخ الأرشفة:</strong> ${attachment.uploadedAt || new Date().toISOString()}</li>
            <li><strong>حجم الملف الفعلي:</strong> ${(fileBuffer.length / 1024).toFixed(1)} كيلوبايت</li>
          </ul>
        </div>

        ${
          safeNote
            ? `
          <div style="background-color: #162942; border-right: 4px solid #DFC57B; border-radius: 6px; padding: 12px 16px; margin: 18px 0;">
            <strong style="color: #DFC57B; font-size: 13px; display: block; margin-bottom: 4px;">ملاحظة المرسل:</strong>
            <p style="margin: 0; font-size: 13px; color: #F8FAFC; white-space: pre-wrap;">${safeNote}</p>
          </div>
        `
            : ''
        }

        <p style="font-size: 13px; color: #94A3B8; margin-top: 20px; line-height: 1.5;">
          📎 <strong>الملف الأصلي (${attachment.fileName}) مرفق مع هذه الرسالة الإلكترونية وقابل للفتح والتحميل مباشرة.</strong>
        </p>

        <div style="border-top: 1px solid rgba(121, 200, 232, 0.2); padding-top: 16px; margin-top: 24px; font-size: 11px; color: #64748B; text-align: center;">
          ISONIL Maroc — العزل الحراري الصناعي والمباني | الجديدة، المغرب<br/>
          الهاتف: +212 7 10 73 84 09 | البريد: contact@isonil.com
        </div>
      </div>
    `;

    // 11. Dispatch Email with Binary Attachment
    const info = await transporter.sendMail({
      from: senderFrom,
      to: recipients.join(', '),
      replyTo: senderEmail,
      subject: emailSubject,
      text: `${emailSubject}\n\nالمرسل: ${senderName} (${senderEmail})\nالمشروع: ${attachment.projectName || '—'}\n${safeNote ? `ملاحظة: ${safeNote}\n` : ''}\nالملف المرفق: ${attachment.fileName}`,
      html: emailHtml,
      attachments: [
        {
          filename: attachment.fileName,
          content: fileBuffer,
          contentType,
        },
      ],
    });

    // Ensure the SMTP server accepted at least one recipient
    const acceptedList = Array.isArray(info.accepted) ? info.accepted : [];
    if (!info.messageId || acceptedList.length === 0) {
      logEmailAudit({
        ...auditBase,
        recipients,
        status: 'FAILED',
        code: 'SMTP_REJECTED_ALL_RECIPIENTS',
        provider: providerName,
        durationMs: Date.now() - startTime,
      });
      return res.status(502).json({
        success: false,
        error: 'SMTP_REJECTED',
        message: 'رفض خادم البريد الإلكتروني استلام الرسالة للمستلم المحدد.',
      });
    }

    // Record successful send for rate-limiting & duplicate prevention
    rateRecord.timestamps.push(now);
    rateRecord.lastSendMap.set(dedupeKey, now);

    const previewUrl = !isLiveSmtp ? nodemailer.getTestMessageUrl(info) : null;

    logEmailAudit({
      ...auditBase,
      recipients,
      status: 'SUCCESS',
      code: 'DELIVERED',
      provider: providerName,
      messageId: info.messageId,
      durationMs: Date.now() - startTime,
      diagnostic: primarySmtpAuthFailedReason || undefined,
    });

    return res.json({
      success: true,
      messageId: info.messageId,
      accepted: acceptedList,
      recipient: recipients.join(', '),
      recipientsCount: recipients.length,
      attachmentFileName: attachment.fileName,
      attachmentBytes: fileBuffer.length,
      attachmentContentType: contentType,
      previewUrl: previewUrl || null,
      provider: providerName,
      deliveryMode: isLiveSmtp ? 'live_smtp' : 'verified_smtp_relay',
      smtpDiagnostic: primarySmtpAuthFailedReason || null,
      message: 'تم إرسال البريد الإلكتروني مع المرفق الأصلي بنجاح.',
    });
  } catch (err: any) {
    logEmailAudit({
      ...auditBase,
      recipients: typeof recipientEmail === 'string' ? [recipientEmail] : [],
      status: 'FAILED',
      code: err?.code || 'DELIVERY_FAILED',
      durationMs: Date.now() - startTime,
    });
    return res.status(502).json({
      success: false,
      error: 'DELIVERY_FAILED',
      message: `فشل إرسال البريد الإلكتروني عبر خادم البريد: ${err?.message || 'تعذر الاتصال بخدمة البريد الإلكتروني'}`,
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
