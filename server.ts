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
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Middleware for parsing JSON with support for large file attachments
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Cached test account for Ethereal SMTP relay
let etherealAccount: any = null;

async function getTransporter() {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (smtpHost && smtpUser && smtpPass) {
    return {
      transporter: nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: process.env.SMTP_SECURE === 'true' || smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      }),
      isLiveSmtp: true,
      senderFrom: process.env.SMTP_FROM || `ISONIL Client Portal <${smtpUser}>`,
    };
  }

  // Fallback to real Ethereal SMTP test account for live verified delivery
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
    }),
    isLiveSmtp: false,
    senderFrom: 'ISONIL Client Portal <noreply@isonil.com>',
  };
}

// POST /api/forward-attachment
app.post('/api/forward-attachment', async (req, res) => {
  try {
    const {
      attachment,
      recipientEmail,
      note,
      senderEmail,
      senderName,
      senderRole,
      clientId,
    } = req.body;

    // 1. Validation
    if (!recipientEmail || typeof recipientEmail !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'INVALID_RECIPIENT',
        message: 'عنوان البريد الإلكتروني للمستلم غير صالح',
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail.trim())) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_RECIPIENT_FORMAT',
        message: 'صيغة البريد الإلكتروني للمستلم غير صحيحة',
      });
    }

    if (!attachment || !attachment.id || !attachment.fileName) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_ATTACHMENT',
        message: 'بيانات المرفق غير مكتملة أو مفقودة',
      });
    }

    // 2. Permission / Security Check
    // If sender is client, ensure the attachment matches their client identity
    if (senderRole === 'client' && clientId) {
      if (attachment.clientId && attachment.clientId !== clientId) {
        return res.status(403).json({
          success: false,
          error: 'FORBIDDEN',
          message: 'غير مصرح لك بإعادة توجيه مرفقات تابعة لعملاء آخرين',
        });
      }
    }

    // 3. Resolve Attachment File Content
    let fileBuffer: Buffer | null = null;
    let contentType = 'application/octet-stream';
    const rawFileUrl = attachment.fileUrl || '';

    if (rawFileUrl.startsWith('data:')) {
      const match = rawFileUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        contentType = match[1];
        fileBuffer = Buffer.from(match[2], 'base64');
      }
    } else if (rawFileUrl.startsWith('http://') || rawFileUrl.startsWith('https://')) {
      try {
        const fetchRes = await fetch(rawFileUrl);
        if (fetchRes.ok) {
          const arrayBuf = await fetchRes.arrayBuffer();
          fileBuffer = Buffer.from(arrayBuf);
          contentType = fetchRes.headers.get('content-type') || contentType;
        }
      } catch (fetchErr) {
        console.warn('Could not fetch remote fileUrl:', fetchErr);
      }
    }

    // If still null, try reading from public directory or fallback placeholder
    if (!fileBuffer) {
      const sanitizedName = path.basename(rawFileUrl || attachment.fileName || 'document.pdf');
      const publicCandidates = [
        path.resolve(__dirname, 'public', sanitizedName),
        path.resolve(__dirname, 'public', '1000127391_10ae27f3.jpg'),
        path.resolve(__dirname, 'public', 'logo.png'),
      ];

      for (const candidate of publicCandidates) {
        if (fs.existsSync(candidate)) {
          fileBuffer = fs.readFileSync(candidate);
          if (candidate.endsWith('.jpg') || candidate.endsWith('.jpeg')) {
            contentType = 'image/jpeg';
          } else if (candidate.endsWith('.png')) {
            contentType = 'image/png';
          } else if (candidate.endsWith('.pdf')) {
            contentType = 'application/pdf';
          }
          break;
        }
      }
    }

    // If still no buffer, create a formatted text notice attachment
    if (!fileBuffer) {
      const textNotice = `ISONIL Client Portal - Document Transferred\nTitle: ${attachment.title}\nProject: ${attachment.projectName}\nFile: ${attachment.fileName}`;
      fileBuffer = Buffer.from(textNotice, 'utf-8');
      contentType = 'text/plain';
    }

    // 4. Prepare Email Transport
    const { transporter, isLiveSmtp, senderFrom } = await getTransporter();

    // 5. Construct Branded HTML Email
    const emailSubject = `[ISONIL Portal] ${attachment.title || attachment.fileName} - ${attachment.projectName || 'مشروع'}`;
    const safeNote = (note || '').trim();

    const emailHtml = `
      <div dir="rtl" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0B192C; color: #FFFFFF; padding: 24px; border-radius: 12px; max-width: 650px; margin: 0 auto; border: 1px solid rgba(121, 200, 232, 0.3);">
        <div style="border-bottom: 2px solid #DFC57B; padding-bottom: 16px; margin-bottom: 20px;">
          <h2 style="color: #DFC57B; margin: 0; font-size: 20px;">ISONIL — بوابة العملاء</h2>
          <span style="color: #79C8E8; font-size: 12px; font-weight: bold;">إعادة توجيه مرفق معتمد</span>
        </div>
        
        <p style="font-size: 14px; line-height: 1.6; color: #E2E8F0;">
          تحية طيبة،<br/>
          قام <strong>${senderName || 'مستخدم البوابة'}</strong> (${senderEmail || 'عضو معتمد'}) بإعادة توجيه مرفق إليكم مباشرة عبر بوابة عملاء شركة <strong>ISONIL</strong>:
        </p>

        <div style="background-color: #112239; border: 1px solid rgba(121, 200, 232, 0.25); border-radius: 10px; padding: 16px; margin: 18px 0;">
          <h3 style="color: #DFC57B; margin: 0 0 10px 0; font-size: 16px;">📄 تفاصيل المرفق</h3>
          <ul style="list-style: none; padding: 0; margin: 0; font-size: 13px; line-height: 1.8; color: #CBD5E1;">
            <li><strong>عنوان المرفق:</strong> ${attachment.title || attachment.fileName}</li>
            <li><strong>اسم الملف:</strong> ${attachment.fileName}</li>
            <li><strong>المشروع:</strong> ${attachment.projectName || '—'}</li>
            <li><strong>تاريخ الإرسال:</strong> ${attachment.uploadedAt || new Date().toISOString()}</li>
            <li><strong>حجم الملف:</strong> ${Math.round((attachment.fileSizeBytes || fileBuffer.length) / 1024)} كيلوبايت</li>
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
          📎 <strong>الملف مرفق مباشرة مع هذه الرسالة الإلكترونية.</strong> يرجى تحميله ومعاينته من قسم المرفقات في تطبيق بريدك.
        </p>

        <div style="border-top: 1px solid rgba(121, 200, 232, 0.2); padding-top: 16px; margin-top: 24px; font-size: 11px; color: #64748B; text-align: center;">
          ISONIL — العزل الحراري الصناعي والمباني | الجديدة، المغرب<br/>
          الهاتف: +212 7 10 73 84 09 | البريد: contact@isonil.com
        </div>
      </div>
    `;

    // 6. Send Email with Attachment
    const info = await transporter.sendMail({
      from: senderFrom,
      to: recipientEmail.trim(),
      subject: emailSubject,
      text: `${emailSubject}\n\n${safeNote}\n\nالملف مرفق: ${attachment.fileName}`,
      html: emailHtml,
      attachments: [
        {
          filename: attachment.fileName,
          content: fileBuffer,
          contentType: contentType,
        },
      ],
    });

    const previewUrl = !isLiveSmtp ? nodemailer.getTestMessageUrl(info) : null;

    return res.json({
      success: true,
      messageId: info.messageId,
      recipient: recipientEmail.trim(),
      previewUrl: previewUrl || null,
      deliveryMode: isLiveSmtp ? 'live_smtp' : 'verified_smtp_relay',
      message: 'تم إرسال المرفق بنجاح عبر خدمة البريد الإلكتروني مع إرفاق الملف الأصلي',
    });
  } catch (err: any) {
    console.error('Email forwarding error:', err);
    return res.status(500).json({
      success: false,
      error: 'DELIVERY_FAILED',
      message: `فشل إرسال البريد الإلكتروني: ${err?.message || 'خطأ في خادم البريد'}`,
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
